import { indexa, indiceContem, termosDaBusca } from '../busca/motor';
import { atencaoDe, concluido, ehReport, type CartaoQuadro } from './bmQuadro';
import type { RegistroBm } from './bmRegistro';
import { textoDoBm } from './buscaChamado';

export type AbaCartoes = 'andamento' | 'atencao' | 'concluidos' | 'todos';

export interface FiltrosCartoes {
  aba: AbaCartoes;
  responsavel: string;
  coluna: string;
  tipo: string;
  semNumero: boolean;
}

export const FILTROS_CARTOES: FiltrosCartoes = { aba: 'andamento', responsavel: '', coluna: '', tipo: '', semNumero: false };

const digitos = (v: string) => v.replace(/\D/g, '');

// Cartões do quadro que ainda não têm PR. Quando o chamado já tem contexto, ele aparece pela lista de contextos.
export function cartoesSemContexto(cartoes: CartaoQuadro[], contextos: { id: string }[]): CartaoQuadro[] {
  const comContexto = new Set(contextos.map((c) => digitos(c.id)));
  return cartoes.filter((c) => !ehReport(c) && !(c.numero && comContexto.has(digitos(c.numero))));
}

export function buscaCartoes(cartoes: CartaoQuadro[], busca: string, registros: Record<string, RegistroBm>, semGit = false): CartaoQuadro[] {
  const termos = termosDaBusca(busca);
  if (!termos.length) return cartoes;
  return cartoes.filter((c) => {
    const registro = c.numero ? registros[digitos(c.numero)] : undefined;
    return indiceContem(indexa([c.numero, ...textoDoBm(registro, [c], semGit)]), termos);
  });
}

export function filtraCartoes(cartoes: CartaoQuadro[], f: FiltrosCartoes, reports: Map<string, CartaoQuadro[]>, agora: number): CartaoQuadro[] {
  return cartoes.filter((c) => {
    if (!f.semNumero && !c.numero) return false;
    if (f.aba === 'andamento' && concluido(c)) return false;
    if (f.aba === 'concluidos' && !concluido(c)) return false;
    if (f.aba === 'atencao' && atencaoDe(c, c.numero ? reports.get(c.numero) : undefined, agora).length === 0) return false;
    if (f.responsavel && c.responsavel !== f.responsavel) return false;
    if (f.coluna && c.coluna !== f.coluna) return false;
    return !f.tipo || c.tipo === f.tipo;
  });
}
