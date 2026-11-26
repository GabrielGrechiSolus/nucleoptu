import { arrumaChavePrivada, credencial } from './_credencial';
import { contasDoAmbiente, type Contas } from './_contas';
import { bancoDoAmbiente, type Db } from './_firestore';
import { verificaFirebase } from './_servidor';
import { ehAdminBase, listaAdmins } from '../admin/validacao';

// Administração de usuários (somente servidor), pelas APIs REST do Firebase com uma chave de serviço:
//   FIREBASE_SERVICE_ACCOUNT_PATH = caminho do arquivo .json da chave (fora do Git), ou
//   FIREBASE_SERVICE_ACCOUNT_JSON = o conteúdo do .json em uma variável.
// Administradores: e-mails em ADMIN_EMAILS (padrão gabriel.grechi@solus.inf.br) e quem tem a permissão "admin"
// concedida por outro administrador (custom claim do Firebase, que só o servidor consegue gravar).
// Não usar o pacote firebase-admin: ele não carrega na Vercel.

export const ADMINS_BASE = listaAdmins(process.env.ADMIN_EMAILS);

export { arrumaChavePrivada, credencial };

export const adminConfigurado = () => credencial() !== null;

export type ResultadoAdmin =
  | { ok: true; contas: Contas; db: Db; uid: string; email: string }
  | { ok: false; status: number; erro: string };

// Momento (em segundos) do login que gerou o token. Só é lido depois de o Firebase validar o token.
function momentoDoLogin(token: string): number {
  try {
    const carga = token.split('.').at(1) ?? '';
    const p = JSON.parse(Buffer.from(carga, 'base64url').toString('utf8')) as { auth_time?: number; iat?: number };
    return Number(p.auth_time ?? p.iat ?? 0);
  } catch {
    return 0;
  }
}

// Exige login válido (não revogado) e perfil de administrador.
export async function exigeAdmin(req: Request): Promise<ResultadoAdmin> {
  const contas = contasDoAmbiente();
  const db = bancoDoAmbiente();
  if (!contas || !db) {
    return { ok: false, status: 503, erro: 'A administração de usuários ainda não foi configurada no servidor (chave do Firebase Admin).' };
  }
  const login = await verificaFirebase(req);
  if (!login.ok || !login.uid || !login.token) return { ok: false, status: 401, erro: login.motivo ?? 'Entre no sistema para usar este recurso.' };

  // A permissão é lida da conta atual, não do token: quem perdeu o acesso é barrado na hora.
  let conta;
  try {
    conta = await contas.buscar(login.uid);
  } catch (e) {
    console.error('[admin] Falha ao consultar a conta:', e);
    return { ok: false, status: 503, erro: `Não foi possível confirmar a sua permissão (${(e as { code?: string }).code ?? 'erro'}). Confira a credencial do servidor.` };
  }
  if (!conta || conta.inativo || momentoDoLogin(login.token) < conta.validoDesde) {
    return { ok: false, status: 401, erro: 'Login inválido ou expirado. Entre novamente.' };
  }
  if (!(ehAdminBase(conta.email, ADMINS_BASE) || conta.atributos.admin === true)) {
    return { ok: false, status: 403, erro: 'Apenas administradores podem usar este recurso.' };
  }
  return { ok: true, contas, db, uid: conta.uid, email: conta.email };
}
