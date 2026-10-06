# Tools Setup

External tools used by the C0FFE Tools harness. Commands are given for macOS (Homebrew), Windows (winget) and Linux (apt; use your distro's package manager otherwise).

## Node.js & pnpm

Required by everything (the CLI, the installer and the context hook all run on Node).

| OS | Install |
|---|---|
| macOS | `brew install node@22` (or nvm / fnm) |
| Windows | `winget install OpenJS.NodeJS.LTS` |
| Linux | `sudo apt install nodejs npm` (or nvm / fnm for a recent version) |

pnpm is optional: the installer falls back to `npx pnpm` when it is missing.

Minimum versions: Node.js >= 18.

## GitHub CLI (`gh`)

Used by: `coff-create-pr`, `coff-solve` (Publisher agent)

| OS | Install |
|---|---|
| macOS | `brew install gh` |
| Windows | `winget install GitHub.cli` |
| Linux | `sudo apt install gh` |

```bash
gh auth login
gh auth status
```

## Playwright

Used by: `coff-visual-test`, `coff-implement` (screenshot comparison)

```bash
npm install -g playwright @playwright/test
npx playwright install chromium
npx playwright --version
```

The `coff-visual-test` skill uses headless Chromium to take screenshots of running pages, compare them with Figma reference images and produce visual diff reports. No per-project Playwright config is needed.

## Caddy (dev servers)

Used by: `coff up`, `coff down`, `coff ps` — local dev servers on `https://<feature>.coff.localhost`.

| OS | Install |
|---|---|
| macOS | `brew install caddy` |
| Windows | `winget install CaddyServer.Caddy` |
| Linux | `sudo apt install caddy` (see https://caddyserver.com/docs/install) |

Then, once:

```bash
coff setup-proxy
```

It runs `caddy trust` so browsers accept Caddy's local certificates (`tls internal`). No DNS setup: browsers resolve `*.localhost` to `127.0.0.1` on every OS.

## Summary

| Tool | Used by |
|------|---------|
| `node` | Everything |
| `gh` | PRs, issues |
| `playwright` | Visual testing |
| `caddy` | Dev server proxy (`coff up`) |
