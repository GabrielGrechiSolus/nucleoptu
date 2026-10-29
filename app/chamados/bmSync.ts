'use client';

import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { cabecalhoBm } from './bmChave';
import type { BmCartao, BmResumoLista } from './bm';
import { COLECAO_BM, montaRegistro, precisaAtualizar, semIndefinidos, soDigitos, type RegistroBm } from './bmRegistro';
import type { Chamado } from './parse';

// Os tipos do Firebase neste projeto são simplificados (types/firebase.d.ts): getIdToken existe em tempo de execução.
const idToken = async () => (await (auth.currentUser as unknown as { getIdToken(): Promise<string> } | null)?.getIdToken()) ?? '';

async function post<T>(url: string, corpo: unknown): Promise<T> {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await idToken()}`, ...cabecalhoBm() }, body: JSON.stringify(corpo) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(j.erro ?? `Erro ${r.status}`), { status: r.status });
  return j as T;
}

export async function lerRegistrosBm(): Promise<Record<string, RegistroBm>> {
  const snap = await getDocs(collection(db, COLECAO_BM));
  const out: Record<string, RegistroBm> = {};
  for (const d of snap.docs) {
    const r = d.data() as RegistroBm;
    if (r?.chamado) out[r.chamado] = r;
  }
  return out;
}

export interface ResultadoSync {
  atualizados: number;
  iguais: number;
  semCartao: number;
  erros: number;
  parado: boolean;
  aviso: string;
}

// Lê no BM só o que mudou e grava no banco (chamados_bm). Primeiro uma consulta em lote (barata) para saber a data de atualização
// de cada cartão; o detalhe (campos, comentários, subtarefas) só é lido dos cartões que mudaram ou que ainda não foram gravados.
export async function sincronizaBm(opc: {
  chamados: Chamado[];
  registros: Record<string, RegistroBm>;
  por: string;
  forcar?: boolean;
  onProgresso: (feito: number, total: number, parcial: Record<string, RegistroBm>) => void;
  deveParar: () => boolean;
}): Promise<ResultadoSync> {
  const res: ResultadoSync = { atualizados: 0, iguais: 0, semCartao: 0, erros: 0, parado: false, aviso: '' };
  const registros = { ...opc.registros };
  const lista = opc.chamados.filter((c) => soDigitos(c.numero).length >= 5);
  const resumos: Record<string, BmResumoLista> = {};
  try {
    const numeros = [...new Set(lista.map((c) => soDigitos(c.numero)))];
    for (let i = 0; i < numeros.length; i += 40) {
      const j = await post<{ cartoes: Record<string, BmResumoLista> }>('/api/bm/chamados', { chamados: numeros.slice(i, i + 40), fresco: true });
      Object.assign(resumos, j.cartoes);
    }
  } catch (e) {
    res.aviso = (e as Error).message;
    return res;
  }

  let feito = 0;
  for (const c of lista) {
    if (opc.deveParar()) {
      res.parado = true;
      break;
    }
    const n = soDigitos(c.numero);
    const resumo = resumos[n];
    const agora = new Date();
    try {
      if (!precisaAtualizar(registros[n], resumo, agora.getTime(), opc.forcar)) {
        res.iguais++;
      } else {
        let cartao: BmCartao | null = null;
        if (resumo) cartao = (await post<{ cartao: BmCartao }>('/api/bm/cartao', { cardId: resumo.cardId, chamado: n, temPr: c.temPr, temEvidencia: c.temEvidencia, fresco: true })).cartao;
        const reg = montaRegistro(n, resumo, cartao, opc.por, agora.toISOString());
        await setDoc(doc(db, COLECAO_BM, n), semIndefinidos(reg));
        registros[n] = reg;
        if (resumo) res.atualizados++;
        else res.semCartao++;
      }
    } catch (e) {
      res.erros++;
      const status = (e as { status?: number }).status;
      // chave inválida, perfil sem permissão ou limite do BM: não adianta continuar
      if (status === 401 || status === 403 || status === 429) {
        res.aviso = (e as Error).message;
        res.parado = true;
        break;
      }
      if (!res.aviso) res.aviso = (e as Error).message;
    }
    feito++;
    opc.onProgresso(feito, lista.length, registros);
  }
  opc.onProgresso(feito, lista.length, registros);
  return res;
}
