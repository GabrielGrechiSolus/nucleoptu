import { NextResponse } from 'next/server';
import { ErroGithub, exigeGit, githubGet } from '../../_servidor';
import { primeiraRevisao } from './busca';
import { tagsDoRepo } from './fonte';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ORG = process.env.GITHUB_ORG ?? 'solussaude';
const MAX_PRS = 80;
const PARALELO = 3;

export interface ResultadoRevisao {
  revisao: number | null;
  tag?: string;
  motivo?: string;
  ultima?: number;
}

async function revisaoDoPr(repo: string, numero: number, token: string): Promise<ResultadoRevisao> {
  try {
    const { tags, ultima } = await tagsDoRepo(repo);
    if (!tags.length) return { revisao: null, motivo: 'Repositório sem revisions na API da Qualidade.' };
    const pr = await githubGet<{ merged_at: string | null; merge_commit_sha: string | null }>(`/repos/${ORG}/${repo}/pulls/${numero}`, token);
    if (!pr.merged_at || !pr.merge_commit_sha) return { revisao: null, motivo: 'PR ainda não mesclado.' };
    const sha = pr.merge_commit_sha;
    const achado = await primeiraRevisao(tags, pr.merged_at, async (tag) => {
      try {
        // a tag contém o commit quando ela está à frente dele (ou é o próprio commit)
        const c = await githubGet<{ status: string }>(`/repos/${ORG}/${repo}/compare/${sha}...${encodeURIComponent(tag)}?per_page=1`, token);
        return c.status === 'ahead' || c.status === 'identical';
      } catch (e) {
        if (e instanceof ErroGithub && e.status === 404) return false; // tag que não existe no GitHub
        throw e;
      }
    });
    return achado ? { revisao: achado.revisao, tag: achado.tag } : { revisao: null, motivo: 'Ainda não saiu em nenhuma revision.', ultima };
  } catch (e) {
    return { revisao: null, motivo: e instanceof Error ? e.message : 'Não foi possível consultar a revision.' };
  }
}

// Para cada PR mesclado informado, devolve a revision em que ele saiu (a menor revision cuja tag publicada contém o PR).
export async function POST(req: Request) {
  const g = await exigeGit(req);
  if (!g.ok) return NextResponse.json({ erro: g.erro }, { status: g.status });

  let prs: { repo: string; numero: number }[] = [];
  try {
    prs = ((await req.json()) as { prs?: { repo: string; numero: number }[] }).prs ?? [];
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 });
  }
  prs = prs.filter((p) => /^[\w.-]{1,100}$/.test(String(p?.repo)) && Number.isInteger(p?.numero) && p.numero > 0);
  if (!prs.length || prs.length > MAX_PRS) return NextResponse.json({ erro: `Informe de 1 a ${MAX_PRS} PRs.` }, { status: 400 });

  const resultados: Record<string, ResultadoRevisao> = {};
  for (let i = 0; i < prs.length; i += PARALELO) {
    await Promise.all(
      prs.slice(i, i + PARALELO).map(async (p) => {
        resultados[`${p.repo}#${p.numero}`] = await revisaoDoPr(p.repo, p.numero, g.token);
      }),
    );
  }
  return NextResponse.json({ resultados });
}
