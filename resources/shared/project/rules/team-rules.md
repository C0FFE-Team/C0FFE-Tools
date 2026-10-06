# Team Rules

## Project Tracker

### Detecção
- O campo `tracker_team` em `.harness/config.json` determina o tracker automaticamente
- Se `tracker_team` começa com `http` → **Jira** (URL da instância, ex: `https://company.atlassian.net`)
- Se `tracker_team` é texto curto → **Linear** (team key, ex: `TEAM`)
- Legacy: aceitar `linear_team`/`linear_project` como fallback se `tracker_team`/`tracker_project` não existir

### Linear
- NÃO usar MCP para Linear. Usar a API REST do Linear via `fetch`/`curl`
- O token da API Linear estará disponível como variável de ambiente `LINEAR_API_KEY`
- Referência: https://developers.linear.app/docs/graphql/working-with-the-graphql-api

### Jira
- Usar o MCP oficial da Atlassian (`atlassian-mcp-server`)
- A URL da instância vem de `tracker_team` (ex: `https://company.atlassian.net`)
- O project key vem de `tracker_project`
- **NUNCA usar Notion MCP para gerenciar issues quando o tracker é Jira.** Notion é apenas para PRD (quando `prd` começa com `http`). Jira é Jira — issues, sprints, boards e sub-tasks são SEMPRE gerenciados via Atlassian MCP, nunca via Notion.

### Criação de Issues (ambos)
- Subtasks DEVEM ser criadas como sub-issues reais (issues filhas com `parentId`), NUNCA como texto/checklist na descrição
- Descrições devem ser completas e úteis: contexto, critérios de aceite, e referências relevantes
- Se houver link do Figma (frame, componente, página), incluir o link direto na descrição da issue
- Cada sub-issue também deve ter sua própria descrição clara, não apenas um título
- Sempre usar o skill `coff-tracker` para operações com o tracker

## Feature Completa
- Uma feature SÓ está pronta quando TODAS as suas dependências estão implementadas e funcionando
- Isso inclui: schema/migrations de banco de dados, seeds, variáveis de ambiente, configurações, pacotes necessários, etc.
- NÃO entregar código que não pode ser testado por falta de infraestrutura (banco, API, serviço externo, etc.)
- Se a feature precisa de um banco de dados, o schema, a migration e o seed devem ser criados junto com o código
- Se a feature depende de um serviço externo, a configuração e integração devem estar inclusas
- O critério é: outro dev deve conseguir rodar e testar a feature imediatamente após o merge, sem setup manual adicional

## Convenções de Infra
- Backend SEMPRE roda na porta `8000`
