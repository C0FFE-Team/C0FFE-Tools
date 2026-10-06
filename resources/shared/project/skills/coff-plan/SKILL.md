---
name: coff-plan
description: Read PRD (Notion or local), analyze Figma designs, find gaps, create tracker project with features in dependency order
user_invocable: true
---

# /coff-plan

Analyze the PRD and Figma designs, identify gaps, and create a structured project plan with features in Linear.

## Rules — No Invention Policy

- NEVER assume or fill in gaps — if something is unclear, ASK the user
- Only proactive action allowed: SUGGEST solutions, clearly marked as `**Suggestion:**`
- Present gaps as questions, not as decisions already made
- WAIT for user confirmation on every gap before proceeding
- Do NOT generate default answers or placeholder values
- If the PRD or Figma is ambiguous, list the ambiguity and ask — do not resolve it yourself

## Steps

### 0. Prerequisites & Source Detection (MANDATORY FIRST STEP)

**Do ALL of the following BEFORE any other action. Do NOT call any MCP tool, do NOT search anything until this step is 100% complete.**

1. Check style guides exist. For each UI repo with `figma_file` set, require `.harness/styleguide-<repo>.md` (single-repo projects: `.harness/styleguide.md`). If any required guide is missing → **STOP** and tell user to run `/coff-styleguide` first.

2. Read `.harness/config.json` — extract `prd`, `tracker_team`, `tracker_project`, and `repos[]`. Figma URLs are per repo: iterate `config.repos[]` and read each `repo.figma_file`. Fallback to top-level `config.figma_file` only for legacy v2 configs.

3. **Detect PRD source** from the `prd` field:
   - Starts with `http` → **Notion URL** → later use `coff-read-prd` (which calls Notion MCP)
   - Does NOT start with `http` and is non-empty → **Local file** → later use `coff-read-prd` (which uses `Read` tool). **Do NOT touch Notion.**
   - Empty → no PRD, warn the user

4. **Detect tracker type** from the `tracker_team` field:
   - Starts with `http` → **Jira** → use Atlassian MCP for ALL issue operations
   - Does NOT start with `http` and is non-empty → **Linear** → use Linear GraphQL API via `curl`/`fetch`
   - Legacy fallback: if `tracker_team` missing, check `linear_team`

5. **HARD RULES:**
   - If PRD is a local file: **do NOT call any Notion MCP tool.** The file is on disk.
   - If tracker is Jira: **do NOT call any Notion MCP tool for issues.** Use Atlassian MCP.
   - If tracker is Linear: **do NOT call any Notion MCP tool for issues.** Use Linear API.
   - Notion MCP is ONLY allowed when `prd` starts with `http` (it's a Notion URL), and ONLY for reading PRD content.

6. **Output the detection results** to the user before proceeding:
   ```
   PRD: local file (<path>) | Notion (<url>)
   Tracker: Jira (<url>) | Linear (<team-key>)
   ```

### 1. Load Project Config
Config already loaded in step 0. Proceed with the detected sources:
- PRD source (global): `config.prd`
- Tracker team key (global): `config.tracker_team`
- Figma URLs (per repo): iterate `config.repos[]` and read each `repo.figma_file`. Fallback to top-level `config.figma_file` only for legacy v2 configs.
- Stack info per repo: `config.repos[]`.

### 2. Scan Existing Codebase
Read `config.repos[]` and scan **ALL repos** in the project. For each repo, discover what exists:
- Routes and pages (check `<repo>/src/app/`, `<repo>/src/pages/`, `<repo>/app/`, `<repo>/pages/`)
- Components (check `<repo>/src/components/`, `<repo>/components/`)
- Models/schemas (check `<repo>/prisma/schema.prisma`, `<repo>/src/models/`, `<repo>/src/types/`)
- API endpoints (check `<repo>/src/api/`, `<repo>/src/app/api/`, `<repo>/src/`)
- Output an inventory of what's already built, organized by repo
- Note which repos each future feature is likely to touch

### 3. Fetch PRD
Use the `coff-read-prd` skill to fetch the PRD content from the configured source (Notion URL or local file).
Read ALL sections — do not stop at the first page.

### 4. Analyze Figma Designs
For **each repo with a `figma_file`** (or the legacy top-level `figma_file`):
1. Read the corresponding `.harness/styleguide-<repo>.md` (or `.harness/styleguide.md` for legacy/single-repo) for design token context
2. Use `mcp__figma__get_design_context` with that repo's `figma_file` URL to get all pages/frames
3. Use `mcp__figma__get_screenshot` for key screens (main flows, critical pages)
4. Build a **screen inventory per repo**: list all designed pages/flows with their names and descriptions, grouped by repo (mobile screens separate from web screens, etc.)
5. Cross-reference PRD features vs Figma screens across all repos:
   - Screen in Figma but NOT in PRD → flag as **"Designed but undocumented"**
   - Feature in PRD but NO Figma screen on any repo → flag as **"Specified but no design"**
   - Feature in PRD targeting a repo with no Figma → flag as **"Repo has no design file"**
6. Feed all discrepancies into the Gap Analysis step

### 5. Gap Analysis
Analyze the PRD + Figma for completeness. Check for:
- **Auth flow**: SSO? Sign-up? Magic link? Password reset? Session management?
- **User roles & permissions**: Who can do what? RBAC? Row-level security?
- **Data model / database schema**: Are all entities defined? Relations? Indexes?
- **API endpoints**: CRUD for each entity? Pagination? Filtering? Error responses?
- **Data validation rules**: Input constraints? Business rules? Required fields?
- **Edge cases**: Empty states? Error states? Loading states? Offline?
- **Integrations**: Payments? Notifications? Email? File upload? Analytics?
- **Navigation flow**: All transitions defined? Deep links? Back navigation?
- **PRD vs Figma discrepancies**: All items from step 4.5 above

### 6. HITL - Present Gaps
Present ALL identified gaps to the user as a structured list.
For each gap, provide a `**Suggestion:**` but frame it as a question.
**WAIT for the user to resolve each gap before proceeding.**
Do NOT assume defaults — ask the user.

### 7. Feature Prioritization Matrix
Generate a prioritization matrix based on all gathered data:

```markdown
## Feature Prioritization Matrix

| Feature | Impact | Effort | Criticality | PRD | Figma | Code |
|---------|--------|--------|-------------|-----|-------|------|
| Auth    | High   | Medium | CRITICAL    | Yes | Yes   | No   |
| Dashboard | High | High  | CRITICAL    | Yes | Yes   | Partial |
| Settings | Low  | Low    | NICE-TO-HAVE | Yes | No   | No   |

Legend:
- Impact: High/Medium/Low — user-facing value
- Effort: High/Medium/Low — estimated implementation size
- Criticality: CRITICAL / IMPORTANT / NICE-TO-HAVE
- PRD/Figma/Code: Yes/No/Partial — coverage across the three sources
```

Present the matrix to the user for review. **WAIT for approval before proceeding.**

### 8. Break into Features
Decompose the PRD into features. Each feature should:
- Have a clear, outcome-oriented title
- Include 2-5 subtasks (objective, not granular)
- Map to a single Linear issue
- Cross-reference existing code inventory (skip what's already built)
- Include the criticality rating from the matrix

### 9. Determine Feature Dependencies
Build a dependency graph:
- Phase 1: Foundation (no dependencies) — e.g., Auth, DB schema, base layout
- Phase 2: Core (depends on Phase 1) — e.g., CRUD features, main pages
- Phase 3: Features (depends on Phase 2) — e.g., Dashboard, analytics, integrations
- Flag circular dependencies or ambiguous ordering

### 10. Create Tracker Structure
Use the `coff-tracker` skill to:
- Create a tracker project (if `tracker_project` not set in config)
- Create issues for each feature with dependency labels
- Set priority based on phase order and criticality matrix

### 11. Update Harness Memory
Write `.harness/memory/features.md` with:
- Implementation order by phase
- All features with status (Pending) and criticality
- Dependency annotations
- PRD/Figma/Code coverage per feature

Also update `.harness/config.json` with the `tracker_project` ID if newly created.
