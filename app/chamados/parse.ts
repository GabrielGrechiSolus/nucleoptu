// Leitura dos contextos de chamados (pasta chatgpt/chamados/<numero-cliente>/*.md).
// Lógica pura, sem Firebase, para poder ser testada e reutilizada na importação.

export interface PrRef {
  numero: string;
  repo?: string;
  url?: string;
}

export interface LinkRef {
  texto: string;
  url: string;
}

export interface Chamado {
  id: string; // número sem pontos, ex.: 568361
  numero: string; // 568.361
  cliente: string;
  assunto: string;
  resumo: string;
  status: string;
  revision: string;
  atualizadoEm: string;
  prs: PrRef[];
  branches: string[];
  evidencias: LinkRef[];
  planosTeste: LinkRef[];
  temPr: boolean;
  temEvidencia: boolean;
  temPlano: boolean;
  temBm: boolean;
  docs: Record<string, string>;
}

export const MAX_CHARS_POR_ARQUIVO = 60000;
export const MAX_CHARS_TOTAL = 400000;

const PRIORIDADE = ['CONTEXTO.md', 'BM.md', 'TESTES.md', 'GIT.md', 'DORES.md', 'ENTENDIMENTOS.md'];

const limpa = (s: string) => s.replace(/^﻿/, '').replace(/\r\n/g, '\n');

export function numeroDaPasta(pasta: string): string | null {
  const m = pasta.match(/^(\d{3})\.(\d{3})/);
  return m ? `${m[1]}.${m[2]}` : null;
}

export function parseTitulo(texto: string, pasta: string) {
  const h1 = limpa(texto).split('\n').find((l) => /^#\s+/.test(l)) ?? '';
  const corpo = h1.replace(/^#\s+/, '').trim();
  const m = corpo.match(/^(\d{3}\.\d{3})\s*[-—–]\s*(.+)$/);
  const numero = m ? m[1] : numeroDaPasta(pasta) ?? pasta;
  const resto = m ? m[2] : corpo;
  const partes = resto.split(/\s+[-—–]\s+/);
  if (partes.length >= 2) {
    return { numero, cliente: partes[0].trim(), assunto: partes.slice(1).join(' - ').trim() };
  }
  return { numero, cliente: '', assunto: resto.trim() };
}

export function extraiPrs(texto: string): PrRef[] {
  const mapa = new Map<string, PrRef>();
  const urlRe = /https?:\/\/github\.com\/[\w.-]+\/([\w.-]+)\/pull\/(\d+)/g;
  let m: RegExpExecArray | null;
  while ((m = urlRe.exec(texto))) {
    mapa.set(m[2], { numero: m[2], repo: m[1], url: m[0] });
  }
  const citaRe = /\bPR\s*#?\s*(\d{3,4})\b|(?<![\w/&])#(\d{4})\b/gi;
  while ((m = citaRe.exec(texto))) {
    const n = m[1] ?? m[2];
    if (!mapa.has(n)) mapa.set(n, { numero: n });
  }
  return [...mapa.values()].sort((a, b) => Number(b.numero) - Number(a.numero));
}

export function extraiBranches(texto: string): string[] {
  const set = new Set<string>();
  const re = /\b(?:hotfix|feature|report)\/\([\d.]+\)[^\s`'")\]]*/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto))) set.add(m[0].replace(/[.,;]+$/, ''));
  return [...set];
}

export function extraiLinks(texto: string, tipo: RegExp): LinkRef[] {
  const out: LinkRef[] = [];
  const vistos = new Set<string>();
  const re = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto))) {
    if (tipo.test(m[1]) && !vistos.has(m[2])) {
      vistos.add(m[2]);
      out.push({ texto: m[1].trim(), url: m[2] });
    }
  }
  return out;
}

function primeiroParagrafo(texto: string, secao: RegExp): string {
  const linhas = limpa(texto).split('\n');
  const i = linhas.findIndex((l) => secao.test(l));
  if (i < 0) return '';
  const bloco: string[] = [];
  for (let j = i + 1; j < linhas.length; j++) {
    if (/^#{1,6}\s/.test(linhas[j])) break;
    if (linhas[j].trim()) bloco.push(linhas[j].trim());
    else if (bloco.length) break;
  }
  return bloco.join(' ');
}

export function resumoDe(contexto: string): string {
  const r =
    primeiroParagrafo(contexto, /^##\s+Entendimento de retomada/i) ||
    primeiroParagrafo(contexto, /^##\s+Problema/i) ||
    primeiroParagrafo(contexto, /^##\s+Chamado/i) ||
    primeiroParagrafo(contexto, /^#\s+/);
  const t = r.replace(/[*`_]/g, '');
  return t.length > 420 ? `${t.slice(0, 417)}...` : t;
}

export function montaChamado(pasta: string, arquivos: Record<string, string>): Chamado | null {
  const nomes = Object.keys(arquivos).filter((n) => /\.md$/i.test(n));
  const contexto = arquivos['CONTEXTO.md'] ?? '';
  if (!contexto && !nomes.length) return null;
  const { numero, cliente, assunto } = parseTitulo(contexto, pasta);
  if (!/^\d{3}\.\d{3}$/.test(numero)) return null;

  const todo = limpa(nomes.map((n) => arquivos[n]).join('\n'));
  const docs: Record<string, string> = {};
  let total = 0;
  const ordenados = [...nomes].sort((a, b) => {
    const pa = PRIORIDADE.indexOf(a);
    const pb = PRIORIDADE.indexOf(b);
    return (pa < 0 ? 99 : pa) - (pb < 0 ? 99 : pb) || a.localeCompare(b);
  });
  for (const n of ordenados) {
    let t = limpa(arquivos[n]);
    if (t.length > MAX_CHARS_POR_ARQUIVO) t = `${t.slice(0, MAX_CHARS_POR_ARQUIVO)}\n\n[... conteúdo truncado na importação ...]`;
    if (total + t.length > MAX_CHARS_TOTAL) continue;
    docs[n] = t;
    total += t.length;
  }

  const prs = extraiPrs(todo);
  const evidencias = extraiLinks(todo, /evid[eê]ncia/i);
  const planosTeste = extraiLinks(todo, /plano\s+de\s+teste/i);
  const temPlano = planosTeste.length > 0 || nomes.some((n) => /plano.?teste/i.test(n)) || /^#{1,6}\s+.*plano de teste/im.test(todo);
  const temEvidencia = evidencias.length > 0 || nomes.some((n) => /evid/i.test(n));

  const status = (limpa(contexto).match(/Status:\s*\*{0,2}([^\n]{3,140})/i)?.[1] ?? '').replace(/\*+/g, '').replace(/[.\s]+$/, '').trim();
  const revision = limpa(contexto).match(/revision[^\n\d]{0,40}(40\d{3})/i)?.[1] ?? '';
  const atualizadoEm = limpa(contexto).match(/Atualizad[oa](?: em)?:?\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1] ?? '';

  return {
    id: numero.replace('.', ''),
    numero,
    cliente,
    assunto,
    resumo: resumoDe(contexto),
    status,
    revision,
    atualizadoEm,
    prs,
    branches: extraiBranches(todo),
    evidencias,
    planosTeste,
    temPr: prs.length > 0,
    temEvidencia,
    temPlano,
    temBm: 'BM.md' in arquivos,
    docs,
  };
}

// Agrupa arquivos escolhidos por pasta (input com webkitdirectory) e monta os chamados.
export async function lerPasta(files: File[]): Promise<Chamado[]> {
  const porPasta = new Map<string, File[]>();
  for (const f of files) {
    const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
    const partes = rel.split('/');
    if (partes.length < 2 || !/\.md$/i.test(f.name)) continue;
    const pasta = partes[partes.length - 2];
    if (!numeroDaPasta(pasta)) continue; // só .md direto na pasta do chamado
    porPasta.set(pasta, [...(porPasta.get(pasta) ?? []), f]);
  }
  const out: Chamado[] = [];
  for (const [pasta, lista] of porPasta) {
    const arquivos: Record<string, string> = {};
    for (const f of lista) arquivos[f.name] = await f.text();
    const c = montaChamado(pasta, arquivos);
    if (c) out.push(c);
  }
  return out.sort((a, b) => b.id.localeCompare(a.id));
}
