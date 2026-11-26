# Web Relatus

A aba **Web Relatus** do detalhe do chamado busca o atendimento pelo número em `https://relatus.solus.inf.br/api`.

## Como o token é obtido

O servidor entra no Relatus com o operador configurado (`POST /v1/login`), guarda o token em memória e gera outro quando ele vence ou é recusado. O token não vai para o navegador e não há token fixo para renovar. Depois de um login recusado, aquela instância do servidor espera 5 minutos antes de tentar de novo.

## Configuração na Vercel

Em **Settings > Environment Variables**, no ambiente **Production**:

| Variável | Valor |
|---|---|
| `RELATUS_LOGIN` | operador com que se entra em relatus.solus.inf.br |
| `RELATUS_SENHA` | senha desse operador, marcada como **Sensitive** |
| `RELATUS_API_BASE_URL` | opcional; só para apontar para outro endereço |

Depois, faça um **Redeploy**. Nunca use `NEXT_PUBLIC_` nessas variáveis. Ao trocar a senha no Solus, atualize `RELATUS_SENHA` e publique de novo, antes de consultar, para não acumular tentativas recusadas.

## Quem enxerga

Só os e-mails de `NEXT_PUBLIC_RELATUS_USUARIOS` (padrão: o titular do operador). As consultas usam o operador configurado: **quem for liberado enxerga os chamados com o acesso dele**.
