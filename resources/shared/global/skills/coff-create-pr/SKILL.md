---
name: coff-create-pr
description: Create a GitHub PR with conventional title using gh CLI
---

# coff-create-pr

Create a GitHub Pull Request using the `gh` CLI.

## Prerequisites
- `gh` CLI must be installed and authenticated
- Current branch must be pushed to remote

## Steps

### 1. Prepare
- Ensure all changes are committed
- Push the current branch: `git push -u origin <branch>`

### 2. Generate PR Content
**Title format:** `<type>(<scope>): <description>`
- Types: feat, fix, refactor, test, docs, chore, style
- Scope: feature area or component
- Description: short imperative sentence

**Body format:**
```markdown
## Summary
- [bullet points of changes]

## Feature (only in C0FFE Tools projects — omit otherwise)
- Tracker: <feature-id>
- Plan: .harness/plans/<feature-slug>/

## Test Plan
- [ ] Typecheck passes
- [ ] Lint passes
- [ ] Tests pass
- [ ] Build succeeds
- [ ] Visual review completed
```

### 3. Create PR
```bash
gh pr create --title "<title>" --body "<body>" --base <base-branch>
```

### 4. Report
Return the PR URL. If the project has `.harness/memory/features.md`, add the PR reference there.

## Notes
- HITL: Always confirm with user before creating the PR
- Default base branch is `main` unless specified
- Add the tracker issue link in the PR body when there is one
