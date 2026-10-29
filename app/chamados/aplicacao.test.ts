import { acoesPermitidas, ehDono, normalizaChamado, pendenciasPara, type Vinculo } from './aplicacao';

const base = (o: Partial<Vinculo>): Vinculo => ({
  id: '1',
  contextoId: '568098',
  contextoNumero: '568.098',
  contextoAssunto: 'Ajuste',
  prs: ['banco#3965'],
  donoLogins: ['RodrigoZandona'],
  donoNomes: ['Rodrigo Zandoná'],
  chamadoNumero: '570.001',
  cliente: 'Cliente',
  assunto: 'Assunto',
  observacao: '',
  criadoPorUid: 'regra1',
  criadoPorNome: 'Regra',
  criadoPorEmail: 'regra@x',
  criadoEm: '2026-10-29T10:00:00.000Z',
  atualizadoEm: '2026-10-29T10:00:00.000Z',
  aplicacao: 'aberto',
  historico: [],
  ...o,
});

const dono = { uid: 'dev1', gitUser: 'rodrigozandona' };
const regra = { uid: 'regra1', gitUser: '' };
const outro = { uid: 'dev2', gitUser: 'DenysSousa' };
const alvos = (v: Vinculo, p: { uid: string; gitUser: string }) => acoesPermitidas(v, p).map((a) => a.para);

describe('fila de aplicação', () => {
  it('reconhece o dono do PR sem diferenciar maiúsculas e @', () => {
    expect(ehDono(base({}), dono)).toBe(true);
    expect(ehDono(base({}), { uid: 'x', gitUser: '@RodrigoZandona' })).toBe(true);
    expect(ehDono(base({}), outro)).toBe(false);
  });

  it('sem dono cadastrado, qualquer pessoa pode assumir', () => {
    expect(ehDono(base({ donoLogins: [] }), outro)).toBe(true);
  });

  it('pedido aberto: o dono inicia ou marca como aplicado; quem pediu cancela; outro não age', () => {
    expect(alvos(base({}), dono)).toEqual(['aplicando', 'aplicado']);
    expect(alvos(base({}), regra)).toEqual(['cancelado']);
    expect(alvos(base({}), outro)).toEqual([]);
  });

  it('aplicando: o dono conclui a aplicação ou devolve à fila', () => {
    expect(alvos(base({ aplicacao: 'aplicando' }), dono)).toEqual(['aplicado', 'aberto']);
  });

  it('aplicado: quem pediu dá continuidade ou pede nova aplicação', () => {
    expect(alvos(base({ aplicacao: 'aplicado' }), regra)).toEqual(['concluido', 'aplicando']);
    expect(alvos(base({ aplicacao: 'aplicado' }), dono)).toEqual(['aplicando']);
  });

  it('concluído ou cancelado: só quem pediu reabre; sem pedido: só quem vinculou pede', () => {
    expect(alvos(base({ aplicacao: 'concluido' }), regra)).toEqual(['aberto']);
    expect(alvos(base({ aplicacao: 'cancelado' }), dono)).toEqual([]);
    expect(alvos(base({ aplicacao: 'nao-solicitada' }), regra)).toEqual(['aberto']);
    expect(alvos(base({ aplicacao: 'nao-solicitada' }), dono)).toEqual([]);
  });

  it('pendências: o dono vê aberto/aplicando e quem pediu vê aplicado', () => {
    const lista = [base({ id: 'a' }), base({ id: 'b', aplicacao: 'aplicando' }), base({ id: 'c', aplicacao: 'aplicado' }), base({ id: 'd', aplicacao: 'concluido' })];
    expect(pendenciasPara(lista, dono).paraAplicar.map((v) => v.id)).toEqual(['a', 'b']);
    expect(pendenciasPara(lista, dono).total).toBe(2);
    expect(pendenciasPara(lista, regra).paraContinuar.map((v) => v.id)).toEqual(['c']);
    expect(pendenciasPara(lista, outro).total).toBe(0);
  });

  it('pedido sem dono cadastrado não enche a fila de todo mundo', () => {
    expect(pendenciasPara([base({ donoLogins: [] })], outro).total).toBe(0);
  });

  it('normaliza o número do chamado', () => {
    expect(normalizaChamado('568361')).toBe('568.361');
    expect(normalizaChamado(' 568.361 ')).toBe('568.361');
    expect(normalizaChamado('5683')).toBeNull();
  });
});
