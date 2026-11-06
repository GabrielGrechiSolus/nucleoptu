'use client';

import { collection, doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { agrupaPorChamado, montaContextoDePrs, type PrevisoesPorPr, type PrGithub, type RevisoesPorPr, type UsuarioGithub } from './github';
import type { Chamado } from './parse';

export interface DadosGit {
  usuario: UsuarioGithub;
  abertos: PrGithub[];
  fechados: PrGithub[];
  truncado: boolean;
  dias: number;
}

export const tokenDoLogin = async () => (await (auth.currentUser as unknown as { getIdToken(): Promise<string> } | null)?.getIdToken()) ?? '';

export async function buscaPerfilGit(login: string, dias: number): Promise<{ dados?: DadosGit; erro?: string }> {
  try {
    const r = await fetch(`/api/git/perfil?login=${encodeURIComponent(login)}&dias=${dias}`, { headers: { Authorization: `Bearer ${await tokenDoLogin()}` } });
    const j = await r.json();
    if (!r.ok) return { erro: j.erro ?? 'Não foi possível consultar o GitHub.' };
    return { dados: j as DadosGit };
  } catch {
    return { erro: 'Não foi possível consultar o GitHub agora. Tente novamente.' };
  }
}

export async function buscaPrevisaoGlobal(): Promise<number | null> {
  try {
    const r = await fetch('/api/git/revisao/ultima', { headers: { Authorization: `Bearer ${await tokenDoLogin()}` } });
    if (!r.ok) return null;
    const j = (await r.json()) as { previsao?: number | null };
    return typeof j.previsao === 'number' ? j.previsao : null;
  } catch {
    return null;
  }
}

export async function consultaRevisoes(prs: { repo: string; numero: number }[]): Promise<{ revisoes?: RevisoesPorPr; previsoes?: PrevisoesPorPr; aviso: string }> {
  try {
    const token = await tokenDoLogin();
    const previsaoGlobal = await buscaPrevisaoGlobal();
    const revisoes: RevisoesPorPr = {};
    const previsoes: PrevisoesPorPr = {};
    for (let i = 0; i < prs.length; i += 60) {
      const r = await fetch('/api/git/revisao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prs: prs.slice(i, i + 60) }),
      });
      const j = (await r.json()) as { erro?: string; resultados?: Record<string, { revisao: number | null; ultima?: number }> };
      if (!r.ok) return { aviso: j.erro ?? 'Não foi possível consultar as revisions.' };
      for (const [k, v] of Object.entries(j.resultados ?? {})) {
        revisoes[k] = v.revisao;
        if (v.revisao === null) {
          const previsao = previsaoGlobal ?? (v.ultima ? v.ultima + 1 : undefined);
          if (previsao) previsoes[k] = previsao;
        }
      }
    }
    return { revisoes, previsoes, aviso: '' };
  } catch {
    return { aviso: 'Não foi possível consultar as revisions agora.' };
  }
}

export interface ResumoGeracao {
  criados: number;
  atualizados: number;
  comRevision: number;
  semChamado: number;
  aviso: string;
}

export async function geraContextosDoGit(dados: DadosGit, onStatus: (texto: string) => void = () => undefined): Promise<ResumoGeracao> {
  const { grupos, semChamado } = agrupaPorChamado([...dados.abertos, ...dados.fechados]);
  const snap = await getDocs(collection(db, 'chamados'));
  const existentes = new Map(snap.docs.map((d) => [d.id, d.data() as Chamado]));
  const hoje = new Date().toISOString();
  const por = auth.currentUser?.email ?? '';
  const aConsultar = [...grupos.values()].flat().filter((p) => p.estado === 'mesclado' && p.repo !== 'TestesIntegracao').map((p) => ({ repo: p.repo, numero: p.numero }));
  let revisoes: RevisoesPorPr | undefined = {};
  let previsoes: PrevisoesPorPr | undefined;
  let aviso = '';
  if (aConsultar.length) {
    onStatus(`Consultando a revision de ${aConsultar.length} PR(s) mesclado(s)...`);
    const r = await consultaRevisoes(aConsultar);
    revisoes = r.revisoes;
    previsoes = r.previsoes;
    aviso = r.aviso;
  }
  const itens = [...grupos].map(([numero, prs]) => montaContextoDePrs(numero, prs, dados.usuario, existentes.get(numero.replace('.', '')) ?? null, hoje, revisoes, previsoes));
  for (let i = 0; i < itens.length; i += 20) {
    const lote = writeBatch(db);
    for (const { chamado } of itens.slice(i, i + 20)) lote.set(doc(db, 'chamados', chamado.id), { ...chamado, importadoEm: serverTimestamp(), importadoPor: por, origem: 'github' });
    await lote.commit();
  }
  const criados = itens.filter((i) => i.novo).length;
  return { criados, atualizados: itens.length - criados, comRevision: itens.filter((i) => i.chamado.revision).length, semChamado: semChamado.length, aviso };
}

export const textoDoResumo = (r: ResumoGeracao) =>
  `${r.criados} contexto(s) criado(s) e ${r.atualizados} atualizado(s); ${r.comRevision} com revision.${r.semChamado ? ` ${r.semChamado} PR(s) sem número de chamado no título foram ignorados.` : ''}${r.aviso ? ` Revisions não consultadas: ${r.aviso} (as revisions existentes foram mantidas).` : ''}`;
