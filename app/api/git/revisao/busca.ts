// Descobre em qual revision uma correção saiu, a partir das tags publicadas em cada revision (API da Qualidade).
// Lógica pura: a pergunta "esta tag contém o commit?" é injetada, para testar sem rede.

export interface TagPublicada {
  tag: string; // ex.: 2.357.7
  revisao: number; // ex.: 40127
  data: string; // ISO da publicação da revision
}

const versao = (t: string) => t.split('.').map(Number);
export const comparaTags = (a: string, b: string) => {
  const x = versao(a);
  const y = versao(b);
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
};

// Linhas da API (NNUMETAG, CREVIUPDAT, DDATATAG) -> uma tag por versão, com a menor revision em que ela apareceu.
export function tagsPublicadas(linhas: { NNUMETAG: string; CREVIUPDAT: string | number; DDATATAG?: string }[]): TagPublicada[] {
  const porTag = new Map<string, TagPublicada>();
  for (const l of linhas) {
    const revisao = Number(l.CREVIUPDAT);
    if (!/^\d+\.\d+\.\d+$/.test(l.NNUMETAG) || !revisao) continue;
    const atual = porTag.get(l.NNUMETAG);
    if (!atual || revisao < atual.revisao) porTag.set(l.NNUMETAG, { tag: l.NNUMETAG, revisao, data: l.DDATATAG ?? '' });
  }
  return [...porTag.values()].sort((a, b) => comparaTags(a.tag, b.tag));
}

export interface Achado {
  revisao: number;
  tag: string;
}

// Menor tag publicada que contém o commit (busca binária: quem contém o commit também é contido pelas tags seguintes).
// Retorna null se nenhuma tag publicada o contém (a correção ainda não saiu em uma revision).
export async function primeiraRevisao(tags: TagPublicada[], mescladoEm: string, contem: (tag: string) => Promise<boolean>): Promise<Achado | null> {
  const corte = mescladoEm ? new Date(new Date(mescladoEm).getTime() - 86400000).toISOString() : '';
  // só vale olhar tags publicadas a partir do dia anterior ao merge
  const candidatas = tags.filter((t) => !corte || !t.data || t.data >= corte);
  if (!candidatas.length) return null;
  if (!(await contem(candidatas[candidatas.length - 1].tag))) return null;
  let lo = 0;
  let hi = candidatas.length - 1;
  while (lo < hi) {
    const meio = Math.floor((lo + hi) / 2);
    if (await contem(candidatas[meio].tag)) hi = meio;
    else lo = meio + 1;
  }
  return { revisao: candidatas[lo].revisao, tag: candidatas[lo].tag };
}
