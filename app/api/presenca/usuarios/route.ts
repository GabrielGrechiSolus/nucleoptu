import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { adminApp } from '../../_admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Retorna apenas dados de identificação e agenda de home office aos usuários autenticados.
export async function GET(req: Request) {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return NextResponse.json({ erro: 'Entre no sistema para consultar os usuários.' }, { status: 401 });
  const app = adminApp();
  if (!app) return NextResponse.json({ erro: 'A consulta de usuários precisa da credencial Firebase Admin configurada no servidor.' }, { status: 503 });
  try {
    const auth = getAuth(app);
    await auth.verifyIdToken(token, true);
    const firestore = getFirestore(app);
    // A relação oficial da tela /users é profiles; não incluir contas do Auth sem cadastro de perfil no NucleoPTU.
    const snapshot = await firestore.collection('profiles').get();
    const usuarios = snapshot.docs.map(d => {
      const profile = d.data();
      return {
        uid: d.id,
        name: String(profile.name || profile.displayName || profile.email || 'Usuário'),
        email: String(profile.email || ''),
        avatar: String(profile.avatar || ''),
        homeOfficeDays: Array.isArray(profile.homeOfficeDays) ? profile.homeOfficeDays.filter((x: unknown): x is number => Number.isInteger(x) && Number(x) >= 0 && Number(x) <= 6) : [],
      };
    }).sort((a,b) => a.name.localeCompare(b.name, 'pt-BR'));
    return NextResponse.json({ usuarios }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ erro: 'Não foi possível validar a sessão ou carregar os usuários.' }, { status: 401 });
  }
}
