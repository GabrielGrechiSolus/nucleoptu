import { faseDaColuna, posicaoNoFluxo } from './etapas';

const NOMES = [
  'Em entendimento', 'Aceite do Cliente', 'Pronto para Análise', 'Em Análise', 'Pronto para revisão', 'Em revisão', 'Validação Orçamento', 'Backlog do Desenvolvimento',
  'Em Desenvolvimento', 'Teste Desenvolvimento', 'Review Negócio', 'Review Técnico', 'Pronto para teste', 'Em Teste', 'Pronto para Merge', 'Em Merge',
  'Pronto para Documentação', 'Em Documentação', 'Em Revisão QA', 'Chamado Concluído', 'Ready to Archive',
];
const colunas = NOMES.map((nome, i) => ({ id: 100 + i, nome, posicao: i + 1 }));

describe('etapas do fluxo operacional do BM', () => {
  it('classifica cada coluna na fase do quadro', () => {
    expect(NOMES.map(faseDaColuna)).toEqual([
      'Entendimento e Validação', 'Entendimento e Validação', 'Análise', 'Análise', 'Revisão', 'Revisão', 'Revisão', 'Revisão',
      'Desenvolvimento', 'Desenvolvimento', 'Desenvolvimento', 'Desenvolvimento', 'QA/Testes', 'QA/Testes', 'Merge & Release', 'Merge & Release',
      'Documentação', 'Documentação', 'Documentação', 'Concluído', 'Concluído',
    ]);
    expect(faseDaColuna('Coluna nova')).toBe('Outras etapas');
  });

  it('indica onde o cartão está e qual é a próxima etapa', () => {
    const p = posicaoNoFluxo(colunas, 109);
    expect(p.atual?.nome).toBe('Teste Desenvolvimento');
    expect(p.anterior?.nome).toBe('Em Desenvolvimento');
    expect(p.proxima?.nome).toBe('Review Negócio');
    expect(p.feitas).toBe(9);
    expect(p.total).toBe(21);
    expect(p.fases.map((f) => f.nome)).toEqual(['Entendimento e Validação', 'Análise', 'Revisão', 'Desenvolvimento', 'QA/Testes', 'Merge & Release', 'Documentação', 'Concluído']);
    const sit = Object.fromEntries(p.fases.flatMap((f) => f.etapas).map((e) => [e.nome, e.situacao]));
    expect(sit['Em Desenvolvimento']).toBe('feita');
    expect(sit['Teste Desenvolvimento']).toBe('atual');
    expect(sit['Review Negócio']).toBe('proxima');
    expect(sit['Review Técnico']).toBe('futura');
  });

  it('ordena pela posição e trata a primeira, a última e uma coluna desconhecida', () => {
    const embaralhadas = [...colunas].reverse();
    expect(posicaoNoFluxo(embaralhadas, 100).anterior).toBeNull();
    expect(posicaoNoFluxo(embaralhadas, 100).proxima?.nome).toBe('Aceite do Cliente');
    expect(posicaoNoFluxo(embaralhadas, 120).proxima).toBeNull();
    const desconhecida = posicaoNoFluxo(colunas, 999);
    expect(desconhecida.atual).toBeNull();
    expect(desconhecida.proxima).toBeNull();
  });
});
