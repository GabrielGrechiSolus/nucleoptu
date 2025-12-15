# Nucleo PTU

Gestão de Contas Médicas e Snacks.

## Visão Geral

O Nucleo PTU é uma aplicação web construída com Next.js, React, e TypeScript, projetada para otimizar a gestão de contas médicas. A aplicação utiliza Firebase para autenticação e armazenamento de dados em tempo real, e Tailwind CSS para uma interface de usuário moderna e responsiva.

## Tecnologias Utilizadas

- **Next.js 16**: Framework React para renderização do lado do servidor e geração de sites estáticos.
- **React 19**: Biblioteca para construção de interfaces de usuário.
- **TypeScript**: Superset de JavaScript que adiciona tipagem estática.
- **Tailwind CSS**: Framework de CSS utilitário para design rápido e customizável.
- **Firebase**: Plataforma para autenticação de usuários e banco de dados em tempo real.
- **Jest**: Framework de teste para JavaScript.
- **ESLint**: Ferramenta de linting para identificar e corrigir problemas no código.

## Estrutura do Projeto

A estrutura do projeto segue as convenções do Next.js App Router:

```
c:/RepositorioGit/nucleoptu/
├── app/                  # Diretório principal da aplicação
│   ├── components/       # Componentes reutilizáveis
│   ├── home/             # Componentes da página inicial
│   ├── login/            # Página de login
│   ├── notice-board/     # Quadro de avisos
│   ├── register/         # Página de registro
│   ├── layout.tsx        # Layout principal da aplicação
│   └── page.tsx          # Página inicial
├── public/               # Arquivos estáticos
├── firebase.ts           # Configuração do Firebase
├── next.config.ts        # Configuração do Next.js
├── package.json          # Dependências e scripts do projeto
└── tsconfig.json         # Configuração do TypeScript
```

## Scripts Disponíveis

No diretório do projeto, você pode executar:

### `npm run dev`

Executa a aplicação em modo de desenvolvimento.<br>
Abra [http://localhost:3000](http://localhost:3000) para visualizá-la no navegador.

A página será recarregada se você fizer edições.<br>
Você também verá quaisquer erros de lint no console.

### `npm run build`

Constrói a aplicação para produção na pasta `.next`.

### `npm run start`

Inicia um servidor de produção.

### `npm run lint`

Executa o linter em todos os arquivos do projeto.

### `npm run test`

Inicia o executor de testes no modo de observação interativo.

## Como Começar

1. **Clone o repositório:**
   ```bash
   git clone https://github.com/seu-usuario/nucleoptu.git
   ```
2. **Instale as dependências:**
   ```bash
   npm install
   ```
3. **Configure o Firebase:**
   - Crie um projeto no [Firebase Console](https://console.firebase.google.com/).
   - Adicione um aplicativo da web ao seu projeto.
   - Copie as credenciais do Firebase e cole-as no arquivo `firebase.ts`.
4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
