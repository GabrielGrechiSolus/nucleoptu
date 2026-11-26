import { criaConsultaSalva } from '../chamados/dadosSalvos';

const VALIDADE_MS = 10 * 60_000;

export interface RespostaRevisoes<T> { erro?: string; revisoes?: T[]; falhas?: { repo: string; erro: string }[] }

const consulta = criaConsultaSalva<RespostaRevisoes<unknown>>({ nome: 'revisoes', validade: () => VALIDADE_MS, guarda: (r) => !r.falhas?.length });

async function pede(token: string): Promise<RespostaRevisoes<unknown>> {
  const resposta = await fetch('/api/git/revisoes', { headers: { Authorization: `Bearer ${token}` } });
  const corpo = await resposta.text();
  let dados: RespostaRevisoes<unknown>;
  try {
    dados = JSON.parse(corpo) as RespostaRevisoes<unknown>;
  } catch {
    throw new Error(corpo.trim() ? 'A API de revisions retornou uma resposta inválida.' : 'A API de revisions retornou uma resposta vazia. Tente novamente mais tarde.');
  }
  if (!resposta.ok) throw new Error(dados.erro ?? dados.falhas?.map((f) => `${f.repo}: ${f.erro}`).join(' · ') ?? 'Não foi possível carregar as revisions da Qualidade.');
  return dados;
}

export const lerRevisoes = <T>(token: string, atualizar = false) =>
  consulta.obtem('todas', () => pede(token), atualizar) as Promise<RespostaRevisoes<T>>;
