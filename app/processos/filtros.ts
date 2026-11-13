export interface FiltrosProcessos {
  busca: string;
  mostrar: 'todos' | 'com' | 'sem';
  andamento: 'todos' | 'andamento' | 'concluidos';
  coluna: string;
  situacao: string;
  cliente: string;
  report: 'todos' | 'com' | 'sem';
  bloqueado: 'todos' | 'sim' | 'nao';
}

export const FILTROS_INICIAIS: FiltrosProcessos = {
  busca: '',
  mostrar: 'todos',
  andamento: 'andamento',
  coluna: '',
  situacao: '',
  cliente: '',
  report: 'todos',
  bloqueado: 'todos',
};

export interface LinhaFiltro {
  texto: string;
  coluna: string;
  concluido: boolean;
  bloqueado: boolean;
  report: boolean;
  situacao: string;
  cliente: string;
  temPr: boolean;
}

export function passaFiltros(l: LinhaFiltro, f: FiltrosProcessos): boolean {
  if (f.mostrar === 'com' && !l.temPr) return false;
  if (f.mostrar === 'sem' && l.temPr) return false;
  if (f.andamento === 'andamento' && l.concluido) return false;
  if (f.andamento === 'concluidos' && !l.concluido) return false;
  if (f.coluna && l.coluna !== f.coluna) return false;
  if (f.situacao && l.situacao !== f.situacao) return false;
  if (f.cliente && l.cliente !== f.cliente) return false;
  if (f.report === 'com' && !l.report) return false;
  if (f.report === 'sem' && l.report) return false;
  if (f.bloqueado === 'sim' && !l.bloqueado) return false;
  if (f.bloqueado === 'nao' && l.bloqueado) return false;
  const q = f.busca.trim().toLowerCase();
  return !q || l.texto.toLowerCase().includes(q);
}

export const filtrosAtivos = (f: FiltrosProcessos) => (Object.keys(FILTROS_INICIAIS) as (keyof FiltrosProcessos)[]).filter((k) => f[k] !== FILTROS_INICIAIS[k]).length;
