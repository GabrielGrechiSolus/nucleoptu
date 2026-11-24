'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, ExternalLink, GitPullRequest, Layers3 } from 'lucide-react';
import { usePessoa } from '../components/usePessoa';
import { tokenDoLogin } from '../chamados/atualizaGit';
import { montaNotificacoes, type NotificacaoPr, type PrMergeado } from '../chamados/prsMergeados';
import type { NotificacaoBm } from '../chamados/bmNotificacoes';

type Item = { id: string; tipo: 'BM' | 'PR'; titulo: string; detalhe: string; em: string; url: string; lida: boolean; cor: string };
const chavePr = (uid: string) => `nucleoptu.prsmergeados.${uid}`;
const chaveBm = (uid: string) => `nucleoptu.bm.notificacoes.${uid}`;

export default function PersonalNotifications() {
  const pessoa = usePessoa();
  const [prs, setPrs] = useState<NotificacaoPr[]>([]);
  const [bm, setBm] = useState<NotificacaoBm[]>([]);
  const [filtro, setFiltro] = useState<'todas' | 'BM' | 'PR'>('todas');
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    if (!pessoa.uid) return;
    try {
      if (pessoa.gitUser && !pessoa.semGit) {
        const token = await tokenDoLogin();
        const r = await fetch(`/api/git/mergeados?login=${encodeURIComponent(pessoa.gitUser)}&dias=14`, { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) {
        const dados = await r.json() as { prs?: PrMergeado[] };
        let lidos: string[] = [];
        try { lidos = JSON.parse(localStorage.getItem(chavePr(pessoa.uid)) ?? '[]') as string[]; } catch { /* histórico indisponível */ }
        setPrs(montaNotificacoes(dados.prs ?? [], {}, new Set(lidos)));
        }
      } else {
        setPrs([]);
      }
      try { setBm(JSON.parse(localStorage.getItem(chaveBm(pessoa.uid)) ?? '[]') as NotificacaoBm[]); } catch { setBm([]); }
      setErro('');
    } catch {
      setErro('Não foi possível consultar seus avisos de PR agora.');
    }
  }, [pessoa.uid, pessoa.gitUser, pessoa.semGit]);

  useEffect(() => {
    if (!pessoa.carregado || !pessoa.uid) return;
    void carregar();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void carregar(); }, 5 * 60_000);
    const aoVoltar = () => { if (document.visibilityState === 'visible') void carregar(); };
    window.addEventListener('storage', aoVoltar);
    document.addEventListener('visibilitychange', aoVoltar);
    return () => { window.clearInterval(timer); window.removeEventListener('storage', aoVoltar); document.removeEventListener('visibilitychange', aoVoltar); };
  }, [pessoa.carregado, pessoa.uid, carregar]);

  const itens = useMemo<Item[]>(() => [
    ...bm.map((n) => ({ id: n.id, tipo: 'BM' as const, titulo: n.titulo || `Cartão ${n.cardId}`, detalhe: `${n.numero ? `${n.numero} · ` : ''}${n.mensagem}`, em: n.em, url: n.url || '', lida: !!n.lida, cor: '#7c3aed' })),
    ...prs.map((n) => ({ id: n.id, tipo: 'PR' as const, titulo: `${n.repo} #${n.numero} · ${n.assunto}`, detalhe: n.chamado ? `Chamado ${n.chamado}${n.coluna ? ` · ${n.coluna}` : ''}` : 'PR mesclado', em: n.mescladoEm, url: n.url, lida: n.lida, cor: '#00518C' })),
  ].filter((n) => filtro === 'todas' || n.tipo === filtro).sort((a, b) => Date.parse(b.em) - Date.parse(a.em)), [bm, prs, filtro]);

  const marcarLida = (item: Item) => {
    if (!pessoa.uid) return;
    if (item.tipo === 'PR') {
      const prox = new Set<string>();
      try { (JSON.parse(localStorage.getItem(chavePr(pessoa.uid)) ?? '[]') as string[]).forEach((id) => prox.add(id)); } catch { /* começa vazio */ }
      prox.add(item.id);
      try { localStorage.setItem(chavePr(pessoa.uid), JSON.stringify([...prox].slice(-300))); } catch { /* armazenamento indisponível */ }
      setPrs((atual) => atual.map((n) => n.id === item.id ? { ...n, lida: true } : n));
    } else {
      const prox = bm.map((n) => n.id === item.id ? { ...n, lida: true } : n);
      setBm(prox);
      try { localStorage.setItem(chaveBm(pessoa.uid), JSON.stringify(prox)); } catch { /* armazenamento indisponível */ }
    }
    window.dispatchEvent(new Event('nucleoptu:notifications-updated'));
  };

  if (!pessoa.carregado || !pessoa.uid) return null;
  return <section className="rounded-xl border border-[var(--rel-line)] bg-[var(--rel-surface)] p-4 sm:p-5" aria-label="Minhas notificações">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--rel-text)]"><Bell size={18} className="text-[var(--rel-primary)]"/>Minhas notificações</h2><p className="mt-1 text-sm text-[var(--rel-muted)]">Avisos pessoais do Businessmap e dos PRs mesclados.</p></div><div className="flex gap-2">{(['todas', 'BM', 'PR'] as const).map((tipo) => <button key={tipo} type="button" onClick={() => setFiltro(tipo)} className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${filtro === tipo ? 'border-[var(--rel-primary)] bg-[var(--rel-primary-soft)] text-[var(--rel-primary)]' : 'border-[var(--rel-line)] text-[var(--rel-muted)]'}`}>{tipo === 'todas' ? 'Todas' : tipo}</button>)}</div></div>
    {erro && <p className="mb-2 text-sm text-amber-700">{erro}</p>}
    {!itens.length ? <p className="rounded-lg border border-dashed border-[var(--rel-line)] px-4 py-6 text-center text-sm text-[var(--rel-muted)]">Você não tem notificações de BM ou PR neste momento.</p> : <ul className="divide-y divide-[var(--rel-line)]">{itens.slice(0, 12).map((n) => <li key={`${n.tipo}-${n.id}`} className={`flex flex-wrap items-start justify-between gap-3 py-3 ${n.lida ? '' : 'rounded-md bg-[var(--rel-bg)] px-2'}`}><div className="flex min-w-0 gap-2"><span className="mt-0.5 shrink-0" style={{ color: n.cor }}>{n.tipo === 'BM' ? <Layers3 size={16}/> : <GitPullRequest size={16}/>}</span><div className="min-w-0"><span className="mr-2 rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ color: n.cor, backgroundColor: `${n.cor}18` }}>{n.tipo}</span><span className="text-sm font-medium text-[var(--rel-text)]">{n.titulo}</span><p className="mt-1 text-xs text-[var(--rel-muted)]">{n.detalhe}</p></div></div><div className="flex shrink-0 items-center gap-3">{n.url && <a href={n.url} target="_blank" rel="noreferrer" onClick={() => marcarLida(n)} className="inline-flex items-center gap-1 text-xs text-[var(--rel-primary)] hover:underline">Abrir <ExternalLink size={12}/></a>}{!n.lida && <button type="button" onClick={() => marcarLida(n)} className="text-xs text-[var(--rel-muted)] hover:underline">Marcar como lida</button>}</div></li>)}</ul>}
  </section>;
}
