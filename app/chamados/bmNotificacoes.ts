import type { CartaoQuadro } from './bmQuadro';

export type TipoNotificacaoBm = 'atribuido' | 'reatribuido' | 'bloqueio' | 'etapa' | 'prazo' | 'prioridade' | 'atualizacao';

export interface NotificacaoBm {
  id: string;
  tipo: TipoNotificacaoBm;
  cardId: number;
  numero: string;
  titulo: string;
  mensagem: string;
  url: string;
  em: string;
  lida: boolean;
}

const idMudanca = (c: CartaoQuadro, tipo: TipoNotificacaoBm) => `${c.cardId}:${tipo}:${c.atualizadoEm}`;

export function montaNotificacoesBm(antes: CartaoQuadro[], depois: CartaoQuadro[], usuarioId: number): NotificacaoBm[] {
  if (!usuarioId) return [];
  const antigos = new Map(antes.map((c) => [c.cardId, c]));
  const saida: NotificacaoBm[] = [];
  const inclui = (c: CartaoQuadro, tipo: TipoNotificacaoBm, mensagem: string) => saida.push({
    id: idMudanca(c, tipo), tipo, cardId: c.cardId, numero: c.numero, titulo: c.titulo,
    mensagem, url: c.url, em: c.atualizadoEm || new Date().toISOString(), lida: false,
  });

  for (const atual of depois) {
    const anterior = antigos.get(atual.cardId);
    if (!anterior) {
      if (atual.ownerId === usuarioId) inclui(atual, 'atribuido', 'O cartão foi atribuído a você.');
      continue;
    }
    if (anterior.ownerId !== atual.ownerId) {
      if (atual.ownerId === usuarioId) inclui(atual, 'atribuido', 'O cartão foi atribuído a você.');
      else if (anterior.ownerId === usuarioId) inclui(atual, 'reatribuido', `O cartão foi atribuído a ${atual.responsavel || 'outra pessoa'}.`);
      continue;
    }
    if (atual.ownerId !== usuarioId || anterior.atualizadoEm === atual.atualizadoEm) continue;
    let reconhecida = false;
    if (anterior.bloqueado !== atual.bloqueado) {
      inclui(atual, 'bloqueio', atual.bloqueado ? 'O cartão foi bloqueado.' : 'O bloqueio do cartão foi removido.');
      reconhecida = true;
    }
    if (anterior.colunaId !== atual.colunaId) {
      inclui(atual, 'etapa', `O cartão foi movido para ${atual.coluna || 'outra etapa'}.`);
      reconhecida = true;
    }
    if (anterior.prazo !== atual.prazo) {
      inclui(atual, 'prazo', `O prazo foi alterado${atual.prazo ? ` para ${new Date(atual.prazo).toLocaleDateString('pt-BR')}` : ' (removido)'}.`);
      reconhecida = true;
    }
    if (anterior.prioridade !== atual.prioridade) {
      inclui(atual, 'prioridade', 'A prioridade do cartão foi alterada.');
      reconhecida = true;
    }
    if (!reconhecida) inclui(atual, 'atualizacao', 'O cartão teve uma atualização no BM.');
  }
  return saida.sort((a, b) => Date.parse(b.em) - Date.parse(a.em));
}
