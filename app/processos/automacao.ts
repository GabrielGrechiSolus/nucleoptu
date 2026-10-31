import { MENSAGEM_PADRAO_CONCLUSAO } from '../chamados/bm';
import type { Chamado } from '../chamados/parse';

export type ChaveCampo = 'texto' | 'pr' | 'branch' | 'repo' | 'qa';

export interface DefinicaoCampo {
  chave: ChaveCampo;
  rotulo: string;
  padrao: RegExp;
}

export const CAMPOS_AUTOMATICOS: DefinicaoCampo[] = [
  { chave: 'texto', rotulo: 'Texto conclusão', padrao: /^texto conclus/i },
  { chave: 'pr', rotulo: 'Git PR', padrao: /^git pr$/i },
  { chave: 'branch', rotulo: 'Git branch', padrao: /^git branch$/i },
  { chave: 'repo', rotulo: 'reponame', padrao: /^(git )?repo/i },
  { chave: 'qa', rotulo: 'QA - Documentação', padrao: /^qa - document/i },
];

export const campoPorNome = (nome: string) => CAMPOS_AUTOMATICOS.find((c) => c.padrao.test(nome));

export const textoParaHtml = (texto: string) =>
  texto
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${p.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</p>`)
    .join('');

const secao = (markdown: string, ...titulos: RegExp[]) => {
  const partes = markdown.split(/^##\s+/m).slice(1);
  for (const t of titulos) {
    const achada = partes.find((p) => t.test(p.split('\n')[0]));
    if (achada) return achada.split('\n').slice(1).join('\n').trim();
  }
  return '';
};

export function rascunhoTextoConclusao(c: Pick<Chamado, 'docs'>): string {
  const regra = c.docs?.['REGRA.md'] ?? '';
  if (!regra) return '';
  const problema = secao(regra, /^problema/i);
  const correcao = secao(regra, /^o que foi corrigido/i, /^o que est[aá] sendo corrigido/i);
  const comoFunciona = secao(regra, /^como (vai )?funciona/i);
  const blocos = [problema, correcao, comoFunciona].filter((b) => b && !/^a completar/i.test(b));
  if (!blocos.length) return '';
  return `${blocos.join('\n\n')}\n\n${MENSAGEM_PADRAO_CONCLUSAO}`;
}

export interface PropostaCampo {
  chave: ChaveCampo;
  rotulo: string;
  valor: string;
}

export function propostasDeCampos(c: Pick<Chamado, 'docs' | 'prs' | 'branches' | 'evidencias' | 'planosTeste'>): PropostaCampo[] {
  const prs = (c.prs ?? []).filter((p) => p.url);
  const linhasQa = [
    ...(c.planosTeste ?? []).map((l) => `Plano de testes: ${l.url}`),
    ...(c.evidencias ?? []).map((l) => `Evidência de testes: ${l.url}`),
  ];
  const lista: PropostaCampo[] = [
    { chave: 'texto', rotulo: 'Texto conclusão', valor: rascunhoTextoConclusao(c) },
    { chave: 'pr', rotulo: 'Git PR', valor: prs.map((p) => p.url).join(', ') },
    { chave: 'branch', rotulo: 'Git branch', valor: (c.branches ?? []).join(', ') },
    { chave: 'repo', rotulo: 'reponame', valor: [...new Set(prs.map((p) => p.repo).filter(Boolean))].join(', ') },
    { chave: 'qa', rotulo: 'QA - Documentação', valor: linhasQa.join('\n') },
  ];
  return lista.filter((p) => p.valor.trim());
}

const normaliza = (t: string) => t.normalize("NFD").replace(new RegExp("[\u0300-\u036f]", "g"), "").toLowerCase();

export interface ContextoCriterio {
  temPr: boolean;
  temEvidencia: boolean;
  temPlano: boolean;
  textoConclusaoOk: boolean;
  temRevision: boolean;
}

export interface AvaliacaoCriterio {
  automatico: boolean;
  cumprido: boolean;
  motivo: string;
}

export function avaliaCriterio(texto: string, ctx: ContextoCriterio): AvaliacaoCriterio {
  const t = normaliza(texto);
  if (/evid/.test(t)) return { automatico: true, cumprido: ctx.temEvidencia, motivo: ctx.temEvidencia ? 'Há link de evidência de testes no Git.' : 'Sem link de evidência no Git.' };
  if (/plano|cenario|teste/.test(t)) return { automatico: true, cumprido: ctx.temPlano, motivo: ctx.temPlano ? 'Há plano de testes registrado.' : 'Sem plano de testes registrado.' };
  if (/\bpr\b|pull|git|commit|codigo/.test(t)) return { automatico: true, cumprido: ctx.temPr, motivo: ctx.temPr ? 'Há PR vinculado ao chamado.' : 'Sem PR vinculado.' };
  if (/conclus|newsletter|texto/.test(t)) return { automatico: true, cumprido: ctx.textoConclusaoOk, motivo: ctx.textoConclusaoOk ? 'Texto de conclusão complementado.' : 'Texto de conclusão ainda é a mensagem padrão ou está vazio.' };
  if (/revision|releas|publica/.test(t)) return { automatico: true, cumprido: ctx.temRevision, motivo: ctx.temRevision ? 'A correção já saiu em uma revision.' : 'A correção ainda não saiu em uma revision.' };
  return { automatico: false, cumprido: false, motivo: 'Critério sem regra automática: confirme manualmente.' };
}

export function textoConclusaoComplementado(valor: string): boolean {
  const v = valor.trim();
  if (!v) return false;
  const resto = v.replace(MENSAGEM_PADRAO_CONCLUSAO, '').replace(/\[\]|Obrigado[\s\S]*$/gi, '').trim();
  return resto.length >= 40;
}

export interface LinkGit {
  texto: string;
  url: string;
}

export const linksGitDoChamado = (c: Pick<Chamado, 'prs'>): LinkGit[] =>
  (c.prs ?? [])
    .filter((p) => p.url && /^https:\/\/github\.com\//i.test(p.url))
    .map((p) => ({ texto: `Git PR ${p.repo ? `${p.repo} ` : ''}#${p.numero}`, url: p.url as string }));

const escapaHtml = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const linksQueFaltam = (descricaoHtml: string, links: LinkGit[]) => links.filter((l) => !descricaoHtml.includes(l.url) && !descricaoHtml.includes(escapaHtml(l.url)));

export function anexaLinksNaDescricao(descricaoHtml: string, links: LinkGit[]): string {
  const novos = linksQueFaltam(descricaoHtml, links);
  if (!novos.length) return descricaoHtml;
  const bloco = novos.map((l) => `<p><a href="${escapaHtml(l.url)}">${escapaHtml(l.texto)}</a></p>`).join('');
  return descricaoHtml + bloco;
}
