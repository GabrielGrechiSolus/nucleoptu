const FOLGA_MS = 60_000;
const VALIDADE_SEM_EXP_MS = 10 * 60_000;
const PAUSA_APOS_RECUSA_MS = 5 * 60_000;

interface Sessao { token: string; ate: number }

let sessao: Sessao | null = null;
let entrando: Promise<Sessao> | null = null;
let recusa: { ate: number; erro: Error } | null = null;

const falha = (mensagem: string) => Object.assign(new Error(mensagem), { status: 502 });

export function relatusConfigurado(): boolean {
  return Boolean(process.env.RELATUS_LOGIN && process.env.RELATUS_SENHA);
}

export function esqueceSessaoRelatus(): void {
  sessao = null;
  entrando = null;
  recusa = null;
}

function validade(token: string): number {
  try {
    const { exp } = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8')) as { exp?: number };
    if (exp) return exp * 1000 - FOLGA_MS;
  } catch {}
  return Date.now() + VALIDADE_SEM_EXP_MS;
}

async function entra(base: string): Promise<Sessao> {
  const resposta = await fetch(`${base}/v1/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ login: process.env.RELATUS_LOGIN, senha: process.env.RELATUS_SENHA }),
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(20_000),
  });
  const corpo = (await resposta.json().catch(() => ({}))) as { token?: string; mensagem?: string };
  if (resposta.ok && corpo.token) return { token: corpo.token, ate: validade(corpo.token) };
  const erro = falha(`O Relatus recusou o login configurado (HTTP ${resposta.status} em ${base}/v1/login). ${corpo.mensagem ?? ''}`.trim());
  if (resposta.status >= 400 && resposta.status < 500) recusa = { ate: Date.now() + PAUSA_APOS_RECUSA_MS, erro };
  throw erro;
}

async function tokenAtual(base: string): Promise<string> {
  if (sessao && sessao.ate > Date.now()) return sessao.token;
  if (recusa && recusa.ate > Date.now()) throw recusa.erro;
  entrando ??= entra(base).finally(() => { entrando = null; });
  sessao = await entrando;
  return sessao.token;
}

const naoAutorizado = (erro: unknown) => (erro as { status?: number })?.status === 401;

export async function comTokenRelatus<T>(base: string, consulta: (token: string) => Promise<T>): Promise<T> {
  const raiz = base.replace(/\/$/, '');
  const token = await tokenAtual(raiz);
  try {
    return await consulta(token);
  } catch (erro) {
    if (!naoAutorizado(erro)) throw erro;
  }
  if (sessao?.token === token) sessao = null;
  try {
    return await consulta(await tokenAtual(raiz));
  } catch (erro) {
    if (!naoAutorizado(erro)) throw erro;
    sessao = null;
    throw falha('O Relatus recusou o token gerado para a consulta.');
  }
}
