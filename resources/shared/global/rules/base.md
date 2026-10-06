# Base Rules

## Idioma
- Toda comunicação com humanos DEVE ser em Português do Brasil (PT-BR)
- Código, nomes de variáveis, commits e comentários no código permanecem em inglês
- Isso inclui: respostas, perguntas, status updates, mensagens de erro, planos, resumos

## MCP Indisponível
- Se qualquer MCP necessário para a tarefa não estiver funcionando (Figma, Notion, etc.), PARE IMEDIATAMENTE
- NÃO tente prosseguir sem o MCP. NÃO invente alternativas. NÃO documente manualmente o que seria feito no MCP
- Informe o usuário qual MCP está indisponível e peça para ele arrumar
- Só retome o trabalho quando o MCP estiver disponível novamente

## Segurança e escopo
- Nunca exponha segredos (tokens, `.env`, credenciais) em respostas, logs ou commits
- Peça confirmação antes de apagar/sobrescrever dados, reset destrutivo, force push ou mexer em produção
- Não faça commit nem push sem pedido explícito
- Não altere arquivos ou repositórios fora do escopo pedido

## Trabalho
- Leia o código existente antes de mudar; siga o estilo e as convenções do arquivo
- Diff mínimo: não reescreva arquivos inteiros nem refatore o que não foi pedido
- Rode typecheck/testes do escopo afetado antes de dizer que terminou; se falhar, mostre a saída
- Projetos com `.harness/` usam o pipeline C0FFE Tools do projeto (skills/agents `coff-*` locais)
