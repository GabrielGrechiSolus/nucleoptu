import { NextResponse } from 'next/server';
import { ehAdminBase, listaAdmins } from '../../../admin/validacao';
import { verificaFirebase } from '../../_servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const v = await verificaFirebase(req);
  const configuradoBase = !!(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
  if (!v.ok) return NextResponse.json({ admin: false, configurado: configuradoBase, motivo: v.motivo }, { status: 401 });

  let admin = ehAdminBase(v.email, listaAdmins(process.env.ADMIN_EMAILS));
  let configurado = configuradoBase;
  if (!admin && configuradoBase && v.token) {
    try {
      const { adminApp, adminConfigurado } = await import('../../_admin');
      const { getAuth } = await import('firebase-admin/auth');
      configurado = adminConfigurado();
      const app = adminApp();
      if (app) admin = (await getAuth(app).verifyIdToken(v.token)).admin === true;
    } catch {
      admin = false;
    }
  }
  return NextResponse.json({ admin, configurado, email: v.email ?? '' });
}
