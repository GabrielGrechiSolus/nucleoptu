import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { ErroGithub, githubGet } from '../_servidor';
import { arquivoElegivel, catalogoDoGit, extrairArquivo, VERSAO_EXTRACAO } from '../../atlas/extracao';
import type { BlocoAtlas, RepoGitAtlas } from '../../atlas/modelo';
const ORG = process.env.GITHUB_ORG ?? 'solussaude';
type ItemArvore = {
    path: string;
    sha: string;
    type: string;
    mode: string;
    size?: number;
};
type Arvore = {
    tree: ItemArvore[];
    truncated: boolean;
};
type Cursor = {
    v: number;
    repo: string;
    sha: string;
    tree: string;
    branch: string;
    inicio: number;
    expira: number;
};
type MetaRepo = {
    name: string;
    description: string | null;
    pushed_at: string;
    default_branch: string;
    html_url: string;
    archived: boolean;
};
export class ErroAtlas extends Error {
    constructor(message: string, public status = 503, public retomarEm?: string) { super(message); }
}
const cache = new Map<string, {
    expira: number;
    dados: unknown;
    bytes: number;
}>();
let tamanhoCache = 0;
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
function guardar(chave: string, dados: unknown, ttl: number) {
    const bytes = Buffer.byteLength(JSON.stringify(dados));
    if (bytes > 16000000)
        return;
    const anterior = cache.get(chave);
    if (anterior) {
        tamanhoCache -= anterior.bytes;
        cache.delete(chave);
    }
    while (tamanhoCache + bytes > 48000000 && cache.size) {
        const key = cache.keys().next().value!;
        tamanhoCache -= cache.get(key)!.bytes;
        cache.delete(key);
    }
    cache.set(chave, { expira: Date.now() + ttl, dados, bytes });
    tamanhoCache += bytes;
}
async function lembrar<T>(chave: string, ler: () => Promise<T>, ttl = 5 * 60000): Promise<T> {
    const salvo = cache.get(chave);
    if (salvo && salvo.expira > Date.now())
        return salvo.dados as T;
    const dados = await ler();
    guardar(chave, dados, ttl);
    return dados;
}
export const nomeValido = (nome: string) => /^[\w.-]{1,100}$/.test(nome) && nome !== '.' && nome !== '..';
export async function repositoriosGit(token: string) {
    return lembrar(`${hash(token)}:repos`, async () => {
        const repos: RepoGitAtlas[] = [];
        for (let pagina = 1; pagina <= 50; pagina++) {
            const lote = await githubGet<MetaRepo[]>(`/orgs/${ORG}/repos?type=all&per_page=100&page=${pagina}`, token);
            repos.push(...lote.map((r) => ({ nome: r.name, descricao: r.description ?? '', atualizadoEm: r.pushed_at, branch: r.default_branch, url: r.html_url, arquivado: r.archived })));
            if (lote.length < 100)
                return { repos, completo: true, consultadoEm: new Date().toISOString() };
        }
        return { repos, completo: false, consultadoEm: new Date().toISOString() };
    });
}
export async function mapaGit(token: string) {
    const dados = await repositoriosGit(token);
    const mapa = catalogoDoGit(dados.repos, dados.consultadoEm);
    if (!dados.completo)
        mapa.limites = [...mapa.limites, 'A lista de repositórios atingiu o limite de paginação e pode estar incompleta.'];
    return mapa;
}
function assinatura(payload: string, token: string) {
    return createHmac('sha256', hash(`atlas-cursor:${ORG}:${token}`)).update(payload).digest();
}
export function assinarCursor(cursor: Cursor, token: string) {
    const payload = Buffer.from(JSON.stringify(cursor)).toString('base64url');
    return `${payload}.${assinatura(payload, token).toString('base64url')}`;
}
export function abrirCursor(valor: string, repo: string, token: string): Cursor {
    try {
        if (valor.length > 2500)
            throw new Error();
        const [payload, signature, extra] = valor.split('.');
        const recebido = Buffer.from(signature ?? '', 'base64url');
        const esperado = assinatura(payload ?? '', token);
        if (extra || recebido.length !== esperado.length || !timingSafeEqual(recebido, esperado))
            throw new Error();
        const c = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Cursor;
        if (c.v !== VERSAO_EXTRACAO || c.repo !== repo || !/^[a-f0-9]{40}$/.test(c.sha) || !/^[a-f0-9]{40}$/.test(c.tree) || !Number.isSafeInteger(c.inicio) || c.inicio < 0 || c.expira < Date.now() || typeof c.branch !== 'string')
            throw new Error();
        return c;
    }
    catch {
        throw new ErroAtlas('A retomada desta leitura expirou ou é inválida. Atualize o mapa para reiniciar este sistema.', 400);
    }
}
async function textosGit(repo: string, arquivos: ItemArvore[], token: string) {
    const lerBlob = async (f: ItemArvore) => {
        const blob = await githubGet<{
            content: string;
            encoding: string;
        }>(`/repos/${ORG}/${repo}/git/blobs/${f.sha}`, token);
        if (blob.encoding !== 'base64')
            throw new ErroAtlas('Formato de fonte não suportado; o bloco não foi avançado.');
        const bytes = Buffer.from(blob.content, 'base64');
        if (bytes.includes(0))
            return '';
        try {
            return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
        }
        catch {
            return new TextDecoder('windows-1252').decode(bytes);
        }
    };
    const query = `query($owner:String!,$repo:String!){repository(owner:$owner,name:$repo){${arquivos.map((f, i) => `f${i}:object(oid:"${f.sha}"){... on Blob{text isBinary byteSize}}`).join(' ')}}}`;
    let response: Response;
    try {
        response = await fetch('https://api.github.com/graphql', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'nucleoptu' }, body: JSON.stringify({ query, variables: { owner: ORG, repo } }), cache: 'no-store', signal: AbortSignal.timeout(20000) });
    }
    catch {
        throw new ErroAtlas('A leitura do Git demorou além do esperado. O progresso anterior foi preservado.');
    }
    const reset = Number(response.headers.get('x-ratelimit-reset')) * 1000;
    if (response.status === 429 || (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0'))
        throw new ErroAtlas('O Git pediu uma pausa nas consultas. A leitura será retomada automaticamente.', 429, new Date(reset > Date.now() ? reset : Date.now() + 60000).toISOString());
    const json = await response.json() as {
        data?: {
            repository?: Record<string, {
                text: string | null;
                isBinary: boolean;
                byteSize: number;
            } | null>;
        };
        errors?: {
            type?: string;
            message?: string;
        }[];
    };
    if (json.errors?.some((e) => e.type === 'RATE_LIMITED'))
        throw new ErroAtlas('O Git pediu uma pausa nas consultas. A leitura será retomada automaticamente.', 429, new Date(reset > Date.now() ? reset : Date.now() + 60000).toISOString());
    if (response.ok && !json.errors?.length && json.data?.repository) {
        return Promise.all(arquivos.map(async (f, i) => {
            const blob = json.data!.repository![`f${i}`];
            if (!blob)
                throw new ErroAtlas('Uma fonte não pôde ser lida nesta versão. Tente novamente; o bloco não foi avançado.');
            return blob.isBinary || blob.text === null ? lerBlob(f) : blob.text;
        }));
    }
    // Alguns tokens permitem Contents REST, mas restringem GraphQL. A mesma credencial continua sendo usada.
    const textos: string[] = [];
    for (let i = 0; i < arquivos.length; i += 4) {
        textos.push(...await Promise.all(arquivos.slice(i, i + 4).map(lerBlob)));
    }
    return textos;
}
export async function lerBlocoGit(repo: string, valorCursor: string | undefined, token: string): Promise<BlocoAtlas> {
    if (!nomeValido(repo))
        throw new ErroAtlas('Repositório inválido.', 400);
    const usuario = hash(token);
    let cursor: Cursor;
    if (valorCursor)
        cursor = abrirCursor(valorCursor, repo, token);
    else {
        const meta = await githubGet<{
            default_branch: string;
        }>(`/repos/${ORG}/${repo}`, token);
        const branch = meta.default_branch;
        const commit = await githubGet<{
            sha: string;
            commit: {
                tree: {
                    sha: string;
                };
            };
        }>(`/repos/${ORG}/${repo}/commits/${encodeURIComponent(branch)}`, token);
        cursor = { v: VERSAO_EXTRACAO, repo, sha: commit.sha, tree: commit.commit.tree.sha, branch, inicio: 0, expira: Date.now() + 7 * 24 * 60 * 60000 };
    }
    const arvore = await lembrar(`${usuario}:tree:${repo}:${cursor.tree}`, () => githubGet<Arvore>(`/repos/${ORG}/${repo}/git/trees/${cursor.tree}?recursive=1`, token), 30 * 60000);
    if (arvore.truncated)
        throw new ErroAtlas('O Git devolveu uma árvore incompleta deste repositório. A leitura não foi marcada como concluída; os demais sistemas continuam disponíveis.', 422);
    const todos = arvore.tree.filter((f) => f.type === 'blob');
    const elegiveis = todos.filter((f) => arquivoElegivel(f.path, f.size ?? 0, f.mode)).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    if (cursor.inicio > elegiveis.length)
        throw new ErroAtlas('Posição de leitura inválida.', 400);
    const arquivos: ItemArvore[] = [];
    let bytes = 0;
    for (const f of elegiveis.slice(cursor.inicio)) {
        if (arquivos.length >= 12 || (arquivos.length > 0 && bytes + (f.size ?? 0) > 1200000))
            break;
        arquivos.push(f);
        bytes += f.size ?? 0;
    }
    const chave = `${usuario}:bloco:${VERSAO_EXTRACAO}:${repo}:${cursor.sha}:${cursor.inicio}`;
    const resultado = await lembrar(chave, async () => {
        const textos = arquivos.length ? await textosGit(repo, arquivos, token) : [];
        const partes = arquivos.map((f, i) => extrairArquivo(repo, f.path, cursor.sha, f.sha, textos[i]));
        const proximo = cursor.inicio + arquivos.length;
        return { repo, branch: cursor.branch, sha: cursor.sha, inicio: cursor.inicio, proximo, total: elegiveis.length, ignorados: todos.length - elegiveis.length, regras: partes.flatMap((p) => p.regras), sinais: partes.reduce((n, p) => n + p.sinais, 0), definicoes: [...new Set(partes.flatMap((p) => p.definicoes))], chamadas: partes.flatMap((p) => p.chamadas), referencias: partes.flatMap((p) => p.referencias), concluido: proximo >= elegiveis.length };
    }, 60 * 60000);
    return { ...resultado, cursor: resultado.concluido ? undefined : assinarCursor({ ...cursor, inicio: resultado.proximo }, token) };
}
export async function novidadesGit(repo: string, token: string) {
    if (!nomeValido(repo))
        throw new ErroAtlas('Repositório inválido.', 400);
    return lembrar(`${hash(token)}:novidades:${repo}`, async () => {
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
            }[]>(`/repos/${ORG}/${repo}/commits?per_page=5`, token),
            githubGet<{
                title: string;
                html_url: string;
                merged_at: string | null;
            }[]>(`/repos/${ORG}/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=20`, token),
        ]);
        return { novidades: [...commits.map((c) => ({ titulo: c.commit.message.split('\n')[0], url: c.html_url, data: c.commit.committer.date, tipo: 'commit', sha: c.sha })), ...prs.filter((p) => p.merged_at).slice(0, 5).map((p) => ({ titulo: p.title, url: p.html_url, data: p.merged_at!, tipo: 'pr' }))].sort((a, b) => b.data.localeCompare(a.data)), shaAtual: commits[0]?.sha ?? '', consultadoEm: new Date().toISOString() };
    });
}
export { ErroGithub };
