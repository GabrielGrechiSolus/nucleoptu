import { FILTROS_VAZIOS, filtraChamados, type Filtros } from './filtro';
import { montaChamado } from './parse';

const regra = (o: Record<string, string>, corpo = '## Problema\nTexto.') =>
  `---\n${Object.entries({ chamado: '000.000', cliente: 'Cliente', assunto: 'Assunto', tipo: 'correcao', situacao: 'corrigido', ...o })
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')}\n---\n\n${corpo}`;

const mk = (num: string, o: Record<string, string>, corpo?: string) => montaChamado(`${num}-x`, { 'REGRA.md': regra({ chamado: num, ...o }, corpo) })!;

const itens = [
  mk('568.001', { autor: 'Denys Sousa', autorLogin: 'DenysSousa', situacao: 'corrigido', modulo: 'PTU A500', revision: '40127', pr: 'banco#10', cliente: 'Unimed A' }),
  mk('568.002', { autor: 'Rodrigo Zandoná', autorLogin: 'RodrigoZandona', situacao: 'em-correcao', modulo: 'Reembolso', pr: 'banco#11', cliente: 'Unimed B' }, '## Problema\nCarência indevida.'),
  mk('568.003', { autor: 'Gabriel Grechi, Denys Sousa', situacao: 'corrigido', modulo: 'PTU A500', revision: '40125', cliente: 'Unimed A' }),
  mk('568.004', { autor: 'Gabriel Grechi', tipo: 'regra', situacao: 'encerrado', cliente: 'Unimed C' }),
];

const f = (o: Partial<Filtros>): Filtros => ({ ...FILTROS_VAZIOS, ...o });
const nums = (l: ReturnType<typeof filtraChamados>) => l.map((c) => c.numero);

describe('filtros da lista de contextos', () => {
  it('sem filtros devolve tudo', () => {
    expect(nums(filtraChamados(itens, FILTROS_VAZIOS))).toEqual(['568.001', '568.002', '568.003', '568.004']);
  });

  it('filtra por autor, inclusive quando o chamado tem mais de um autor', () => {
    expect(nums(filtraChamados(itens, f({ autor: 'Denys Sousa' })))).toEqual(['568.001', '568.003']);
    expect(nums(filtraChamados(itens, f({ autor: 'Gabriel Grechi' })))).toEqual(['568.003', '568.004']);
  });

  it('a busca por "denys" (minúsculas, sem sobrenome) encontra o autor', () => {
    expect(nums(filtraChamados(itens, f({ busca: 'denys' })))).toEqual(['568.001', '568.003']);
    expect(nums(filtraChamados(itens, f({ busca: 'zandona' })))).toEqual(['568.002']);
    expect(nums(filtraChamados(itens, f({ busca: 'DenysSousa' })))).toEqual(['568.001']);
  });

  it('filtra por situação (abas), tipo, módulo, cliente e revision', () => {
    expect(nums(filtraChamados(itens, f({ aba: 'em-correcao' })))).toEqual(['568.002']);
    expect(nums(filtraChamados(itens, f({ aba: 'corrigidos' })))).toEqual(['568.001']);
    expect(nums(filtraChamados(itens, f({ aba: 'regras' })))).toEqual(['568.003', '568.004']);
    expect(nums(filtraChamados(itens, f({ modulo: 'PTU A500' })))).toEqual(['568.001', '568.003']);
    expect(nums(filtraChamados(itens, f({ cliente: 'Unimed B' })))).toEqual(['568.002']);
    expect(nums(filtraChamados(itens, f({ revision: '40125' })))).toEqual(['568.003']);
  });

  it('filtros sim/não de PR e combinação de filtros', () => {
    expect(nums(filtraChamados(itens, f({ pr: 'sim' })))).toEqual(['568.001', '568.002']);
    expect(nums(filtraChamados(itens, f({ pr: 'nao' })))).toEqual(['568.003', '568.004']);
    expect(nums(filtraChamados(itens, f({ autor: 'Denys Sousa', modulo: 'PTU A500', revision: '40127' })))).toEqual(['568.001']);
  });

  it('a busca sempre inclui o conteúdo dos documentos', () => {
    expect(nums(filtraChamados(itens, f({ busca: 'carencia' })))).toEqual(['568.002']);
  });

  it('chamado sem PR fica em Regras e, ao ganhar um PR, muda para a aba da situação', () => {
    const semPr = itens.filter((c) => c.numero === '568.003');
    expect(filtraChamados(semPr, f({ aba: 'regras' }))).toHaveLength(1);
    expect(filtraChamados(semPr, f({ aba: 'corrigidos' }))).toHaveLength(0);
    const comPr = semPr.map((c) => ({ ...c, temPr: true, prs: [{ numero: '12', repo: 'banco' }] }));
    expect(filtraChamados(comPr, f({ aba: 'regras' }))).toHaveLength(0);
    expect(filtraChamados(comPr, f({ aba: 'corrigidos' }))).toHaveLength(1);
  });
});
