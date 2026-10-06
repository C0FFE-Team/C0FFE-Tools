# Tool Priority

When implementing features, follow this tool hierarchy:

1. **Agents first** — Use specialized agents (coff-scout, coff-architect, coff-engineer, coff-tester, coff-publisher, plus the global coff-explorer and coff-reviewer) for their designated tasks. Each agent has its own context window and expertise.

2. **Skills second** — Use skills (coff-plan, coff-styleguide, coff-implement, etc.) for specific workflows. Skills are composable and reusable.

3. **MCP tools last** — Only call MCP tools directly (Notion, Figma, Linear) when no agent or skill covers the task, or when an agent/skill instructs you to.

## Rationale
- Agents maintain focused context and follow established workflows
- Skills encode best practices and ensure consistency
- Direct MCP calls bypass safety checks and conventions
