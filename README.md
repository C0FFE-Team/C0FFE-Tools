# C0FFE Tools

Harness de desenvolvimento com IA para **Claude Code**, **Codex** e **OpenCode**. Leva um projeto do PRD até produção com um pipeline de agents: Scout → Architect → Engineer → Tester → Publisher.

```
PRD (Notion/arquivo) -> Design (Figma) -> Tasks (Linear/Jira) -> Implementação -> Testes -> PR/Deploy
```

## Instalação

```bash
cd C0FFE-Tools
./install.sh        # build + comando `coff` no PATH + instala em cada IA encontrada
coff doctor         # confere MCPs, CLIs e tokens
```

### Global do zero (opcional)

```bash
coff reset --dry-run   # mostra o plano
coff reset             # backup + limpa a config global + instala a camada global
coff restore           # volta qualquer backup (lista se não passar id)
```

O `reset` copia a config atual do Claude, do Codex e do OpenCode para `~/.c0ffe-tools/backups/<data>-reset/` e então:
- **mantém**: MCP servers, plugins/marketplaces, model/theme/statusline, profiles do Codex, `opencode.json`, auth, histórico, sessões e memória;
- **pergunta** quais skills/agents/rules/commands pessoais manter (desmarca por padrão cópias antigas de coisas do c0ffe-tools);
- **zera**: permissões do `settings.json` (vira a base de `resources/claude/permissions.json`), hooks, `~/.codex/AGENTS.md`, `~/.codex/hooks.json`, `~/.codex/rules/` e `~/.config/opencode/AGENTS.md`.

O `install.sh` detecta sozinho o que existe na máquina (`~/.claude`, `~/.codex`, `~/.config/opencode`). Para escolher: `./install.sh --claude`, `--codex` ou `--opencode`. Pode rodar de novo quando quiser (por exemplo, depois de um `git pull`).

## Uso

```bash
cd ~/projetos/meu-projeto
coff init           # detecta repos/stacks, pergunta PRD/tracker/Figma, cria .harness/ + CLAUDE.md + AGENTS.md
                    # e instala o pipeline coff-* dentro do projeto
```

Rodar `coff init` de novo num projeto já registrado só atualiza o pipeline.

Dentro do agente:

| Claude Code | Codex | O que faz |
|---|---|---|
| `/coff-styleguide` | `$coff-styleguide` | Extrai o style guide do Figma (rode primeiro) |
| `/coff-plan` | `$coff-plan` | PRD + Figma → features no tracker, em ordem de dependência |
| `/coff-solve <id>` | `$coff-solve <id>` | Pipeline completo de uma feature do tracker |
| `/coff-do "<descrição>"` | `$coff-do "<descrição>"` | Mesmo pipeline, a partir de texto (sem ticket) |
| `/coff-implement <url>` | `$coff-implement <url>` | Figma → código pixel-perfect |
| `/coff-linear <issue>` | `$coff-linear <issue>` | Resolve todas as sub-issues de uma issue do Linear |
| `/coff-deploy` | `$coff-deploy` | Backend no Railway + frontend no Vercel |
| `/coff-research <tema>` | `$coff-research <tema>` | Pesquisa libs e boas práticas |

`--plan` em `coff-solve`/`coff-do` para antes do Engineer e só entrega o plano.

## O que é instalado

Duas camadas:

- **Global** (`coff install`): rules gerais (idioma, segurança, conduta, stacks), skills utilitárias (`coff-research`, `coff-create-pr`, `coff-validate`), agents genéricos (`coff-explorer`, `coff-reviewer`) e o hook de contexto.
- **Projeto** (`coff init`): o pipeline — skills de feature/Figma/tracker/deploy, agents Scout → Architect → Engineer → Tester → Publisher e as rules de time.

| | Claude Code | Codex | OpenCode |
|---|---|---|---|
| Skills globais | `~/.claude/skills/` | `~/.agents/skills/` | usa as do Codex; sem Codex, `~/.config/opencode/skills/` |
| Agents globais | `~/.claude/agents/*.md` | `~/.codex/agents/*.toml` | `~/.config/opencode/agents/*.md` |
| Commands | — | — | `/coff-*` em `~/.config/opencode/commands/` (um por skill) |
| Rules globais | `~/.claude/rules/c0ffe-tools/` | bloco no `~/.codex/AGENTS.md` | bloco no `~/.config/opencode/AGENTS.md` |
| Skills do projeto | `.claude/skills/` | `.agents/skills/` | usa as do Codex; sem Codex, `.opencode/skills/` |
| Agents do projeto | `.claude/agents/` | `.codex/agents/` | `.opencode/agents/` (+ `.opencode/commands/`) |
| Rules do projeto | `.claude/rules/c0ffe-tools/` | bloco no `AGENTS.md` | o mesmo bloco no `AGENTS.md` |
| Hook de contexto | `SessionStart` no `settings.json` | `SessionStart` no `hooks.json` | plugin `plugins/coff-context.js` (entra no próprio compact) |

- Skills são symlinks para `resources/`: editar vale na hora. Agents, commands e os blocos do `AGENTS.md` são gerados, então rode `coff install` depois de mudá-los (ele atualiza o global e todos os projetos registrados).
- Os arquivos do projeto apontam para esta máquina, então o `coff init` os põe no `.git/info/exclude` (não entram no git e não mexem no `.gitignore`).
- O Codex e o OpenCode só procuram `.agents/skills` da pasta atual até a raiz do repo git. Em projeto multi-repo, abra a IA na raiz do projeto.
- O hook reinjeta `.harness/config.json`, o style guide, o status das features e o plano da feature ativa **depois de um compact**. Para injetar também ao abrir a sessão no Claude/Codex: `export COFF_CONTEXT_ON_START=1`.
- Antes da primeira edição, cada arquivo editado ganha um backup `<arquivo>.c0ffe-tools.bak`. `coff uninstall` desfaz tudo.
- **Usando OpenCode junto com o Claude:** o OpenCode também lê `.claude/skills` e veria as skills duplicadas. Ponha no `~/.zshrc`: `export OPENCODE_DISABLE_CLAUDE_CODE_SKILLS=1` (o `coff doctor` avisa).

## Uma base, ajustes por IA

```
resources/
  shared/{global,project}/{skills,agents,rules}    o que toda IA recebe
  claude/{global,project}/...                      mesmo nome = substitui o shared só no Claude; nome novo = extra
  codex/{global,project}/...   codex/compat.md     idem para o Codex + tradução de vocabulário
  opencode/{global,project}/...  opencode/compat.md
  targets.json                                     por IA: modelo por nível e o que excluir
```

- **Agents** são escritos uma vez com frontmatter neutro (`tier: deep|fast`, `readonly: true`) e gerados no formato de cada IA. O `targets.json` diz o que `deep`/`fast` significam: `opus`/`sonnet` no Claude, esforço `high`/`medium` no Codex e o modelo que você quiser no OpenCode (vazio = herda o da sessão). Agents `readonly` viram `disallowedTools` no Claude, `sandbox_mode = "read-only"` no Codex e `permission.edit: deny` no OpenCode.
- **Override:** quando um texto funciona mal numa IA, crie o mesmo nome em `resources/<ia>/...`. Só essa IA passa a usar a versão nova.
- **Excluir:** `"exclude": ["coff-railway"]` no `targets.json` tira uma skill/agent/rule de uma IA.
- Limitações: Codex e OpenCode compartilham `.agents/skills` e o `AGENTS.md` do projeto, então ali vale a versão do Codex (o install avisa quando um override do OpenCode é ignorado).

## Comandos

```bash
coff                        # guia rápido
coff install [--claude|--codex|--opencode]     # global + atualiza projetos registrados
coff uninstall [--claude|--codex|--opencode]   # tira do global e dos projetos registrados
coff reset [--dry-run] [-y]         # backup + global do zero
coff restore [id] [-y]              # restaura um backup
coff doctor                 # diagnóstico
coff init [path] [--client <nome>] [--prd <url>] [--tracker <TEAM|url-jira>] [--figma repo=url] [-y]
coff status [--client <nome>]
coff add-client <nome> | remove-client <nome> | add-project <path> | remove-project
coff setup-dns              # dnsmasq + Caddy + certs para *.coff.test (uma vez)
coff up <feature> | down <feature> | ps   # dev servers por feature em https://<feature>.coff.test
```

O estado (clientes, projetos, portas, dev servers, backups) fica em `~/.c0ffe-tools/`.

## Pré-requisitos

- Node.js >= 18
- Claude Code, Codex e/ou OpenCode
- MCPs: Figma Desktop, Notion (PRD) e Atlassian (só se usar Jira). Linear usa `LINEAR_API_KEY`, sem MCP. Veja `resources/docs/MCP_SETUP.md` (tem seções para Codex e OpenCode).
- `gh`, e opcionalmente `railway`, `vercel`, `caddy`. Veja `resources/docs/TOOLS_SETUP.md`.

## Estrutura

```
src/                 CLI (TypeScript, Commander)
resources/shared/    base compartilhada (global + project)
resources/claude/    overrides do Claude + permissions.json base
resources/codex/     overrides do Codex + compat.md
resources/opencode/  overrides do OpenCode + compat.md
resources/targets.json  modelos por nível e exclusões por IA
resources/hooks/     hook SessionStart de reinjeção de contexto
resources/docs/      setup, MCPs, ferramentas, env
install.sh           instalador de um comando
```

