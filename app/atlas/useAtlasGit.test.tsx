import { act, renderHook } from '@testing-library/react';
import { useAtlasGit, ErroConsultaAtlas, reconciliarMapa, type ConsultaAtlas } from './useAtlasGit';
import { catalogoDoGit } from './extracao';
import { lerMapa, salvarMapa } from './cacheNavegador';
import type { BlocoAtlas, CatalogoAtlas } from './modelo';
jest.mock('./cacheNavegador', () => ({ lerMapa: jest.fn(), salvarMapa: jest.fn() }));
const mapa = () => catalogoDoGit(['banco', 'ptu'].map((nome) => ({ nome, branch: 'develop', descricao: '', atualizadoEm: '2026-11-20', url: '', arquivado: false })));
const bloco = (repo: string, inicio = 0): BlocoAtlas => ({ repo, branch: 'develop', sha: `${repo}-sha`, inicio, proximo: inicio + 1, total: repo === 'ptu' ? 2 : 1, ignorados: 0, sinais: 0, regras: [], definicoes: [], chamadas: [], referencias: [], concluido: repo !== 'ptu' || inicio === 1, cursor: inicio === 0 && repo === 'ptu' ? 'retomada' : undefined });
beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    (lerMapa as jest.Mock).mockResolvedValue(null);
    (salvarMapa as jest.Mock).mockResolvedValue(undefined);
});
afterEach(() => jest.useRealTimers());
const andar = async (ms: number) => { await act(async () => { await jest.advanceTimersByTimeAsync(ms); }); };
test('prioriza o sistema selecionado, avança a fila e mantém progresso de retomada', async () => {
    const chamadas: {
        repo: string;
        cursor?: string;
    }[] = [];
    const fonte = jest.fn(async (_suffix = '', method = 'GET', _signal?: AbortSignal, body?: unknown) => {
        void _suffix;
        void _signal;
        if (method === 'GET')
            return mapa();
        const pedido = body as {
            repo: string;
            cursor?: string;
        };
        chamadas.push(pedido);
        return bloco(pedido.repo, pedido.cursor ? 1 : 0);
    }) as ConsultaAtlas;
    const { result } = renderHook(() => useAtlasGit(fonte, 'pessoa-1', 'ptu'));
    await andar(0);
    await andar(2500);
    expect(chamadas.map((c) => c.repo)).toEqual(['ptu', 'ptu', 'banco']);
    expect(chamadas[1].cursor).toBe('retomada');
    expect(result.current.catalogo?.repos.every((r) => r.estadoLeitura === 'concluido')).toBe(true);
    expect(salvarMapa).toHaveBeenCalledWith('pessoa-1', expect.objectContaining({ origem: 'github' }));
});
test('pausa pelo limite e retoma usando o mesmo cursor após o prazo', async () => {
    let limite = true;
    const pedidos: {
        repo: string;
        cursor?: string;
    }[] = [];
    const fonte = jest.fn(async (_s = '', method = 'GET', _signal?: AbortSignal, body?: unknown) => {
        void _s;
        void _signal;
        if (method === 'GET')
            return mapa();
        const pedido = body as {
            repo: string;
            cursor?: string;
        };
        pedidos.push(pedido);
        if (pedido.cursor && limite) {
            limite = false;
            throw new ErroConsultaAtlas('Pausa', 429, new Date(Date.now() + 3000).toISOString());
        }
        return bloco(pedido.repo, pedido.cursor ? 1 : 0);
    }) as ConsultaAtlas;
    const { result } = renderHook(() => useAtlasGit(fonte, 'pessoa-1', 'ptu'));
    await andar(0);
    await andar(1500);
    expect(result.current.catalogo?.repos.find((r) => r.id === 'ptu')?.cursor).toBe('retomada');
    expect(pedidos).toHaveLength(2);
    await andar(5000);
    expect(pedidos[2]).toEqual({ repo: 'ptu', cursor: 'retomada' });
    expect(result.current.catalogo?.repos.every((r) => r.estadoLeitura === 'concluido')).toBe(true);
});
test('não mostra nem carrega cache privado quando a permissão atual é negada', async () => {
    const fonte = jest.fn(async () => { throw new ErroConsultaAtlas('Sem acesso', 403, undefined, true); }) as ConsultaAtlas;
    const { result } = renderHook(() => useAtlasGit(fonte, 'pessoa-1', ''));
    await andar(500);
    expect(result.current.catalogo).toBeNull();
    expect(lerMapa).not.toHaveBeenCalled();
});
test('uma mudança no Git agenda a conferência sem perder a leitura já concluída', () => {
    const salvo = mapa();
    salvo.repos = salvo.repos.map((r) => ({ ...r, sha: 'lido', baseAtualizadaEm: r.atualizadoEm, estadoLeitura: 'concluido' }));
    const novo = mapa();
    novo.repos[0].atualizadoEm = '2026-11-21';
    const resultado: CatalogoAtlas = reconciliarMapa(novo, salvo);
    expect(resultado.repos[0].estadoLeitura).toBe('concluido');
    expect(resultado.repos[0].precisaConferir).toBe(true);
    expect(resultado.repos[0].sha).toBe('lido');
    expect(resultado.repos[1].estadoLeitura).toBe('concluido');
});
