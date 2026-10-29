// Visão sem Git, para o perfil Sustentação: sem links, PRs clicáveis nem branches do Git.
// Documentos de apoio (evidência de testes, plano de testes, análise) continuam visíveis.
import type { Chamado, LinkRef } from './parse';

export const PERFIL_SEM_GIT = 'sustentacao';

export const ehLinkGit = (url: string) => /^https?:\/\/([\w-]+\.)*(github\.com|githubusercontent\.com|github\.io)(\/|$|\?|#)/i.test(url.trim());

const AVISO = '[link do Git oculto]';

// Troca links do GitHub (em markdown ou soltos) por um aviso.
export function ocultaGit(texto: string): string {
  return texto
    .replace(/\[([^\]]*)\]\((https?:\/\/(?:[\w-]+\.)*(?:github\.com|githubusercontent\.com|github\.io)[^)\s]*)\)/gi, `$1 ${AVISO}`)
    .replace(/https?:\/\/(?:[\w-]+\.)*(?:github\.com|githubusercontent\.com|github\.io)[^\s)>\]]*/gi, AVISO);
}

export const linksSemGit = (links: LinkRef[]) => (links ?? []).filter((l) => !ehLinkGit(l.url));

const DOCS_GIT = new Set(['github.md', 'git.md']);

export function semGitChamado(c: Chamado): Chamado {
  const docs: Record<string, string> = {};
  for (const [nome, texto] of Object.entries(c.docs ?? {})) {
    if (DOCS_GIT.has(nome.toLowerCase())) continue;
    docs[nome] = ocultaGit(texto);
  }
  return {
    ...c,
    // mantém número e repositório (sem link) para a lógica da fila; a interface não os mostra
    prs: (c.prs ?? []).map((p) => ({ numero: p.numero, repo: p.repo })),
    branches: [],
    evidencias: linksSemGit(c.evidencias),
    planosTeste: linksSemGit(c.planosTeste),
    resumo: ocultaGit(c.resumo ?? ''),
    docs,
  };
}
