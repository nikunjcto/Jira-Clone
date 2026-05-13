from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import uuid
import secrets
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

import bcrypt
import jwt
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ----------------------- Mongo -----------------------
mongo_url = os.environ.get("MONGO_URL")
db_name = os.environ.get("DB_NAME")
jwt_secret = os.environ.get("JWT_SECRET")
if not mongo_url:
    raise RuntimeError("MONGO_URL is required")
if not db_name:
    raise RuntimeError("DB_NAME is required")
if not jwt_secret:
    raise RuntimeError("JWT_SECRET is required")
client = AsyncIOMotorClient(mongo_url)
db = client[db_name]

UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# ----------------------- App -----------------------
app = FastAPI(title="TaskForge API")
api_router = APIRouter(prefix="/api")

# ----------------------- Auth helpers -----------------------
JWT_ALGORITHM = "HS256"


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def _is_prod() -> bool:
    if os.environ.get("RENDER_SERVICE_ID"):
        return True
    env = (os.environ.get("ENV") or os.environ.get("ENVIRONMENT") or "").lower()
    return env in {"prod", "production"}


def _cookie_settings() -> dict:
    if _is_prod():
        return {"secure": True, "samesite": "none"}
    return {"secure": False, "samesite": "lax"}


def _cors_origins() -> list[str]:
    raw = os.environ.get("CORS_ORIGINS", "")
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    return origins

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60),
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, user_id: str, email: str):
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    settings = _cookie_settings()
    response.set_cookie(
        "access_token",
        access,
        httponly=True,
        secure=settings["secure"],
        samesite=settings["samesite"],
        max_age=3600,
        path="/",
    )
    response.set_cookie(
        "refresh_token",
        refresh,
        httponly=True,
        secure=settings["secure"],
        samesite=settings["samesite"],
        max_age=604800,
        path="/",
    )
    return access, refresh


def serialize_user(u: dict) -> dict:
    return {
        "id": u["id"],
        "email": u["email"],
        "name": u.get("name", ""),
        "role": u.get("role", "member"),
        "avatar_color": u.get("avatar_color", "#001AFF"),
        "created_at": u.get("created_at"),
    }


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user


# ----------------------- Pydantic Models -----------------------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    password: str = Field(min_length=6)


class AddMemberIn(BaseModel):
    email: EmailStr
    name: str
    password: str = Field(min_length=6)
    role: Literal["admin", "member"] = "member"


class UpdateRoleIn(BaseModel):
    role: Literal["admin", "member"]


class ProjectIn(BaseModel):
    name: str
    key: str = Field(min_length=2, max_length=10)
    description: Optional[str] = ""
    lead_id: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    lead_id: Optional[str] = None


class IssueIn(BaseModel):
    title: str
    description: Optional[str] = ""
    type: Literal["epic", "story", "task", "bug"] = "task"
    priority: Literal["highest", "high", "medium", "low", "lowest"] = "medium"
    status: Literal["backlog", "todo", "in_progress", "review", "done"] = "backlog"
    assignee_id: Optional[str] = None
    sprint_id: Optional[str] = None
    parent_id: Optional[str] = None  # epic link
    labels: List[str] = []
    story_points: Optional[int] = None


class IssueUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[Literal["epic", "story", "task", "bug"]] = None
    priority: Optional[Literal["highest", "high", "medium", "low", "lowest"]] = None
    status: Optional[Literal["backlog", "todo", "in_progress", "review", "done"]] = None
    assignee_id: Optional[str] = None
    sprint_id: Optional[str] = None
    parent_id: Optional[str] = None
    labels: Optional[List[str]] = None
    story_points: Optional[int] = None


class CommentIn(BaseModel):
    body: str


class SprintIn(BaseModel):
    name: str
    goal: Optional[str] = ""
    start_date: Optional[str] = None
    end_date: Optional[str] = None


@api_router.get("/health")
async def health():
    return {"ok": True}


# ----------------------- Auth Endpoints -----------------------
@api_router.post("/auth/register")
async def register(payload: RegisterIn, response: Response):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    # First user becomes admin if no users exist (besides seeded admin)
    is_first = await db.users.count_documents({}) == 0
    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": payload.name,
        "password_hash": hash_password(payload.password),
        "role": "admin" if is_first else "member",
        "avatar_color": _color_for_email(email),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    set_auth_cookies(response, user["id"], user["email"])
    return serialize_user(user)


def _color_for_email(email: str) -> str:
    import hashlib
    palette = ["#001AFF", "#FF6B00", "#00A86B", "#E63946", "#7B2CBF", "#FFD600", "#111111", "#0E7C66"]
    h = int(hashlib.md5(email.encode("utf-8")).hexdigest(), 16)
    return palette[h % len(palette)]


def _client_ip(request: Request) -> str:
    xff = request.headers.get("x-forwarded-for") or request.headers.get("X-Forwarded-For")
    if xff:
        return xff.split(",")[0].strip()
    real = request.headers.get("x-real-ip")
    if real:
        return real.strip()
    return request.client.host if request.client else "unknown"


@api_router.post("/auth/login")
async def login(payload: LoginIn, request: Request, response: Response):
    email = payload.email.lower()
    ip = _client_ip(request)
    identifier = f"{ip}:{email}"

    # brute force
    attempts = await db.login_attempts.find_one({"identifier": identifier})
    if attempts and attempts.get("locked_until"):
        locked_until = datetime.fromisoformat(attempts["locked_until"])
        if locked_until > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        # increment
        new_count = (attempts.get("count", 0) if attempts else 0) + 1
        update = {"count": new_count, "last_attempt": datetime.now(timezone.utc).isoformat()}
        if new_count >= 5:
            update["locked_until"] = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
            update["count"] = 0
        await db.login_attempts.update_one(
            {"identifier": identifier}, {"$set": {"identifier": identifier, **update}}, upsert=True
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")

    await db.login_attempts.delete_one({"identifier": identifier})
    set_auth_cookies(response, user["id"], user["email"])
    return serialize_user(user)


@api_router.post("/auth/logout")
async def logout(response: Response, _: dict = Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return serialize_user(user)


@api_router.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Missing refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(user["id"], user["email"])
        response.set_cookie("access_token", access, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
        return {"ok": True}
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@api_router.post("/auth/forgot-password")
async def forgot(payload: ForgotIn):
    user = await db.users.find_one({"email": payload.email.lower()})
    if user:
        token = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({
            "token": token,
            "user_id": user["id"],
            "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
            "used": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Password reset link: /reset-password?token={token}")
    return {"ok": True}


@api_router.post("/auth/reset-password")
async def reset(payload: ResetIn):
    rec = await db.password_reset_tokens.find_one({"token": payload.token, "used": False})
    if not rec:
        raise HTTPException(status_code=400, detail="Invalid or used token")
    expires = rec["expires_at"]
    if isinstance(expires, str):
        expires = datetime.fromisoformat(expires)
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expired")
    await db.users.update_one(
        {"id": rec["user_id"]},
        {"$set": {"password_hash": hash_password(payload.password)}},
    )
    await db.password_reset_tokens.update_one({"token": payload.token}, {"$set": {"used": True}})
    return {"ok": True}


# ----------------------- Users -----------------------
@api_router.get("/users")
async def list_users(_: dict = Depends(get_current_user)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users


@api_router.post("/users")
async def add_user(payload: AddMemberIn, user: dict = Depends(get_current_user)):
    email = payload.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email already exists")
    role = payload.role if user.get("role") == "admin" else "member"
    user = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": payload.name,
        "password_hash": hash_password(payload.password),
        "role": role,
        "avatar_color": _color_for_email(email),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    return serialize_user(user)


@api_router.patch("/users/{user_id}/role")
async def update_role(user_id: str, payload: UpdateRoleIn, _: dict = Depends(require_admin)):
    res = await db.users.update_one({"id": user_id}, {"$set": {"role": payload.role}})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}


@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    res = await db.users.delete_one({"id": user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"ok": True}


# ----------------------- Projects -----------------------
@api_router.get("/projects")
async def list_projects(_: dict = Depends(get_current_user)):
    projects = await db.projects.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    # compute counts
    for p in projects:
        p["issue_count"] = await db.issues.count_documents({"project_id": p["id"]})
    return projects


@api_router.post("/projects")
async def create_project(payload: ProjectIn, user: dict = Depends(get_current_user)):
    key = payload.key.upper()
    if await db.projects.find_one({"key": key}):
        raise HTTPException(status_code=400, detail="Project key already exists")
    project = {
        "id": str(uuid.uuid4()),
        "name": payload.name,
        "key": key,
        "description": payload.description or "",
        "lead_id": payload.lead_id or user["id"],
        "issue_counter": 0,
        "created_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.projects.insert_one(project)
    project.pop("_id", None)
    return project


@api_router.get("/projects/{project_id}")
async def get_project(project_id: str, _: dict = Depends(get_current_user)):
    p = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p


@api_router.patch("/projects/{project_id}")
async def update_project(project_id: str, payload: ProjectUpdate, _: dict = Depends(get_current_user)):
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        return {"ok": True}
    res = await db.projects.update_one({"id": project_id}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"ok": True}


@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str, _: dict = Depends(require_admin)):
    await db.issues.delete_many({"project_id": project_id})
    await db.sprints.delete_many({"project_id": project_id})
    res = await db.projects.delete_one({"id": project_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"ok": True}


# ----------------------- Issues -----------------------
async def _enrich_issue(issue: dict) -> dict:
    return issue


@api_router.get("/projects/{project_id}/issues")
async def list_project_issues(
    project_id: str,
    status: Optional[str] = None,
    sprint_id: Optional[str] = None,
    type: Optional[str] = None,
    assignee_id: Optional[str] = None,
    _: dict = Depends(get_current_user),
):
    q = {"project_id": project_id}
    if status:
        q["status"] = status
    if sprint_id == "none":
        q["sprint_id"] = None
    elif sprint_id:
        q["sprint_id"] = sprint_id
    if type:
        q["type"] = type
    if assignee_id:
        q["assignee_id"] = assignee_id
    issues = await db.issues.find(q, {"_id": 0}).sort("created_at", -1).to_list(5000)
    return issues


@api_router.post("/projects/{project_id}/issues")
async def create_issue(project_id: str, payload: IssueIn, user: dict = Depends(get_current_user)):
    project = await db.projects.find_one_and_update(
        {"id": project_id},
        {"$inc": {"issue_counter": 1}},
        return_document=True,
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    new_counter = project["issue_counter"]
    issue_id = str(uuid.uuid4())
    issue = {
        "id": issue_id,
        "key": f"{project['key']}-{new_counter}",
        "project_id": project_id,
        "title": payload.title,
        "description": payload.description or "",
        "type": payload.type,
        "priority": payload.priority,
        "status": payload.status,
        "assignee_id": payload.assignee_id,
        "reporter_id": user["id"],
        "sprint_id": payload.sprint_id,
        "parent_id": payload.parent_id,
        "labels": payload.labels,
        "story_points": payload.story_points,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.issues.insert_one(issue)
    await _add_activity(issue_id, user["id"], "created", f"created this issue")
    issue.pop("_id", None)
    return issue


@api_router.get("/issues/{issue_id}")
async def get_issue(issue_id: str, _: dict = Depends(get_current_user)):
    issue = await db.issues.find_one({"id": issue_id}, {"_id": 0})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue


@api_router.patch("/issues/{issue_id}")
async def update_issue(issue_id: str, payload: IssueUpdate, user: dict = Depends(get_current_user)):
    existing = await db.issues.find_one({"id": issue_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Issue not found")
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update:
        return existing
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.issues.update_one({"id": issue_id}, {"$set": update})
    # activity log per changed field
    for field, new_val in update.items():
        if field == "updated_at":
            continue
        old_val = existing.get(field)
        if old_val != new_val:
            await _add_activity(
                issue_id, user["id"], "updated",
                f"changed {field} from \"{old_val}\" to \"{new_val}\""
            )
    issue = await db.issues.find_one({"id": issue_id}, {"_id": 0})
    return issue


@api_router.delete("/issues/{issue_id}")
async def delete_issue(issue_id: str, _: dict = Depends(get_current_user)):
    res = await db.issues.delete_one({"id": issue_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Issue not found")
    await db.comments.delete_many({"issue_id": issue_id})
    await db.activities.delete_many({"issue_id": issue_id})
    await db.attachments.delete_many({"issue_id": issue_id})
    return {"ok": True}


# ---- comments ----
async def _add_activity(issue_id: str, user_id: str, action: str, detail: str):
    await db.activities.insert_one({
        "id": str(uuid.uuid4()),
        "issue_id": issue_id,
        "user_id": user_id,
        "action": action,
        "detail": detail,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


@api_router.get("/issues/{issue_id}/comments")
async def list_comments(issue_id: str, _: dict = Depends(get_current_user)):
    return await db.comments.find({"issue_id": issue_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)


@api_router.post("/issues/{issue_id}/comments")
async def add_comment(issue_id: str, payload: CommentIn, user: dict = Depends(get_current_user)):
    issue = await db.issues.find_one({"id": issue_id})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    comment = {
        "id": str(uuid.uuid4()),
        "issue_id": issue_id,
        "user_id": user["id"],
        "body": payload.body,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.comments.insert_one(comment)
    await _add_activity(issue_id, user["id"], "commented", "added a comment")
    comment.pop("_id", None)
    return comment


@api_router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, user: dict = Depends(get_current_user)):
    c = await db.comments.find_one({"id": comment_id})
    if not c:
        raise HTTPException(status_code=404, detail="Comment not found")
    if c["user_id"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")
    await db.comments.delete_one({"id": comment_id})
    return {"ok": True}


@api_router.get("/issues/{issue_id}/activity")
async def issue_activity(issue_id: str, _: dict = Depends(get_current_user)):
    return await db.activities.find({"issue_id": issue_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)


# ---- attachments ----
@api_router.get("/issues/{issue_id}/attachments")
async def list_attachments(issue_id: str, _: dict = Depends(get_current_user)):
    return await db.attachments.find({"issue_id": issue_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)


@api_router.post("/issues/{issue_id}/attachments")
async def upload_attachment(
    issue_id: str,
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    issue = await db.issues.find_one({"id": issue_id})
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    att_id = str(uuid.uuid4())
    safe_name = file.filename.replace("/", "_")
    fname = f"{att_id}__{safe_name}"
    fpath = UPLOAD_DIR / fname
    content = await file.read()
    fpath.write_bytes(content)
    rec = {
        "id": att_id,
        "issue_id": issue_id,
        "filename": safe_name,
        "stored_name": fname,
        "size": len(content),
        "content_type": file.content_type or "application/octet-stream",
        "uploaded_by": user["id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.attachments.insert_one(rec)
    await _add_activity(issue_id, user["id"], "attached", f"attached file {safe_name}")
    rec.pop("_id", None)
    return rec


@api_router.get("/attachments/{att_id}/download")
async def download_attachment(att_id: str, _: dict = Depends(get_current_user)):
    rec = await db.attachments.find_one({"id": att_id})
    if not rec:
        raise HTTPException(status_code=404, detail="Attachment not found")
    fpath = UPLOAD_DIR / rec["stored_name"]
    if not fpath.exists():
        raise HTTPException(status_code=404, detail="File missing")
    return FileResponse(path=str(fpath), filename=rec["filename"], media_type=rec["content_type"])


@api_router.delete("/attachments/{att_id}")
async def delete_attachment(att_id: str, user: dict = Depends(get_current_user)):
    rec = await db.attachments.find_one({"id": att_id})
    if not rec:
        raise HTTPException(status_code=404, detail="Not found")
    if rec["uploaded_by"] != user["id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not allowed")
    fpath = UPLOAD_DIR / rec["stored_name"]
    if fpath.exists():
        fpath.unlink()
    await db.attachments.delete_one({"id": att_id})
    return {"ok": True}


# ----------------------- Sprints -----------------------
@api_router.get("/projects/{project_id}/sprints")
async def list_sprints(project_id: str, _: dict = Depends(get_current_user)):
    return await db.sprints.find({"project_id": project_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)


@api_router.post("/projects/{project_id}/sprints")
async def create_sprint(project_id: str, payload: SprintIn, _: dict = Depends(get_current_user)):
    sprint = {
        "id": str(uuid.uuid4()),
        "project_id": project_id,
        "name": payload.name,
        "goal": payload.goal or "",
        "state": "planned",  # planned | active | completed
        "start_date": payload.start_date,
        "end_date": payload.end_date,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.sprints.insert_one(sprint)
    sprint.pop("_id", None)
    return sprint


@api_router.post("/sprints/{sprint_id}/start")
async def start_sprint(sprint_id: str, _: dict = Depends(get_current_user)):
    sprint = await db.sprints.find_one({"id": sprint_id})
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    await db.sprints.update_one(
        {"id": sprint_id},
        {"$set": {"state": "active", "started_at": datetime.now(timezone.utc).isoformat()}},
    )
    # Move all backlog issues in sprint to "todo"
    await db.issues.update_many(
        {"sprint_id": sprint_id, "status": "backlog"},
        {"$set": {"status": "todo", "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"ok": True}


@api_router.post("/sprints/{sprint_id}/complete")
async def complete_sprint(sprint_id: str, _: dict = Depends(get_current_user)):
    sprint = await db.sprints.find_one({"id": sprint_id})
    if not sprint:
        raise HTTPException(status_code=404, detail="Sprint not found")
    await db.sprints.update_one(
        {"id": sprint_id},
        {"$set": {"state": "completed", "completed_at": datetime.now(timezone.utc).isoformat()}},
    )
    # Move incomplete issues back to backlog (no sprint)
    await db.issues.update_many(
        {"sprint_id": sprint_id, "status": {"$ne": "done"}},
        {"$set": {"sprint_id": None, "status": "backlog", "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"ok": True}


@api_router.delete("/sprints/{sprint_id}")
async def delete_sprint(sprint_id: str, _: dict = Depends(get_current_user)):
    await db.issues.update_many({"sprint_id": sprint_id}, {"$set": {"sprint_id": None}})
    res = await db.sprints.delete_one({"id": sprint_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sprint not found")
    return {"ok": True}


# ----------------------- Search -----------------------
@api_router.get("/search")
async def search(q: str, _: dict = Depends(get_current_user)):
    if not q.strip():
        return {"issues": [], "projects": []}
    issues = await db.issues.find(
        {"$or": [
            {"title": {"$regex": q, "$options": "i"}},
            {"description": {"$regex": q, "$options": "i"}},
            {"key": {"$regex": q, "$options": "i"}},
        ]},
        {"_id": 0},
    ).limit(50).to_list(50)
    projects = await db.projects.find(
        {"$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"key": {"$regex": q, "$options": "i"}},
        ]},
        {"_id": 0},
    ).limit(20).to_list(20)
    return {"issues": issues, "projects": projects}


# ----------------------- Setup / Startup -----------------------
@app.on_event("startup")
async def on_startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.projects.create_index("id", unique=True)
    await db.projects.create_index("key", unique=True)
    await db.issues.create_index("id", unique=True)
    await db.issues.create_index("project_id")
    await db.issues.create_index("sprint_id")
    await db.sprints.create_index("id", unique=True)
    await db.sprints.create_index("project_id")
    await db.comments.create_index("issue_id")
    await db.activities.create_index("issue_id")
    await db.attachments.create_index("issue_id")
    await db.login_attempts.create_index("identifier", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)

    admin_email = os.environ.get("ADMIN_EMAIL", "admin@taskforge.dev").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "Admin",
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "avatar_color": "#001AFF",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password), "role": "admin"}},
        )


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


# ----------------------- Mount -----------------------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors_origins(),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)
