'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { ExternalLink, Inbox, RefreshCcw, Search, X } from 'lucide-react';
import { auth, db } from '../../firebase';
import withAuth from '../components/withAuth';
import { SortTh, sortRows, useSort } from '../components/SortableTable';
import { lerChaveBm } from '../chamados/bmChave';
import { ROTULO_PRIORIDADE, ROTULO_SECAO, atencaoDe, concluido, diasDesde, ehReport, pontuacao, reportsAtivos, reportsPorNumero, type Atencao, type CartaoQuadro } from '../chamados/bmQuadro';
import { lerQuadroBm, sincronizaQuadroBm, type MetaQuadro } from '../chamados/bmQuadroSync';
import type { Chamado } from '../chamados/parse';

type Aba = 'andamento' | 'atencao' | 'concluidos' | 'todos';

const dataBr = (iso: string) => {
  const d = new Date(iso);
  return iso && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR') : '—';
};

const ROTULO_ATENCAO: Record<Atencao, string> = {
  report: 'Report',
  bloqueado: 'Bloqueado',
  prazo: 'Prazo vencido',
  parado: 'Parado',
  'sem-responsavel': 'Sem responsável',
  prioridade: 'Prioridade',
};

const COR_ATENCAO: Record<Atencao, string> = {
  report: 'rel-tag-error',
  bloqueado: 'rel-tag-error',
  prazo: 'rel-tag-alert',
  parado: 'rel-tag-alert',
  'sem-responsavel': 'rel-tag',
  prioridade: 'rel-tag-alert',
};

function ChamadosBmPage() {
  const [cartoes, setCartoes] = useState<CartaoQuadro[]>([]);
  const [meta, setMeta] = useState<MetaQuadro | null>(null);
  const [comPr, setComPr] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [msg, setMsg] = useState('');
  const [temChave, setTemChave] = useState(false);
  const [aba, setAba] = useState<Aba>('andamento');
  const [busca, setBusca] = useState('');
  const [fResp, setFResp] = useState('');
  const [fColuna, setFColuna] = useState('');
  const [fTipo, setFTipo] = useState('');
  const [incluiPr, setIncluiPr] = useState(false);
  const [semNumero, setSemNumero] = useState(false);
  const [aberto, setAberto] = useState<CartaoQuadro | null>(null);
  const { sort, toggleSort } = useSort({ key: 'relevancia', dir: 'desc' });
  const [agora] = useState(() => Date.now());

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [quadro, snap] = await Promise.all([lerQuadroBm(), getDocs(collection(db, 'chamados'))]);
      setCartoes(quadro.cartoes);
      setMeta(quadro.meta);
      setComPr(new Set(snap.docs.map((d) => d.data() as Chamado).filter((c) => c.temPr).map((c) => c.id)));
    } catch (e) {
      const codigo = (e as { code?: string })?.code ?? 'erro';
      setMsg(`Não foi possível carregar os dados (${codigo}).${codigo === 'permission-denied' ? ' Libere a leitura das coleções bm_quadro e bm_quadro_meta nas regras do Firestore.' : ''}`);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
    const ler = () => setTemChave(!!lerChaveBm());
    ler();
    window.addEventListener('nucleoptu-bm-chave', ler);
    window.addEventListener('nucleoptu-dados-atualizados', carregar);
    return () => {
      window.removeEventListener('nucleoptu-bm-chave', ler);
      window.removeEventListener('nucleoptu-dados-atualizados', carregar);
    };
  }, [carregar]);

  const sincronizar = async () => {
    setSincronizando(true);
    setMsg('');
    const r = await sincronizaQuadroBm(auth.currentUser?.email ?? '', cartoes);
    setSincronizando(false);
    if (r.aviso) setMsg(r.aviso);
    else {
      setMsg(`Quadro do BM sincronizado: ${r.total} cartão(ões), ${r.gravados} atualizado(s).`);
      await carregar();
    }
  };

  const reports = useMemo(() => reportsPorNumero(cartoes), [cartoes]);
  const base = useMemo(
    () => cartoes.filter((c) => !ehReport(c) && (semNumero || c.numero) && (incluiPr || !c.numero || !comPr.has(c.numero))),
    [cartoes, comPr, incluiPr, semNumero],
  );
  const reportsDe = useCallback((c: CartaoQuadro) => (c.numero ? reports.get(c.numero) : undefined), [reports]);

  const contagem = useMemo(
    () => ({
      andamento: base.filter((c) => !concluido(c)).length,
      atencao: base.filter((c) => atencaoDe(c, reportsDe(c), agora).length > 0).length,
      concluidos: base.filter((c) => concluido(c)).length,
      todos: base.length,
    }),
    [base, reportsDe, agora],
  );

  const responsaveis = useMemo(() => [...new Set(base.map((c) => c.responsavel).filter(Boolean))].sort(), [base]);
  const colunas = useMemo(() => [...new Set(base.map((c) => c.coluna).filter(Boolean))].sort(), [base]);
  const tipos = useMemo(() => [...new Set(base.map((c) => c.tipo).filter(Boolean))].sort(), [base]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const lista = base.filter((c) => {
      if (aba === 'andamento' && concluido(c)) return false;
      if (aba === 'concluidos' && !concluido(c)) return false;
      if (aba === 'atencao' && atencaoDe(c, reportsDe(c), agora).length === 0) return false;
      if (fResp && c.responsavel !== fResp) return false;
      if (fColuna && c.coluna !== fColuna) return false;
      if (fTipo && c.tipo !== fTipo) return false;
      if (q && ![c.numero, c.titulo, c.responsavel, c.coluna, c.tipo].join(' ').toLowerCase().includes(q)) return false;
      return true;
    });
    return sortRows(lista, sort, {
      relevancia: (c) => pontuacao(c, reportsDe(c), agora) * 1e6 + Date.parse(c.atualizadoEm || '') / 1e6,
      numero: (c) => c.numero,
      titulo: (c) => c.titulo,
      coluna: (c) => c.coluna,
      responsavel: (c) => c.responsavel,
      prazo: (c) => (c.prazo ? Date.parse(c.prazo) : null),
      parado: (c) => (concluido(c) ? null : diasDesde(c.naColunaDesde, agora)),
      atualizado: (c) => Date.parse(c.atualizadoEm || ''),
    });
  }, [base, aba, busca, fResp, fColuna, fTipo, sort, reportsDe, agora]);

  const abas: { id: Aba; rotulo: string }[] = [
    { id: 'andamento', rotulo: 'Em andamento' },
    { id: 'atencao', rotulo: 'Com atenção' },
    { id: 'concluidos', rotulo: 'Concluídos' },
    { id: 'todos', rotulo: 'Todos' },
  ];

  return (
    <div className="rel-page mx-auto max-w-7xl">
      <header className="rel-box flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="rel-title"><Inbox className="h-5 w-5" /> Chamados sem PR (Businessmap)</h1>
          <p className="rel-desc">Cartões do BM que não têm PR, inclusive os concluídos, ordenados pelo que pede atenção: report, bloqueio, prazo, prioridade e tempo parado.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {meta && <span className="rel-desc">Sincronizado em {dataBr(meta.sincronizadoEm)} por {meta.por || '—'}</span>}
          {temChave ? (
            <button onClick={sincronizar} disabled={sincronizando} className="rel-btn rel-btn-primary"><RefreshCcw className={`h-4 w-4 ${sincronizando ? 'animate-spin' : ''}`} /> {sincronizando ? 'Atualizando...' : 'Atualizar do BM'}</button>
          ) : (
            <span className="rel-tag">Informe a chave do BM no perfil para atualizar</span>
          )}
        </div>
      </header>

      {msg && <div className="rel-notice">{msg}</div>}

      <div className="flex flex-wrap gap-2">
        {abas.map((a) => (
          <button key={a.id} onClick={() => setAba(a.id)} className={`rel-btn rel-btn-sm ${aba === a.id ? 'rel-btn-primary' : 'rel-btn-ghost'}`}>
            {a.rotulo} <span style={{ opacity: 0.75 }}>({contagem[a.id]})</span>
          </button>
        ))}
      </div>

      <section className="rel-box">
        <div className="flex flex-wrap items-end gap-3">
          <label className="rel-field rel-label min-w-[220px] flex-1">
            Pesquisar
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4" style={{ color: 'var(--rel-muted)' }} />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Chamado, assunto, responsável, coluna..." className="rel-input pl-8" />
            </div>
          </label>
          <label className="rel-field rel-label">
            Responsável
            <select value={fResp} onChange={(e) => setFResp(e.target.value)} className="rel-input max-w-[220px]">
              <option value="">Todos</option>
              {responsaveis.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label className="rel-field rel-label">
            Coluna
            <select value={fColuna} onChange={(e) => setFColuna(e.target.value)} className="rel-input max-w-[220px]">
              <option value="">Todas</option>
              {colunas.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label className="rel-field rel-label">
            Tipo
            <select value={fTipo} onChange={(e) => setFTipo(e.target.value)} className="rel-input max-w-[200px]">
              <option value="">Todos</option>
              {tipos.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
        </div>
        <div className="rel-desc mt-3 flex flex-wrap items-center justify-between gap-3">
          <span className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={incluiPr} onChange={(e) => setIncluiPr(e.target.checked)} /> Incluir os que já têm PR</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={semNumero} onChange={(e) => setSemNumero(e.target.checked)} /> Incluir cartões sem número de chamado</label>
          </span>
          <span>{filtrados.length} cartão(ões)</span>
        </div>
      </section>

      <section className="rel-table-wrap">
        <table className="w-full text-left text-sm">
          <thead className="text-xs">
            <tr>
              <SortTh label="Relevância" k="relevancia" sort={sort} onSort={toggleSort} className="hidden md:table-cell" />
              <SortTh label="Chamado" k="numero" sort={sort} onSort={toggleSort} />
              <SortTh label="Assunto" k="titulo" sort={sort} onSort={toggleSort} />
              <SortTh label="Coluna" k="coluna" sort={sort} onSort={toggleSort} />
              <SortTh label="Responsável" k="responsavel" sort={sort} onSort={toggleSort} className="hidden sm:table-cell" />
              <th className="px-3 py-2">Atenção</th>
              <SortTh label="Prazo" k="prazo" sort={sort} onSort={toggleSort} className="hidden lg:table-cell" />
              <SortTh label="Parado" k="parado" sort={sort} onSort={toggleSort} className="hidden lg:table-cell" />
              <SortTh label="Atualizado" k="atualizado" sort={sort} onSort={toggleSort} className="hidden xl:table-cell" />
            </tr>
          </thead>
          <tbody>
            {carregando && <tr><td colSpan={9} className="rel-empty">Carregando...</td></tr>}
            {!carregando && !filtrados.length && (
              <tr><td colSpan={9} className="rel-empty">{cartoes.length ? 'Nenhum cartão com esses filtros.' : 'O quadro do BM ainda não foi sincronizado. Quem tem a chave do BM no perfil pode usar “Atualizar do BM”.'}</td></tr>
            )}
            {filtrados.map((c) => {
              const rep = reportsDe(c);
              const atencao = atencaoDe(c, rep, agora);
              const pontos = pontuacao(c, rep, agora);
              return (
                <tr key={c.cardId} onClick={() => setAberto(c)} className="rel-row">
                  <td className="hidden px-3 py-2 md:table-cell"><span className={`rel-tag ${pontos >= 50 ? 'rel-tag-error' : pontos >= 20 ? 'rel-tag-alert' : ''}`}>{Math.round(pontos)}</span></td>
                  <td className="rel-mono whitespace-nowrap px-3 py-2">{c.numero || '—'}</td>
                  <td className="max-w-[420px] px-3 py-2"><div className="rel-strong">{c.titulo}</div><div className="rel-desc">{c.tipo || '—'}</div></td>
                  <td className="px-3 py-2"><span className={`rel-tag ${concluido(c) ? 'rel-tag-ok' : 'rel-tag-info'}`}>{c.coluna || ROTULO_SECAO[c.secao] || '—'}</span></td>
                  <td className="hidden px-3 py-2 sm:table-cell">{c.responsavel || '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {atencao.map((a) => (
                        <span key={a} className={`rel-tag ${COR_ATENCAO[a]}`}>
                          {a === 'parado' ? `Parado ${diasDesde(c.naColunaDesde, agora)}d` : a === 'prioridade' ? ROTULO_PRIORIDADE[c.prioridade ?? 0] : ROTULO_ATENCAO[a]}
                        </span>
                      ))}
                      {!atencao.length && <span className="rel-desc">—</span>}
                    </div>
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-2 lg:table-cell">{dataBr(c.prazo)}</td>
                  <td className="hidden whitespace-nowrap px-3 py-2 lg:table-cell">{concluido(c) ? '—' : `${diasDesde(c.naColunaDesde, agora)} dia(s)`}</td>
                  <td className="hidden whitespace-nowrap px-3 py-2 xl:table-cell">{dataBr(c.atualizadoEm)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {aberto && (
        <div className="rel-backdrop" onClick={() => setAberto(null)}>
          <div className="rel-modal rel-modal-sm" onClick={(e) => e.stopPropagation()}>
            <header className="rel-modal-head">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rel-mono">{aberto.numero || `cartão ${aberto.cardId}`}</span>
                  <span className={`rel-tag ${concluido(aberto) ? 'rel-tag-ok' : 'rel-tag-info'}`}>{aberto.coluna}</span>
                </div>
                <h2 className="rel-strong mt-1 text-lg">{aberto.titulo}</h2>
              </div>
              <button onClick={() => setAberto(null)} aria-label="Fechar" className="rel-btn rel-btn-icon"><X className="h-5 w-5" /></button>
            </header>
            <div className="rel-modal-body">
              <div className="rel-grid rel-grid-s2">
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
              {atencaoDe(aberto, reportsDe(aberto), agora).length > 0 && (
                <div className="rel-box">
                  <h3 className="rel-subtitle">Pontos de atenção</h3>
                  <div className="flex flex-wrap gap-1">
                    {atencaoDe(aberto, reportsDe(aberto), agora).map((a) => <span key={a} className={`rel-tag ${COR_ATENCAO[a]}`}>{ROTULO_ATENCAO[a]}</span>)}
                  </div>
                </div>
              )}
              {reportsAtivos(reportsDe(aberto)).length > 0 && (
                <div className="rel-box">
                  <h3 className="rel-subtitle">Reports abertos</h3>
                  <ul className="rel-list">
                    {reportsAtivos(reportsDe(aberto)).map((r) => (
                      <li key={r.cardId}><a href={r.url} target="_blank" rel="noreferrer" className="rel-link inline-flex items-center gap-1">{r.titulo} <ExternalLink className="h-3 w-3" /></a> <span className="rel-desc">({r.coluna}{r.responsavel ? `, ${r.responsavel}` : ''})</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="rel-modal-foot justify-end">
              <a href={aberto.url} target="_blank" rel="noreferrer" className="rel-btn rel-btn-primary">Abrir cartão no BM <ExternalLink className="h-4 w-4" /></a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuth(ChamadosBmPage);
