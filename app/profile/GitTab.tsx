'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, doc, getDocs, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore';
import { ExternalLink, GitPullRequest, Loader2, RefreshCcw, Wand2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { auth, db } from '../../firebase';
import { fotoDoGit } from '../components/fotoGit';
import { SortTh, sortRows, useSort } from '../components/SortableTable';
import type { Chamado } from '../chamados/parse';
import { agrupaPorChamado, chamadoDoTitulo, montaContextoDePrs, type PrGithub, type UsuarioGithub } from '../chamados/github';

interface Dados {
  usuario: UsuarioGithub;
  abertos: PrGithub[];
  fechados: PrGithub[];
  truncado: boolean;
  dias: number;
}

const dataBr = (iso: string) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—');

const estiloEstado: Record<PrGithub['estado'], string> = {
  aberto: 'bg-amber-500/15 text-amber-600',
  mesclado: 'bg-emerald-500/15 text-emerald-600',
  fechado: 'bg-zinc-800 text-zinc-400',
};

function TabelaPrs({ titulo, prs, vazio }: { titulo: string; prs: PrGithub[]; vazio: string }) {
  const { sort, toggleSort } = useSort({ key: 'data', dir: 'desc' });
  const linhas = useMemo(
    () =>
      sortRows(prs, sort, {
        repo: (p) => p.repo,
        numero: (p) => p.numero,
        titulo: (p) => p.titulo,
        chamado: (p) => chamadoDoTitulo(p.titulo) ?? '',
        estado: (p) => p.estado,
        criado: (p) => p.criadoEm,
        data: (p) => p.mescladoEm || p.fechadoEm || p.criadoEm,
      }),
    [prs, sort],
  );
  return (
    <section className="rounded-lg border border-zinc-800">
      <h3 className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2 text-sm font-semibold">
        <GitPullRequest className="h-4 w-4" /> {titulo} <span className="font-normal text-zinc-400">({prs.length})</span>
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-zinc-400">
            <tr>
              <SortTh label="Repositório" k="repo" sort={sort} onSort={toggleSort} />
              <SortTh label="PR" k="numero" sort={sort} onSort={toggleSort} />
              <SortTh label="Chamado" k="chamado" sort={sort} onSort={toggleSort} className="hidden sm:table-cell" />
              <SortTh label="Título" k="titulo" sort={sort} onSort={toggleSort} className="hidden md:table-cell" />
              <SortTh label="Estado" k="estado" sort={sort} onSort={toggleSort} />
              <SortTh label="Criado" k="criado" sort={sort} onSort={toggleSort} className="hidden lg:table-cell" />
              <SortTh label="Fechado/mesclado" k="data" sort={sort} onSort={toggleSort} className="hidden sm:table-cell" />
            </tr>
          </thead>
          <tbody>
            {!linhas.length && <tr><td colSpan={7} className="px-3 py-6 text-center text-zinc-500">{vazio}</td></tr>}
            {linhas.map((p) => (
              <tr key={`${p.repo}#${p.numero}`} className="border-t border-zinc-800">
                <td className="px-3 py-2">{p.repo}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  <a href={p.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky-400 hover:underline">#{p.numero} <ExternalLink className="h-3 w-3" /></a>
                </td>
                <td className="hidden whitespace-nowrap px-3 py-2 font-mono text-zinc-300 sm:table-cell">{chamadoDoTitulo(p.titulo) ?? '—'}</td>
                <td className="hidden max-w-[360px] truncate px-3 py-2 text-zinc-300 md:table-cell" title={p.titulo}>{p.titulo}</td>
                <td className="px-3 py-2"><span className={`rounded px-2 py-0.5 text-xs ${estiloEstado[p.estado]}`}>{p.estado === 'aberto' && p.rascunho ? 'rascunho' : p.estado}</span></td>
                <td className="hidden whitespace-nowrap px-3 py-2 text-zinc-400 lg:table-cell">{dataBr(p.criadoEm)}</td>
                <td className="hidden whitespace-nowrap px-3 py-2 text-zinc-400 sm:table-cell">{dataBr(p.mescladoEm || p.fechadoEm)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function GitTab({ uid, gitUser, onVinculado }: { uid: string; gitUser: string; onVinculado: (login: string) => void }) {
  const [login, setLogin] = useState(gitUser);
  const [dias, setDias] = useState(60);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [dados, setDados] = useState<Dados | null>(null);
  const [gerando, setGerando] = useState(false);
  const [resumo, setResumo] = useState('');

  useEffect(() => setLogin(gitUser), [gitUser]);

  const buscar = useCallback(async (usuario: string, periodo: number): Promise<Dados | null> => {
    setCarregando(true);
    setErro('');
    try {
      // Os tipos do Firebase neste projeto são simplificados (types/firebase.d.ts): getIdToken existe em tempo de execução.
      const token = await (auth.currentUser as unknown as { getIdToken(): Promise<string> } | null)?.getIdToken();
      const r = await fetch(`/api/git/perfil?login=${encodeURIComponent(usuario)}&dias=${periodo}`, { headers: { Authorization: `Bearer ${token ?? ''}` } });
      const j = await r.json();
      if (!r.ok) {
        setErro(j.erro ?? 'Não foi possível consultar o GitHub.');
        return null;
      }
      setDados(j as Dados);
      return j as Dados;
    } catch {
      setErro('Não foi possível consultar o GitHub. Confirme que está acessando pela rede interna.');
      return null;
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    if (gitUser) buscar(gitUser, dias);
  }, [gitUser, dias, buscar]);

  const vincular = async () => {
    const alvo = login.trim().replace(/^@/, '');
    if (!alvo) return setErro('Informe o seu usuário no GitHub.');
    const d = await buscar(alvo, dias);
    if (!d) return;
    try {
      await setDoc(doc(db, 'profiles', uid), { gitUser: d.usuario.login, avatar: fotoDoGit(d.usuario.login, 200), avatarOrigem: 'git' }, { merge: true });
      onVinculado(d.usuario.login);
      toast.success(`Git vinculado: ${d.usuario.login}`);
    } catch (e) {
      console.error(e);
      setErro('O usuário existe no GitHub, mas não foi possível salvar no seu perfil.');
    }
  };

  // Cria os contextos que ainda não existem e atualiza os existentes com os PRs desta pessoa.
  const gerarContextos = async () => {
    if (!dados) return;
    setGerando(true);
    setResumo('');
    try {
      const { grupos, semChamado } = agrupaPorChamado([...dados.abertos, ...dados.fechados]);
      const snap = await getDocs(collection(db, 'chamados'));
      const existentes = new Map(snap.docs.map((d) => [d.id, d.data() as Chamado]));
      const hoje = new Date().toISOString();
      const por = auth.currentUser?.email ?? '';
      const itens = [...grupos].map(([numero, prs]) => montaContextoDePrs(numero, prs, dados.usuario, existentes.get(numero.replace('.', '')) ?? null, hoje));
      for (let i = 0; i < itens.length; i += 20) {
        const lote = writeBatch(db);
        for (const { chamado } of itens.slice(i, i + 20)) lote.set(doc(db, 'chamados', chamado.id), { ...chamado, importadoEm: serverTimestamp(), importadoPor: por, origem: 'github' });
        await lote.commit();
      }
      const novos = itens.filter((i) => i.novo).length;
      setResumo(`${novos} contexto(s) criado(s) e ${itens.length - novos} atualizado(s).${semChamado.length ? ` ${semChamado.length} PR(s) sem número de chamado no título foram ignorados.` : ''}`);
    } catch (e) {
      console.error(e);
      setResumo(`Não foi possível gravar os contextos (${(e as { code?: string })?.code ?? 'erro'}).`);
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-800 p-4">
        <label className="mb-1 block text-sm font-medium text-zinc-300" htmlFor="git-login">Usuário no GitHub</label>
        <div className="flex flex-wrap gap-2">
          <input
            id="git-login"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !carregando && vincular()}
            placeholder="Ex.: GabrielGrechiSolus"
            className="min-w-[220px] flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
          />
          <button onClick={vincular} disabled={carregando || !login.trim()} className="flex items-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-sm font-medium hover:bg-sky-500 disabled:opacity-60">
            {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitPullRequest className="h-4 w-4" />} {gitUser ? 'Atualizar vínculo' : 'Vincular Git'}
          </button>
        </div>
        <p className="mt-1 text-xs text-zinc-500">Traz os seus dados e os PRs da organização, separados em abertos e fechados. O vínculo liga você aos PRs na fila de aplicação.</p>
        {erro && <p className="mt-2 text-sm text-rose-600">{erro}</p>}
      </div>

      {dados && (
        <>
          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-zinc-800 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {dados.usuario.avatar && <img src={dados.usuario.avatar} alt={dados.usuario.login} className="h-14 w-14 rounded-full border border-zinc-700" />}
            <div className="min-w-0 flex-1">
              <div className="text-lg font-semibold">{dados.usuario.nome || dados.usuario.login}</div>
              <a href={dados.usuario.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-sky-400 hover:underline">{dados.usuario.login} <ExternalLink className="h-3 w-3" /></a>
              <div className="text-xs text-zinc-500">{dados.usuario.repositorios ?? 0} repositórios públicos · {dados.usuario.seguidores ?? 0} seguidores</div>
            </div>
            <div className="text-right text-sm text-zinc-300">
              <div><strong>{dados.abertos.length}</strong> abertos</div>
              <div><strong>{dados.fechados.length}</strong> fechados{dados.dias ? ` (últimos ${dados.dias} dias)` : ''}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-zinc-400">
              Período dos PRs fechados
              <select value={dias} onChange={(e) => setDias(Number(e.target.value))} className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100">
                <option value={30}>Últimos 30 dias</option>
                <option value={60}>Últimos 60 dias</option>
                <option value={180}>Últimos 180 dias</option>
                <option value={0}>Todos</option>
              </select>
            </label>
            <button onClick={() => buscar(dados.usuario.login, dias)} disabled={carregando} className="flex items-center gap-2 rounded-md border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900 disabled:opacity-60">
              <RefreshCcw className="h-4 w-4" /> Atualizar PRs
            </button>
            <button onClick={gerarContextos} disabled={gerando} className="flex items-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-sm font-medium hover:bg-sky-500 disabled:opacity-60">
              {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Gerar e atualizar contextos
            </button>
          </div>
          {resumo && <p className="rounded-md border border-sky-700/50 bg-sky-900/20 px-3 py-2 text-sm text-sky-200">{resumo}</p>}
          {dados.truncado && <p className="text-xs text-amber-600">O GitHub tem mais PRs do que o limite de 300 por lista; reduza o período para ver os mais recentes.</p>}

          <TabelaPrs titulo="PRs abertos" prs={dados.abertos} vazio="Nenhum PR aberto." />
          <TabelaPrs titulo="PRs fechados" prs={dados.fechados} vazio="Nenhum PR fechado no período." />
        </>
      )}
    </div>
  );
}
