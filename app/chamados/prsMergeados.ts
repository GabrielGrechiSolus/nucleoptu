// Notificações de PRs mergeados: junta o PR, o chamado do título e o cartão do BM já sincronizado.
// Lógica pura (sem rede nem Firestore). A busca no GitHub fica em /api/git/mergeados.
import { assuntoDoTitulo, chamadoDoTitulo } from './github';
import type { RegistroBm } from './bmRegistro';

export interface PrMergeado {
  repo: string;
  numero: number;
  titulo: string;
  url: string;
  mescladoEm: string;
}

export interface NotificacaoPr {
  id: string;
  repo: string;
  numero: number;
  titulo: string;
  assunto: string;
  url: string;
  mescladoEm: string;
  chamado: string; // 568.361
  chamadoId: string; // 568361
  cartaoUrl: string;
  coluna: string;
  lida: boolean;
}

export type RegistroDoCartao = Pick<RegistroBm, 'resumo'> | null | undefined;

export const idDoPr = (p: Pick<PrMergeado, 'repo' | 'numero'>) => `${p.repo}#${p.numero}`;

export function montaNotificacoes(prs: PrMergeado[], registros: Record<string, RegistroDoCartao>, lidos: ReadonlySet<string>): NotificacaoPr[] {
  return prs
    .filter((p) => p.mescladoEm)
    .map((p) => {
      const chamado = chamadoDoTitulo(p.titulo) ?? '';
      const chamadoId = chamado.replace('.', '');
      const resumo = chamadoId ? registros[chamadoId]?.resumo : null;
      const id = idDoPr(p);
      return {
        id,
        repo: p.repo,
        numero: p.numero,
        titulo: p.titulo,
        assunto: assuntoDoTitulo(p.titulo),
        url: p.url,
        mescladoEm: p.mescladoEm,
        chamado,
        chamadoId,
        cartaoUrl: resumo?.url ?? '',
        coluna: resumo?.coluna ?? '',
        lida: lidos.has(id),
      };
    })
    .sort((a, b) => Date.parse(b.mescladoEm) - Date.parse(a.mescladoEm));
}

// Na primeira vez que a pessoa usa o sino, só os merges mais recentes contam como novos; o resto já entra como lido.
export function lidosIniciais(prs: PrMergeado[], agoraMs: number, horas = 24): string[] {
  return prs.filter((p) => agoraMs - Date.parse(p.mescladoEm) > horas * 3_600_000).map(idDoPr);
}

export const naoLidas = (itens: NotificacaoPr[]) => itens.filter((n) => !n.lida);

export function tempoRelativo(iso: string, agoraMs: number): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const min = Math.max(0, Math.round((agoraMs - t) / 60_000));
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const dias = Math.round(h / 24);
  return dias === 1 ? 'ontem' : `há ${dias} dias`;
}
