import { bancoDoAmbiente, type Db } from '../_firestore';
import { verificaFirebase } from '../_servidor';
import { ehAgenteBloqueado, mesmaOrigem } from '../../seguranca';

export const COLECAO_CONEXOES = 'clientes_conexoes';
export const COLECAO_AUDITORIA = 'auditoria_conexoes';

export type Acesso = { ok: true; uid: string; email: string; db: Db } | { ok: false; status: number; erro: string };

export async function exigeConexoes(req: Request): Promise<Acesso> {
  if (ehAgenteBloqueado(req.headers.get('user-agent'))) return { ok: false, status: 403, erro: 'Acesso negado.' };
  if (req.method !== 'GET' && !mesmaOrigem(req.headers.get('origin'), req.headers.get('host'), req.headers.get('x-forwarded-host'))) {
    return { ok: false, status: 403, erro: 'Origem não permitida.' };
  }
  const login = await verificaFirebase(req);
  if (!login.ok || !login.uid) return { ok: false, status: 401, erro: login.motivo ?? 'Entre no sistema.' };
  const db = bancoDoAmbiente();
  if (!db) return { ok: false, status: 503, erro: 'O cadastro de conexões precisa da chave do Firebase Admin configurada no servidor (FIREBASE_SERVICE_ACCOUNT_JSON).' };
  return { ok: true, uid: login.uid, email: login.email ?? '', db };
}

export const respostaSegura = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, max-age=0',
      'X-Robots-Tag': 'noindex, nofollow, noarchive, noai, noimageai',
      'X-Content-Type-Options': 'nosniff',
    },
  });

export const falhaInterna = (e: unknown) => {
  console.error('Falha em /api/conexoes:', e);
  const codigo = String((e as { code?: unknown })?.code ?? '');
  return respostaSegura({ erro: `Falha ao acessar o banco de dados${codigo ? ` (código ${codigo})` : ''}. Tente novamente; se persistir, avise o administrador.` }, 500);
};

export async function audita(db: Db, por: string, acao: string, dados: Record<string, unknown>) {
  await db
    .collection(COLECAO_AUDITORIA)
    .add({ em: new Date().toISOString(), por, acao, ...dados })
    .catch(() => undefined);
}
