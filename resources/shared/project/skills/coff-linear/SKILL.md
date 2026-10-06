---
name: coff-linear
description: "Resolve all sub-issues of a Linear parent issue with PIXEL-PERFECT fidelity to Figma. Announce the chosen issue, request the Figma flow AND a test user (both mandatory, then stop), study every frame, fix each sub-issue, then loop: screenshot live with Playwright → compare to Figma → self-correct until visually identical, AND exercise every flow (click, create, submit). Detect missing backend from the prints and fix the API. Finish by moving sub-issues to Developer Testing with a PT-BR test report. Works across distinct projects. Args: <parent-issue> (e.g. PROD-416 or its name)"
user_invocable: true
---

# /coff-linear

Take one Linear **parent issue**, resolve **every** sub-issue under it to **pixel-perfect** parity with Figma, prove it live (visual + functional) in a self-correcting loop, ship it, and report back. Project-agnostic: discover the repos, branches, and tracker from the workspace instead of assuming.

**Argument:** the parent issue — a Linear identifier (`PROD-416`) or its title (`DRIVE`). The user names the issue; you do the rest.

## Communication
- Talk to the human in **PT-BR**. Code, commits, branches, comments stay in English.
- Be concise. Report outcomes faithfully — if something fails, is skipped, or can't be verified, say so plainly.

## Hard rules
- NEVER credit Claude/AI in commits or PRs (no `Co-Authored-By`, no footer).
- NEVER create a feature branch unless the user asks. Commit on each repo's default working branch — read it from `.harness/config.json` / `CLAUDE.md` (e.g. `fighty-api` → `main`, `fighty-webapp` → `development`). Confirm if unsure.
- Reuse existing components and style-guide tokens. Never hardcode colors/spacing. Check for an existing component before creating one.
- **Figma = the visual source of truth.** When code and Figma disagree, Figma wins — unless the user says otherwise. Never approximate a color/spacing/font you can read from Figma.
- Linear via **REST API** (`$LINEAR_API_KEY`), NOT MCP — per team rules. Figma via the **Desktop MCP** only (`mcp__figma-desktop__*`); never the remote REST Figma server.
- If a required tool is down (Figma Desktop MCP, Playwright, Linear API), STOP and ask the user to fix it. Do not invent alternatives.
- Do NOT mark anything `Done`. Terminal status for this skill is **Developer Testing**.

## Tools you'll need (load on demand)
- Figma Desktop MCP: `ToolSearch("select:mcp__figma-desktop__get_screenshot,mcp__figma-desktop__get_metadata,mcp__figma-desktop__get_design_context,mcp__figma-desktop__get_variable_defs")`
- Playwright: `browser_navigate, browser_snapshot, browser_click, browser_type, browser_fill_form, browser_select_option, browser_take_screenshot, browser_wait_for, browser_evaluate, browser_network_requests, browser_console_messages, browser_resize`
- Linear: plain `curl` to `https://api.linear.app/graphql` with header `Authorization: $LINEAR_API_KEY`.

---

## Steps

### 1. Pick the issue, fetch the tree, ANNOUNCE
- Resolve the parent via Linear REST: query the project/issue by identifier or title. Confirm with the user if the match is ambiguous.
- Pull its children with state + full description:
  ```graphql
  { issue(id:"PROD-XXX"){ identifier title description children(first:50){ nodes{ identifier title state{name} description } } } }
  ```
- Filter to the sub-issues that are **not** already `Done` / `Developer Testing` (unless the user says otherwise — they may want a re-validation pass).
- **Announce** to the user, in PT-BR: which parent + which sub-issues you will do, one line each. This is mandatory.

### 2. Request Figma + test user — MANDATORY, then STOP
Ask the user, in the same message, for **both**:
1. **The full Figma flow** for this feature — every relevant frame (main screen, each state, every modal/menu/preview the issues touch). Tell them which surfaces you need.
2. **A test user** — login credentials + the running app URL (staging or local). Ask how the app is reached (any gym/tenant/role selection, language).

**Stop and wait.** Do not start until you have the Figma links. If they don't give a test user, ask whether to boot the project locally (read `package.json` for the dev command) or use a URL they provide — you still need a way to log in and click through.

### 3. Study the Figma flow
- Extract the node id from each URL (`?node-id=4698-59059` → `4698-59059`).
- For each frame: `mcp__figma-desktop__get_screenshot({ nodeId })` and look at it. Use `get_variable_defs` / `get_design_context` for exact tokens (hex, spacing, font, radius, shadow) when a fix is visual.
- Build a per-screen spec: layout, colors, typography, spacing, every interactive state (hover/active/focus/disabled/empty), and how the flow connects. Note the neutral palette / button styles so you can spot off-theme deviations (stray blues, red outlines, etc.).
- Map each sub-issue to the exact Figma frame(s) that define its "after".

### 4. Understand every sub-issue (text + IMAGES + VIDEOS)
The real spec often lives in the media and the comments, not the description text.
- Read the full description per sub-issue (list views truncate).
- **ALL comments — ALWAYS.** Fetch every comment on each sub-issue and read them in order — the actual expected behavior, corrections, and "do X instead" decisions often live only there and override the description. Include images/videos attached to comments. An issue read without its comments is NOT fully understood.
- **Related & linked issues — ALWAYS.** Read the parent, sibling sub-issues, and any blocking/blocked-by/related/referenced issue for context. Fetch them in the same GraphQL query:
  ```graphql
  { issue(id:"PROD-XXX"){
      comments{ nodes{ body createdAt user{ name } } }
      parent{ identifier title description }
      relations{ nodes{ type relatedIssue{ identifier title state{ name } } } }
  } }
  ```
- **Images** (`![](...)`, `https://uploads.linear.app/...`): download with the Linear token and look at them —
  `curl -s -L -H "Authorization: $LINEAR_API_KEY" "<URL>" -o /tmp/pl/<ISSUE>.png` then `Read` it.
- **Videos** (`.mov`/embeds): download, extract frames, read a spread:
  ```bash
  mkdir -p /tmp/pl/<ISSUE>
  curl -s -L -H "Authorization: $LINEAR_API_KEY" "<SRC>" -o /tmp/pl/<ISSUE>/v.mov
  ffmpeg -loglevel error -i /tmp/pl/<ISSUE>/v.mov -vf "fps=1,scale=1280:-1" /tmp/pl/<ISSUE>/f_%03d.jpg
  ```
- Per sub-issue write down: what's wrong, "before" vs the Figma "after", and the exact files/endpoints involved.
- Move the sub-issues you're taking to **In Progress** via Linear REST (`issueUpdate(input:{stateId})`; fetch the team's state ids once).

### 5. Resolve each sub-issue (root cause, minimal fix)
- Explore the codebase to find the real cause — verify file/line against current code, don't trust memory. A bug "fixed before" may be a reopened/undeployed regression or a sibling component that never got the fix (e.g. a second menu that still doesn't use the shared portal component).
- Implement the minimal correct fix; match surrounding style and idiom. Pull values from Figma/style-guide tokens.
- i18n: update **all** locales the project ships.
- Typecheck + lint each touched repo and fix until clean (`npx tsc -b` / project's script, `eslint` on changed files).

### 6. PIXEL-PERFECT LOOP (Playwright vs Figma) — the core
Log in with the test user, navigate to the exact screen. For **each** sub-issue, loop until parity:
1. **Screenshot** the live screen/state (resize wide ~1440–1600px for legible shots; element/full-page shots for detail; open the modal/menu/state the issue is about).
2. **Compare** to the matching Figma frame: colors, spacing, typography, radius, shadow, alignment, icon, states. Be specific, not "looks fine".
3. **If it differs**, fix the code, let HMR/redeploy apply, screenshot again. **Repeat** until visually identical. Don't stop at "close".
4. Record the before/after prints.

Then **functional validation** for the same sub-issue — exercise the real flow, don't just confirm the page rendered:
- Click the buttons, open the menus, **create / rename / delete / submit** the real thing, follow redirects.
- Confirm the actual outcome (the item appears in the other view, the row disappears, the toast fires).
- `browser_network_requests` → API calls are 2xx (not 404/409/500); `browser_console_messages` → no real errors (distinguish harmless staging noise).
- If a flow needs data to exist (a due task, a pending request, a file in a folder), create it, test, then **restore** state / delete throwaway data so the environment stays clean.

### 7. Detect & fix backend gaps from the prints
If a print or flow shows something missing or broken that's actually server-side (an endpoint 404s, a field never persists, a list never syncs, an action has no API), open the API repo, find the controller/service, and fix it. Add the endpoint/migration/seed needed so the feature is fully testable. Re-run the loop after the API change is live. A feature is only done when another dev could run and test it without manual setup.

### 8. Commit, push, ensure deploys
- Commit per repo: conventional message, subject ≤72 chars, imperative, **English**, no AI footer. Stage only the files for this work (the tree may hold unrelated changes — add explicit paths, never `git add -A` blindly).
- Push each affected repo to its working branch. `cd` into each repo before `git push` (a second push can silently target the wrong repo).
- Know the deploy model: frontends often auto-deploy from their branch (e.g. Vercel from `development`) — wait and confirm the new build is live before re-validating. If the API does **not** auto-deploy (e.g. Railway), **STOP and ask the user to trigger/approve the deploy**, then re-test after they confirm. A backend fix shows old behavior until its deploy is live.

### 9. Only if EVERYTHING is verified → Developer Testing
- Move each verified sub-issue (and the parent, if the user wants) to **Developer Testing** via Linear REST.
- Never silently pass an unverified issue — if blocked on data/access/deploy, tell the user and ask how to proceed.

### 10. Notify + test report (PT-BR) + memory
- Post a test report as a Linear comment on the parent and summarize in chat. For **each** sub-issue: **Como testar** (exact repro steps), **Como era (antes)**, **Como é agora (depois)**, files touched, commit/branch per repo. Close with deploy status and anything unverifiable.
- If a project-memory system is in use, record what was non-obvious (root cause, the commit, deploy gotchas) for next time.

---

## Notes
- Scale effort to the issue: a title/i18n change is a one-line edit; a "graph not working" is a data-wiring fix needing live chart verification. The pixel-perfect loop still applies to anything visual.
- Prefer the project's own skills where they fit (`/coff-validate`, `/coff-visual-test`, `/coff-read-figma`, `/coff-tracker`), but this skill is self-contained and Linear-driven.
- Keep `/tmp` scratch (video frames, screenshots) out of the repos; clean up at the end.
- Two gates are non-negotiable: (1) you asked for Figma + a test user and waited; (2) every shipped sub-issue was proven both visually (vs Figma) and functionally (real flow) with prints.
