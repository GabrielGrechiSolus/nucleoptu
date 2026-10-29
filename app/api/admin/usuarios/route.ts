import { NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { ehAdminBase, normalizaEmail, validaNovoUsuario, type NovoUsuario } from '../../../admin/validacao';
import { ADMINS_BASE, exigeAdmin } from '../../_admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface UsuarioAdmin {
  uid: string;
  email: string;
  nome: string;
  tipo: string;
  admin: boolean;
  adminBase: boolean; // administrador pela configuração do servidor (não pode ser removido pela tela)
  inativo: boolean;
  criadoEm: string;
  ultimoAcesso: string;
}

// Lista todos os usuários do Firebase Authentication com os dados do perfil.
export async function GET(req: Request) {
  const a = await exigeAdmin(req);
  if (!a.ok) return NextResponse.json({ erro: a.erro }, { status: a.status });
  try {
    const auth = getAuth(a.app);
    const perfis = new Map<string, { name?: string; noticeType?: string }>();
    (await getFirestore(a.app).collection('profiles').get()).forEach((d) => perfis.set(d.id, d.data() as { name?: string; noticeType?: string }));

    const usuarios: UsuarioAdmin[] = [];
    let token: string | undefined;
    do {
      const pagina = await auth.listUsers(1000, token);
      for (const u of pagina.users) {
        const p = perfis.get(u.uid);
        const adminBase = ehAdminBase(u.email, ADMINS_BASE);
        usuarios.push({
          uid: u.uid,
          email: u.email ?? '',
          nome: p?.name || u.displayName || (u.email ?? '').split('@')[0],
          tipo: p?.noticeType ?? '',
          admin: adminBase || (u.customClaims as { admin?: boolean } | undefined)?.admin === true,
          adminBase,
          inativo: u.disabled,
          criadoEm: u.metadata.creationTime ?? '',
          ultimoAcesso: u.metadata.lastSignInTime ?? '',
        });
      }
      token = pagina.pageToken;
    } while (token);
    usuarios.sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'));
    return NextResponse.json({ usuarios });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ erro: 'Não foi possível listar os usuários.' }, { status: 500 });
  }
}

// Cadastra um novo usuário (único caminho de cadastro: não existe mais cadastro antes do login).
export async function POST(req: Request) {
  const a = await exigeAdmin(req);
  if (!a.ok) return NextResponse.json({ erro: a.erro }, { status: a.status });

  let dados: Partial<NovoUsuario>;
  try {
    dados = (await req.json()) as Partial<NovoUsuario>;
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 });
  }
  const problema = validaNovoUsuario(dados);
  if (problema) return NextResponse.json({ erro: problema }, { status: 400 });

  const email = normalizaEmail(dados.email as string);
  try {
    const auth = getAuth(a.app);
    const u = await auth.createUser({ email, password: dados.senha as string, displayName: (dados.nome as string).trim() });
    if (dados.admin) await auth.setCustomUserClaims(u.uid, { admin: true });
    const db = getFirestore(a.app);
    await db.collection('profiles').doc(u.uid).set(
      { name: (dados.nome as string).trim(), email, noticeType: dados.tipo, ativo: true, createdAt: new Date(), criadoPor: a.email },
      { merge: true },
    );
    await db.collection('auditoria_admin').add({ em: new Date().toISOString(), por: a.email, acao: 'criar-usuario', uid: u.uid, email, admin: !!dados.admin }).catch(() => undefined);
    return NextResponse.json({ uid: u.uid, email }, { status: 201 });
  } catch (e) {
    const codigo = (e as { code?: string }).code ?? '';
    if (codigo === 'auth/email-already-exists') return NextResponse.json({ erro: 'Já existe um usuário com esse e-mail.' }, { status: 409 });
    if (codigo === 'auth/invalid-password') return NextResponse.json({ erro: 'Senha inválida para o Firebase.' }, { status: 400 });
    console.error(e);
    return NextResponse.json({ erro: 'Não foi possível cadastrar o usuário.' }, { status: 500 });
  }
}
