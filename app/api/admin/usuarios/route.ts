import { NextResponse } from 'next/server';
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
  let etapa = 'leitura dos perfis no Firestore';
  try {
    const perfis = new Map<string, { name?: string; noticeType?: string }>();
    (await a.db.collection('profiles').get()).docs.forEach((d) => perfis.set(d.id, d.data() as { name?: string; noticeType?: string }));

    etapa = 'listagem de usuários no Firebase Authentication';
    const usuarios: UsuarioAdmin[] = (await a.contas.listar()).map((u) => {
      const p = perfis.get(u.uid);
      const adminBase = ehAdminBase(u.email, ADMINS_BASE);
      return {
        uid: u.uid,
        email: u.email,
        nome: p?.name || u.nome || u.email.split('@')[0],
        tipo: p?.noticeType ?? '',
        admin: adminBase || u.atributos.admin === true,
        adminBase,
        inativo: u.inativo,
        criadoEm: u.criadoEm,
        ultimoAcesso: u.ultimoAcesso,
      };
    });
    usuarios.sort((x, y) => x.nome.localeCompare(y.nome, 'pt-BR'));
    return NextResponse.json({ usuarios });
  } catch (e) {
    const erro = e as { code?: string; message?: string };
    console.error('[admin/usuarios] Falha na etapa:', etapa, erro.code ?? 'sem código', erro.message ?? e);
    if (etapa.includes('Authentication') && /permission|403/i.test(`${erro.code ?? ''} ${erro.message ?? ''}`)) {
      return NextResponse.json({ erro: 'A conta de serviço do Firebase não tem permissão para listar usuários no Authentication. Revise as permissões da credencial do Admin no projeto Firebase.', codigo: erro.code }, { status: 503 });
    }
    return NextResponse.json({ erro: `Falha na ${etapa}${erro.code ? ` (${erro.code})` : ''}. Confira os logs do servidor para ver a causa.` }, { status: 502 });
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
    const nome = (dados.nome as string).trim();
    const uid = await a.contas.criar({ email, senha: dados.senha as string, nome });
    if (dados.admin) await a.contas.atualizar(uid, { atributos: { admin: true } });
    await a.db.collection('profiles').doc(uid).set(
      { name: nome, email, noticeType: dados.tipo, ativo: true, createdAt: new Date(), criadoPor: a.email },
      { merge: true },
    );
    await a.db.collection('auditoria_admin').add({ em: new Date().toISOString(), por: a.email, acao: 'criar-usuario', uid, email, admin: !!dados.admin }).catch(() => undefined);
    return NextResponse.json({ uid, email }, { status: 201 });
  } catch (e) {
    const codigo = (e as { code?: string }).code ?? '';
    if (codigo === 'EMAIL_EXISTS' || codigo === 'DUPLICATE_EMAIL') return NextResponse.json({ erro: 'Já existe um usuário com esse e-mail.' }, { status: 409 });
    if (codigo === 'WEAK_PASSWORD' || codigo === 'INVALID_PASSWORD') return NextResponse.json({ erro: 'Senha inválida para o Firebase.' }, { status: 400 });
    console.error(e);
    return NextResponse.json({ erro: 'Não foi possível cadastrar o usuário.' }, { status: 500 });
  }
}
