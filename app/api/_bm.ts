import type { BmCartaoBruto, BmComentarioBruto, BmMeta, BmVinculadoBruto } from '../chamados/bm';

import { createHash } from 'node:crypto';

// Cliente do Businessmap (BM), SOMENTE LEITURA: só existe GET aqui.
// A chave é a de cada usuário (enviada no cabeçalho x-bm-key, guardada só no navegador dele) ou, na falta dela, BM_API_KEY do servidor.
// Fila de chamadas e cache são separados por chave: ninguém lê dados em cache de outra pessoa.
// Limites do BM: 30 chamadas por minuto e 600 por hora; por isso há fila com intervalo e cache.

export const BM_BASE = (process.env.BM_URL ?? 'https://solussaude.businessmap.io/api/v2').replace(/\/$/, '');
export const chaveDaRequisicao = (req: Request): string => (req.headers.get('x-bm-key') ?? '').trim() || process.env.BM_API_KEY || '';
export const bmConfigurado = (chave: string) => !!chave;
const idDaChave = (chave: string) => createHash('sha256').update(chave).digest('hex').slice(0, 16);

export class ErroBm extends Error {
  constructor(public status: number, mensagem: string) {
    super(mensagem);
  }
}

const POR_MINUTO = 24;
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
interface Estado {
  chamadas: number[];
  fila: Promise<unknown>;
}
const estados = new Map<string, Estado>();
const estadoDe = (chave: string): Estado => {
  const id = idDaChave(chave);
  let e = estados.get(id);
  if (!e) estados.set(id, (e = { chamadas: [], fila: Promise.resolve() }));
  return e;
};

async function reserva(chamadas: number[]): Promise<void> {
  for (;;) {
    const agora = Date.now();
    while (chamadas.length && agora - chamadas[0] > 60_000) chamadas.shift();
    if (chamadas.length < POR_MINUTO) {
      chamadas.push(agora);
      return;
    }
    await espera(60_000 - (agora - chamadas[0]) + 100);
  }
}

async function bmGetBruto(chave: string, caminho: string, query: Record<string, string> = {}, tentativa = 0): Promise<unknown> {
  if (!chave) throw new ErroBm(503, 'Businessmap não configurado: informe a sua chave no perfil.');
  await reserva(estadoDe(chave).chamadas);
  const url = new URL(BM_BASE + caminho);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  const r = await fetch(url, { method: 'GET', headers: { apikey: chave, Accept: 'application/json' }, cache: 'no-store' });
  if (r.status === 429 && tentativa < 2) {
    await espera(((Number(r.headers.get('retry-after')) || 20) + 1) * 1000);
    return bmGetBruto(chave, caminho, query, tentativa + 1);
  }
  if (!r.ok) {
    const msg = r.status === 401 || r.status === 403 ? 'Chave do Businessmap inválida ou sem permissão de leitura.' : r.status === 404 ? 'Não encontrado no Businessmap.' : r.status === 429 ? 'Limite de consultas do Businessmap atingido. Tente em instantes.' : `Erro do Businessmap (${r.status}).`;
    throw new ErroBm(r.status, msg);
  }
  return r.json();
}

// Uma chamada por vez (a fila garante a ordem e o respeito ao limite).
export function bmGet<T>(chave: string, caminho: string, query: Record<string, string> = {}): Promise<T> {
  const e = estadoDe(chave);
  const p = e.fila.then(() => bmGetBruto(chave, caminho, query));
  e.fila = p.catch(() => undefined);
  return p.then((j) => {
    const d = (j as { data?: unknown } | null)?.data;
    const interno = (d as { data?: unknown } | null)?.data;
    return (Array.isArray(interno) ? interno : d) as T;
  });
}

// ---------- cache ----------
const cache = new Map<string, { em: number; v: unknown }>();
async function comCache<T>(bmChave: string, chave: string, ttlMs: number, f: () => Promise<T>): Promise<T> {
  const k = `${idDaChave(bmChave)}|${chave}`;
  const c = cache.get(k);
  if (c && Date.now() - c.em < ttlMs) return c.v as T;
  const v = await f();
  cache.set(k, { em: Date.now(), v });
  return v;
}
const HORA = 3_600_000;

type Lista = Record<string, unknown>[];
const txt = (x: unknown) => (typeof x === 'string' ? x : '');
const num = (x: unknown) => Number(x);

// Nomes de usuários, tipos, tags e campos personalizados (mudam pouco: 1 hora de cache).
async function metaGlobal(bm: string): Promise<Omit<BmMeta, 'colunas' | 'raias'>> {
  return comCache(bm, 'meta-global', HORA, async () => {
    const usuarios: BmMeta['usuarios'] = {};
    for (const u of (await bmGet<Lista>(bm, '/users')) ?? []) usuarios[num(u.user_id)] = txt(u.realname) || txt(u.username) || txt(u.email);
    const tipos: BmMeta['tipos'] = {};
    for (const t of (await bmGet<Lista>(bm, '/cardTypes')) ?? []) tipos[num(t.type_id)] = txt(t.name);
    const tags: BmMeta['tags'] = {};
    for (const t of (await bmGet<Lista>(bm, '/tags')) ?? []) tags[num(t.tag_id)] = txt(t.label) || txt(t.name);
    const campos: BmMeta['campos'] = {};
    for (const f of (await bmGet<Lista>(bm, '/customFields')) ?? []) {
      campos[num(f.field_id)] = { nome: txt(f.name), tipo: txt(f.type), valores: {} };
    }
    return { usuarios, tipos, tags, campos };
  });
}

// Valores permitidos dos campos de lista, só dos campos que o cartão usa (cache de 1 hora).
async function valoresDoCampo(bm: string, fieldId: number): Promise<Record<number, string>> {
  return comCache(bm, `valores-${fieldId}`, HORA, async () => {
    const out: Record<number, string> = {};
    for (const v of (await bmGet<Lista>(bm, `/customFields/${fieldId}/allowedValues`)) ?? []) out[num(v.value_id)] = txt(v.value) || txt(v.name);
    return out;
  });
}

async function metaDoQuadro(bm: string, boardId: number): Promise<Pick<BmMeta, 'colunas' | 'raias'>> {
  return comCache(bm, `quadro-${boardId}`, HORA, async () => {
    const colunas: BmMeta['colunas'] = {};
    for (const c of (await bmGet<Lista>(bm, `/boards/${boardId}/columns`)) ?? []) colunas[num(c.column_id)] = { nome: txt(c.name), secao: c.section === undefined ? null : num(c.section) };
    const raias: BmMeta['raias'] = {};
    for (const l of (await bmGet<Lista>(bm, `/boards/${boardId}/lanes`)) ?? []) raias[num(l.lane_id)] = txt(l.name);
    return { colunas, raias };
  });
}

// Junta tudo o que é necessário para traduzir os cartões informados.
export async function metaParaCartoes(bm: string, cartoes: BmCartaoBruto[]): Promise<BmMeta> {
  const g = await metaGlobal(bm);
  const campos = { ...g.campos };
  const usados = new Set<number>();
  for (const c of cartoes) for (const f of c.custom_fields ?? []) if (f.values?.length) usados.add(f.field_id);
  for (const id of usados) if (campos[id] && Object.keys(campos[id].valores).length === 0) campos[id] = { ...campos[id], valores: await valoresDoCampo(bm, id) };
  const colunas: BmMeta['colunas'] = {};
  const raias: BmMeta['raias'] = {};
  for (const b of new Set(cartoes.map((c) => c.board_id).filter((x): x is number => !!x))) Object.assign(colunas, (await metaDoQuadro(bm, b)).colunas), Object.assign(raias, (await metaDoQuadro(bm, b)).raias);
  return { ...g, campos, colunas, raias };
}

// ---------- cartões ----------
const CAMPOS_LISTA = 'card_id,custom_id,board_id,workflow_id,title,owner_user_id,column_id,lane_id,section,deadline,is_blocked,last_modified';

// Busca em lote pelos números dos chamados (custom_id), 40 por chamada; cache de 5 minutos por lote.
export async function cartoesPorChamados(bm: string, numeros: string[], fresco = false): Promise<BmCartaoBruto[]> {
  const unicos = [...new Set(numeros.map((n) => n.replace(/\D/g, '')).filter((n) => n.length >= 5))];
  const out: BmCartaoBruto[] = [];
  for (let i = 0; i < unicos.length; i += 40) {
    const lote = unicos.slice(i, i + 40);
    const chave = `lote-${lote.join(',')}`;
    out.push(...(await comCache(bm, chave, fresco ? 0 : 300_000, async () => (await bmGet<BmCartaoBruto[]>(bm, '/cards', { custom_ids: lote.join(','), fields: CAMPOS_LISTA })) ?? [])));
  }
  return out;
}

export interface DetalheBruto {
  card: BmCartaoBruto;
  comentarios: BmComentarioBruto[];
  vinculados: BmVinculadoBruto[];
}

// Detalhe de um cartão (campos personalizados, subtarefas, anexos, vínculos) e seus comentários; cache de 2 minutos.
export async function detalheDoCartao(bm: string, cardId: number, fresco = false): Promise<DetalheBruto> {
  return comCache(bm, `detalhe-${cardId}`, fresco ? 0 : 120_000, async () => {
    const card = await bmGet<BmCartaoBruto & { links?: { linked_card_id?: number; card_id?: number; link_type?: string }[] }>(bm, `/cards/${cardId}`, { expand: 'custom_fields,subtasks,links,attachments' });
    let comentarios: BmComentarioBruto[] = [];
    try {
      comentarios = (await bmGet<BmComentarioBruto[]>(bm, `/cards/${cardId}/comments`)) ?? [];
    } catch {
      comentarios = [];
    }
    const brutoLinks = card.linked_cards ?? (card.links ?? []).map((l) => ({ card_id: Number(l.linked_card_id ?? l.card_id), link_type: l.link_type }));
    card.linked_cards = brutoLinks.filter((l) => Number.isFinite(l.card_id) && l.card_id !== cardId);
    let vinculados: BmVinculadoBruto[] = [];
    if (card.linked_cards.length) {
      try {
        vinculados = (await bmGet<BmVinculadoBruto[]>(bm, '/cards', { card_ids: card.linked_cards.map((l) => l.card_id).slice(0, 40).join(','), fields: 'card_id,custom_id,title,column_id' })) ?? [];
      } catch {
        vinculados = [];
      }
    }
    return { card, comentarios, vinculados };
  });
}

// Quem é a pessoa dona da chave (usado para validar a chave informada no perfil).
export async function bmEu(chave: string): Promise<{ nome: string; email: string }> {
  const u = await bmGet<{ realname?: string; username?: string; email?: string }>(chave, '/me');
  return { nome: u.realname || u.username || '', email: u.email ?? '' };
}
