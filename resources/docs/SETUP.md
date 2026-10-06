# C0FFE Tools - Setup Guide

## Prerequisites

- **Node.js** >= 18
- **pnpm** (recommended) or npm
- **Claude Code**, **Codex** and/or **OpenCode** installed and authenticated
- **gh** CLI (GitHub CLI) installed and authenticated
- **Playwright** (for E2E and visual testing in frontend repos)

## Installation

### 1. Install (one command)

```bash
cd C0FFE-Tools
./install.sh            # macOS / Linux
.\install.cmd           # Windows
```

Builds, puts `coff` on PATH and installs into every AI found: Claude Code (`~/.claude`), Codex (`~/.codex`) and OpenCode (`~/.config/opencode`). Use `--claude`, `--codex` or `--opencode` to pick, `--profile <name>` for a preset (`coff profiles`). Re-run after `git pull`.

What gets installed (global layer; `coff init` installs the pipeline into the project the same way, see the README):

| | Claude Code | Codex | OpenCode |
|---|---|---|---|
| Skills | symlinks `~/.claude/skills/coff-*` | symlinks `~/.agents/skills/coff-*` | uses `~/.agents/skills` if Codex is installed, else `~/.config/opencode/skills/coff-*` |
| Agents | generated `~/.claude/agents/coff-*.md` | generated `~/.codex/agents/coff-*.toml` | generated `~/.config/opencode/agents/coff-*.md` |
| Commands | — | — | generated `~/.config/opencode/commands/coff-*.md` (one per skill) |
| Rules | `~/.claude/rules/c0ffe-tools/` | managed block in `~/.codex/AGENTS.md` | managed block in `~/.config/opencode/AGENTS.md` |
| Context hook | `SessionStart` in `~/.claude/settings.json` | `SessionStart` in `~/.codex/hooks.json` | plugin `~/.config/opencode/plugins/coff-context.js` |

Files are backed up once to `<file>.c0ffe-tools.bak` before being edited. `coff uninstall` removes everything.

### 2. Check the environment

```bash
coff doctor
```

### 3. Set up a project

```bash
cd /path/to/project
coff init               # interactive; creates the client if needed
```

This will:
- Auto-detect git repos in subdirectories (e.g., `web/`, `server/`, `mobile/`)
- Detect the stack for each repo (React, NestJS, React Native, etc.)
- Ask for PRD, tracker, and Figma per UI repo
- Create `.harness/` directory structure
- Create `.claude/` with permissions config
- Generate `CLAUDE.md` (Claude Code) and `AGENTS.md` (Codex)

Non-interactive: `coff init . --client "Acme" --tracker TEAM --figma web=https://figma.com/... -y`

### 4. Install external tools

See `TOOLS_SETUP.md` for required tools (gh, Playwright, Caddy).

### 5. Configure MCP servers

See `MCP_SETUP.md` for detailed instructions on setting up Figma, Notion and Jira MCPs (Claude Code and Codex).

### 6. Set up environment variables

See `ENV_TEMPLATE.md` for required environment variables.

## Project Structure

After setup, your project should look like:

```
~/PROJECTS/CLIENT/PROJECT/
├── web/                  <-- git repo (detected automatically)
├── server/               <-- git repo (detected automatically)
├── .harness/
│   ├── config.json       <-- project config with repos[]
│   ├── memory/
│   │   ├── features.md
│   │   └── decisions.md
│   ├── plans/            <-- feature plans go here
│   └── assets/           <-- Figma references, screenshots
├── .claude/
│   ├── settings.local.json
│   └── rules/
└── CLAUDE.md
```

## Troubleshooting

### Repos not detected
- Ensure each repo has a `.git/` directory
- Ensure each repo has a `package.json` (for stack detection)
- You can manually edit `.harness/config.json` to add repos

### Skills not available
- Run `coff install` again (global + registered projects), or `coff init` inside the project
- Global skills: `~/.claude/skills/coff-*`. Pipeline skills: `<project>/.claude/skills/coff-*` (Codex: `<project>/.agents/skills/`)

### MCP not connecting
- Check `~/.claude/settings.json` for MCP configuration
- See `MCP_SETUP.md` for detailed setup steps
