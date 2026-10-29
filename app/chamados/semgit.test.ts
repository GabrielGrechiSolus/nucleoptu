import { ehLinkGit, linksSemGit, ocultaGit, semGitChamado } from './semgit';
import { montaChamado } from './parse';

describe('visão sem Git (perfil Sustentação)', () => {
  it('reconhece links do GitHub e não confunde com outros endereços', () => {
    expect(ehLinkGit('https://github.com/solussaude/banco/pull/3965')).toBe(true);
    expect(ehLinkGit('https://raw.githubusercontent.com/x/y')).toBe(true);
    expect(ehLinkGit('https://docs.google.com/document/d/abc')).toBe(false);
    expect(ehLinkGit('https://solussaude.atlassian.net/wiki/spaces/DES/pages/1')).toBe(false);
  });

  it('oculta links do Git em markdown e soltos, mantendo os demais', () => {
    const t = 'Veja [PR 3965](https://github.com/solussaude/banco/pull/3965), https://github.com/solussaude/ptu/pull/10 e [Plano](https://docs.google.com/document/d/abc).';
    const r = ocultaGit(t);
    expect(r.includes('github.com')).toBe(false);
    expect(r.includes('https://docs.google.com/document/d/abc')).toBe(true);
    expect(r.includes('PR 3965 [link do Git oculto]')).toBe(true);
  });

  it('remove da visão os links, as branches e os documentos do Git, mas deixa evidência e plano', () => {
    const c = montaChamado('568.098-x', {
      'REGRA.md': '---\nchamado: 568.098\ncliente: Cliente\nassunto: Assunto\nautor: Denys Sousa\nautorLogin: DenysSousa\ntipo: correcao\nsituacao: corrigido\npr: banco#3965\nevidencia: https://docs.google.com/document/d/evid\nplanoTestes: https://docs.google.com/document/d/plano\n---\n\n## Problema\nTexto.',
      'CONTEXTO.md': '# 568.098 - Cliente - Assunto\n\nBranch `hotfix/(568.098)-x`. PR: https://github.com/solussaude/banco/pull/3965',
      'GITHUB.md': '# GitHub\n[#3965](https://github.com/solussaude/banco/pull/3965)',
    })!;
    const v = semGitChamado(c);
    expect(Object.keys(v.docs).includes('GITHUB.md')).toBe(false);
    expect(JSON.stringify(v).includes('github.com')).toBe(false);
    expect(v.prs.every((p) => p.url === undefined)).toBe(true);
    expect(v.branches).toEqual([]);
    expect(v.evidencias.map((l) => l.url)).toEqual(['https://docs.google.com/document/d/evid']);
    expect(v.planosTeste.map((l) => l.url)).toEqual(['https://docs.google.com/document/d/plano']);
    expect(v.docs['REGRA.md'].includes('Texto.')).toBe(true);
    // a lógica da fila continua enxergando quem é o dono do PR
    expect(v.autoresLogin).toEqual(['DenysSousa']);
  });

  it('linksSemGit filtra a lista', () => {
    expect(linksSemGit([{ texto: 'PR', url: 'https://github.com/a/b' }, { texto: 'Doc', url: 'https://docs.google.com/x' }]).length).toBe(1);
  });
});
