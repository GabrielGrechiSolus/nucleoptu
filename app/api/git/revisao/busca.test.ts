import { comparaTags, primeiraRevisao, tagsPublicadas, ultimaRevisao } from './busca';

const linhas = [
  { NNUMETAG: '2.352.7', CREVIUPDAT: '40126', DDATATAG: '2026-10-09T10:00:00.000Z' },
  { NNUMETAG: '2.357.7', CREVIUPDAT: '40127', DDATATAG: '2026-10-19T10:00:00.000Z' },
  { NNUMETAG: '2.359.1', CREVIUPDAT: '40127', DDATATAG: '2026-10-19T10:00:00.000Z' },
  { NNUMETAG: '2.371.8', CREVIUPDAT: '40127', DDATATAG: '2026-10-23T10:00:00.000Z' },
  { NNUMETAG: '2.342.0', CREVIUPDAT: '40125', DDATATAG: '2026-10-02T10:00:00.000Z' },
  { NNUMETAG: '2.342.0', CREVIUPDAT: '40126', DDATATAG: '2026-10-09T10:00:00.000Z' }, // mesma tag em duas revisions
  { NNUMETAG: 'v2.0', CREVIUPDAT: '40001' }, // inválida
];

// "contém" simulado: o commit entrou na tag 2.357.7; tags maiores o contêm
const contemDesde = (primeira: string) => async (tag: string) => comparaTags(tag, primeira) >= 0;

describe('revision de uma correção a partir das tags publicadas', () => {
  it('ordena as tags por versão e fica com a menor revision de cada uma', () => {
    const t = tagsPublicadas(linhas);
    expect(t.map((x) => x.tag)).toEqual(['2.342.0', '2.352.7', '2.357.7', '2.359.1', '2.371.8']);
    expect(t.find((x) => x.tag === '2.342.0')!.revisao).toBe(40125);
    expect(comparaTags('2.9.1', '2.10.0') < 0).toBe(true);
  });

  it('acha a primeira tag publicada que contém o commit e a sua revision', async () => {
    const r = await primeiraRevisao(tagsPublicadas(linhas), '2026-10-12T12:00:00Z', contemDesde('2.357.7'));
    expect(r).toEqual({ revisao: 40127, tag: '2.357.7' });
  });

  it('commit que entrou entre duas tags publicadas cai na tag seguinte', async () => {
    const r = await primeiraRevisao(tagsPublicadas(linhas), '2026-10-10T12:00:00Z', contemDesde('2.358.0'));
    expect(r).toEqual({ revisao: 40127, tag: '2.359.1' });
  });

  it('commit que nenhuma tag publicada contém ainda não saiu', async () => {
    expect(await primeiraRevisao(tagsPublicadas(linhas), '2026-10-28T12:00:00Z', contemDesde('2.374.12'))).toBeNull();
    expect(await primeiraRevisao([], '2026-10-28T12:00:00Z', contemDesde('1.0.0'))).toBeNull();
  });

  it('faz poucas consultas (busca binária) e ignora tags de antes do merge', async () => {
    const muitas = Array.from({ length: 64 }, (_, i) => ({ NNUMETAG: `3.${i}.0`, CREVIUPDAT: String(41000 + i), DDATATAG: new Date(Date.UTC(2026, 0, 1 + i)).toISOString() }));
    let chamadas = 0;
    const r = await primeiraRevisao(tagsPublicadas(muitas), '2026-01-01T00:00:00Z', async (tag) => {
      chamadas++;
      return comparaTags(tag, '3.40.0') >= 0;
    });
    expect(r).toEqual({ revisao: 41040, tag: '3.40.0' });
    expect(chamadas <= 8).toBe(true);
    const tarde = await primeiraRevisao(tagsPublicadas(muitas), '2026-03-01T00:00:00Z', async (tag) => comparaTags(tag, '3.60.0') >= 0);
    expect(tarde!.tag).toBe('3.60.0');
  });
});

describe('última revision publicada', () => {
  it('devolve a maior revision das linhas e zero quando não há nenhuma', () => {
    expect(ultimaRevisao(linhas)).toBe(40127);
    expect(ultimaRevisao([])).toBe(0);
    expect(ultimaRevisao([{ CREVIUPDAT: 'x' }])).toBe(0);
  });
});
