---
name: coff-solve
description: "Full feature pipeline: Scout > Architect > Engineer > Tester > Publisher. Args: <feature-id> [--plan] [--branch <branch>] [--base <base-branch>] [--worktree]"
user_invocable: true
---

# /coff-solve

Execute the full feature implementation pipeline using specialized agents.

**Arguments:** `<feature-id> [--plan] [--branch <branch>] [--base <base-branch>] [--worktree]`

### Flags
- `--plan` — **Plan-only mode.** Run Scout → Architect and **STOP** before the Engineer. No branch, no worktree, no code is written. Delivers the plan and waits for you to re-run without `--plan` to implement.
- `--branch <branch>` — Use this name for the **new branch** to be created. The branch is created **only at the Engineer stage**, after you confirm (Step 4a).
- `--worktree` — Work in an isolated git worktree. The worktree is created **only at the Engineer stage**, after you confirm (Step 4a).
- `--base <base-branch>` — Base branch for the new branch/worktree (default: current branch / repo default).

> 🔑 **Git strategy is decided and executed ONLY at the Engineer stage — never before, never after.** With no `--branch` and no `--worktree`, the pipeline works on the **current local branch** and NEVER creates a branch on its own. See Step 4a.

## Pipeline

Each stage runs as a separate agent with its own context window. Plan files in `.harness/plans/<feature-slug>/` serve as the contract between agents.

```
Scout -> context-brief.md         (HITL review)
Architect -> implementation-plan.md  (HITL approval)
   ⇧ --plan mode stops here
Engineer -> implementation-notes.md  (Step 4a: git strategy HITL, then HITL per commit)
Tester -> validation-report.md      (HITL on failures)
Publisher -> publish-report.md
```

## Agent Activity Markers

Before launching each agent, output a visible marker. After the agent completes, output a completion marker. This provides clear visual feedback on pipeline progress.

```
--- [Scout Agent] Starting ---
... agent work ...
--- [Scout Agent] Complete ---

--- [Architect Agent] Starting ---
...
```

After the full pipeline, output a summary:
```
Pipeline Summary: Scout (sequential) > Architect (sequential) > Engineer (sequential) > Tester (sequential) > Publisher (sequential)
All stages executed sequentially — each depends on the previous stage's output.
```

## Steps

### 0. Prerequisites & Source Detection (MANDATORY FIRST STEP)

**Do ALL of the following BEFORE any other action. Do NOT call any MCP tool, do NOT search anything, do NOT launch any agent until this step is 100% complete.**

1. Check if `.harness/styleguide.md` exists. If NOT → **STOP** and tell user to run `/coff-styleguide` first.

2. Read `.harness/config.json` — extract `prd`, `tracker_team`, `tracker_project`, and `repos[]`.

3. **Detect PRD source** from the `prd` field:
   - Starts with `http` → **Notion URL** → later use `mcp__claude_ai_Notion__notion-fetch` to read it
   - Does NOT start with `http` and is non-empty → **Local file** → later use the `Read` tool directly. **Do NOT touch Notion.**
   - Empty → no PRD, warn the user

4. **Detect tracker type** from the `tracker_team` field:
   - Starts with `http` → **Jira** → use Atlassian MCP (`atlassian-mcp-server`) for ALL issue operations
   - Does NOT start with `http` and is non-empty → **Linear** → use Linear GraphQL API via `curl`/`fetch`
   - Legacy fallback: if `tracker_team` missing, check `linear_team`

5. **HARD RULES — read these before proceeding:**
   - If PRD is a local file: **do NOT call any Notion MCP tool.** Read the file with the `Read` tool.
   - If tracker is Jira: **do NOT call any Notion MCP tool for issues.** Use Atlassian MCP.
   - If tracker is Linear: **do NOT call any Notion MCP tool for issues.** Use Linear API.
   - Notion MCP is ONLY allowed when `prd` starts with `http` (it's a Notion URL), and ONLY for reading PRD content.
   - The `<feature-id>` argument (e.g. `DRP-3035`) is a **tracker issue ID**, NOT a Notion page. Look it up in `.harness/memory/features.md` or in the tracker (Jira/Linear). NEVER search Notion for it.

6. **Output the detection results** to the user before proceeding:
   ```
   PRD: local file (<path>) | Notion (<url>)
   Tracker: Jira (<url>) | Linear (<team-key>)
   ```

### 1. Setup
- Look up the feature in `.harness/memory/features.md`
- Create `.harness/plans/<feature-slug>/` directory
- **Determine (do NOT create)** the intended branch name: `feature/<feature-slug>` (or the value of `--branch`). This is only a name recorded in the plan — no git command runs here.
- Pass detected PRD source and tracker type to all downstream agents

> ⛔ **NO GIT MUTATIONS IN THIS STEP.** Do NOT run `git checkout -b`, `git branch`, `git switch -c`, or `git worktree add` here — or anywhere before the Engineer stage. The git strategy (worktree / new branch / current local branch) is decided and executed **only** at the Engineer stage (Step 4), and only after the user approves the engineer. See Step 4a.

### 2. Scout Agent
Output: `--- [Scout Agent] Starting ---`

Launch the **coff-scout** agent to gather all context for this feature:
- PRD section (via coff-read-prd)
- Figma designs for relevant screens
- Existing code patterns and conventions
- Library documentation if needed

Output: `.harness/plans/<feature-slug>/context-brief.md`

Output: `--- [Scout Agent] Complete ---`

**HITL: Present the context brief to the user for review. Wait for approval.**

### 3. Architect Agent
Output: `--- [Architect Agent] Starting ---`

Launch the **coff-architect** agent to design the implementation:
- Read the context brief
- Research the codebase for patterns, conventions, existing code
- Design the implementation approach
- Break into phases (each phase = one atomic commit)
- Specify files to create/modify per phase
- Include schema changes, API contracts, component architecture

Output: `.harness/plans/<feature-slug>/implementation-plan.md`

Output: `--- [Architect Agent] Complete ---`

**HITL: Present the plan to the user for approval. Wait for approval before proceeding.**

### 4. Engineer Agent

> 🛑 **`--plan` mode — STOP HERE.** If `--plan` was passed, do NOT launch the engineer, do NOT run Step 4a, do NOT create any branch or worktree, do NOT write any code. Output:
> ```
> Plan-only mode: pipeline stopped before implementation.
> Plan: .harness/plans/<feature-slug>/implementation-plan.md
> To implement, re-run without --plan (optionally add --branch <name> or --worktree).
> ```
> Then end the pipeline. Nothing below runs.

#### 4a. Git Strategy Decision (orchestrator — MANDATORY, happens ONLY here)

Before the engineer touches a single file, the orchestrator resolves the git strategy **at this moment**. This is the ONLY place in the pipeline where a branch or worktree may be created. Never earlier, never later, never on your own initiative.

Pick the branch based strictly on the flags, and **ask the user to confirm before executing anything**:

- **`--worktree` was passed:**
  1. Show the user the worktree(s) that will be created (repos, branch name `<branch>`, base `<--base or current>`) and **wait for approval**.
  2. On approval, for each affected repo:
     ```bash
     grep -qxF '.worktrees' <repo-path>/.gitignore || echo '.worktrees' >> <repo-path>/.gitignore
     git -C <repo-path> worktree add <repo-path>/.worktrees/<feature-slug> -b <branch-name>
     ```
  3. Record `.harness/plans/<feature-slug>/worktrees.json`:
     ```json
     {
       "branch": "feature/<feature-slug>",
       "worktrees": [
         { "repo": "server", "original": "/path/to/server", "worktree": "/path/to/server/.worktrees/<slug>" }
       ]
     }
     ```
  4. From here on, ALL file ops for that repo target the worktree path. Pass the worktree paths to the engineer.

- **`--branch <name>` was passed (no `--worktree`):**
  1. Confirm with the user the **new branch** to be created: "Vou criar a branch nova `<branch>` (base: `<--base or current>`) em cada repo afetado. Confirma?" and **wait for approval**.
  2. On approval, in each affected repo:
     ```bash
     git -C <repo-path> checkout -b <branch-name>
     ```

- **Neither flag (default):**
  1. Detect the current branch: `git -C <repo-path> rev-parse --abbrev-ref HEAD`.
  2. Confirm with the user: "Não foi passado `--branch` nem `--worktree`. Vou trabalhar na branch local atual (`<current-branch>`) e **NÃO vou criar branch nova**. Confirma?" and **wait for approval**.
  3. On approval, do NOT create any branch or worktree. Work on the currently checked-out branch as-is.

**Hard rules for Step 4a:**
- NEVER create a branch or worktree unless a flag explicitly requested it AND the user confirmed here.
- With no flags, the default is the current local branch — NEVER auto-create a branch from your own head.
- This decision belongs to the Engineer stage only. If any branch/worktree already exists because an earlier step created it, that is a bug — it must not happen.

#### 4b. Implement
Output: `--- [Engineer Agent] Starting ---`

Launch the **coff-engineer** agent to implement the approved plan, passing it the resolved git target (worktree paths, or the current local branch):
- Follow the plan phase by phase
- Each phase results in one atomic commit
- HITL before every commit
- Track deviations from plan

Output: `.harness/plans/<feature-slug>/implementation-notes.md`

Output: `--- [Engineer Agent] Complete ---`

### 5. Tester Agent
Output: `--- [Tester Agent] Starting ---`

Launch the **coff-tester** agent to validate the implementation:
- Run typecheck, lint, tests, build
- Fix failures (max 5 loops)
- Run visual tests if available
- Escalate if can't fix

Output: `.harness/plans/<feature-slug>/validation-report.md`

Output: `--- [Tester Agent] Complete ---`

### 6. Publisher Agent
Output: `--- [Publisher Agent] Starting ---`

Launch the **coff-publisher** agent to ship the feature:
- Create a **separate PR per repo** that has changes on the feature branch
- Link all PRs to the tracker issue
- Update tracker issue status
- Update `.harness/memory/features.md`

Output: `.harness/plans/<feature-slug>/publish-report.md`

Output: `--- [Publisher Agent] Complete ---`

**HITL: Confirm before creating PRs and updating tracker.**

### 7. Cleanup
- Update `.harness/memory/features.md` with completion status
- Log any decisions to `.harness/memory/decisions.md`

#### Worktree Cleanup (only if `--worktree` was used)
If `.harness/plans/<feature-slug>/worktrees.json` exists:
1. **HITL: Confirm before removing worktrees** (user may want to keep them for review)
2. For each worktree:
   ```bash
   git -C <original-repo-path> worktree remove .worktrees/<feature-slug>
   ```
3. **Do NOT delete the branch** — it's needed for the PR
4. Delete `worktrees.json` after successful cleanup

- Output pipeline summary with execution mode (sequential)
