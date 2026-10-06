---
name: coff-tracker
description: "Create, update, and transition tracker issues. Unified skill with sub-actions. Supports Linear and Jira via auto-detection."
---

# coff-tracker

Manage project tracker issues with auto-detection of Linear or Jira.

## Auto-Detection

Read `.harness/config.json` and determine the tracker type:
- `tracker_team` (or legacy `linear_team`) starts with `http` → **Jira**
- `tracker_team` (or legacy `linear_team`) is short text → **Linear**

### Legacy Fallback
If `tracker_team` is not set but `linear_team` exists, use `linear_team` instead.
If `tracker_project` is not set but `linear_project` exists, use `linear_project` instead.

## Sub-actions

### Read Issue (MANDATORY context gathering)

Whenever you read an issue for context (before implementing, planning, or scouting), you MUST gather the **full** context — not just the title/description:

1. **Full description** — the list/search views truncate it. Always fetch the complete body of the specific issue.
2. **ALL comments — ALWAYS.** Comments frequently hold the real spec, corrections, decisions, edge cases, repro steps, and updated requirements that contradict or extend the description. Never skip them. Read every comment, in order, including images/videos/attachments inside comments.
3. **Related & linked issues — ALWAYS check.** Pull and skim, for extra context:
   - **Parent** issue and **sibling** sub-issues
   - **Child** sub-issues
   - **Blocking / blocked-by / related / duplicate** relations
   - Any issue referenced by ID in the description or comments
   Read enough of each related issue (description + key comments) to understand how it affects this one. Don't implement a sub-issue blind to what its parent or a blocking issue says.
4. **Attachments & media** — images, videos, and file attachments on the issue AND on its comments are part of the spec. Look at them.

> ⛔ Reading only the description is NOT enough. An issue without its comments and related-issue context is considered **not fully read**. This is mandatory before any downstream work (scout, architect, implementation).

#### Linear (GraphQL) — fetch it all in one query
```graphql
{
  issue(id: "PROD-XXX") {
    identifier title description state { name }
    comments { nodes { body createdAt user { name } } }
    parent { identifier title description }
    children { nodes { identifier title state { name } description } }
    relations { nodes { type relatedIssue { identifier title state { name } } } }
    attachments { nodes { title url } }
  }
}
```

#### Jira (Atlassian MCP)
- Fetch the issue with fields including `comment`, `issuelinks`, `parent`, `subtasks`, and `attachment`.
- Read every comment and follow the linked issues / parent / subtasks for context.

### Create Issue
Create a new issue with:
- Title (clear, outcome-oriented)
- Description (acceptance criteria, context)
- Team/Project from config
- Priority (1=urgent, 2=high, 3=medium, 4=low)
- Labels (phase, dependency info)

### Update Issue
Update an existing issue:
- Change description, priority, labels
- Add comments with progress updates
- Link to PRs or other issues

### Transition Issue
Move an issue through workflow states:
- Backlog -> Todo -> In Progress -> In Review -> Done
- Use appropriate state names for the team's workflow

## Linear-Specific

Use the **Linear REST/GraphQL API** (NOT MCP):
- Auth: `LINEAR_API_KEY` environment variable
- API: `https://api.linear.app/graphql`
- Reference: https://developers.linear.app/docs/graphql/working-with-the-graphql-api
- Team key from `tracker_team` (e.g. `TEAM`)
- Project ID from `tracker_project`

### Linear API Examples
```graphql
# Create issue
mutation {
  issueCreate(input: { teamId: "<team-id>", title: "...", description: "...", projectId: "<project-id>" }) {
    issue { id identifier url }
  }
}

# Transition issue
mutation {
  issueUpdate(id: "<issue-id>", input: { stateId: "<state-id>" }) {
    issue { id state { name } }
  }
}
```

## Jira-Specific

Use the **Atlassian MCP** (`atlassian-mcp-server`):
- Instance URL from `tracker_team` (e.g. `https://company.atlassian.net`)
- Project key from `tracker_project`
- Use MCP tools for all CRUD operations

### Jira MCP Usage
- Create issue: use Atlassian MCP create issue tool
- Update issue: use Atlassian MCP update issue tool
- Transition issue: use Atlassian MCP transition tool
- Sub-tasks: create as real sub-tasks with parent key

## Usage Pattern
```
1. Read .harness/config.json for tracker_team and tracker_project (with legacy fallback)
2. Detect tracker type (Linear vs Jira)
3. Use the appropriate API/MCP to perform the action
4. Update .harness/memory/features.md to keep local state in sync
```

## IMPORTANT — Notion is NOT a tracker
- **NUNCA usar Notion MCP para operações de tracker.** Notion é APENAS para leitura de PRDs (quando `prd` começa com `http`).
- Se o tracker é Jira → Atlassian MCP. Se o tracker é Linear → Linear GraphQL API.
- NÃO confunda: Notion ≠ Jira. São ferramentas completamente diferentes.

## Notes
- Always include the feature-slug as an identifier in the issue
- Add dependency info in labels (e.g., "depends:AUTH-1")
- When creating a project, save the project ID back to `.harness/config.json` as `tracker_project`
- Subtasks MUST be created as real sub-issues (children with parentId), NEVER as text/checklist in description
