# Guia: C0FFE Tools no OpenCode (plano free)

Para quem está começando com agentes de IA e usa o **OpenCode** com os **modelos gratuitos** do OpenCode Zen. Funciona no Windows, macOS e Linux. Os exemplos usam o **PowerShell do Windows**; no macOS/Linux use o Terminal (os comandos são os mesmos, exceto onde indicado).

## O que você ganha

- O OpenCode passa a responder em português, explicar o que vai fazer antes de fazer e pedir confirmação antes de qualquer coisa arriscada.
- Regras para o plano free: lê menos arquivos, usa poucos subagentes (que gastam limite), avisa quando bater no limite de uso.
- Comandos prontos dentro do OpenCode: `/coff-research`, `/coff-validate`, `/coff-create-pr` em qualquer pasta, e o pipeline completo (`/coff-plan`, `/coff-do`, `/coff-solve`…) nos projetos configurados.
- Modelos gratuitos já escolhidos (e trocados sozinhos quando um modelo free sai do ar e você roda `coff install` de novo).

## 1. Instale o básico (uma vez)

Abra o **PowerShell** (menu Iniciar → digite "PowerShell") e rode, um por vez:

```powershell
winget install OpenJS.NodeJS.LTS
winget install Git.Git
```

Feche e abra o PowerShell de novo (para ele enxergar os programas novos) e confira:

```powershell
node -v
git --version
```

Os dois devem mostrar um número de versão. Depois instale o OpenCode:

```powershell
npm install -g opencode-ai
```

> macOS: `brew install node git` e depois `npm install -g opencode-ai`.

## 2. Entre no OpenCode Zen (grátis)

```powershell
opencode
```

Dentro do OpenCode, digite `/connect`, escolha **OpenCode Zen** e cole a chave que você cria em https://opencode.ai/auth (conta gratuita). Saia com `Ctrl+C`.

## 3. Instale o C0FFE Tools com o perfil free

```powershell
cd ~
git clone https://github.com/C0FFE-Team/C0FFE-Tools.git
cd C0FFE-Tools
.\install.cmd --profile free
```

> macOS/Linux: `./install.sh --profile free`

Isso cria o comando `coff` e configura o OpenCode. Feche e abra o PowerShell, então confira tudo:

```powershell
coff doctor
```

Linhas com ✓ estão certas. Com ✗ ou !, o próprio doctor diz o que fazer.

## 4. Use no dia a dia

**Em qualquer pasta**, abra o OpenCode e converse normalmente. Comandos úteis:

| Comando | O que faz |
|---|---|
| `/coff-research <tema>` | Pesquisa uma biblioteca ou dúvida e resume com exemplos |
| `/coff-validate` | Roda typecheck, lint, testes e build e corrige erros |
| `/coff-create-pr` | Cria um Pull Request no GitHub (precisa do `gh`) |
| `/models` | Troca o modelo (útil quando um dá erro de limite) |

**Num projeto**, rode uma vez dentro da pasta dele:

```powershell
cd caminho\do\projeto
coff init
```

Depois, dentro do OpenCode, nessa pasta:

1. `/coff-do "o que você quer construir"` → ele mostra um plano e **espera você aprovar** antes de escrever código.
2. Leia o plano, peça ajustes se quiser, aprove.
3. Ao final ele diz como testar e o que mudou.

Com PRD, Figma e tracker (Linear/Jira): `/coff-styleguide`, depois `/coff-plan`, depois `/coff-solve <id>` para cada feature. Veja o README principal.

## Atualizar

```powershell
cd ~\C0FFE-Tools
git pull
.\install.cmd
```

O perfil free fica lembrado; não precisa passar `--profile` de novo.

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| `coff` não é reconhecido | Feche e abra o PowerShell. Se continuar, rode `.\install.cmd` de novo e leia o aviso sobre PATH. |
| "rate limit", "429", "quota" | Limite do plano free. Espere alguns minutos ou troque de modelo com `/models`. |
| `coff doctor` diz "modelo indisponível" | O modelo gratuito saiu do ar. Troque com `/models`, ou apague `model` e `small_model` do `opencode.json` (`%USERPROFILE%\.config\opencode\opencode.json`) e rode `coff install`. |
| O OpenCode pede permissão para cada edição | É de propósito no perfil free: você vê cada mudança antes. Escolha "sempre permitir" na sessão quando estiver confortável. |

## Cuidados

- **Não cole senhas, tokens ou chaves** na conversa: modelos gratuitos podem guardar as conversas para melhorar o modelo.
- Faça commits pequenos e frequentes (o agente sugere e explica). Assim dá para voltar atrás se algo der errado.
- Voltar ao setup padrão (quando usar outras IAs/planos): `coff install --profile default`.
