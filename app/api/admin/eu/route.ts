import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { ehAdminBase } from '../../../admin/validacao';
import { ADMINS_BASE, adminApp, adminConfigurado } from '../../_admin';
import { verificaFirebase } from '../../_servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// A tela pergunta se quem está logado é administrador (para mostrar o menu e a página de administração).
// A decisão de verdade é tomada de novo em cada rota de administração.
export async function GET(req: Request) {
  const configurado = adminConfigurado();
  const v = await verificaFirebase(req);
  if (!v.ok) return NextResponse.json({ admin: false, configurado, motivo: v.motivo }, { status: 401 });

  let admin = ehAdminBase(v.email, ADMINS_BASE);
  const app = adminApp();
  if (!admin && app && v.token) {
    try {
      admin = (await getAuth(app).verifyIdToken(v.token)).admin === true;
    } catch {
      admin = false;
    }
  }
  return NextResponse.json({ admin, configurado, email: v.email ?? '' });
}
