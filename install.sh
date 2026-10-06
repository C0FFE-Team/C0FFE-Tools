#!/usr/bin/env bash
# install.sh — build + put `coff` on PATH + install into Claude Code / Codex / OpenCode
#
#   ./install.sh            # auto-detects Claude Code, Codex and OpenCode
#   ./install.sh --codex    # flags are forwarded to `coff install`
#
# Safe to re-run (idempotent). Use it after `git pull` too.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if ! command -v node &>/dev/null; then
  echo "✗ Node.js >= 18 não encontrado." >&2
  exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "✗ Node $(node -v) — precisa >= 18." >&2
  exit 1
fi

echo "→ Dependências + build"
if command -v pnpm &>/dev/null; then
  pnpm install --silent
  pnpm build >/dev/null
else
  npx --yes pnpm@9 install --silent
  npx --yes pnpm@9 build >/dev/null
fi
chmod +x dist/cli.js resources/hooks/context-reinject.sh

echo "→ Comando 'coff' no PATH"
BIN_DIR="$(npm prefix -g)/bin"
if [ ! -w "$BIN_DIR" ]; then
  BIN_DIR="$HOME/.local/bin"
  mkdir -p "$BIN_DIR"
fi
ln -sfn "$ROOT/dist/cli.js" "$BIN_DIR/coff"
echo "  $BIN_DIR/coff -> $ROOT/dist/cli.js"
case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *) echo "  ! $BIN_DIR não está no PATH — adicione ao seu ~/.zshrc: export PATH=\"$BIN_DIR:\$PATH\"" ;;
esac

"$ROOT/dist/cli.js" install "$@"
