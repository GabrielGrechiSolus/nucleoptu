import { execFile } from 'node:child_process';
import os from 'node:os';
import { promisify } from 'node:util';

// Utilitários das rotas de API (somente servidor).

const exec = promisify(execFile);

// ---------- Rede interna ----------
// - O endereço usado no acesso precisa ser: um IP que comece com um dos prefixos de IMPORT_REDE_PREFIXO
//   (padrão: 172.16.81. e 172.16.82., Wi-Fi e cabo), ou um nome de IMPORT_HOSTS (padrão: localhost e o nome deste computador).
// - Quando o IP de origem é informado (x-forwarded-for / x-real-ip), também precisa começar com um dos prefixos
//   ou ser o próprio computador.
// O Next.js não expõe o IP do socket nas rotas; a barreira de rede de verdade é o firewall.
const PREFIXOS_REDE = (process.env.IMPORT_REDE_PREFIXO ?? '172.16.81.,172.16.82.')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);
export const HOSTS_PERMITIDOS = (process.env.IMPORT_HOSTS ?? `localhost,127.0.0.1,[::1],${os.hostname()}`)
  .split(',')
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);
const LOCAIS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const naRede = (ip: string) => PREFIXOS_REDE.some((p) => ip.startsWith(p));

export function origemPermitida(req: Request): { ok: boolean; motivo?: string } {
  // Endereço que a pessoa digitou (cabeçalho Host); req.url pode vir normalizado para o endereço de escuta (0.0.0.0).
  const bruto = (req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? new URL(req.url).host).toLowerCase();
  const host = bruto.startsWith('[') ? bruto.slice(0, bruto.indexOf(']') + 1) : bruto.split(':')[0];
  if (!HOSTS_PERMITIDOS.includes(host) && !naRede(host)) {
    return { ok: false, motivo: `Este recurso só é permitido na rede interna. Acesse pelo endereço do servidor na rede (${PREFIXOS_REDE.map((p) => `${p}x`).join(' ou ')}). Você acessou por ${host}.` };
  }
  const ip = (req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip') ?? '').trim();
  if (ip && !naRede(ip) && !LOCAIS.has(ip)) {
    return { ok: false, motivo: 'Este recurso só é permitido a partir da rede interna.' };
  }
  return { ok: true };
}

// ---------- Login do Firebase ----------
// Valida o ID token enviado em "Authorization: Bearer ..." pela API pública do Firebase (sem SDK de admin).
export async function verificaFirebase(req: Request): Promise<{ ok: boolean; email?: string; uid?: string; token?: string; motivo?: string }> {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ok: false, motivo: 'Entre no sistema para usar este recurso.' };
  const chave = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!chave) return { ok: false, motivo: 'Servidor sem a chave do Firebase para validar o login.' };
  try {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${chave}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: token }),
    });
    if (!r.ok) return { ok: false, motivo: 'Login inválido ou expirado. Entre novamente.' };
    const j = (await r.json()) as { users?: { email?: string; localId?: string }[] };
    if (!j.users?.length) return { ok: false, motivo: 'Login inválido ou expirado. Entre novamente.' };
    return { ok: true, email: j.users[0].email, uid: j.users[0].localId, token };
  } catch {
    return { ok: false, motivo: 'Não foi possível validar o login agora.' };
  }
}

// Tipo do perfil (profiles/{uid}.noticeType) lido pela API REST do Firestore com o próprio login da pessoa,
// então vale a mesma regra de acesso do Firestore. Sem documento de perfil, o tipo é vazio.
export async function tipoDePerfil(uid: string, idToken: string): Promise<{ ok: boolean; tipo: string }> {
  const projeto = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projeto || !uid) return { ok: false, tipo: '' };
  try {
    const r = await fetch(`https://firestore.googleapis.com/v1/projects/${projeto}/databases/(default)/documents/profiles/${encodeURIComponent(uid)}`, {
      headers: { Authorization: `Bearer ${idToken}` },
      cache: 'no-store',
    });
    if (r.status === 404) return { ok: true, tipo: '' };
    if (!r.ok) return { ok: false, tipo: '' };
    const j = (await r.json()) as { fields?: { noticeType?: { stringValue?: string } } };
    return { ok: true, tipo: j.fields?.noticeType?.stringValue ?? '' };
  } catch {
    return { ok: false, tipo: '' };
  }
}

// ---------- GitHub ----------
// Token somente leitura: GITHUB_TOKEN no .env.local ou, na máquina de quem roda o sistema, o do GitHub CLI (gh auth login).
let tokenCache = '';
export async function githubToken(): Promise<string> {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (tokenCache) return tokenCache;
  try {
    const { stdout } = await exec('gh', ['auth', 'token'], { timeout: 10000, windowsHide: true });
    tokenCache = stdout.trim();
  } catch {
    tokenCache = '';
  }
  return tokenCache;
}

export class ErroGithub extends Error {
  constructor(public status: number, mensagem: string) {
    super(mensagem);
  }
}

export async function githubGet<T>(caminho: string, token: string): Promise<T> {
  const r = await fetch(`https://api.github.com${caminho}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'nucleoptu' },
    cache: 'no-store',
  });
  if (!r.ok) {
    const msg = r.status === 404 ? 'Não encontrado no GitHub.' : r.status === 401 ? 'Token do GitHub inválido ou expirado.' : r.status === 403 || r.status === 429 ? 'Limite de consultas do GitHub atingido ou acesso negado. Tente novamente em instantes.' : `Erro do GitHub (${r.status}).`;
    throw new ErroGithub(r.status, msg);
  }
  return (await r.json()) as T;
}
