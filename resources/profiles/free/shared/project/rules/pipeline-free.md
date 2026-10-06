# Pipeline no plano gratuito

Ao usar `/coff-solve`, `/coff-do`, `/coff-plan` ou `/coff-linear` com modelo gratuito:

- **Comece pelo plano:** aja como se `--plan` tivesse sido passado. Mostre o plano e espere a aprovação antes de escrever código.
- **Etapas na própria sessão:** faça Scout e Architect você mesmo, sem subagentes. Use o subagente `coff-engineer` ou `coff-tester` só se a feature for grande, e avise antes.
- **Features pequenas:** se a feature tiver muitas partes, proponha dividir em sub-features e faça uma por vez.
- **Valide sempre:** rode typecheck, lint e testes do que mudou antes de dizer que terminou; se falhar, mostre o erro e explique.
- Se um MCP necessário (Figma, Notion etc.) não estiver configurado, pare e explique como configurar (ver `coff doctor`).
