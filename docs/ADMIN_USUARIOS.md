# Administração de usuários

Qualquer pessoa com e-mail @solus.inf.br pode fazer o próprio cadastro na tela de login ("Cadastrar Agora"). Os **administradores**, em **Administração** no menu (`/admin/usuarios`), também cadastram, inativam e trocam a senha de usuários.

## Quem é administrador

- Os e-mails de `ADMIN_EMAILS` (padrão `gabriel.grechi@solus.inf.br`). Esses não podem ser inativados nem ter a permissão retirada pela tela.
- Quem recebe a permissão de outro administrador na própria tela (ela vale no próximo login da pessoa).

Para incluir o Diego, o Denys e o Rodrigo Zandoná: acrescente os e-mails deles em `ADMIN_EMAILS` (separados por vírgula) ou, depois que a página estiver funcionando, use o botão **Tornar administrador** na linha de cada um.

## O que um administrador pode fazer

| Ação | Efeito |
|---|---|
| Novo usuário | Cria a conta (e-mail, nome, senha temporária de pelo menos 8 caracteres, tipo de perfil, administrador sim/não) e o perfil. A senha é mostrada uma vez. |
| Trocar senha | Define a nova senha e encerra as sessões abertas da pessoa. |
| Inativar | A pessoa deixa de conseguir entrar e as sessões abertas são encerradas. Dá para reativar. Não é possível inativar a si mesmo. |
| Reativar | A pessoa volta a conseguir entrar. |
| Tornar ou retirar administrador | Concede ou retira a permissão (não dá para retirar a própria). |

Cada ação é registrada na coleção `auditoria_admin` do Firestore (quem fez, quando, em quem).

## Configuração necessária (uma vez)

As ações acima exigem o **Firebase Admin SDK**, que só funciona no servidor com uma chave de serviço:

1. No console do Firebase: Configurações do projeto > Contas de serviço > **Gerar nova chave privada**.
2. Salve o `.json` fora do Git, por exemplo em `C:\RepositorioGit\nucleoptu\.secrets\firebase-admin.json` (a pasta `.secrets/` é ignorada pelo Git).
3. No `.env.local`: `FIREBASE_SERVICE_ACCOUNT_PATH=C:/RepositorioGit/nucleoptu/.secrets/firebase-admin.json`.
4. Reinicie o servidor.

Sem isso, a página mostra o aviso de configuração e os botões ficam desligados. Nunca coloque essa chave em variável `NEXT_PUBLIC_` nem no repositório.

## Segurança

- As rotas `/api/admin/*` exigem login válido e não revogado e conferem a permissão de administrador no servidor.
- No console do Firebase, desative a opção de **cadastro de usuários** (Authentication > Configurações > Ações do usuário) para que ninguém crie conta pela API pública. A remoção da tela de cadastro, sozinha, não impede isso.

## Cadastro próprio e confirmação por e-mail

- Quem se cadastra pela tela de login recebe um e-mail de confirmação do Firebase e só usa o sistema depois de clicar no link (a tela "Confirme o seu e-mail" oferece "Já confirmei", "Reenviar e-mail" e "Sair").
- A exigência vale para contas criadas a partir de `NEXT_PUBLIC_VERIFICACAO_EMAIL_A_PARTIR_DE` (padrão `2026-11-06T00:00:00Z`); contas anteriores continuam entrando normalmente. Usuários criados pela Administração já nascem com o e-mail confirmado.
- As rotas do servidor também recusam contas novas sem e-mail confirmado.
- O texto do e-mail é do Firebase: para deixá-lo em português e com o nome da Solus, ajuste em Firebase Console → Authentication → Templates.

## Atualização automática ao entrar

- A cada novo login, quem tem usuário Git no perfil (exceto Sustentação) tem os contextos criados e atualizados a partir dos PRs dos últimos 60 dias, já consultando a revision na API da Qualidade.
- Se a chave do Businessmap estiver no perfil, os cartões dos chamados da pessoa são sincronizados em seguida (só os que mudaram).
- A "previsão de liberação" das correções ainda sem revision é sempre a próxima depois da última revision publicada na API da Qualidade (maior revision entre os repositórios de `REVISAO_REPOS`).
