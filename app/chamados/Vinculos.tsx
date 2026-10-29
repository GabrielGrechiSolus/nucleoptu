'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, arrayUnion, collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { Link2, Plus, Send, X } from 'lucide-react';
import { db } from '../../firebase';
import { usePessoa } from '../components/usePessoa';
import type { Chamado } from './parse';
import {
  AcaoAplicacao,
  HistoricoAplicacao,
  ROTULO_STATUS,
  ROTULO_STATUS_CURTO,
  StatusAplicacao,
  Vinculo,
  acoesPermitidas,
  normalizaChamado,
} from './aplicacao';

export const COLECAO_VINCULOS = 'vinculos';

export const estiloStatus: Record<StatusAplicacao, string> = {
  'nao-solicitada': 'bg-zinc-800 text-zinc-400',
  aberto: 'bg-amber-500/15 text-amber-600',
  aplicando: 'bg-sky-500/15 text-sky-600',
  aplicado: 'bg-violet-500/15 text-violet-600',
  concluido: 'bg-emerald-500/15 text-emerald-600',
  cancelado: 'bg-zinc-800 text-zinc-500',
};

const classeAcao: Record<AcaoAplicacao['tom'], string> = {
  primario: 'bg-sky-600 text-white hover:bg-sky-500',
  sucesso: 'bg-emerald-600 text-white hover:bg-emerald-500',
  perigo: 'bg-red-600 text-white hover:bg-red-500',
  neutro: 'border border-zinc-700 text-zinc-300 hover:bg-zinc-900',
};

// Muda o status de um vínculo e registra no histórico. Usado aqui e na fila.
export async function mudarStatus(v: Vinculo, para: StatusAplicacao, quem: { nome: string; email: string }, nota?: string) {
  const agora = new Date().toISOString();
  const entrada: HistoricoAplicacao = { em: agora, por: quem.nome || quem.email, de: v.aplicacao, para, ...(nota ? { nota } : {}) };
  await updateDoc(doc(db, COLECAO_VINCULOS, v.id), { aplicacao: para, atualizadoEm: agora, historico: arrayUnion(entrada) });
}

export function BotoesAcao({ v, onFeito, compacto = false }: { v: Vinculo; onFeito?: () => void; compacto?: boolean }) {
  const pessoa = usePessoa();
  const [pendente, setPendente] = useState<AcaoAplicacao | null>(null);
  const [nota, setNota] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const acoes = acoesPermitidas(v, { uid: pessoa.uid, gitUser: pessoa.gitUser });

  const executar = async (a: AcaoAplicacao, texto?: string) => {
    setSalvando(true);
    setErro('');
    try {
      await mudarStatus(v, a.para, { nome: pessoa.nome, email: pessoa.email }, texto?.trim() || undefined);
      setPendente(null);
      setNota('');
      onFeito?.();
    } catch (e) {
      console.error(e);
      setErro(`Não foi possível atualizar (${(e as { code?: string })?.code ?? 'erro'}).`);
    } finally {
      setSalvando(false);
    }
  };

  if (!acoes.length) return null;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {acoes.map((a) => (
          <button
            key={a.para + a.rotulo}
            disabled={salvando}
            onClick={() => (a.pedeNota ? setPendente(a) : executar(a))}
            className={`rounded-md px-3 ${compacto ? 'py-1 text-xs' : 'py-1.5 text-sm'} font-medium disabled:opacity-60 ${classeAcao[a.tom]}`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>
      {pendente && (
        <div className="rounded-md border border-zinc-700 p-2">
          <label className="mb-1 block text-xs text-zinc-400">Observação (opcional) para “{pendente.rotulo}”</label>
          <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} className="w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 text-sm text-zinc-100" />
          <div className="mt-2 flex gap-2">
            <button disabled={salvando} onClick={() => executar(pendente, nota)} className={`rounded-md px-3 py-1 text-xs font-medium ${classeAcao[pendente.tom]}`}>
              Confirmar
            </button>
            <button onClick={() => { setPendente(null); setNota(''); }} className="rounded-md border border-zinc-700 px-3 py-1 text-xs">Cancelar</button>
          </div>
        </div>
      )}
      {erro && <p className="text-xs text-rose-600">{erro}</p>}
    </div>
  );
}

export function Historico({ itens }: { itens: HistoricoAplicacao[] }) {
  if (!itens?.length) return null;
  return (
    <ol className="space-y-1 border-l border-zinc-700 pl-3 text-xs text-zinc-400">
      {[...itens].reverse().map((h, i) => (
        <li key={i}>
          <span className="text-zinc-300">{new Date(h.em).toLocaleString('pt-BR')}</span> — {h.por}: {h.de ? `${ROTULO_STATUS_CURTO[h.de]} → ` : ''}
          <strong className="text-zinc-200">{ROTULO_STATUS_CURTO[h.para]}</strong>
          {h.nota ? <span className="block text-zinc-500">“{h.nota}”</span> : null}
        </li>
      ))}
    </ol>
  );
}

// Seção do detalhe do contexto: chamados que precisaram desta correção e pedido de aplicação no cliente.
export default function Vinculos({ contexto }: { contexto: Chamado }) {
  const pessoa = usePessoa();
  const [lista, setLista] = useState<Vinculo[]>([]);
  const [erroLista, setErroLista] = useState('');
  const [abrindoForm, setAbrindoForm] = useState(false);
  const [numero, setNumero] = useState('');
  const [cliente, setCliente] = useState('');
  const [assunto, setAssunto] = useState('');
  const [observacao, setObservacao] = useState('');
  const [pedir, setPedir] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    setErroLista('');
    const q = query(collection(db, COLECAO_VINCULOS), where('contextoId', '==', contexto.id));
    return onSnapshot(
      q,
      (snap) => setLista(snap.docs.map((d) => ({ ...(d.data() as Vinculo), id: d.id })).sort((a, b) => (a.criadoEm < b.criadoEm ? 1 : -1))),
      (e) => setErroLista(`Não foi possível carregar os vínculos (${(e as { code?: string })?.code ?? 'erro'}).`),
    );
  }, [contexto.id]);

  const donos = useMemo(() => {
    const nomes = contexto.autores ?? [];
    const logins = contexto.autoresLogin ?? [];
    return { nomes, logins };
  }, [contexto]);

  const criar = async () => {
    const n = normalizaChamado(numero);
    if (!n) return setErro('Informe o número do chamado no formato 000.000.');
    if (!cliente.trim() || !assunto.trim()) return setErro('Informe o cliente e o assunto do chamado.');
    setErro('');
    setSalvando(true);
    try {
      const agora = new Date().toISOString();
      const status: StatusAplicacao = pedir ? 'aberto' : 'nao-solicitada';
      const por = pessoa.nome || pessoa.email;
      await addDoc(collection(db, COLECAO_VINCULOS), {
        contextoId: contexto.id,
        contextoNumero: contexto.numero,
        contextoAssunto: contexto.assunto,
        prs: contexto.prs.map((p) => `${p.repo ?? 'banco'}#${p.numero}`),
        donoLogins: donos.logins,
        donoNomes: donos.nomes,
        chamadoNumero: n,
        cliente: cliente.trim(),
        assunto: assunto.trim(),
        observacao: observacao.trim(),
        criadoPorUid: pessoa.uid,
        criadoPorNome: pessoa.nome,
        criadoPorEmail: pessoa.email,
        criadoEm: agora,
        atualizadoEm: agora,
        aplicacao: status,
        historico: [{ em: agora, por, de: '', para: status, nota: pedir ? 'Pedido de aplicação no cliente aberto.' : 'Chamado vinculado à correção.' }],
      });
      setNumero('');
      setCliente('');
      setAssunto('');
      setObservacao('');
      setPedir(true);
      setAbrindoForm(false);
    } catch (e) {
      console.error(e);
      setErro(`Não foi possível vincular (${(e as { code?: string })?.code ?? 'erro'}).`);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <section className="mb-4 rounded-lg border border-zinc-800 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Link2 className="h-4 w-4" /> Chamados que precisaram desta correção</h3>
        <button onClick={() => setAbrindoForm((v) => !v)} className="flex items-center gap-1 rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium hover:bg-sky-500">
          {abrindoForm ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />} {abrindoForm ? 'Fechar' : 'Vincular chamado'}
        </button>
      </div>
      <p className="mb-2 text-xs text-zinc-400">
        Dono do PR (quem aplica no cliente): {donos.nomes.length ? donos.nomes.join(', ') : 'não informado'}
        {donos.logins.length ? ` (${donos.logins.join(', ')})` : ' — sem usuário Git: qualquer pessoa pode assumir a aplicação'}.
      </p>

      {abrindoForm && (
        <div className="mb-3 space-y-2 rounded-md border border-zinc-700 p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label className="text-xs text-zinc-400">Nº do chamado *
              <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="000.000" className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100" />
            </label>
            <label className="text-xs text-zinc-400 sm:col-span-2">Cliente *
              <input value={cliente} onChange={(e) => setCliente(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100" />
            </label>
          </div>
          <label className="block text-xs text-zinc-400">Assunto / o que o cliente relatou *
            <input value={assunto} onChange={(e) => setAssunto(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100" />
          </label>
          <label className="block text-xs text-zinc-400">Observação para quem vai aplicar (opcional)
            <textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 p-2 text-sm text-zinc-100" />
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={pedir} onChange={(e) => setPedir(e.target.checked)} />
            <span><strong>Pedir aplicação no cliente</strong> — abre um chamado na Fila de aplicação para o dono do PR aplicar a correção antes da atualização da revision.</span>
          </label>
          {erro && <p className="text-xs text-rose-600">{erro}</p>}
          <button onClick={criar} disabled={salvando} className="flex items-center gap-2 rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium hover:bg-sky-500 disabled:opacity-60">
            <Send className="h-4 w-4" /> {salvando ? 'Salvando...' : 'Vincular'}
          </button>
        </div>
      )}

      {erroLista && <p className="text-xs text-rose-600">{erroLista}</p>}
      {!lista.length && !erroLista && <p className="text-xs text-zinc-500">Nenhum chamado vinculado ainda.</p>}
      <ul className="space-y-3">
        {lista.map((v) => (
          <li key={v.id} className="rounded-md border border-zinc-800 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-mono text-sky-300">{v.chamadoNumero}</span> <span className="text-sm">{v.cliente}</span>
                <div className="text-xs text-zinc-400">{v.assunto}</div>
                {v.observacao && <div className="text-xs text-zinc-500">Obs.: {v.observacao}</div>}
                <div className="text-xs text-zinc-500">Vinculado por {v.criadoPorNome || v.criadoPorEmail} em {new Date(v.criadoEm).toLocaleDateString('pt-BR')}</div>
              </div>
              <span title={ROTULO_STATUS[v.aplicacao]} className={`rounded px-2 py-0.5 text-xs ${estiloStatus[v.aplicacao]}`}>{ROTULO_STATUS_CURTO[v.aplicacao]}</span>
            </div>
            <div className="mt-2"><BotoesAcao v={v} compacto /></div>
            <details className="mt-2"><summary className="cursor-pointer text-xs text-zinc-400">Histórico</summary><div className="mt-2"><Historico itens={v.historico} /></div></details>
          </li>
        ))}
      </ul>
    </section>
  );
}
