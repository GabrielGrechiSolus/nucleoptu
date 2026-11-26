# Instalação

Siga na ordem. Faça um passo, confira o resultado e passe ao próximo.

## 1. Requisitos

| Item | Versão ou observação |
|---|---|
| Node.js | 20.9 ou superior (exigência do Next.js 16) |
| npm | o que acompanha o Node |
| Git | para clonar |
| Projeto no Firebase | Authentication e Cloud Firestore |
| Conta na Vercel | para publicar |
| GitHub CLI (`gh`) | opcional, no desenvolvimento local |

## 2. Código e dependências

```bash
git clone https://github.com/GabrielGrechiSolus/nucleoptu.git
cd nucleoptu
npm install
```

A branch padrão é `mural-avisos`.

**Não instale `firebase-admin`.** Ele não carrega na Vercel e faz as rotas responderem 500 sem corpo. O servidor usa as APIs REST do Firebase, e um teste (`app/api/semFirebaseAdmin.test.ts`) impede a volta do pacote.

## 3. Firebase

### 3.1 Projeto e aplicativo Web
1. Crie o projeto no console do Firebase.
2. Adicione um **aplicativo Web** e guarde os valores de configuração (variáveis `NEXT_PUBLIC_FIREBASE_*`).

### 3.2 Authentication
1. Ative o provedor **E-mail/senha**.
2. Em **Templates**, ajuste o e-mail de confirmação (idioma e nome).
3. Em **Settings > Authorized domains**, inclua o domínio de produção.
4. Defina quem pode criar conta. A restrição de domínio da tela de cadastro é feita na interface; para controlar de fato quem entra, desative o cadastro de usuários pela API em **Settings > User actions** e crie as contas pela **Gestão de usuários**.

### 3.3 Cloud Firestore
1. Crie o banco `(default)`.
2. Publique as regras. Veja [Banco de dados > Regras](BANCO_DE_DADOS.md#regras-do-firestore). O repositório tem apenas parte delas: **mescle**, não substitua as regras existentes.
3. Se uma consulta pedir índice, o erro no console do navegador traz o link para criá-lo.

### 3.4 Chave de serviço
1. **Configurações do projeto > Contas de serviço > Gerar nova chave privada**.
2. Guarde o `.json` fora do Git, por exemplo em `.secrets/` (pasta ignorada).
3. Localmente, use `FIREBASE_SERVICE_ACCOUNT_PATH`. Na Vercel, cole o conteúdo em `FIREBASE_SERVICE_ACCOUNT_JSON`.

Essa chave dá acesso total ao projeto. Se vazar, revogue-a no console e gere outra.

## 4. Variáveis de ambiente

1. Copie [`env.local.exemplo`](env.local.exemplo) para `.env.local` na raiz.
2. Preencha as `NEXT_PUBLIC_FIREBASE_*` e as dos recursos que for usar.
3. Apague as linhas que ficarem vazias.

Descrição completa em [Variáveis de ambiente](VARIAVEIS_AMBIENTE.md). Arquivos `.env*` são ignorados pelo Git.

## 5. Rodar localmente

```bash
npm run dev
```

Abra `http://localhost:3000`. O desenvolvimento local usa o projeto Firebase configurado: se ele for o de produção, **tudo o que for gravado altera a produção**. Para testar sem risco, use um projeto separado.

## 6. Primeiro administrador

1. Coloque o e-mail dele em `ADMIN_EMAILS`.
2. Crie a conta em **Cadastrar Agora** (a tela aceita e-mails `@solus.inf.br`) ou no console do Firebase.
3. Confirme o e-mail pelo link recebido.
4. Entre e confira o item **Gestão de usuários** no menu **Conta e administração**.

## 7. Configuração de cada usuário

| Onde | O que | Para que serve |
|---|---|---|
| Perfil > Informações | nome e **Tipo de Aviso Padrão** (tipo de perfil) | define avisos, links e acessos |
| Perfil > Git | usuário do GitHub | PRs, contextos automáticos e fila de aplicação |
| Perfil > Businessmap | chave de API pessoal | sincronização do BM e processos |

A chave do BM fica só no navegador: em outro computador é preciso informar de novo.

## 8. Validar antes de publicar

```bash
npm test
npm run build
```

Veja em [Operação](OPERACAO.md#testes) as falhas já conhecidas.

## 9. Publicar na Vercel

1. Importe o repositório na Vercel (framework Next.js, comandos padrão).
2. Defina a branch de produção como `mural-avisos`.
3. Cadastre as variáveis em **Settings > Environment Variables**, marcando os segredos como **Sensitive**.
4. Em produção use `FIREBASE_SERVICE_ACCOUNT_JSON` e `GITHUB_TOKEN` (não há caminho local nem GitHub CLI).
5. Publique. A partir daí, cada `push` na branch publica automaticamente.
6. Depois de alterar variáveis, faça **Redeploy**.

## 10. Conferência após publicar

| Teste | Esperado |
|---|---|
| Abrir `/login` e entrar | acesso ao Início |
| Abrir `/api/conexoes` sem login | resposta 401 (nunca 500) |
| Gestão de usuários (administrador) | lista de contas |
| Perfil > Git > Validar e salvar vínculo | PRs listados e geração automática dos contextos |
| Perfil > Businessmap | chave validada |
| Contexto de chamados > chamado > Web Relatus (usuário liberado) | dados do atendimento |
| Chat > assistente | resposta, se `GEMINI_API_KEY` estiver configurada |

Se algo falhar, veja [Solução de problemas](OPERACAO.md#solução-de-problemas).

## Docker

Existe um `build-and-run.sh`, mas **o repositório não tem `Dockerfile`**, então o script não funciona como está. A forma de publicação mantida é a Vercel.
