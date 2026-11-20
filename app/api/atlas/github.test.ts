/** @jest-environment node */
import { lerBlocoGit, assinarCursor, abrirCursor, repositoriosGit, ErroAtlas } from './github';
import { githubGet } from '../_servidor';
jest.mock('../_servidor', () => ({ githubGet: jest.fn(), ErroGithub: class extends Error {
    } }));
const sha = 'a'.repeat(40), tree = 'b'.repeat(40);
const arquivos = Array.from({ length: 13 }, (_, i) => ({ path: `fonte${String(i).padStart(2, '0')}.sql`, sha: String(i + 1).padStart(40, '0'), size: 200, type: 'blob', mode: '100644' }));
function rest(url: string): unknown {
    if (url.includes('/git/trees/'))
        return { tree: arquivos, truncated: false };
    if (url.includes('/commits/'))
        return { sha, commit: { tree: { sha: tree } } };
    return { default_branch: 'develop' };
}
beforeEach(() => {
    jest.clearAllMocks();
    (githubGet as jest.Mock).mockImplementation(rest);
    global.fetch = jest.fn(async () => new Response(JSON.stringify({ data: { repository: Object.fromEntries(arquivos.slice(0, 12).map((_f, i) => [`f${i}`, { text: "if cnpj = '12345678000190' then glosa();", isBinary: false }])) } }), { status: 200 })) as jest.Mock;
});
test('consulta todas as páginas do inventário', async () => {
    const repo = { name: 'ptu', default_branch: 'develop', pushed_at: '2026-11-20', description: '', html_url: 'https://github.com/solussaude/ptu', archived: false };
    (githubGet as jest.Mock).mockImplementation((url: string) => url.endsWith('page=1') ? Array.from({ length: 100 }, (_, i) => ({ ...repo, name: `repo${i}` })) : [repo]);
    const data = await repositoriosGit('pagina-unica');
    expect(data.repos).toHaveLength(101);
    expect(data.completo).toBe(true);
});
test('lê fontes em blocos presos ao mesmo commit e retoma sem repetir arquivos', async () => {
    const token = 'blocos';
    const primeiro = await lerBlocoGit('ptu', undefined, token);
    expect(primeiro.total).toBe(13);
    expect(primeiro.proximo).toBe(12);
    expect(primeiro.concluido).toBe(false);
    expect(primeiro.regras[0].fonte.url).toContain(`/blob/${sha}/`);
    const segundo = await lerBlocoGit('ptu', primeiro.cursor, token);
    expect(segundo.inicio).toBe(12);
    expect(segundo.proximo).toBe(13);
    expect(segundo.concluido).toBe(true);
});
test('cursor assinado funciona em outra instância, sem estado de processo', async () => {
    const primeiro = await lerBlocoGit('ptu', undefined, 'sem-afinidade');
    await jest.isolateModulesAsync(async () => {
        const remoto = await import('./github');
        const servidor = await import('../_servidor');
        (servidor.githubGet as jest.Mock).mockImplementation(rest);
        const segundo = await remoto.lerBlocoGit('ptu', primeiro.cursor, 'sem-afinidade');
        expect(segundo.inicio).toBe(12);
        expect(segundo.concluido).toBe(true);
    });
});
test('rejeita cursor adulterado, expirado, de outro repo ou outra credencial', () => {
    const c = { v: 2, repo: 'ptu', sha, tree, branch: 'develop', inicio: 12, expira: Date.now() + 10000 };
    const valor = assinarCursor(c, 'segredo');
    expect(abrirCursor(valor, 'ptu', 'segredo').inicio).toBe(12);
    expect(() => abrirCursor(valor + 'x', 'ptu', 'segredo')).toThrow();
    expect(() => abrirCursor(valor, 'banco', 'segredo')).toThrow();
    expect(() => abrirCursor(valor, 'ptu', 'outro')).toThrow();
    expect(() => abrirCursor(assinarCursor({ ...c, expira: 1 }, 'segredo'), 'ptu', 'segredo')).toThrow();
});
test('não marca árvores truncadas como lidas', async () => {
    (githubGet as jest.Mock).mockImplementation((url: string) => url.includes('/git/trees/') ? { tree: arquivos, truncated: true } : rest(url));
    await expect(lerBlocoGit('ptu', undefined, 'truncada')).rejects.toThrow('árvore incompleta');
    expect(fetch).not.toHaveBeenCalled();
});
test('não consulta caminhos de outra organização enviados no nome', async () => {
    await expect(lerBlocoGit('../outro', undefined, 't')).rejects.toBeInstanceOf(ErroAtlas);
    expect(githubGet).not.toHaveBeenCalled();
});
test('erro parcial do GraphQL tenta a leitura REST e preserva acentos de fontes Windows', async () => {
    global.fetch = jest.fn(async () => new Response(JSON.stringify({ errors: [{ message: 'GraphQL indisponível para esta credencial' }] }), { status: 403 })) as jest.Mock;
    (githubGet as jest.Mock).mockImplementation((url: string) => url.includes('/git/blobs/') ? { content: Buffer.from("-- glosa de autoriza\xe7\xe3o", 'latin1').toString('base64'), encoding: 'base64' } : rest(url));
    const data = await lerBlocoGit('ptu', undefined, 'windows');
    expect(data.regras[0].fonte.trecho).toContain('autorização');
});
test('limite do GraphQL pausa sem avançar o cursor nem disparar fallback', async () => {
    global.fetch = jest.fn(async () => new Response(JSON.stringify({ errors: [{ type: 'RATE_LIMITED' }] }), { status: 200 })) as jest.Mock;
    await expect(lerBlocoGit('ptu', undefined, 'limite')).rejects.toMatchObject({ status: 429 });
    expect((githubGet as jest.Mock).mock.calls.some(([url]) => url.includes('/git/blobs/'))).toBe(false);
});
