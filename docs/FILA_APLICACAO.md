# Fila de aplicação

Algumas correções (em desenvolvimento ou já mescladas) precisam ser **aplicadas no cliente** antes da atualização da revision. A regra de negócio pede essa aplicação ao dono do PR e acompanha tudo na **Fila de aplicação**.

## Fluxo

1. Em **Contexto de chamados**, abra uma correção que tenha PR e use **Vincular chamado**. Informe o número, o cliente e o assunto do chamado que precisou da correção.
2. Marque **Pedir aplicação no cliente** para abrir um pedido na fila para o dono do PR. Sem marcar, o chamado fica só vinculado.
3. O dono do PR (ligado pelo **usuário no Git** do Perfil) vê o pedido em **Fila de aplicação > Para eu aplicar** e muda o status.
4. Ao marcar **Aplicado**, quem pediu vê o pedido em **Aguardando minha continuidade**, dá continuidade no chamado e conclui.

## Status

| Status | Quem muda | Significado |
|---|---|---|
| Aberto | quem pediu | Pedido feito; aguardando o dono do PR |
| Aplicando | dono do PR | O dono está aplicando no cliente |
| Aplicado | dono do PR | Aplicado; a regra precisa dar continuidade |
| Concluído | quem pediu | A regra deu continuidade ao chamado |
| Cancelado | quem pediu | Pedido cancelado |

Cada mudança fica no histórico do pedido, com quem fez, quando e a observação. O menu mostra uma contagem do que depende de você: pedidos abertos ou em aplicação dos seus PRs e pedidos aplicados que você precisa continuar.

## Configuração

- **Usuário no Git:** cada pessoa informa o seu em **Perfil > Usuário no Git (GitHub)**. É por ele que a fila sabe quais PRs são da pessoa.
- **Dono do PR no contexto:** o campo `autorLogin` do `REGRA.md` (ver `MODELO_REGRA.md`). Sem ele, qualquer pessoa pode assumir a aplicação.
- **Firestore:** os pedidos ficam na coleção `vinculos`. As regras do Firestore precisam permitir leitura e escrita por usuário logado, como nas outras coleções.
