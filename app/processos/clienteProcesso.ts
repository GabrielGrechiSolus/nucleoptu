'use client';

import { auth } from '../../firebase';
import { cabecalhoBm } from '../chamados/bmChave';
import type { ChecksPr } from './automacao';

export interface CriterioProcesso {
  itemId: number;
  texto: string;
  marcado: boolean;
  comentario: string;
  marcadoEm: string;
}

export interface CampoProcesso {
  chave: string;
  rotulo: string;
  id: number | null;
  tipo: string;
  disponivel: boolean;
  valorAtual: string;
}

export interface ColunaProcesso {
  id: number;
  nome: string;
  secao: number | null;
  posicao: number;
}

export interface EstadoProcesso {
  card: { cardId: number; chamado: string; titulo: string; boardId: number; colunaId: number; bloqueado: boolean };
  colunas: ColunaProcesso[];
  criterios: CriterioProcesso[];
  campos: CampoProcesso[];
  descricao: string;
  descricaoHtml: string;
}

export type MudancaProcesso =
  | { tipo: 'campo'; campo: string; valor: string }
  | { tipo: 'checklist'; itemId: number; comentario?: string }
  | { tipo: 'descricao'; links: { texto: string; url: string }[] }
  | { tipo: 'comentario'; texto: string }
  | { tipo: 'mover'; colunaId: number };

export interface RequisicaoSimulada {
  metodo: string;
  caminho: string;
  corpo?: unknown;
  descricao: string;
}

export interface ResultadoGravacao {
  descricao: string;
  ok: boolean;
  erro?: string;
}

const idToken = async () => (await (auth.currentUser as unknown as { getIdToken(): Promise<string> } | null)?.getIdToken()) ?? '';

async function chama<T>(corpo: unknown): Promise<T> {
  const r = await fetch('/api/bm/processo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await idToken()}`, ...cabecalhoBm() },
    body: JSON.stringify(corpo),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erro ?? `Erro ${r.status}`);
  return j as T;
}

export async function permissaoProcessos(): Promise<{ permitido: boolean; motivo: string }> {
  try {
    const r = await fetch('/api/bm/processo', { headers: { Authorization: `Bearer ${await idToken()}`, ...cabecalhoBm() } });
    const j = await r.json();
    return { permitido: !!j.permitido, motivo: j.motivo ?? '' };
  } catch {
    return { permitido: false, motivo: 'Não foi possível verificar a permissão agora.' };
  }
}

export async function consultaChecksGit(prs: { repo: string; numero: number }[]): Promise<Record<string, ChecksPr> | null> {
  if (!prs.length) return null;
  try {
    const r = await fetch('/api/git/checks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await idToken()}` },
      body: JSON.stringify({ prs: prs.slice(0, 20) }),
    });
    const j = await r.json();
    return r.ok ? (j.resultados as Record<string, ChecksPr>) : null;
  } catch {
    return null;
  }
}

export const lerProcesso = (cardId: number, chamado: string) => chama<{ estado: EstadoProcesso }>({ acao: 'ler', cardId, chamado }).then((j) => j.estado);

export const simularProcesso = (cardId: number, chamado: string, mudancas: MudancaProcesso[]) =>
  chama<{ requisicoes: RequisicaoSimulada[] }>({ acao: 'simular', cardId, chamado, mudancas }).then((j) => j.requisicoes);

export const aplicarProcesso = (cardId: number, chamado: string, mudancas: MudancaProcesso[]) =>
  chama<{ resultados: ResultadoGravacao[]; estado: EstadoProcesso | null }>({ acao: 'aplicar', cardId, chamado, mudancas, confirmar: true });
