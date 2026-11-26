/** @jest-environment node */
import { podeVerRelatus } from '../../../chamados/relatusAcesso';
import { esqueceSessaoRelatus } from '../_sessao';

let mockEmail = '';
jest.mock('../../_servidor', () => ({
  verificaFirebase: jest.fn(async () => ({ ok: true, email: mockEmail, uid: `uid-${mockEmail}`, token: 't' })),
}));

const pede = async () => {
  const { GET } = await import('./route');
  return GET(new Request('http://localhost/api/relatus/chamado?numero=568361'));
};

describe('Web Relatus restrito', () => {
  beforeEach(() => {
    delete process.env.RELATUS_API_BASE_URL;
    delete process.env.RELATUS_LOGIN;
    delete process.env.RELATUS_SENHA;
    esqueceSessaoRelatus();
    delete process.env.NEXT_PUBLIC_RELATUS_USUARIOS;
  });

  it('libera só o usuário definido, sem diferenciar maiúsculas, ou a lista configurada', () => {
    expect(podeVerRelatus('Gabriel.Grechi@solus.inf.br', undefined)).toBe(true);
    expect(podeVerRelatus('outra@solus.inf.br', undefined)).toBe(false);
    expect(podeVerRelatus('', undefined)).toBe(false);
    expect(podeVerRelatus(undefined, undefined)).toBe(false);
    expect(podeVerRelatus('outra@solus.inf.br', 'a@x.com, outra@solus.inf.br')).toBe(true);
    expect(podeVerRelatus('gabriel.grechi@solus.inf.br', 'a@x.com')).toBe(false);
  });

  it('para os demais a API responde como se não existisse, sem citar configuração', async () => {
    mockEmail = 'outra@solus.inf.br';
    const r = await pede();
    expect(r.status).toBe(404);
    expect(JSON.stringify(await r.json())).not.toMatch(/RELATUS_/);
  });

  it('para o usuário liberado sem integração configurada, avisa o que falta', async () => {
    mockEmail = 'gabriel.grechi@solus.inf.br';
    const r = await pede();
    expect(r.status).toBe(503);
    expect((await r.json()).erro).toContain('RELATUS_LOGIN e RELATUS_SENHA');
  });

  describe('consulta no Relatus', () => {
    let urls: string[] = [];
    const simula = (porNumero: Response) => {
      urls = [];
      global.fetch = jest.fn(async (url: unknown) => {
        urls.push(String(url));
        if (String(url).endsWith('/v1/login')) return Response.json({ token: 'tk' });
        if (String(url).includes('/numero/')) return porNumero;
        return Response.json({ numero: 568361, titulo: 'Ajuste', cliente: 'Cliente X', status: 'Aberto', horasOrcadas: 4, descricao: 'texto interno', clienteId: 9 });
      }) as unknown as typeof fetch;
    };

    beforeEach(() => {
      mockEmail = 'gabriel.grechi@solus.inf.br';
      process.env.RELATUS_LOGIN = 'OPERADOR.TESTE';
      process.env.RELATUS_SENHA = 'senha-de-teste';
    });

    it('busca pelo número no endereço oficial, ignorando variável antiga, e devolve só os campos exibidos', async () => {
      process.env.RELATUS_API_BASE_URL = 'https://api.solus.inf.br/relatus/v1';
      simula(Response.json({ guid: 'abc-123' }));
      const r = await pede();
      expect(r.status).toBe(200);
      expect(await r.json()).toEqual({ numero: '568361', titulo: 'Ajuste', cliente: 'Cliente X', status: 'Aberto', horasOrcadas: '4' });
      expect(urls).toEqual([
        'https://relatus.solus.inf.br/api/v1/login',
        'https://relatus.solus.inf.br/api/v1/atendimentos/numero/568361',
        'https://relatus.solus.inf.br/api/v1/atendimentos/abc-123',
      ]);
    });

    it('avisa quando o chamado não existe', async () => {
      simula(Response.json({}, { status: 404 }));
      const r = await pede();
      expect(r.status).toBe(404);
      expect((await r.json()).erro).toBe('Chamado não encontrado no Relatus.');
    });
  });
});
