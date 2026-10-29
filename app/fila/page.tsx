'use client';

import React, { useEffect, useMemo, useState } from 'react';
import withAuth from '../components/withAuth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { ListChecks, Search, X } from 'lucide-react';
import { db } from '../../firebase';
import { usePessoa } from '../components/usePessoa';
import { SortTh, sortRows, useSort } from '../components/SortableTable';
import { BotoesAcao, COLECAO_VINCULOS, Historico, estiloStatus } from '../chamados/Vinculos';
import { ROTULO_STATUS, ROTULO_STATUS_CURTO, STATUS_ABERTOS, STATUS_FILA, StatusAplicacao, Vinculo, ehDono, ehSolicitante, pendenciasPara } from '../chamados/aplicacao';

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
  const [aberto, setAberto] = useState<string | null>(null);
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

  const selecionado = itens.find((v) => v.id === aberto) ?? null;

  const abas: { id: Aba; rotulo: string; dica: string }[] = [
    { id: 'aplicar', rotulo: 'Para eu aplicar', dica: 'Pedidos abertos ou em aplicação dos PRs que você fez' },
    { id: 'continuar', rotulo: 'Aguardando minha continuidade', dica: 'Já aplicados no cliente; você pediu e precisa dar continuidade no chamado' },
    { id: 'meus', rotulo: 'Meus pedidos', dica: 'Pedidos que você abriu' },
    { id: 'todos', rotulo: 'Todos', dica: 'Toda a fila' },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <ListChecks className="h-7 w-7 text-sky-400" />
        <div>
          <h1 className="text-2xl font-bold">Fila de aplicação</h1>
          <p className="text-sm text-zinc-400">Correções que precisam ser aplicadas no cliente antes da atualização da revision.</p>
        </div>
      </header>

      {pessoa.carregado && !pessoa.gitUser && (
        <div className="mb-4 rounded-md border border-amber-600/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
          Você ainda não informou seu usuário no Git. Sem ele, a fila não sabe quais PRs são seus. Informe no <a className="underline" href="/profile">Perfil</a>.
        </div>
      )}
      {erro && <div className="mb-4 rounded-md border border-rose-700/50 bg-rose-900/20 px-3 py-2 text-sm text-rose-200">{erro}</div>}

      <div className="mb-3 flex flex-wrap gap-2">
        {abas.map((a) => (
          <button
            key={a.id}
            title={a.dica}
            onClick={() => setAba(a.id)}
            className={`rounded-full border px-3 py-1.5 text-sm ${aba === a.id ? 'border-[#00518C] bg-[#00518C] text-white' : 'border-zinc-700 text-zinc-300 hover:bg-zinc-900'}`}
          >
            {a.rotulo} <span className={contagem[a.id] && (a.id === 'aplicar' || a.id === 'continuar') ? 'font-semibold' : 'opacity-75'}>({contagem[a.id]})</span>
          </button>
        ))}
      </div>

      <section className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-xs text-zinc-400">
          Pesquisar
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Chamado, cliente, correção, PR, dono..." className="w-full rounded-md border border-zinc-700 bg-zinc-900 py-2 pl-8 pr-3 text-sm text-zinc-100" />
          </div>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Status
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value as '' | StatusAplicacao)} className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100">
            <option value="">Todos</option>
            {STATUS_FILA.map((s) => <option key={s} value={s}>{ROTULO_STATUS_CURTO[s]}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          <input type="checkbox" checked={ocultaFechados} onChange={(e) => setOcultaFechados(e.target.checked)} />
          Ocultar concluídos e cancelados
        </label>
        <span className="ml-auto text-xs text-zinc-400">{filtrados.length} pedido(s)</span>
      </section>

      <section className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-zinc-400">
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
              <tr><td colSpan={7} className="px-3 py-8 text-center text-zinc-500">{aba === 'aplicar' ? 'Nada para você aplicar agora.' : aba === 'continuar' ? 'Nada aguardando a sua continuidade.' : 'Nenhum pedido.'}</td></tr>
            )}
            {filtrados.map((v) => {
              const precisaDeMim = (ehDono(v, eu) && v.donoLogins.length > 0 && (v.aplicacao === 'aberto' || v.aplicacao === 'aplicando')) || (v.aplicacao === 'aplicado' && ehSolicitante(v, eu));
              return (
                <tr key={v.id} onClick={() => setAberto(v.id)} className={`cursor-pointer border-t border-zinc-800 hover:bg-zinc-900/60 ${precisaDeMim ? 'bg-sky-500/5' : ''}`}>
                  <td className="whitespace-nowrap px-3 py-2 font-mono text-sky-300">{v.chamadoNumero}</td>
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

      {selecionado && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/60" onClick={() => setAberto(null)}>
          <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-zinc-700 bg-zinc-950 p-4 sm:p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-sky-300">{selecionado.chamadoNumero}</div>
                <h2 className="text-lg font-semibold">{selecionado.cliente}</h2>
                <p className="text-sm text-zinc-400">{selecionado.assunto}</p>
              </div>
              <button onClick={() => setAberto(null)} className="rounded p-1 hover:bg-zinc-800"><X className="h-5 w-5" /></button>
            </div>
            <dl className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-zinc-500">Status</dt><dd><span className={`rounded px-2 py-0.5 text-xs ${estiloStatus[selecionado.aplicacao]}`}>{ROTULO_STATUS[selecionado.aplicacao]}</span></dd></div>
              <div><dt className="text-xs text-zinc-500">Pedido por</dt><dd>{selecionado.criadoPorNome || selecionado.criadoPorEmail}</dd></div>
              <div className="col-span-2"><dt className="text-xs text-zinc-500">Correção</dt><dd>{selecionado.contextoNumero} — {selecionado.contextoAssunto}</dd></div>
              <div className="col-span-2"><dt className="text-xs text-zinc-500">Quem aplica (dono do PR)</dt><dd>{selecionado.donoNomes.join(', ') || 'não informado'}{selecionado.donoLogins.length ? ` (${selecionado.donoLogins.join(', ')})` : ''}</dd></div>
              <div className="col-span-2"><dt className="text-xs text-zinc-500">PRs</dt><dd className="font-mono text-xs">{selecionado.prs.join(', ') || '—'}</dd></div>
              {selecionado.observacao && <div className="col-span-2"><dt className="text-xs text-zinc-500">Observação</dt><dd>{selecionado.observacao}</dd></div>}
            </dl>
            <div className="mb-4"><BotoesAcao v={selecionado} /></div>
            <h3 className="mb-2 text-sm font-semibold">Histórico</h3>
            <Historico itens={selecionado.historico} />
          </aside>
        </div>
      )}
    </div>
  );
}

export default withAuth(FilaPage);
