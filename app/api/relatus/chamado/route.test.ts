/** @jest-environment node */
import { podeVerRelatus } from '../../../chamados/relatusAcesso';

let mockEmail = '';
jest.mock('../../_servidor', () => ({
  verificaFirebase: jest.fn(async () => ({ ok: true, email: mockEmail, uid: `uid-${mockEmail}`, token: 't' })),
  dadosDoPerfil: jest.fn(async () => ({ ok: true, tipo: '', gitUser: '', nome: 'Pessoa' })),
}));

const pede = async () => {
  const { GET } = await import('./route');
  return GET(new Request('http://localhost/api/relatus/chamado?numero=568361'));
};

describe('Web Relatus restrito', () => {
  beforeEach(() => {
    delete process.env.RELATUS_API_BASE_URL;
    delete process.env.RELATUS_SERVICE_TOKEN;
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
    expect((await pede()).status).toBe(503);
  });
});
