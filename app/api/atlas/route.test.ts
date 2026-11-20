/** @jest-environment node */
import { GET, POST } from './route';
import { exigeGit, githubGet } from '../_servidor';
import { execFile } from 'node:child_process';
jest.mock('node:child_process', () => ({ execFile: jest.fn() }));
jest.mock('next/server', () => ({ NextResponse: { json: (data: unknown, init?: ResponseInit) => new Response(JSON.stringify(data), init) } }));
jest.mock('../_servidor', () => ({ exigeGit: jest.fn(), githubGet: jest.fn(), ErroGithub: class extends Error {
    } }));
jest.mock('../_limite', () => ({ permite: () => true }));
jest.mock('node:fs/promises', () => ({
    stat: async () => ({ mtimeMs: 1 }),
    readFile: async () => JSON.stringify({ versao: 1, geradoEm: '2026-11-20', limites: [], conexoes: [], repos: [{ id: 'banco', dominio: 'contas', sha: 'antigo', branch: 'develop' }], regras: [{ id: '1', repo: 'banco', titulo: 'Exceção DMED', resumo: '', categoria: 'cliente', cnpjs: ['07945024000162'], termos: [], fonte: { arquivo: 'dmed.sql', trecho: 'evidência' } }, { id: '2', repo: 'ptu', titulo: 'Glosa', resumo: '', categoria: 'glosa', cnpjs: [], termos: [], fonte: { arquivo: 'ptu.sql' } }] }),
}));
beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ATLAS_WORKSPACE_ROOT;
    (exigeGit as jest.Mock).mockResolvedValue({ ok: true, token: `token-${Math.random()}`, email: 'teste@example.invalid' });
});
test('nega acesso antes de ler ou consultar o Git', async () => {
    (exigeGit as jest.Mock).mockResolvedValue({ ok: false, status: 403, erro: 'Sem acesso.' });
    const response = await GET(new Request('http://localhost/api/atlas'));
    expect(response.status).toBe(403);
    expect(githubGet).not.toHaveBeenCalled();
});
test('inventário inicial não envia todos os trechos de código ao navegador', async () => {
    const response = await GET(new Request('http://localhost/api/atlas'));
    const data = await response.json();
    expect(data.regras).toEqual([]);
    expect(data.totalRegras).toBe(2);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
});
test('filtra os documentos sem perder escopo de repositório e categoria', async () => {
    const response = await GET(new Request('http://localhost/api/atlas?modo=regras&repo=banco&categoria=cliente&busca=07.945.024%2F0001-62'));
    expect((await response.json()).regras.map((r: {
        id: string;
    }) => r.id)).toEqual(['1']);
});
test('valida nomes antes de construir consultas remotas', async () => {
    const response = await GET(new Request('http://localhost/api/atlas?modo=novidades&repo=..%2Foutra-org'));
    expect(response.status).toBe(400);
    expect(githubGet).not.toHaveBeenCalled();
});
test('avisa divergência da branch indexada sem afirmar publicação', async () => {
    (githubGet as jest.Mock).mockImplementation((url: string) => url.includes('/commits?') ? [{ sha: 'novo', html_url: 'https://github.com/solussaude/banco/commit/novo', commit: { message: 'Atualização\nDetalhe', committer: { date: '2026-11-20' } } }] : []);
    const response = await GET(new Request('http://localhost/api/atlas?modo=novidades&repo=banco'));
    const data = await response.json();
    expect(data.divergente).toBe(true);
    expect(data.novidades[0].titulo).toBe('Atualização');
    expect((githubGet as jest.Mock).mock.calls[0][0]).toContain('sha=develop');
});
test('não executa indexação sem checkouts configurados', async () => {
    const response = await POST(new Request('http://localhost/api/atlas', { method: 'POST' }));
    expect(response.status).toBe(409);
});

test('a releitura acontece em segundo plano e solicitações concorrentes compartilham a execução', async () => {
    process.env.ATLAS_WORKSPACE_ROOT = 'C:/checkouts-testes';
    let concluir: (erro: Error | null, stdout?: string, stderr?: string) => void = () => undefined;
    (execFile as unknown as jest.Mock).mockImplementation((_bin, _args, _opcoes, callback) => { concluir = callback; });
    const primeira = await POST(new Request('http://localhost/api/atlas', { method: 'POST' }));
    expect(primeira.status).toBe(202);
    expect((await primeira.json()).indexando).toBe(true);
    await POST(new Request('http://localhost/api/atlas', { method: 'POST' }));
    expect(execFile).toHaveBeenCalledTimes(1);
    concluir(null, 'indexado', '');
    await new Promise(setImmediate);
    const status = await GET(new Request('http://localhost/api/atlas'));
    expect((await status.json()).indexando).toBe(false);
});

test('falha da releitura preserva o mapa e não publica detalhes internos do processo', async () => {
    process.env.ATLAS_WORKSPACE_ROOT = 'C:/checkouts-testes';
    (execFile as unknown as jest.Mock).mockImplementation((_bin, _args, _opcoes, callback) => callback(new Error('credencial-interna-nao-publicar')));
    await POST(new Request('http://localhost/api/atlas', { method: 'POST' }));
    await new Promise(setImmediate);
    const status = await GET(new Request('http://localhost/api/atlas'));
    const json = await status.json();
    expect(json.repos).toHaveLength(1);
    expect(json.erroIndexacao).toContain('mapa anterior foi preservado');
    expect(JSON.stringify(json)).not.toContain('credencial-interna');
});
