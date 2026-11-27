# Operação

## Publicação

- Branch de produção: `mural-avisos`. **Todo push publica** em `https://nucleoptu.vercel.app`.
- Antes do push:

```bash
git fetch origin
npm test
npm run build
```

- Confira `git status` e o que vai no commit. O repositório é público.
- Acompanhe o deploy na Vercel ou pelo status do commit no GitHub.
- Depois, chame uma rota de API sem login: o esperado é **401**. Um **500 sem corpo** costuma indicar dependência que não carrega no servidor.

## Voltar uma publicação

- Na Vercel, abra um deploy anterior que funcionava e use **Promote to Production** (ou Instant Rollback).
- Depois corrija no Git com `git revert <commit>` e faça push. Não reescreva o histórico da branch publicada.

## Testes

```bash
npm test
```

Falhas conhecidas na data desta documentação, anteriores a ela:

| Arquivo | Situação |
|---|---|
| `app/notice-board/page.test.tsx` | o conjunto não executa (`fetch is not defined` no ambiente de teste) |

Ela não faz parte do build. Qualquer outra falha deve ser tratada antes do push.

O workflow `.github/workflows/ci.yml` roda apenas em `main`. Como a branch usada é `mural-avisos`, **os testes não rodam automaticamente** no GitHub. Rode localmente.

O build pode mostrar o aviso do Turbopack sobre acesso dinâmico ao sistema de arquivos. Ele não interrompe o build.

## Logs

- Produção: **Vercel > projeto > Logs**. O servidor registra falhas com prefixos como `[relatus]`, `[admin]` e `[perfil]`.
- Navegador: DevTools, abas Console e Network. **Não compartilhe os Headers**: eles contêm o token da sua sessão.

## Solução de problemas

| Sintoma | O que verificar |
|---|---|
| Rota responde 500 sem corpo | pacote incompatível com a Vercel (não use `firebase-admin`); veja os logs |
| "Entre no sistema para usar este recurso" | sessão expirada: saia e entre |
| "Confirme o seu e-mail" | conta nova sem confirmação |
| "Servidor sem a chave do Firebase para validar o login" | `NEXT_PUBLIC_FIREBASE_API_KEY` ausente; redeploy |
| Administração ou conexões "sem configuração" | chave de serviço ausente ou JSON inválido |
| `permission-denied` na tela | regras do Firestore da coleção citada |
| "O servidor não tem acesso ao GitHub" | `GITHUB_TOKEN` (Vercel) ou `gh auth login` (local) |
| "Não encontrado no GitHub" | o token não enxerga o repositório ou a organização está errada |
| GitHub pediu uma pausa | limite de consultas; aguarde |
| Contextos não são gerados | usuário Git no perfil, perfil diferente de Sustentação, aba visível; espere 5 min (até 20 se interrompido) |
| "Informe a sua chave do Businessmap" | Perfil > Businessmap neste navegador |
| Relatus "não configurada" | `RELATUS_LOGIN` e `RELATUS_SENHA` em Production; redeploy |
| Relatus "recusou o login (HTTP …)" | **não repita várias vezes**, para não bloquear o operador; confira operador e senha, corrija e faça redeploy |
| Relatus "não devolveu: …" | uma das partes falhou; clique em **Atualizar** depois |
| Aba Web Relatus não aparece | e-mail fora de `NEXT_PUBLIC_RELATUS_USUARIOS`; alterar exige novo build |
| Assistente não configurado | `GEMINI_API_KEY` |
| Dado desatualizado | **Atualizar dados**, **Reler do BM**, **Atualizar** ou `F5` |
| Variável alterada não surtiu efeito | falta o redeploy |
| Tela antiga após publicar | `Ctrl+F5` |

## Manutenção

| Tarefa | Quando | Como |
|---|---|---|
| Trocar a senha do operador do Relatus | ao trocar no Solus | atualizar `RELATUS_SENHA` e fazer redeploy **antes** de consultar |
| Renovar o token do GitHub | antes de vencer | novo token somente leitura em `GITHUB_TOKEN` e redeploy |
| Trocar a chave de serviço | periodicamente ou se vazar | gerar nova, atualizar, publicar e revogar a antiga |
| Chave pessoal do BM | se vencer ou vazar | cada usuário troca no perfil |
| Desligamento de pessoa | na saída | inativar em Gestão de usuários, retirar das listas de variáveis e revogar chaves |
| Atualizar dependências | periodicamente | uma por vez, com testes e build |
| Backup | contínuo | ver [Banco de dados](BANCO_DE_DADOS.md#cópia-de-segurança) |
| Regras do Firestore | a cada coleção nova | atualizar no console e documentar |

## Se um segredo vazar

1. **Revogue ou troque na origem** (Firebase, GitHub, Businessmap, Google, Solus). Apagar do Git não basta: o repositório é público e o histórico pode ter sido copiado.
2. Atualize a variável e faça redeploy.
3. Verifique os registros de uso do serviço.

## Limitações conhecidas

- Limites e caches do servidor valem por instância.
- O quadro de Unimeds do Início não é gravado.
- Esconder o Git do perfil Sustentação é uma ocultação de interface; o tipo de perfil é editado pelo próprio usuário.
- A importação por caminho só funciona em servidor local.
- `types/firebase.d.ts` é parcial.
- `build-and-run.sh` não funciona sem um `Dockerfile`.
- `page.tsx` na raiz do repositório está fora de `app/` e não é publicada como rota.
- `data/google_tokens.json` é um arquivo antigo, vazio, ainda versionado, que o código atual não lê. **Nunca preencha:** o ideal é removê-lo do Git.
