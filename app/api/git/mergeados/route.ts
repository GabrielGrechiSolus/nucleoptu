import { NextResponse } from 'next/server';
import { permite } from '../../_limite';
import { ErroGithub, githubGet, githubToken, tipoDePerfil, verificaFirebase } from '../../_servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ORG = process.env.GITHUB_ORG ?? 'solussaude';

interface Item {
  number: number;
  title: string;
  html_url: string;
  repository_url: string;
  pull_request?: { merged_at?: string | null };
}

// PRs da pessoa já mergeados nos últimos dias (uma única consulta ao GitHub), para a notificação de merge.
export async function GET(req: Request) {
  const acesso = await verificaFirebase(req);
  if (!acesso.ok) return NextResponse.json({ erro: acesso.motivo }, { status: 401 });
  if (!permite(`mergeados:${acesso.email}`, 30, 60_000)) return NextResponse.json({ erro: 'Muitas consultas seguidas. Aguarde um minuto.' }, { status: 429 });

  const perfil = await tipoDePerfil(acesso.uid ?? '', acesso.token ?? '');
  if (!perfil.ok) return NextResponse.json({ erro: 'Não foi possível confirmar o seu perfil agora. Tente novamente.' }, { status: 503 });
  if (perfil.tipo === 'sustentacao') return NextResponse.json({ erro: 'O perfil Sustentação não tem acesso ao Git.' }, { status: 403 });

  const params = new URL(req.url).searchParams;
  const login = (params.get('login') ?? '').trim().replace(/^@/, '');
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(login)) return NextResponse.json({ erro: 'Informe um usuário do GitHub válido.' }, { status: 400 });
  const dias = Math.max(1, Math.min(60, Number(params.get('dias') ?? 14) || 14));

  const token = await githubToken();
  if (!token) return NextResponse.json({ erro: 'O servidor não tem acesso ao GitHub.' }, { status: 503 });

  try {
    const corte = new Date(Date.now() - dias * 86_400_000).toISOString().slice(0, 10);
    const q = `author:${login} org:${ORG} is:pr is:merged merged:>=${corte}`;
    const r = await githubGet<{ items: Item[] }>(`/search/issues?q=${encodeURIComponent(q)}&sort=updated&order=desc&per_page=50`, token);
    const prs = r.items
      .map((i) => ({ repo: i.repository_url.split('/').pop() ?? '', numero: i.number, titulo: i.title, url: i.html_url, mescladoEm: i.pull_request?.merged_at ?? '' }))
      .filter((p) => p.mescladoEm);
    return NextResponse.json({ prs, dias, geradoEm: new Date().toISOString() });
  } catch (e) {
    if (e instanceof ErroGithub) return NextResponse.json({ erro: e.message }, { status: e.status === 404 ? 404 : 502 });
    return NextResponse.json({ erro: 'Não foi possível consultar o GitHub.' }, { status: 502 });
  }
}
