import { FILTROS_INICIAIS, filtrosAtivos, passaFiltros, type LinhaFiltro } from './filtros';

const linha = (o: Partial<LinhaFiltro> = {}): LinhaFiltro => ({
  texto: '568.361 envia diárias e taxas do A410',
  coluna: 'Em Desenvolvimento',
  concluido: false,
  bloqueado: false,
  report: false,
  situacao: 'corrigido',
  cliente: 'Cliente A',
  temPr: true,
  ...o,
});

describe('filtros da tela de processos do BM', () => {
  it('por padrão mostra os chamados em andamento e esconde os concluídos', () => {
    expect(passaFiltros(linha(), FILTROS_INICIAIS)).toBe(true);
    expect(passaFiltros(linha({ concluido: true }), FILTROS_INICIAIS)).toBe(false);
    expect(passaFiltros(linha({ concluido: true }), { ...FILTROS_INICIAIS, andamento: 'concluidos' })).toBe(true);
    expect(passaFiltros(linha({ concluido: true }), { ...FILTROS_INICIAIS, andamento: 'todos' })).toBe(true);
  });

  it('separa os chamados com e sem PR', () => {
    expect(passaFiltros(linha({ temPr: false }), { ...FILTROS_INICIAIS, mostrar: 'com' })).toBe(false);
    expect(passaFiltros(linha({ temPr: false }), { ...FILTROS_INICIAIS, mostrar: 'sem' })).toBe(true);
    expect(passaFiltros(linha(), { ...FILTROS_INICIAIS, mostrar: 'sem' })).toBe(false);
  });

  it('filtra por coluna, situação, cliente, report e bloqueio', () => {
    expect(passaFiltros(linha(), { ...FILTROS_INICIAIS, coluna: 'Review Negócio' })).toBe(false);
    expect(passaFiltros(linha(), { ...FILTROS_INICIAIS, coluna: 'Em Desenvolvimento' })).toBe(true);
    expect(passaFiltros(linha({ temPr: false, situacao: '' }), { ...FILTROS_INICIAIS, situacao: 'corrigido' })).toBe(false);
    expect(passaFiltros(linha(), { ...FILTROS_INICIAIS, cliente: 'Cliente B' })).toBe(false);
    expect(passaFiltros(linha({ report: true }), { ...FILTROS_INICIAIS, report: 'com' })).toBe(true);
    expect(passaFiltros(linha({ report: true }), { ...FILTROS_INICIAIS, report: 'sem' })).toBe(false);
    expect(passaFiltros(linha({ bloqueado: true }), { ...FILTROS_INICIAIS, bloqueado: 'nao' })).toBe(false);
    expect(passaFiltros(linha({ bloqueado: true }), { ...FILTROS_INICIAIS, bloqueado: 'sim' })).toBe(true);
  });

  it('pesquisa no texto sem diferenciar maiúsculas e conta os filtros alterados', () => {
    expect(passaFiltros(linha(), { ...FILTROS_INICIAIS, busca: ' A410 ' })).toBe(true);
    expect(passaFiltros(linha(), { ...FILTROS_INICIAIS, busca: 'glosa' })).toBe(false);
    expect(filtrosAtivos(FILTROS_INICIAIS)).toBe(0);
    expect(filtrosAtivos({ ...FILTROS_INICIAIS, busca: 'x', report: 'com', andamento: 'todos' })).toBe(3);
  });
});
