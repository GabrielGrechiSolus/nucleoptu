import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { exigeVerificacaoEmail } from '../verificacao-email';

// Utilitários das rotas de API (somente servidor).

const exec = promisify(execFile);

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
    const j = (await r.json()) as { users?: { email?: string; localId?: string; emailVerified?: boolean; createdAt?: string }[] };
    if (!j.users?.length) return { ok: false, motivo: 'Login inválido ou expirado. Entre novamente.' };
    if (exigeVerificacaoEmail({ emailVerificado: j.users[0].emailVerified, criadoEm: j.users[0].createdAt ? Number(j.users[0].createdAt) : null })) {
      return { ok: false, motivo: 'Confirme o seu e-mail para usar este recurso.' };
    }
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
  const candidatos = [process.env.GH_PATH, 'gh', 'C:/Program Files/GitHub CLI/gh.exe', 'C:/Program Files (x86)/GitHub CLI/gh.exe', '/usr/local/bin/gh', '/usr/bin/gh'].filter((c): c is string => !!c);
  for (const bin of candidatos) {
    try {
      const { stdout } = await exec(bin, ['auth', 'token'], { timeout: 10000, windowsHide: true });
      tokenCache = stdout.trim();
      if (tokenCache) break;
    } catch {
      tokenCache = '';
    }
  }
  return tokenCache;
}

// Porta de entrada das rotas que usam o GitHub: login do Firebase, perfil diferente de Sustentação e token do servidor.
export type AcessoGit = { ok: true; token: string; email: string } | { ok: false; status: number; erro: string };

export async function exigeGit(req: Request): Promise<AcessoGit> {
  const login = await verificaFirebase(req);
  if (!login.ok) return { ok: false, status: 401, erro: login.motivo ?? 'Entre no sistema.' };
  // Perfil Sustentação não tem acesso ao Git. Sem conseguir confirmar o perfil, nega (fail closed).
  const perfil = await tipoDePerfil(login.uid ?? '', login.token ?? '');
  if (!perfil.ok) return { ok: false, status: 503, erro: 'Não foi possível confirmar o seu perfil agora. Tente novamente.' };
  if (perfil.tipo === 'sustentacao') return { ok: false, status: 403, erro: 'O perfil Sustentação não tem acesso ao Git.' };
  const token = await githubToken();
  if (!token) return { ok: false, status: 503, erro: 'O servidor não tem acesso ao GitHub. Configure GITHUB_TOKEN no .env.local ou entre com `gh auth login` na máquina do servidor.' };
  return { ok: true, token, email: login.email ?? '' };
}

export async function dadosDoPerfil(uid: string, idToken: string): Promise<{ ok: boolean; tipo: string; gitUser: string }> {
  const projeto = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projeto || !uid) return { ok: false, tipo: '', gitUser: '' };
  try {
    const r = await fetch(`https://firestore.googleapis.com/v1/projects/${projeto}/databases/(default)/documents/profiles/${encodeURIComponent(uid)}`, {
      headers: { Authorization: `Bearer ${idToken}` },
      cache: 'no-store',
    });
    if (r.status === 404) return { ok: true, tipo: '', gitUser: '' };
    if (!r.ok) return { ok: false, tipo: '', gitUser: '' };
    const j = (await r.json()) as { fields?: { noticeType?: { stringValue?: string }; gitUser?: { stringValue?: string } } };
    return { ok: true, tipo: j.fields?.noticeType?.stringValue ?? '', gitUser: j.fields?.gitUser?.stringValue ?? '' };
  } catch {
    return { ok: false, tipo: '', gitUser: '' };
  }
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
