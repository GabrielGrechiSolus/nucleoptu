/** @jest-environment node */
import { generateKeyPairSync } from 'crypto';

// Simula as APIs do Google/Firebase: token do serviço, login, contas (Identity Toolkit) e Firestore REST.
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({ project_id: 'proj', client_email: 'svc@proj.iam.gserviceaccount.com', private_key: privateKey });
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'chave-publica';
process.env.ADMIN_EMAILS = 'chefe@empresa.com';

type Chamada = { url: string; metodo: string; corpo: Record<string, unknown> | undefined };
let chamadas: Chamada[] = [];
let contas: Record<string, Record<string, unknown>> = {};
let logado = 'chefe';
let falhaAoCriar = '';

const resposta = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), { status });

global.fetch = jest.fn(async (entrada: unknown, init?: RequestInit) => {
  const url = String(entrada);
  const metodo = init?.method ?? 'GET';
  const texto = typeof init?.body === 'string' ? init.body : '';
  const corpo = texto.startsWith('{') ? (JSON.parse(texto) as Record<string, unknown>) : undefined;
  if (url.includes('oauth2.googleapis.com')) return resposta(200, { access_token: 'tk', expires_in: 3600 });
  if (url.includes('/v1/accounts:lookup?key=')) return resposta(200, { users: [{ email: contas[logado]?.email, localId: logado, emailVerified: true }] });
  chamadas.push({ url, metodo, corpo });
  if (url.includes('accounts:batchGet')) return resposta(200, { users: Object.values(contas) });
  if (url.endsWith('/accounts:lookup')) {
    const uid = (corpo?.localId as string[])[0];
    return resposta(200, contas[uid] ? { users: [contas[uid]] } : {});
  }
  if (url.endsWith('/accounts:update')) return resposta(200, { localId: corpo?.localId });
  if (url.endsWith('/projects/proj/accounts')) return falhaAoCriar ? resposta(400, { error: { message: falhaAoCriar } }) : resposta(200, { localId: 'novo123' });
  if (url.includes('firestore.googleapis.com')) {
    if (metodo === 'GET' && url.includes('/profiles?')) return resposta(200, { documents: [{ name: 'x/profiles/chefe', fields: { name: { stringValue: 'Chefe do Perfil' }, noticeType: { stringValue: 'lideranca' } } }] });
    return resposta(200, {});
  }
  return resposta(404, {});
}) as unknown as typeof fetch;

const jwt = (authTime: number) => `a.${Buffer.from(JSON.stringify({ auth_time: authTime })).toString('base64url')}.c`;
const pedido = (corpo?: unknown, authTime = 2000, metodo = corpo ? 'POST' : 'GET') =>
  new Request('http://localhost/api/admin/usuarios', { method: metodo, headers: { authorization: `Bearer ${jwt(authTime)}` }, body: corpo ? JSON.stringify(corpo) : undefined });
const paraUid = (uid: string) => ({ params: Promise.resolve({ uid }) });

/* eslint-disable @typescript-eslint/no-require-imports */
const { GET, POST } = require('./route') as typeof import('./route');
const { PATCH } = require('./[uid]/route') as typeof import('./[uid]/route');

beforeEach(() => {
  chamadas = [];
  logado = 'chefe';
  falhaAoCriar = '';
  contas = {
    chefe: { localId: 'chefe', email: 'chefe@empresa.com', validSince: '1000', createdAt: '1700000000000' },
    comum1: { localId: 'comum1', email: 'comum@empresa.com', displayName: 'Comum', validSince: '1000' },
    delegado: { localId: 'delegado', email: 'delegado@empresa.com', customAttributes: '{"admin":true,"outro":1}', validSince: '1000' },
  };
});

const atualizacoes = () => chamadas.filter((c) => c.url.endsWith('/accounts:update')).map((c) => c.corpo!);

describe('administração de usuários sem firebase-admin', () => {
  it('barra quem não é administrador, quem teve o login revogado e conta inativa', async () => {
    logado = 'comum1';
    expect((await GET(pedido())).status).toBe(403);
    logado = 'chefe';
    expect((await GET(pedido(undefined, 500))).status).toBe(401);
    contas.chefe.disabled = true;
    expect((await GET(pedido())).status).toBe(401);
  });

  it('lista as contas com o perfil, a permissão e as datas', async () => {
    logado = 'delegado';
    const r = await GET(pedido());
    expect(r.status).toBe(200);
    const { usuarios } = (await r.json()) as { usuarios: Record<string, unknown>[] };
    const por = (uid: string) => usuarios.find((u) => u.uid === uid)!;
    expect(por('chefe')).toMatchObject({ nome: 'Chefe do Perfil', tipo: 'lideranca', admin: true, adminBase: true, criadoEm: '2023-11-14T22:13:20.000Z' });
    expect(por('delegado')).toMatchObject({ admin: true, adminBase: false });
    expect(por('comum1')).toMatchObject({ nome: 'Comum', admin: false, inativo: false });
  });

  it('cadastra a conta e grava o perfil só nos campos enviados, com a data', async () => {
    const r = await POST(pedido({ nome: ' Pessoa Nova ', email: 'Nova@Empresa.com', senha: 'Senha@Forte123', tipo: 'analise', admin: true }));
    expect(r.status).toBe(201);
    expect(chamadas.find((c) => c.url.endsWith('/projects/proj/accounts'))!.corpo).toMatchObject({ email: 'nova@empresa.com', displayName: 'Pessoa Nova', emailVerified: true });
    expect(atualizacoes()).toEqual([{ localId: 'novo123', customAttributes: '{"admin":true}' }]);
    const perfil = chamadas.find((c) => c.metodo === 'PATCH' && c.url.includes('/profiles/novo123'))!;
    expect(perfil.url).toContain('updateMask.fieldPaths=noticeType');
    expect((perfil.corpo!.fields as Record<string, unknown>).createdAt).toHaveProperty('timestampValue');
  });

  it('informa e-mail já cadastrado', async () => {
    falhaAoCriar = 'EMAIL_EXISTS';
    expect((await POST(pedido({ nome: 'Pessoa', email: 'x@empresa.com', senha: 'Senha@Forte123', tipo: 'analise' }))).status).toBe(409);
  });

  it('troca a senha e inativa encerrando as sessões, sem apagar o restante do perfil', async () => {
    expect((await PATCH(pedido({ acao: 'senha', senha: 'Outra@Senha123' }), paraUid('comum1'))).status).toBe(200);
    expect(atualizacoes()[0]).toMatchObject({ localId: 'comum1', password: 'Outra@Senha123' });
    expect(atualizacoes()[0]).toHaveProperty('validSince');
    chamadas = [];
    expect((await PATCH(pedido({ acao: 'inativar' }), paraUid('comum1'))).status).toBe(200);
    expect(atualizacoes()[0]).toMatchObject({ disableUser: true });
    const perfil = chamadas.find((c) => c.metodo === 'PATCH' && c.url.includes('/profiles/comum1'))!;
    expect(perfil.url).toContain('?updateMask.fieldPaths=ativo');
    expect(perfil.corpo).toEqual({ fields: { ativo: { booleanValue: false } } });
  });

  it('retira a permissão preservando os outros atributos e protege o administrador da configuração', async () => {
    expect((await PATCH(pedido({ acao: 'admin', valor: false }), paraUid('delegado'))).status).toBe(200);
    expect(JSON.parse(String(atualizacoes()[0].customAttributes))).toEqual({ admin: false, outro: 1 });
    logado = 'delegado';
    expect((await PATCH(pedido({ acao: 'inativar' }), paraUid('chefe'))).status).toBe(400);
    expect((await PATCH(pedido({ acao: 'ativar' }), paraUid('naoexiste'))).status).toBe(404);
  });
});
