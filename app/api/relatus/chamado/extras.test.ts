/** @jest-environment node */
import { textoDeHtml } from '../../../chamados/relatusDados';
import { esqueceGuids } from '../_consulta';
import { esqueceSessaoRelatus } from '../_sessao';

let mockEmail = '';
jest.mock('../../_servidor', () => ({
  verificaFirebase: jest.fn(async () => ({ ok: true, email: mockEmail, uid: `uid-${mockEmail}`, token: 't' })),
}));

const API = 'https://relatus.solus.inf.br/api/v1';
let urls: string[] = [];
let respostas: Record<string, () => Response> = {};

function simula(extras: Record<string, () => Response>) {
  respostas = {
    '/login': () => Response.json({ token: 'tk' }),
    '/atendimentos/numero/568361': () => Response.json({ guid: 'abc-123' }),
    ...extras,
  };
  urls = [];
  global.fetch = jest.fn(async (url: unknown) => {
    const caminho = String(url).replace(API, '');
    urls.push(caminho);
    return respostas[caminho]?.() ?? Response.json({}, { status: 404 });
  }) as unknown as typeof fetch;
}

const chama = async (rota: './route' | './anexos/route' | './arquivo/route', consulta: string) => {
  const { GET } = await import(rota);
  return GET(new Request(`http://localhost/api/relatus/chamado?${consulta}`)) as Promise<Response>;
};

describe('Web Relatus: descritivo, mensagens, anexos e documentos', () => {
  beforeEach(() => {
    mockEmail = 'gabriel.grechi@solus.inf.br';
    process.env.RELATUS_LOGIN = 'OPERADOR.TESTE';
    process.env.RELATUS_SENHA = 'senha-de-teste';
    delete process.env.NEXT_PUBLIC_RELATUS_USUARIOS;
    esqueceSessaoRelatus();
    esqueceGuids();
  });

  it('transforma HTML em texto simples, sem scripts', () => {
    expect(textoDeHtml('<p>Ol&aacute;,&nbsp;<b>tudo</b></p><script>alert(1)</script><style>p{}</style><ul><li>a &amp; b</li><li>&#233; &lt;ok&gt;</li></ul>Fim<br>.'))
      .toBe('Olá, tudo\n• a & b\n• é <ok>\nFim\n.');
    expect(textoDeHtml('linha 1\nlinha 2')).toBe('linha 1\nlinha 2');
    expect(textoDeHtml(undefined)).toBe('');
  });

  it('devolve descritivo, mensagens, anexos e documentos criados', async () => {
    simula({
      '/atendimentos/abc-123': () => Response.json({ titulo: 'Ajuste', descricao: '<p>Descritivo</p>' }),
      '/atendimentos/abc-123/mensagens': () => Response.json([{ id: 7, tipo: 'E', autor: 'Ana', data: '2026-11-20T10:00:00', titulo: 'Retorno', texto: '<div>Segue</div>', temAnexo: true, interno: 'x' }]),
      '/atendimentos/abc-123/anexos-cliente': () => Response.json([{ id: 3, nome: 'log.txt', tamanhoKb: 12, dataMensagem: '2026-11-19', chamadoPaiNumero: 111, caminho: '/srv/x' }]),
      '/atendimentos/abc-123/docs-google': () => Response.json([
        { modeloId: 1, nome: 'Plano de testes', url: 'https://docs.google.com/d/1', criado: true },
        { modeloId: 2, nome: 'Não criado', url: null, criado: false },
        { modeloId: 3, nome: 'Link estranho', url: 'javascript:alert(1)', criado: true },
      ]),
    });
    const r = await chama('./route', 'numero=568361');
    expect(await r.json()).toEqual({
      numero: '568361',
      titulo: 'Ajuste',
      descricao: 'Descritivo',
      mensagens: [{ id: '7', tipo: 'E', autor: 'Ana', data: '2026-11-20T10:00:00', titulo: 'Retorno', texto: 'Segue', temAnexo: true }],
      anexos: [{ id: '3', nome: 'log.txt', tamanhoKb: 12, data: '2026-11-19', chamadoPai: '111' }],
      documentos: [{ nome: 'Plano de testes', url: 'https://docs.google.com/d/1' }],
      falhas: [],
    });
  });

  it('se uma parte falhar, mostra o restante e avisa qual faltou', async () => {
    simula({
      '/atendimentos/abc-123': () => Response.json({ titulo: 'Ajuste' }),
      '/atendimentos/abc-123/mensagens': () => Response.json([]),
      '/atendimentos/abc-123/anexos-cliente': () => Response.json({}, { status: 403 }),
      '/atendimentos/abc-123/docs-google': () => Response.json([]),
    });
    const r = await chama('./route', 'numero=568361');
    expect(r.status).toBe(200);
    expect((await r.json()).falhas).toEqual(['anexos']);
  });

  it('lista os anexos de uma mensagem', async () => {
    simula({ '/atendimentos/abc-123/mensagens/7/anexos': () => Response.json([{ id: 9, nome: 'tela.png', tamanhoKb: 40 }]) });
    const r = await chama('./anexos/route', 'numero=568361&mensagem=7');
    expect(await r.json()).toEqual({ anexos: [{ id: '9', nome: 'tela.png', tamanhoKb: 40 }] });
  });

  it('baixa anexo do chamado e de mensagem sempre como arquivo', async () => {
    const arquivo = () => new Response('<script>x</script>', { headers: { 'content-type': 'text/html' } });
    simula({ '/atendimentos/abc-123/anexos-cliente/3': arquivo, '/atendimentos/abc-123/mensagens/7/anexos/9': arquivo });
    for (const consulta of ['numero=568361&anexo=3', 'numero=568361&mensagem=7&anexo=9']) {
      const r = await chama('./arquivo/route', consulta);
      expect(r.status).toBe(200);
      expect(r.headers.get('content-type')).toBe('application/octet-stream');
      expect(r.headers.get('content-disposition')).toBe('attachment');
      expect(r.headers.get('x-content-type-options')).toBe('nosniff');
      expect(await r.text()).toBe('<script>x</script>');
    }
    expect(urls).toContain('/atendimentos/abc-123/mensagens/7/anexos/9');
  });

  it('não repete a busca do identificador do chamado, que não muda', async () => {
    simula({ '/atendimentos/abc-123/mensagens/7/anexos': () => Response.json([]) });
    await chama('./anexos/route', 'numero=568361&mensagem=7');
    await chama('./anexos/route', 'numero=568361&mensagem=7');
    expect(urls.filter((u) => u.includes('/numero/'))).toHaveLength(1);
  });

  it('recusa identificador que mude o caminho, sem consultar o Relatus', async () => {
    simula({});
    for (const consulta of ['numero=568361&anexo=..%2F..%2Fme', 'numero=568361', 'numero=568361&anexo=3&mensagem=7%2F..']) {
      expect((await chama('./arquivo/route', consulta)).status).toBe(400);
    }
    expect((await chama('./anexos/route', 'numero=568361&mensagem=..')).status).toBe(400);
    expect(urls).toEqual([]);
  });

  it('para outros usuários, anexos e arquivos também respondem 404', async () => {
    mockEmail = 'outra@solus.inf.br';
    simula({});
    expect((await chama('./anexos/route', 'numero=568361&mensagem=7')).status).toBe(404);
    expect((await chama('./arquivo/route', 'numero=568361&anexo=3')).status).toBe(404);
    expect(urls).toEqual([]);
  });
});
