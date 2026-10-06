---
name: coff-solvelinear
description: "Resolve all sub-issues of a Linear parent issue end-to-end: read descriptions, interpret every image and video, implement fixes, validate visually + functionally with Playwright, commit/push, ensure deploys, then move all to Developer Testing and send a test report. Args: <parent-issue> (e.g. PROD-412 or its name)"
user_invocable: true
---

# /coff-solvelinear

Take a single Linear **parent issue**, resolve **every** sub-issue under it, validate the work live, ship it, and report back.

**Argument:** the parent issue — a Linear identifier (`PROD-412`) or its title (`DASHBOARD`). The user tells you which issue; you do the rest.

## Communication
- Talk to the human in **PT-BR** (Português do Brasil). Code, commits, branches and comments stay in English.
- Be concise. Report outcomes faithfully — if something fails or is skipped, say so plainly.

## Hard rules
- NEVER credit Claude/AI in commits or PRs (no `Co-Authored-By`, no footer).
- NEVER create a feature branch unless the user asks. Commit on the repo's default working branch:
  `fighty-api` → `main`, `fighty-webapp` → `development` (confirm against `.harness/config.json` / `CLAUDE.md` if unsure).
- Reuse existing components and style-guide tokens. Never hardcode colors/spacing. Check for an existing component before creating one.
- If a required MCP (Linear, Figma) is down, STOP and ask the user to fix it. Do not invent alternatives.
- Do NOT mark anything `Done`. The terminal status for this skill is **Developer Testing**.

## Tools you'll need
Linear is MCP-deferred — load it first:
`ToolSearch("select:mcp__linear__list_issues,mcp__linear__get_issue,mcp__linear__list_comments,mcp__linear__extract_images,mcp__linear__list_issue_statuses,mcp__linear__save_issue")` — `list_comments` is required: you MUST read every issue's comments.
For validation, load Playwright: `browser_navigate, browser_snapshot, browser_click, browser_type, browser_take_screenshot, browser_fill_form, browser_wait_for, browser_network_requests, browser_console_messages, browser_resize`.

---

## Steps

### 1. Resolve the parent + sub-issues, set IN PROGRESS
- Find the parent issue: `list_issues({ query })` or `get_issue({ id })`. Confirm with the user if the match is ambiguous.
- List its children: `list_issues({ parentId: <PARENT>, limit: 50 })`.
- Move **every** sub-issue to **In Progress**: `save_issue({ id, state: "In Progress" })`.
- Keep the full sub-issue list — you'll work and report on each one.

### 2. Understand every sub-issue (descriptions + IMAGES + VIDEOS)
The real spec usually lives in the media and the comments, not the description text. For each sub-issue:
- `get_issue({ id })` for the full description (the list view truncates it).
- **ALL comments — ALWAYS.** Fetch and read every comment on the sub-issue. Corrections, the actual expected behavior, edge cases, and "actually do X instead" decisions frequently live only in the comments and override the description. Look at images/videos attached to comments too. An issue read without its comments is NOT fully understood.
- **Related & linked issues — ALWAYS check.** Read the parent issue, sibling sub-issues, and any blocking/blocked-by/related/referenced issue for extra context. Never fix a sub-issue blind to what its parent or a blocker says.
- **Images** (`![](...)` and `https://uploads.linear.app/...`): pass the markdown to `mcp__linear__extract_images({ markdown })` and actually look at them.
- **Videos** (`<linear-embed node-type="video">` with a `src`): the MCP can't render video — extract frames yourself:
  ```bash
  mkdir -p /tmp/sl/<ISSUE>
  curl -s -o /tmp/sl/<ISSUE>/v.mov "<SRC_URL_WITH_SIGNATURE>"
  ffmpeg -loglevel error -i /tmp/sl/<ISSUE>/v.mov -vf "fps=1,scale=1280:-1" /tmp/sl/<ISSUE>/f_%03d.jpg
  ```
  Then `Read` a spread of frames (start/middle/end) to follow the flow. Videos usually show the bug being reproduced.
- Write down, per sub-issue: what's wrong / what's wanted, "before" vs "after", and the exact files/endpoints involved.

### 3. Resolve each sub-issue
- Explore the codebase to find the real root cause (frontend route/component/i18n, backend service/controller, etc.). Verify file/line against current code — don't trust memory.
- Implement the minimal correct fix. Match surrounding code style, comment density, and idiom.
- For i18n strings, update **all** locales the project ships (e.g. EN/FR/ES).
- After edits, run typecheck on each touched repo (`npx tsc --noEmit`) and fix until clean.

### 4. Validate LIVE with Playwright (visual + functional)
Log into staging with the test account (Fifty Fifty gym):
`rafm54319@gmail.com` / `Tools@123` at `https://fighty-webapp-staging.vercel.app`.
For **each** sub-issue, prove BOTH:
- **Visual** — screenshot the screen and confirm it matches the design/intent (resize to ~1600px wide for legible shots; element screenshots for detail).
- **Functional** — perform the real flow (click the button, submit the form, follow the redirect). Check the actual outcome, not just that the page loaded. Use `browser_network_requests` to confirm API calls return 2xx (not 404/409/500) and `browser_console_messages` for errors. Distinguish app errors from harmless noise (e.g. a Sentry `placeholder` 400 on staging).
- If a sub-issue needs data to be visible (a task due today, a pending request, a deactivated season), create it, test, then **restore** the original state so staging stays clean. Delete throwaway data you created.
- Note honestly anything you could NOT verify and why.

> Validation can only happen after the relevant deploy is live (see step 5). If a backend fix isn't deployed yet, the old behavior shows — wait for the Railway deploy before claiming a backend fix works.

### 5. Commit, push, and ensure deploys
- Commit per repo with a clear conventional message (subject ≤72 chars, imperative). One logical change per commit.
- Push each affected repo to its working branch (`fighty-api` → `main`, `fighty-webapp` → `development`). Run `git push` from inside each repo's directory (a second push can silently target the wrong repo if you don't `cd` in).
- **Vercel (frontend)** auto-deploys from `development`. After pushing webapp, wait and confirm the new build is live (re-navigate staging and check a changed string/element actually updated before validating).
- **Railway (API) does NOT auto-deploy.** When you push anything to `fighty-api`, **STOP and ask the user in chat to approve/trigger the Railway deploy**, then wait for their confirmation. Until the API deploy is live, a backend fix will keep showing old behavior (e.g. a 409 that the fix removes) — re-test only after they confirm.

### 6. Only if EVERYTHING is verified OK → Developer Testing
- When every sub-issue is confirmed working (visual + functional) on staging, move each sub-issue to **Developer Testing**: `save_issue({ id, state: "Developer Testing" })`.
- If something is NOT verifiable (blocked on data/access/deploy), do not silently pass it — tell the user and ask how to proceed. Never move an unverified issue.

### 7. Notify + test report (PT-BR)
Tell the user you finished and send a report. For **each** sub-issue include:
- **Como testar** — exact steps the user follows to reproduce the verification.
- **Como era (antes)** — the broken behavior.
- **Como é agora (depois)** — the fixed behavior.
- File(s) touched, and the commit/branch per repo.
Close with the deploy status (Vercel ✓, Railway ✓ after approval) and anything you couldn't verify.

---

## Notes
- Scale effort to the issue: a typo/title change is a one-line i18n edit; a "graph not working" is a data-wiring fix needing live chart verification.
- Prefer the project's own validation skills where they fit (`/coff-validate`, `/coff-visual-test`, `/coff-deploy`), but this skill is self-contained and Linear-driven.
- Keep `/tmp` scratch (video frames, screenshots) out of the repos; clean it up at the end.
