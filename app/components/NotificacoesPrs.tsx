'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { Bell, ExternalLink, GitMerge } from 'lucide-react';
import { db } from '../../firebase';
import { tokenDoLogin } from '../chamados/atualizaGit';
import { COLECAO_BM, type RegistroBm } from '../chamados/bmRegistro';
import { chamadoDoTitulo } from '../chamados/github';
import { lidosIniciais, montaNotificacoes, naoLidas, tempoRelativo, type NotificacaoPr, type PrMergeado, type RegistroDoCartao } from '../chamados/prsMergeados';
import { usePessoa } from './usePessoa';

const INTERVALO_MS = 5 * 60_000;
const DIAS = 14;

const chaveLidos = (uid: string) => `nucleoptu.prsmergeados.${uid}`;

function leLidos(uid: string): Set<string> | null {
  try {
    const bruto = localStorage.getItem(chaveLidos(uid));
    return bruto ? new Set(JSON.parse(bruto) as string[]) : null;
  } catch {
    return null;
  }
}

function gravaLidos(uid: string, lidos: Set<string>) {
  try {
    localStorage.setItem(chaveLidos(uid), JSON.stringify([...lidos].slice(-300)));
  } catch {
    // sem armazenamento local: as notificações voltam como novas na próxima visita
  }
}

function Aviso({ n }: { n: NotificacaoPr }) {
  return (
    <div className="text-sm">
      <strong>PR mergeado</strong>
      <div>{n.repo} #{n.numero}{n.chamado ? ` · chamado ${n.chamado}` : ''}</div>
      <div className="mt-1 flex flex-wrap gap-3">
        <a href={n.url} target="_blank" rel="noreferrer" className="underline">Abrir PR</a>
        {n.cartaoUrl && <a href={n.cartaoUrl} target="_blank" rel="noreferrer" className="underline">Cartão no BM</a>}
      </div>
    </div>
  );
}

export default function NotificacoesPrs() {
  const pessoa = usePessoa();
  const [prs, setPrs] = useState<PrMergeado[]>([]);
  const [registros, setRegistros] = useState<Record<string, RegistroDoCartao>>({});
  const [lidos, setLidos] = useState<Set<string>>(new Set());
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState('');
  const [agora, setAgora] = useState(() => Date.now());
  const raiz = useRef<HTMLDivElement>(null);
  const primeira = useRef(true);
  const avisados = useRef<Set<string>>(new Set());
  const cacheCartao = useRef<Map<string, RegistroDoCartao>>(new Map());

  const ativo = pessoa.carregado && !pessoa.semGit && !!pessoa.gitUser && !!pessoa.uid;

  const carrega = useCallback(async () => {
    try {
      const r = await fetch(`/api/git/mergeados?login=${encodeURIComponent(pessoa.gitUser)}&dias=${DIAS}`, { headers: { Authorization: `Bearer ${await tokenDoLogin()}` } });
      const j = await r.json();
      if (!r.ok) {
        setErro(j.erro ?? 'Não foi possível consultar os PRs agora.');
        return;
      }
      setErro('');
      const lista = (j.prs ?? []) as PrMergeado[];

      const ids = [...new Set(lista.map((p) => (chamadoDoTitulo(p.titulo) ?? '').replace('.', '')).filter(Boolean))];
      await Promise.all(
        ids
          .filter((id) => !cacheCartao.current.get(id)?.resumo)
          .map(async (id) => {
            try {
              const snap = await getDoc(doc(db, COLECAO_BM, id));
              cacheCartao.current.set(id, snap.exists() ? (snap.data() as RegistroBm) : null);
            } catch {
              cacheCartao.current.set(id, null);
            }
          }),
      );

      let atuais = leLidos(pessoa.uid);
      if (!atuais) {
        atuais = new Set(lidosIniciais(lista, Date.now()));
        gravaLidos(pessoa.uid, atuais);
      }
      setLidos(atuais);
      setRegistros(Object.fromEntries(cacheCartao.current));
      setPrs(lista);
      setAgora(Date.now());

      const feitas = montaNotificacoes(lista, Object.fromEntries(cacheCartao.current), atuais);
      if (!primeira.current) {
        for (const n of naoLidas(feitas)) {
          if (avisados.current.has(n.id)) continue;
          avisados.current.add(n.id);
          toast.info(<Aviso n={n} />, { autoClose: 12000 });
        }
      } else {
        for (const n of naoLidas(feitas)) avisados.current.add(n.id);
      }
      primeira.current = false;
    } catch {
      setErro('Não foi possível consultar os PRs agora.');
    }
  }, [pessoa.gitUser, pessoa.uid]);

  useEffect(() => {
    if (!ativo) return;
    const inicio = window.setTimeout(() => void carrega(), 0);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void carrega();
    }, INTERVALO_MS);
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') void carrega();
    };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      window.clearTimeout(inicio);
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [ativo, carrega]);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', esc);
    };
  }, [aberto]);

  const itens = useMemo(() => montaNotificacoes(prs, registros, lidos), [prs, registros, lidos]);
  const novas = naoLidas(itens).length;

  const marca = (ids: string[]) => {
    const proximo = new Set([...lidos, ...ids]);
    setLidos(proximo);
    gravaLidos(pessoa.uid, proximo);
  };

  if (!ativo) return null;

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label={novas ? `Notificações de PRs mergeados: ${novas} nova(s)` : 'Notificações de PRs mergeados'}
        aria-expanded={aberto}
        title="PRs mergeados"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-[#454343] transition-colors hover:bg-[#00518C]/10 hover:text-[#00518C]"
      >
        <Bell size={20} />
        {novas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{novas > 9 ? '9+' : novas}</span>
        )}
      </button>

      {aberto && (
        <div role="dialog" aria-label="PRs mergeados" className="fixed left-2 right-2 top-[64px] z-50 overflow-hidden rounded-lg border border-[#ebebf0] bg-white text-[#333333] shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-11 sm:w-[380px]">
          <div className="flex items-center justify-between gap-2 border-b border-[#ebebf0] px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-semibold"><GitMerge size={16} className="text-[#00518C]" /> PRs mergeados</span>
            <button type="button" onClick={() => marca(itens.map((n) => n.id))} disabled={!novas} className="text-xs text-[#00518C] hover:underline disabled:cursor-not-allowed disabled:opacity-40">Marcar todas como lidas</button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {erro && <p className="border-b border-[#ebebf0] bg-amber-50 px-4 py-2 text-xs text-amber-800">{erro}</p>}
            {!itens.length && !erro && <p className="px-4 py-6 text-center text-sm text-[#777]">Nenhum PR seu foi mergeado nos últimos {DIAS} dias.</p>}
            <ul>
              {itens.map((n) => (
                <li key={n.id} className={`border-b border-[#ebebf0] px-4 py-3 last:border-0 ${n.lida ? '' : 'bg-[#00518C]/5'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs text-[#777]">{n.repo} #{n.numero} · {tempoRelativo(n.mescladoEm, agora)}</div>
                      <div className="truncate text-sm font-medium" title={n.titulo}>{n.assunto}</div>
                      {n.chamado && <div className="text-xs text-[#555]">Chamado {n.chamado}{n.coluna ? ` · ${n.coluna}` : ''}</div>}
                    </div>
                    {!n.lida && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#00518C]" aria-label="não lida" />}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <a href={n.url} target="_blank" rel="noreferrer" onClick={() => marca([n.id])} className="inline-flex items-center gap-1 rounded border border-[#00518C] px-2 py-1 text-xs font-medium text-[#00518C] hover:bg-[#00518C]/10">
                      Abrir PR <ExternalLink size={12} />
                    </a>
                    {n.cartaoUrl ? (
                      <a href={n.cartaoUrl} target="_blank" rel="noreferrer" onClick={() => marca([n.id])} className="inline-flex items-center gap-1 rounded border border-[#00518C] px-2 py-1 text-xs font-medium text-[#00518C] hover:bg-[#00518C]/10">
                        Cartão no BM <ExternalLink size={12} />
                      </a>
                    ) : n.chamadoId ? (
                      <Link href={`/chamados?chamado=${n.chamadoId}`} onClick={() => { marca([n.id]); setAberto(false); }} className="text-xs text-[#555] underline" title="O cartão do BM ainda não foi sincronizado para este chamado">
                        Ver chamado (sem cartão sincronizado)
                      </Link>
                    ) : null}
                    {!n.lida && <button type="button" onClick={() => marca([n.id])} className="ml-auto text-xs text-[#777] hover:underline">Marcar como lida</button>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
