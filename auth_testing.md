# Auth Testing Playbook (TaskForge)

## Step 1: MongoDB Verification
```
mongosh
use test_database
db.users.find({role: "admin"}).pretty()
```
Verify: bcrypt hash starts with `$2b$`. Indexes exist on `users.email (unique)`, `login_attempts.identifier (unique)`, `password_reset_tokens.expires_at` (TTL).

## Step 2: API Testing (cookies)
```
curl -c /tmp/c.txt -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@taskforge.dev","password":"admin123"}'

curl -b /tmp/c.txt http://localhost:8001/api/auth/me
```

Login returns user object and sets `access_token` + `refresh_token` cookies. `/me` returns the same user using cookies.

## Step 3: Brute Force
5 failed login attempts on the same `{ip}:{email}` lock account 15 minutes (HTTP 429).

## Step 4: Roles
- admin can POST `/api/users` (add member) and DELETE `/api/projects/{id}`
- non-admin (member) cannot
