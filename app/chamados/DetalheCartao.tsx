'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import TelaDetalhe from '../components/TelaDetalhe';
import { useAuth } from '../AuthContext';
import { ROTULO_PRIORIDADE, ROTULO_SECAO, atencaoDe, concluido, reportsAtivos, type CartaoQuadro } from './bmQuadro';
import { podeVerRelatus } from './relatusAcesso';
import { COR_ATENCAO, ROTULO_ATENCAO, dataBr } from './rotulosCartao';
import RelatusPanel from './RelatusPanel';

export default function DetalheCartao({ cartao: aberto, reports, agora, onVoltar }: { cartao: CartaoQuadro; reports: CartaoQuadro[] | undefined; agora: number; onVoltar: () => void }) {
  const { user } = useAuth();
  const comRelatus = podeVerRelatus(user?.email);
  const [relatusDe, setRelatusDe] = useState<number | null>(null);
  const pontosAtencao = atencaoDe(aberto, reports, agora);
  const reportsAbertos = reportsAtivos(reports);
  const noRelatus = comRelatus && relatusDe === aberto.cardId;
  return (
    <TelaDetalhe
      onVoltar={onVoltar}
      rotuloVoltar="Voltar à lista"
      abas={comRelatus ? [
        { id: null, rotulo: 'Cartão' },
        { id: aberto.cardId, rotulo: 'Web Relatus' },
      ].map((a) => (
        <button key={a.rotulo} type="button" onClick={() => setRelatusDe(a.id)} className={`rel-tab ${noRelatus === (a.id !== null) ? 'rel-tab-active' : ''}`}>{a.rotulo}</button>
      )) : undefined}
      cabecalho={
        <>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rel-mono">{aberto.numero || `cartão ${aberto.cardId}`}</span>
              <span className={`rel-tag ${concluido(aberto) ? 'rel-tag-ok' : 'rel-tag-info'}`}>{aberto.coluna}</span>
            </div>
            <h1 className="rel-strong mt-1 text-xl">{aberto.titulo}</h1>
          </div>
          <a href={aberto.url} target="_blank" rel="noreferrer" className="rel-btn rel-btn-primary">Abrir cartão no BM <ExternalLink className="h-4 w-4" /></a>
        </>
      }
    >
      {noRelatus ? (
        <div className="rel-box"><RelatusPanel key={aberto.cardId} chamadoInicial={aberto.numero} /></div>
      ) : (
        <>
          <section className="rel-box">
            <div className="rel-grid rel-grid-s2 rel-grid-3">
              {[
                ['Fase', ROTULO_SECAO[aberto.secao] ?? '—'],
                ['Tipo', aberto.tipo || '—'],
                ['Responsável', aberto.responsavel || 'Sem responsável'],
                ['Prioridade', aberto.prioridade ? ROTULO_PRIORIDADE[aberto.prioridade] : '—'],
                ['Prazo', dataBr(aberto.prazo)],
                ['Criado em', dataBr(aberto.criadoEm)],
                ['Atualizado em', dataBr(aberto.atualizadoEm)],
                ['Na coluna desde', dataBr(aberto.naColunaDesde)],
              ].map(([k, v]) => (
                <div key={k} className="rel-field"><span className="rel-label">{k}</span><span className="rel-value">{v}</span></div>
              ))}
            </div>
          </section>
          {pontosAtencao.length > 0 && (
            <section className="rel-box">
              <h3 className="rel-subtitle">Pontos de atenção</h3>
              <div className="flex flex-wrap gap-1">
                {pontosAtencao.map((a) => <span key={a} className={`rel-tag ${COR_ATENCAO[a]}`}>{ROTULO_ATENCAO[a]}</span>)}
              </div>
            </section>
          )}
          {reportsAbertos.length > 0 && (
            <section className="rel-box">
              <h3 className="rel-subtitle">Reports abertos</h3>
              <ul className="rel-list">
                {reportsAbertos.map((r) => (
                  <li key={r.cardId}><a href={r.url} target="_blank" rel="noreferrer" className="rel-link inline-flex items-center gap-1">{r.titulo} <ExternalLink className="h-3 w-3" /></a> <span className="rel-desc">({r.coluna}{r.responsavel ? `, ${r.responsavel}` : ''})</span></li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </TelaDetalhe>
  );
}
