# NucleoPTU - Gerenciamento de Perfil de Usuário

Este projeto faz parte do sistema NucleoPTU e é responsável por permitir que os usuários visualizem e editem seus perfis pessoais. Ele integra autenticação Firebase, armazenamento de dados no Firestore e oferece uma experiência de usuário rica para personalização de perfil e visualização de habilidades/elogios.

## 🚀 Visão Geral do Projeto

O componente de perfil de usuário é uma peça central para a identidade digital de cada membro no sistema NucleoPTU. Ele não apenas exibe informações básicas do usuário, mas também permite a personalização visual e a gestão de habilidades (ou "elogios") recebidas de outros usuários. A ideia é criar um espaço onde o usuário possa expressar sua identidade profissional e pessoal dentro da plataforma.

## ✨ Conceitos e Funcionalidades Principais

1.  **Autenticação de Usuário (Firebase Authentication)**:
    *   O sistema utiliza o Firebase Authentication para gerenciar o login e a sessão do usuário.
    *   Informações como `displayName` e `photoURL` são sincronizadas diretamente com o perfil do Firebase.

2.  **Armazenamento de Perfil (Firestore)**:
    *   Detalhes adicionais do perfil, como biografia (`bio`), cor de LED personalizada (`ledColor`), tipo de aviso padrão (`noticeType`) e a lista de habilidades (`skills`), são armazenados no Firestore, um banco de dados NoSQL em nuvem.
    *   Cada perfil é associado ao `uid` (User ID) do Firebase Auth, garantindo que os dados sejam específicos para cada usuário.

3.  **Sistema de Habilidades/Elogios (`Skills`)**:
    *   Os usuários podem receber "elogios" ou ter suas "habilidades" confirmadas por outros.
    *   Cada habilidade possui um `name` (nome da habilidade), `score` (pontuação/número de elogios), `confirmedBy` (quem confirmou) e uma `color` (cor visual associada).
    *   Um modal dedicado permite a visualização detalhada de todas as habilidades recebidas, incluindo quem as confirmou e a pontuação total.

4.  **Personalização Visual**:
    *   **Foto de Perfil**: O usuário pode definir uma foto de perfil através de uma URL (ex: LinkedIn, GitHub). Caso não haja foto, um avatar dinâmico é gerado com base na primeira letra do nome do usuário.
    *   **Cor de LED**: Uma cor hexadecimal pode ser escolhida (ou gerada aleatoriamente) para criar um "LED" visual ao redor da foto de perfil, adicionando um toque de personalização.

5.  **Tipo de Aviso Padrão (`NoticeType`)**:
    *   Permite ao usuário definir uma preferência para o tipo de aviso que deseja receber ou que se alinha à sua função (ex: "Análise", "Desenvolvimento", "Liderança").

## ⚙️ Como Funciona (Fluxo)

1.  **Carregamento do Perfil**:
    *   Ao acessar a página de perfil, o `useEffect` verifica se há um usuário autenticado (`user` do `useAuth`).
    *   Se o usuário existe, ele tenta buscar os dados do perfil no Firestore usando o `uid` do usuário.
    *   As informações são então carregadas nos estados locais do componente (nome, bio, foto, cor de LED, etc.).
    *   Se um perfil não existir no Firestore, valores padrão são aplicados (ex: cor aleatória, avatar gerado).

2.  **Edição do Perfil**:
    *   Os campos de entrada (nome, bio, URL da foto, tipo de aviso) são vinculados aos estados locais do React.
    *   Qualquer alteração nesses campos é refletida instantaneamente na interface.

3.  **Gerenciamento de Foto**:
    *   O usuário pode colar uma URL de imagem no campo "Link da imagem". A imagem é pré-visualizada imediatamente.
    *   A função `removePhoto` limpa a foto atual e gera um avatar padrão.
    *   A função `generateAvatar` cria um SVG base64 com a inicial do nome do usuário e uma cor de fundo aleatória.

4.  **Salvando Alterações**:
    *   Ao clicar em "Salvar alterações", a função `saveProfile` é acionada.
    *   Primeiro, ela atualiza o `displayName` e `photoURL` no Firebase Authentication.
    *   Em seguida, ela salva (ou mescla) os dados atualizados no documento do usuário no Firestore.
    *   Feedback é fornecido ao usuário sobre o sucesso ou falha da operação.

5.  **Visualização de Elogios**:
    *   O botão "Ver elogios recebidos" abre um modal (`Dialog` do Headless UI).
    *   Dentro do modal, todas as habilidades (`skills`) do usuário são listadas, mostrando o nome, pontuação, cor e quem confirmou cada uma.

## 🛠️ Stack Tecnológica

*   **Frontend**: React (com Next.js, indicado por `page.tsx` e `use client`), TypeScript
*   **Estilização**: Tailwind CSS (classes utilitárias como `flex`, `gap-4`, `bg-zinc-800`)
*   **Gerenciamento de Estado**: React Hooks (`useState`, `useEffect`)
*   **Autenticação e Banco de Dados**: Firebase (Authentication, Firestore)
*   **Componentes UI**: Headless UI (`Dialog` para modais)

## 🚀 Como Rodar o Projeto Localmente

Para configurar e executar este projeto em sua máquina local, siga os passos abaixo:

### Pré-requisitos

*   Node.js (versão 18 ou superior recomendada)
*   npm ou Yarn
*   Uma conta Firebase e um projeto configurado.

### Configuração do Firebase

1.  **Crie um Projeto Firebase**: Vá para o Console do Firebase e crie um novo projeto.
2.  **Habilite Autenticação**: No seu projeto Firebase, vá em "Authentication" e habilite o método de login "Email/Password" (e outros que desejar).
3.  **Habilite Firestore**: Vá em "Firestore Database" e crie um novo banco de dados. Escolha o modo de produção e defina as regras de segurança apropriadas (para desenvolvimento, você pode começar com regras mais permissivas e ajustá-las depois).
4.  **Obtenha as Credenciais**: Nas configurações do seu projeto Firebase, adicione um aplicativo web e copie as credenciais de configuração (apiKey, authDomain, projectId, etc.).

### Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do seu projeto e adicione as credenciais do Firebase:

```
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=seu_measurement_id
```

### Instalação

1.  **Clone o repositório**:
    ```bash
    git clone <URL_DO_SEU_REPOSITORIO>
    cd nucleoptu
    ```
2.  **Instale as dependências**:
    ```bash
    npm install
    # ou
    yarn install
    ```

### Executando o Servidor de Desenvolvimento

```bash
npm run dev
# ou
yarn dev
```

O aplicativo estará disponível em `http://localhost:3000` (ou a porta configurada pelo Next.js).

## 🤝 Contribuição

Contribuições são bem-vindas! Se você tiver sugestões, melhorias ou encontrar bugs, por favor, abra uma issue ou envie um pull request.

## 📄 Licença

Este projeto está licenciado sob a Licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---

**Nota**: Este `README.md` foi gerado com base no arquivo `profile/page.tsx` fornecido. Assumi que `AuthContext` e `firebase.ts` são arquivos existentes que fornecem a configuração e o contexto de autenticação.