"""End-to-end pytest suite for TaskForge backend APIs.

Covers: auth (register, login, me, refresh, logout, brute-force, forgot/reset),
users CRUD (admin only), projects CRUD, issues CRUD with activity log,
comments, attachments, sprints lifecycle, search.

Uses external REACT_APP_BACKEND_URL with /api prefix and cookie-based auth.
"""
import io
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://project-forge-168.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@taskforge.dev"
ADMIN_PASSWORD = "admin123"


# ---------------- Fixtures ----------------
@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    # cookies should be set
    assert "access_token" in s.cookies
    return s


@pytest.fixture(scope="session")
def member_user(admin_session):
    """Admin creates a member user we can reuse across tests."""
    email = f"TEST_member_{uuid.uuid4().hex[:6]}@taskforge.dev"
    password = "member123"
    r = admin_session.post(f"{API}/users", json={
        "email": email, "name": "Test Member", "password": password, "role": "member"
    })
    assert r.status_code == 200, r.text
    return {"id": r.json()["id"], "email": email, "password": password}


@pytest.fixture(scope="session")
def member_session(member_user):
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": member_user["email"], "password": member_user["password"]})
    assert r.status_code == 200, r.text
    return s


# ---------------- Auth ----------------
class TestAuth:
    def test_login_returns_user_and_sets_cookies(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        assert "id" in data
        assert "access_token" in s.cookies
        assert "refresh_token" in s.cookies

    def test_me_with_cookie(self, admin_session):
        r = admin_session.get(f"{API}/auth/me")
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_me_with_bearer_header(self):
        # login fresh, grab cookie value, send as bearer
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        token = s.cookies.get("access_token")
        r = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_me_without_auth(self):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_login_invalid_password(self):
        # use a unique email so we don't hit lockout for admin
        r = requests.post(f"{API}/auth/login", json={
            "email": f"TEST_bad_{uuid.uuid4().hex[:6]}@x.com",
            "password": "wrong",
        })
        assert r.status_code == 401

    def test_register_new_user_is_member(self):
        s = requests.Session()
        email = f"TEST_reg_{uuid.uuid4().hex[:6]}@taskforge.dev"
        r = s.post(f"{API}/auth/register", json={"email": email, "password": "secret123", "name": "Reg User"})
        assert r.status_code == 200
        data = r.json()
        # backend lowercases emails on save
        assert data["email"] == email.lower()
        assert data["role"] == "member"  # admin already seeded
        assert "access_token" in s.cookies

    def test_register_duplicate_email(self, admin_session):
        # admin email already exists
        r = requests.post(f"{API}/auth/register", json={
            "email": ADMIN_EMAIL, "password": "whatever", "name": "Dup"
        })
        assert r.status_code == 400

    def test_refresh_token(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        old_access = s.cookies.get("access_token")
        time.sleep(1)
        r = s.post(f"{API}/auth/refresh")
        assert r.status_code == 200
        # new access_token cookie
        assert s.cookies.get("access_token") is not None

    def test_logout_clears_cookies(self):
        s = requests.Session()
        s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        r = s.post(f"{API}/auth/logout")
        assert r.status_code == 200
        # /me should now be unauthorized after logout (cookies cleared)
        r2 = s.get(f"{API}/auth/me")
        assert r2.status_code == 401

    def test_brute_force_lockout(self):
        # use unique non-existent email to avoid locking real accounts
        email = f"TEST_brute_{uuid.uuid4().hex[:8]}@taskforge.dev"
        last_status = None
        for i in range(6):
            r = requests.post(f"{API}/auth/login", json={"email": email, "password": "wrong"})
            last_status = r.status_code
        # 6th attempt should be 429 (lockout) since after 5 failures lock is set
        assert last_status == 429, f"Expected 429 lockout, got {last_status}"

    def test_forgot_password_always_ok(self):
        r = requests.post(f"{API}/auth/forgot-password", json={"email": "nonexistent@taskforge.dev"})
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_reset_password_invalid_token(self):
        r = requests.post(f"{API}/auth/reset-password", json={"token": "not-a-real-token", "password": "newpass123"})
        assert r.status_code == 400


# ---------------- Users (admin) ----------------
class TestUsers:
    def test_list_users_requires_auth(self):
        r = requests.get(f"{API}/users")
        assert r.status_code == 401

    def test_list_users_authenticated(self, admin_session):
        r = admin_session.get(f"{API}/users")
        assert r.status_code == 200
        users = r.json()
        assert isinstance(users, list)
        assert any(u["email"] == ADMIN_EMAIL for u in users)
        # ensure no password_hash leaked
        assert all("password_hash" not in u for u in users)

    def test_member_cannot_add_user(self, member_session):
        r = member_session.post(f"{API}/users", json={
            "email": f"TEST_x_{uuid.uuid4().hex[:6]}@x.com",
            "name": "X", "password": "secret123", "role": "member"
        })
        assert r.status_code == 403

    def test_admin_add_member_and_persistence(self, admin_session):
        email = f"TEST_addm_{uuid.uuid4().hex[:6]}@taskforge.dev"
        r = admin_session.post(f"{API}/users", json={
            "email": email, "name": "Added Member", "password": "secret123", "role": "member"
        })
        assert r.status_code == 200
        new_id = r.json()["id"]
        # backend lowercases emails on save
        assert r.json()["email"] == email.lower()
        # verify in list
        users = admin_session.get(f"{API}/users").json()
        assert any(u["id"] == new_id and u["email"] == email.lower() for u in users)

    def test_admin_update_role(self, admin_session, member_user):
        r = admin_session.patch(f"{API}/users/{member_user['id']}/role", json={"role": "admin"})
        assert r.status_code == 200
        # revert
        admin_session.patch(f"{API}/users/{member_user['id']}/role", json={"role": "member"})

    def test_admin_cannot_delete_self(self, admin_session):
        me = admin_session.get(f"{API}/auth/me").json()
        r = admin_session.delete(f"{API}/users/{me['id']}")
        assert r.status_code == 400

    def test_admin_delete_user(self, admin_session):
        # create then delete
        email = f"TEST_del_{uuid.uuid4().hex[:6]}@taskforge.dev"
        cr = admin_session.post(f"{API}/users", json={
            "email": email, "name": "To Delete", "password": "secret123", "role": "member"
        })
        uid = cr.json()["id"]
        dr = admin_session.delete(f"{API}/users/{uid}")
        assert dr.status_code == 200
        users = admin_session.get(f"{API}/users").json()
        assert not any(u["id"] == uid for u in users)


# ---------------- Projects ----------------
@pytest.fixture(scope="session")
def project(admin_session):
    key = f"T{uuid.uuid4().hex[:4].upper()}"
    r = admin_session.post(f"{API}/projects", json={
        "name": "Test Project", "key": key.lower(), "description": "desc"
    })
    assert r.status_code == 200, r.text
    p = r.json()
    assert p["key"] == key.upper()
    yield p
    # cleanup
    admin_session.delete(f"{API}/projects/{p['id']}")


class TestProjects:
    def test_create_project_uppercase_key(self, project):
        assert project["key"].isupper()
        assert project["issue_counter"] == 0

    def test_duplicate_key_rejected(self, admin_session, project):
        r = admin_session.post(f"{API}/projects", json={"name": "Dup", "key": project["key"]})
        assert r.status_code == 400

    def test_list_projects_has_issue_count(self, admin_session, project):
        r = admin_session.get(f"{API}/projects")
        assert r.status_code == 200
        items = r.json()
        match = next((p for p in items if p["id"] == project["id"]), None)
        assert match is not None
        assert "issue_count" in match

    def test_get_project(self, admin_session, project):
        r = admin_session.get(f"{API}/projects/{project['id']}")
        assert r.status_code == 200
        assert r.json()["id"] == project["id"]

    def test_patch_project(self, admin_session, project):
        r = admin_session.patch(f"{API}/projects/{project['id']}", json={"description": "updated"})
        assert r.status_code == 200
        # verify
        p = admin_session.get(f"{API}/projects/{project['id']}").json()
        assert p["description"] == "updated"

    def test_member_cannot_delete_project(self, member_session, admin_session):
        # create a temp project
        key = f"D{uuid.uuid4().hex[:4].upper()}"
        cr = admin_session.post(f"{API}/projects", json={"name": "Temp", "key": key})
        pid = cr.json()["id"]
        r = member_session.delete(f"{API}/projects/{pid}")
        assert r.status_code == 403
        # cleanup
        admin_session.delete(f"{API}/projects/{pid}")


# ---------------- Issues ----------------
class TestIssues:
    def test_create_issue_with_auto_key(self, admin_session, project):
        r = admin_session.post(f"{API}/projects/{project['id']}/issues", json={
            "title": "First Issue", "type": "task", "priority": "high", "status": "backlog"
        })
        assert r.status_code == 200, r.text
        issue = r.json()
        assert issue["key"] == f"{project['key']}-1"
        assert issue["title"] == "First Issue"
        assert issue["reporter_id"]
        # second issue
        r2 = admin_session.post(f"{API}/projects/{project['id']}/issues", json={"title": "Second"})
        assert r2.json()["key"] == f"{project['key']}-2"

    def test_list_issues_with_filters(self, admin_session, project):
        r = admin_session.get(f"{API}/projects/{project['id']}/issues", params={"status": "backlog"})
        assert r.status_code == 200
        items = r.json()
        assert all(i["status"] == "backlog" for i in items)

    def test_update_issue_writes_activity(self, admin_session, project):
        cr = admin_session.post(f"{API}/projects/{project['id']}/issues", json={"title": "Activity test"})
        iid = cr.json()["id"]
        ur = admin_session.patch(f"{API}/issues/{iid}", json={"status": "in_progress", "priority": "low"})
        assert ur.status_code == 200
        assert ur.json()["status"] == "in_progress"
        # activity log should have entries (created + 2 updates)
        ar = admin_session.get(f"{API}/issues/{iid}/activity")
        assert ar.status_code == 200
        actions = [a["action"] for a in ar.json()]
        assert "created" in actions
        assert actions.count("updated") >= 2

    def test_delete_issue(self, admin_session, project):
        cr = admin_session.post(f"{API}/projects/{project['id']}/issues", json={"title": "To delete"})
        iid = cr.json()["id"]
        dr = admin_session.delete(f"{API}/issues/{iid}")
        assert dr.status_code == 200
        gr = admin_session.get(f"{API}/issues/{iid}")
        assert gr.status_code == 404


# ---------------- Comments ----------------
class TestComments:
    def test_add_list_delete_comment(self, admin_session, project):
        cr = admin_session.post(f"{API}/projects/{project['id']}/issues", json={"title": "Comment test"})
        iid = cr.json()["id"]
        # add comment
        r = admin_session.post(f"{API}/issues/{iid}/comments", json={"body": "Hello"})
        assert r.status_code == 200
        cid = r.json()["id"]
        # list
        lr = admin_session.get(f"{API}/issues/{iid}/comments")
        assert lr.status_code == 200
        assert any(c["id"] == cid for c in lr.json())
        # delete
        dr = admin_session.delete(f"{API}/comments/{cid}")
        assert dr.status_code == 200

    def test_member_cannot_delete_others_comment(self, admin_session, member_session, project):
        cr = admin_session.post(f"{API}/projects/{project['id']}/issues", json={"title": "Perm test"})
        iid = cr.json()["id"]
        ar = admin_session.post(f"{API}/issues/{iid}/comments", json={"body": "admin comment"})
        cid = ar.json()["id"]
        r = member_session.delete(f"{API}/comments/{cid}")
        assert r.status_code == 403


# ---------------- Attachments ----------------
class TestAttachments:
    def test_upload_list_download_delete(self, admin_session, project):
        cr = admin_session.post(f"{API}/projects/{project['id']}/issues", json={"title": "Att test"})
        iid = cr.json()["id"]
        files = {"file": ("hello.txt", io.BytesIO(b"hello world"), "text/plain")}
        ur = admin_session.post(f"{API}/issues/{iid}/attachments", files=files)
        assert ur.status_code == 200, ur.text
        att = ur.json()
        assert att["filename"] == "hello.txt"
        assert att["size"] == 11
        # list
        lr = admin_session.get(f"{API}/issues/{iid}/attachments")
        assert any(a["id"] == att["id"] for a in lr.json())
        # download
        dr = admin_session.get(f"{API}/attachments/{att['id']}/download")
        assert dr.status_code == 200
        assert dr.content == b"hello world"
        # delete
        delr = admin_session.delete(f"{API}/attachments/{att['id']}")
        assert delr.status_code == 200


# ---------------- Sprints ----------------
class TestSprints:
    def test_sprint_lifecycle(self, admin_session, project):
        # create sprint
        sr = admin_session.post(f"{API}/projects/{project['id']}/sprints", json={"name": "Sprint 1", "goal": "Do stuff"})
        assert sr.status_code == 200
        sid = sr.json()["id"]
        assert sr.json()["state"] == "planned"
        # create backlog issue assigned to sprint
        ir = admin_session.post(f"{API}/projects/{project['id']}/issues", json={
            "title": "Sprint issue", "status": "backlog", "sprint_id": sid
        })
        iid = ir.json()["id"]
        # start sprint -> backlog issues become todo
        st = admin_session.post(f"{API}/sprints/{sid}/start")
        assert st.status_code == 200
        issue_after_start = admin_session.get(f"{API}/issues/{iid}").json()
        assert issue_after_start["status"] == "todo"
        # complete sprint -> incomplete issues -> backlog with sprint_id None
        ct = admin_session.post(f"{API}/sprints/{sid}/complete")
        assert ct.status_code == 200
        issue_after_complete = admin_session.get(f"{API}/issues/{iid}").json()
        assert issue_after_complete["status"] == "backlog"
        assert issue_after_complete["sprint_id"] is None
        # delete sprint
        dr = admin_session.delete(f"{API}/sprints/{sid}")
        assert dr.status_code == 200

    def test_list_sprints(self, admin_session, project):
        r = admin_session.get(f"{API}/projects/{project['id']}/sprints")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ---------------- Search ----------------
class TestSearch:
    def test_search_returns_issues_and_projects(self, admin_session, project):
        # create an issue with a recognizable string
        marker = f"ZTOKEN{uuid.uuid4().hex[:6].upper()}"
        admin_session.post(f"{API}/projects/{project['id']}/issues", json={"title": f"Hello {marker}"})
        r = admin_session.get(f"{API}/search", params={"q": marker})
        assert r.status_code == 200
        data = r.json()
        assert "issues" in data and "projects" in data
        assert any(marker in i["title"] for i in data["issues"])

    def test_search_empty_query(self, admin_session):
        r = admin_session.get(f"{API}/search", params={"q": "   "})
        assert r.status_code == 200
        data = r.json()
        assert data == {"issues": [], "projects": []}
