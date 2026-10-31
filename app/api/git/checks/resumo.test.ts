import { resumoDeChecks } from './resumo';

describe('resumo dos checks de um PR', () => {
  it('sucesso quando tudo passou ou foi ignorado', () => {
    const r = resumoDeChecks([
      { name: 'Detect Changes', status: 'completed', conclusion: 'success' },
      { name: 'Opcional', status: 'completed', conclusion: 'skipped' },
    ]);
    expect(r).toEqual({ estado: 'sucesso', total: 2, falhas: [], pendentes: [] });
  });

  it('falha tem prioridade sobre pendente e lista os nomes', () => {
    const r = resumoDeChecks([
      { name: 'Build', status: 'completed', conclusion: 'failure' },
      { name: 'Deploy', status: 'in_progress', conclusion: null },
    ]);
    expect(r.estado).toBe('falha');
    expect(r.falhas).toEqual(['Build']);
    expect(r.pendentes).toEqual(['Deploy']);
  });

  it('pendente, sem checks e status legado', () => {
    expect(resumoDeChecks([{ name: 'A', status: 'queued', conclusion: null }]).estado).toBe('pendente');
    expect(resumoDeChecks([]).estado).toBe('sem-checks');
    expect(resumoDeChecks([], [{ context: 'ci/legado', state: 'success' }]).estado).toBe('sucesso');
    expect(resumoDeChecks([], [{ context: 'ci/legado', state: 'error' }]).estado).toBe('falha');
  });
});
