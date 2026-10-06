---
name: coff-visual-test
description: Playwright screenshot comparison for visual testing
---

# coff-visual-test

Take screenshots with Playwright at multiple breakpoints and compare against Figma references.

## Prerequisites
- Playwright must be installed in the frontend repo
- Dev server must be running
- If Playwright is not installed, report as **SETUP NEEDED** — do NOT silently skip

## Important: Scope of Visual Comparison
- **Web repos only** (`react`, `next`) — not applicable to mobile (`react-native`) or backend repos.
- **Only pages/breakpoints that have a Figma reference** in `.harness/assets/`. Not every page or breakpoint will have a design — compare only what exists. Do NOT screenshot pages that have no reference to compare against.
- This is separate from E2E testing (Playwright for web, Detox for mobile), which covers all user flows and edge cases regardless of Figma coverage.

## Multi-Repo Aware
Read `.harness/config.json` and identify **web** repos (`role: "frontend"` or `role: "site"`, stack: `react` or `next`). Run visual tests only for these repos. Skip mobile and backend repos.

## Steps

### 1. Check Setup
- Read `config.repos[]` to identify frontend repos
- For each frontend repo, verify Playwright is in its `package.json`
- Check if dev server is running, start if needed (`cd <repo-path> && npm run dev`)

### 2. Inventory Figma References
- Scan `.harness/assets/` for reference files (naming convention: `<page>-<breakpoint>-reference.png`)
- Build a list of which pages and breakpoints have Figma references available
- Only these will be screenshotted and compared

### 3. Take Screenshots
For each page that has at least one Figma reference, capture only at the breakpoints that have a reference:

```typescript
const breakpoints = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

// Only use breakpoints that have a matching reference file
for (const bp of breakpointsWithReference) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: bp.width, height: bp.height } });
  await page.goto('http://localhost:<port>/<path>');
  await page.screenshot({
    path: `.harness/assets/screenshot-<page>-${bp.name}.png`,
    fullPage: true,
  });
  await browser.close();
}
```

### 4. Compare Against Figma References
- Load each Figma reference and its corresponding screenshot
- Present both images side-by-side to the user
- Flag specific areas with pixel differences
- Highlight discrepancies in colors, spacing, typography, alignment

### 5. Report
Include results in `.harness/plans/<feature-slug>/validation-report.md`:

```markdown
## Visual Test Results

### Figma Coverage
- Pages with references: X
- Total comparisons: Y (across available breakpoints)
- Pages WITHOUT Figma reference (not compared): [list]

### <page>
| Breakpoint | Screenshot | Reference | Result |
|------------|-----------|-----------|--------|
| Desktop (1440px) | screenshot-<name>-desktop.png | <name>-desktop-reference.png | PASS/FAIL |

### Differences Found
- [Page @ Breakpoint]: <specific area and description of difference>
```

## Notes
- Always clean up browser instances
- Only compare what has a Figma reference — do not flag missing references as failures
- Screenshots are stored in `.harness/assets/` for future comparisons
- E2E tests (separate from visual comparison) should cover all pages and edge cases
