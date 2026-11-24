import { idDoPr, lidosIniciais, montaNotificacoes, naoLidas, tempoRelativo, type PrMergeado } from './prsMergeados';

const agora = Date.parse('2026-11-24T15:00:00Z');
const pr = (repo: string, numero: number, titulo: string, mescladoEm: string): PrMergeado => ({ repo, numero, titulo, url: `https://github.com/solussaude/${repo}/pull/${numero}`, mescladoEm });

const prs = [
  pr('banco', 3984, 'hotfix/(568.361)-envia-diarias-e-taxas-a410', '2026-11-24T14:00:00Z'),
  pr('ptu', 432, 'hotfix/(568.178)-ajuste-no-valor-pago', '2026-11-22T10:00:00Z'),
  pr('banco', 1, 'ajuste sem numero de chamado', '2026-11-24T14:30:00Z'),
  pr('banco', 2, 'hotfix/(569.000)-sem-merge', ''),
];

describe('notificações de PRs mergeados', () => {
  it('liga o PR ao chamado e ao cartão do BM, do mais recente para o mais antigo', () => {
    const registros = { '568361': { resumo: { url: 'https://bm/cards/5060/details/', coluna: 'Em Merge' } as never } };
    const n = montaNotificacoes(prs, registros, new Set());
    expect(n.map((x) => x.id)).toEqual(['banco#1', 'banco#3984', 'ptu#432']);
    const a = n.find((x) => x.id === 'banco#3984')!;
    expect(a.chamado).toBe('568.361');
    expect(a.chamadoId).toBe('568361');
    expect(a.url).toBe('https://github.com/solussaude/banco/pull/3984');
    expect(a.cartaoUrl).toBe('https://bm/cards/5060/details/');
    expect(a.coluna).toBe('Em Merge');
    expect(a.assunto).toBe('Envia diarias e taxas a410');
  });

  it('deixa o cartão vazio quando o chamado não tem cartão sincronizado ou o título não tem chamado', () => {
    const n = montaNotificacoes(prs, {}, new Set());
    expect(n.find((x) => x.id === 'ptu#432')!.cartaoUrl).toBe('');
    expect(n.find((x) => x.id === 'banco#1')!.chamado).toBe('');
    expect(n.find((x) => x.id === 'banco#1')!.cartaoUrl).toBe('');
    expect(montaNotificacoes(prs, { '568178': { resumo: null } }, new Set()).find((x) => x.id === 'ptu#432')!.cartaoUrl).toBe('');
  });

  it('marca como lidas as já vistas e conta as não lidas', () => {
    const n = montaNotificacoes(prs, {}, new Set(['banco#1']));
    expect(n.find((x) => x.id === 'banco#1')!.lida).toBe(true);
    expect(naoLidas(n).map((x) => x.id)).toEqual(['banco#3984', 'ptu#432']);
  });

  it('na primeira vez só os merges das últimas 24 horas ficam como novos', () => {
    expect(lidosIniciais(prs.filter((p) => p.mescladoEm), agora)).toEqual([idDoPr(prs[1])]);
    expect(lidosIniciais(prs.filter((p) => p.mescladoEm), agora, 100)).toEqual([]);
  });

  it('escreve o tempo de forma curta', () => {
    expect(tempoRelativo('2026-11-24T14:59:40Z', agora)).toBe('agora');
    expect(tempoRelativo('2026-11-24T14:30:00Z', agora)).toBe('há 30 min');
    expect(tempoRelativo('2026-11-24T12:00:00Z', agora)).toBe('há 3 h');
    expect(tempoRelativo('2026-11-23T12:00:00Z', agora)).toBe('ontem');
    expect(tempoRelativo('2026-11-20T15:00:00Z', agora)).toBe('há 4 dias');
    expect(tempoRelativo('x', agora)).toBe('');
  });
});
