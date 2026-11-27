'use client';

import React, { useEffect, useMemo, useState } from 'react';
import withAuth from '../components/withAuth';
import Link from 'next/link';
import TelaDetalhe, { useDetalheNaUrl } from '../components/TelaDetalhe';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { ListChecks } from 'lucide-react';
import { db } from '../../firebase';
import { usePessoa } from '../components/usePessoa';
import { SortTh, sortRows, useSort } from '../components/SortableTable';
import { BotoesAcao, COLECAO_VINCULOS, Historico, estiloStatus } from '../chamados/Vinculos';
import { ROTULO_STATUS, ROTULO_STATUS_CURTO, STATUS_ABERTOS, STATUS_FILA, StatusAplicacao, Vinculo, ehDono, ehSolicitante, pendenciasPara } from '../chamados/aplicacao';
import CampoBusca from '../components/CampoBusca';

type Aba = 'aplicar' | 'continuar' | 'meus' | 'todos';

const dataBr = (iso: string) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');

function FilaPage() {
  const pessoa = usePessoa();
  const [itens, setItens] = useState<Vinculo[]>([]);
  const [erro, setErro] = useState('');
  const [aba, setAba] = useState<Aba>('aplicar');
  const [busca, setBusca] = useState('');
  const [fStatus, setFStatus] = useState<'' | StatusAplicacao>('');
  const [ocultaFechados, setOcultaFechados] = useState(true);
  const url = useDetalheNaUrl('pedido');
  const { sort, toggleSort } = useSort({ key: 'atualizado', dir: 'desc' });

  useEffect(() => {
    const q = query(collection(db, COLECAO_VINCULOS), where('aplicacao', 'in', STATUS_FILA));
    return onSnapshot(
      q,
      (snap) => {
        setErro('');
        setItens(snap.docs.map((d) => ({ ...(d.data() as Vinculo), id: d.id })));
      },
      (e) => setErro(`Não foi possível carregar a fila (${(e as { code?: string })?.code ?? 'erro'}).`),
    );
  }, []);

  const eu = { uid: pessoa.uid, gitUser: pessoa.gitUser };
  const pend = useMemo(() => pendenciasPara(itens, eu), [itens, pessoa.uid, pessoa.gitUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const contagem = {
    aplicar: pend.paraAplicar.length,
    continuar: pend.paraContinuar.length,
    meus: itens.filter((v) => ehSolicitante(v, eu)).length,
    todos: itens.length,
  };

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const lista = itens.filter((v) => {
      if (aba === 'aplicar' && !((v.aplicacao === 'aberto' || v.aplicacao === 'aplicando') && ehDono(v, eu))) return false;
      if (aba === 'continuar' && !(v.aplicacao === 'aplicado' && ehSolicitante(v, eu))) return false;
      if (aba === 'meus' && !ehSolicitante(v, eu)) return false;
      if (fStatus && v.aplicacao !== fStatus) return false;
      if (aba !== 'aplicar' && aba !== 'continuar' && ocultaFechados && !fStatus && !STATUS_ABERTOS.includes(v.aplicacao)) return false;
      if (!q) return true;
      return [v.chamadoNumero, v.cliente, v.assunto, v.contextoNumero, v.contextoAssunto, v.criadoPorNome, ...v.prs, ...v.donoNomes, ...v.donoLogins].join(' ').toLowerCase().includes(q);
    });
    return sortRows(lista, sort, {
      pedido: (v) => v.criadoEm,
      chamado: (v) => v.chamadoNumero,
      cliente: (v) => v.cliente,
      correcao: (v) => v.contextoNumero,
      dono: (v) => v.donoNomes.join(', '),
      solicitante: (v) => v.criadoPorNome,
      status: (v) => STATUS_FILA.indexOf(v.aplicacao),
      atualizado: (v) => v.atualizadoEm,
    });
  }, [itens, aba, busca, fStatus, ocultaFechados, sort, pessoa.uid, pessoa.gitUser]); // eslint-disable-line react-hooks/exhaustive-deps

  const selecionado = itens.find((v) => v.id === url.valor) ?? null;

  const abas: { id: Aba; rotulo: string; dica: string }[] = [
    { id: 'aplicar', rotulo: 'Para eu aplicar', dica: 'Pedidos abertos ou em aplicação dos PRs que você fez' },
    { id: 'continuar', rotulo: 'Aguardando minha continuidade', dica: 'Já aplicados no cliente; você pediu e precisa dar continuidade no chamado' },
    { id: 'meus', rotulo: 'Meus pedidos', dica: 'Pedidos que você abriu' },
    { id: 'todos', rotulo: 'Todos', dica: 'Toda a fila' },
  ];


  if (selecionado) {
    return (
      <TelaDetalhe
        onVoltar={url.voltar}
        rotuloVoltar="Voltar à fila"
        cabecalho={
          <div className="min-w-0">
            <div className="rel-mono">{selecionado.chamadoNumero}</div>
            <h1 className="rel-strong text-xl">{selecionado.cliente}</h1>
            <p className="rel-desc">{selecionado.assunto}</p>
          </div>
        }
      >
        <section className="rel-box">
          <dl className="rel-grid rel-grid-s2">
            <div className="rel-field"><dt className="rel-label">Status</dt><dd><span className={`rounded px-2 py-0.5 text-xs ${estiloStatus[selecionado.aplicacao]}`}>{ROTULO_STATUS[selecionado.aplicacao]}</span></dd></div>
            <div className="rel-field"><dt className="rel-label">Pedido por</dt><dd className="rel-value">{selecionado.criadoPorNome || selecionado.criadoPorEmail}</dd></div>
            <div className="rel-field sm:col-span-2"><dt className="rel-label">Correção</dt><dd className="rel-value">{selecionado.contextoNumero} — {selecionado.contextoAssunto}</dd></div>
            <div className="rel-field sm:col-span-2"><dt className="rel-label">Quem aplica (dono do PR)</dt><dd className="rel-value">{selecionado.donoNomes.join(', ') || 'não informado'}{!pessoa.semGit && selecionado.donoLogins.length ? ` (${selecionado.donoLogins.join(', ')})` : ''}</dd></div>
            {!pessoa.semGit && <div className="rel-field sm:col-span-2"><dt className="rel-label">PRs</dt><dd className="rel-value font-mono text-xs">{selecionado.prs.join(', ') || '—'}</dd></div>}
            {selecionado.observacao && <div className="rel-field sm:col-span-2"><dt className="rel-label">Observação</dt><dd className="rel-value">{selecionado.observacao}</dd></div>}
          </dl>
          <div className="mt-4"><BotoesAcao v={selecionado} /></div>
        </section>
        <section className="rel-box">
          <h3 className="rel-subtitle">Histórico</h3>
          <Historico itens={selecionado.historico} />
        </section>
      </TelaDetalhe>
    );
  }

  return (
    <div className="rel-page mx-auto max-w-7xl">
      <header className="rel-box flex flex-wrap items-center justify-between gap-3">
        <ListChecks className="h-6 w-6" style={{ color: "var(--rel-primary)" }} />
        <div>
          <h1 className="rel-title" style={{ marginBottom: 0 }}>Fila de aplicação</h1>
          <p className="rel-desc">Correções que precisam ser aplicadas no cliente antes da atualização da revision.</p>
        </div>
      </header>

      {pessoa.carregado && !pessoa.gitUser && (
        <div className="rel-notice rel-notice-alert">
          Você ainda não informou seu usuário no Git. Sem ele, a fila não sabe quais PRs são seus. Informe no <a className="underline" href="/profile">Perfil</a>.
        </div>
      )}
      {erro && <div className="rel-notice rel-notice-error">{erro}</div>}

      <div className="flex flex-wrap gap-2">
        {abas.map((a) => (
          <button
            key={a.id}
            title={a.dica}
            onClick={() => setAba(a.id)}
            className={`rel-btn rel-btn-sm ${aba === a.id ? 'rel-btn-primary' : 'rel-btn-ghost'}`}
          >
            {a.rotulo} <span className={contagem[a.id] && (a.id === 'aplicar' || a.id === 'continuar') ? 'font-semibold' : 'opacity-75'}>({contagem[a.id]})</span>
          </button>
        ))}
      </div>

      <section className="rel-box rel-filters">
        <label className="rel-field rel-label rel-filter-wide">
          Pesquisar
          <CampoBusca valor={busca} onChange={(v) => setBusca(v)} placeholder="Chamado, cliente, correção, PR, dono..." />
        </label>
        <label className="rel-field rel-label">
          Status
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value as '' | StatusAplicacao)} className="rel-input">
            <option value="">Todos</option>
            {STATUS_FILA.map((s) => <option key={s} value={s}>{ROTULO_STATUS_CURTO[s]}</option>)}
          </select>
        </label>
        <label className="rel-check-inline">
          <input type="checkbox" checked={ocultaFechados} onChange={(e) => setOcultaFechados(e.target.checked)} />
          Ocultar concluídos e cancelados
        </label>
        <span className="rel-desc">{filtrados.length} pedido(s)</span>
      </section>

      <section className="rel-table-wrap">
        <table className="w-full text-left text-sm">
          <thead className="text-xs">
            <tr>
              <SortTh label="Chamado" k="chamado" sort={sort} onSort={toggleSort} />
              <SortTh label="Cliente" k="cliente" sort={sort} onSort={toggleSort} />
              <SortTh label="Correção" k="correcao" sort={sort} onSort={toggleSort} className="hidden md:table-cell" />
              <SortTh label="Dono do PR" k="dono" sort={sort} onSort={toggleSort} className="hidden lg:table-cell" />
              <SortTh label="Pedido por" k="solicitante" sort={sort} onSort={toggleSort} className="hidden lg:table-cell" />
              <SortTh label="Status" k="status" sort={sort} onSort={toggleSort} />
              <SortTh label="Atualizado" k="atualizado" sort={sort} onSort={toggleSort} className="hidden sm:table-cell" />
            </tr>
          </thead>
          <tbody>
            {!filtrados.length && (
              <tr><td colSpan={7} className="rel-empty">{aba === 'aplicar' ? 'Nada para você aplicar agora.' : aba === 'continuar' ? 'Nada aguardando a sua continuidade.' : 'Nenhum pedido.'}</td></tr>
            )}
            {filtrados.map((v) => {
              const precisaDeMim = (ehDono(v, eu) && v.donoLogins.length > 0 && (v.aplicacao === 'aberto' || v.aplicacao === 'aplicando')) || (v.aplicacao === 'aplicado' && ehSolicitante(v, eu));
              return (
                <tr key={v.id} onClick={() => url.abrir(v.id)} className={`rel-row ${precisaDeMim ? 'bg-sky-500/5' : ''}`}>
                  <td className="rel-mono whitespace-nowrap px-3 py-2"><Link href={url.hrefDe(v.id)} onClick={(e) => e.stopPropagation()} className="rel-link">{v.chamadoNumero}</Link></td>
                  <td className="px-3 py-2"><div className="font-medium">{v.cliente}</div><div className="max-w-[320px] truncate text-xs text-zinc-400">{v.assunto}</div></td>
                  <td className="hidden px-3 py-2 md:table-cell"><span className="font-mono text-zinc-300">{v.contextoNumero}</span><div className="max-w-[260px] truncate text-xs text-zinc-400">{v.contextoAssunto}</div></td>
                  <td className="hidden px-3 py-2 text-zinc-300 lg:table-cell">{v.donoNomes.join(', ') || '—'}</td>
                  <td className="hidden px-3 py-2 text-zinc-300 lg:table-cell">{v.criadoPorNome || v.criadoPorEmail}</td>
                  <td className="px-3 py-2"><span title={ROTULO_STATUS[v.aplicacao]} className={`rounded px-2 py-0.5 text-xs ${estiloStatus[v.aplicacao]}`}>{ROTULO_STATUS_CURTO[v.aplicacao]}</span>{precisaDeMim && <span className="ml-2 text-xs text-sky-600">precisa de você</span>}</td>
                  <td className="hidden whitespace-nowrap px-3 py-2 text-zinc-400 sm:table-cell">{dataBr(v.atualizadoEm)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default withAuth(FilaPage);
