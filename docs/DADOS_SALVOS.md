# Consultas salvas entre telas

Para não repetir requisições, o que já foi lido é reaproveitado entre as telas. A regra fica em `app/chamados/dadosSalvos.ts`.

| Consulta | Onde é usada | Reaproveitada por | Guardada em |
|---|---|---|---|
| Chamados (`chamados`) | Contexto de chamados, Processos do BM, revisions, menções do chat | 5 minutos | memória |
| Registros do BM (`chamados_bm`) | Contexto de chamados, Processos do BM, menções do chat | 5 minutos | memória |
| Quadro do BM (`bm_quadro`) | Contexto de chamados, Processos do BM, menções do chat | 5 minutos | memória |
| Cartão no Businessmap (tela do processo) | Processos do BM | concluído ou documentado: até **Reler do BM**; aberto: 10 minutos | navegador |
| Permissão da tela de processos | Processos do BM | 10 minutos, só quando permitido | memória |
| Checks do GitHub | tela do processo | 5 minutos | memória |
| Revisions publicadas | início | 10 minutos, só sem falhas | memória |
| Web Relatus | detalhe do chamado | ver `RELATUS.md` | navegador |

## Quando o que foi salvo é descartado

- Importar contextos ou gerar contextos pelo Git descarta os chamados.
- Sincronizar o BM descarta os registros e o quadro.
- Gravar ou mover um cartão descarta o cartão, os registros e o quadro.
- Trocar a chave do BM ou sair do sistema descarta tudo.
- **Atualizar dados** (listas) e **Reler do BM** (cartão) forçam uma nova leitura. F5 também relê o que está só em memória.

Alterações feitas por outra pessoa aparecem quando o prazo vence ou ao forçar a leitura. A sincronização automática, a geração pelo Git e a ação de mover cartão sempre leem o estado atual antes de gravar. A gravação no BM relê o cartão no servidor.

Telas em tempo real (`onSnapshot`) não usam esta regra.
