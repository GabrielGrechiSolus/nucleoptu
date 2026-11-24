# Notificação de PRs mergeados

- O **sino** no cabeçalho lista os PRs da própria pessoa (usuário Git do perfil) mergeados nos últimos 14 dias. Perfil Sustentação e quem não tem usuário Git não veem o sino.
- Cada notificação já traz **Abrir PR** (GitHub) e **Cartão no BM**. O cartão vem do registro sincronizado (`chamados_bm`) do chamado que está no título do PR (`tipo/(000.000)-assunto`); sem cartão sincronizado, aparece o link "Ver chamado" no Contexto de chamados.
- A busca roda ao abrir o sistema, ao voltar para a aba e a cada 5 minutos com a aba visível. Quando surge um merge novo com o sistema aberto, também aparece um aviso na tela com os dois links.
- O que já foi lido fica no navegador (`localStorage`, por usuário). Na primeira vez, só os merges das últimas 24 horas contam como novos.
- Servidor: `GET /api/git/mergeados?login=&dias=` faz uma única consulta ao GitHub (`is:pr is:merged`), exige login, bloqueia Sustentação e limita 30 consultas por minuto por pessoa. A lógica de montagem fica em `app/chamados/prsMergeados.ts` (com testes).
