import { NextResponse } from 'next/server';
import { chamadoDoTitulo } from '../../../chamados/github';
import { permite } from '../../_limite';
import { ErroGithub, exigeGit, githubGet } from '../../_servidor';
import { termosParaGithub } from './consulta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ORG = process.env.GITHUB_ORG ?? 'solussaude';

interface ItemBusca {
  number: number;
  title: string;
  state: string;
  html_url: string;
  repository_url: string;
  updated_at: string;
  user?: { login?: string };
  pull_request?: { merged_at?: string | null };
}

export async function GET(req: Request) {
  const acesso = await exigeGit(req);
  if (!acesso.ok) return NextResponse.json({ erro: acesso.erro }, { status: acesso.status });
  const termos = termosParaGithub(new URL(req.url).searchParams.get('q') ?? '');
  if (termos.join('').length < 3) return NextResponse.json({ erro: 'Digite ao menos 3 caracteres para buscar no GitHub.' }, { status: 400 });
  if (!permite(`busca-git:${acesso.email}`, 15, 60_000)) return NextResponse.json({ erro: 'Muitas buscas no GitHub. Aguarde um minuto.' }, { status: 429 });

  try {
    const q = `${termos.join(' ')} org:${ORG} is:pr`;
    const r = await githubGet<{ total_count: number; items: ItemBusca[] }>(`/search/issues?${new URLSearchParams({ q, sort: 'updated', order: 'desc', per_page: '30' })}`, acesso.token);
    return NextResponse.json({
      total: r.total_count,
      prs: (r.items ?? []).map((i) => ({
        repo: i.repository_url.split('/').pop() ?? '',
        numero: i.number,
        titulo: i.title,
        estado: i.pull_request?.merged_at ? 'mesclado' : i.state === 'open' ? 'aberto' : 'fechado',
        autor: i.user?.login ?? '',
        atualizadoEm: i.updated_at,
        url: i.html_url,
        chamado: chamadoDoTitulo(i.title) ?? '',
      })),
    });
  } catch (e) {
    const status = e instanceof ErroGithub ? e.status : 502;
    return NextResponse.json({ erro: e instanceof Error ? e.message : 'Não foi possível buscar no GitHub.' }, { status });
  }
}
