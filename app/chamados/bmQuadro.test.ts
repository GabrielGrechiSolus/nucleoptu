import { atencaoDe, concluido, ehReport, mudou, numeroDoChamado, numeroDoReport, pontuacao, reportsPorNumero, type CartaoQuadro } from './bmQuadro';

const AGORA = Date.parse('2026-11-11T12:00:00Z');

const cartao = (o: Partial<CartaoQuadro> = {}): CartaoQuadro => ({
  cardId: 1,
  customId: '568361',
  numero: '568361',
  titulo: '568.361 - COMPLEMENTAR',
  tipoId: 11,
  tipo: 'Issue',
  colunaId: 1088,
  coluna: 'Em Desenvolvimento',
  secao: 3,
  ownerId: 112,
  responsavel: 'Gabriel',
  bloqueado: false,
  prioridade: 3,
  prazo: '',
  criadoEm: '2026-10-26T00:00:00Z',
  atualizadoEm: '2026-11-10T00:00:00Z',
  naColunaDesde: '2026-11-10T00:00:00Z',
  boardId: 45,
  url: 'u',
  ...o,
});

describe('quadro do BM: chamados sem PR e reports', () => {
  it('extrai o número do chamado do custom_id ou do título', () => {
    expect(numeroDoChamado('568361', '')).toBe('568361');
    expect(numeroDoChamado('', '568.146 - ERRO DE VALIDAÇÃO')).toBe('568146');
    expect(numeroDoChamado(null, '565885 - ANS')).toBe('565885');
    expect(numeroDoChamado(null, 'Report: 566.577')).toBe('');
    expect(numeroDoChamado('5188', 'Sem número')).toBe('');
  });

  it('reconhece cartões de report e o chamado a que se referem', () => {
    expect(numeroDoReport('Report: 566.577')).toBe('566577');
    expect(numeroDoReport('Report 565811')).toBe('565811');
    expect(numeroDoReport('Reporte 567.563')).toBe('567563');
    expect(numeroDoReport('report: 567447 (webcontas)')).toBe('567447');
    expect(ehReport(cartao({ tipoId: 7, titulo: 'Report: 566.577' }))).toBe(true);
    expect(ehReport(cartao({ tipoId: 11, titulo: 'Report: 566.577' }))).toBe(false);
    const mapa = reportsPorNumero([cartao({ cardId: 5188, tipoId: 7, titulo: 'Report: 566.577', numero: '' }), cartao()]);
    expect(mapa.get('566577')?.length).toBe(1);
  });

  it('marca os pontos de atenção e ignora concluídos', () => {
    const report = cartao({ cardId: 5188, tipoId: 7, titulo: 'Report: 568.361', secao: 3 });
    const c = cartao({ bloqueado: true, prazo: '2026-11-01', naColunaDesde: '2026-10-01T00:00:00Z', ownerId: null, prioridade: 1 });
    expect(atencaoDe(c, [report], AGORA)).toEqual(['report', 'bloqueado', 'prazo', 'parado', 'sem-responsavel', 'prioridade']);
    expect(atencaoDe(cartao({ secao: 4, bloqueado: true }), [report], AGORA)).toEqual([]);
    expect(atencaoDe(cartao(), [cartao({ secao: 4, tipoId: 7 })], AGORA)).toEqual([]);
    expect(concluido(cartao({ secao: 5 }))).toBe(true);
  });

  it('ordena por urgência: report e bloqueio pesam mais que o tempo parado', () => {
    const report = cartao({ cardId: 9, tipoId: 7, titulo: 'Report: 568.361' });
    const comReport = pontuacao(cartao(), [report], AGORA);
    const bloqueado = pontuacao(cartao({ bloqueado: true }), undefined, AGORA);
    const parado = pontuacao(cartao({ naColunaDesde: '2026-09-01T00:00:00Z' }), undefined, AGORA);
    const normal = pontuacao(cartao(), undefined, AGORA);
    expect(comReport > bloqueado && bloqueado > parado && parado > normal).toBe(true);
    expect(pontuacao(cartao({ secao: 4, bloqueado: true }), undefined, AGORA)).toBe(0);
  });

  it('só regrava o cartão quando algo relevante mudou', () => {
    expect(mudou(undefined, cartao())).toBe(true);
    expect(mudou(cartao(), cartao())).toBe(false);
    expect(mudou(cartao(), cartao({ colunaId: 1090 }))).toBe(true);
    expect(mudou(cartao(), cartao({ atualizadoEm: '2026-11-11T00:00:00Z' }))).toBe(true);
  });
});
