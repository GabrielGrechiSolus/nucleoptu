# Modelo de contexto para a regra de negócio (REGRA.md)

Coloque um arquivo `REGRA.md` dentro da pasta de cada chamado (por exemplo `chamados/568.361-unimed-limeira/REGRA.md`) e use **Contexto de chamados > Importar contextos**.

O texto deve ser em linguagem de regra de negócio: sem tabela, rotina, branch, commit ou SQL. A regra precisa entender sem abrir o banco ou o Delphi.

Para que serve: a regra acompanha o que está em correção, o que já foi corrigido (e em qual revision saiu) e as regras que estavam difíceis de achar (as que só o desenvolvimento encontrava pelo banco ou pelo Delphi), para consultar aqui da próxima vez.

## Modelo

```markdown
---
chamado: 000.000
cliente: Nome do cliente
assunto: Resumo do que o cliente via, em uma linha
tipo: correcao
situacao: em-correcao
modulo: PTU A500
caminhoTela: Movimentação / A500 / Geração do A500
revision:
publicadoEm:
pr: 0000
evidencia:
planoTestes:
---

## Problema
O que o usuário via na tela ou no arquivo, em linguagem de regra de negócio.

## O que foi corrigido
A regra ou o comportamento que mudou. Se for só orientação, escreva a regra que se aplica.

## Como funciona agora
O resultado esperado depois da correção, com as exceções.

## Como orientar o cliente
O que dizer ao cliente e o que ele precisa fazer (por exemplo, atualizar a revision e reimportar).

## Onde a regra estava escondida
Só para tipo regra: onde está o parâmetro ou a regra (tela, cadastro, módulo), como localizar e como a regra
pode consultar da próxima vez, sem depender do desenvolvimento.
```

## Campos do cabeçalho

| Campo | Valores | Descrição |
|---|---|---|
| `chamado` | `000.000` | Número do chamado, com o ponto. |
| `cliente` | `texto` | Cliente que abriu o chamado. |
| `assunto` | `texto` | Resumo em uma linha. |
| `tipo` | `correcao | regra | orientacao` | correcao: mudou o sistema. regra: era uma regra do sistema difícil de achar (regra escondida). orientacao: dúvida resolvida sem mudar o sistema. |
| `situacao` | `em-correcao | corrigido | encerrado` | em-correcao: o dev está trabalhando. corrigido: já publicada (merge feito). encerrado: sem alteração de sistema. |
| `modulo` | `texto` | Módulo ou funcionalidade, como a regra conhece (ex.: PTU A500, Reembolso). |
| `caminhoTela` | `texto` | Caminho no sistema onde a regra confere o resultado. |
| `revision` | `40127` | Revision em que a correção passa a estar disponível. Vazio enquanto não saiu. |
| `publicadoEm` | `AAAA-MM-DD` | Data do merge da correção. Vazio enquanto não saiu. |
| `pr` | `3928, 3858` | Números dos PRs, separados por vírgula. Use repo#número se não for do banco (ex.: contas#120). |
| `evidencia` | `URL` | Link da evidência de testes. |
| `planoTestes` | `URL` | Link do plano de testes. |

## Tipos e situações

- **correcao** com **em-correcao**: o desenvolvimento está trabalhando. Deixe `revision` e `publicadoEm` vazios.
- **correcao** com **corrigido**: a correção já foi mesclada. Preencha `publicadoEm` e a `revision` em que passa a estar disponível.
- **regra**: o chamado era uma regra do sistema difícil de achar. Preencha a seção "Onde a regra estava escondida".
- **orientacao**: dúvida resolvida sem mudar o sistema.

## Como importar

1. Salve os `REGRA.md` nas pastas dos chamados.
2. No sistema, abra **Contexto de chamados** e clique em **Importar contextos**.
3. Escolha a pasta que contém as pastas dos chamados (ou informe o caminho, com o sistema rodando na sua máquina) e clique em **Gravar**.

Chamados que já existem são atualizados; nada é apagado. Pastas sem `REGRA.md` continuam aparecendo, só com os dados lidos do `CONTEXTO.md`.
