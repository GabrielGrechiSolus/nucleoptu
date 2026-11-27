import { FILTROS_CARTOES, buscaCartoes, cartoesSemContexto, filtraCartoes } from './regrasSemPr';
import type { CartaoQuadro } from './bmQuadro';

const cartao = (cardId: number, numero: string, extra: Partial<CartaoQuadro> = {}) => ({ cardId, customId: numero, numero, titulo: `Cartão ${cardId}`, tipo: 'Correção', coluna: 'Análise', secao: 2, responsavel: 'Marina Souza', url: '', ...extra }) as CartaoQuadro;
const quadro = [cartao(1, '568001'), cartao(2, '568002'), cartao(3, ''), cartao(4, '568004', { coluna: 'Concluído', secao: 4 }), cartao(5, '568001', { tipo: 'Bug', tipoId: 7, titulo: 'Report: 568.001' })];

describe('cartões do BM sem PR em Regras e orientações', () => {
  it('ficam de fora os reports e os chamados que já têm contexto', () => {
    expect(cartoesSemContexto(quadro, [{ id: '568002' }]).map((c) => c.cardId)).toEqual([1, 3, 4]);
  });

  it('quando o chamado ganha contexto com PR, o cartão sai da lista', () => {
    expect(cartoesSemContexto(quadro, []).map((c) => c.cardId)).toContain(1);
    expect(cartoesSemContexto(quadro, [{ id: '568001' }]).map((c) => c.cardId)).not.toContain(1);
  });

  it('a busca aceita número com ponto, responsável sem acento e id do cartão', () => {
    const lista = cartoesSemContexto(quadro, []);
    expect(buscaCartoes(lista, '568.002', {}).map((c) => c.cardId)).toEqual([2]);
    expect(buscaCartoes(lista, 'souza concluido', {}).map((c) => c.cardId)).toEqual([4]);
    expect(buscaCartoes(lista, '', {})).toHaveLength(4);
  });

  it('por padrão mostra os em andamento com número; os filtros ampliam', () => {
    const lista = cartoesSemContexto(quadro, []);
    expect(filtraCartoes(lista, FILTROS_CARTOES, new Map(), 0).map((c) => c.cardId)).toEqual([1, 2]);
    expect(filtraCartoes(lista, { ...FILTROS_CARTOES, aba: 'todos', semNumero: true }, new Map(), 0)).toHaveLength(4);
  });
});
