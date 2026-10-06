# Guia: Status Line no Claude Code

Configura uma barra de status fixa no rodape do Claude Code mostrando:
- **Modelo** em uso (ex: Opus 4.6)
- **Projeto** (nome da pasta)
- **Branch** git atual
- **Subagent** ativo (quando aplicavel)
- **Barra de progresso** do contexto (com cores: verde < 70%, amarelo 70-90%, vermelho > 90%)
- **Duracao** da sessao

## Preview

```
[Opus 4.6] meu-projeto | feat/login | engineer
████████░░ 78% | 12m 34s
```

## Requisitos

- Claude Code CLI instalado
- `jq` instalado (`brew install jq` no Mac, `apt install jq` no Linux)
- `git` instalado

## Setup (2 passos)

### 1. Criar o script `~/.claude/statusline.sh`

```bash
cat > ~/.claude/statusline.sh << 'SCRIPT'
#!/usr/bin/env bash
# Status line — displays session context at the bottom of Claude Code
# Receives JSON session data on stdin, prints formatted status to stdout

set -euo pipefail

INPUT=$(cat)

# ── Parse fields ──────────────────────────────────────────────────────────────

MODEL=$(echo "$INPUT" | jq -r '.model.display_name // "—"')
PCT=$(echo "$INPUT" | jq -r '.context_window.used_percentage // 0' | cut -d. -f1)
CWD=$(echo "$INPUT" | jq -r '.cwd // "—"')
AGENT=$(echo "$INPUT" | jq -r '.agent.name // empty')
DURATION_MS=$(echo "$INPUT" | jq -r '.cost.total_duration_ms // 0')

# ── Derive project name from CWD ─────────────────────────────────────────────

PROJECT=$(basename "$CWD" 2>/dev/null || echo "—")

# ── Context bar (10 chars) with color thresholds ──────────────────────────────

RED='\033[31m'
BLUE='\033[34m'
GREEN='\033[32m'
YELLOW='\033[33m'
BOLD_RED='\033[1;31m'
DIM='\033[2m'
RESET='\033[0m'

if [ "$PCT" -ge 90 ]; then
  BAR_COLOR="$BOLD_RED"
elif [ "$PCT" -ge 70 ]; then
  BAR_COLOR="$YELLOW"
else
  BAR_COLOR="$GREEN"
fi

BAR_WIDTH=10
FILLED=$((PCT * BAR_WIDTH / 100))
EMPTY=$((BAR_WIDTH - FILLED))
BAR=""
[ "$FILLED" -gt 0 ] && printf -v FILL "%${FILLED}s" && BAR="${FILL// /█}"
[ "$EMPTY" -gt 0 ] && printf -v PAD "%${EMPTY}s" && BAR="${BAR}${PAD// /░}"

# ── Duration ──────────────────────────────────────────────────────────────────

DURATION_SEC=$((DURATION_MS / 1000))
MINS=$((DURATION_SEC / 60))
SECS=$((DURATION_SEC % 60))

# ── Git branch ────────────────────────────────────────────────────────────────

BRANCH=""
if [ "$CWD" != "—" ] && git -C "$CWD" rev-parse --git-dir > /dev/null 2>&1; then
  BRANCH=$(git -C "$CWD" branch --show-current 2>/dev/null || true)
fi

# ── Build output ──────────────────────────────────────────────────────────────

# Line 1: [model] project | branch | agent
LINE1="${RED}[${MODEL}]${RESET} ${BLUE}${PROJECT}${RESET}"

if [ -n "$BRANCH" ]; then
  LINE1="${LINE1} ${DIM}|${RESET} ${GREEN}${BRANCH}${RESET}"
fi

if [ -n "$AGENT" ]; then
  LINE1="${LINE1} ${DIM}|${RESET} ${RED}${AGENT}${RESET}"
fi

# Line 2: context bar + pct | duration
LINE2="${BAR_COLOR}${BAR}${RESET} ${PCT}% ${DIM}|${RESET} ${MINS}m ${SECS}s"

echo -e "$LINE1"
echo -e "$LINE2"
SCRIPT

chmod +x ~/.claude/statusline.sh
```

### 2. Adicionar no `~/.claude/settings.json`

Abra o arquivo e adicione a chave `statusLine` no top-level do JSON:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.sh",
    "padding": 1
  }
}
```

> Se o arquivo ja tiver conteudo (ex: `permissions`, `hooks`), adicione `statusLine` como mais uma chave no mesmo objeto, junto com as existentes.

### Testar

```bash
echo '{"model":{"display_name":"Opus 4.6"},"context_window":{"used_percentage":55},"cwd":"'$(pwd)'","cost":{"total_duration_ms":180000},"agent":{}}' | ~/.claude/statusline.sh
```

Deve mostrar algo como:

```
[Opus 4.6] meu-projeto | main
█████░░░░░ 55% | 3m 0s
```

Reinicie o Claude Code para ver a status line no rodape.

## Como funciona

O Claude Code chama o script periodicamente, passando um JSON via stdin com dados da sessao:

| Campo | Descricao |
|-------|-----------|
| `model.display_name` | Nome do modelo ativo |
| `context_window.used_percentage` | % do contexto consumido |
| `cwd` | Diretorio de trabalho atual |
| `agent.name` | Subagent ativo (vazio se nenhum) |
| `cost.total_duration_ms` | Duracao total da sessao em ms |

O script processa esses dados e imprime linhas formatadas com cores ANSI que o Claude Code renderiza no rodape.

## Cores da barra de contexto

| Faixa | Cor | Significado |
|-------|-----|-------------|
| 0-69% | Verde | Contexto saudavel |
| 70-89% | Amarelo | Atencao, contexto enchendo |
| 90-100% | Vermelho | Critico, compactacao iminente |

## Troubleshooting

- **Nao aparece nada**: Verifique se `jq` esta instalado (`which jq`)
- **Erro de permissao**: Rode `chmod +x ~/.claude/statusline.sh`
- **JSON invalido no settings.json**: Valide com `python3 -m json.tool ~/.claude/settings.json`
- **Branch nao aparece**: So funciona em diretorios que sao repositorios git
