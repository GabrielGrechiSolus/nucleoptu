import { NextResponse } from 'next/server';
import { verificaFirebase } from '../../../_servidor';
import { ultimaRevisaoGlobal } from '../fonte';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const login = await verificaFirebase(req);
  if (!login.ok) return NextResponse.json({ erro: login.motivo }, { status: 401 });
  const ultima = await ultimaRevisaoGlobal();
  return NextResponse.json({ ultima, previsao: ultima ? ultima + 1 : null });
}
