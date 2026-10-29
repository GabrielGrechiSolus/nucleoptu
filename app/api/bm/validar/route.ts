import { NextResponse } from 'next/server';
import { ErroBm, bmEu } from '../../_bm';
import { verificaFirebase } from '../../_servidor';

// Confere a chave informada no perfil com uma consulta ao BM (GET /me) e devolve o nome do dono. Não grava a chave.
export async function POST(req: Request) {
  const login = await verificaFirebase(req);
  if (!login.ok) return NextResponse.json({ erro: login.motivo }, { status: 401 });
  const chave = (req.headers.get('x-bm-key') ?? '').trim();
  if (!chave) return NextResponse.json({ erro: 'Informe a chave.' }, { status: 400 });
  try {
    return NextResponse.json({ usuario: await bmEu(chave) });
  } catch (e) {
    const er = e instanceof ErroBm ? e : null;
    return NextResponse.json({ erro: er?.message ?? 'Não foi possível validar a chave.' }, { status: er?.status && er.status >= 400 ? er.status : 502 });
  }
}
