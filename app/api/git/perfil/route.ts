import { NextResponse } from 'next/server';
import { ErroGithub, githubGet, githubToken, origemPermitida, tipoDePerfil, verificaFirebase } from '../../_servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ORG = process.env.GITHUB_ORG ?? 'solussaude';
const POR_PAGINA = 100;
const MAX_PAGINAS = 3;

interface Item {
  number: number;
  title: string;
  body?: string | null;
  state: string;
  draft?: boolean;
  html_url: string;
  repository_url: string;
  created_at: string;
  closed_at: string | null;
  pull_request?: { merged_at?: string | null };
}

interface Busca {
  total_count: number;
  items: Item[];
}

export interface PrGithub {
  repo: string;
  numero: number;
  titulo: string;
  url: string;
  criadoEm: string;
  fechadoEm: string;
  mescladoEm: string;
  estado: 'aberto' | 'mesclado' | 'fechado';
  corpo: string;
  rascunho: boolean;
}

async function buscaPrs(termo: string, token: string) {
  const prs: PrGithub[] = [];
  let total = 0;
  for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
    const r = await githubGet<Busca>(`/search/issues?q=${encodeURIComponent(termo)}&sort=updated&order=desc&per_page=${POR_PAGINA}&page=${pagina}`, token);
    total = r.total_count;
    for (const i of r.items) {
      const mesclado = i.pull_request?.merged_at ?? '';
      prs.push({
        repo: i.repository_url.split('/').pop() ?? '',
        numero: i.number,
        titulo: i.title,
        url: i.html_url,
        criadoEm: i.created_at,
        fechadoEm: i.closed_at ?? '',
        mescladoEm: mesclado,
        estado: i.state === 'open' ? 'aberto' : mesclado ? 'mesclado' : 'fechado',
        corpo: (i.body ?? '').slice(0, 8000),
        rascunho: !!i.draft,
      });
    }
    if (r.items.length < POR_PAGINA) break;
  }
  return { prs, truncado: total > prs.length };
}

// Dados do usuário no GitHub e seus PRs da organização, separados em abertos e fechados (mesclados ou não).
export async function GET(req: Request) {
  const origem = origemPermitida(req);
  if (!origem.ok) return NextResponse.json({ erro: origem.motivo }, { status: 403 });
  const login_ = await verificaFirebase(req);
  if (!login_.ok) return NextResponse.json({ erro: login_.motivo }, { status: 401 });

  // Perfil Sustentação não tem acesso ao Git. Sem conseguir confirmar o perfil, nega (fail closed).
  const perfil = await tipoDePerfil(login_.uid ?? '', login_.token ?? '');
  if (!perfil.ok) return NextResponse.json({ erro: 'Não foi possível confirmar o seu perfil agora. Tente novamente.' }, { status: 503 });
  if (perfil.tipo === 'sustentacao') return NextResponse.json({ erro: 'O perfil Sustentação não tem acesso ao Git.' }, { status: 403 });

  const params = new URL(req.url).searchParams;
  const login = (params.get('login') ?? '').trim().replace(/^@/, '');
  if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(login)) return NextResponse.json({ erro: 'Informe um usuário do GitHub válido.' }, { status: 400 });
  const dias = Math.max(0, Math.min(3650, Number(params.get('dias') ?? 60) || 0)); // 0 = todos

  const token = await githubToken();
  if (!token) return NextResponse.json({ erro: 'O servidor não tem acesso ao GitHub. Configure GITHUB_TOKEN no .env.local ou entre com `gh auth login` na máquina do servidor.' }, { status: 503 });

  try {
    const u = await githubGet<{ login: string; name: string | null; avatar_url: string; html_url: string; public_repos: number; followers: number }>(`/users/${login}`, token);
    const corte = dias ? new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10) : '';
    const base = `author:${u.login} org:${ORG} is:pr`;
    const [abertos, fechados] = await Promise.all([
      buscaPrs(`${base} is:open`, token),
      buscaPrs(`${base} is:closed${corte ? ` closed:>=${corte}` : ''}`, token),
    ]);
    return NextResponse.json({
      usuario: { login: u.login, nome: u.name ?? '', avatar: u.avatar_url, url: u.html_url, repositorios: u.public_repos, seguidores: u.followers },
      abertos: abertos.prs,
      fechados: fechados.prs,
      truncado: abertos.truncado || fechados.truncado,
      dias,
      geradoEm: new Date().toISOString(),
    });
  } catch (e) {
    if (e instanceof ErroGithub) return NextResponse.json({ erro: e.message }, { status: e.status === 404 ? 404 : 502 });
    return NextResponse.json({ erro: 'Não foi possível consultar o GitHub.' }, { status: 502 });
  }
}
