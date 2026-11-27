import { contemTermo, indexa, termosDaBusca } from '../busca/motor';
import { cartaoSemGit } from './bm';
import type { CartaoQuadro } from './bmQuadro';
import type { RegistroBm } from './bmRegistro';
import type { Chamado } from './parse';
import { ocultaGit } from './semgit';

export type Origem = 'Chamado' | 'PR e Git' | 'Documentos' | 'Businessmap';

export interface IndiceChamado {
  tudo: string;
  porOrigem: Record<Origem, string>;
}

export function textoDoBm(registro?: RegistroBm, doQuadro: CartaoQuadro[] = [], semGit = false): unknown[] {
  const resumo = registro?.resumo;
  const c = registro?.cartao ? (semGit ? cartaoSemGit(registro.cartao, ocultaGit) : registro.cartao) : undefined;
  return [
    registro?.cardId,
    resumo?.coluna, resumo?.secao, resumo?.responsavel, resumo?.url,
    resumo?.bloqueado ? 'bloqueado' : '',
    c?.titulo, c?.tipo, c?.raia, c?.prioridade, c?.solicitante, c?.motivoBloqueio, c?.descricao,
    ...(c?.coResponsaveis ?? []),
    ...(c?.tags ?? []),
    ...(c?.campos ?? []).flatMap((x) => [x.nome, x.valor]),
    ...(c?.subtarefas ?? []).flatMap((x) => [x.descricao, x.responsavel]),
    ...(c?.comentarios ?? []).flatMap((x) => [x.autor, x.texto]),
    ...(c?.anexos ?? []).flatMap((x) => [x.nome, x.link]),
    ...(c?.vinculados ?? []).flatMap((x) => [x.cardId, x.chamado, x.titulo]),
    ...doQuadro.flatMap((x) => [x.cardId, x.customId, x.titulo, x.tipo, x.coluna, x.responsavel, x.url]),
  ];
}

export function indiceDoChamado(c: Chamado, registro?: RegistroBm, doQuadro: CartaoQuadro[] = [], semGit = false): IndiceChamado {
  const links = [...(c.evidencias ?? []), ...(c.planosTeste ?? [])].flatMap((l) => [l.texto, l.url]);
  const porOrigem: Record<Origem, string> = {
    Chamado: indexa([c.numero, c.id, c.cliente, c.assunto, c.resumo, c.status, c.modulo, c.caminhoTela, c.revision, c.previsaoRevision, ...(c.autores ?? [])]),
    'PR e Git': indexa([
      ...(c.autoresLogin ?? []),
      ...(c.prs ?? []).flatMap((p) => [`${p.repo ?? ''}#${p.numero}`, p.url]),
      ...(c.branches ?? []),
    ]),
    Documentos: indexa([...links, ...Object.entries(c.docs ?? {}).flat()]),
    Businessmap: indexa(textoDoBm(registro, doQuadro, semGit)),
  };
  return { tudo: Object.values(porOrigem).join(' \n '), porOrigem };
}

export function ondeEncontrou(indice: IndiceChamado, consulta: string): Origem[] {
  const fora = termosDaBusca(consulta).filter((t) => !contemTermo(indice.porOrigem.Chamado, t));
  const origens = fora.map((t) => (['PR e Git', 'Businessmap', 'Documentos'] as Origem[]).find((o) => contemTermo(indice.porOrigem[o], t)));
  return [...new Set(origens.filter((o): o is Origem => Boolean(o)))];
}
