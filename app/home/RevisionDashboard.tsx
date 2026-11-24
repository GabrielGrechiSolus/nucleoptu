'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { ChevronDown, ChevronRight, GitPullRequest, Search, Tag } from 'lucide-react';
import { db } from '../../firebase';
import type { Chamado } from '../chamados/parse';
import { tokenDoLogin } from '../chamados/atualizaGit';

type Revision = { numero: number; tags: { repo: string; tag: string; data: string }[] };
type PrLinha = { id: string; numero: string; cliente: string; assunto: string; repo: string; pr: string; url: string };

export default function RevisionDashboard() {
  const [revisoes, setRevisoes] = useState<Revision[]>([]);
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [aberta, setAberta] = useState<number | null>(null);
  const [mostrarMais, setMostrarMais] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroRepo, setFiltroRepo] = useState('todos');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      setCarregando(true);
      try {
        const token = await tokenDoLogin();
        const [resposta, snap] = await Promise.all([
          fetch('/api/git/revisoes', { headers: { Authorization: `Bearer ${token}` } }),
          getDocs(collection(db, 'chamados')),
        ]);
        const dados = await resposta.json();
        if (!resposta.ok) throw new Error(dados.erro ?? 'Não foi possível carregar as revisions da Qualidade.');
        if (!ativo) return;
        setRevisoes((dados.revisoes ?? []) as Revision[]);
        setChamados(snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Chamado));
        setErro('');
      } catch (e) {
        if (ativo) setErro(e instanceof Error ? e.message : 'Falha ao carregar revisions.');
      } finally {
        if (ativo) setCarregando(false);
      }
    };
    void carregar();
    return () => { ativo = false; };
  }, []);

  const porRevision = useMemo(() => {
    const mapa = new Map<number, PrLinha[]>();
    for (const c of chamados) {
      const numeroRevision = Number(String(c.revision ?? '').match(/\d+/)?.[0]);
      if (!numeroRevision) continue;
      const lista = mapa.get(numeroRevision) ?? [];
      for (const pr of c.prs ?? []) {
        const repo = pr.repo ?? 'banco';
        lista.push({ id: `${c.id}-${repo}-${pr.numero}`, numero: c.numero, cliente: c.cliente, assunto: c.assunto, repo, pr: pr.numero, url: pr.url || `https://github.com/solussaude/${repo}/pull/${pr.numero}` });
      }
      mapa.set(numeroRevision, lista);
    }
    return mapa;
  }, [chamados]);

  const listaAberta = aberta === null ? [] : (porRevision.get(aberta) ?? []).filter((p) => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    const corresponde = !termo || `${p.numero} ${p.cliente} ${p.assunto} ${p.repo} ${p.pr}`.toLocaleLowerCase('pt-BR').includes(termo);
    return corresponde && (filtroRepo === 'todos' || p.repo === filtroRepo);
  });
  const repos = aberta === null ? [] : [...new Set((porRevision.get(aberta) ?? []).map((p) => p.repo))].sort();
  const revisoesVisiveis = mostrarMais ? revisoes : revisoes.slice(0, 1);

  return (
    <section className="mb-8 rounded-2xl border border-slate-700 bg-slate-900/70 p-5 text-white shadow-lg">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sky-300"><Tag size={18} /><span className="text-sm font-semibold">Revisions publicadas</span></div>
          <p className="mt-1 text-sm text-slate-400">Origem: API da Qualidade. Selecione uma revision para consultar os PRs vinculados.</p>
        </div>
        {revisoes[0] && <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2"><span className="text-xs text-emerald-200">Última revision</span><div className="text-2xl font-bold text-white">{revisoes[0].numero}</div></div>}
      </div>
      {erro && <p className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">{erro}</p>}
      {carregando ? <p className="text-sm text-slate-400">Carregando revisions…</p> : !revisoes.length ? <p className="text-sm text-slate-400">Nenhuma revision publicada foi retornada pela API.</p> : (
        <div className="space-y-2">
          {revisoesVisiveis.map((r) => {
            const expandida = aberta === r.numero;
            const prs = porRevision.get(r.numero) ?? [];
            return <div key={r.numero} className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800/50">
              <button type="button" onClick={() => { setAberta(expandida ? null : r.numero); setBusca(''); setFiltroRepo('todos'); }} aria-expanded={expandida} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-700/50">
                <span className="flex min-w-0 items-center gap-3">{expandida ? <ChevronDown size={18} /> : <ChevronRight size={18} />}<span className="font-semibold">Revision {r.numero}</span>{r.numero === revisoes[0].numero && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-300">Mais recente</span>}<span className="truncate text-xs text-slate-400">{[...new Set(r.tags.map((t) => t.repo))].join(', ')}</span></span>
                <span className="shrink-0 text-xs text-slate-300">{prs.length} PR(s)</span>
              </button>
              {expandida && <div className="border-t border-slate-700 p-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  <label className="relative min-w-[220px] flex-1"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar chamado, cliente, PR ou assunto" className="w-full rounded-lg border border-slate-600 bg-slate-900 py-2 pl-9 pr-3 text-sm text-white placeholder:text-slate-500"/></label>
                  <select value={filtroRepo} onChange={(e) => setFiltroRepo(e.target.value)} className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"><option value="todos">Todos os repositórios</option>{repos.map((repo) => <option key={repo} value={repo}>{repo}</option>)}</select>
                </div>
                {!listaAberta.length ? <p className="py-3 text-sm text-slate-400">Nenhum PR encontrado para esta revision com os filtros atuais.</p> : <ul className="divide-y divide-slate-700">{listaAberta.map((p) => <li key={p.id} className="flex flex-wrap items-start justify-between gap-2 py-3"><div className="flex min-w-0 gap-2"><GitPullRequest size={16} className="mt-0.5 shrink-0 text-sky-300"/><div><div className="text-sm font-medium">{p.numero} · {p.cliente} — {p.assunto}</div><div className="text-xs text-slate-400">{p.repo} #{p.pr}</div></div></div><a href={p.url} target="_blank" rel="noreferrer" className="text-xs text-sky-300 hover:underline">Abrir PR</a></li>)}</ul>}
              </div>}
            </div>;
          })}
          {revisoes.length > 1 && <button type="button" onClick={() => { setMostrarMais((v) => !v); setAberta(null); }} className="rounded-lg border border-slate-600 px-4 py-2 text-sm font-medium text-sky-300 hover:border-sky-400 hover:bg-slate-800">{mostrarMais ? 'Mostrar menos' : 'Mostrar mais'}</button>}
        </div>
      )}
    </section>
  );
}
