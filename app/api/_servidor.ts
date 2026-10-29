import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

// Utilitários das rotas de API (somente servidor).

const exec = promisify(execFile);

// ---------- Rede interna ----------
// - O endereço usado no acesso precisa estar em IMPORT_HOSTS (padrão: 172.16.81.235 e localhost).
// - Quando o IP de origem é informado (x-forwarded-for / x-real-ip), precisa começar com IMPORT_REDE_PREFIXO
//   (padrão: 172.16.81.) ou ser o próprio computador.
// O Next.js não expõe o IP do socket nas rotas; a barreira de rede de verdade é o firewall.
export const HOSTS_PERMITIDOS = (process.env.IMPORT_HOSTS ?? '172.16.81.235,localhost,127.0.0.1,[::1]')
  .split(',')
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);
const REDE_PREFIXO = process.env.IMPORT_REDE_PREFIXO ?? '172.16.81.';
const LOCAIS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

export function origemPermitida(req: Request): { ok: boolean; motivo?: string } {
  // Endereço que a pessoa digitou (cabeçalho Host); req.url pode vir normalizado para o endereço de escuta (0.0.0.0).
  const bruto = (req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? new URL(req.url).host).toLowerCase();
  const host = bruto.startsWith('[') ? bruto.slice(0, bruto.indexOf(']') + 1) : bruto.split(':')[0];
  if (!HOSTS_PERMITIDOS.includes(host)) {
    return { ok: false, motivo: `Este recurso só é permitido na rede interna. Acesse por http://${HOSTS_PERMITIDOS[0]}.` };
  }
  const ip = (req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip') ?? '').trim();
  if (ip && !ip.startsWith(REDE_PREFIXO) && !LOCAIS.has(ip)) {
    return { ok: false, motivo: 'Este recurso só é permitido a partir da rede interna.' };
  }
  return { ok: true };
}

// ---------- Login do Firebase ----------
// Valida o ID token enviado em "Authorization: Bearer ..." pela API pública do Firebase (sem SDK de admin).
export async function verificaFirebase(req: Request): Promise<{ ok: boolean; email?: string; motivo?: string }> {
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
    const j = (await r.json()) as { users?: { email?: string }[] };
    if (!j.users?.length) return { ok: false, motivo: 'Login inválido ou expirado. Entre novamente.' };
    return { ok: true, email: j.users[0].email };
  } catch {
    return { ok: false, motivo: 'Não foi possível validar o login agora.' };
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
