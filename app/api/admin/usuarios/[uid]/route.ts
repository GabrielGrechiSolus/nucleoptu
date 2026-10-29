import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { ehAdminBase, validaSenha } from '../../../../admin/validacao';
import { ADMINS_BASE, exigeAdmin } from '../../../_admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Corpo = { acao?: 'senha' | 'inativar' | 'ativar' | 'admin'; senha?: string; valor?: boolean };

// Ações de administração sobre um usuário: trocar a senha, inativar, reativar e conceder ou retirar a permissão de administrador.
export async function PATCH(req: Request, ctx: { params: Promise<{ uid: string }> }) {
  const a = await exigeAdmin(req);
  if (!a.ok) return NextResponse.json({ erro: a.erro }, { status: a.status });
  const { uid } = await ctx.params;
  if (!/^[A-Za-z0-9_-]{6,128}$/.test(uid)) return NextResponse.json({ erro: 'Usuário inválido.' }, { status: 400 });

  let corpo: Corpo;
  try {
    corpo = (await req.json()) as Corpo;
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 });
  }

  const auth = getAuth(a.app);
  const db = getFirestore(a.app);
  try {
    const alvo = await auth.getUser(uid);
    const registra = (acao: string, extra: Record<string, unknown> = {}) =>
      db.collection('auditoria_admin').add({ em: new Date().toISOString(), por: a.email, acao, uid, email: alvo.email ?? '', ...extra }).catch(() => undefined);

    switch (corpo.acao) {
      case 'senha': {
        const problema = validaSenha(corpo.senha ?? '');
        if (problema) return NextResponse.json({ erro: problema }, { status: 400 });
        await auth.updateUser(uid, { password: corpo.senha as string });
        await auth.revokeRefreshTokens(uid); // encerra as sessões abertas com a senha antiga
        await registra('trocar-senha');
        return NextResponse.json({ ok: true });
      }
      case 'inativar': {
        if (uid === a.uid) return NextResponse.json({ erro: 'Você não pode inativar o seu próprio usuário.' }, { status: 400 });
        if (ehAdminBase(alvo.email, ADMINS_BASE)) return NextResponse.json({ erro: 'Administradores da configuração do servidor não podem ser inativados.' }, { status: 400 });
        await auth.updateUser(uid, { disabled: true });
        await auth.revokeRefreshTokens(uid);
        await db.collection('profiles').doc(uid).set({ ativo: false }, { merge: true });
        await registra('inativar');
        return NextResponse.json({ ok: true });
      }
      case 'ativar': {
        await auth.updateUser(uid, { disabled: false });
        await db.collection('profiles').doc(uid).set({ ativo: true }, { merge: true });
        await registra('ativar');
        return NextResponse.json({ ok: true });
      }
      case 'admin': {
        const valor = corpo.valor === true;
        if (!valor && uid === a.uid) return NextResponse.json({ erro: 'Você não pode retirar a sua própria permissão de administrador.' }, { status: 400 });
        if (!valor && ehAdminBase(alvo.email, ADMINS_BASE)) return NextResponse.json({ erro: 'Este administrador vem da configuração do servidor (ADMIN_EMAILS).' }, { status: 400 });
        await auth.setCustomUserClaims(uid, { ...(alvo.customClaims ?? {}), admin: valor });
        await auth.revokeRefreshTokens(uid); // a nova permissão vale no próximo login
        await registra(valor ? 'conceder-admin' : 'retirar-admin');
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ erro: 'Ação inválida.' }, { status: 400 });
    }
  } catch (e) {
    const codigo = (e as { code?: string }).code ?? '';
    if (codigo === 'auth/user-not-found') return NextResponse.json({ erro: 'Usuário não encontrado.' }, { status: 404 });
    console.error(e);
    return NextResponse.json({ erro: 'Não foi possível concluir a ação.' }, { status: 500 });
  }
}
