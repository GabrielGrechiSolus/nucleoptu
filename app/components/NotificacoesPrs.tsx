'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { collection, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { Bell, ExternalLink, GitMerge, GitCommit, Layers3 } from 'lucide-react';
import { db } from '../../firebase';
import { tokenDoLogin } from '../chamados/atualizaGit';
import { COLECAO_BM, type RegistroBm } from '../chamados/bmRegistro';
import { lerEuBm } from '../chamados/bmChave';
import { montaNotificacoesBm, type NotificacaoBm, type TipoNotificacaoBm } from '../chamados/bmNotificacoes';
import type { CartaoQuadro } from '../chamados/bmQuadro';
import { chamadoDoTitulo } from '../chamados/github';
import { lidosIniciais, montaNotificacoes, naoLidas, tempoRelativo, type NotificacaoPr, type PrMergeado, type RegistroDoCartao } from '../chamados/prsMergeados';
import { usePessoa } from './usePessoa';

const INTERVALO_MS = 5 * 60_000;
const DIAS = 14;

const chaveLidos = (uid: string) => `nucleoptu.prsmergeados.${uid}`;
const chaveCommits = (uid: string) => `nucleoptu.commits.${uid}`;
const chaveSnapshotBm = (uid: string) => `nucleoptu.bm.snapshot.${uid}`;
const chaveAvisosBm = (uid: string) => `nucleoptu.bm.notificacoes.${uid}`;
const chaveReunioes = (uid: string) => `nucleoptu.office.meetings.${uid}`;

interface NotificacaoCommit { id: string; repo: string; sha: string; mensagem: string; url: string; em: string; lida: boolean }
interface NotificacaoReuniao { id: string; anfitriaoUid: string; anfitriaoNome: string; criadaEm: string; lida: boolean }

function leCommits(uid: string): NotificacaoCommit[] | null {
  try { const bruto = localStorage.getItem(chaveCommits(uid)); return bruto ? JSON.parse(bruto) as NotificacaoCommit[] : null; } catch { return null; }
}

function gravaCommits(uid: string, itens: NotificacaoCommit[]) {
  try { localStorage.setItem(chaveCommits(uid), JSON.stringify(itens.slice(0, 200))); } catch { /* armazenamento local indisponível */ }
}

const CORES_BM: Record<TipoNotificacaoBm, { texto: string; fundo: string; rotulo: string }> = {
  atribuido: { texto: '#7c3aed', fundo: '#7c3aed14', rotulo: 'Atribuição' },
  reatribuido: { texto: '#a16207', fundo: '#a1620714', rotulo: 'Responsável' },
  bloqueio: { texto: '#dc2626', fundo: '#dc262614', rotulo: 'Bloqueio' },
  etapa: { texto: '#2563eb', fundo: '#2563eb14', rotulo: 'Etapa' },
  prazo: { texto: '#ea580c', fundo: '#ea580c14', rotulo: 'Prazo' },
  prioridade: { texto: '#9333ea', fundo: '#9333ea14', rotulo: 'Prioridade' },
  atualizacao: { texto: '#0891b2', fundo: '#0891b214', rotulo: 'Atualização' },
};

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
  const [commits, setCommits] = useState<NotificacaoCommit[]>([]);
  const [reunioes, setReunioes] = useState<NotificacaoReuniao[]>([]);
  const [avisosBm, setAvisosBm] = useState<NotificacaoBm[]>([]);
  const [bmId, setBmId] = useState(0);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState('');
  const [agora, setAgora] = useState(() => Date.now());
  const raiz = useRef<HTMLDivElement>(null);
  const primeira = useRef(true);
  const avisados = useRef<Set<string>>(new Set());
  const cacheCartao = useRef<Map<string, RegistroDoCartao>>(new Map());
  const totalNaoLidasRef = useRef(0);

  useEffect(() => {
    const atualizaUsuarioBm = () => setBmId(lerEuBm()?.id ?? 0);
    atualizaUsuarioBm();
    window.addEventListener('nucleoptu-bm-chave', atualizaUsuarioBm);
    return () => window.removeEventListener('nucleoptu-bm-chave', atualizaUsuarioBm);
  }, []);

  useEffect(() => {
    if (!pessoa.carregado || !pessoa.uid) return;
    let primeiraLeitura = true;
    const carregaSalvas = (): NotificacaoReuniao[] => {
      try { return JSON.parse(localStorage.getItem(chaveReunioes(pessoa.uid)) ?? '[]') as NotificacaoReuniao[]; } catch { return []; }
    };
    const parar = onSnapshot(collection(db, 'office_meetings'), (snap) => {
      const salvas = carregaSalvas();
      const porId = new Map(salvas.map((n) => [n.id, n]));
      const atuais: NotificacaoReuniao[] = [];
      for (const d of snap.docs) {
        const dado = d.data();
        if (dado.status !== 'aberta' || dado.anfitriaoUid === pessoa.uid) continue;
        const criadaEm = typeof dado.criadaEm?.toDate === 'function' ? dado.criadaEm.toDate().toISOString() : '';
        const anterior = porId.get(d.id);
        const recente = Date.now() - Date.parse(criadaEm || '2000-01-01') < 8 * 60 * 60_000;
        const item = { id: d.id, anfitriaoUid: String(dado.anfitriaoUid ?? ''), anfitriaoNome: String(dado.anfitriaoNome ?? 'Equipe'), criadaEm, lida: anterior?.lida ?? (!recente) };
        atuais.push(item);
        if (!primeiraLeitura && !anterior) toast.info(<div className="text-sm"><strong>Convocação para reunião</strong><div>{item.anfitriaoNome} chamou a equipe.</div><Link href={`/chat?sala=${encodeURIComponent(item.id)}`} className="underline">Entrar na sala</Link></div>, { autoClose: 12000 });
      }
      atuais.sort((a, b) => Date.parse(b.criadaEm) - Date.parse(a.criadaEm));
      setReunioes(atuais);
      try { localStorage.setItem(chaveReunioes(pessoa.uid), JSON.stringify(atuais.slice(0, 100))); } catch { /* armazenamento local indisponível */ }
      primeiraLeitura = false;
    });
    return () => parar();
  }, [pessoa.carregado, pessoa.uid]);

  useEffect(() => {
    if (!pessoa.uid) return;
    const sincronizaLeitura = () => {
      setLidos(leLidos(pessoa.uid) ?? new Set());
      try { setAvisosBm(JSON.parse(localStorage.getItem(chaveAvisosBm(pessoa.uid)) ?? '[]') as NotificacaoBm[]); } catch { setAvisosBm([]); }
      try { setCommits(JSON.parse(localStorage.getItem(chaveCommits(pessoa.uid)) ?? '[]') as NotificacaoCommit[]); } catch { setCommits([]); }
      try { setReunioes(JSON.parse(localStorage.getItem(chaveReunioes(pessoa.uid)) ?? '[]') as NotificacaoReuniao[]); } catch { setReunioes([]); }
    };
    window.addEventListener('nucleoptu:notifications-updated', sincronizaLeitura);
    return () => window.removeEventListener('nucleoptu:notifications-updated', sincronizaLeitura);
  }, [pessoa.uid]);

  useEffect(() => {
    if (!pessoa.carregado || !pessoa.uid || !bmId) return;
    const chaveSnapshot = chaveSnapshotBm(pessoa.uid);
    const chaveAvisos = chaveAvisosBm(pessoa.uid);
    const parseCartoes = (v: string | null): CartaoQuadro[] => {
      try { return v ? JSON.parse(v) as CartaoQuadro[] : []; } catch { return []; }
    };
    const parseAvisos = (): NotificacaoBm[] => {
      try { return JSON.parse(localStorage.getItem(chaveAvisos) ?? '[]') as NotificacaoBm[]; } catch { return []; }
    };
    setAvisosBm(parseAvisos());
    let cartoes: CartaoQuadro[] = [];
    let pronto = false;
    let carregouCartoes = false;
    const processa = () => {
      if (!pronto || !carregouCartoes) return;
      setAgora(Date.now());
      let anteriores: CartaoQuadro[] | null = null;
      try {
        const salvo = localStorage.getItem(chaveSnapshot);
        if (salvo !== null) anteriores = parseCartoes(salvo);
      } catch { /* sem armazenamento: inicia a partir do quadro atual */ }
      if (anteriores) {
        const novas = montaNotificacoesBm(anteriores, cartoes, bmId);
        if (novas.length) {
          const atuais = parseAvisos();
          const ids = new Set(atuais.map((n) => n.id));
          const ineditas = novas.filter((n) => !ids.has(n.id));
          const juntas = [...ineditas, ...atuais].slice(0, 300);
          try { localStorage.setItem(chaveAvisos, JSON.stringify(juntas)); } catch { /* mantém os avisos na memória */ }
          setAvisosBm(juntas);
          for (const n of ineditas) {
            const cor = CORES_BM[n.tipo];
            toast(<div className="text-sm"><strong style={{ color: cor.texto }}>{cor.rotulo}</strong><div>{n.numero ? `${n.numero} · ` : ''}{n.titulo || `Cartão ${n.cardId}`}</div><div className="text-xs">{n.mensagem}</div></div>, { autoClose: 10000 });
          }
        }
      }
      try { localStorage.setItem(chaveSnapshot, JSON.stringify(cartoes)); } catch { /* sem armazenamento local */ }
    };
    const pararCartoes = onSnapshot(collection(db, 'bm_quadro'), (snap) => {
      cartoes = snap.docs.map((d) => d.data() as CartaoQuadro);
      carregouCartoes = true;
      processa();
    });
    void getDoc(doc(db, 'bm_quadro_meta', 'atual')).then((snap) => {
      pronto = snap.exists();
      processa();
    }).catch(() => { pronto = false; });
    return () => pararCartoes();
  }, [pessoa.carregado, pessoa.uid, bmId]);

  const ativo = pessoa.carregado && !!pessoa.uid;
  const ativoGit = ativo && !pessoa.semGit && !!pessoa.gitUser;

  const carrega = useCallback(async () => {
    try {
      const token = await tokenDoLogin();
      const headers = { Authorization: `Bearer ${token}` };
      const [r, rc] = await Promise.all([
        fetch(`/api/git/mergeados?login=${encodeURIComponent(pessoa.gitUser)}&dias=${DIAS}`, { headers }),
        fetch(`/api/git/commits?login=${encodeURIComponent(pessoa.gitUser)}`, { headers }),
      ]);
      const j = await r.json();
      if (!r.ok) {
        setErro(j.erro ?? 'Não foi possível consultar os PRs agora.');
        return;
      }
      setErro('');
      const lista = (j.prs ?? []) as PrMergeado[];

      if (rc.ok) {
        const jc = await rc.json() as { commits?: Omit<NotificacaoCommit, 'lida'>[] };
        const recebidos = jc.commits ?? [];
        const anteriores = leCommits(pessoa.uid);
        if (!anteriores) {
          const iniciais = recebidos.map((c) => ({ ...c, lida: true }));
          setCommits(iniciais);
          gravaCommits(pessoa.uid, iniciais);
        } else {
          const ids = new Set(anteriores.map((c) => c.id));
          const novos = recebidos.filter((c) => !ids.has(c.id)).map((c) => ({ ...c, lida: false }));
          const juntos = [...novos, ...anteriores].slice(0, 200);
          setCommits(juntos);
          gravaCommits(pessoa.uid, juntos);
          for (const c of novos.slice(0, 3)) toast.info(<div className="text-sm"><strong>Commit novo · {c.repo}</strong><div>{c.mensagem}</div><a href={c.url} target="_blank" rel="noreferrer" className="underline">Abrir commit</a></div>, { autoClose: 9000 });
        }
      }

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
    if (!ativoGit) return;
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
  }, [ativoGit, carrega]);

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
  const novasBm = avisosBm.filter((n) => !n.lida).length;
  const novasCommits = commits.filter((c) => !c.lida).length;
  const novasReunioes = reunioes.filter((r) => !r.lida).length;
  const totalNaoLidas = novas + novasBm + novasCommits + novasReunioes;

  useEffect(() => {
    totalNaoLidasRef.current = totalNaoLidas;
  }, [totalNaoLidas]);

  useEffect(() => {
    const tituloOriginal = document.title;
    let exibindoAviso = false;
    const timer = window.setInterval(() => {
      const total = totalNaoLidasRef.current;
      if (!total) {
        exibindoAviso = false;
        if (document.title !== tituloOriginal) document.title = tituloOriginal;
        return;
      }
      exibindoAviso = !exibindoAviso;
      document.title = exibindoAviso ? `🔔 (${total}) Notificações não lidas` : tituloOriginal;
    }, 900);
    return () => {
      window.clearInterval(timer);
      document.title = tituloOriginal;
    };
  }, []);

  const marca = (ids: string[]) => {
    const proximo = new Set([...lidos, ...ids]);
    setLidos(proximo);
    gravaLidos(pessoa.uid, proximo);
  };

  const marcaBm = (ids: string[]) => {
    const marcados = new Set(ids);
    const proximos = avisosBm.map((n) => marcados.has(n.id) ? { ...n, lida: true } : n);
    setAvisosBm(proximos);
    try { localStorage.setItem(chaveAvisosBm(pessoa.uid), JSON.stringify(proximos)); } catch { /* armazenamento local indisponível */ }
  };

  const marcaCommits = (ids: string[]) => {
    const marcados = new Set(ids);
    const proximos = commits.map((c) => marcados.has(c.id) ? { ...c, lida: true } : c);
    setCommits(proximos);
    gravaCommits(pessoa.uid, proximos);
  };

  const marcaReunioes = (ids: string[]) => {
    const marcados = new Set(ids);
    const proximas = reunioes.map((r) => marcados.has(r.id) ? { ...r, lida: true } : r);
    setReunioes(proximas);
    try { localStorage.setItem(chaveReunioes(pessoa.uid), JSON.stringify(proximas)); } catch { /* armazenamento indisponível */ }
  };

  if (!ativo) return null;

  return (
    <div ref={raiz} className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-label={totalNaoLidas ? `Notificações: ${totalNaoLidas} nova(s)` : 'Notificações'}
        aria-expanded={aberto}
        title="Notificações"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-[#454343] transition-colors hover:bg-[#00518C]/10 hover:text-[#00518C]"
      >
        <Bell size={20} />
        {totalNaoLidas > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{totalNaoLidas > 9 ? '9+' : totalNaoLidas}</span>
        )}
      </button>

      {aberto && (
        <div role="dialog" aria-label="Notificações" className="fixed left-2 right-2 top-[64px] z-50 overflow-hidden rounded-lg border border-[#ebebf0] bg-white text-[#333333] shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-11 sm:w-[380px]">
          <div className="flex items-center justify-between gap-2 border-b border-[#ebebf0] px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-semibold"><Bell size={16} className="text-[#00518C]" /> Notificações</span>
            <button type="button" onClick={() => { marca(itens.map((n) => n.id)); marcaBm(avisosBm.map((n) => n.id)); marcaCommits(commits.map((n) => n.id)); marcaReunioes(reunioes.map((n) => n.id)); }} disabled={!totalNaoLidas} className="text-xs text-[#00518C] hover:underline disabled:cursor-not-allowed disabled:opacity-40">Marcar todas como lidas</button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {erro && <p className="border-b border-[#ebebf0] bg-amber-50 px-4 py-2 text-xs text-amber-800">{erro}</p>}
            {!itens.length && !avisosBm.length && !commits.length && !reunioes.length && !erro && <p className="px-4 py-6 text-center text-sm text-[#777]">Nenhuma notificação.</p>}
            <ul>
              {reunioes.map((r) => <li key={`meeting-${r.id}`} className={`border-b border-[#ebebf0] px-4 py-3 ${r.lida ? '' : 'bg-amber-50'}`}><div className="flex items-start justify-between gap-2"><div><span className="mb-1 inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800"><Bell size={11}/> Reunião</span><div className="text-sm font-medium">{r.anfitriaoNome} chamou a equipe</div><div className="text-xs text-[#777]">{r.criadaEm ? tempoRelativo(r.criadaEm, agora) : 'agora'}</div></div>{!r.lida && <span className="mt-1 h-2 w-2 rounded-full bg-amber-600"/>}</div><div className="mt-2 flex items-center gap-3"><Link href={`/chat?sala=${encodeURIComponent(r.id)}`} onClick={() => marcaReunioes([r.id])} className="inline-flex items-center gap-1 rounded border border-amber-700 px-2 py-1 text-xs font-medium text-amber-800">Entrar na sala <ExternalLink size={12}/></Link>{!r.lida && <button type="button" onClick={() => marcaReunioes([r.id])} className="ml-auto text-xs text-[#777] hover:underline">Marcar como lida</button>}</div></li>)}
              {commits.map((c) => <li key={c.id} className={`border-b border-[#ebebf0] px-4 py-3 ${c.lida ? '' : 'bg-emerald-50'}`}>
                <div className="flex items-start justify-between gap-2"><div className="min-w-0"><span className="mb-1 inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800"><GitCommit size={11} /> Commit novo · {c.repo}</span><div className="text-sm font-medium">{c.mensagem}</div><div className="text-xs text-[#777]">{c.sha.slice(0, 8)} · {c.em ? tempoRelativo(c.em, agora) : 'recente'}</div></div>{!c.lida && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-600" aria-label="não lida" />}</div>
                <div className="mt-2 flex items-center gap-2"><a href={c.url} target="_blank" rel="noreferrer" onClick={() => marcaCommits([c.id])} className="inline-flex items-center gap-1 rounded border border-emerald-700 px-2 py-1 text-xs font-medium text-emerald-800">Abrir commit <ExternalLink size={12} /></a>{!c.lida && <button type="button" onClick={() => marcaCommits([c.id])} className="ml-auto text-xs text-[#777] hover:underline">Marcar como lida</button>}</div>
              </li>)}
              {avisosBm.map((n) => {
                const cor = CORES_BM[n.tipo];
                return (
                  <li key={n.id} className={`border-b border-[#ebebf0] px-4 py-3 last:border-0 ${n.lida ? '' : 'bg-[#00518C]/5'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ color: cor.texto, backgroundColor: cor.fundo }}><Layers3 size={11} /> {cor.rotulo}</span>
                        <div className="mt-1 truncate text-sm font-medium" title={n.titulo}>{n.numero ? `${n.numero} · ` : ''}{n.titulo || `Cartão ${n.cardId}`}</div>
                        <div className="text-xs text-[#666]">{n.mensagem}</div>
                        <div className="mt-1 text-xs text-[#777]">{tempoRelativo(n.em, agora)}</div>
                      </div>
                      {!n.lida && <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: cor.texto }} aria-label="não lida" />}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      {n.url && <a href={n.url} target="_blank" rel="noreferrer" onClick={() => marcaBm([n.id])} className="inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium" style={{ color: cor.texto, borderColor: cor.texto }}>Abrir cartão <ExternalLink size={12} /></a>}
                      {!n.lida && <button type="button" onClick={() => marcaBm([n.id])} className="ml-auto text-xs text-[#777] hover:underline">Marcar como lida</button>}
                    </div>
                  </li>
                );
              })}
              {itens.map((n) => (
                <li key={n.id} className={`border-b border-[#ebebf0] px-4 py-3 last:border-0 ${n.lida ? '' : 'bg-[#00518C]/5'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="mb-1 inline-flex rounded bg-[#00518C]/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#00518C]">PR mergeado</div>
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
