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
  previsaoRevision: string;
  atualizadoEm: string;
  prs: PrRef[];
  branches: string[];
  evidencias: LinkRef[];
  planosTeste: LinkRef[];
  temPr: boolean;
  temEvidencia: boolean;
  temPlano: boolean;
  temBm: boolean;
  // Dados do REGRA.md (visão para a regra de negócio). Vazios nos chamados sem REGRA.md.
  tipo: TipoChamado;
  situacao: SituacaoChamado;
  modulo: string;
  caminhoTela: string;
  publicadoEm: string; // AAAA-MM-DD
  temRegra: boolean;
  autores: string[]; // quem fez o(s) PR(s), do campo autor do REGRA.md
  autoresLogin: string[]; // usuários no Git de quem fez o(s) PR(s) (campo autorLogin); liga o PR ao usuário na fila de aplicação
  docs: Record<string, string>;
}

export type TipoChamado = 'correcao' | 'melhoria' | 'regra' | 'orientacao' | '';
export type SituacaoChamado = 'em-correcao' | 'corrigido' | 'encerrado' | '';

const TIPOS: TipoChamado[] = ['correcao', 'melhoria', 'regra', 'orientacao'];
const SITUACOES: SituacaoChamado[] = ['em-correcao', 'corrigido', 'encerrado'];

export const ROTULO_TIPO: Record<string, string> = { correcao: 'Correção', melhoria: 'Melhoria', regra: 'Regra escondida', orientacao: 'Orientação', '': '—' };
export const ROTULO_SITUACAO: Record<string, string> = { 'em-correcao': 'Em correção', corrigido: 'Corrigido', encerrado: 'Encerrado', '': '—' };

// Cabeçalho entre `---` no início do arquivo: linhas "chave: valor". Retorna null se não houver.
export function parseFrontMatter(texto: string): { meta: Record<string, string>; corpo: string } | null {
  const t = texto.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const m = t.match(/^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)/);
  if (!m) return null;
  const meta: Record<string, string> = {};
  for (const linha of m[1].split('\n')) {
    const kv = linha.match(/^([A-Za-z][\w-]*):[ \t]*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].replace(/\s+#.*$/, '').trim();
  }
  return { meta, corpo: t.slice(m[0].length).replace(/^\n+/, '') };
}

function prsDoMeta(valor: string): PrRef[] {
  const out: PrRef[] = [];
  for (const parte of valor.split(/[,;\s]+/).filter(Boolean)) {
    const m = parte.match(/^(?:([\w.-]+)#)?#?(\d{1,5})$/);
    if (!m || m[2] === '0' || /^0+$/.test(m[2])) continue;
    const repo = m[1] || 'banco';
    out.push({ numero: m[2], repo, url: `https://github.com/solussaude/${repo}/pull/${m[2]}` });
  }
  return out;
}

export const MAX_CHARS_POR_ARQUIVO = 60000;
export const MAX_CHARS_TOTAL = 400000;

const PRIORIDADE = ['REGRA.md', 'CONTEXTO.md', 'BM.md', 'TESTES.md', 'GIT.md', 'DORES.md', 'ENTENDIMENTOS.md'];

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
  const fm = parseFrontMatter(arquivos['REGRA.md'] ?? '') ?? parseFrontMatter(contexto);
  const meta = fm?.meta ?? {};
  const titulo = parseTitulo(contexto, pasta);
  const numero = /^\d{3}\.\d{3}$/.test(meta.chamado ?? '') ? meta.chamado : titulo.numero;
  const cliente = meta.cliente || titulo.cliente;
  const assunto = meta.assunto || titulo.assunto;
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
    if (n === 'REGRA.md') t = parseFrontMatter(t)?.corpo ?? t;
    if (t.length > MAX_CHARS_POR_ARQUIVO) t = `${t.slice(0, MAX_CHARS_POR_ARQUIVO)}\n\n[... conteúdo truncado na importação ...]`;
    if (total + t.length > MAX_CHARS_TOTAL) continue;
    docs[n] = t;
    total += t.length;
  }

  const prMapa = new Map<string, PrRef>();
  for (const p of extraiPrs(todo)) prMapa.set(p.numero, p);
  for (const p of prsDoMeta(meta.pr ?? '')) prMapa.set(p.numero, p);
  const prs = [...prMapa.values()].sort((a, b) => Number(b.numero) - Number(a.numero));
  const evidencias = extraiLinks(todo, /evid[eê]ncia/i);
  if (/^https?:\/\//.test(meta.evidencia ?? '') && !evidencias.some((l) => l.url === meta.evidencia)) evidencias.unshift({ texto: 'Evidência de testes', url: meta.evidencia });
  const planosTeste = extraiLinks(todo, /plano\s+de\s+teste/i);
  if (/^https?:\/\//.test(meta.planoTestes ?? '') && !planosTeste.some((l) => l.url === meta.planoTestes)) planosTeste.unshift({ texto: 'Plano de testes', url: meta.planoTestes });
  const temPlano = planosTeste.length > 0 || nomes.some((n) => /plano.?teste/i.test(n)) || /^#{1,6}\s+.*plano de teste/im.test(todo);
  const temEvidencia = evidencias.length > 0 || nomes.some((n) => /evid/i.test(n));

  const status = (limpa(contexto).match(/Status:\s*\*{0,2}([^\n]{3,140})/i)?.[1] ?? '').replace(/\*+/g, '').replace(/[.\s]+$/, '').trim();
  // Com REGRA.md a revision é a em que a correção fica disponível (só do cabeçalho); sem ele, é a do cliente citada no contexto.
  const revision = (/^\d{5}$/.test(meta.revision ?? '') ? meta.revision : '') || ('REGRA.md' in arquivos ? '' : (limpa(contexto).match(/revision[^\n\d]{0,40}(40\d{3})/i)?.[1] ?? ''));
  const previsaoRevision = revision ? '' : /^\d{5}$/.test(meta.previsaoRevision ?? '') ? meta.previsaoRevision : '';
  const atualizadoEm = limpa(contexto).match(/Atualizad[oa](?: em)?:?\s*(\d{2}\/\d{2}\/\d{4})/i)?.[1] ?? '';

  return {
    id: numero.replace('.', ''),
    numero,
    cliente,
    assunto,
    resumo: resumoDe(contexto),
    status: SITUACOES.includes(meta.situacao as SituacaoChamado) ? ROTULO_SITUACAO[meta.situacao] : status,
    revision,
    previsaoRevision,
    atualizadoEm,
    prs,
    branches: extraiBranches(todo),
    evidencias,
    planosTeste,
    temPr: prs.length > 0,
    temEvidencia,
    temPlano,
    temBm: 'BM.md' in arquivos,
    tipo: TIPOS.includes(meta.tipo as TipoChamado) ? (meta.tipo as TipoChamado) : '',
    situacao: SITUACOES.includes(meta.situacao as SituacaoChamado) ? (meta.situacao as SituacaoChamado) : '',
    modulo: meta.modulo ?? '',
    caminhoTela: meta.caminhoTela ?? '',
    publicadoEm: /^\d{4}-\d{2}-\d{2}$/.test(meta.publicadoEm ?? '') ? meta.publicadoEm : '',
    temRegra: 'REGRA.md' in arquivos,
    autores: (meta.autor ?? '').split(',').map((a) => a.trim()).filter(Boolean),
    autoresLogin: (meta.autorLogin ?? '').split(',').map((a) => a.trim().replace(/^@/, '')).filter(Boolean),
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
