# Integração com o Businessmap (BM) — somente leitura

- Cada chamado (número do contexto) é ligado ao cartão do BM pelo `custom_id`.
- Lista de chamados: coluna do BM (com selo de bloqueado). Detalhe do chamado: seção "Businessmap" com conferência do card (responsável, texto de conclusão, PR, evidência/plano, bloqueio), dados gerais, tempos, campos personalizados agrupados, descrição, subtarefas, vínculos, anexos e comentários.
- Servidor: só chamadas GET (`app/api/_bm.ts`), fila de até 24 chamadas/min por chave (limite do BM: 30/min e 600/h) e cache por chave (metadados 1 h, lotes 5 min, detalhe 2 min). Nada é compartilhado entre chaves de pessoas diferentes.
- **Chave por usuário:** em Perfil → Businessmap cada pessoa cola a própria chave de API do BM (a chave é validada com `GET /me`). Ela fica somente no navegador (localStorage) e segue ao servidor no cabeçalho `x-bm-key` a cada consulta; o servidor não a grava. Em outro navegador é preciso informar de novo.
- Alternativa opcional: `BM_API_KEY` no ambiente do servidor (`.env.local` / Vercel) vale para quem não informou a própria chave.
- Perfil Sustentação recebe o cartão sem campos Git e com links do GitHub ocultados.
- As rotas `/api/bm/*` exigem login.

## Dados gravados no banco (coleção `chamados_bm`)

- Os dados do BM de cada chamado ficam gravados no Firestore, no documento `chamados_bm/<número do chamado, só dígitos>`: resumo (coluna, bloqueio, responsável, link), cartão completo, data e autor da sincronização.
- Todos os usuários leem esses dados na lista e no detalhe do chamado, mesmo sem chave do BM. A tela **não** consulta o BM ao abrir.
- Só quem tem a chave do BM no perfil atualiza: botão **Atualizar do BM** na lista (escolha "Meus chamados", pelo usuário Git do perfil, ou "Todos") e, em cada chamado, na aba Businessmap.
- Atualização inteligente: primeiro uma consulta em lote traz a data de atualização, a coluna e o bloqueio de cada cartão; o detalhe (campos, comentários, subtarefas) só é lido dos cartões que mudaram ou ainda não foram gravados. Chamados sem cartão só são consultados de novo depois de 24 horas. O botão do chamado força a leitura.
- O cartão é gravado inteiro (com Git); a tela de Sustentação oculta o Git ao exibir. Perfil Sustentação não sincroniza.
- A conferência do card (PR, evidência) é recalculada na tela com o contexto atual.
- **Regras do Firestore:** é preciso permitir leitura (login) e escrita (login) em `chamados_bm`, como em `chamados`.
