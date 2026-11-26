/** @jest-environment node */
import { comTokenRelatus, esqueceSessaoRelatus, relatusConfigurado } from './_sessao';

const BASE = 'https://relatus.exemplo/v1';
const jwt = (exp: number) => `a.${Buffer.from(JSON.stringify({ exp })).toString('base64url')}.c`;
const emUmaHora = () => Math.floor(Date.now() / 1000) + 3600;
const resposta = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), { status });
const recusa = () => Object.assign(new Error('Relatus respondeu HTTP 401.'), { status: 401 });

let chamadas: { url: string; corpo: unknown }[] = [];
function loginResponde(...respostas: Response[]) {
  global.fetch = jest.fn(async (url: unknown, init?: RequestInit) => {
    chamadas.push({ url: String(url), corpo: JSON.parse(String(init?.body)) });
    return respostas.shift() ?? resposta(500, {});
  }) as unknown as typeof fetch;
}

describe('sessão do Relatus', () => {
  beforeEach(() => {
    chamadas = [];
    esqueceSessaoRelatus();
    process.env.RELATUS_LOGIN = 'OPERADOR.TESTE';
    process.env.RELATUS_SENHA = 'senha-de-teste';
  });

  it('só está configurado com login e senha', () => {
    expect(relatusConfigurado()).toBe(true);
    delete process.env.RELATUS_SENHA;
    expect(relatusConfigurado()).toBe(false);
  });

  it('faz o login uma vez e reaproveita o token, inclusive em chamadas paralelas', async () => {
    const token = jwt(emUmaHora());
    loginResponde(resposta(200, { token }));
    const usados = await Promise.all([1, 2, 3].map(() => comTokenRelatus(BASE, async (t) => t)));
    usados.push(await comTokenRelatus(BASE, async (t) => t));
    expect(usados).toEqual([token, token, token, token]);
    expect(chamadas).toEqual([{ url: `${BASE}/v1/login`, corpo: { login: 'OPERADOR.TESTE', senha: 'senha-de-teste' } }]);
  });

  it('gera outro token quando o atual venceu', async () => {
    const vencido = jwt(Math.floor(Date.now() / 1000) - 10);
    const novo = jwt(emUmaHora());
    loginResponde(resposta(200, { token: vencido }), resposta(200, { token: novo }));
    await comTokenRelatus(BASE, async (t) => t);
    expect(await comTokenRelatus(BASE, async (t) => t)).toBe(novo);
    expect(chamadas).toHaveLength(2);
  });

  it('quando o Relatus recusa o token, renova uma vez e repete a consulta', async () => {
    const velho = jwt(emUmaHora());
    const novo = jwt(emUmaHora() + 1);
    loginResponde(resposta(200, { token: velho }), resposta(200, { token: novo }));
    const usados = await Promise.all([1, 2].map(() => comTokenRelatus(BASE, async (t) => {
      if (t === velho) throw recusa();
      return t;
    })));
    expect(usados).toEqual([novo, novo]);
    expect(chamadas).toHaveLength(2);
  });

  it('se o token novo também for recusado, responde 502 sem insistir', async () => {
    loginResponde(resposta(200, { token: jwt(emUmaHora()) }), resposta(200, { token: jwt(emUmaHora() + 1) }));
    await expect(comTokenRelatus(BASE, async () => { throw recusa(); })).rejects.toMatchObject({ status: 502 });
    expect(chamadas).toHaveLength(2);
  });

  it('login recusado não é repetido logo em seguida, para não bloquear o operador', async () => {
    loginResponde(resposta(401, { mensagem: 'Senha inválida' }));
    const consulta = jest.fn();
    for (let i = 0; i < 3; i++) {
      await expect(comTokenRelatus(BASE, consulta)).rejects.toMatchObject({ status: 502, message: expect.stringContaining('Senha inválida') });
    }
    expect(consulta).not.toHaveBeenCalled();
    expect(chamadas).toHaveLength(1);
  });
});
