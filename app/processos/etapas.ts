export interface ColunaFluxo {
  id: number;
  nome: string;
  posicao: number;
}

export type SituacaoEtapa = 'feita' | 'atual' | 'proxima' | 'futura';

export interface EtapaFluxo {
  id: number;
  nome: string;
  fase: string;
  situacao: SituacaoEtapa;
}

export interface FaseFluxo {
  nome: string;
  etapas: EtapaFluxo[];
}

export interface PosicaoNoFluxo {
  fases: FaseFluxo[];
  atual: EtapaFluxo | null;
  anterior: EtapaFluxo | null;
  proxima: EtapaFluxo | null;
  feitas: number;
  total: number;
}

const semAcento = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Fases do Fluxo Operacional do BM (quadro Núcleo PTU/Contas). A ordem das regras importa.
const REGRAS_FASE: [RegExp, string][] = [
  [/entendimento|aceite/, 'Entendimento e Validação'],
  [/revisao qa|documenta/, 'Documentação'],
  [/analis/, 'Análise'],
  [/revisao|orcamento|backlog/, 'Revisão'],
  [/desenvolvimento|review/, 'Desenvolvimento'],
  [/teste/, 'QA/Testes'],
  [/merge|release/, 'Merge & Release'],
  [/conclu|archive/, 'Concluído'],
];

export function faseDaColuna(nome: string): string {
  const n = semAcento(nome);
  return REGRAS_FASE.find(([re]) => re.test(n))?.[1] ?? 'Outras etapas';
}

export function posicaoNoFluxo(colunas: ColunaFluxo[], colunaAtualId: number): PosicaoNoFluxo {
  const ordenadas = [...colunas].sort((a, b) => a.posicao - b.posicao);
  const indiceAtual = ordenadas.findIndex((c) => c.id === colunaAtualId);
  const etapas: EtapaFluxo[] = ordenadas.map((c, i) => ({
    id: c.id,
    nome: c.nome,
    fase: faseDaColuna(c.nome),
    situacao: indiceAtual < 0 ? 'futura' : i < indiceAtual ? 'feita' : i === indiceAtual ? 'atual' : i === indiceAtual + 1 ? 'proxima' : 'futura',
  }));

  const fases: FaseFluxo[] = [];
  for (const e of etapas) {
    const ultima = fases[fases.length - 1];
    if (ultima && ultima.nome === e.fase) ultima.etapas.push(e);
    else fases.push({ nome: e.fase, etapas: [e] });
  }

  return {
    fases,
    atual: indiceAtual >= 0 ? etapas[indiceAtual] : null,
    anterior: indiceAtual > 0 ? etapas[indiceAtual - 1] : null,
    proxima: indiceAtual >= 0 ? etapas[indiceAtual + 1] ?? null : null,
    feitas: Math.max(indiceAtual, 0),
    total: etapas.length,
  };
}
