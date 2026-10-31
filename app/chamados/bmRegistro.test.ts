import { chamadosDaPessoa, montaRegistro, precisaAtualizar, semIndefinidos } from './bmRegistro';
import type { BmCartao, BmResumoLista } from './bm';
import type { Chamado } from './parse';

const resumo = (atualizadoEm: string, coluna = 'Backlog'): BmResumoLista => ({ cardId: 1, chamado: '568361', coluna, secao: 'Em andamento', bloqueado: false, prazo: '', responsavel: 'Ana', url: 'u', atualizadoEm });
const cartao = {} as BmCartao;
const AGORA = Date.parse('2026-10-29T12:00:00Z');

describe('registro do BM gravado no banco', () => {
  it('relê quando não há registro, quando se força ou quando o cartão mudou', () => {
    const reg = montaRegistro('568.361', resumo('2026-10-28T10:00:00Z'), cartao, 'a@x', '2026-10-29T10:00:00Z');
    expect(reg.chamado).toBe('568361');
    expect(precisaAtualizar(undefined, resumo('x'), AGORA)).toBe(true);
    expect(precisaAtualizar(reg, resumo('2026-10-28T10:00:00Z'), AGORA)).toBe(false);
    expect(precisaAtualizar(reg, resumo('2026-10-28T10:00:00Z'), AGORA, true)).toBe(true);
    expect(precisaAtualizar(reg, resumo('2026-10-29T09:00:00Z'), AGORA)).toBe(true);
    expect(precisaAtualizar(reg, resumo('2026-10-28T10:00:00Z', 'Concluído'), AGORA)).toBe(true);
  });

  it('chamado sem cartão só é consultado de novo depois de 24 horas', () => {
    const recente = montaRegistro('1', undefined, null, 'a@x', '2026-10-29T10:00:00Z');
    const antigo = montaRegistro('1', undefined, null, 'a@x', '2026-10-27T10:00:00Z');
    expect(precisaAtualizar(recente, undefined, AGORA)).toBe(false);
    expect(precisaAtualizar(antigo, undefined, AGORA)).toBe(true);
    expect(precisaAtualizar(recente, resumo('x'), AGORA)).toBe(true); // o cartão passou a existir
  });

  it('seleciona os chamados da pessoa pelo usuário Git (sem diferenciar maiúsculas)', () => {
    const itens = [{ id: 'a', autores: ['Gabriel Grechi'], autoresLogin: ['GabrielGrechiSolus'] }, { id: 'b', autores: ['outro'], autoresLogin: ['outro'] }, { id: 'c' }, { id: 'd', autores: ['GabrielGrechiSolus'] }] as unknown as Chamado[];
    expect(chamadosDaPessoa(itens, 'gabrielgrechisolus').map((c) => c.id)).toEqual(['a', 'd']);
    expect(chamadosDaPessoa(itens, '')).toEqual([]);
  });

  it('descarta propriedades indefinidas para o Firestore', () => {
    expect(semIndefinidos({ a: 1, b: undefined, c: { d: undefined, e: 2 } })).toEqual({ a: 1, c: { e: 2 } });
  });
});
