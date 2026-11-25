'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePessoa } from '../components/usePessoa';
import { tokenDoLogin } from '../chamados/atualizaGit';
import { montaNotificacoes, type NotificacaoPr, type PrMergeado } from '../chamados/prsMergeados';
import type { NotificacaoBm } from '../chamados/bmNotificacoes';

export type NotificacaoPessoal = { id: string; tipo: 'BM' | 'PR'; titulo: string; detalhe: string; em: string; url: string; lida: boolean; cor: string };
const chavePr = (uid: string) => `nucleoptu.prsmergeados.${uid}`;
const chaveBm = (uid: string) => `nucleoptu.bm.notificacoes.${uid}`;

export function useNotificacoesPessoais() {
  const pessoa = usePessoa();
  const [prs, setPrs] = useState<NotificacaoPr[]>([]);
  const [bm, setBm] = useState<NotificacaoBm[]>([]);
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
      } else setPrs([]);
      try { setBm(JSON.parse(localStorage.getItem(chaveBm(pessoa.uid)) ?? '[]') as NotificacaoBm[]); } catch { setBm([]); }
      setErro('');
    } catch { setErro('Não foi possível consultar seus avisos de PR agora.'); }
  }, [pessoa.uid, pessoa.gitUser, pessoa.semGit]);

  useEffect(() => {
    if (!pessoa.carregado || !pessoa.uid) return;
    void carregar();
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void carregar(); }, 5 * 60_000);
    const atualizar = () => { if (document.visibilityState === 'visible') void carregar(); };
    window.addEventListener('storage', atualizar);
    window.addEventListener('nucleoptu:notifications-updated', atualizar);
    document.addEventListener('visibilitychange', atualizar);
    return () => { window.clearInterval(timer); window.removeEventListener('storage', atualizar); window.removeEventListener('nucleoptu:notifications-updated', atualizar); document.removeEventListener('visibilitychange', atualizar); };
  }, [pessoa.carregado, pessoa.uid, carregar]);

  const itens = useMemo<NotificacaoPessoal[]>(() => [
    ...bm.map((n) => ({ id: n.id, tipo: 'BM' as const, titulo: n.titulo || `Cartão ${n.cardId}`, detalhe: `${n.numero ? `${n.numero} · ` : ''}${n.mensagem}`, em: n.em, url: n.url || '', lida: !!n.lida, cor: '#7c3aed' })),
    ...prs.map((n) => ({ id: n.id, tipo: 'PR' as const, titulo: `${n.repo} #${n.numero} · ${n.assunto}`, detalhe: n.chamado ? `Chamado ${n.chamado}${n.coluna ? ` · ${n.coluna}` : ''}` : 'PR mesclado', em: n.mescladoEm, url: n.url, lida: n.lida, cor: '#00518C' })),
  ].sort((a, b) => Date.parse(b.em) - Date.parse(a.em)), [bm, prs]);

  const marcarLida = useCallback((item: NotificacaoPessoal) => {
    if (!pessoa.uid) return;
    if (item.tipo === 'PR') {
      const ids = new Set<string>();
      try { (JSON.parse(localStorage.getItem(chavePr(pessoa.uid)) ?? '[]') as string[]).forEach((id) => ids.add(id)); } catch { /* começa vazio */ }
      ids.add(item.id);
      try { localStorage.setItem(chavePr(pessoa.uid), JSON.stringify([...ids].slice(-300))); } catch { /* armazenamento indisponível */ }
      setPrs((atual) => atual.map((n) => n.id === item.id ? { ...n, lida: true } : n));
    } else {
      const prox = bm.map((n) => n.id === item.id ? { ...n, lida: true } : n);
      setBm(prox);
      try { localStorage.setItem(chaveBm(pessoa.uid), JSON.stringify(prox)); } catch { /* armazenamento indisponível */ }
    }
    window.dispatchEvent(new Event('nucleoptu:notifications-updated'));
  }, [pessoa.uid, bm]);

  return { itens, erro, carregado: pessoa.carregado && !!pessoa.uid, marcarLida };
}
