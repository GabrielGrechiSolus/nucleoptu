# Web Relatus

A aba **Web Relatus** do detalhe do chamado busca o atendimento pelo número em `https://relatus.solus.inf.br/api`.

## O que é mostrado

Dados do atendimento, descritivo, anexos do chamado, mensagens (com os anexos de cada uma, carregados ao clicar em **Ver anexos**) e documentos Google já criados. PRs e etapa do BusinessMap continuam vindo das outras telas. A consulta só lê dados.

O HTML do descritivo e das mensagens é exibido como texto simples. Os anexos passam pelo servidor (`/api/relatus/chamado/arquivo`) e são sempre entregues como download, com limite de 55 segundos por arquivo.

## Consulta salva

Para evitar requisições repetidas, o resultado fica salvo no navegador (até 30 chamados) e é apagado ao sair do sistema.

| Situação | Quando consulta de novo |
|---|---|
| Chamado com data de fechamento | só em **Atualizar** (use se ele for reaberto) |
| Chamado aberto | após 30 minutos ou em **Atualizar** |
| Consulta com alguma parte não devolvida | na próxima abertura |
| Anexos de uma mensagem já vistos | não consulta de novo |

Os arquivos baixados não são guardados. No servidor, o identificador interno do chamado é reaproveitado em memória.

## Como o token é obtido

O servidor entra no Relatus com o operador configurado (`POST /v1/login`), guarda o token em memória e gera outro quando ele vence ou é recusado. O token não vai para o navegador e não há token fixo para renovar. Depois de um login recusado, aquela instância do servidor espera 5 minutos antes de tentar de novo.

## Configuração na Vercel

Em **Settings > Environment Variables**, no ambiente **Production**:

| Variável | Valor |
|---|---|
| `RELATUS_LOGIN` | operador com que se entra em relatus.solus.inf.br |
| `RELATUS_SENHA` | senha desse operador, marcada como **Sensitive** |

O endereço é fixo no código; `RELATUS_API_BASE_URL` e `RELATUS_SERVICE_TOKEN` não são usadas e podem ser apagadas.

Depois, faça um **Redeploy**. Nunca use `NEXT_PUBLIC_` nessas variáveis. Ao trocar a senha no Solus, atualize `RELATUS_SENHA` e publique de novo, antes de consultar, para não acumular tentativas recusadas.

## Quem enxerga

Só os e-mails de `NEXT_PUBLIC_RELATUS_USUARIOS` (padrão: o titular do operador). As consultas usam o operador configurado: **quem for liberado enxerga os chamados com o acesso dele**.
