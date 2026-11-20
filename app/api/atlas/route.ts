import { NextResponse } from 'next/server';
import { exigeGit, ErroGithub } from '../_servidor';
import { permite } from '../_limite';
import { ErroAtlas, lerBlocoGit, mapaGit, novidadesGit, repositoriosGit } from './github';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const resposta = (dados: unknown, status = 200) => NextResponse.json(dados, { status, headers: { 'Cache-Control': 'private, no-store' } });
function falha(e: unknown) {
    if (e instanceof ErroAtlas)
        return resposta({ erro: e.message, retomarEm: e.retomarEm }, e.status);
    if (e instanceof ErroGithub)
        return resposta({ erro: e.message, retomarEm: e.retomarEm }, e.status);
    return resposta({ erro: 'Não foi possível consultar o Git agora. As descobertas já carregadas foram preservadas.' }, 503);
}
export async function GET(req: Request) {
    const acesso = await exigeGit(req);
    if (!acesso.ok)
        return resposta({ erro: acesso.erro, acessoNegado: acesso.status === 401 || acesso.status === 403 }, acesso.status);
    if (!permite(`atlas-get:${acesso.email}`, 90, 60000))
        return resposta({ erro: 'Aguarde um minuto antes de consultar novamente.' }, 429);
    const params = new URL(req.url).searchParams;
    try {
        switch (params.get('modo') ?? 'catalogo') {
            case 'catalogo': return resposta(await mapaGit(acesso.token));
            case 'repos': return resposta(await repositoriosGit(acesso.token));
            case 'novidades': return resposta(await novidadesGit(params.get('repo') ?? '', acesso.token));
            default: return resposta({ erro: 'Consulta inválida.' }, 400);
        }
    }
    catch (e) {
        return falha(e);
    }
}
// Cada chamada termina um bloco. A próxima usa um cursor assinado, inclusive em outra instância da Vercel.
export async function POST(req: Request) {
    const acesso = await exigeGit(req);
    if (!acesso.ok)
        return resposta({ erro: acesso.erro, acessoNegado: acesso.status === 401 || acesso.status === 403 }, acesso.status);
    if (!permite(`atlas-read:${acesso.email}`, 90, 60000))
        return resposta({ erro: 'A leitura será retomada em um minuto.', retomarEm: new Date(Date.now() + 60000).toISOString() }, 429);
    let body: {
        repo?: unknown;
        cursor?: unknown;
    };
    try {
        const texto = await req.text();
        if (texto.length > 5000)
            return resposta({ erro: 'Pedido de leitura muito grande.' }, 400);
        body = JSON.parse(texto);
        if (!body || typeof body.repo !== 'string' || (body.cursor !== undefined && typeof body.cursor !== 'string'))
            throw new Error();
    }
    catch {
        return resposta({ erro: 'Informe o repositório para leitura no Git.' }, 400);
    }
    try {
        return resposta(await lerBlocoGit(body.repo as string, body.cursor as string | undefined, acesso.token));
    }
    catch (e) {
        return falha(e);
    }
}
