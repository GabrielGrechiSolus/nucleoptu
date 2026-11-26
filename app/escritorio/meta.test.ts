import { avaliaMeta, mesDe } from './meta';

describe('meta de chamados: quanto menos abertos, melhor', () => {
  it('fica dentro da meta quando os abertos não passam do máximo, inclusive zero', () => {
    expect(avaliaMeta(25, 10, '2026-11', '2026-11')).toMatchObject({ situacao: 'dentro', excesso: 0, percentual: 40 });
    expect(avaliaMeta(25, 25, '2026-11', '2026-11').situacao).toBe('dentro');
    expect(avaliaMeta(25, 0, '2026-11', '2026-11')).toMatchObject({ situacao: 'dentro', percentual: 0 });
  });

  it('fica acima quando passa do máximo e mostra o excesso', () => {
    expect(avaliaMeta(25, 31, '2026-11', '2026-11')).toMatchObject({ situacao: 'acima', excesso: 6, percentual: 100, rotulo: 'Acima da meta (+6)' });
  });

  it('só é batida ou não batida depois que o mês termina', () => {
    expect(avaliaMeta(25, 20, '2026-10', '2026-11')).toMatchObject({ situacao: 'batida', rotulo: 'Meta batida · falta o salgadinho' });
    expect(avaliaMeta(25, 26, '2026-10', '2026-11').situacao).toBe('nao-batida');
    expect(avaliaMeta(25, 5, '2026-12', '2026-11').situacao).toBe('dentro');
  });

  it('sem contagem informada não conta como batida, mesmo com o mês encerrado', () => {
    expect(avaliaMeta(25, undefined, '2026-10', '2026-11').situacao).toBe('sem-contagem');
    expect(avaliaMeta(undefined, 3, '2026-10', '2026-11').situacao).toBe('sem-contagem');
  });

  it('usa o mês no horário local', () => {
    expect(mesDe(new Date(2026, 0, 31, 23, 30))).toBe('2026-01');
  });
});
