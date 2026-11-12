'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import withAuth from '../components/withAuth';
import { usePessoa } from '../components/usePessoa';
import { SortTh, sortRows, useSort } from '../components/SortableTable';
import { BmColuna } from '../chamados/BmPainel';
import { chamadosDaPessoa, soDigitos, type RegistroBm } from '../chamados/bmRegistro';
import { lerRegistrosBm, sincronizaBm } from '../chamados/bmSync';
import type { Chamado } from '../chamados/parse';
import { ROTULO_SITUACAO } from '../chamados/parse';
import { ListChecks, RefreshCcw } from 'lucide-react';
import { concluido, ehReport, formataNumero, registroResumoDoCartao, reportsAtivos, reportsPorNumero, type CartaoQuadro } from '../chamados/bmQuadro';
import { buscaEuBm, lerQuadroBm, type MetaQuadro } from '../chamados/bmQuadroSync';
import type { EuBm } from '../chamados/bmChave';
import ProcessoModal from './ProcessoModal';
import { EVENTO_DADOS_ATUALIZADOS } from '../components/AtualizaAoEntrar';
import { permissaoProcessos } from './clienteProcesso';

function chamadoMinimo(c: CartaoQuadro): Chamado {
  return {
    id: c.numero || String(c.cardId),
    numero: c.numero ? formataNumero(c.numero) : String(c.cardId),
    cliente: '',
    assunto: c.titulo,
    resumo: '',
    status: '',
    revision: '',
    previsaoRevision: '',
    atualizadoEm: '',
    prs: [],
    branches: [],
    evidencias: [],
    planosTeste: [],
    temPr: false,
    temEvidencia: false,
    temPlano: false,
    temBm: true,
    tipo: '',
    situacao: '',
    modulo: '',
    caminhoTela: '',
    publicadoEm: '',
    temRegra: false,
    autores: [],
    autoresLogin: [],
    docs: {},
  };
}

function ProcessosPage() {
  const pessoa = usePessoa();
  const [itens, setItens] = useState<Chamado[]>([]);
  const [registros, setRegistros] = useState<Record<string, RegistroBm>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [permissao, setPermissao] = useState<{ permitido: boolean; motivo: string } | null>(null);
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState<Chamado | null>(null);
  const [quadro, setQuadro] = useState<CartaoQuadro[]>([]);
  const [metaQuadro, setMetaQuadro] = useState<MetaQuadro | null>(null);
  const [eu, setEu] = useState<EuBm | null>(null);
  const [incluiConcluidos, setIncluiConcluidos] = useState(false);
  const [abertoSemPr, setAbertoSemPr] = useState<CartaoQuadro | null>(null);
  const { sort, toggleSort } = useSort({ key: 'numero', dir: 'desc' });

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const [snap, regs, q] = await Promise.all([getDocs(collection(db, 'chamados')), lerRegistrosBm(), lerQuadroBm().catch(() => ({ cartoes: [] as CartaoQuadro[], meta: null }))]);
      setItens(snap.docs.map((d) => d.data() as Chamado));
      setRegistros(regs);
      setQuadro(q.cartoes);
      setMetaQuadro(q.meta);
    } catch (e) {
      setErro(`Não foi possível carregar os dados (${(e as { code?: string })?.code ?? 'erro'}).`);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
    permissaoProcessos().then(setPermissao);
    buscaEuBm().then(setEu);
    window.addEventListener(EVENTO_DADOS_ATUALIZADOS, carregar);
    return () => window.removeEventListener(EVENTO_DADOS_ATUALIZADOS, carregar);
  }, [carregar]);

  const reler = useCallback(
    async (c: Chamado) => {
      await sincronizaBm({ chamados: [c], registros, por: auth.currentUser?.email ?? '', forcar: true, onProgresso: () => undefined, deveParar: () => false });
      setRegistros(await lerRegistrosBm());
    },
    [registros],
  );

  const reports = useMemo(() => reportsPorNumero(quadro), [quadro]);
  const comPr = useMemo(() => new Set(itens.filter((c) => c.temPr).map((c) => c.id)), [itens]);
  const semPr = useMemo(
    () => quadro.filter((c) => !ehReport(c) && eu?.id && c.ownerId === eu.id && (!c.numero || !comPr.has(c.numero)) && (incluiConcluidos || !concluido(c))),
    [quadro, eu, comPr, incluiConcluidos],
  );

  const meus = useMemo(() => chamadosDaPessoa(itens, pessoa.gitUser).filter((c) => registros[soDigitos(c.numero)]?.encontrado), [itens, pessoa.gitUser, registros]);

  const linhas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const filtradas = q ? meus.filter((c) => [c.numero, c.assunto, c.cliente].join(' ').toLowerCase().includes(q)) : meus;
    return sortRows(filtradas, sort, {
      numero: (c) => c.id,
      assunto: (c) => c.assunto,
      situacao: (c) => (c.situacao ? ROTULO_SITUACAO[c.situacao] : ''),
      bm: (c) => registros[soDigitos(c.numero)]?.resumo?.coluna ?? '',
    });
  }, [meus, busca, sort, registros]);

  if (permissao && !permissao.permitido) {
    return (
      <div className="rel-page mx-auto max-w-xl">
        <section className="rel-box">
          <h1 className="rel-title rel-title-line"><ListChecks size={20} /> Processos do BM</h1>
          <p className="rel-notice rel-notice-alert">{permissao.motivo || 'Recurso experimental liberado apenas para usuários Git autorizados.'}</p>
          <p className="rel-desc mt-3">Para usar, informe a sua chave do Businessmap em Perfil → Businessmap.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="rel-page">
      <section className="rel-box">
        <h1 className="rel-title rel-title-line"><ListChecks size={20} /> Processos do BM</h1>
        <p className="rel-desc mb-4">Experimento: preenche os campos do cartão a partir do Git, marca os critérios de saída que o Git comprova e move o cartão. Cada gravação pede a sua confirmação.</p>
        <div className="flex flex-wrap items-end gap-3">
          <div className="rel-field w-full max-w-sm">
            <label className="rel-label" htmlFor="busca-processos">Pesquisar</label>
            <input id="busca-processos" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Chamado, assunto ou cliente" className="rel-input" />
          </div>
          <button onClick={carregar} disabled={carregando} className="rel-btn rel-btn-outline"><RefreshCcw size={14} /> Recarregar</button>
          <span className="rel-desc pb-2">{linhas.length} chamado(s) seus com cartão no BM sincronizado</span>
        </div>
      </section>

      {erro && <p className="rel-notice rel-notice-error">{erro}</p>}

      <section className="rel-table-wrap">
        <table className="w-full text-left text-sm">
          <thead className="text-xs">
            <tr>
              <SortTh label="Chamado" k="numero" sort={sort} onSort={toggleSort} />
              <SortTh label="Assunto" k="assunto" sort={sort} onSort={toggleSort} />
              <SortTh label="Situação" k="situacao" sort={sort} onSort={toggleSort} className="hidden md:table-cell" />
              <SortTh label="Coluna no BM" k="bm" sort={sort} onSort={toggleSort} />
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {carregando && <tr><td colSpan={5} className="rel-empty">Carregando...</td></tr>}
            {!carregando && !linhas.length && (
              <tr><td colSpan={5} className="rel-empty">Nenhum chamado seu com cartão do BM sincronizado. Use “Atualizar do BM” em Contexto de chamados e confira o usuário Git do perfil.</td></tr>
            )}
            {linhas.map((c) => (
              <tr key={c.id} onClick={() => setAberto(c)} className="rel-row">
                <td className="rel-mono whitespace-nowrap px-3 py-2">{c.numero}</td>
                <td className="max-w-[420px] px-3 py-2"><div className="rel-strong">{c.assunto}</div><div className="rel-desc">{c.cliente || '—'}</div>{reportsAtivos(reports.get(soDigitos(c.numero))).length > 0 && <div className="mt-1"><span className="rel-tag rel-tag-error">Report {reportsAtivos(reports.get(soDigitos(c.numero))).map((r) => r.coluna).join(', ')}</span></div>}</td>
                <td className="hidden px-3 py-2 md:table-cell">{c.situacao ? ROTULO_SITUACAO[c.situacao] : '—'}</td>
                <td className="px-3 py-2"><BmColuna r={registros[soDigitos(c.numero)]?.resumo} /></td>
                <td className="px-3 py-2 text-right"><span className="rel-btn rel-btn-primary rel-btn-sm">Processo</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rel-box">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="rel-title" style={{ marginBottom: 0 }}>Chamados sem PR</h2>
            <p className="rel-desc">Cartões do BM em que você é o responsável e que não têm PR. Os reports abertos aparecem em destaque.</p>
          </div>
          <label className="rel-desc flex items-center gap-2"><input type="checkbox" checked={incluiConcluidos} onChange={(e) => setIncluiConcluidos(e.target.checked)} /> Incluir concluídos</label>
        </div>
        {!eu?.id && <p className="rel-notice rel-notice-alert mt-3">Não foi possível identificar o seu usuário no BM. Confira a chave em Perfil → Businessmap.</p>}
        {eu?.id && !metaQuadro && <p className="rel-notice mt-3">O quadro do BM ainda não foi sincronizado. Use “Atualizar do BM” em Chamados sem PR (BM).</p>}
      </section>

      <section className="rel-table-wrap">
        <table className="w-full text-left text-sm">
          <thead className="text-xs">
            <tr>
              <th className="px-3 py-2">Chamado</th>
              <th className="px-3 py-2">Assunto</th>
              <th className="px-3 py-2">Coluna no BM</th>
              <th className="px-3 py-2">Atenção</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {!semPr.length && <tr><td colSpan={5} className="rel-empty">Nenhum cartão seu sem PR.</td></tr>}
            {semPr.map((c) => {
              const rep = reportsAtivos(reports.get(c.numero));
              return (
                <tr key={c.cardId} onClick={() => setAbertoSemPr(c)} className="rel-row">
                  <td className="rel-mono whitespace-nowrap px-3 py-2">{c.numero ? formataNumero(c.numero) : c.cardId}</td>
                  <td className="max-w-[420px] px-3 py-2"><div className="rel-strong">{c.titulo}</div><div className="rel-desc">{c.tipo || '—'}</div></td>
                  <td className="px-3 py-2"><span className={`rel-tag ${concluido(c) ? 'rel-tag-ok' : 'rel-tag-info'}`}>{c.coluna}</span></td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {rep.length > 0 && <span className="rel-tag rel-tag-error">Report {rep.map((r) => r.coluna).join(', ')}</span>}
                      {c.bloqueado && <span className="rel-tag rel-tag-error">Bloqueado</span>}
                      {!rep.length && !c.bloqueado && <span className="rel-desc">—</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right"><span className="rel-btn rel-btn-primary rel-btn-sm">Processo</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {abertoSemPr && (
        <ProcessoModal
          key={abertoSemPr.cardId}
          chamado={chamadoMinimo(abertoSemPr)}
          registro={{ chamado: abertoSemPr.numero || String(abertoSemPr.cardId), encontrado: true, cardId: abertoSemPr.cardId, resumo: registroResumoDoCartao(abertoSemPr), cartao: null, sincronizadoEm: metaQuadro?.sincronizadoEm ?? '', sincronizadoPor: metaQuadro?.por ?? '' }}
          onClose={() => setAbertoSemPr(null)}
          onGravado={carregar}
        />
      )}

      {aberto && registros[soDigitos(aberto.numero)] && (
        <ProcessoModal key={aberto.id} chamado={aberto} registro={registros[soDigitos(aberto.numero)]} onClose={() => setAberto(null)} onGravado={() => reler(aberto)} />
      )}
    </div>
  );
}

export default withAuth(ProcessosPage);
