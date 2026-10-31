export interface ExecucaoCheck {
  name: string;
  status: string;
  conclusion: string | null;
}

export interface StatusLegado {
  context: string;
  state: string;
}

export type EstadoChecks = 'sucesso' | 'falha' | 'pendente' | 'sem-checks';

export interface ResumoChecks {
  estado: EstadoChecks;
  total: number;
  falhas: string[];
  pendentes: string[];
}

const OK = new Set(['success', 'neutral', 'skipped']);

export function resumoDeChecks(execucoes: ExecucaoCheck[], statusLegado: StatusLegado[] = []): ResumoChecks {
  const falhas: string[] = [];
  const pendentes: string[] = [];
  for (const e of execucoes) {
    if (e.status !== 'completed') pendentes.push(e.name);
    else if (!OK.has(e.conclusion ?? '')) falhas.push(e.name);
  }
  for (const s of statusLegado) {
    if (s.state === 'pending') pendentes.push(s.context);
    else if (s.state !== 'success') falhas.push(s.context);
  }
  const total = execucoes.length + statusLegado.length;
  const estado: EstadoChecks = !total ? 'sem-checks' : falhas.length ? 'falha' : pendentes.length ? 'pendente' : 'sucesso';
  return { estado, total, falhas, pendentes };
}
