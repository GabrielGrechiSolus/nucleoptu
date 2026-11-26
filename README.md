# Núcleo PTU

Aplicação interna de apoio à equipe de gestão de contas médicas: contexto de chamados, Businessmap (BM), Web Relatus, pull requests, mural, chat, escritório virtual, fila de aplicação e conexões de clientes.

- **Tecnologia:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, Firebase (Authentication e Firestore).
- **Publicação:** Vercel. Cada `push` na branch `mural-avisos` publica em produção.

> **Este repositório é público.** Nunca versione chaves, tokens, senhas, arquivos `.env`, dados de clientes ou exportações do banco.

## Começo rápido

```bash
git clone https://github.com/GabrielGrechiSolus/nucleoptu.git
cd nucleoptu
npm install
# crie o .env.local a partir de docs/env.local.exemplo
npm run dev
```

Abra `http://localhost:3000`. O passo a passo completo, incluindo o Firebase, está em [Instalação](docs/INSTALACAO.md).

## Documentação

### Guias gerais

| Documento | Conteúdo |
|---|---|
| [Instalação](docs/INSTALACAO.md) | requisitos, Firebase, ambiente local, publicação na Vercel e conferência |
| [Variáveis de ambiente](docs/VARIAVEIS_AMBIENTE.md) | todas as variáveis, o que fazem, padrão e se são segredo |
| [Funcionamento](docs/FUNCIONAMENTO.md) | cada tela, perfis de acesso e rotinas automáticas |
| [Arquitetura](docs/ARQUITETURA.md) | pastas, autenticação, rotas de API, integrações, limites e segurança |
| [Banco de dados](docs/BANCO_DE_DADOS.md) | coleções do Firestore, campos, regras de acesso e dados no navegador |
| [Operação](docs/OPERACAO.md) | deploy, testes, solução de problemas, manutenção e limitações conhecidas |

### Por assunto

| Documento | Conteúdo |
|---|---|
| [Administração de usuários](docs/ADMIN_USUARIOS.md) | cadastro, administradores e confirmação de e-mail |
| [Businessmap](docs/BUSINESSMAP.md) | chaves, sincronização, processos e chamados sem PR |
| [Web Relatus](docs/RELATUS.md) | token automático, campos, anexos e acesso |
| [Git no perfil](docs/GIT_PERFIL.md) | vínculo do GitHub e geração de contextos |
| [Fila de aplicação](docs/FILA_APLICACAO.md) | fluxo e status |
| [Conexões de clientes](docs/CONEXOES_CLIENTES.md) | cadastro, criptografia e importação |
| [Notificações](docs/NOTIFICACOES_PRS.md) | PRs mergeados e mudanças no BM |
| [Consultas salvas](docs/DADOS_SALVOS.md) | o que é reaproveitado entre telas e por quanto tempo |
| [Navegação e telas](docs/NAVEGACAO_TELAS.md) | padrão para detalhes, filtros e menu |
| [Modelo de contexto](docs/MODELO_REGRA.md) | arquivo `REGRA.md` de cada chamado |

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npm start` | executa o build |
| `npm test` | testes com Jest |
| `npm run lint` | ESLint |
