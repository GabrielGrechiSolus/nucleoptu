import { NextResponse } from 'next/server';
import { ErroBm, bmEscreve, camposDoBm, camposDoQuadroBm, checklistDaColunaBm, checklistMarcadoBm, colunasDoQuadroBm, detalheDoCartao, type MetodoEscrita } from '../../_bm';
import { dadosDoPerfil, verificaFirebase } from '../../_servidor';
import { htmlParaTexto } from '../../../chamados/bm';
import { PERFIL_SEM_GIT } from '../../../chamados/semgit';
import { CAMPOS_AUTOMATICOS, anexaLinksNaDescricao, campoPorNome, textoParaHtml, type LinkGit } from '../../../processos/automacao';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const usuariosLiberados = () =>
  (process.env.BM_ESCRITA_GIT_USERS ?? 'GabrielGrechiSolus')
    .split(',')
    .map((u) => u.trim().toLowerCase())
    .filter(Boolean);

type Acesso = { ok: true; chave: string; email: string } | { ok: false; status: number; erro: string };

async function autoriza(req: Request): Promise<Acesso> {
  const login = await verificaFirebase(req);
  if (!login.ok) return { ok: false, status: 401, erro: login.motivo ?? 'Entre no sistema.' };
  const perfil = await dadosDoPerfil(login.uid ?? '', login.token ?? '');
  if (!perfil.ok) return { ok: false, status: 503, erro: 'Não foi possível confirmar o seu perfil agora.' };
  if (perfil.tipo === PERFIL_SEM_GIT) return { ok: false, status: 403, erro: 'O perfil Sustentação não tem acesso a este recurso.' };
  if (!perfil.gitUser || !usuariosLiberados().includes(perfil.gitUser.toLowerCase())) {
    return { ok: false, status: 403, erro: 'Recurso experimental liberado apenas para usuários Git autorizados.' };
  }
  const chave = (req.headers.get('x-bm-key') ?? '').trim();
  if (!chave) return { ok: false, status: 400, erro: 'Informe a sua chave do Businessmap em Perfil → Businessmap.' };
  return { ok: true, chave, email: login.email ?? '' };
}

export async function GET(req: Request) {
  const a = await autoriza(req);
  return NextResponse.json({ permitido: a.ok, motivo: a.ok ? '' : a.erro }, { status: a.ok || a.status !== 401 ? 200 : 401 });
}

type Mudanca =
  | { tipo: 'campo'; campo: string; valor: string }
  | { tipo: 'checklist'; itemId: number; comentario?: string }
  | { tipo: 'descricao'; links: LinkGit[] }
  | { tipo: 'comentario'; texto: string }
  | { tipo: 'mover'; colunaId: number };

interface Requisicao {
  metodo: MetodoEscrita;
  caminho: string;
  corpo?: unknown;
  descricao: string;
}

const soDigitos = (x: unknown) => String(x ?? '').replace(/\D/g, '');

async function lerEstado(chave: string, cardId: number, chamado: string) {
  const { card } = await detalheDoCartao(chave, cardId, true);
  if (soDigitos(card.custom_id) !== soDigitos(chamado)) throw new ErroBm(400, 'O cartão não corresponde ao chamado.');
  const boardId = Number(card.board_id);
  const colunaId = Number(card.column_id);
  const [colunas, itens, marcados, campos, noQuadro] = await Promise.all([colunasDoQuadroBm(chave, boardId), checklistDaColunaBm(chave, boardId, colunaId), checklistMarcadoBm(chave, cardId), camposDoBm(chave), camposDoQuadroBm(chave, boardId)]);
  const valores = new Map<number, string>();
  for (const f of card.custom_fields ?? []) valores.set(f.field_id, f.value === undefined || f.value === null ? '' : htmlParaTexto(String(f.value)));
  const camposAuto = CAMPOS_AUTOMATICOS.map((d) => {
    const def = campos.find((c) => d.padrao.test(c.nome));
    return { chave: d.chave, rotulo: d.rotulo, id: def?.id ?? null, tipo: def?.tipo ?? '', disponivel: !!def && noQuadro.has(def.id), valorAtual: def ? valores.get(def.id) ?? '' : '' };
  });
  const marcadosPorId = new Map(marcados.map((m) => [m.id, m]));
  return {
    card: { cardId, chamado: soDigitos(card.custom_id), titulo: card.title ?? '', boardId, colunaId, bloqueado: !!card.is_blocked },
    descricaoHtml: card.description ?? '',
    descricao: htmlParaTexto(card.description),
    colunas: colunas.filter((c) => c.workflowId === null || c.workflowId === Number(card.workflow_id)).sort((a, b) => a.posicao - b.posicao),
    criterios: itens.map((i) => ({ itemId: i.id, texto: i.texto, marcado: marcadosPorId.has(i.id), comentario: marcadosPorId.get(i.id)?.comentario ?? '', marcadoEm: marcadosPorId.get(i.id)?.marcadoEm ?? '' })),
    campos: camposAuto,
  };
}

function montaRequisicoes(estado: Awaited<ReturnType<typeof lerEstado>>, mudancas: Mudanca[]): Requisicao[] {
  const { card, colunas, criterios, campos } = estado;
  const ordem = { campo: 0, descricao: 1, checklist: 2, comentario: 3, mover: 4 };
  const lista = [...mudancas].sort((a, b) => ordem[a.tipo] - ordem[b.tipo]);
  const saida: Requisicao[] = [];
  const marcarAgora = new Set<number>();

  for (const m of lista) {
    if (m.tipo === 'campo') {
      const def = campoPorNome(m.campo);
      const alvo = campos.find((c) => c.chave === def?.chave);
      if (!def || !alvo || alvo.id === null) throw new ErroBm(400, `Campo não permitido ou inexistente no BM: ${m.campo}.`);
      if (!alvo.disponivel) throw new ErroBm(400, `O campo "${def.rotulo}" não está habilitado no quadro deste cartão.`);
      const valor = String(m.valor ?? '').trim();
      if (!valor || valor.length > 20000) throw new ErroBm(400, `Valor inválido para ${def.rotulo}.`);
      const enviado = alvo.tipo === 'multi_line_text' ? textoParaHtml(valor) : valor.replace(/\s*\n+\s*/g, ', ');
      saida.push({ metodo: 'PUT', caminho: `/cards/${card.cardId}/customFields/${alvo.id}`, corpo: { value: enviado }, descricao: `Preencher o campo "${def.rotulo}"` });
    } else if (m.tipo === 'descricao') {
      const links = (Array.isArray(m.links) ? m.links : [])
        .map((l) => ({ texto: String(l?.texto ?? '').slice(0, 200), url: String(l?.url ?? '') }))
        .filter((l) => l.texto && /^https:\/\/github\.com\/solussaude\//i.test(l.url) && l.url.length < 500);
      if (!links.length) throw new ErroBm(400, 'Nenhum link do Git válido para anexar.');
      const nova = anexaLinksNaDescricao(estado.descricaoHtml, links);
      if (nova === estado.descricaoHtml) continue;
      saida.push({ metodo: 'PATCH', caminho: `/cards/${card.cardId}`, corpo: { description: nova }, descricao: 'Acrescentar os links do Git no fim da descrição do cartão' });
    } else if (m.tipo === 'checklist') {
      const item = criterios.find((c) => c.itemId === Number(m.itemId));
      if (!item) throw new ErroBm(400, 'Critério de saída inexistente na coluna atual.');
      if (item.marcado) continue;
      marcarAgora.add(item.itemId);
      const comentario = String(m.comentario ?? '').trim().slice(0, 2000);
      saida.push({ metodo: 'PUT', caminho: `/cards/${card.cardId}/columnChecklistItems/${item.itemId}`, corpo: comentario ? { comment: comentario } : {}, descricao: `Marcar o critério "${item.texto}"` });
    } else if (m.tipo === 'comentario') {
      const texto = String(m.texto ?? '').trim();
      if (!texto || texto.length > 20000) throw new ErroBm(400, 'Comentário inválido.');
      saida.push({ metodo: 'POST', caminho: `/cards/${card.cardId}/comments`, corpo: { text: textoParaHtml(texto) }, descricao: 'Comentar no cartão' });
    } else if (m.tipo === 'mover') {
      const destino = colunas.find((c) => c.id === Number(m.colunaId));
      if (!destino || destino.id === card.colunaId) throw new ErroBm(400, 'Coluna de destino inválida.');
      if (card.bloqueado) throw new ErroBm(400, 'O cartão está bloqueado; desbloqueie antes de mover.');
      const faltam = criterios.filter((c) => !c.marcado && !marcarAgora.has(c.itemId));
      if (faltam.length) throw new ErroBm(400, `Faltam critérios de saída da coluna atual: ${faltam.map((c) => c.texto).join('; ')}.`);
      saida.push({ metodo: 'PATCH', caminho: `/cards/${card.cardId}`, corpo: { column_id: destino.id }, descricao: `Mover o cartão para "${destino.nome}"` });
    }
  }
  return saida;
}

export async function POST(req: Request) {
  const a = await autoriza(req);
  if (!a.ok) return NextResponse.json({ erro: a.erro }, { status: a.status });
  const corpo = (await req.json().catch(() => ({}))) as { acao?: string; cardId?: unknown; chamado?: unknown; mudancas?: unknown; confirmar?: unknown };
  const cardId = Number(corpo.cardId);
  if (!Number.isInteger(cardId) || cardId <= 0 || !soDigitos(corpo.chamado)) return NextResponse.json({ erro: 'Cartão ou chamado inválido.' }, { status: 400 });

  try {
    const estado = await lerEstado(a.chave, cardId, String(corpo.chamado));
    if (corpo.acao === 'ler') return NextResponse.json({ estado });
    if (corpo.acao !== 'simular' && corpo.acao !== 'aplicar') return NextResponse.json({ erro: 'Ação inválida.' }, { status: 400 });

    const mudancas = Array.isArray(corpo.mudancas) ? (corpo.mudancas as Mudanca[]).slice(0, 30) : [];
    if (!mudancas.length) return NextResponse.json({ erro: 'Nenhuma alteração selecionada.' }, { status: 400 });
    const requisicoes = montaRequisicoes(estado, mudancas);
    if (corpo.acao === 'simular') return NextResponse.json({ requisicoes });
    if (corpo.confirmar !== true) return NextResponse.json({ erro: 'Confirmação obrigatória para gravar no Businessmap.' }, { status: 400 });

    const resultados: { descricao: string; ok: boolean; erro?: string }[] = [];
    for (const r of requisicoes) {
      try {
        await bmEscreve(a.chave, r.metodo, r.caminho, r.corpo);
        resultados.push({ descricao: r.descricao, ok: true });
      } catch (e) {
        resultados.push({ descricao: r.descricao, ok: false, erro: e instanceof Error ? e.message : 'Falha ao gravar.' });
        break;
      }
    }
    const novo = await lerEstado(a.chave, cardId, String(corpo.chamado)).catch(() => null);
    return NextResponse.json({ resultados, estado: novo });
  } catch (e) {
    const er = e instanceof ErroBm ? e : null;
    return NextResponse.json({ erro: er?.message ?? 'Falha ao consultar o Businessmap.' }, { status: er?.status && er.status >= 400 ? er.status : 502 });
  }
}
