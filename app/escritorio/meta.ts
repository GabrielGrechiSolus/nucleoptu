// Meta de chamados é invertida: quanto menos chamados abertos, melhor (menos demandas).
// A meta é o máximo de abertos no mês e só é considerada batida depois que o mês termina.

export type SituacaoMeta = 'sem-contagem' | 'dentro' | 'acima' | 'batida' | 'nao-batida';

export interface ResultadoMeta {
  situacao: SituacaoMeta;
  excesso: number; // quantos chamados acima do máximo
  percentual: number; // quanto do máximo está ocupado, de 0 a 100
  rotulo: string;
}

export const mesDe = (data: Date) => `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;

export function avaliaMeta(maximo: number | undefined, abertos: number | undefined, mes: string | undefined, mesAtual: string): ResultadoMeta {
  const limite = Number(maximo);
  if (abertos === undefined || abertos === null || !Number.isFinite(limite) || limite <= 0) {
    return { situacao: 'sem-contagem', excesso: 0, percentual: 0, rotulo: 'Informe os chamados abertos' };
  }
  const excesso = Math.max(0, abertos - limite);
  const percentual = Math.min(100, Math.round((100 * Math.max(0, abertos)) / limite));
  const encerrado = !!mes && mes < mesAtual;
  const situacao: SituacaoMeta = excesso ? (encerrado ? 'nao-batida' : 'acima') : encerrado ? 'batida' : 'dentro';
  const rotulo = {
    batida: 'Meta batida · falta o salgadinho',
    'nao-batida': `Meta não batida (+${excesso})`,
    acima: `Acima da meta (+${excesso})`,
    dentro: 'Dentro da meta · confirma no fim do mês',
  }[situacao];
  return { situacao, excesso, percentual, rotulo };
}
