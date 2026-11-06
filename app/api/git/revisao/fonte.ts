import { tagsPublicadas, ultimaRevisao, type TagPublicada } from './busca';

const API_REVISAO = process.env.QUALIDADE_API_REVISAO ?? 'https://desenv.solus.inf.br/qld/jenkins/api/tag/revisao';
const REPOS_ULTIMA = (process.env.REVISAO_REPOS ?? 'banco,contas,ptu,crm,guias,ans,estoque,financ,tiss')
  .split(',')
  .map((r) => r.trim())
  .filter(Boolean);

export interface TagsDoRepo {
  tags: TagPublicada[];
  ultima: number;
}

const cache = new Map<string, { em: number; dados: TagsDoRepo }>();

export async function tagsDoRepo(repo: string): Promise<TagsDoRepo> {
  const guardado = cache.get(repo);
  if (guardado && Date.now() - guardado.em < 10 * 60 * 1000) return guardado.dados;
  const r = await fetch(`${API_REVISAO}?column=CNOMEREPO&value=${encodeURIComponent(repo)}`, { signal: AbortSignal.timeout(25000), cache: 'no-store' });
  if (!r.ok) throw new Error('API de revisions indisponível');
  const j = (await r.json()) as { NNUMETAG: string; CREVIUPDAT: string; DDATATAG?: string }[];
  const linhas = Array.isArray(j) ? j : [];
  const dados = { tags: tagsPublicadas(linhas), ultima: ultimaRevisao(linhas) };
  cache.set(repo, { em: Date.now(), dados });
  return dados;
}

export async function ultimaRevisaoGlobal(): Promise<number | null> {
  const resultados = await Promise.all(REPOS_ULTIMA.map((r) => tagsDoRepo(r).then((d) => d.ultima).catch(() => 0)));
  const maior = Math.max(0, ...resultados);
  return maior > 0 ? maior : null;
}
