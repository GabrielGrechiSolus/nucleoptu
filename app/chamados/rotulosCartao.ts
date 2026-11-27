import type { Atencao } from './bmQuadro';

export const dataBr = (iso: string) => {
  const d = new Date(iso);
  return iso && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR') : '—';
};

export const ROTULO_ATENCAO: Record<Atencao, string> = {
  report: 'Report',
  bloqueado: 'Bloqueado',
  prazo: 'Prazo vencido',
  parado: 'Parado',
  'sem-responsavel': 'Sem responsável',
  prioridade: 'Prioridade',
};

export const COR_ATENCAO: Record<Atencao, string> = {
  report: 'rel-tag-error',
  bloqueado: 'rel-tag-error',
  prazo: 'rel-tag-alert',
  parado: 'rel-tag-alert',
  'sem-responsavel': 'rel-tag',
  prioridade: 'rel-tag-alert',
};
