'use client';

import { collection, doc, getDoc, getDocs, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase';
import { cabecalhoBm, gravaEuBm, lerEuBm, type EuBm } from './bmChave';
import { mudou, type CartaoQuadro } from './bmQuadro';
import { semIndefinidos } from './bmRegistro';
import { tokenDoLogin } from './atualizaGit';

export const COLECAO_QUADRO = 'bm_quadro';
export const DOC_META_QUADRO = 'bm_quadro_meta';

export interface MetaQuadro {
  sincronizadoEm: string;
  por: string;
  total: number;
  ids: number[];
}

export async function lerQuadroBm(): Promise<{ cartoes: CartaoQuadro[]; meta: MetaQuadro | null }> {
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
  try {
    const r = await fetch('/api/bm/quadro', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await tokenDoLogin()}`, ...cabecalhoBm() }, body: '{}' });
    const j = await r.json();
    if (!r.ok) return { total: 0, gravados: 0, aviso: j.erro ?? 'Não foi possível consultar o Businessmap.' };
    const novos = j.cartoes as CartaoQuadro[];
    const antigos = new Map(atuais.map((c) => [c.cardId, c]));
    const alterados = novos.filter((c) => mudou(antigos.get(c.cardId), c));
    for (let i = 0; i < alterados.length; i += 400) {
      const lote = writeBatch(db);
      for (const c of alterados.slice(i, i + 400)) lote.set(doc(db, COLECAO_QUADRO, String(c.cardId)), semIndefinidos(c));
      await lote.commit();
    }
    const meta: MetaQuadro = { sincronizadoEm: new Date().toISOString(), por, total: novos.length, ids: novos.map((c) => c.cardId) };
    await setDoc(doc(db, DOC_META_QUADRO, 'atual'), meta);
    return { total: novos.length, gravados: alterados.length, aviso: '' };
  } catch (e) {
    const codigo = (e as { code?: string })?.code ?? '';
    return { total: 0, gravados: 0, aviso: codigo === 'permission-denied' ? 'Libere a leitura e a escrita das coleções bm_quadro e bm_quadro_meta nas regras do Firestore.' : 'Não foi possível gravar o quadro do Businessmap.' };
  }
}
