---
name: coff-read-figma
description: Extract design information from a Figma node using Desktop MCP
---

# coff-read-figma

Extract design details from Figma using ONLY the Figma Desktop MCP.

## Usage
Called by agents (coff-scout) and skills (coff-implement) to extract design specs.

## Steps

1. Use `mcp__figma__get_design_context` with the Figma node URL to get structure
2. Use `mcp__figma__get_screenshot` to capture a visual reference
3. Use `mcp__figma__get_variable_defs` to get design tokens applied to the node
4. Extract and return:
   - Layout structure (frames, auto-layout, constraints)
   - Colors (fills, strokes) with hex values
   - Typography (font, size, weight, line-height)
   - Spacing (padding, gaps, margins)
   - Effects (shadows, blurs)
   - Component variants and states
   - Asset references (images, icons)

## Rules
- NEVER use Figma REST API — Desktop MCP ONLY
- Extract CONCRETE values, not variable references
- Note all interactive states visible in the design
- **Flag static illustrations and decorative graphics** — these should be exported as images, NOT reproduced with code. Mark them in the output as `[EXPORT AS IMAGE]` so downstream agents know to download them instead of coding them.
