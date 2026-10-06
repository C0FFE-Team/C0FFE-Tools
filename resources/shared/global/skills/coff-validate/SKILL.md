---
name: coff-validate
description: Run typecheck, lint, test, and build in sequence. Fix failures up to 5 loops.
---

# coff-validate

Run the full validation suite and fix failures.

## Multi-Repo Aware
If `.harness/config.json` exists, read the list of repos (`config.repos[]`) and run validations **per repo** — each repo has its own `package.json`, `tsconfig.json`, and scripts. Otherwise treat the current git repo as the only repo.

## Validation Order
For each repo, `cd <repo-path>` and run ALL validations in this exact order:

1. **Typecheck**: `npx tsc --noEmit` (or project-specific typecheck command)
2. **Lint**: `npx eslint .` or `npm run lint` (check package.json for lint script)
3. **Unit Tests**: `npm test` or `npx jest` or `npx vitest` (check package.json)
4. **E2E Tests (per repo type)**:
   - Web repos (`react`, `next`): Detect Playwright config. Run `npx playwright test`.
   - Mobile repos (`react-native`): Detect Detox config. Run `npx detox test`.
   - Backend repos (`nestjs`, etc.): No E2E framework — covered by integration/unit tests in step 3.
   - If the expected tool (Playwright/Detox) is not installed, flag as **SETUP NEEDED** — do NOT silently skip.
5. **Build**: `npm run build` (if build script exists)

## Fix Loop
- If any step fails in any repo, analyze the error and fix it
- Re-run ALL validations from the beginning after fixing
- Maximum 5 fix loops — if still failing after 5 attempts, escalate to the user
- Track each fix applied for the validation report

## Output
Return a structured report:
```markdown
## Validation Report

### <repo-name> (<stack>)
- Typecheck: PASS/FAIL (details)
- Lint: PASS/FAIL (details)
- Unit Tests: PASS/FAIL (X/Y passed, details)
- E2E Tests (Playwright/Detox): PASS/FAIL/SETUP NEEDED/N/A (details)
- Build: PASS/FAIL (details)

### <repo-name> (<stack>)
...

## Summary
- Fix loops: N
- Fixes applied: [list]
```

## Notes
- Read each repo's `package.json` first to determine the correct commands
- Respect project-specific config (tsconfig paths, eslint config, etc.)
- Only make MINIMAL fixes — don't refactor or improve code
- If a test failure looks like a feature gap (not a bug), note it, don't fix it
