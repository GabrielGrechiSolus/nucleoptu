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

export interface FalhaRepoRevision {
  repo: string;
  erro: string;
}

const cache = new Map<string, { em: number; dados: TagsDoRepo }>();

export async function tagsDoRepo(repo: string): Promise<TagsDoRepo> {
  const guardado = cache.get(repo);
  if (guardado && Date.now() - guardado.em < 10 * 60 * 1000) return guardado.dados;
  const r = await fetch(`${API_REVISAO}?column=CNOMEREPO&value=${encodeURIComponent(repo)}`, { signal: AbortSignal.timeout(25000), cache: 'no-store' });
  if (!r.ok) throw new Error('API de revisions indisponível');
  const corpo = await r.text();
  if (!corpo.trim()) throw new Error(`API de revisions retornou resposta vazia para ${repo}.`);
  let j: unknown;
  try {
    j = JSON.parse(corpo);
  } catch {
    throw new Error(`API de revisions retornou JSON inválido para ${repo}.`);
  }
  if (!Array.isArray(j)) throw new Error(`API de revisions retornou formato inesperado para ${repo}.`);
  const linhas = j as { NNUMETAG: string; CREVIUPDAT: string; DDATATAG?: string }[];
  const dados = { tags: tagsPublicadas(linhas), ultima: ultimaRevisao(linhas) };
  cache.set(repo, { em: Date.now(), dados });
  return dados;
}

export async function ultimaRevisaoGlobal(): Promise<number | null> {
  const resultados = await Promise.all(REPOS_ULTIMA.map((r) => tagsDoRepo(r).then((d) => d.ultima).catch(() => 0)));
  const maior = Math.max(0, ...resultados);
  return maior > 0 ? maior : null;
}

export async function revisoesPublicadas() {
  const resultados = await Promise.all(REPOS_ULTIMA.map(async (repo) => {
    try {
      const dados = await tagsDoRepo(repo);
      return { tags: dados.tags.map((tag) => ({ ...tag, repo })), falha: null as FalhaRepoRevision | null };
    } catch (e) {
      return { tags: [], falha: { repo, erro: e instanceof Error ? e.message : 'Falha ao consultar a API da Qualidade.' } as FalhaRepoRevision };
    }
  }));
  const porRevisao = new Map<number, { numero: number; tags: { repo: string; tag: string; data: string }[] }>();
  for (const tag of resultados.flatMap((resultado) => resultado.tags)) {
    const item = porRevisao.get(tag.revisao) ?? { numero: tag.revisao, tags: [] };
    item.tags.push({ repo: tag.repo, tag: tag.tag, data: tag.data });
    porRevisao.set(tag.revisao, item);
  }
  const revisoes = [...porRevisao.values()].sort((a, b) => b.numero - a.numero);
  const falhas = resultados.flatMap((resultado) => resultado.falha ? [resultado.falha] : []);
  return { ultima: revisoes[0]?.numero ?? null, revisoes, falhas, reposConsultados: resultados.length - falhas.length };
}
