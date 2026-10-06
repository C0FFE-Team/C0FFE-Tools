# Tools Setup

External tools required by the C0FFE Tools harness. Install these globally on your machine.

## GitHub CLI (`gh`)

Used by: `coff-create-pr`, `coff-solve` (Publisher agent)

```bash
brew install gh
gh auth login
```

Verify:
```bash
gh auth status
```

## Playwright

Used by: `coff-visual-test`, `coff-implement` (screenshot comparison)

```bash
npm install -g playwright @playwright/test
npx playwright install chromium
```

Verify:
```bash
npx playwright --version
```

Browsers are cached at `~/Library/Caches/ms-playwright/`.

### Usage in skills

The `coff-visual-test` skill uses Playwright headless Chromium to:
- Take screenshots of running pages
- Compare against Figma reference images
- Generate visual diff reports

No per-project Playwright config is needed — the skill runs Chromium directly via the global install.

## Caddy + dnsmasq

Used by: `coff up`, `coff down`, `coff ps` (local dev servers with custom domains)

```bash
coff setup-dns
```

This single command installs and configures everything:
- **dnsmasq** — wildcard DNS (`*.coff.test` -> 127.0.0.1)
- **Caddy** — reverse proxy with auto-TLS via mkcert
- **mkcert** — generates trusted local wildcard certificates

Verify:
```bash
dig test.coff.test @127.0.0.1
```

### Manual install (if `setup-dns` fails)

```bash
brew install dnsmasq caddy mkcert

# dnsmasq config
echo 'address=/.coff.test/127.0.0.1' >> /opt/homebrew/etc/dnsmasq.conf
sudo mkdir -p /etc/resolver
echo 'nameserver 127.0.0.1' | sudo tee /etc/resolver/coff.test
sudo brew services restart dnsmasq

# mkcert
mkcert -install
mkdir -p ~/.c0ffe-tools/certs
mkcert -cert-file ~/.c0ffe-tools/certs/wildcard.pem \
       -key-file ~/.c0ffe-tools/certs/wildcard-key.pem \
       "*.coff.test"
```

## Node.js & pnpm

Required by everything.

```bash
# Node.js (via nvm, fnm, or brew)
brew install node@22

# pnpm
npm install -g pnpm
```

Minimum versions:
- Node.js >= 18
- pnpm >= 8

## Summary

| Tool | Install | Used by |
|------|---------|---------|
| `gh` | `brew install gh` | PRs, issues |
| `playwright` | `npm install -g playwright @playwright/test` | Visual testing |
| `caddy` | `coff setup-dns` | Dev server proxy |
| `dnsmasq` | `coff setup-dns` | Local wildcard DNS |
| `mkcert` | `coff setup-dns` | Local TLS certs |
| `node` | `brew install node` | Everything |
| `pnpm` | `npm install -g pnpm` | Everything |
