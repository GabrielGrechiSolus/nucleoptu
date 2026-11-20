import { NextResponse } from 'next/server';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { exigeGit, githubGet, ErroGithub } from '../_servidor';
import { permite } from '../_limite';
import type { CatalogoAtlas, NovidadeAtlas, RepoGitAtlas } from '../../atlas/modelo';
import { filtrarRegras } from '../../atlas/modelo';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const ORG = process.env.GITHUB_ORG ?? 'solussaude';
const arquivo = path.join(process.cwd(), 'data', 'atlas.json');
const exec = promisify(execFile);
let indexando: Promise<void> | null = null;
let erroIndexacao = '';
let ultimoCatalogo: {
    mtime: number;
    dados: CatalogoAtlas;
} | null = null;
const cache = new Map<string, {
    em: number;
    dados: unknown;
}>();
const resposta = (dados: unknown, status = 200) => NextResponse.json(dados, { status, headers: { 'Cache-Control': 'private, no-store' } });
async function catalogo(): Promise<CatalogoAtlas> {
    const info = await stat(arquivo);
    if (ultimoCatalogo?.mtime === info.mtimeMs)
        return ultimoCatalogo.dados;
    const dados = JSON.parse(await readFile(arquivo, 'utf8')) as CatalogoAtlas;
    ultimoCatalogo = { mtime: info.mtimeMs, dados };
    return dados;
}
const resumo = (dados: CatalogoAtlas) => ({ ...dados, regras: [], totalRegras: dados.regras.length, indexacaoDisponivel: !!process.env.ATLAS_WORKSPACE_ROOT, indexando: !!indexando, erroIndexacao });
type RepoGit = {
    name: string;
    description: string | null;
    pushed_at: string;
    default_branch: string;
    html_url: string;
    archived: boolean;
};
export async function GET(req: Request) {
    const acesso = await exigeGit(req);
    if (!acesso.ok)
        return resposta({ erro: acesso.erro }, acesso.status);
    const params = new URL(req.url).searchParams;
    const modo = params.get('modo') ?? 'catalogo';
    try {
        if (modo === 'catalogo')
            return resposta(resumo(await catalogo()));
        if (modo === 'regras') {
            const dados = await catalogo();
            const area = params.get('area') ?? '';
            const pagina = Math.max(1, Math.min(100000, Number(params.get('pagina')) || 1));
            const regras = filtrarRegras(dados.regras, (params.get('busca') ?? '').slice(0, 180), params.get('repo') ?? '', params.get('categoria') ?? '').filter((r) => !area || dados.repos.find((p) => p.id === r.repo)?.dominio === area);
            return resposta({ regras: regras.slice((pagina - 1) * 12, pagina * 12), total: regras.length });
        }
        const repo = params.get('repo') ?? '';
        if (modo !== 'repos' && modo !== 'novidades')
            return resposta({ erro: 'Consulta inválida.' }, 400);
        if (modo === 'novidades' && !/^[\w.-]{1,100}$/.test(repo))
            return resposta({ erro: 'Repositório inválido.' }, 400);
        const chave = `${createHash('sha256').update(acesso.token).digest('hex')}:${modo}:${repo}`;
        const salvo = cache.get(chave);
        if (salvo && Date.now() - salvo.em < 5 * 60000)
            return resposta(salvo.dados);
        if (!permite(`atlas:${acesso.email}`, 40, 60000))
            return resposta({ erro: 'Aguarde um minuto antes de consultar novamente.' }, 429);
        let dados: unknown;
        if (modo === 'repos') {
            const repos: RepoGitAtlas[] = [];
            let completo = false;
            for (let pagina = 1; pagina <= 50; pagina++) {
                const lote = await githubGet<RepoGit[]>(`/orgs/${ORG}/repos?type=all&per_page=100&page=${pagina}`, acesso.token);
                repos.push(...lote.map((r) => ({ nome: r.name, descricao: r.description ?? '', atualizadoEm: r.pushed_at, branch: r.default_branch, url: r.html_url, arquivado: r.archived })));
                if (lote.length < 100) {
                    completo = true;
                    break;
                }
            }
            dados = { repos, completo, consultadoEm: new Date().toISOString() };
        }
        else {
            const local = (await catalogo()).repos.find((r) => r.id === repo);
            const ref = local?.branch && local.branch !== 'HEAD' ? `&sha=${encodeURIComponent(local.branch)}` : '';
            const [commits, prs] = await Promise.all([
                githubGet<{
                    sha: string;
                    html_url: string;
                    commit: {
                        message: string;
                        committer: {
                            date: string;
                        };
                    };
                }[]>(`/repos/${ORG}/${repo}/commits?per_page=5${ref}`, acesso.token),
                githubGet<{
                    title: string;
                    html_url: string;
                    merged_at: string | null;
                }[]>(`/repos/${ORG}/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=20`, acesso.token),
            ]);
            const novidades: NovidadeAtlas[] = [
                ...commits.map((c) => ({ titulo: c.commit.message.split('\n')[0], url: c.html_url, data: c.commit.committer.date, tipo: 'commit' as const, sha: c.sha })),
                ...prs.filter((p) => p.merged_at).slice(0, 5).map((p) => ({ titulo: p.title, url: p.html_url, data: p.merged_at!, tipo: 'pr' as const })),
            ].sort((a, b) => b.data.localeCompare(a.data));
            dados = { novidades, consultadoEm: new Date().toISOString(), branch: local?.branch ?? '', divergente: !!local && !!commits.length && commits[0].sha !== local.sha };
        }
        if (cache.size > 200)
            cache.clear();
        cache.set(chave, { em: Date.now(), dados });
        return resposta(dados);
    }
    catch (e) {
        if (e instanceof ErroGithub)
            return resposta({ erro: e.message }, e.status);
        return resposta({ erro: modo === 'catalogo' ? 'O mapa ainda não foi indexado. Solicite a leitura dos repositórios no servidor.' : 'Não foi possível consultar as novidades. O mapa salvo continua disponível.' }, 503);
    }
}
// Uma única leitura por servidor; sem caminhos ou comandos recebidos do navegador.
export async function POST(req: Request) {
    const acesso = await exigeGit(req);
    if (!acesso.ok)
        return resposta({ erro: acesso.erro }, acesso.status);
    if (!permite(`atlas-index:${acesso.email}`, 2, 10 * 60000))
        return resposta({ erro: 'A leitura do código está limitada a duas solicitações a cada dez minutos.' }, 429);
    if (!process.env.ATLAS_WORKSPACE_ROOT)
        return resposta({ erro: 'A leitura automática precisa dos checkouts no servidor e de ATLAS_WORKSPACE_ROOT. O mapa salvo e as novidades do Git continuam disponíveis.' }, 409);
    try {
        await stat(process.env.ATLAS_WORKSPACE_ROOT);
        if (!indexando) {
            erroIndexacao = '';
            indexando = exec(process.env.ATLAS_PYTHON ?? 'python', [path.join(process.cwd(), 'scripts', 'index-atlas.py'), '--root', process.env.ATLAS_WORKSPACE_ROOT, '--output', arquivo], { timeout: 15 * 60_000, windowsHide: true, maxBuffer: 1024 * 1024 })
                .then(() => { cache.clear(); })
                .catch(() => { erroIndexacao = 'A releitura não foi concluída. O mapa anterior foi preservado; confira os checkouts e o Python do servidor.'; })
                .finally(() => { indexando = null; });
        }
        // A leitura de todos os fontes pode levar minutos. Não prende a navegação a uma requisição longa.
        return resposta(resumo(await catalogo()), 202);
    }
    catch {
        return resposta({ erro: 'Não foi possível concluir a leitura do código. O mapa anterior foi preservado. Confira os checkouts e o Python no servidor.' }, 503);
    }
}
