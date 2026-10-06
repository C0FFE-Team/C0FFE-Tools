---
name: coff-implement
description: "PIXEL PERFECT Figma to code implementation. Args: <figma-url> [instructions]"
user_invocable: true
---

# /coff-implement

Implement a Figma design as pixel-perfect production code.

**Arguments:** `<figma-url> [--instructions "additional context"]`

## Rules
- Use ONLY Figma Desktop MCP (`mcp__figma__*`). Never the REST API.
- PIXEL PERFECT fidelity — exact colors, spacing, typography, sizing from the design.
- Use style guide tokens from `.harness/styleguide.md` — never hardcode values.
- DRY — always check existing components before creating new ones.
- Download ALL images/backgrounds — never reference Figma CDN URLs in code.

## Steps

### 0. Prerequisites
Check if `.harness/styleguide.md` exists. If it does NOT exist:
- **STOP immediately**
- Tell the user: "Style guide not found. Run `/coff-styleguide` first to extract design tokens from Figma before implementing."
- Do NOT proceed with any further steps.

### 1. Load Context
- Read `.harness/styleguide.md` for design tokens
- Read `.harness/config.json` for stack info
- Scan existing components: `src/components/`, `components/`, etc.

### 2. Fetch Design
Use Figma Desktop MCP:
- `mcp__figma__get_design_context` with the provided Figma URL
- `mcp__figma__get_screenshot` for visual reference
- `mcp__figma__get_variable_defs` for any component-specific tokens

### 3. DRY Check
Map design elements to existing components:
- Buttons, inputs, cards, modals — check if they already exist
- Layout components — check existing grid/container components
- Only create NEW components when nothing existing fits

### 4. Implement
Build the design following these requirements:

**Visual Fidelity**
- Exact sizes (width, height, padding, margin) from Figma
- Exact colors from style guide tokens
- Exact typography (font, size, weight, line-height, letter-spacing)
- Exact border radius, shadows, borders

**Interactive Elements**
- ALL clickable elements must have `cursor: pointer`
- Focus outlines on all interactive elements (accessibility)
- Implement ALL states: hover, focus, active, disabled, selected
- Empty states for lists/data displays

**Assets**
- Download images using `mcp__figma__get_screenshot` for specific nodes
- Save to project assets directory (e.g., `public/`, `assets/`)
- Use proper img tags with alt text or background-image as appropriate

**Static Illustrations — Export, NEVER Reproduce**
- Illustrations, decorative graphics, complex shapes, and non-dynamic visuals MUST be exported as images from Figma — NEVER attempt to recreate them with CSS, SVG paths, or HTML
- If an element is NOT interactive, NOT data-driven, and NOT dynamically changing → it's a static asset → export it via `mcp__figma__get_screenshot` at the highest quality
- This includes: hero illustrations, decorative backgrounds, complex icons with gradients, mascots, badges, patterns, abstract shapes, onboarding graphics
- Do NOT waste time trying to replicate visual art with code

**Responsive**
- Follow breakpoints from style guide
- Mobile-first if the stack supports it

### 5. Visual Verification
If Playwright is available:
- Take a screenshot of the implemented component
- Compare side-by-side with the Figma screenshot
- Flag any pixel differences

### 6. Report
List all components created/modified with file paths.
