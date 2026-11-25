import { NextResponse } from 'next/server';
import { verificaFirebase } from '../../_servidor';
import { revisoesPublicadas } from '../revisao/fonte';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const login = await verificaFirebase(req);
  if (!login.ok) return NextResponse.json({ erro: login.motivo }, { status: 401 });
  const dados = await revisoesPublicadas();
  const semDadosPorFalha = dados.reposConsultados === 0;
  return NextResponse.json({ ...dados, geradoEm: new Date().toISOString() }, { status: semDadosPorFalha ? 502 : 200 });
}
