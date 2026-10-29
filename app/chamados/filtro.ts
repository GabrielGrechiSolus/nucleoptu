// Filtros da lista de contextos. Função pura: a página a chama a cada renderização, sem memoização,
// para que nenhum filtro fique de fora das dependências e deixe de funcionar.
import type { Chamado } from './parse';

export type Tri = 'todos' | 'sim' | 'nao';
export type Aba = 'todos' | 'em-correcao' | 'corrigidos' | 'regras';

export interface Filtros {
  busca: string;
  noConteudo: boolean;
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
  noConteudo: false,
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

// Sem acentos e sem diferenciar maiúsculas: "denys" encontra "Denys Sousa" e "zandona" encontra "Zandoná".
export const normaliza = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function filtraChamados(itens: Chamado[], f: Filtros): Chamado[] {
  const q = normaliza(f.busca.trim());
  const autor = normaliza(f.autor);
  return itens.filter((c) => {
    if (f.aba === 'em-correcao' && c.situacao !== 'em-correcao') return false;
    if (f.aba === 'corrigidos' && c.situacao !== 'corrigido') return false;
    if (f.aba === 'regras' && c.tipo !== 'regra' && c.tipo !== 'orientacao') return false;
    if (!passa(!!c.temPr, f.pr) || !passa(!!c.temEvidencia, f.evidencia) || !passa(!!c.temPlano, f.plano) || !passa(!!c.temRegra, f.regra)) return false;
    if (f.cliente && c.cliente !== f.cliente) return false;
    if (f.modulo && c.modulo !== f.modulo) return false;
    if (autor && !(c.autores ?? []).some((a) => normaliza(a) === autor)) return false;
    if (f.revision && c.revision !== f.revision) return false;
    if (!q) return true;
    const cabecalho = normaliza(
      [c.numero, c.id, c.cliente, c.assunto, c.resumo, c.status, c.modulo, c.caminhoTela, c.revision, ...(c.autores ?? []), ...(c.autoresLogin ?? []), ...(c.prs ?? []).map((p) => `${p.repo ?? ''} ${p.numero}`), ...(c.branches ?? [])].join(' '),
    );
    if (cabecalho.includes(q)) return true;
    return f.noConteudo && Object.values(c.docs ?? {}).some((t) => normaliza(t).includes(q));
  });
}
