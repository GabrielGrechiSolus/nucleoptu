# Variáveis de ambiente

Local: `.env.local` na raiz (modelo em [`env.local.exemplo`](env.local.exemplo)). Produção: **Vercel > Settings > Environment Variables**.

Regras:

- Variável com prefixo `NEXT_PUBLIC_` **vai para o navegador**. Nunca coloque segredo nela.
- `NEXT_PUBLIC_*` é fixada no momento do build: depois de alterar, é preciso novo build.
- Na Vercel, qualquer alteração só vale depois de um **Redeploy**.
- Marque os segredos como **Sensitive**.
- Deixar a linha vazia no arquivo não é igual a omitir: para usar o valor padrão, **apague ou comente a linha**. Várias variáveis só usam o padrão quando não existem.

## Firebase (obrigatórias)

Valores do aplicativo Web em **Console do Firebase > Configurações do projeto > Seus apps**.

| Variável | Uso |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | cliente Firebase e validação do login nas rotas do servidor |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | autenticação |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firestore; leitura de perfil no servidor quando não há chave de serviço |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | configuração do app Firebase |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | configuração do app Firebase |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | configuração do app Firebase |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Analytics (opcional) |

## Chave de serviço do Firebase

| Variável | Segredo | Uso |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | sim | conteúdo do `.json` da conta de serviço. Forma usada na Vercel |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | caminho | caminho do `.json` na máquina local, fora do Git |

Defina uma das duas (se houver as duas, vale a `_JSON`). Necessária para: gestão de usuários e conexões de clientes. Também é usada pelo servidor para ler o perfil de quem está logado.

## Administração e cadastro

| Variável | Padrão | Uso |
|---|---|---|
| `ADMIN_EMAILS` | um e-mail definido em `app/api/_admin.ts` e `app/admin/validacao.ts` | administradores fixos, separados por vírgula. **Defina na sua instalação** |
| `NEXT_PUBLIC_VERIFICACAO_EMAIL_A_PARTIR_DE` | `2026-11-06T00:00:00Z` | contas criadas a partir desta data precisam confirmar o e-mail |

## Conexões de clientes

| Variável | Segredo | Uso |
|---|---|---|
| `CONEXOES_CHAVE_CRIPTO` | sim | chave AES-256-GCM (base64, 32 bytes) das senhas de conexões |

Gere com:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

**Faça cópia segura.** Sem ela as senhas gravadas não abrem, e trocá-la invalida as existentes.

## GitHub e revisions

| Variável | Padrão | Uso |
|---|---|---|
| `GITHUB_TOKEN` (segredo) | sem padrão | token somente leitura dos repositórios da organização, com acesso a PRs e checks. Obrigatório na Vercel |
| `GH_PATH` | procura `gh` no sistema | sem `GITHUB_TOKEN`, o servidor local usa o token do GitHub CLI (`gh auth login`) |
| `GITHUB_ORG` | `solussaude` | organização consultada |
| `QUALIDADE_API_REVISAO` | endereço definido em `app/api/git/revisao/fonte.ts` | API que informa as tags de cada revision |
| `REVISAO_REPOS` | `banco,contas,ptu,crm,guias,ans,estoque,financ,tiss` | repositórios usados para a última revision e o painel de revisions |

## Businessmap

| Variável | Padrão | Uso |
|---|---|---|
| `BM_URL` | `https://solussaude.businessmap.io/api/v2` | endereço da API |
| `BM_API_KEY` (segredo) | sem padrão | opcional: usada nas leituras por quem não informou a própria chave. **Não vale para a tela de processos**, que exige a chave pessoal |
| `BM_BOARD_IDS` | `45` | quadros lidos, separados por vírgula |
| `BM_PROCESSOS_PERFIS` | `desenvolvimento,analise` | perfis liberados em Processos do BM |
| `BM_ESCRITA_GIT_USERS` | definido em `app/processos/acesso.ts` | usuários Git de outros perfis liberados em Processos |

A chave pessoal de cada usuário **não é variável de ambiente**: é informada em **Perfil > Businessmap** e fica no navegador.

## Web Relatus

| Variável | Segredo | Uso |
|---|---|---|
| `RELATUS_LOGIN` | sim | operador do Relatus usado pelo servidor |
| `RELATUS_SENHA` | sim | senha do operador |
| `NEXT_PUBLIC_RELATUS_USUARIOS` | não | e-mails que veem o Web Relatus, separados por vírgula. Padrão: um e-mail definido em `app/chamados/relatusAcesso.ts` |

O endereço é fixo no código. As consultas usam o acesso do operador configurado: quem for liberado enxerga o que ele enxerga. Detalhes em [RELATUS.md](RELATUS.md).

## Assistente

| Variável | Segredo | Uso |
|---|---|---|
| `GEMINI_API_KEY` | sim | assistente do chat (API do Google Gemini). Sem ela, o assistente avisa que não está configurado |

## Importação de contextos

| Variável | Padrão | Uso |
|---|---|---|
| `CONTEXTOS_DIR` | `C:/RepositorioGit/claude/contextos_prs` | única pasta que a rota de importação pode ler. Serve no servidor local; na Vercel não há essa pasta |

## Definidas pela plataforma

`NODE_ENV` e `VERCEL` são preenchidas automaticamente. Não defina manualmente.

## Não utilizadas

O código atual não lê estas variáveis, que podem existir em arquivos antigos e ser removidas: `RELATUS_API_BASE_URL`, `RELATUS_SERVICE_TOKEN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN`, `NEXT_PUBLIC_API_BASE_URL`, `DELPHI_BACKEND_URL`, `DELPHI_API_KEY`, `LOG_LEVEL`, `NEXT_PUBLIC_DEBUG_MODE`, `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY`, `SENTRY_DSN` e `ATLAS_WORKSPACE_ROOT`.

Se alguma delas guarda um segredo real, revogue-o na origem quando não for mais necessário.

## Mínimo por recurso

| Recurso | Precisa de |
|---|---|
| Login e telas básicas | `NEXT_PUBLIC_FIREBASE_*` |
| Gestão de usuários | chave de serviço |
| Conexões de clientes | chave de serviço e `CONEXOES_CHAVE_CRIPTO` |
| PRs, contextos pelo Git, revisions por PR | `GITHUB_TOKEN` (ou GitHub CLI local) |
| Businessmap | chave pessoal no perfil (ou `BM_API_KEY` para leitura) |
| Web Relatus | `RELATUS_LOGIN` e `RELATUS_SENHA` |
| Assistente | `GEMINI_API_KEY` |
