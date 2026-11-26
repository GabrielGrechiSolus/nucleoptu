# Arquitetura

## Visão geral

```
Navegador (React)
 ├─ Firebase Authentication ........ login
 ├─ Cloud Firestore ................ dados do sistema (acesso direto, protegido pelas regras)
 └─ /api/* (Next.js, na Vercel) .... integrações e operações com segredo
       ├─ Firebase REST (conta de serviço): usuários e Firestore
       ├─ GitHub API
       ├─ API de revisions da Qualidade
       ├─ Businessmap API
       ├─ Web Relatus API
       └─ Google Gemini API
```

## Tecnologias

Next.js 16 (App Router), React 19.2, TypeScript, Tailwind CSS, `lucide-react`, `framer-motion`, `react-toastify`, Firebase Web SDK, Jest e Testing Library. Antes de alterar código, leia o `AGENTS.md`: a documentação da versão instalada do Next fica em `node_modules/next/dist/docs/`.

## Pastas

| Caminho | Conteúdo |
|---|---|
| `app/<rota>/page.tsx` | telas |
| `app/<rota>/layout.tsx` | usa `LayoutComSidebar` |
| `app/api/` | rotas do servidor; arquivos com `_` são apoio interno |
| `app/components/` | menu, cabeçalho, autenticação e rotinas globais |
| `app/chamados/` | contextos, BM, Relatus (tela), consultas salvas e regras puras |
| `app/processos/` | processo do BM, etapas e automações |
| `app/escritorio/`, `app/client-connections/`, `app/admin/` | módulos próprios |
| `app/layout.tsx` | layout raiz: autenticação, atualização automática e presença |
| `app/AuthContext.tsx` | sessão; ao sair, apaga as consultas salvas |
| `app/relatus-componentes.css` | classes `rel-*` e variáveis de cor dos temas |
| `app/globals.css` | estilos globais e ajustes do tema claro |
| `firebase.ts` | inicialização do Firebase no cliente |
| `types/firebase.d.ts` | declarações **parciais** do Firebase. Função nova pode precisar ser declarada |
| `proxy.ts` | bloqueio de robôs nas conexões |
| `next.config.ts` | cabeçalhos HTTP |
| `public/` | arquivos estáticos e `robots.txt` |
| `docs/` | documentação |

## Autenticação e autorização

1. O navegador faz login no Firebase e envia `Authorization: Bearer <ID token>` às rotas.
2. `verificaFirebase` (`app/api/_servidor.ts`) valida o token na API do Firebase e recusa conta nova sem e-mail confirmado.
3. Conforme a rota:
   - `exigeGit`: login, perfil diferente de Sustentação e token do GitHub. Se não der para confirmar o perfil, **nega**.
   - `exigeAdmin` (`_admin.ts`): chave de serviço, conta ativa, sessão não revogada e administrador (`ADMIN_EMAILS` ou permissão `admin` na conta).
   - `exigeConexoes`: robôs bloqueados, mesma origem em gravações, login e chave de serviço.
   - `autoriza` do Relatus (`app/api/relatus/_consulta.ts`): usuário na lista (os demais recebem 404).
4. Nas telas, `withAuth` exige sessão. Esconder um item na interface não substitui a verificação no servidor nem as regras do Firestore.

## Rotas de API

"Com Git" significa qualquer perfil, exceto Sustentação.

| Rota | Método | Quem pode | Função |
|---|---|---|---|
| `/api/admin/eu` | GET | logado | informa se é administrador e se há configuração |
| `/api/admin/usuarios` | GET, POST | administrador | listar e criar contas |
| `/api/admin/usuarios/[uid]` | PATCH | administrador | senha, ativar, inativar e administração |
| `/api/assistente-gemini` | POST | logado | assistente do chat |
| `/api/bm/validar` | POST | logado | validar a chave do BM |
| `/api/bm/chamados` | POST | logado + chave BM | resumo de cartões em lote |
| `/api/bm/cartao` | POST | logado + chave BM | detalhe do cartão |
| `/api/bm/quadro` | POST | logado + chave BM | cartões dos quadros |
| `/api/bm/processo` | GET, POST | perfis liberados + chave pessoal | permissão, leitura, simulação e **gravação** no BM |
| `/api/chamados/importar` | GET, POST | logado | ler contextos de `CONTEXTOS_DIR` |
| `/api/conexoes` | GET, POST, DELETE | logado | cadastro de conexões |
| `/api/conexoes/senha` | POST | logado | revelar uma senha (auditado) |
| `/api/git/perfil` | GET | logado, com Git | usuário e PRs |
| `/api/git/mergeados` | GET | logado, com Git | PRs mergeados |
| `/api/git/commits` | GET | logado, com Git | commits recentes |
| `/api/git/checks` | POST | logado, com Git | checks de até 20 PRs |
| `/api/git/revisao` | POST | logado, com Git | revision de até 80 PRs mesclados |
| `/api/git/revisao/ultima` | GET | logado | última revision e previsão |
| `/api/git/revisoes` | GET | logado | revisions publicadas |
| `/api/relatus/chamado` | GET | lista do Relatus | atendimento, mensagens, anexos e documentos |
| `/api/relatus/chamado/anexos` | GET | lista do Relatus | anexos de uma mensagem |
| `/api/relatus/chamado/arquivo` | GET | lista do Relatus | baixar anexo |

## Integrações

| Serviço | Autenticação | Escrita? | Observação |
|---|---|---|---|
| Firebase REST | conta de serviço (OAuth, token em cache) | sim | `_tokenServico.ts`, `_contas.ts`, `_firestore.ts`; ignora as regras do Firestore |
| GitHub | `GITHUB_TOKEN` ou `gh` | não | pausa quando o GitHub limita |
| API de revisions | sem token no código | não | cache de 10 minutos por repositório |
| Businessmap | chave por usuário (`x-bm-key`) | só em `/api/bm/processo`, com confirmação | fila e cache separados por chave |
| Web Relatus | operador do servidor | não (somente login e leituras) | token renovado sozinho; pausa de 5 min após login recusado |
| Gemini | `GEMINI_API_KEY` | não | modelo definido em `app/api/assistente-gemini/route.ts`, sem armazenamento (`store: false`) |

## Limites

| Onde | Limite |
|---|---|
| Businessmap | 24 chamadas por minuto por chave (o BM permite 30 por minuto e 600 por hora) |
| Cache do BM no servidor | metadados 1 h, lotes 5 min, detalhe 2 min |
| Assistente | 20 perguntas por minuto por pessoa |
| PRs mergeados e commits | 30 por minuto por pessoa |
| Conexões | 60 leituras, 40 gravações e 20 exclusões por minuto; 20 senhas a cada 10 minutos |
| Relatus | 40 consultas por minuto por pessoa |

Os limites e caches do servidor ficam **em memória por instância**. Na Vercel, não são globais e se perdem quando a instância reinicia.

## Segurança

- Cabeçalhos em todo o site: `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` e HSTS. API e conexões sem cache.
- `proxy.ts` recusa robôs e agentes de IA em `/client-connections` e `/api/conexoes`. É barreira adicional, não substitui login.
- Segredos só no servidor. O token do GitHub e o do Relatus não vão para o navegador.
- Anexos do Relatus saem sempre como download; HTML do Relatus vira texto simples.
- Senhas de conexões com AES-256-GCM.
- A trava de dados sensíveis (`app/client-connections/sensivel.ts`) bloqueia segredos fora do campo Senha.

## Convenções

- Regra de negócio em arquivos puros, com teste ao lado (`*.test.ts`).
- Testes de rota usam `/** @jest-environment node */`; variáveis usadas em `jest.mock` começam com `mock`.
- Detalhes em tela própria com endereço na URL, sem modal. Ver [NAVEGACAO_TELAS.md](NAVEGACAO_TELAS.md).
- Tela nova: item em `app/components/navegacao.ts`.
- Cores: use as variáveis `--rel-*` e as classes `rel-*`.
- Leitura de chamados, BM e revisions: use as funções com [consultas salvas](DADOS_SALVOS.md) e invalide ao gravar.
- Commits com prefixo (`feat:`, `fix:`, `refactor:`, `docs:`), título curto e corpo com a regra de negócio e a descrição técnica.
