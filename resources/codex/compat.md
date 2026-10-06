# C0FFE Tools (Codex)

C0FFE Tools skills (`coff-*`) and agents (`coff-*`) share one text with Claude Code and OpenCode. General ones are global (`~/.agents/skills`, `~/.codex/agents`); the feature pipeline is installed per project by `coff init` (`.agents/skills/`, `.codex/agents/`, rules in the project's `AGENTS.md`). Where the text uses Claude Code vocabulary, translate:

| Skill/agent text says | Do this in Codex |
|---|---|
| "Launch the **coff-X** agent", Agent tool, `subagent_type` | Spawn the Codex subagent `coff-X` (`.codex/agents/coff-X.toml` in the project, or `~/.codex/agents/`), passing the same inputs and files. Wait for its result before the next stage. If subagents are unavailable, perform the role yourself following `{{RESOURCES_DIR}}/shared/project/agents/coff-X.md` (or `shared/global/agents/`). |
| `/coff-x`, "use the coff-x skill" | Use the Codex skill `coff-x` (`$coff-x`); read its `SKILL.md` first. |
| `AskUserQuestion` / "ask the user (HITL)" | Ask in plain text with numbered options and **stop until the user answers**. |
| `TodoWrite` / task list | Use the plan tool. |
| `Read` / `Edit` / `Write` / `Glob` / `Grep` | Shell reads (`sed -n`, `rg`) and `apply_patch`. |
| `mcp__figma*__*` (Figma Desktop MCP) | Codex MCP server `figma` (`http://127.0.0.1:3845/mcp`). |
| `mcp__claude_ai_Notion__*` | Codex MCP server `notion`. |
| `mcp__atlassian__*` (Jira) | Codex MCP server `atlassian`. |
| Playwright MCP / browser tools | Codex MCP server `playwright`, or the built-in browser if available. |
| `.claude/` project files | Project instructions live in `AGENTS.md`; harness state lives in `.harness/` (same as Claude). |

If an MCP the skill needs is not configured in `~/.codex/config.toml`, STOP and tell the user which one is missing (see `coff doctor`). Never fake its output.

Below are the global rules C0FFE Tools applies everywhere.
