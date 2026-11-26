export const CAMPOS_RELATUS = [
  { id: 'cliente', rotulo: 'Cliente' },
  { id: 'status', rotulo: 'Status' },
  { id: 'situacao', rotulo: 'Situação' },
  { id: 'etapa', rotulo: 'Etapa BusinessMap' },
  { id: 'prioridade', rotulo: 'Prioridade' },
  { id: 'modalidade', rotulo: 'Modalidade' },
  { id: 'motivo', rotulo: 'Motivo' },
  { id: 'solicitante', rotulo: 'Solicitante' },
  { id: 'operador', rotulo: 'Operador' },
  { id: 'release', rotulo: 'Release' },
  { id: 'dataAbertura', rotulo: 'Abertura', data: true },
  { id: 'previsaoInicio', rotulo: 'Previsão de início', data: true },
  { id: 'previsaoConclusao', rotulo: 'Previsão de conclusão', data: true },
  { id: 'dataConclusao', rotulo: 'Fechamento', data: true },
  { id: 'horasOrcadas', rotulo: 'Horas orçadas' },
  { id: 'horasAprovadas', rotulo: 'Horas aprovadas' },
  { id: 'horasRealizadas', rotulo: 'Horas realizadas' },
] as const;

type CampoRelatus = (typeof CAMPOS_RELATUS)[number]['id'] | 'numero' | 'titulo';

export type AtendimentoRelatus = Partial<Record<CampoRelatus, string>>;

export function somenteCamposExibidos(origem: Record<string, unknown>): AtendimentoRelatus {
  const ids: CampoRelatus[] = ['numero', 'titulo', ...CAMPOS_RELATUS.map((c) => c.id)];
  return Object.fromEntries(
    ids.flatMap((id) => {
      const v = origem[id];
      return (typeof v === 'string' && v.trim()) || typeof v === 'number' ? [[id, String(v)]] : [];
    }),
  );
}

export function formataData(valor: string): string {
  const [, ano, mes, dia] = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor) ?? [];
  return ano ? `${dia}/${mes}/${ano}` : valor;
}
