export const TIPO_BUG = 7;
export const DIAS_PARADO = 15;

export interface CartaoQuadro {
  cardId: number;
  customId: string;
  numero: string;
  titulo: string;
  tipoId: number | null;
  tipo: string;
  colunaId: number;
  coluna: string;
  secao: number;
  ownerId: number | null;
  responsavel: string;
  bloqueado: boolean;
  prioridade: number | null;
  prazo: string;
  criadoEm: string;
  atualizadoEm: string;
  naColunaDesde: string;
  boardId: number;
  url: string;
}

export const ROTULO_SECAO: Record<number, string> = {
  1: 'Backlog',
  2: 'Análise',
  3: 'Desenvolvimento e entrega',
  4: 'Concluído',
  5: 'Documentado',
};

export const ROTULO_PRIORIDADE: Record<number, string> = { 1: 'Crítica', 2: 'Alta', 3: 'Média', 4: 'Baixa' };

const soDigitos = (t: string) => t.replace(/\D/g, '');

export function numeroDoChamado(customId: string | null | undefined, titulo: string | null | undefined): string {
  const c = soDigitos(String(customId ?? ''));
  if (c.length >= 5 && c.length <= 7) return c;
  const m = String(titulo ?? '').match(/^\s*(\d{2,3})\.?(\d{3})\b/);
  return m ? `${m[1]}${m[2]}` : '';
}

export function numeroDoReport(titulo: string): string {
  const m = titulo.match(/report\w*\W{0,12}(\d{2,3})\.?(\d{3})\b/i);
  return m ? `${m[1]}${m[2]}` : '';
}

export const ehReport = (c: Pick<CartaoQuadro, 'tipoId' | 'titulo'>) => c.tipoId === TIPO_BUG && numeroDoReport(c.titulo) !== '';

export const concluido = (c: Pick<CartaoQuadro, 'secao'>) => c.secao >= 4;

export function reportsPorNumero(cartoes: CartaoQuadro[]): Map<string, CartaoQuadro[]> {
  const mapa = new Map<string, CartaoQuadro[]>();
  for (const c of cartoes) {
    if (!ehReport(c)) continue;
    const n = numeroDoReport(c.titulo);
    mapa.set(n, [...(mapa.get(n) ?? []), c]);
  }
  return mapa;
}

export const reportsAtivos = (reports: CartaoQuadro[] | undefined) => (reports ?? []).filter((r) => !concluido(r));

export function diasDesde(iso: string, agora: number): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.max(0, Math.floor((agora - t) / 86_400_000)) : 0;
}

export type Atencao = 'report' | 'bloqueado' | 'prazo' | 'parado' | 'sem-responsavel' | 'prioridade';

export function atencaoDe(c: CartaoQuadro, reports: CartaoQuadro[] | undefined, agora: number): Atencao[] {
  if (concluido(c)) return [];
  const lista: Atencao[] = [];
  if (reportsAtivos(reports).length) lista.push('report');
  if (c.bloqueado) lista.push('bloqueado');
  const prazo = Date.parse(c.prazo);
  if (Number.isFinite(prazo) && prazo < agora) lista.push('prazo');
  if (diasDesde(c.naColunaDesde, agora) >= DIAS_PARADO) lista.push('parado');
  if (!c.ownerId) lista.push('sem-responsavel');
  if (c.prioridade === 1 || c.prioridade === 2) lista.push('prioridade');
  return lista;
}

export function pontuacao(c: CartaoQuadro, reports: CartaoQuadro[] | undefined, agora: number): number {
  if (concluido(c)) return 0;
  const a = atencaoDe(c, reports, agora);
  let p = 0;
  if (a.includes('report')) p += 50;
  if (a.includes('bloqueado')) p += 30;
  if (a.includes('prazo')) p += 30;
  if (c.prioridade === 1) p += 20;
  else if (c.prioridade === 2) p += 10;
  if (a.includes('parado')) p += Math.min(diasDesde(c.naColunaDesde, agora), 40) / 2;
  if (a.includes('sem-responsavel')) p += 5;
  return p;
}

export function registroResumoDoCartao(c: CartaoQuadro) {
  return {
    cardId: c.cardId,
    chamado: c.numero,
    coluna: c.coluna,
    secao: ROTULO_SECAO[c.secao] ?? '',
    bloqueado: c.bloqueado,
    prazo: c.prazo,
    responsavel: c.responsavel || '—',
    url: c.url,
    atualizadoEm: c.atualizadoEm,
  };
}

export function mudou(antigo: CartaoQuadro | undefined, novo: CartaoQuadro): boolean {
  if (!antigo) return true;
  return antigo.atualizadoEm !== novo.atualizadoEm || antigo.colunaId !== novo.colunaId || antigo.bloqueado !== novo.bloqueado || antigo.ownerId !== novo.ownerId || antigo.titulo !== novo.titulo;
}

export const formataNumero = (n: string) => (n.length === 6 ? `${n.slice(0, 3)}.${n.slice(3)}` : n);
