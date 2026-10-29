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
- **Segurança:** a rota `/api/git/perfil` exige login do Firebase (o ID token é validado na API do Firebase) e só responde na rede interna (`IMPORT_HOSTS`, `IMPORT_REDE_PREFIXO`). O token do GitHub nunca vai para o navegador.
- **Firestore:** a geração grava na coleção `chamados`; as regras precisam permitir escrita por usuário logado.
