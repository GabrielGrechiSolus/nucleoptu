import { NextResponse } from 'next/server';
import { ErroBm, BM_BASE, bmConfigurado, chaveDaRequisicao, detalheDoCartao, metaParaCartoes } from '../../_bm';
import { tipoDePerfil, verificaFirebase } from '../../_servidor';
import { montaCartaoBm } from '../../../chamados/bm';
import { PERFIL_SEM_GIT } from '../../../chamados/semgit';

// POST { cardId, chamado, temPr, temEvidencia } -> cartão organizado. Somente leitura no BM.
export async function POST(req: Request) {
  const login = await verificaFirebase(req);
  if (!login.ok) return NextResponse.json({ erro: login.motivo }, { status: 401 });
  const chave = chaveDaRequisicao(req);
  if (!bmConfigurado(chave)) return NextResponse.json({ erro: 'Businessmap não configurado no servidor.' }, { status: 503 });
  const corpo = (await req.json().catch(() => ({}))) as { cardId?: unknown; chamado?: unknown; temPr?: unknown; temEvidencia?: unknown; fresco?: unknown };
  const cardId = Number(corpo.cardId);
  if (!Number.isInteger(cardId) || cardId <= 0) return NextResponse.json({ erro: 'Cartão inválido.' }, { status: 400 });
  try {
    // O cartão é gravado inteiro (com Git) e a tela de Sustentação oculta o Git ao exibir; por isso quem tem perfil Sustentação não grava.
    const perfil = await tipoDePerfil(login.uid ?? '', login.token ?? '');
    if (!perfil.ok || perfil.tipo === PERFIL_SEM_GIT) return NextResponse.json({ erro: 'O perfil Sustentação só visualiza os dados já sincronizados.' }, { status: 403 });
    const { card, comentarios, vinculados } = await detalheDoCartao(chave, cardId, corpo.fresco === true);
    // o cartão precisa ser o do chamado informado (evita usar a rota para ler cartões quaisquer)
    if (corpo.chamado && String(card.custom_id ?? '').replace(/\D/g, '') !== String(corpo.chamado).replace(/\D/g, '')) {
      return NextResponse.json({ erro: 'O cartão não corresponde ao chamado.' }, { status: 400 });
    }
    const meta = await metaParaCartoes(chave, [card, ...vinculados.map((v) => ({ card_id: v.card_id, board_id: card.board_id }))]);
    const cartao = montaCartaoBm(card, comentarios, vinculados, meta, BM_BASE, { temPr: !!corpo.temPr, temEvidencia: !!corpo.temEvidencia });
    return NextResponse.json({ cartao });
  } catch (e) {
    const er = e instanceof ErroBm ? e : null;
    return NextResponse.json({ erro: er?.message ?? 'Falha ao consultar o Businessmap.' }, { status: er?.status && er.status >= 400 ? er.status : 502 });
  }
}
