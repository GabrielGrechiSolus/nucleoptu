'use client';

import { auth } from '../../firebase';
import { cabecalhoBm } from '../chamados/bmChave';
import { invalidaQuadroBm } from '../chamados/bmQuadroSync';
import { invalidaRegistrosBm } from '../chamados/bmSync';
import { criaConsultaSalva } from '../chamados/dadosSalvos';
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
  | { tipo: 'descricao'; links: { texto: string; url: string; tipo?: string }[] }
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

const MINUTO = 60_000;
const SECAO_CONCLUIDO = 4;

const concluidoNoBm = (e: EstadoProcesso) => (e.colunas.find((c) => c.id === e.card.colunaId)?.secao ?? 0) >= SECAO_CONCLUIDO;

const processosSalvos = criaConsultaSalva<EstadoProcesso>({ nome: 'processo-bm', validade: (e) => (concluidoNoBm(e) ? Infinity : 10 * MINUTO), persiste: true });
const permissaoSalva = criaConsultaSalva<{ permitido: boolean; motivo: string }>({ nome: 'processo-permissao', validade: () => 10 * MINUTO, guarda: (p) => p.permitido });
const checksSalvos = criaConsultaSalva<Record<string, ChecksPr> | null>({ nome: 'checks-git', validade: () => 5 * MINUTO, guarda: (r) => r !== null });

const chaveDoCartao = (cardId: number, chamado: string) => `${cardId}:${chamado}`;

export const permissaoProcessos = () => permissaoSalva.obtem('eu', consultaPermissao);

async function consultaPermissao(): Promise<{ permitido: boolean; motivo: string }> {
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
  return checksSalvos.obtem(prs.map((p) => `${p.repo}#${p.numero}`).sort().join(','), () => pedeChecksGit(prs));
}

async function pedeChecksGit(prs: { repo: string; numero: number }[]): Promise<Record<string, ChecksPr> | null> {
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

export const lerProcesso = (cardId: number, chamado: string, atualizar = false) =>
  processosSalvos.obtem(chaveDoCartao(cardId, chamado), () => chama<{ estado: EstadoProcesso }>({ acao: 'ler', cardId, chamado }).then((j) => j.estado), atualizar);

export const processoLidoEm = (cardId: number, chamado: string) => processosSalvos.salvoEm(chaveDoCartao(cardId, chamado));

export const simularProcesso = (cardId: number, chamado: string, mudancas: MudancaProcesso[]) =>
  chama<{ requisicoes: RequisicaoSimulada[] }>({ acao: 'simular', cardId, chamado, mudancas }).then((j) => j.requisicoes);

export async function aplicarProcesso(cardId: number, chamado: string, mudancas: MudancaProcesso[]) {
  try {
    const r = await chama<{ resultados: ResultadoGravacao[]; estado: EstadoProcesso | null }>({ acao: 'aplicar', cardId, chamado, mudancas, confirmar: true });
    processosSalvos.invalida();
    if (r.estado) processosSalvos.define(chaveDoCartao(cardId, chamado), r.estado);
    return r;
  } catch (e) {
    processosSalvos.invalida();
    throw e;
  } finally {
    invalidaRegistrosBm();
    invalidaQuadroBm();
  }
}
