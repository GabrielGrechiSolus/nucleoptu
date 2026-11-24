import { NextResponse } from 'next/server';
import { permite } from '../../_limite';
import { ErroGithub, dadosDoPerfil, githubGet, githubToken, verificaFirebase } from '../../_servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ORG = process.env.GITHUB_ORG ?? 'solussaude';

interface ItemCommit {
  sha: string;
  html_url: string;
  repository: { name: string };
  commit: { message: string; author?: { date?: string } | null };
}

// Lista commits recentes do login Git já vinculado ao próprio perfil.
export async function GET(req: Request) {
  const acesso = await verificaFirebase(req);
  if (!acesso.ok) return NextResponse.json({ erro: acesso.motivo }, { status: 401 });
  if (!permite(`commits:${acesso.uid}`, 30, 60_000)) return NextResponse.json({ erro: 'Muitas consultas seguidas. Aguarde um minuto.' }, { status: 429 });

  const perfil = await dadosDoPerfil(acesso.uid ?? '', acesso.token ?? '');
  if (!perfil.ok) return NextResponse.json({ erro: 'Não foi possível confirmar o Git vinculado ao seu perfil.' }, { status: 503 });
  if (perfil.tipo === 'sustentacao') return NextResponse.json({ erro: 'O perfil Sustentação não tem acesso ao Git.' }, { status: 403 });

  const login = (new URL(req.url).searchParams.get('login') ?? '').trim().replace(/^@/, '');
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(login)) return NextResponse.json({ erro: 'Informe um usuário do GitHub válido.' }, { status: 400 });
  if (!perfil.gitUser || perfil.gitUser.toLowerCase() !== login.toLowerCase()) return NextResponse.json({ erro: 'O usuário consultado não corresponde ao Git vinculado ao seu perfil.' }, { status: 403 });

  const token = await githubToken();
  if (!token) return NextResponse.json({ erro: 'O servidor não tem acesso ao GitHub.' }, { status: 503 });
  const corte = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const termo = `author:${login} org:${ORG} committer-date:>=${corte}`;

  try {
    const r = await githubGet<{ items: ItemCommit[]; total_count: number }>(`/search/commits?q=${encodeURIComponent(termo)}&sort=committer-date&order=desc&per_page=100`, token);
    const commits = r.items.map((c) => ({
      id: `${c.repository.name}:${c.sha}`,
      repo: c.repository.name,
      sha: c.sha,
      mensagem: c.commit.message.split('\n')[0].slice(0, 300),
      url: c.html_url,
      em: c.commit.author?.date ?? '',
    }));
    return NextResponse.json({ commits, total: r.total_count, dias: 30, geradoEm: new Date().toISOString() });
  } catch (e) {
    if (e instanceof ErroGithub) return NextResponse.json({ erro: e.message }, { status: e.status === 404 ? 404 : 502 });
    return NextResponse.json({ erro: 'Não foi possível consultar os commits do GitHub.' }, { status: 502 });
  }
}
