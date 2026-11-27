// Filtros da lista de contextos. Função pura: a página a chama a cada renderização, sem memoização,
// para que nenhum filtro fique de fora das dependências e deixe de funcionar.
import { indiceContem, normaliza, termosDaBusca } from '../busca/motor';
import { indiceDoChamado, type IndiceChamado } from './buscaChamado';
import type { Chamado } from './parse';

export type Tri = 'todos' | 'sim' | 'nao';
export type Aba = 'todos' | 'em-correcao' | 'corrigidos' | 'regras';

export interface Filtros {
  busca: string;
  aba: Aba;
  pr: Tri;
  evidencia: Tri;
  plano: Tri;
  regra: Tri;
  cliente: string;
  modulo: string;
  autor: string;
  revision: string;
}

export const FILTROS_VAZIOS: Filtros = {
  busca: '',
  aba: 'todos',
  pr: 'todos',
  evidencia: 'todos',
  plano: 'todos',
  regra: 'todos',
  cliente: '',
  modulo: '',
  autor: '',
  revision: '',
};

const passa = (v: boolean, f: Tri) => f === 'todos' || (f === 'sim' ? v : !v);

export { normaliza };

// Sem PR o chamado fica em "Regras e orientações"; ao ganhar um PR, passa para a aba da sua situação.
export function pertenceAba(c: Chamado, aba: Aba): boolean {
  if (aba === 'todos') return true;
  if (aba === 'regras') return !c.temPr;
  return !!c.temPr && c.situacao === (aba === 'em-correcao' ? 'em-correcao' : 'corrigido');
}

export function filtraChamados(itens: Chamado[], f: Filtros, indices?: Map<string, IndiceChamado>): Chamado[] {
  const termos = termosDaBusca(f.busca);
  const autor = normaliza(f.autor);
  return itens.filter((c) => {
    if (!pertenceAba(c, f.aba)) return false;
    if (!passa(!!c.temPr, f.pr) || !passa(!!c.temEvidencia, f.evidencia) || !passa(!!c.temPlano, f.plano) || !passa(!!c.temRegra, f.regra)) return false;
    if (f.cliente && c.cliente !== f.cliente) return false;
    if (f.modulo && c.modulo !== f.modulo) return false;
    if (autor && !(c.autores ?? []).some((a) => normaliza(a) === autor)) return false;
    if (f.revision && c.revision !== f.revision) return false;
    return !termos.length || indiceContem((indices?.get(c.id) ?? indiceDoChamado(c)).tudo, termos);
  });
}
