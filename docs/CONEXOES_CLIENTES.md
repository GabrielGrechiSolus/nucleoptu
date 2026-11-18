# Conexões de clientes

Tela `/client-connections` (menu "Conexões"), liberada a todos os usuários logados (e-mail confirmado). Os dados ficam no Firestore, na coleção `clientes_conexoes`.

## Cadastro

- **Cliente:** nome, código, cidade/UF, situação e descrição.
- **Conexões (opcional):** AnyDesk e TeamViewer (ID de acesso e senha), Terminal Service (servidor, porta, domínio, usuário e senha) e VPN (servidor, porta, protocolo, usuário e senha). Cada cliente pode ter várias.
- **Contatos do Teams (opcional):** nome, e-mail do Teams, cargo, telefone e perfil opcional (Técnica, Regra de negócio ou Gerente). Há botão para abrir a conversa no Teams.
- Pesquisa por cliente, código, ID de acesso, servidor ou contato, com filtros de situação, tipo de conexão e perfil de contato.
- Dados salvos só no navegador pela versão anterior da tela podem ser importados para o banco (aviso na própria tela).

## Proteção

- **Senhas criptografadas** (AES-256-GCM) no servidor, com a chave `CONEXOES_CHAVE_CRIPTO` (base64, 32 bytes; ex.: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`). A senha nunca volta na listagem: só aparece quando alguém clica em mostrar ou copiar, some da tela em 30 segundos e cada consulta é gravada em `auditoria_conexoes`. Guarde a chave com segurança: sem ela as senhas não abrem, e trocá-la invalida as já gravadas.
- **Tudo passa pela API** (`/api/conexoes`), com login do Firebase, e-mail confirmado, mesma origem, limite de consultas por usuário (60 leituras/min, 40 gravações/min, 20 senhas a cada 10 min) e validação de tamanho dos campos. Exige `FIREBASE_SERVICE_ACCOUNT_JSON` no servidor.
- **Agentes de IA e robôs:** `proxy.ts` recusa (403) agentes de IA conhecidos (GPTBot, ClaudeBot, PerplexityBot, CCBot, Bytespider etc.), ferramentas de raspagem e navegadores automatizados na tela e na API; `robots.txt` e o cabeçalho `X-Robots-Tag` pedem que não indexem nem usem o conteúdo. Isso é uma barreira adicional: a proteção real é o login, a criptografia e o limite de consultas.
- **Cabeçalhos de segurança** em todo o site: não abrir em quadro de outro site, sem cache nas respostas da API e da tela, `nosniff`, política de referência e HSTS.

## Regras do Firestore (obrigatório)

Bloqueie o acesso direto do navegador às coleções, para que só a API (que usa a chave de administrador) leia e grave:

```
match /clientes_conexoes/{id} { allow read, write: if false; }
match /auditoria_conexoes/{id} { allow read, write: if false; }
```
