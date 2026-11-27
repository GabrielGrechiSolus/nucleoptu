import { FILTROS_VAZIOS, filtraChamados } from './filtro';
import { cartoesSemContexto, linhasDosCartoes } from './regrasSemPr';
import type { CartaoQuadro } from './bmQuadro';

const cartao = (cardId: number, numero: string, extra: Partial<CartaoQuadro> = {}) => ({ cardId, customId: numero, numero, titulo: `Cartão ${cardId}`, tipo: 'Correção', coluna: 'Análise', secao: 2, responsavel: 'Marina Souza', url: '', atualizadoEm: '2026-11-20T10:00:00Z', naColunaDesde: '', prazo: '', criadoEm: '', ...extra }) as CartaoQuadro;
const quadro = [cartao(1, '568001'), cartao(2, '568002', { bloqueado: true }), cartao(4, '568004', { coluna: 'Concluído', secao: 4 }), cartao(5, '568001', { tipo: 'Bug', tipoId: 7, titulo: 'Report: 568.001' })];

describe('cartões do BM sem PR como linhas de Regras e orientações', () => {
  it('ficam de fora os reports e os chamados que já têm contexto', () => {
    expect(cartoesSemContexto(quadro, [{ id: '568002' }]).map((c) => c.cardId)).toEqual([1, 4]);
  });

  it('quando o chamado ganha contexto, o cartão deixa de ser uma linha própria', () => {
    expect(cartoesSemContexto(quadro, []).map((c) => c.cardId)).toContain(1);
    expect(cartoesSemContexto(quadro, [{ id: '568001' }]).map((c) => c.cardId)).not.toContain(1);
  });

  it('viram linhas sem PR, ordenadas pelo que pede atenção, só nas abas Regras e Todos', () => {
    const linhas = linhasDosCartoes(cartoesSemContexto(quadro, []), new Map(), Date.parse('2026-11-27'));
    expect(linhas[0].numero).toBe('568.002');
    expect(linhas[0].atualizadoEm).toBe('20/11/2026');
    for (const aba of ['regras', 'todos'] as const) expect(filtraChamados(linhas, { ...FILTROS_VAZIOS, aba })).toHaveLength(3);
    for (const aba of ['em-correcao', 'corrigidos'] as const) expect(filtraChamados(linhas, { ...FILTROS_VAZIOS, aba })).toHaveLength(0);
  });
});
