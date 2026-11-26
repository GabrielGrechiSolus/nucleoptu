export type Cor = 'info' | 'ok' | 'alert' | 'error' | 'neutro';

const normaliza = (v: string) => v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export function corDoStatus(status: string): Cor {
  const s = normaliza(status);
  if (/cancel|reprov|recusad/.test(s)) return 'error';
  if (/standby|stand by|aguard|pendent|paus|bloque/.test(s)) return 'alert';
  if (!/\bnao\b/.test(s) && /conclu|fechad|encerrad|resolvid|finalizad/.test(s)) return 'ok';
  return 'info';
}

export function corDaPrioridade(prioridade: string): Cor {
  const p = normaliza(prioridade);
  if (/critic|urgent/.test(p)) return 'error';
  if (/\balta\b/.test(p)) return 'alert';
  return 'info';
}

const CORES_MENSAGEM: Record<string, Cor> = { E: 'info', W: 'alert', L: 'ok', C: 'ok', R: 'error', O: 'neutro' };

export const corDaMensagem = (tipo: string): Cor => CORES_MENSAGEM[tipo] ?? 'info';

export const classeDaEtiqueta = (cor: Cor) => (cor === 'neutro' ? 'rel-tag' : `rel-tag rel-tag-${cor}`);
