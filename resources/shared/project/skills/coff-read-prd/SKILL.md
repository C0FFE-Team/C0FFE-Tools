---
name: coff-read-prd
description: Fetch PRD from Notion URL or local file
---

# coff-read-prd

Fetch PRD content from either a Notion URL or a local file path.

## Usage
Called by agents (coff-prd-analyst, coff-scout) and skills (coff-plan) to retrieve PRD content.

## Steps

1. Read `.harness/config.json` for the `prd` field (legacy: also accept `notion_prd`)
2. Detect the source type:
   - If the value starts with `http` → it's a **Notion URL**: use `mcp__claude_ai_Notion__notion-fetch` to retrieve it
   - If the value is a file path (relative or absolute) → it's a **local file**: read it directly with the Read tool
     - Relative paths resolve from the project root (where `.harness/` lives)
   - If the value is empty → report error: "No PRD configured in .harness/config.json"
3. If Notion: follow child page links and fetch all sections (don't stop at the first page)
4. Return the full PRD content as structured markdown

## Notes
- Always fetch/read the FULL PRD, not just the first section
- Preserve heading hierarchy for section references
- If Notion MCP is unavailable when the source is a Notion URL, report the error clearly
- Legacy support: if `prd` field is missing but `notion_prd` exists, use `notion_prd`
