/** @jest-environment node */
import { esqueceSessaoRelatus } from '../_sessao';

let mockEmail = '';
jest.mock('../../_servidor', () => ({
  verificaFirebase: jest.fn(async () => ({ ok: true, email: mockEmail, uid: `uid-${mockEmail}`, token: 't' })),
}));

const TITULAR = 'gabriel.grechi@solus.inf.br';
let chamadas: { metodo: string; url: URL }[] = [];
let colaboradores: unknown[] = [];
let eventos: unknown[] = [];

function simula() {
  chamadas = [];
  global.fetch = jest.fn(async (url: unknown, init?: RequestInit) => {
    const u = new URL(String(url));
    chamadas.push({ metodo: init?.method ?? 'GET', url: u });
    if (u.pathname.endsWith('/v1/login')) return Response.json({ token: 'tk' });
    if (u.pathname.endsWith('/v1/me')) return Response.json({ nome: 'Titular Exemplo' });
    if (u.pathname.endsWith('/v1/cronograma/colaboradores')) return Response.json(colaboradores);
    if (u.pathname.endsWith('/v1/cronograma')) return Response.json(eventos);
    return Response.json({}, { status: 404 });
  }) as unknown as typeof fetch;
}

const pede = async (consulta = 'ano=2026') => {
  const { GET } = await import('./route');
  return GET(new Request(`http://localhost/api/relatus/cronograma?${consulta}`));
};

describe('cronograma do Relatus', () => {
  beforeEach(() => {
    mockEmail = TITULAR;
    process.env.RELATUS_LOGIN = 'OPERADOR.TESTE';
    process.env.RELATUS_SENHA = 'senha-de-teste';
    delete process.env.NEXT_PUBLIC_CRONOGRAMA_USUARIOS;
    delete process.env.NEXT_PUBLIC_RELATUS_USUARIOS;
    esqueceSessaoRelatus();
    colaboradores = [
      { id: 1, nome: 'Outra Pessoa', email: 'outra@exemplo.com', perfilNome: 'Equipe A' },
      { id: 2, nome: 'Titular Exemplo', email: TITULAR.toUpperCase(), perfilNome: 'Equipe B' },
    ];
    eventos = [
      { guid: 'a', colaboradorId: 2, descricao: 'Férias', dataInicio: '2026-01-05T00:00:00', dataFim: '2026-01-06', situacao: 'C', corFundo: '#FF0000', corFonte: '#FFFFFF', ferias: true, valorHora: 999, cobrar: true, observacao: '<p>Texto&nbsp;livre</p>' },
      { guid: 'b', colaboradorId: 1, descricao: 'De outra pessoa', dataInicio: '2026-01-07', dataFim: '2026-01-07', situacao: 'C' },
      { tipo: 'FERIADO', descricao: 'Natal', dataInicio: '2026-12-25', dataFim: '2026-12-25' },
    ];
    simula();
  });

  it('devolve só os compromissos de quem pediu, sem valores nem cobrança, e os feriados', async () => {
    const r = await pede();
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({
      ano: 2026,
      colaborador: { nome: 'Titular Exemplo', equipe: 'Equipe B' },
      feriados: { '2026-12-25': 'Natal' },
      eventos: [{ id: 'a', descricao: 'Férias', inicio: '2026-01-05', fim: '2026-01-06', situacao: 'C', projeto: false, horario: '', fundo: '#FF0000', texto: '#FFFFFF', marcas: ['ferias'], observacao: 'Texto livre' }],
    });
    const lista = chamadas.find((c) => c.url.pathname.endsWith('/v1/cronograma'))!;
    expect(Object.fromEntries(lista.url.searchParams)).toEqual({ inicio: '2026-01-01', fim: '2026-12-31', incluirFeriados: 'true', incluirProjetos: 'true', colaboradorId: '2' });
  });

  it('é somente leitura: além do login, só usa GET', async () => {
    await pede();
    expect(chamadas.filter((c) => c.metodo !== 'GET').map((c) => c.url.pathname)).toEqual(['/api/v1/login']);
    expect(Object.keys(await import('./route'))).not.toEqual(expect.arrayContaining(['POST']));
  });

  it('sem e-mail na lista do Relatus, o titular é achado pelo nome do operador', async () => {
    colaboradores = [{ id: 1, nome: 'Outra Pessoa' }, { id: 2, nome: 'TITULAR  Exemplo' }];
    expect((await (await pede()).json()).colaborador.nome).toBe('TITULAR  Exemplo');
  });

  it('outra pessoa liberada vê a própria agenda, achada pelo e-mail', async () => {
    process.env.NEXT_PUBLIC_CRONOGRAMA_USUARIOS = 'outra@exemplo.com';
    mockEmail = 'outra@exemplo.com';
    const corpo = await (await pede()).json();
    expect(corpo.colaborador.nome).toBe('Outra Pessoa');
    expect(corpo.eventos.map((e: { id: string }) => e.id)).toEqual(['b']);
  });

  it('quem não é achado não recebe a agenda de ninguém', async () => {
    process.env.NEXT_PUBLIC_CRONOGRAMA_USUARIOS = 'semcadastro@exemplo.com';
    mockEmail = 'semcadastro@exemplo.com';
    const r = await pede();
    expect(r.status).toBe(404);
    expect((await r.json()).erro).toBe('Seu usuário não foi encontrado no cronograma do Relatus.');
    expect(chamadas.some((c) => c.url.pathname.endsWith('/v1/cronograma'))).toBe(false);
  });

  it('fora da lista responde 404 sem consultar, mesmo liberado para os chamados do Relatus', async () => {
    process.env.NEXT_PUBLIC_RELATUS_USUARIOS = 'outra@exemplo.com';
    mockEmail = 'outra@exemplo.com';
    expect((await pede()).status).toBe(404);
    expect(chamadas).toEqual([]);
  });

  it('recusa ano inválido sem consultar', async () => {
    for (const consulta of ['ano=abc', 'ano=1999', '']) expect((await pede(consulta)).status).toBe(400);
    expect(chamadas).toEqual([]);
  });
});
