---
name: coff-styleguide
description: Extract comprehensive style guide from Figma using Desktop MCP
user_invocable: true
---

# /coff-styleguide

Extract a comprehensive style guide from Figma per UI repo and write it to `.harness/styleguide-<repo>.md` (single repo projects: `.harness/styleguide.md`).

## Important
- Use ONLY the Figma Desktop MCP tools (`mcp__figma__*`). NEVER use the Figma REST API.
- Extract CONCRETE values (hex codes, px values, font names). No vague descriptions.

## Steps

### 1. Load Config
Read `.harness/config.json`. Figma URLs now live **per repo** under `repos[].figma_file`. Top-level `figma_file` is a legacy fallback only.

- Collect every `repo` where `repo.figma_file` is set (UI repos: frontend, mobile, site, web, desktop, pwa).
- If none found and top-level `config.figma_file` exists → treat as single-repo project, use that URL once.
- If user passed `--repo <name>` arg → restrict to that one repo.
- Run steps 2–5 **once per Figma file** and write a separate `.harness/styleguide-<repo>.md` per repo. Single-repo projects keep the legacy `.harness/styleguide.md` filename.

### 2. Get Figma Context
Use these Figma Desktop MCP tools:
- `mcp__figma__get_design_context` — Get the overall design structure
- `mcp__figma__get_screenshot` — Capture visual references
- `mcp__figma__get_variable_defs` — Get design tokens/variables

### 3. Extract Design Tokens
Extract ALL of the following with concrete values:

**Colors**
- Primary, secondary, accent colors (hex + opacity)
- Neutral scale (backgrounds, borders, text)
- Semantic colors (success, warning, error, info)
- Dark mode variants if present

**Typography**
- Font families (exact names)
- Size scale (px values for each level: h1-h6, body, caption, overline)
- Font weights used
- Line heights
- Letter spacing

**Spacing**
- Base grid unit
- Padding/margin scale (4, 8, 12, 16, 20, 24, 32, 40, 48, 64...)
- Component-specific spacing patterns

**Borders & Effects**
- Border radius values (none, sm, md, lg, full)
- Shadow definitions (elevation levels)
- Border widths and colors

**Components**
For each component found, document:
- Visual appearance (size, colors, typography)
- States: default, hover, focus, active, disabled, selected, empty
- Variants (primary, secondary, outline, ghost, etc.)
- Component list: buttons, inputs, selects, checkboxes, radio, toggle, cards, modals, dialogs, navs, tabs, badges, avatars, tooltips, toasts

**Iconography**
- Icon set/library used
- Standard sizes
- Color usage rules

**Grid & Layout**
- Breakpoints (mobile, tablet, desktop)
- Container max-widths
- Column system
- Gutter widths

**Images**
- Aspect ratios used
- Placeholder patterns
- Background image treatments

### 4. Write Style Guide
Write the complete style guide to `.harness/styleguide-<repo>.md` (one file per UI repo). Single-repo projects: write to `.harness/styleguide.md`.

### 5. Download Assets
Download any reference images, icons, or backgrounds to `.harness/assets/` using `mcp__figma__get_screenshot` for key reference frames.

### 6. Report
Summarize what was extracted and flag any incomplete areas that need manual review.
