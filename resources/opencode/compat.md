# C0FFE Tools (OpenCode)

C0FFE Tools skills (`coff-*`) and agents (`coff-*`) share one text with Claude Code and Codex. Skills are loaded with the `skill` tool and also exposed as `/coff-*` commands; agents are OpenCode subagents (`~/.config/opencode/agents/`, project `.opencode/agents/`). Where the text uses Claude Code vocabulary, translate:

| Skill/agent text says | Do this in OpenCode |
|---|---|
| "Launch the **coff-X** agent", Agent tool, `subagent_type` | Call the `task` tool with the subagent `coff-X`, passing the same inputs and files. Wait for its result before the next stage. |
| `/coff-x`, "use the coff-x skill" | Load it with the `skill` tool (`skill({ name: "coff-x" })`) and follow its `SKILL.md`. |
| `AskUserQuestion` / "ask the user (HITL)" | Use the `question` tool (or ask in plain text with numbered options) and **stop until the user answers**. |
| `TodoWrite` / task list | Use the `todowrite` tool. |
| `Read` / `Edit` / `Write` / `Glob` / `Grep` | OpenCode built-ins `read`, `edit`, `write`, `glob`, `grep`. |
| `mcp__figma*__*` (Figma Desktop MCP) | Tools of the MCP server `figma` in `opencode.json` (named `figma_<tool>`), URL `http://127.0.0.1:3845/mcp`. |
| `mcp__claude_ai_Notion__*` | Tools of the MCP server `notion`. |
| `mcp__atlassian__*` (Jira) | Tools of the MCP server `atlassian`. |
| Playwright MCP / browser tools | Tools of the MCP server `playwright`. |
| `.claude/` project files | Project instructions live in `AGENTS.md`; harness state lives in `.harness/`. |

If an MCP the skill needs is not configured in `opencode.json`, STOP and tell the user which one is missing (see `coff doctor`). Never fake its output.

Below are the global rules C0FFE Tools applies everywhere.
