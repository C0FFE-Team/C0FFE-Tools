# c0ffe-tools

C0FFE Tools: AI development harness for Claude Code, Codex and OpenCode. CLI binary `coff`.

## Structure
- `src/` — CLI source (TypeScript, Commander)
- `src/utils/targets.ts` — low-level helpers: AI detection, symlinks, managed files/blocks, JSON hooks
- `src/utils/resources.ts` — resolves what each AI gets: `shared/` + per-AI override + `targets.json` excludes
- `src/utils/agents.ts` — neutral agent format → Claude `.md`, Codex `.toml`, OpenCode `.md`; OpenCode `/coff-*` commands
- `src/utils/layers.ts` — where each AI keeps each layer (global / project); install, uninstall and doctor checks share one plan
- `src/utils/opencode.ts` — OpenCode compaction plugin (reuses `resources/hooks/context-reinject.sh`)
- `src/utils/backup.ts` — backup/restore of the global config (`coff reset`, `coff restore`)

## Resources
- `resources/shared/{global,project}/{skills,agents,rules}` — text every AI gets
- `resources/<claude|codex|opencode>/{global,project}/{skills,agents,rules}` — same name replaces the shared entry for that AI; new name is an extra
- `resources/targets.json` — per AI: `tiers` (agent `tier: deep|fast` → model or reasoning effort) and `exclude` (names that AI must not get)
- `resources/<codex|opencode>/compat.md` — Claude vocabulary → that AI, prepended to its global rules block
- `resources/claude/permissions.json` — base permissions written by `coff reset`
- `resources/hooks/context-reinject.sh` — re-injects `.harness/` context after compaction (Claude/Codex SessionStart, OpenCode plugin)
- Agent frontmatter is neutral: `name`, `description`, `tier`, `readonly`. Never put an AI-specific `model:` in `shared/`.

## Sharing constraints
- OpenCode reads `.claude/skills` and `.agents/skills` too and needs unique skill names: with Codex installed it uses Codex's `.agents/skills` (an OpenCode-only skill override is then ignored, with a warning); with Claude installed users should set `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS=1`.
- Codex and OpenCode share the project `AGENTS.md` block; Codex's version wins.

## Build
```bash
./install.sh     # deps + build + `coff` on PATH + `coff install`
pnpm typecheck
pnpm dev         # watch mode
```

## Conventions
- Skill, agent and command names are always prefixed `coff-` (avoids clashes with the user's own).
- Anything written into an AI's config must be removable by `coff uninstall`: symlinks point into `resources/`, generated files carry the `managed by c0ffe-tools` marker, edited files get a one-time `.c0ffe-tools.bak`.
- New skill/agent/rule: `shared/global/` only if it works in any repo without `.harness/`, else `shared/project/`. Use a per-AI override only when the shared text works badly in that AI. Re-run `coff install` (global + registered projects) and `coff doctor`.
- `coff reset` never touches auth, history, sessions, project memory, MCP servers, plugins or prefs, and always backs up to `~/.c0ffe-tools/backups/` first.

## Commands
- `coff install|uninstall [--claude|--codex|--opencode]`, `coff doctor`
- `coff reset [--dry-run] [-y]`, `coff restore [id]` — global config from scratch, with backup
- `coff init [path]` — one-step project setup (`add-project` with auto client)
- `coff status`, `coff add-client`, `coff remove-client`, `coff remove-project`
- `coff setup-dns`, `coff up|down <feature>`, `coff ps` — per-feature dev servers on `*.coff.test`
