# Integração com o Businessmap (BM) — somente leitura

- Cada chamado (número do contexto) é ligado ao cartão do BM pelo `custom_id`.
- Lista de chamados: coluna do BM (com selo de bloqueado). Detalhe do chamado: seção "Businessmap" com conferência do card (responsável, texto de conclusão, PR, evidência/plano, bloqueio), dados gerais, tempos, campos personalizados agrupados, descrição, subtarefas, vínculos, anexos e comentários.
- Servidor: só chamadas GET (`app/api/_bm.ts`), fila de até 24 chamadas/min por chave (limite do BM: 30/min e 600/h) e cache por chave (metadados 1 h, lotes 5 min, detalhe 2 min). Nada é compartilhado entre chaves de pessoas diferentes.
- **Chave por usuário:** em Perfil → Businessmap cada pessoa cola a própria chave de API do BM (a chave é validada com `GET /me`). Ela fica somente no navegador (localStorage) e segue ao servidor no cabeçalho `x-bm-key` a cada consulta; o servidor não a grava. Em outro navegador é preciso informar de novo.
- Alternativa opcional: `BM_API_KEY` no ambiente do servidor (`.env.local` / Vercel) vale para quem não informou a própria chave.
- Perfil Sustentação recebe o cartão sem campos Git e com links do GitHub ocultados.
- As rotas `/api/bm/*` exigem login.
