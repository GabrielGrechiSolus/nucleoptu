import { NextResponse } from 'next/server';
import { ehAdminBase, listaAdmins } from '../../../admin/validacao';
import { contasDoAmbiente } from '../../_contas';
import { verificaFirebase } from '../../_servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const v = await verificaFirebase(req);
  const configuradoBase = !!(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
  if (!v.ok) return NextResponse.json({ admin: false, configurado: configuradoBase, motivo: v.motivo }, { status: 401 });

  let admin = ehAdminBase(v.email, listaAdmins(process.env.ADMIN_EMAILS));
  if (!admin && v.uid) {
    try {
      admin = (await contasDoAmbiente()?.buscar(v.uid))?.atributos.admin === true;
    } catch {
      admin = false;
    }
  }
  return NextResponse.json({ admin, configurado: configuradoBase, email: v.email ?? '' });
}
