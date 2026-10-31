import { avaliaCriterio, campoPorNome, propostasDeCampos, rascunhoTextoConclusao, textoConclusaoComplementado, textoParaHtml } from './automacao';

const regra = '---\nchamado: 568.361\n---\n\n## Problema\nO A410 era recusado sem diárias e taxas.\n\n## O que foi corrigido\nO envio passa a incluir a tabela própria.\n\n## Como vai funcionar\nO bloco é enviado.\n';

describe('automações do processo do BM a partir do Git', () => {
  it('monta o rascunho do texto de conclusão com a mensagem padrão no final', () => {
    const t = rascunhoTextoConclusao({ docs: { 'REGRA.md': regra } });
    expect(t.startsWith('O A410 era recusado sem diárias e taxas.')).toBe(true);
    expect(t.includes('O envio passa a incluir a tabela própria.')).toBe(true);
    expect(t.endsWith('ficando disponíveis para atualização via revision.')).toBe(true);
    expect(rascunhoTextoConclusao({ docs: {} })).toBe('');
    expect(rascunhoTextoConclusao({ docs: { 'REGRA.md': '## Como vai funcionar\nA completar pelo analista.' } })).toBe('');
  });

  it('propõe só os campos que o Git sabe preencher', () => {
    const propostas = propostasDeCampos({
      docs: { 'REGRA.md': regra },
      prs: [{ repo: 'banco', numero: 3965, url: 'https://github.com/solussaude/banco/pull/3965' }, { repo: 'TestesIntegracao', numero: 1 }],
      branches: ['hotfix/(568.361)-x'],
      evidencias: [{ texto: 'Evidência', url: 'https://docs/e' }],
      planosTeste: [],
    });
    expect(propostas.map((p) => p.chave)).toEqual(['texto', 'pr', 'branch', 'repo', 'qa']);
    expect(propostas.find((p) => p.chave === 'pr')?.valor).toBe('https://github.com/solussaude/banco/pull/3965');
    expect(propostas.find((p) => p.chave === 'qa')?.valor).toBe('Evidência de testes: https://docs/e');
    expect(propostasDeCampos({ docs: {}, prs: [], branches: [], evidencias: [], planosTeste: [] })).toEqual([]);
  });

  it('avalia os critérios de saída da coluna pelo que o Git tem', () => {
    const ctx = { temPr: true, temEvidencia: false, temPlano: true, textoConclusaoOk: false, temRevision: false };
    expect(avaliaCriterio('Evidência concluída', ctx)).toEqual({ automatico: true, cumprido: false, motivo: 'Sem link de evidência no Git.' });
    expect(avaliaCriterio('Plano de testes anexado', ctx).cumprido).toBe(true);
    expect(avaliaCriterio('PR vinculado ao card', ctx).cumprido).toBe(true);
    expect(avaliaCriterio('Texto de conclusão preenchido', ctx).cumprido).toBe(false);
    expect(avaliaCriterio('Revisão do líder', ctx).automatico).toBe(false);
  });

  it('reconhece texto de conclusão complementado e converte texto em HTML seguro', () => {
    expect(textoConclusaoComplementado('')).toBe(false);
    expect(textoConclusaoComplementado('As alterações/desenvolvimentos foram efetivadas, ficando disponíveis para atualização via revision.')).toBe(false);
    expect(textoConclusaoComplementado('O envio do A410 não incluía as diárias e taxas da tabela própria; ajustamos a regra de envio.')).toBe(true);
    expect(textoParaHtml('a < b & c\nlinha 2\n\nsegundo')).toBe('<p>a &lt; b &amp; c<br>linha 2</p><p>segundo</p>');
    expect(campoPorNome('Git PR')?.chave).toBe('pr');
    expect(campoPorNome('Cliente')).toBe(undefined);
  });
});
