import { concluido, ehReport, pontuacao, type CartaoQuadro } from './bmQuadro';
import type { Chamado } from './parse';

const digitos = (v: string) => v.replace(/\D/g, '');

export type LinhaLista = Chamado & { cartao?: CartaoQuadro };

// Cartões do quadro que ainda não têm PR. Quando o chamado já tem contexto, ele aparece pelo próprio contexto.
export function cartoesSemContexto(cartoes: CartaoQuadro[], contextos: { id: string }[]): CartaoQuadro[] {
  const comContexto = new Set(contextos.map((c) => digitos(c.id)));
  return cartoes.filter((c) => !ehReport(c) && !(c.numero && comContexto.has(digitos(c.numero))));
}

const dataBr = (iso: string) => {
  const [, ano, mes, dia] = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso) ?? [];
  return ano ? `${dia}/${mes}/${ano}` : '';
};

function linhaDoCartao(c: CartaoQuadro): LinhaLista {
  const numero = digitos(c.numero);
  return {
    id: `cartao-${c.cardId}`,
    numero: numero.length === 6 ? `${numero.slice(0, 3)}.${numero.slice(3)}` : c.numero,
    cliente: '', assunto: c.titulo, resumo: '', status: c.coluna, revision: '', previsaoRevision: '', atualizadoEm: dataBr(c.atualizadoEm),
    prs: [], branches: [], evidencias: [], planosTeste: [], temPr: false, temEvidencia: false, temPlano: false, temBm: true,
    tipo: '', situacao: '', modulo: '', caminhoTela: '', publicadoEm: '', temRegra: false, autores: [], autoresLogin: [], docs: {},
    cartao: c,
  };
}

// Os que pedem mais atenção vêm primeiro; a ordenação da tabela mantém essa ordem entre os empatados.
export function linhasDosCartoes(cartoes: CartaoQuadro[], reports: Map<string, CartaoQuadro[]>, agora: number): LinhaLista[] {
  const peso = (c: CartaoQuadro) => pontuacao(c, c.numero ? reports.get(c.numero) : undefined, agora) + (concluido(c) ? 0 : 0.5);
  return [...cartoes].sort((a, b) => peso(b) - peso(a)).map(linhaDoCartao);
}
