---
name: coff-vercel
description: "Internal: Deploy frontend to Vercel with production backend URLs"
---

# coff-vercel

Internal skill for deploying frontend applications to Vercel. Used by the `coff-vercel-deployer` agent.

## Steps

### 1. Read Input

- Read `.harness/plans/deploy/env-map.json` for environment variable map
- Read `.harness/config.json` for project configuration (frontend repo path, name, stack)
- Read `.harness/plans/deploy/railway-deployment.json` for backend URLs and service info

### 2. Check If Project Already Exists & Is Up-to-Date

Check for an existing Vercel project **before** attempting any deploy:

1. If `.harness/plans/deploy/vercel-deployment.json` exists, read it and extract `project_name` and `team_id`
2. Call `mcp__vercel__get_project` with the project name to check if the project exists on Vercel
3. If the project **exists**:
   - Store `project_id`, `team_id`, and current `url` from the response
   - Call `mcp__vercel__list_deployments` to get the latest deployment
   - Get the local HEAD commit hash: `git rev-parse HEAD` (in the frontend repo)
   - Compare the latest deployment's `gitSource.sha` (or commit ref) with the local HEAD
   - **If the latest deployment matches HEAD and status is `READY`:**
     - **SKIP Steps 3–10 entirely** — the project is already deployed on the latest commit
     - Log: "Projeto Vercel (`<project_name>`) já está deployado no commit atual. Nada a fazer."
     - Go directly to Step 11 (Write Output) with existing data
   - **If the latest deployment does NOT match HEAD or is not READY:**
     - **SKIP Step 3** — go directly to Step 4 (Set Environment Variables)
     - Log: "Projeto Vercel já existe (`<project_name>`). Pulando criação, atualizando env vars e fazendo redeploy."
4. If the project **does not exist** (404 or not found):
   - Proceed to Step 3 to create and deploy

### 3. Initial Deploy (New Projects Only)

**Only execute this step if Step 2 determined the project does NOT exist.**

- Call `mcp__vercel__deploy_to_vercel` to deploy the frontend project
- Vercel auto-detects the framework (Next.js, React, etc.)
- Note: First deploy may fail or have issues without env vars — this is expected

### 4. Set Environment Variables

Use `mcp__vercel__use_vercel_cli` to set env vars via `vercel env add`:

For each variable in the frontend env-map, apply translation:

| Action | Behavior |
|--------|----------|
| `replace_with_railway_url` | Replace `http://localhost:8000` with the actual Railway URL from `railway-deployment.json` (e.g., `https://api-xxx.up.railway.app`) |
| `replace_with_vercel_url` | Replace `http://localhost:3000` with the Vercel deployment URL (obtain from deployment info) |
| `set_production` | Set `NODE_ENV=production` |
| `passthrough` | Copy the value exactly as-is |
| `ignore` | Do not set |

Ensure all `NEXT_PUBLIC_*` variables are properly prefixed for client-side access.

### 5. Re-deploy

- **New projects:** After setting env vars, trigger a new deployment (the first deploy didn't have correct env vars)
- **Existing projects:** This is the only deploy — it applies the updated env vars
- Call `mcp__vercel__deploy_to_vercel` or use `mcp__vercel__use_vercel_cli` with `vercel --prod`

### 6. Monitor Deployment

- Call `mcp__vercel__list_deployments` to find the latest deployment
- Call `mcp__vercel__get_deployment` to check status
- Wait for status to be `READY`

### 7. Verify Build

- If build failed, call `mcp__vercel__get_deployment_build_logs` to analyze
- Common issues: missing env vars, build command errors, dependency issues

### 8. Verify Site Loads

- Call `mcp__vercel__web_fetch_vercel_url` to verify the site returns HTML
- Check that the response is not an error page

### 9. Test Backend Connectivity

- Verify the frontend can reach the backend API
- Fetch the backend health endpoint from the Vercel context to ensure CORS is configured
- If CORS error detected:
  1. Go back to Railway and update `CORS_ORIGIN` with the actual Vercel URL
  2. Call `mcp__railway__set-variables` to update the CORS variable
  3. Call `mcp__railway__deploy` to redeploy backend with new CORS settings

### 10. Error Correction (Max 3 Cycles)

If build or verification fails:

1. **Build error**: Read build logs via `mcp__vercel__get_deployment_build_logs`
   - Missing env var? Add it and redeploy
   - Dependency error? Check if `package.json` is correct
   - TypeScript error? May need to fix code (escalate to user)
2. **Connectivity error**: Frontend loads but can't reach backend
   - CORS issue? Update Railway CORS_ORIGIN and redeploy backend
   - Wrong API URL? Fix the env var and redeploy frontend
3. **Runtime error**: Check `mcp__vercel__get_runtime_logs`

After each correction, redeploy and re-verify.

If after 3 correction cycles the issue persists: **STOP** and escalate with full diagnostic.

### 11. Write Output

Write `.harness/plans/deploy/vercel-deployment.json`:

```json
{
  "project_id": "...",
  "project_name": "...",
  "team_id": "...",
  "url": "https://app-xxx.vercel.app",
  "status": "ready",
  "framework": "next",
  "environment_variables_set": ["NEXT_PUBLIC_API_URL", "NEXTAUTH_URL", "NODE_ENV", "..."],
  "connectivity_check": {
    "backend_url": "https://api-xxx.up.railway.app/health",
    "status": "ok"
  }
}
```

## Rules

- **Max retries**: 3 for error correction cycles
- **Never log secrets**: Only log variable names, never values
- **Idempotency**: Always check for existing resources before creating new ones
- **CORS awareness**: If frontend URL changes, backend CORS must be updated too
- **Escalate, don't guess**: If unsure about an error, stop and present the diagnostic to the user
- **Trim env var values**: ALWAYS `.trim()` every environment variable value before setting it. Remove any trailing `\n`, `\r`, spaces, or whitespace. Values with trailing newlines cause silent runtime failures.
- **Git author for Vercel deploys**: Some Vercel teams block deploys from commit authors that are not team members. Use the repo's configured git author by default. If a deploy is blocked due to the commit author, STOP and ask the user which author is allowed, then recover by pushing an empty commit with that author:
    ```bash
    git -c user.name="<allowed-name>" -c user.email="<allowed-email>" commit --allow-empty -m "chore: retrigger deploy"
    git push
    ```
  - Then re-check the deployment status
