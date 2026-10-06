# MCP Server Configuration

Configure these MCP servers in `~/.claude/settings.json` to enable full harness functionality.

## Project Tracker

The harness auto-detects Linear or Jira based on `tracker_team` in `.harness/config.json`:
- Text curto (ex: `TEAM`) → **Linear** (usa REST API, não precisa de MCP)
- URL (ex: `https://company.atlassian.net`) → **Jira** (usa Atlassian MCP)

### Linear (REST API — sem MCP)

Linear usa a API GraphQL diretamente via `LINEAR_API_KEY`. Não precisa de MCP server.

1. Crie uma API key em [Linear Settings > API](https://linear.app/settings/api)
2. Exporte a variável de ambiente:
```bash
export LINEAR_API_KEY="lin_api_..."
```

### Jira (Atlassian MCP)

Usado por `coff-tracker` quando `tracker_team` é uma URL Jira.

1. Crie um API token em [Atlassian API Tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Adicione ao `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "atlassian": {
      "command": "npx",
      "args": ["-y", "atlassian-mcp@latest"],
      "env": {
        "ATLASSIAN_BASE_URL": "https://company.atlassian.net",
        "ATLASSIAN_API_TOKEN": "your-api-token",
        "ATLASSIAN_USERNAME": "your-email@company.com"
      }
    }
  }
}
```

3. Reinicie o Claude Code
4. Verifique que as tools `mcp__atlassian__*` estão disponíveis

## Notion MCP

Used by `/coff-plan` and `/coff-read-prd` to fetch PRDs.

Notion MCP is available as a built-in Claude AI integration:
1. In Claude Code, go to Settings > Integrations
2. Connect your Notion workspace
3. Share the relevant PRD pages with the integration

No manual configuration needed — the `mcp__claude_ai_Notion__*` tools will be available automatically.

## Figma Desktop MCP

Used by `/coff-styleguide`, `/coff-implement`, and `/coff-read-figma`.

Figma Desktop MCP is built into Figma Desktop:
1. Open Figma Desktop (must be the desktop app, not browser)
2. Go to Figma > Settings > Developer
3. Enable "MCP Server"
4. Restart Claude Code

The `mcp__figma__*` tools will be available automatically.

## Figma Framelink (Optional)

Alternative Figma MCP for more detailed design extraction:

```json
{
  "mcpServers": {
    "figma-framelink": {
      "command": "npx",
      "args": ["-y", "figma-developer-mcp"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_..."
      }
    }
  }
}
```

Get a Figma access token from [Figma Settings > Personal Access Tokens](https://www.figma.com/settings).

## Full Example

```json
{
  "mcpServers": {
    "atlassian": {
      "command": "npx",
      "args": ["-y", "atlassian-mcp@latest"],
      "env": {
        "ATLASSIAN_BASE_URL": "https://company.atlassian.net",
        "ATLASSIAN_API_TOKEN": "your-api-token",
        "ATLASSIAN_USERNAME": "your-email@company.com"
      }
    },
    "figma-framelink": {
      "command": "npx",
      "args": ["-y", "figma-developer-mcp"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_..."
      }
    }
  }
}
```

> **Nota:** Linear não precisa de MCP — usa `LINEAR_API_KEY` como variável de ambiente direto.

## Codex

Codex reads MCP servers from `~/.codex/config.toml` (not from Claude's settings). The C0FFE Tools skills expect these server names (`coff doctor` checks them):

```toml
# Figma Desktop (Figma > Preferences > Enable Dev Mode MCP Server)
[mcp_servers.figma]
url = "http://127.0.0.1:3845/mcp"

# Notion (PRD)
[mcp_servers.notion]
url = "https://mcp.notion.com/mcp"

# Jira — only if tracker_team is a Jira URL
[mcp_servers.atlassian]
url = "https://mcp.atlassian.com/v1/sse"

# Playwright (coff-visual-test, coff-linear)
[mcp_servers.playwright]
command = "npx"
args = ["-y", "@playwright/mcp@latest"]
```

Remote servers with OAuth: run `codex mcp login <name>` once. Linear keeps using `LINEAR_API_KEY` (no MCP), same as on Claude Code.

## OpenCode

OpenCode reads MCP servers from `~/.config/opencode/opencode.json` (key `mcp`). Same server names as Codex (`coff doctor` checks them):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "figma": { "type": "remote", "url": "http://127.0.0.1:3845/mcp" },
    "notion": { "type": "remote", "url": "https://mcp.notion.com/mcp" },
    "atlassian": { "type": "remote", "url": "https://mcp.atlassian.com/v1/sse" },
    "playwright": { "type": "local", "command": ["npx", "-y", "@playwright/mcp@latest"] }
  }
}
```

Remote servers with OAuth: run `opencode mcp auth <name>` once. Tools show up as `<server>_<tool>`.

## Verification

After configuring, restart Claude Code and check that the MCP tools are available:
- Jira: `mcp__atlassian__*` tools (só se usar Jira)
- Notion: `mcp__claude_ai_Notion__*` tools
- Figma Desktop: `mcp__figma__*` tools
- Linear: não usa MCP — usa `LINEAR_API_KEY` env var
