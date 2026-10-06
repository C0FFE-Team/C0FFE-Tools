---
name: coff-railway
description: "Internal: Deploy backend to Railway with database provisioning and health checks"
---

# coff-railway

Internal skill for deploying backend services to Railway. Used by the `coff-railway-deployer` agent.

## Steps

### 1. Read Input

- Read `.harness/plans/deploy/env-map.json` for environment variable map
- Read `.harness/config.json` for project configuration (backend repo path, name, stack)

### 2. Check If Project Already Exists & Is Up-to-Date

Check for an existing Railway project **before** attempting any deploy:

1. If `.harness/plans/deploy/railway-deployment.json` exists, read it and extract `project_id` and service IDs
2. Call `mcp__railway__list_services` with the `project_id` to verify the project still exists
3. If the project **exists**:
   - Call `mcp__railway__list_deployments` to get the latest deployment for the backend service
   - Get the local HEAD commit hash: `git rev-parse HEAD` (in the backend repo)
   - Compare the latest deployment's commit ref with the local HEAD
   - **If the latest deployment matches HEAD and status is healthy/successful:**
     - **SKIP Steps 3–9 entirely** — the project is already deployed on the latest commit
     - Log: "Projeto Railway (`<project_name>`) já está deployado no commit atual. Nada a fazer."
     - Go directly to Step 10 (Write Output) with existing data
   - **If the latest deployment does NOT match HEAD or is not healthy:**
     - Use existing `project_id` and service IDs to UPDATE rather than create new resources
     - **SKIP Steps 3–4** (project creation and database provisioning) — go directly to Step 5 (Set Environment Variables)
     - Log: "Projeto Railway já existe (`<project_name>`). Pulando criação, atualizando env vars e fazendo redeploy."
4. If the project **does not exist** (error or not found):
   - Proceed to Step 3 to create a new project

### 3. Create Railway Project (New Projects Only)

**Only execute this step if Step 2 determined the project does NOT exist.**

- Call `mcp__railway__create-project-and-link` to create a new Railway project
- Project name: use the project name from `config.json`

### 4. Provision Databases (New Projects Only)

**Only execute this step if Step 2 determined the project does NOT exist.**

Use `mcp__railway__deploy-template` to provision each required database:

- **PostgreSQL**: ALWAYS provision (search template "postgres")
- **Redis**: Only if `env-map.json` indicates `services_needed.redis == true` (search template "redis")
- **MongoDB**: Only if `env-map.json` indicates `services_needed.mongodb == true` (search template "mongodb")

After provisioning, Railway auto-generates connection URLs as internal variables. Note the plugin/service IDs for the output.

### 5. Set Environment Variables

Call `mcp__railway__set-variables` on the backend service. Apply translation rules from env-map:

| Action | Behavior |
|--------|----------|
| `auto_provision` | Skip — Railway handles these via database plugins (DATABASE_URL, REDIS_URL, etc.) |
| `generate_new` | Generate a cryptographically secure random string (32+ chars) and set it |
| `set_production` | Set `NODE_ENV=production` |
| `passthrough` | Copy the value exactly as-is from the env file |
| `replace_with_vercel_url` | Set a placeholder initially; will be updated after Vercel deploy (use `PENDING_VERCEL_URL`) |
| `ignore` | Do not set (PORT, HOST — Railway manages these) |

### 6. Trigger Deploy

- Call `mcp__railway__deploy` to trigger the build and deployment of the backend service
- The service should detect the NestJS/Node.js project and build accordingly

### 7. Generate Domain

- Call `mcp__railway__generate-domain` to create a public domain for the service
- Record the generated URL (e.g., `https://api-xxx.up.railway.app`)

### 8. Health Check Loop

Monitor the deployment and verify it's healthy:

1. Call `mcp__railway__get-logs` to monitor build progress
2. Wait for build to complete (check logs for success indicators)
3. Test health endpoint: `GET <url>/health` or `GET <url>/api/health`
4. Retry schedule (max 5 attempts): 15s, 30s, 60s, 120s, 240s
5. If health check passes (HTTP 200), proceed to output

### 9. Error Correction (Max 3 Cycles)

If build or health check fails:

1. **Build failure**: Read build logs via `mcp__railway__get-logs`, analyze the error
   - Missing env var? Add it via `mcp__railway__set-variables` and redeploy
   - Build command wrong? Check if project needs custom build settings
2. **Runtime failure**: Read runtime logs, analyze
   - Database connection error? Verify DATABASE_URL is properly linked
   - Port binding? Ensure the app listens on `$PORT` (Railway injects this)
3. **Health check failure**: Service is running but health endpoint not responding
   - Check if the app uses a different health path
   - Check if the app needs a startup delay

After each correction, call `mcp__railway__deploy` to redeploy and re-run health check.

If after 3 correction cycles the issue persists: **STOP** and escalate with full diagnostic:
- Build logs
- Runtime logs
- Environment variables set (names only, not values)
- Error analysis

### 10. Write Output

Write `.harness/plans/deploy/railway-deployment.json`:

```json
{
  "project_id": "...",
  "project_name": "...",
  "services": [
    {
      "name": "api",
      "type": "nodejs",
      "url": "https://api-xxx.up.railway.app",
      "status": "healthy"
    }
  ],
  "databases": [
    {
      "type": "postgresql",
      "plugin_id": "...",
      "internal_url": "postgresql://..."
    },
    {
      "type": "redis",
      "plugin_id": "...",
      "internal_url": "redis://..."
    }
  ],
  "environment_variables_set": ["DATABASE_URL", "REDIS_URL", "JWT_SECRET", "NODE_ENV", "..."],
  "domain": "api-xxx.up.railway.app",
  "health_check": {
    "url": "https://api-xxx.up.railway.app/health",
    "status": 200
  }
}
```

## Rules

- **Max retries**: 5 for health checks, 3 for error correction cycles
- **Never log secrets**: Only log variable names, never values
- **Idempotency**: Always check for existing resources before creating new ones
- **Escalate, don't guess**: If unsure about an error, stop and present the diagnostic to the user
- **Trim env var values**: ALWAYS `.trim()` every environment variable value before setting it. Remove any trailing `\n`, `\r`, spaces, or whitespace. Values with trailing newlines cause silent runtime failures.
