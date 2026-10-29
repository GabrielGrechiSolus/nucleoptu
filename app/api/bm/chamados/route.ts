import { NextResponse } from 'next/server';
import { ErroBm, BM_BASE, bmConfigurado, chaveDaRequisicao, cartoesPorChamados, metaParaCartoes } from '../../_bm';
import { verificaFirebase } from '../../_servidor';
import { resumoDoCartao, type BmResumoLista } from '../../../chamados/bm';

// POST { chamados: ["568361", ...] } -> { configurado, cartoes: { "568361": resumo } }. Somente leitura no BM.
export async function POST(req: Request) {
  const login = await verificaFirebase(req);
  if (!login.ok) return NextResponse.json({ erro: login.motivo }, { status: 401 });
  const chave = chaveDaRequisicao(req);
  if (!bmConfigurado(chave)) return NextResponse.json({ configurado: false, cartoes: {} });
  const corpo = (await req.json().catch(() => ({}))) as { chamados?: unknown; fresco?: unknown };
  const numeros = (Array.isArray(corpo.chamados) ? corpo.chamados : []).map(String).slice(0, 400);
  try {
    const brutos = await cartoesPorChamados(chave, numeros, corpo.fresco === true);
    const meta = await metaParaCartoes(chave, brutos);
    const cartoes: Record<string, BmResumoLista> = {};
    for (const c of brutos) if (c.custom_id) cartoes[String(c.custom_id)] = resumoDoCartao(c, meta, BM_BASE);
    return NextResponse.json({ configurado: true, cartoes });
  } catch (e) {
    const er = e instanceof ErroBm ? e : null;
    return NextResponse.json({ erro: er?.message ?? 'Falha ao consultar o Businessmap.' }, { status: er?.status && er.status >= 400 ? er.status : 502 });
  }
}
