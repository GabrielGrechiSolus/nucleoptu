/** @jest-environment node */
import { GET, POST } from './route';
import { exigeGit } from '../_servidor';
import { lerBlocoGit, mapaGit, novidadesGit, ErroAtlas } from './github';
jest.mock('next/server', () => ({ NextResponse: { json: (data: unknown, init?: ResponseInit) => new Response(JSON.stringify(data), init) } }));
jest.mock('../_servidor', () => ({ exigeGit: jest.fn(), ErroGithub: class extends Error {
    } }));
jest.mock('../_limite', () => ({ permite: () => true }));
jest.mock('./github', () => ({ lerBlocoGit: jest.fn(), mapaGit: jest.fn(), novidadesGit: jest.fn(), repositoriosGit: jest.fn(), ErroAtlas: class extends Error {
        constructor(message: string, mockStatus: number, mockRetomarEm?: string) { super(message); Object.assign(this, { status: mockStatus, retomarEm: mockRetomarEm }); }
    } }));
beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ATLAS_WORKSPACE_ROOT;
    (exigeGit as jest.Mock).mockResolvedValue({ ok: true, token: 'credencial-somente-servidor', email: 'teste@example.invalid' });
});
test('nega acesso antes de ler fontes', async () => {
    (exigeGit as jest.Mock).mockResolvedValue({ ok: false, status: 403, erro: 'Sem acesso.' });
    expect((await GET(new Request('http://localhost/api/atlas'))).status).toBe(403);
    expect((await POST(new Request('http://localhost/api/atlas', { method: 'POST', body: JSON.stringify({ repo: 'ptu' }) }))).status).toBe(403);
    expect(mapaGit).not.toHaveBeenCalled();
    expect(lerBlocoGit).not.toHaveBeenCalled();
});
test('carrega o mapa do Git sem arquivos locais ou ATLAS_WORKSPACE_ROOT', async () => {
    (mapaGit as jest.Mock).mockResolvedValue({ origem: 'github', repos: [{ id: 'ptu' }], regras: [] });
    const response = await GET(new Request('http://localhost/api/atlas'));
    expect(response.status).toBe(200);
    expect((await response.json()).repos).toHaveLength(1);
    expect(mapaGit).toHaveBeenCalledWith('credencial-somente-servidor');
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
});
test('lê um bloco de forma síncrona com a credencial existente, sem devolvê-la ao navegador', async () => {
    (lerBlocoGit as jest.Mock).mockResolvedValue({ repo: 'ptu', proximo: 12, cursor: 'cursor-assinado' });
    const response = await POST(new Request('http://localhost/api/atlas', { method: 'POST', body: JSON.stringify({ repo: 'ptu', cursor: 'anterior' }) }));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(lerBlocoGit).toHaveBeenCalledWith('ptu', 'anterior', 'credencial-somente-servidor');
    expect(JSON.stringify(data)).not.toContain('credencial-somente-servidor');
});
test('valida corpo antes de consultar o Git', async () => {
    const response = await POST(new Request('http://localhost/api/atlas', { method: 'POST', body: '{inválido' }));
    expect(response.status).toBe(400);
    expect(lerBlocoGit).not.toHaveBeenCalled();
});
test('devolve uma pausa explícita sem descartar o cursor anterior', async () => {
    (lerBlocoGit as jest.Mock).mockRejectedValue(new ErroAtlas('Aguarde o Git.', 429, '2026-11-20T20:00:00Z'));
    const response = await POST(new Request('http://localhost/api/atlas', { method: 'POST', body: JSON.stringify({ repo: 'ptu', cursor: 'anterior' }) }));
    expect(response.status).toBe(429);
    expect((await response.json()).retomarEm).toBe('2026-11-20T20:00:00Z');
});
test('novidades não precisam do mapa salvo', async () => {
    (novidadesGit as jest.Mock).mockResolvedValue({ novidades: [], shaAtual: 'novo' });
    const response = await GET(new Request('http://localhost/api/atlas?modo=novidades&repo=ptu'));
    expect(response.status).toBe(200);
    expect(novidadesGit).toHaveBeenCalledWith('ptu', 'credencial-somente-servidor');
});
