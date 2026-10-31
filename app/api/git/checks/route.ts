import { NextResponse } from 'next/server';
import { ErroGithub, exigeGit, githubGet } from '../../_servidor';
import { resumoDeChecks, type ExecucaoCheck, type ResumoChecks, type StatusLegado } from './resumo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ORG = process.env.GITHUB_ORG ?? 'solussaude';
const MAX_PRS = 20;

async function checksDoPr(repo: string, numero: number, token: string): Promise<ResumoChecks & { erro?: string }> {
  try {
    const pr = await githubGet<{ head: { sha: string } }>(`/repos/${ORG}/${repo}/pulls/${numero}`, token);
    const sha = pr.head.sha;
    const [runs, status] = await Promise.all([
      githubGet<{ check_runs: ExecucaoCheck[] }>(`/repos/${ORG}/${repo}/commits/${sha}/check-runs?per_page=100`, token),
      githubGet<{ statuses: StatusLegado[] }>(`/repos/${ORG}/${repo}/commits/${sha}/status`, token).catch(() => ({ statuses: [] as StatusLegado[] })),
    ]);
    return resumoDeChecks(runs.check_runs ?? [], status.statuses ?? []);
  } catch (e) {
    return { estado: 'sem-checks', total: 0, falhas: [], pendentes: [], erro: e instanceof ErroGithub ? e.message : 'Não foi possível consultar os checks.' };
  }
}

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
  const resultados: Record<string, ResumoChecks & { erro?: string }> = {};
  await Promise.all(prs.map(async (p) => (resultados[`${p.repo}#${p.numero}`] = await checksDoPr(p.repo, p.numero, g.token))));
  return NextResponse.json({ resultados });
}
