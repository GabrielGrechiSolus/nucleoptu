import { NextResponse } from 'next/server';
import { BM_BASE, ErroBm, bmConfigurado, cartoesDoQuadroBm, chaveDaRequisicao, metaParaCartoes } from '../../_bm';
import { verificaFirebase } from '../../_servidor';
import { numeroDoChamado, type CartaoQuadro } from '../../../chamados/bmQuadro';
import { urlDoCartao } from '../../../chamados/bm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BOARDS = (process.env.BM_BOARD_IDS ?? '45')
  .split(',')
  .map((b) => Number(b.trim()))
  .filter((b) => Number.isInteger(b) && b > 0);

export async function POST(req: Request) {
  const login = await verificaFirebase(req);
  if (!login.ok) return NextResponse.json({ erro: login.motivo }, { status: 401 });
  const chave = chaveDaRequisicao(req);
  if (!bmConfigurado(chave)) return NextResponse.json({ erro: 'Informe a sua chave do Businessmap em Perfil → Businessmap.' }, { status: 400 });
  try {
    const brutos = await cartoesDoQuadroBm(chave, BOARDS, true);
    const meta = await metaParaCartoes(chave, brutos);
    const cartoes: CartaoQuadro[] = brutos.map((c) => ({
      cardId: c.card_id,
      customId: String(c.custom_id ?? ''),
      numero: numeroDoChamado(c.custom_id, c.title),
      titulo: c.title ?? '',
      tipoId: c.type_id ?? null,
      tipo: c.type_id ? meta.tipos[c.type_id] ?? '' : '',
      colunaId: c.column_id ?? 0,
      coluna: c.column_id ? meta.colunas[c.column_id]?.nome ?? '' : '',
      secao: c.section ?? 0,
      ownerId: c.owner_user_id ?? null,
      responsavel: c.owner_user_id ? meta.usuarios[c.owner_user_id] ?? '' : '',
      bloqueado: !!c.is_blocked,
      prioridade: c.priority ?? null,
      prazo: c.deadline ?? '',
      criadoEm: c.created_at ?? '',
      atualizadoEm: c.last_modified ?? '',
      naColunaDesde: c.in_current_position_since ?? '',
      boardId: c.board_id ?? 0,
      url: urlDoCartao(BM_BASE, c.board_id, c.card_id),
    }));
    return NextResponse.json({ cartoes });
  } catch (e) {
    const er = e instanceof ErroBm ? e : null;
    return NextResponse.json({ erro: er?.message ?? 'Falha ao consultar o Businessmap.' }, { status: er?.status && er.status >= 400 ? er.status : 502 });
  }
}
