# Plano gratuito (OpenCode Zen)

Você está rodando num modelo **gratuito**. Eles têm limites de uso, contexto efetivo menor e erram mais que modelos pagos. Trabalhe de acordo:

## Economize
- Leia só os trechos necessários (por linha/função), nunca arquivos inteiros grandes.
- Nunca leia `node_modules`, `dist`, `build`, lockfiles ou arquivos gerados/minificados.
- Resuma saídas longas de comandos; não cole logs inteiros na conversa.
- Uma tarefa por vez. Se o pedido for grande, divida em partes pequenas e faça uma de cada vez.

## Subagentes
- Prefira fazer o trabalho na própria sessão. Cada subagente gasta mais requisições e bate no limite mais rápido.
- Só chame um subagente (`task`) se a tarefa for realmente grande, e avise antes.

## Limites e erros do modelo
- Se aparecer erro de limite (429, "rate limit", "quota"), pare, explique em uma frase e sugira esperar alguns minutos ou trocar de modelo com `/models`.
- Se você não tiver certeza de algo, diga. Confirme rodando o código, os testes ou um comando, em vez de supor.

## Privacidade
- Modelos gratuitos podem registrar as conversas para melhorar o modelo. Nunca peça nem cole senhas, tokens, chaves de API ou dados pessoais; se o usuário colar, avise e peça para trocar a chave.
