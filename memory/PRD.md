# TaskForge — Jira-style Project Management

## Original Problem Statement
Build a Jira-style project management app, fully working to manage technical products with a team, where I can invite team members, assign tasks and many capable features from Jira. Do not add seed/dummy data.

## User Choices (2026-02)
- Auth: JWT (email + password)
- Features: ALL Jira-like (projects, kanban, backlog, sprints, issues with types/priorities/assignees, comments, activity log, attachments, search/filters)
- Member invites: admin adds members in-app (no email integration)
- AI: none
- Design: distinctive — chose **Brutalist Editorial** (Klein Blue #001AFF + #F4F4F0 + Chivo / IBM Plex)

## Architecture
- **Backend**: FastAPI (`/app/backend/server.py`) + Motor (MongoDB) + JWT (httpOnly cookies, bcrypt, brute-force lockout, password reset tokens)
- **Frontend**: React 19 + React Router 7 + Tailwind + Phosphor icons, AuthContext, ProtectedRoute, brutalist design tokens in `index.css`
- **Storage**: MongoDB collections — users, projects, issues, sprints, comments, activities, attachments, login_attempts, password_reset_tokens. UUID primary keys, `_id` excluded from responses. Attachments saved to `/app/backend/uploads/`.

## Implemented (2026-02)
- Auth: register, login, /me, logout, refresh, forgot-password (logs token), reset-password, brute-force lockout with X-Forwarded-For
- Admin seeded automatically on startup (`admin@taskforge.dev` / `admin123`)
- Users: list, admin add member, admin update role, admin delete (not self)
- Projects: CRUD with unique key (e.g., ACME), atomic auto-incrementing issue counter
- Issues: CRUD with type (epic/story/task/bug), priority (5 levels), status (5), assignee, reporter, sprint, epic link, labels, story points; activity log auto-recorded on changes
- Comments: CRUD per-issue (owner/admin can delete)
- Activity log: auto written on create/update/comment/attach
- Attachments: multipart upload, download, delete (owner/admin)
- Sprints: create / list / start (moves backlog→todo) / complete (incomplete→backlog) / delete
- Search: cross-project full-text on issues + projects
- Frontend pages: Login, Register, Dashboard, Projects list, Project Board (drag-drop kanban), Project Backlog (sprints + drag-style move), Project Issues table, Project Settings, Team, Search
- Brutalist design system: dot-grid backgrounds, hard 1px borders, Klein-Blue accent, hard geometric shadows, mono labels, Chivo display

## Test Credentials
See `/app/memory/test_credentials.md`

## Backlog (P1 — next)
- Email integration (Resend / SendGrid) for member invites + password reset
- Authorization guards on PATCH/DELETE issues, sprint mutations, project edits (admin / project lead / reporter)
- Pagination on /api/users, /api/issues, /api/projects
- Rich-text comments + @mentions + notifications

## Backlog (P2 — later)
- Charts: velocity, burndown
- Saved filters / JQL-like search
- Bulk edit
- Roadmap timeline view
- Webhooks
