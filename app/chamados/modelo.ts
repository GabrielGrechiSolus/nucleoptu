// Modelo do arquivo REGRA.md: um por chamado, na pasta do chamado (ex.: chamados/568.361-unimed-limeira/REGRA.md).
// É a visão para a regra de negócio: sem tabela, rotina, branch ou SQL. O texto abaixo também está em
// docs/MODELO_REGRA.md, que é o arquivo para copiar.
export const MODELO_REGRA = `---
chamado: 000.000
cliente: Nome do cliente
assunto: Resumo do que o cliente via, em uma linha
autor: Nome de quem fez o PR
autorLogin: usuarioGit
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
`;

export const CAMPOS_REGRA: { campo: string; valores: string; descricao: string }[] = [
  { campo: 'chamado', valores: '000.000', descricao: 'Número do chamado, com o ponto.' },
  { campo: 'cliente', valores: 'texto', descricao: 'Cliente que abriu o chamado.' },
  { campo: 'assunto', valores: 'texto', descricao: 'Resumo em uma linha.' },
  { campo: 'autor', valores: 'Nome, Nome', descricao: 'Quem fez o PR (nome de quem desenvolveu). Mais de um, separados por vírgula.' },
  { campo: 'autorLogin', valores: 'usuarioGit, usuarioGit', descricao: 'Usuário no GitHub de quem fez o PR. Liga o PR ao dono na fila de aplicação (cada pessoa informa o seu no Perfil).' },
  { campo: 'tipo', valores: 'correcao | melhoria | regra | orientacao', descricao: 'correcao: corrigiu o sistema. melhoria: nova funcionalidade (feature). regra: era uma regra do sistema difícil de achar (regra escondida). orientacao: dúvida resolvida sem mudar o sistema.' },
  { campo: 'situacao', valores: 'em-correcao | corrigido | encerrado', descricao: 'em-correcao: o dev está trabalhando. corrigido: já publicada (merge feito). encerrado: sem alteração de sistema.' },
  { campo: 'modulo', valores: 'texto', descricao: 'Módulo ou funcionalidade, como a regra conhece (ex.: PTU A500, Reembolso).' },
  { campo: 'caminhoTela', valores: 'texto', descricao: 'Caminho no sistema onde a regra confere o resultado.' },
  { campo: 'revision', valores: '40127', descricao: 'Revision em que a correção passa a estar disponível. Vazio enquanto não saiu.' },
  { campo: 'previsaoRevision', valores: '40128', descricao: 'Previsão de liberação: a próxima revision depois da última publicada, para correções mescladas que ainda não saíram. Gerado a partir do Git.' },
  { campo: 'publicadoEm', valores: 'AAAA-MM-DD', descricao: 'Data do merge da correção. Vazio enquanto não saiu.' },
  { campo: 'pr', valores: '3928, 3858', descricao: 'Números dos PRs, separados por vírgula. Use repo#número se não for do banco (ex.: contas#120).' },
  { campo: 'evidencia', valores: 'URL', descricao: 'Link da evidência de testes.' },
  { campo: 'planoTestes', valores: 'URL', descricao: 'Link do plano de testes.' },
];
