// Monta contextos de chamados a partir dos PRs de uma pessoa no GitHub (criando novos e atualizando os existentes).
// Lógica pura (sem Firebase nem rede) para poder ser testada. A busca no GitHub fica em /api/git/perfil.
import { montaChamado, type Chamado } from './parse';

export interface PrGithub {
  repo: string;
  numero: number;
  titulo: string;
  url: string;
  criadoEm: string;
  fechadoEm: string;
  mescladoEm: string;
  estado: 'aberto' | 'mesclado' | 'fechado';
  corpo: string;
  rascunho: boolean;
}

export interface UsuarioGithub {
  login: string;
  nome: string;
  avatar: string;
  url: string;
  repositorios?: number;
  seguidores?: number;
}

export const REPO_TESTES = 'TestesIntegracao';

// O título do PR é igual ao nome da branch: tipo/(000.000)-assunto.
export function chamadoDoTitulo(titulo: string): string | null {
  const m = titulo.match(/\((\d{3})\.?(\d{3})\)/) ?? titulo.match(/\b(\d{3})\.(\d{3})\b/);
  return m ? `${m[1]}.${m[2]}` : null;
}

export function agrupaPorChamado(prs: PrGithub[]) {
  const grupos = new Map<string, PrGithub[]>();
  const semChamado: PrGithub[] = [];
  for (const p of prs) {
    const n = chamadoDoTitulo(p.titulo);
    if (n) grupos.set(n, [...(grupos.get(n) ?? []), p]);
    else semChamado.push(p);
  }
  return { grupos, semChamado };
}

const humaniza = (s: string) => {
  const t = s.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export const assuntoDoTitulo = (titulo: string) => humaniza(titulo.replace(/^[^(]*\(\d{3}\.?\d{3}\)[-\s]*/, '') || titulo);

const secaoDoCorpo = (corpo: string, re: RegExp) => {
  const linhas = corpo.replace(/\r\n/g, '\n').split('\n');
  const i = linhas.findIndex((l) => /^#{1,6}\s/.test(l) && re.test(l));
  if (i < 0) return '';
  const out: string[] = [];
  for (let j = i + 1; j < linhas.length; j++) {
    if (/^#{1,6}\s/.test(linhas[j])) break;
    out.push(linhas[j]);
  }
  return out.join('\n').trim();
};

const urlComRotulo = (corpo: string, rotulo: string) => {
  const m = corpo.match(new RegExp(`\\[[^\\]]*${rotulo}[^\\]]*\\]\\((https?:[^)\\s]+)\\)`, 'i'));
  return m ? m[1] : '';
};

const br = (iso: string) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');
const unicos = <T,>(l: T[]) => [...new Set(l)];

export interface ResultadoContexto {
  chamado: Chamado;
  novo: boolean;
}

// Revision em que cada PR mesclado saiu (chave repo#número), vinda da API de revisions; null = ainda não saiu.
export type RevisoesPorPr = Record<string, number | null | undefined>;

export type PrevisoesPorPr = Record<string, number | undefined>;

// prs: PRs da pessoa para este chamado. existente: contexto já gravado (ou null).
// revisoes: quando informado, define a revision do contexto; sem ele, a revision existente é preservada.
export function montaContextoDePrs(numero: string, prs: PrGithub[], usuario: UsuarioGithub, existente: Chamado | null, hojeIso: string, revisoes?: RevisoesPorPr, previsoes?: PrevisoesPorPr): ResultadoContexto {
  const ordenados = [...prs].sort((a, b) => (a.criadoEm < b.criadoEm ? -1 : 1));
  const principais = ordenados.filter((p) => p.repo !== REPO_TESTES);
  const base = principais.find((p) => p.repo === 'banco') ?? principais[0] ?? ordenados[0];
  const efetivos = principais.filter((p) => p.estado !== 'fechado'); // PR fechado sem merge não conta como correção

  const chaveNova = new Set(ordenados.map((p) => `${p.repo}#${p.numero}`));
  const prsExistentes = (existente?.prs ?? []).filter((p) => p.repo).map((p) => `${p.repo}#${p.numero}`);
  const outrosPrincipais = prsExistentes.filter((k) => !chaveNova.has(k) && !k.startsWith(`${REPO_TESTES}#`));

  let situacao: 'em-correcao' | 'corrigido' | 'encerrado' = !principais.length || efetivos.some((p) => p.estado === 'aberto') ? 'em-correcao' : efetivos.length ? 'corrigido' : 'encerrado';
  // PRs de outras pessoas ainda em correção no contexto existente mantêm o chamado em correção.
  if (situacao !== 'em-correcao' && existente?.situacao === 'em-correcao' && outrosPrincipais.length) situacao = 'em-correcao';

  const mesclados = efetivos.filter((p) => p.estado === 'mesclado').map((p) => p.mescladoEm.slice(0, 10)).filter(Boolean);
  const publicadoNovo = mesclados.sort().pop() ?? '';
  const publicadoEm = situacao === 'corrigido' ? [publicadoNovo, existente?.publicadoEm ?? ''].sort().pop() ?? '' : '';

  // Revision: a maior entre os PRs mesclados, só quando todos já saíram em alguma revision; em correção fica em branco.
  let revision = existente?.revision ?? '';
  if (revisoes) {
    const mescladosPrincipais = efetivos.filter((p) => p.estado === 'mesclado');
    if (situacao === 'em-correcao') revision = '';
    else if (situacao === 'corrigido' && mescladosPrincipais.length) {
      const revs = mescladosPrincipais.map((p) => revisoes[`${p.repo}#${p.numero}`]);
      revision = revs.every((r) => typeof r === 'number') ? String(Math.max(...(revs as number[]))) : '';
    }
    // PRs de outras pessoas já mesclados neste chamado: a revision existente também vale
    if (revision && outrosPrincipais.length && existente?.revision) revision = String(Math.max(Number(existente.revision), Number(revision)));
  }

  let previsaoRevision = revision ? '' : existente?.previsaoRevision ?? '';
  if (revisoes) {
    const aguardando = efetivos
      .filter((p) => p.estado === 'mesclado' && typeof revisoes[`${p.repo}#${p.numero}`] !== 'number')
      .map((p) => previsoes?.[`${p.repo}#${p.numero}`])
      .filter((v): v is number => typeof v === 'number');
    previsaoRevision = situacao === 'corrigido' && !revision && aguardando.length ? String(Math.max(...aguardando)) : '';
  }

  const nomeAutor = usuario.nome || usuario.login;
  const autores = unicos([...(existente?.autores ?? []), nomeAutor]);
  const logins = unicos([...(existente?.autoresLogin ?? []), usuario.login]);
  const tipo = existente?.tipo && existente.tipo !== 'regra' && existente.tipo !== 'orientacao' ? existente.tipo : /^feature\//i.test(base.titulo) ? 'melhoria' : 'correcao';
  const cliente = existente?.cliente && !/n[aã]o informado/i.test(existente.cliente) ? existente.cliente : 'Não informado';
  const assunto = existente?.assunto || assuntoDoTitulo(base.titulo);
  const evidencia = ordenados.map((p) => urlComRotulo(p.corpo, 'evid')).find(Boolean) || existente?.evidencias?.[0]?.url || '';
  const plano = ordenados.map((p) => urlComRotulo(p.corpo, 'plano')).find(Boolean) || existente?.planosTeste?.[0]?.url || '';
  const prCampo = unicos([...prsExistentes, ...ordenados.map((p) => `${p.repo}#${p.numero}`)]).join(', ');

  const front = [
    '---',
    `chamado: ${numero}`,
    `cliente: ${cliente}`,
    `assunto: ${assunto}`,
    `autor: ${autores.join(', ')}`,
    `autorLogin: ${logins.join(', ')}`,
    `tipo: ${tipo}`,
    `situacao: ${situacao}`,
    `modulo: ${existente?.modulo ?? ''}`,
    `caminhoTela: ${existente?.caminhoTela ?? ''}`,
    `revision: ${revision}`,
    `previsaoRevision: ${previsaoRevision}`,
    `publicadoEm: ${publicadoEm}`,
    `pr: ${prCampo}`,
    `evidencia: ${evidencia}`,
    `planoTestes: ${plano}`,
    '---',
    '',
  ].join('\n');

  // Texto de regra: preserva o que já existe; senão usa o que o próprio PR traz.
  const corpoPr = (base.corpo || '').replace(/<!--[\s\S]*?-->/g, '').trim();
  const regraPr = secaoDoCorpo(base.corpo || '', /regra de neg/i) || secaoDoCorpo(base.corpo || '', /descri[cç][aã]o$/i) || (corpoPr.length > 1800 ? `${corpoPr.slice(0, 1800)}\n\n[... texto do PR truncado; veja a aba GitHub ...]` : corpoPr);
  const regraTxt =
    existente?.docs?.['REGRA.md'] ??
    `## ${situacao === 'corrigido' ? 'O que foi corrigido' : 'O que está sendo corrigido'}\n${regraPr || 'O PR não tem descrição.'}\n\n## Como funciona agora\nA completar pelo analista.\n\n## Como orientar o cliente\n${situacao === 'corrigido' ? 'Atualizar a revision indicada e conferir o resultado.' : 'Ainda não disponível; não informar prazo ao cliente.'}\n\n## Origem do texto\nTexto base copiado do PR de ${nomeAutor}. A regra deve revisar e completar o que faltar.\n`;

  let gh = `# GitHub — ${numero}\n\nAtualizado automaticamente em ${br(hojeIso)} a partir do GitHub de ${nomeAutor} (${usuario.login}).\n\n## PRs\n\n| PR | Repositório | Situação | Criado | Fechado | Mesclado |\n|---|---|---|---|---|---|\n`;
  for (const p of ordenados) gh += `| [#${p.numero}](${p.url}) | ${p.repo} | ${p.estado}${p.rascunho ? ' (rascunho)' : ''} | ${br(p.criadoEm)} | ${br(p.fechadoEm)} | ${br(p.mescladoEm)} |\n`;
  for (const p of ordenados) gh += `\n## ${p.repo}#${p.numero} — ${p.titulo}\n\n${(p.corpo || '(sem descrição)').trim()}\n`;

  const outrosDocs = Object.fromEntries(Object.entries(existente?.docs ?? {}).filter(([n]) => n !== 'REGRA.md' && n !== 'GITHUB.md'));
  const arquivos = { ...outrosDocs, 'REGRA.md': front + '\n' + regraTxt, 'GITHUB.md': gh };
  const montado = montaChamado(`${numero}-${assunto}`, arquivos);
  if (!montado) throw new Error(`Não foi possível montar o contexto ${numero}.`);
  montado.atualizadoEm = br(hojeIso);
  if (existente?.atualizadoEm && !existente.atualizadoEm.includes('—')) montado.atualizadoEm = br(hojeIso);
  return { chamado: montado, novo: !existente };
}
