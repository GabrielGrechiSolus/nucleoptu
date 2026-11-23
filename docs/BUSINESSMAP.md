# Integração com o Businessmap (BM) — somente leitura

- Cada chamado (número do contexto) é ligado ao cartão do BM pelo `custom_id`.
- Lista de chamados: coluna do BM (com selo de bloqueado). Detalhe do chamado: seção "Businessmap" com conferência do card (responsável, texto de conclusão, PR, evidência/plano, fluxo do atendimento, bloqueio), dados gerais, tempos, campos personalizados agrupados, descrição, subtarefas, vínculos, anexos e comentários.
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

## Fluxo de PR e de Card (comunicado de 19/11/2026)

- Vale para todo PR aberto a partir da segunda-feira informada no comunicado (data a confirmar na reunião). Não se vincula reviewer de negócio no GIT: só o **Reviewer Técnico**, Rodrigo Z. para correção e Denys para desenvolvimento.
- Mariana Campos e o líder avaliam o card pelo link do PR vinculado a ele e registram as observações no próprio card.
- O card deve ter obrigatoriamente: link de cada PR vinculado ao atendimento (campo Git PR), link da evidência de teste e Texto de conclusão.
- **Correção:** não espera o aceite do entendimento para fechar; o documento de evidência de testes é obrigatório. **Demais desenvolvimentos:** o aceite da evidência de testes continua obrigatório.
- Na conferência do card: "PR informado" só fica OK com o campo Git PR preenchido (PR apenas no contexto gera atenção); o item "Fluxo do atendimento" mostra o reviewer técnico e a regra de fechamento pelo tipo do card (`fluxoDoAtendimento`, em `app/chamados/bm.ts`: tipo com "correção", "hotfix" ou "issue" = correção; tipo vazio gera atenção). O app apenas informa; não confere o reviewer no GitHub.

## Etapa do fluxo no processo do BM

- A tela do processo mostra, antes das seções de gravação, **onde estamos** (coluna atual e a fase) e a **próxima etapa**, com o fluxo completo agrupado por fase: Entendimento e Validação, Análise, Revisão, Desenvolvimento, QA/Testes, Merge & Release, Documentação e Concluído. Feitas, atual e próxima aparecem em cores diferentes.
- A ordem vem das colunas do quadro (posição no BM); a fase é deduzida do nome da coluna (`app/processos/etapas.ts`). Coluna nova com nome fora do padrão aparece em "Outras etapas".
- O destino padrão de "Mover o cartão" é a próxima etapa (antes era a próxima coluna de entrega/conclusão). Qualquer outra coluna continua disponível na lista.
- Um aviso diz se faltam critérios de saída para seguir para a próxima etapa ou se o cartão já pode avançar.

## Chamados sem PR e reports (quadro do BM)

- A página **Chamados sem PR (BM)** lista os cartões do quadro do BM que não têm PR, inclusive os concluídos. Os dados ficam no Firestore (coleções `bm_quadro` e `bm_quadro_meta`), então todos leem; só quem tem a chave do BM atualiza, pelo botão "Atualizar do BM" ou automaticamente ao entrar.
- A lista vem ordenada pela relevância: report aberto (50), bloqueio (30), prazo vencido (30), prioridade crítica (20) ou alta (10), tempo parado (até 20) e falta de responsável (5). Há abas Em andamento, Com atenção, Concluídos e Todos, além de filtros por responsável, coluna e tipo.
- Report é o cartão do tipo Bug cujo título cita o chamado ("Report: 566.577"). Ele aparece como etiqueta vermelha no chamado de origem, na página de processos, na lista de contexto e nesta página, enquanto não estiver concluído.
- Em **Processos do BM**, uma segunda lista mostra os cartões em que o usuário é responsável e que não têm PR, e o processo (critérios de saída, comentário e mover) funciona também para eles.
- O quadro lido é o 45 (`BM_BOARD_IDS`, separados por vírgula). Libere leitura e escrita de `bm_quadro` e `bm_quadro_meta` nas regras do Firestore.

## Quem acessa Processos do BM

- A tela e a gravação no BM são liberadas aos perfis **Desenvolvimento** e **Análise** (tipo do perfil), com ou sem usuário Git. Sustentação não tem acesso.
- `BM_PROCESSOS_PERFIS` (lista separada por vírgula, padrão `desenvolvimento,analise`) muda os perfis liberados, e `BM_ESCRITA_GIT_USERS` libera usuários Git específicos de outros perfis (padrão `GabrielGrechiSolus`).
- Cada pessoa grava no BM com a própria chave (Perfil → Businessmap); sem chave, a tela avisa.
