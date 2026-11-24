# Notificação de PRs mergeados

- O mesmo sino também mostra mudanças nos cartões do BM atribuídos à pessoa vinculada no Businessmap. A primeira leitura do quadro cria uma referência sem gerar alertas retroativos; mudanças posteriores aparecem na lista e em aviso na tela.
- Enquanto houver notificação não lida, o título da guia alterna entre o título original e a quantidade de avisos pendentes. Ao ler todas, o título original é restaurado.
- Cada categoria de evento do BM tem cor própria: atribuição, troca de responsável, bloqueio, etapa, prazo, prioridade e outras atualizações. Os avisos ficam por usuário no navegador e podem ser marcados como lidos.
- Para reconhecer os cartões pessoais, o perfil precisa ter uma chave do BM validada neste navegador. A lista é atualizada pelos dados do quadro sincronizados no Firestore; a mudança só chega quando o quadro é sincronizado no NucleoPTU.

- A parte de PRs no **sino** lista os PRs da própria pessoa (usuário Git do perfil) mergeados nos últimos 14 dias. Perfil Sustentação e quem não tem usuário Git não recebem avisos de PR; os avisos do BM usam o usuário BM vinculado.
- Cada notificação já traz **Abrir PR** (GitHub) e **Cartão no BM**. O cartão vem do registro sincronizado (`chamados_bm`) do chamado que está no título do PR (`tipo/(000.000)-assunto`); sem cartão sincronizado, aparece o link "Ver chamado" no Contexto de chamados.
- A busca roda ao abrir o sistema, ao voltar para a aba e a cada 5 minutos com a aba visível. Quando surge um merge novo com o sistema aberto, também aparece um aviso na tela com os dois links.
- O que já foi lido fica no navegador (`localStorage`, por usuário). Na primeira vez, só os merges das últimas 24 horas contam como novos.
- Servidor: `GET /api/git/mergeados?login=&dias=` faz uma única consulta ao GitHub (`is:pr is:merged`), exige login, bloqueia Sustentação e limita 30 consultas por minuto por pessoa. A lógica de montagem fica em `app/chamados/prsMergeados.ts` (com testes).
