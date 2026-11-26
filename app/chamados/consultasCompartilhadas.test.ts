/** @jest-environment jsdom */
import { aplicarProcesso, consultaChecksGit, lerProcesso, permissaoProcessos } from '../processos/clienteProcesso';
import { gravaChaveBm } from './bmChave';
import { lerRegistrosBm } from './bmSync';
import { lerQuadroBm } from './bmQuadroSync';
import { invalidaChamados, lerChamados } from './chamadosDados';
import { limpaDadosSalvos } from './dadosSalvos';

const mockLeituras: string[] = [];

jest.mock('../../firebase', () => ({ db: {}, auth: { currentUser: { getIdToken: async () => 'token-de-teste' } } }));
jest.mock('firebase/firestore', () => ({
  collection: (_db: unknown, nome: string) => nome,
  doc: (_db: unknown, ...partes: string[]) => partes.join('/'),
  getDoc: async () => ({ exists: () => false }),
  getDocs: async (nome: string) => {
    mockLeituras.push(nome);
    return { docs: [{ id: '568361', data: () => ({ numero: '568.361', chamado: '568361', cardId: 1 }) }] };
  },
  setDoc: jest.fn(),
  writeBatch: jest.fn(),
  serverTimestamp: jest.fn(),
}));

const MINUTO = 60_000;
let agora = 1_800_000_000_000;
let acoes: string[] = [];

const estado = (secao: number) => ({ card: { cardId: 1, chamado: '568361', colunaId: 10 }, colunas: [{ id: 10, nome: 'Coluna', secao, posicao: 0 }], criterios: [], campos: [] });
let secaoAtual = 2;

describe('consultas de chamado compartilhadas entre telas', () => {
  beforeEach(() => {
    limpaDadosSalvos();
    mockLeituras.length = 0;
    acoes = [];
    secaoAtual = 2;
    jest.spyOn(Date, 'now').mockImplementation(() => agora);
    global.fetch = jest.fn(async (url: unknown, init?: RequestInit) => {
      const acao = init?.body ? (JSON.parse(String(init.body)) as { acao?: string }).acao ?? String(url) : 'permissao';
      acoes.push(acao);
      const corpo = acao === 'aplicar' ? { resultados: [{ ok: true }], estado: estado(3) } : acao === 'permissao' ? { permitido: true } : String(url).includes('checks') ? { resultados: {} } : { estado: estado(secaoAtual) };
      return { ok: true, json: async () => corpo };
    }) as unknown as typeof fetch;
  });
  afterEach(() => jest.restoreAllMocks());

  it('as listas são lidas uma vez, renovam após 5 minutos e podem ser forçadas', async () => {
    for (let i = 0; i < 3; i++) await Promise.all([lerChamados(), lerRegistrosBm(), lerQuadroBm()]);
    expect([...mockLeituras].sort()).toEqual(['bm_quadro', 'chamados', 'chamados_bm']);
    agora += 6 * MINUTO;
    await lerChamados();
    await lerChamados(true);
    invalidaChamados();
    await lerChamados();
    expect(mockLeituras.filter((c) => c === 'chamados')).toHaveLength(4);
  });

  it('quem altera a lista recebida não altera o que está salvo', async () => {
    (await lerChamados()).length = 0;
    expect(await lerChamados()).toHaveLength(1);
  });

  it('cartão concluído no BM não é relido; aberto é relido após 10 minutos', async () => {
    secaoAtual = 4;
    await lerProcesso(1, '568361');
    agora += 30 * 24 * 60 * MINUTO;
    await lerProcesso(1, '568361');
    expect(acoes).toEqual(['ler']);

    limpaDadosSalvos();
    acoes = [];
    secaoAtual = 2;
    await lerProcesso(1, '568361');
    agora += 9 * MINUTO;
    await lerProcesso(1, '568361');
    agora += 2 * MINUTO;
    await lerProcesso(1, '568361');
    expect(acoes).toEqual(['ler', 'ler']);
  });

  it('gravar no BM guarda o estado devolvido e descarta as listas do BM', async () => {
    await Promise.all([lerProcesso(1, '568361'), lerRegistrosBm(), lerQuadroBm()]);
    await aplicarProcesso(1, '568361', [{ tipo: 'comentario', texto: 'ok' }]);
    expect((await lerProcesso(1, '568361')).colunas[0].secao).toBe(3);
    await Promise.all([lerRegistrosBm(), lerQuadroBm()]);
    expect(acoes).toEqual(['ler', 'aplicar']);
    expect(mockLeituras.filter((c) => c === 'bm_quadro')).toHaveLength(2);
    expect(mockLeituras.filter((c) => c === 'chamados_bm')).toHaveLength(2);
  });

  it('permissão e checks não se repetem, e trocar a chave do BM descarta tudo', async () => {
    for (let i = 0; i < 2; i++) {
      await permissaoProcessos();
      await consultaChecksGit([{ repo: 'a', numero: 1 }]);
      await lerProcesso(1, '568361');
    }
    expect(acoes).toHaveLength(3);
    gravaChaveBm('outra-chave-de-teste');
    await lerProcesso(1, '568361');
    expect(acoes).toHaveLength(4);
  });
});
