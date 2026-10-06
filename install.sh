#!/usr/bin/env sh
# macOS / Linux: ./install.sh [coff install flags]   e.g. ./install.sh --opencode --profile free
set -e
command -v node >/dev/null 2>&1 || { echo "✗ Node.js >= 18 não encontrado. Baixe em https://nodejs.org" >&2; exit 1; }
exec node "$(dirname "$0")/scripts/install.mjs" "$@"
