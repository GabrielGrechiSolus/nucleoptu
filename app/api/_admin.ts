import fs from 'node:fs';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { ehAdminBase, listaAdmins } from '../admin/validacao';

// Administração de usuários (somente servidor). Usa o Firebase Admin SDK com uma chave de serviço:
//   FIREBASE_SERVICE_ACCOUNT_PATH = caminho do arquivo .json da chave (fora do Git), ou
//   FIREBASE_SERVICE_ACCOUNT_JSON = o conteúdo do .json em uma variável.
// Administradores: e-mails em ADMIN_EMAILS (padrão gabriel.grechi@solus.inf.br) e quem tem a permissão "admin"
// concedida por outro administrador (custom claim do Firebase, que só o servidor consegue gravar).

export const ADMINS_BASE = listaAdmins(process.env.ADMIN_EMAILS);

function credencial(): Record<string, unknown> | null {
  try {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (json) return JSON.parse(json);
    const caminho = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (caminho && fs.existsSync(caminho)) return JSON.parse(fs.readFileSync(caminho, 'utf8'));
  } catch {
    return null;
  }
  return null;
}

export const adminConfigurado = () => credencial() !== null;

export function adminApp(): App | null {
  const existente = getApps().find((a) => a.name === 'nucleoptu-admin');
  if (existente) return existente;
  const c = credencial();
  if (!c) return null;
  return initializeApp({ credential: cert(c as Parameters<typeof cert>[0]) }, 'nucleoptu-admin');
}

export type ResultadoAdmin =
  | { ok: true; app: App; uid: string; email: string; claims: DecodedIdToken }
  | { ok: false; status: number; erro: string };

// Exige login válido (não revogado) e perfil de administrador.
export async function exigeAdmin(req: Request): Promise<ResultadoAdmin> {
  const app = adminApp();
  if (!app) {
    return { ok: false, status: 503, erro: 'A administração de usuários ainda não foi configurada no servidor (chave do Firebase Admin).' };
  }
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return { ok: false, status: 401, erro: 'Entre no sistema para usar este recurso.' };
  try {
    const claims = await getAuth(app).verifyIdToken(token, true);
    const email = claims.email ?? '';
    if (!(ehAdminBase(email, ADMINS_BASE) || claims.admin === true)) {
      return { ok: false, status: 403, erro: 'Apenas administradores podem usar este recurso.' };
    }
    return { ok: true, app, uid: claims.uid, email, claims };
  } catch {
    return { ok: false, status: 401, erro: 'Login inválido ou expirado. Entre novamente.' };
  }
}
