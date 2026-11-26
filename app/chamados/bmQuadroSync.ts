'use client';

import { collection, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import { cabecalhoBm, gravaEuBm, lerEuBm, type EuBm } from './bmChave';
import { mudou, type CartaoQuadro } from './bmQuadro';
import { semIndefinidos } from './bmRegistro';
import { tokenDoLogin } from './atualizaGit';
import { VALIDADE_LISTA_MS } from './chamadosDados';
import { criaConsultaSalva } from './dadosSalvos';

export const COLECAO_QUADRO = 'bm_quadro';
export const DOC_META_QUADRO = 'bm_quadro_meta';

export interface MetaQuadro {
  sincronizadoEm: string;
  por: string;
  total: number;
  ids: number[];
}

type Quadro = { cartoes: CartaoQuadro[]; meta: MetaQuadro | null };

const quadroSalvo = criaConsultaSalva<Quadro>({ nome: 'bm-quadro', validade: () => VALIDADE_LISTA_MS });

export const invalidaQuadroBm = () => quadroSalvo.invalida();

export async function lerQuadroBm(atualizar = false): Promise<Quadro> {
  const { cartoes, meta } = await quadroSalvo.obtem('todos', carregaQuadroBm, atualizar);
  return { cartoes: [...cartoes], meta };
}

async function carregaQuadroBm(): Promise<Quadro> {
  const [snap, meta] = await Promise.all([getDocs(collection(db, COLECAO_QUADRO)), getDoc(doc(db, DOC_META_QUADRO, 'atual'))]);
  const todos = snap.docs.map((d) => d.data() as CartaoQuadro);
  const m = meta.exists() ? (meta.data() as MetaQuadro) : null;
  const ativos = m ? new Set(m.ids) : null;
  return { cartoes: ativos ? todos.filter((c) => ativos.has(c.cardId)) : todos, meta: m };
}

export async function buscaEuBm(): Promise<EuBm | null> {
  const guardado = lerEuBm();
  if (guardado?.id) return guardado;
  try {
    const r = await fetch('/api/bm/validar', { method: 'POST', headers: { Authorization: `Bearer ${await tokenDoLogin()}`, ...cabecalhoBm() } });
    const j = await r.json();
    if (!r.ok || !j.usuario?.id) return null;
    gravaEuBm(j.usuario);
    return j.usuario as EuBm;
  } catch {
    return null;
  }
}

export interface ResultadoQuadro {
  total: number;
  gravados: number;
  aviso: string;
}

export async function sincronizaQuadroBm(por: string, atuais: CartaoQuadro[]): Promise<ResultadoQuadro> {
  let etapa = 'consultar o quadro no Businessmap';
  let total = 0;
  let gravados = 0;
  try {
    const r = await fetch('/api/bm/quadro', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await tokenDoLogin()}`, ...cabecalhoBm() }, body: '{}' });
    const corpo = await r.text();
    let j: { erro?: string; cartoes?: CartaoQuadro[] };
    try {
      j = JSON.parse(corpo) as { erro?: string; cartoes?: CartaoQuadro[] };
    } catch {
      return { total: 0, gravados: 0, aviso: `A consulta ao Businessmap retornou uma resposta inválida (HTTP ${r.status}).` };
    }
    if (!r.ok) return { total: 0, gravados: 0, aviso: j.erro ?? 'Não foi possível consultar o Businessmap.' };
    if (!Array.isArray(j.cartoes)) return { total: 0, gravados: 0, aviso: 'A consulta ao Businessmap não retornou a lista de cartões esperada.' };
    const novos = j.cartoes;
    total = novos.length;
    const antigos = new Map(atuais.map((c) => [c.cardId, c]));
    const alterados = novos.filter((c) => mudou(antigos.get(c.cardId), c));
    for (let i = 0; i < alterados.length; i += 400) {
      etapa = 'gravar os cartões no Firestore';
      const lote = writeBatch(db);
      const itensDoLote = alterados.slice(i, i + 400);
      for (const c of itensDoLote) lote.set(doc(db, COLECAO_QUADRO, String(c.cardId)), semIndefinidos(c));
      await lote.commit();
      gravados += itensDoLote.length;
    }
    etapa = 'gravar os metadados do quadro no Firestore';
    const meta: MetaQuadro = { sincronizadoEm: new Date().toISOString(), por, total: novos.length, ids: novos.map((c) => c.cardId) };
    await setDoc(doc(db, DOC_META_QUADRO, 'atual'), meta);
    return { total: novos.length, gravados: alterados.length, aviso: '' };
  } catch (e) {
    const codigo = (e as { code?: string })?.code ?? '';
    if (codigo === 'permission-denied') {
      return { total, gravados, aviso: `Sem permissão para ${etapa}. Confira as regras do Firestore para bm_quadro e bm_quadro_meta.` };
    }
    return { total, gravados, aviso: `Falha ao ${etapa}${codigo ? ` (${codigo})` : ''}.` };
  } finally {
    invalidaQuadroBm();
  }
}
