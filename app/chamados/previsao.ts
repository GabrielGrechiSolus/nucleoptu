import type { Chamado } from './parse';

export function previsaoDe(c: Pick<Chamado, 'revision' | 'situacao' | 'previsaoRevision'>, previsaoGlobal: number | null): string {
  if (c.revision || c.situacao !== 'corrigido') return '';
  return previsaoGlobal ? String(previsaoGlobal) : c.previsaoRevision ?? '';
}
