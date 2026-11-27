# Funcionamento

## Acesso

1. **Login** (`/login`) com e-mail e senha pelo Firebase. **Cadastrar Agora** (`/register`) aceita e-mails `@solus.inf.br`.
2. Contas novas precisam confirmar o e-mail (a tela oferece "Já confirmei", "Reenviar e-mail" e "Sair").
3. Sem sessão, as telas protegidas levam ao login.

### Perfis

O tipo de perfil é o campo **Tipo de Aviso Padrão** do Perfil: Todos, Análise, Desenvolvimento, Liderança ou Sustentação.

| Perfil ou permissão | Efeito |
|---|---|
| Desenvolvimento e Análise | acessam **Processos do BM** |
| Sustentação | sem Git: não vê PRs, branches nem links do GitHub; sem Processos |
| Administrador | **Gestão de usuários** e importação de conexões sem a trava de dados sensíveis |
| Lista do Web Relatus | vê a aba Web Relatus |
| Lista do Cronograma | vê a própria agenda |

O tipo de perfil é editado pelo próprio usuário; não use como barreira de segurança. Detalhes em [GIT_PERFIL.md](GIT_PERFIL.md).

## Menu e telas

### Início (`/home`)
- Menus favoritos de cada pessoa.
- **Dashboard** de revisions publicadas, cruzadas com os chamados.
- **Unimed - Rede Credenciada:** quadro de homologação das Unimeds. A lista inicial está no código e **as alterações nesse quadro não são gravadas**: recarregar a página volta à lista inicial.

### Mural (`/notice-board`)
Avisos (título, descrição, link, tipo, importância e público) junto com notificações de BM e PR. Permite filtrar, marcar como lido ou não lido, ver quem leu, editar, inativar, reativar e excluir. Cada aviso tem página própria em `/notice-board/<id>`.

### Chat da equipe (`/chat`)
Conversa geral, conversas diretas e salas de reunião, status, elogios e referências a contextos, PRs, cartões do BM, avisos, links e conexões. Há um **assistente** (Gemini) para dúvidas gerais. Ele recebe só o texto da conversa (até 12 mensagens) e não consulta dados do sistema. Não digite nele dados sensíveis, pois o texto é enviado ao Google.

### Escritório virtual (`/escritorio`)
- Planta com mesas e lugares, presença e o que cada pessoa está fazendo.
- Sala de reunião, copa (pausa) e convites para café.
- Pedidos de ajuda, com vínculo opcional a chamado, PR ou cartão.
- Lousa da equipe e celebrações. A **meta de chamados** é o **máximo de abertos** no mês: quanto menos, melhor. Ela só é considerada batida depois que o mês termina.

### Cronograma (`/cronograma`)
Visão anual da própria agenda do Web Relatus, somente leitura, para os e-mails liberados. Ver [RELATUS.md](RELATUS.md#cronograma).

### Contexto de chamados (`/chamados`)
Histórico de cada chamado: situação, revision ou previsão, regra de negócio, PRs, evidências, plano de testes e documentos.

Os contextos entram de duas formas:
1. **Pelo Git, automaticamente** (ver Rotinas automáticas).
2. **Importar contextos:** lê pastas de chamados com arquivos `.md` (modelo em [MODELO_REGRA.md](MODELO_REGRA.md)), pelo seletor de pasta do navegador ou pelo caminho `CONTEXTOS_DIR` em servidor local. Há prévia antes de gravar, e a opção de substituir remove o que não estiver na importação.

No detalhe há as abas **Resumo**, **Regra de negócio**, **Businessmap**, **Web Relatus** (usuários liberados) e **Documentos**. A aba Resumo também permite **Vincular chamado** e pedir aplicação.

### Fila de aplicação (`/fila`)
Pedidos para aplicar uma correção no cliente antes da revision. Status: Aberto, Aplicando, Aplicado, Concluído e Cancelado, com histórico. Ver [FILA_APLICACAO.md](FILA_APLICACAO.md).

### Chamados sem PR (`/chamados-bm`)
Cartões do quadro do BM sem PR, ordenados por relevância (report, bloqueio, prazo, prioridade, tempo parado e falta de responsável). No detalhe do cartão, usuários liberados têm a aba **Web Relatus**, consultada só quando aberta. Ver [BUSINESSMAP.md](BUSINESSMAP.md).

### Processos do BM (`/processos`)
Ajuda a preencher texto de conclusão e links, marcar critérios de saída, comentar e mover cartões, em lista ou kanban. **Toda gravação no BM pede confirmação**, com simulação do que será enviado, e usa a chave pessoal de quem está logado.

### Conexões de clientes (`/client-connections`)
AnyDesk, TeamViewer, Terminal Service, VPN e contatos do Teams. Senhas são criptografadas e cada consulta é auditada. Ver [CONEXOES_CLIENTES.md](CONEXOES_CLIENTES.md).

### Links úteis (`/links`)
Links por público, com favoritos e curtidas.

### Perfil (`/profile`)
- **Informações do Perfil:** nome, bio, foto, cores, habilidades, dias de home office e tipo de perfil.
- **Git:** vínculo do GitHub e lista de PRs.
- **Businessmap:** chave pessoal.

### Usuários (`/users`)
Pessoas e habilidades, com reconhecimento de skills.

### Gestão de usuários (`/admin/usuarios`)
Somente administradores: criar, trocar senha, inativar, reativar e conceder administração. Ver [ADMIN_USUARIOS.md](ADMIN_USUARIOS.md).

### Outras rotas
`/` é a página de apresentação; `/celebracoes` redireciona para o Escritório; `/analist` é uma tela antiga de avisos (coleção `avisos`), fora do menu; `/components` não exibe nada.

## Web Relatus

Na aba **Web Relatus** do chamado: resumo com status, situação e prioridade, dados do atendimento, prazos e horas, descritivo, anexos para download, documentos Google e mensagens com seus anexos. O servidor entra no Relatus, gera e renova o token sozinho. A consulta é **somente leitura**. Ver [RELATUS.md](RELATUS.md).

## Rotinas automáticas

### Atualização ao entrar
Roda para quem tem usuário Git no perfil (exceto Sustentação e contas sem e-mail confirmado), com a aba visível e conexão:

1. Busca os PRs abertos e os fechados nos últimos 60 dias.
2. Cria e atualiza os contextos dos chamados citados no título (`tipo/(000.000)-assunto`) e consulta a revision.
3. Se houver chave do BM no navegador, sincroniza os cartões dos seus chamados e o quadro.

| Quando | Regra |
|---|---|
| novo login ou vínculo do Git | roda em seguida |
| com o sistema aberto | a cada 15 minutos (verificação a cada minuto e ao voltar para a aba) |
| depois de uma tentativa | outra só após 5 minutos |
| execução interrompida | pode bloquear por até 20 minutos |

O andamento e o resumo aparecem no canto inferior direito.

### Previsão de revision
Correção sem revision recebe como previsão a revision seguinte à última publicada nos repositórios de `REVISAO_REPOS`.

### Notificações
PRs mergeados e mudanças nos cartões do BM aparecem no sino. Ver [NOTIFICACOES_PRS.md](NOTIFICACOES_PRS.md).

### Presença
O status e a última atividade são atualizados enquanto o sistema está aberto.

### Consultas salvas
Para evitar requisições repetidas, listas e consultas são reaproveitadas por alguns minutos; itens concluídos, até pedir atualização. Use **Atualizar dados**, **Reler do BM** ou **Atualizar** (Relatus). Ver [DADOS_SALVOS.md](DADOS_SALVOS.md).

## Tema
Claro ou escuro pelo botão do topo, guardado no navegador. O perfil permite escolher cores.
