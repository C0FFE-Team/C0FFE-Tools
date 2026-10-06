---
name: coff-deploy
description: "Deploy full-stack: backend to Railway, frontend to Vercel. Args: [--skip-backend] [--skip-frontend]"
user_invocable: true
---

# /coff-deploy

Deploy full-stack applications: backend to Railway (with databases), frontend to Vercel (with production URLs).

**Arguments:** `[--skip-backend] [--skip-frontend]`

## Pipeline

```
coff-deploy (orchestrator)
  Step 0-2: Prerequisites, env analysis, HITL
  Step 3: coff-railway-deployer agent -> coff-railway skill
  Step 4: HITL backend health
  Step 5: coff-vercel-deployer agent -> coff-vercel skill
  Step 6-7: HITL frontend, final report
```

**Handoff via files in `.harness/plans/deploy/`:**
```
env-map.json              <- coff-deploy creates (Step 1)
railway-deployment.json   <- railway-deployer writes
vercel-deployment.json    <- vercel-deployer writes
deploy-report.md          <- coff-deploy consolidates
```

## Agent Activity Markers

Before launching each agent, output a visible marker. After the agent completes, output a completion marker.

```
--- [Railway Deployer] Starting ---
... agent work ...
--- [Railway Deployer] Complete ---

--- [Vercel Deployer] Starting ---
...
--- [Vercel Deployer] Complete ---
```

## Steps

### Step 0 - Prerequisites

1. Verify `.harness/config.json` exists — if not, STOP: "Run `coff add-project` first."
2. Read `config.json` and verify repos with role `backend` and `frontend` exist
3. If `--skip-backend` is passed, skip backend role check
4. If `--skip-frontend` is passed, skip frontend role check
5. Test Railway MCP: call `mcp__railway__check-railway-status` — if fails, STOP: "Railway MCP is unavailable. Please fix the MCP connection and try again."
6. Test Vercel MCP: call `mcp__vercel__list_teams` — if fails, STOP: "Vercel MCP is unavailable. Please fix the MCP connection and try again."
7. If `--skip-backend`, skip Railway MCP check. If `--skip-frontend`, skip Vercel MCP check.
8. Verify working tree is clean (no uncommitted changes) in each repo that will be deployed — if dirty, STOP and inform user.

### Step 1 - Analyze Environment

1. Read `.harness/config.json`
2. For each repo, locate `.env`, `.env.local`, `.env.example` files
3. Parse all env vars and categorize them:
   - **database**: `DATABASE_URL`, `DB_*`, `POSTGRES_*`
   - **redis**: `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT`
   - **mongodb**: `MONGODB_URI`, `MONGO_URL`, `MONGO_*`
   - **api_url**: `*API_URL*`, `*API_BASE*`, `*BACKEND*` (patterns pointing to localhost:8000)
   - **app_url**: `NEXTAUTH_URL`, `*APP_URL*`, `*FRONTEND*` (patterns pointing to localhost:3000)
   - **cors**: `CORS_ORIGIN`, `ALLOWED_ORIGINS`
   - **port**: `PORT`, `HOST`
   - **node_env**: `NODE_ENV`
   - **secrets**: `*SECRET*`, `*KEY*` with placeholder values like `changeme`, `your-secret-here`
   - **third_party**: Everything else (`STRIPE_*`, `SENDGRID_*`, `AWS_*`, etc.)
4. Check for previous deploy: if `.harness/plans/deploy/railway-deployment.json` exists, note it for idempotent update
5. Create `.harness/plans/deploy/` directory
6. Write `.harness/plans/deploy/env-map.json`:

```json
{
  "repos": {
    "backend": {
      "name": "server",
      "path": "/absolute/path/to/server",
      "env_files": [".env", ".env.example"],
      "variables": {
        "DATABASE_URL": { "category": "database", "value": "postgresql://...", "action": "auto_provision" },
        "REDIS_URL": { "category": "redis", "value": "redis://localhost:6379", "action": "auto_provision" },
        "JWT_SECRET": { "category": "secrets", "value": "changeme", "action": "generate_new" },
        "STRIPE_SECRET_KEY": { "category": "third_party", "value": "sk_test_...", "action": "passthrough" },
        "PORT": { "category": "port", "value": "8000", "action": "ignore" },
        "NODE_ENV": { "category": "node_env", "value": "development", "action": "set_production" },
        "CORS_ORIGIN": { "category": "cors", "value": "http://localhost:3000", "action": "replace_with_vercel_url" }
      }
    },
    "frontend": {
      "name": "web",
      "path": "/absolute/path/to/web",
      "env_files": [".env.local"],
      "variables": {
        "NEXT_PUBLIC_API_URL": { "category": "api_url", "value": "http://localhost:8000", "action": "replace_with_railway_url" },
        "NEXTAUTH_URL": { "category": "app_url", "value": "http://localhost:3000", "action": "replace_with_vercel_url" },
        "NODE_ENV": { "category": "node_env", "value": "development", "action": "set_production" }
      }
    }
  },
  "services_needed": {
    "postgresql": true,
    "redis": true,
    "mongodb": false
  },
  "previous_deploy": null
}
```

### Step 2 - HITL: Environment Review

Present to the user:

1. **Environment Variables Map** — table showing each variable, its category, current value (mask secrets), and planned action
2. **Services to Provision** — PostgreSQL, Redis, MongoDB as detected
3. **Secrets that need new values** — list vars with `generate_new` action, ask if user wants to provide specific values or auto-generate
4. **Third-party keys** — confirm values are production-ready (not test keys)
5. **Previous deploy detected** — if updating, show what already exists

**WAIT for user approval before proceeding.**

### Step 3 - Railway Deployer Agent

If `--skip-backend` was passed, skip this step entirely and proceed to Step 5.

Output: `--- [Railway Deployer] Starting ---`

Launch the **coff-railway-deployer** agent:
- Input: `.harness/plans/deploy/env-map.json` + `.harness/config.json`
- The agent follows the `coff-railway` skill
- Output: `.harness/plans/deploy/railway-deployment.json`

Output: `--- [Railway Deployer] Complete ---`

### Step 4 - HITL: Backend Health

If `--skip-backend` was passed, skip this step.

Present to the user:
1. Railway project URL and service URLs
2. Database connections provisioned
3. Health check result (status code, response)
4. Build/runtime logs if there were errors

**WAIT for user confirmation that backend is healthy.**

### Step 5 - Vercel Deployer Agent

If `--skip-frontend` was passed, skip this step entirely.

Output: `--- [Vercel Deployer] Starting ---`

Launch the **coff-vercel-deployer** agent:
- Input: `.harness/plans/deploy/env-map.json` + `.harness/config.json` + `.harness/plans/deploy/railway-deployment.json`
- The agent follows the `coff-vercel` skill
- Output: `.harness/plans/deploy/vercel-deployment.json`

Output: `--- [Vercel Deployer] Complete ---`

### Step 6 - HITL: Frontend Verification

If `--skip-frontend` was passed, skip this step.

Present to the user:
1. Vercel deployment URL
2. Framework detected
3. Environment variables set
4. Connectivity check result (frontend -> backend API)

**WAIT for user confirmation that frontend is working.**

### Step 7 - Finalize

1. Generate `.harness/plans/deploy/deploy-report.md`:

```markdown
# Deploy Report

## Date
<timestamp>

## Backend (Railway)
- Project: <name>
- URL: <url>
- Services: <list>
- Databases: <list>
- Health: <status>

## Frontend (Vercel)
- Project: <name>
- URL: <url>
- Framework: <framework>
- Connectivity: <status>

## Environment Variables
### Railway
<list of vars set, values masked>

### Vercel
<list of vars set, values masked>

## Notes
<any issues encountered, corrections made>
```

2. Update `.harness/config.json` — add `deployment` field:

```json
{
  "deployment": {
    "railway_project_id": "...",
    "railway_service_urls": { "api": "https://api-xxx.up.railway.app" },
    "vercel_project_id": "...",
    "vercel_team_id": "...",
    "vercel_url": "https://app-xxx.vercel.app",
    "last_deployed_at": "2024-01-15T10:30:00Z"
  }
}
```

## Env Var Translation Rules

| Category | Pattern | Action | Target |
|----------|---------|--------|--------|
| Database | `DATABASE_URL=postgresql://...localhost...` | Auto-provisioned by Railway (ignore local value) | Railway |
| Redis | `REDIS_URL=redis://localhost:6379` | Auto-provisioned by Railway | Railway |
| MongoDB | `MONGODB_URI=mongodb://localhost:27017` | Auto-provisioned by Railway | Railway |
| API URL | `*API_URL=http://localhost:8000*` | Replace with Railway URL | Vercel |
| App URL | `NEXTAUTH_URL=http://localhost:3000` | Replace with Vercel URL | Vercel |
| CORS | `CORS_ORIGIN=http://localhost:3000` | Replace with Vercel URL | Railway |
| Port | `PORT=8000` | Ignore (Railway manages) | -- |
| Host | `HOST=0.0.0.0` | Ignore | -- |
| NODE_ENV | `NODE_ENV=development` | Set `production` | Both |
| Secrets | `JWT_SECRET=changeme` | Generate new secure value | Railway |
| Third-party | `STRIPE_*`, `SENDGRID_*` | Passthrough (copy value) | As needed |
