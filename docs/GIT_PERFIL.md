# Vincular Git no perfil

No **Perfil > aba Git**, cada pessoa vincula o seu usuário do GitHub. O sistema traz os dados da pessoa e os PRs da organização, separados em **abertos** e **fechados** (mesclados ou não), e liga a pessoa aos PRs na **Fila de aplicação**.

## O que a aba faz

- **Vincular Git:** valida o usuário no GitHub, mostra nome, foto e PRs, e grava o usuário em `profiles/{uid}.gitUser`.
- **Período dos PRs fechados:** 30, 60 ou 180 dias, ou todos (até 300 por lista).
- **Gerar e atualizar contextos:** cria o contexto de cada chamado dos PRs que ainda não existe e atualiza os existentes.
  - Chamado vem do título do PR (`tipo/(000.000)-assunto`). PRs sem número de chamado são ignorados.
  - Situação: PR de código aberto = em correção; mesclado = corrigido; fechado sem merge = encerrado. PR de `TestesIntegracao` não decide a situação.
  - Contextos existentes **mantêm** o texto de regra, o cliente, o módulo e a revision; recebem os PRs, autores e datas novos e uma aba **GitHub** com a tabela e a descrição de cada PR.
  - A revision **não** é calculada aqui (depende das tags de release); preencha no `REGRA.md` ou pelo gerador de contextos.

## Configuração do servidor

- **Token do GitHub (somente leitura):** `GITHUB_TOKEN` no `.env.local` ou, na máquina que roda o servidor, o login do GitHub CLI (`gh auth login`). Organização: `GITHUB_ORG` (padrão `solussaude`).
- **Segurança:** a rota `/api/git/perfil` exige login do Firebase (o ID token é validado na API do Firebase). O token do GitHub nunca vai para o navegador.
- **Firestore:** a geração grava na coleção `chamados`; as regras precisam permitir escrita por usuário logado.

## Foto do Git

Quem vincula o Git passa a usar **automaticamente a foto do GitHub** no cabeçalho e no perfil (`https://github.com/<usuário>.png`). Ao trocar a foto no GitHub, ela muda aqui sem nova ação. Sem Git vinculado, vale a foto do perfil ou as iniciais.

## Perfil Sustentação: sem acesso ao Git

Usuários com o tipo de perfil **Sustentação** (Perfil > Tipo de Aviso Padrão) não têm acesso ao Git:

- Não veem a aba Git nem o campo de usuário Git no perfil.
- Em **Contexto de chamados** e na **Fila de aplicação** não veem PRs, links ou branches do Git, nem a aba GitHub. Links do GitHub dentro dos documentos aparecem como "[link do Git oculto]".
- Continuam vendo os documentos de apoio: evidência de testes, plano de testes, análise e o texto de regra de negócio.
- A rota `/api/git/perfil` recusa o perfil Sustentação no servidor (403).

Limites: a ocultação dos links na tela é da interface; os dados continuam gravados no Firestore, então quem lê o banco diretamente ainda os alcançaria. O tipo de perfil é editado pelo próprio usuário. Para um bloqueio de fato, o tipo de perfil precisa ser definido por um administrador e as regras do Firestore precisam acompanhá-lo.
