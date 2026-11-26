# Banco de dados

Cloud Firestore, banco `(default)`. Não há migrações: os documentos são criados pelo próprio sistema. Os campos abaixo são os gravados pelo código atual; documentos antigos podem ter outros.

## Chamados e Businessmap

| Coleção | Documento | Principais campos | Quem grava |
|---|---|---|---|
| `chamados` | número sem ponto | tipo `Chamado` (`app/chamados/parse.ts`): número, cliente, assunto, status, situação, tipo, módulo, revision, PRs, branches, evidências, planos, autores e documentos; mais `importadoEm`, `importadoPor` e `origem` | importação e geração pelo Git |
| `chamados_bm` | número sem ponto | `chamado`, `encontrado`, `cardId`, `resumo`, `cartao`, `sincronizadoEm`, `sincronizadoPor` | sincronização do BM |
| `bm_quadro` | id do cartão | tipo `CartaoQuadro` (`app/chamados/bmQuadro.ts`): número, título, tipo, coluna, seção, responsável, bloqueio, prioridade, prazo, datas, quadro e link | sincronização do quadro |
| `bm_quadro_meta` | `atual` | `sincronizadoEm`, `por`, `total`, `ids` ativos | sincronização do quadro |
| `vinculos` | automático | tipo `Vinculo` (`app/chamados/aplicacao.ts`): contexto, PRs, donos, chamado, cliente, observação, autor, status `aplicacao` e `historico` | Contexto e Fila |

## Pessoas e comunicação

| Coleção | Documento | Principais campos |
|---|---|---|
| `profiles` | uid | `name`, `email`, `bio`, `avatar`, `avatarOrigem`, `gitUser`, `noticeType`, `skills`, `homeOfficeDays`, `ledColor`, `accentColor`, `mesaId`, `assentoId`, `updatedAt` |
| `notices` | automático | `title`, `description`, `link`, `type`, `importance`, `target`, `active`, `createdAt`, `creatorEmail`, `readBy` |
| `usefulLinks` | automático | título, endereço, tipo, autor, `createdAt`, `favoritedBy`, `likedBy`, `dislikedBy` |
| `user_presence` | uid | `uid`, `name`, `email`, `status`, `lastSeenAt`, `avatar`, `workingOn` |
| `chat_messages` | automático | `uid`, `autor`, `texto`, `tipo` (mensagem, elogio, reuniao, aceno), destinatário, `conversaId`, `salaId`, `refs`, `createdAt` |

## Escritório virtual

| Coleção | Conteúdo |
|---|---|
| `office_layout` | documento `planta`: mesas, `atualizadoEm`, `atualizadoPor` |
| `office_seat_changes` | trocas de lugar |
| `office_meetings` | reuniões: anfitrião, membros, status |
| `office_help` | pedidos de ajuda: dono, texto, trabalho vinculado, membros, status |
| `office_coffee_invites` | convites para café: anfitrião, convidados, mensagem, respostas |
| `office_board_entries` | textos da lousa |
| `office_celebrations` | celebrações e metas |

## Conexões e auditoria

| Coleção | Conteúdo | Acesso |
|---|---|---|
| `clientes_conexoes` | cliente, conexões (senha criptografada) e contatos (`app/client-connections/modelo.ts`) | só pelo servidor |
| `auditoria_conexoes` | quem criou, editou, excluiu ou consultou senha | só pelo servidor |
| `auditoria_admin` | ações de gestão de usuários | só pelo servidor |

## Telas antigas

`avisos` é lida apenas por `/analist`. `posts` é usada por `app/components/PostItem.tsx`, que nenhuma tela importa hoje.

## Usuários e permissões

As contas ficam no Firebase Authentication. A permissão de administrador é um atributo da conta (`admin`), que só o servidor grava.

## Regras do Firestore

As regras completas ficam no **console do Firebase** e não estão integralmente neste repositório. O arquivo [`regras-adicionais-escritorio-firestore.rules`](regras-adicionais-escritorio-firestore.rules) tem as de chat, escritório e quadro do BM. **Mescle com as regras existentes antes de publicar**, pois publicar apenas esse arquivo apagaria as demais.

O sistema precisa que o navegador, com usuário autorizado, leia e grave: `chamados`, `chamados_bm`, `bm_quadro`, `bm_quadro_meta`, `vinculos`, `profiles`, `notices`, `usefulLinks`, `user_presence`, `chat_messages` e as coleções `office_*`.

As coleções do servidor devem ser fechadas ao navegador:

```
match /clientes_conexoes/{id} { allow read, write: if false; }
match /auditoria_conexoes/{id} { allow read, write: if false; }
match /auditoria_admin/{id}    { allow read, write: if false; }
```

Recomendações ao revisar as regras:

- Não confie apenas em "usuário autenticado". Exija também e-mail confirmado ou domínio da empresa (`request.auth.token.email_verified`, `request.auth.token.email`), considerando as contas antigas.
- Em `profiles`, permita que cada pessoa grave só o próprio documento (a tela de Usuários também atualiza `skills` de outras pessoas: preveja essa exceção).
- Teste no **Rules Playground** antes de publicar.

## Cópia de segurança

O repositório não faz backup do banco. Configure a exportação ou a recuperação pontual (PITR) no Google Cloud. Guarde separadamente a `CONEXOES_CHAVE_CRIPTO`.

## Dados guardados no navegador

| Chave | Conteúdo |
|---|---|
| `nucleoptu.tema` | tema claro ou escuro |
| `nucleoptu.bm.chave`, `nucleoptu.bm.eu` | chave pessoal do BM e usuário do BM |
| `nucleoptu.salvo.*` | consultas salvas (cartão do processo) |
| `relatus:consultas:v1` | consultas do Web Relatus |
| `nucleoptu.atualizou*` | controle da atualização automática |
| `nucleoptu.presenca.<uid>` | status de presença |
| `nucleoptu.menu-favoritos.<uid>` | menus favoritos |
| `nucleoptu.prsmergeados.<uid>`, `nucleoptu.commits.<uid>`, `nucleoptu.bm.notificacoes.<uid>`, `nucleoptu.bm.snapshot.<uid>`, `nucleoptu.office.*` | notificações e itens lidos |
| `chamados-caminho` | último caminho de importação |
| `client_connections` | cadastro antigo de conexões, usado só para migração |

Ao sair do sistema, as consultas salvas são apagadas. A **chave do BM permanece** no navegador: em computador compartilhado, remova-a em Perfil > Businessmap.
