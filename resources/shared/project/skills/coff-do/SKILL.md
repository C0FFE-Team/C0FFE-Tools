---
name: coff-do
description: "Full feature pipeline from text description (no ticket required): Scout > Architect > Engineer > Tester > Publisher. Args: <description> [--plan] [--branch <branch>] [--base <base-branch>] [--worktree]"
user_invocable: true
---

# /coff-do

Execute the full feature implementation pipeline from a text description — no tracker ticket required.

**Arguments:** `<description> [--plan] [--branch <branch>] [--base <base-branch>] [--worktree]`

The `<description>` is free-form text describing what to implement. It replaces the feature-id used in `coff-solve`. Examples:
- `/coff-do "Add dark mode toggle to the settings page"`
- `/coff-do "Refactor auth middleware to support API keys" --branch feature/api-keys`
- `/coff-do "Create a reusable date picker component based on the Figma at <url>"`
- `/coff-do "Add dark mode toggle" --plan` (stop after the plan, implement nothing)

### Flags
- `--plan` — **Plan-only mode.** Run Scout → Architect and **STOP** before the Engineer. No branch, no worktree, no code is written. Delivers the plan and waits for you to re-run without `--plan` to implement.
- `--branch <branch>` — Use this name for the **new branch** to be created. The branch is created **only at the Engineer stage**, after you confirm (Step 4a).
- `--worktree` — Work in an isolated git worktree. The worktree is created **only at the Engineer stage**, after you confirm (Step 4a).
- `--base <base-branch>` — Base branch for the new branch/worktree (default: current branch / repo default).

> 🔑 **Git strategy is decided and executed ONLY at the Engineer stage — never before, never after.** With no `--branch` and no `--worktree`, the pipeline works on the **current local branch** and NEVER creates a branch on its own. See Step 4a.

## Pipeline

Same pipeline as `coff-solve`. Each stage runs as a separate agent with its own context window. Plan files in `.harness/plans/<feature-slug>/` serve as the contract between agents.

```
Scout -> context-brief.md         (HITL review)
Architect -> implementation-plan.md  (HITL approval)
   ⇧ --plan mode stops here
Engineer -> implementation-notes.md  (Step 4a: git strategy HITL, then HITL per commit)
Tester -> validation-report.md      (HITL on failures)
Publisher -> publish-report.md
```

## Agent Activity Markers

Before launching each agent, output a visible marker. After the agent completes, output a completion marker.

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

### 0. Prerequisites & Slug Generation (MANDATORY FIRST STEP)

**Do ALL of the following BEFORE any other action. Do NOT call any MCP tool, do NOT search anything, do NOT launch any agent until this step is 100% complete.**

1. Check if `.harness/styleguide.md` exists. If NOT -> **STOP** and tell user to run `/coff-styleguide` first.

2. Read `.harness/config.json` — extract `prd`, `tracker_team`, `tracker_project`, and `repos[]`.

3. **Generate a feature slug** from the description text:
   - Lowercase, kebab-case, max 50 chars
   - Example: `"Add dark mode toggle"` -> `add-dark-mode-toggle`
   - This slug is used for branch names, plan directories, and all references

4. **Output the setup to the user:**
   ```
   Mode: text description (no tracker ticket)
   Slug: <generated-slug>
   Repos: <from config>
   ```

### 1. Setup
- Create `.harness/plans/<feature-slug>/` directory
- **Determine (do NOT create)** the intended branch name: `feature/<feature-slug>` (or the value of `--branch`). This is only a name recorded in the plan — no git command runs here.
- Save the original description text to `.harness/plans/<feature-slug>/request.md`

> ⛔ **NO GIT MUTATIONS IN THIS STEP.** Do NOT run `git checkout -b`, `git branch`, `git switch -c`, or `git worktree add` here — or anywhere before the Engineer stage. The git strategy (worktree / new branch / current local branch) is decided and executed **only** at the Engineer stage (Step 4), and only after the user approves the engineer. See Step 4a.

### 2. Scout Agent
Output: `--- [Scout Agent] Starting ---`

Launch the **coff-scout** agent to gather context for this feature. Since there is no tracker ticket, the scout works from the description text directly.

The scout should:
- Use the description text as the spec (do NOT look up any tracker)
- Search the codebase for existing patterns, similar features, reusable components
- If a Figma URL is included in the description, extract design specs from it
- If the project has a PRD (`prd` field in config), search it for related sections (optional, best-effort)
- Research libraries/APIs if the description implies unfamiliar tech

Output: `.harness/plans/<feature-slug>/context-brief.md`

The context brief should use this adapted format:
```markdown
# Context Brief: <Feature Title>

## Request
- Description: <original text from user>

## Design Specs (if Figma URL provided)
<Figma extractions with references to screenshots>

## Related PRD Sections (if found)
<any PRD sections that relate to this request>

## Existing Patterns
<code patterns, conventions, reusable components>

## Research Notes
<library docs, API references>

## Open Questions
<ambiguities that need user input>
```

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
- PR description should include the original request text
- **No tracker update** — there is no ticket to update
- Update `.harness/memory/features.md` if it exists

Output: `.harness/plans/<feature-slug>/publish-report.md`

Output: `--- [Publisher Agent] Complete ---`

**HITL: Confirm before creating PRs.**

### 7. Cleanup
- Update `.harness/memory/features.md` with completion status (if file exists)
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
