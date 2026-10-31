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
import ProcessoModal from './ProcessoModal';
import { permissaoProcessos } from './clienteProcesso';

function ProcessosPage() {
  const pessoa = usePessoa();
  const [itens, setItens] = useState<Chamado[]>([]);
  const [registros, setRegistros] = useState<Record<string, RegistroBm>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [permissao, setPermissao] = useState<{ permitido: boolean; motivo: string } | null>(null);
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState<Chamado | null>(null);
  const { sort, toggleSort } = useSort({ key: 'numero', dir: 'desc' });

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const [snap, regs] = await Promise.all([getDocs(collection(db, 'chamados')), lerRegistrosBm()]);
      setItens(snap.docs.map((d) => d.data() as Chamado));
      setRegistros(regs);
    } catch (e) {
      setErro(`Não foi possível carregar os dados (${(e as { code?: string })?.code ?? 'erro'}).`);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
    permissaoProcessos().then(setPermissao);
  }, [carregar]);

  const reler = useCallback(
    async (c: Chamado) => {
      await sincronizaBm({ chamados: [c], registros, por: auth.currentUser?.email ?? '', forcar: true, onProgresso: () => undefined, deveParar: () => false });
      setRegistros(await lerRegistrosBm());
    },
    [registros],
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
      <div className="mx-auto max-w-xl rounded-lg border border-zinc-800 p-6 text-sm">
        <h1 className="mb-2 text-lg font-semibold">Processos do BM</h1>
        <p className="text-zinc-400">{permissao.motivo || 'Recurso experimental liberado apenas para usuários Git autorizados.'}</p>
        <p className="mt-2 text-xs text-zinc-500">Para usar, informe a sua chave do Businessmap em Perfil → Businessmap.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Processos do BM</h1>
        <p className="text-sm text-zinc-400">
          Experimento: preenche os campos do cartão a partir do Git, marca os critérios de saída que o Git comprova e move o cartão. Cada gravação pede a sua confirmação.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Chamado, assunto ou cliente" className="w-full max-w-sm rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" />
        <button onClick={carregar} disabled={carregando} className="rounded border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800 disabled:opacity-50">Recarregar</button>
        <span className="text-xs text-zinc-500">{linhas.length} chamado(s) seus com cartão no BM sincronizado</span>
      </div>

      {erro && <p className="text-sm text-red-300">{erro}</p>}

      <section className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-zinc-400">
            <tr>
              <SortTh label="Chamado" k="numero" sort={sort} onSort={toggleSort} />
              <SortTh label="Assunto" k="assunto" sort={sort} onSort={toggleSort} />
              <SortTh label="Situação" k="situacao" sort={sort} onSort={toggleSort} className="hidden md:table-cell" />
              <SortTh label="Coluna no BM" k="bm" sort={sort} onSort={toggleSort} />
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {carregando && <tr><td colSpan={5} className="px-3 py-8 text-center text-zinc-500">Carregando...</td></tr>}
            {!carregando && !linhas.length && (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-zinc-500">Nenhum chamado seu com cartão do BM sincronizado. Use “Atualizar do BM” em Contexto de chamados e confira o usuário Git do perfil.</td></tr>
            )}
            {linhas.map((c) => (
              <tr key={c.id} onClick={() => setAberto(c)} className="cursor-pointer border-t border-zinc-800 hover:bg-zinc-900/60">
                <td className="whitespace-nowrap px-3 py-2 font-mono text-sky-300">{c.numero}</td>
                <td className="max-w-[420px] px-3 py-2"><div className="font-medium">{c.assunto}</div><div className="text-xs text-zinc-400">{c.cliente || '—'}</div></td>
                <td className="hidden px-3 py-2 md:table-cell">{c.situacao ? ROTULO_SITUACAO[c.situacao] : '—'}</td>
                <td className="px-3 py-2"><BmColuna r={registros[soDigitos(c.numero)]?.resumo} /></td>
                <td className="px-3 py-2 text-right"><span className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white">Processo</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {aberto && registros[soDigitos(aberto.numero)] && (
        <ProcessoModal key={aberto.id} chamado={aberto} registro={registros[soDigitos(aberto.numero)]} onClose={() => setAberto(null)} onGravado={() => reler(aberto)} />
      )}
    </div>
  );
}

export default withAuth(ProcessosPage);
