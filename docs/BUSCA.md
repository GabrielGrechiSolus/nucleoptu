# Busca

## Como pesquisar

Vale para todas as telas com campo de busca (a lógica está em `app/busca/motor.ts`).

| Você digita | O que acontece |
|---|---|
| várias palavras | todas precisam aparecer, em qualquer ordem e em campos diferentes |
| com ou sem acento, maiúsculas | não faz diferença |
| `568.361` ou `568361` | encontra o chamado nos dois formatos |
| `#1234`, `banco#1234`, `banco 1234` | encontra o PR; `#123` não confunde com `#1234` |
| link de um PR ou de um cartão do BM | encontra pelo PR ou pelo id do cartão |
| `"texto entre aspas"` | o trecho precisa aparecer junto |

## Contexto de chamados

A busca percorre sempre:

- **Chamado:** número, cliente, assunto, resumo, status, módulo, caminho na tela, revision e autores.
- **PR e Git:** repositório, número e link dos PRs, branches e usuários.
- **Documentos:** todos os documentos do contexto, links de evidência e planos de teste.
- **Businessmap:** cartão sincronizado (coluna, responsáveis, título, tipo, prioridade, etiquetas, motivo de bloqueio, descrição, campos, subtarefas, comentários, anexos e vínculos), cartões do quadro e reports do chamado.

Quando o termo não está no cabeçalho, o resultado mostra **Encontrado em**. Se outra aba, um filtro ou um cartão sem PR também corresponder, a tela avisa e oferece um botão para ver. No perfil Sustentação, os dados do Git não entram na busca.

Em **Processos do BM** e na **Fila de aplicação**, ao pesquisar, os itens concluídos ou fechados também entram.

## Busca ao vivo no GitHub e no BM

O Contexto de chamados mostra o botão **Buscar no GitHub e no BM ao vivo** quando há ao menos 3 caracteres. Ela só roda quando pedida e o resultado é reaproveitado por 5 minutos.

| Fonte | O que pesquisa | Limites |
|---|---|---|
| GitHub (`/api/git/busca`) | título e descrição de PRs de toda a organização, de qualquer pessoa e data | até 30 resultados, os atualizados mais recentemente; 15 buscas por minuto; exige acesso ao Git |
| Businessmap | cartões pelo **número do chamado** | exige a chave pessoal no perfil; texto livre não é pesquisado ao vivo |

A consulta não aceita qualificadores do GitHub (como `org:` ou `repo:`), para ficar restrita à organização configurada.

## O que a busca não alcança

Sem a busca ao vivo, só aparece o que já foi importado ou sincronizado: contextos gerados (PRs recentes de quem usa o sistema ou importação) e dados do BM sincronizados. Cartões nunca sincronizados não têm comentários nem descrição no Núcleo.
