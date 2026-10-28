'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import withAuth from '../components/withAuth';
import { collection, doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { FolderSearch, Search, Upload, RefreshCcw, X, ExternalLink, GitPullRequest, FlaskConical, ClipboardList } from 'lucide-react';
import { Chamado, lerPasta } from './parse';

type Tri = 'todos' | 'sim' | 'nao';
type Ordem = 'numero' | 'atualizado';

const COLECAO = 'chamados';

const dataParaNumero = (d: string) => {
  const m = d.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? Number(`${m[3]}${m[2]}${m[1]}`) : 0;
};

const passa = (v: boolean, f: Tri) => f === 'todos' || (f === 'sim' ? v : !v);

function Selo({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs ${ok ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-800 text-zinc-500'}`}>
      {label}
    </span>
  );
}

function FiltroTri({ rotulo, valor, onChange }: { rotulo: string; valor: Tri; onChange: (v: Tri) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-400">
      {rotulo}
      <select
        value={valor}
        onChange={(e) => onChange(e.target.value as Tri)}
        className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100"
      >
        <option value="todos">Todos</option>
        <option value="sim">Sim</option>
        <option value="nao">Não</option>
      </select>
    </label>
  );
}

function ChamadosPage() {
  const [itens, setItens] = useState<Chamado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [noConteudo, setNoConteudo] = useState(false);
  const [fPr, setFPr] = useState<Tri>('todos');
  const [fEvid, setFEvid] = useState<Tri>('todos');
  const [fPlano, setFPlano] = useState<Tri>('todos');
  const [fBm, setFBm] = useState<Tri>('todos');
  const [fCliente, setFCliente] = useState('');
  const [fRevision, setFRevision] = useState('');
  const [ordem, setOrdem] = useState<Ordem>('numero');
  const [aberto, setAberto] = useState<Chamado | null>(null);
  const [aba, setAba] = useState('');
  const [previa, setPrevia] = useState<Chamado[] | null>(null);
  const [gravando, setGravando] = useState(false);
  const [msg, setMsg] = useState('');
  const pastaRef = useRef<HTMLInputElement>(null);
  const [caminho, setCaminho] = useState('C:/RepositorioGit/chatgpt/chamados');
  const [lendo, setLendo] = useState(false);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem('chamados-caminho');
      if (salvo) setCaminho(salvo);
    } catch {}
  }, []);

  const lerDoCaminho = async () => {
    setMsg('');
    setLendo(true);
    try {
      const r = await fetch('/api/chamados/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caminho }),
      });
      const j = await r.json();
      if (!r.ok) {
        setMsg(j.erro ?? 'Não foi possível ler a pasta.');
        return;
      }
      if (!j.chamados.length) {
        setMsg('Nenhum chamado encontrado nessa pasta.');
        return;
      }
      try {
        localStorage.setItem('chamados-caminho', caminho);
      } catch {}
      setPrevia(j.chamados as Chamado[]);
    } catch {
      setMsg('Não foi possível ler a pasta. Confirme que o sistema está rodando na sua máquina.');
    } finally {
      setLendo(false);
    }
  };

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const snap = await getDocs(collection(db, COLECAO));
      setItens(snap.docs.map((d) => d.data() as Chamado));
    } catch (e) {
      console.error(e);
      const codigo = (e as { code?: string })?.code ?? 'erro desconhecido';
      setErro(`Não foi possível carregar os chamados do Firestore (${codigo}).${codigo === 'permission-denied' ? ' As regras do Firestore não permitem ler a coleção chamados.' : ''}`);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const aoEscolherPasta = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivos = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!arquivos.length) return;
    setMsg('');
    const lidos = await lerPasta(arquivos);
    if (!lidos.length) {
      setMsg('Nenhum chamado encontrado. Escolha a pasta chatgpt/chamados (ou a pasta de um chamado).');
      return;
    }
    setPrevia(lidos);
  };

  const gravar = async () => {
    if (!previa) return;
    setGravando(true);
    try {
      const por = auth.currentUser?.email ?? '';
      for (let i = 0; i < previa.length; i += 20) {
        const lote = writeBatch(db);
        for (const c of previa.slice(i, i + 20)) {
          lote.set(doc(db, COLECAO, c.id), { ...c, importadoEm: serverTimestamp(), importadoPor: por });
        }
        await lote.commit();
      }
      setMsg(`${previa.length} chamado(s) importado(s). Quem já existia foi atualizado.`);
      setPrevia(null);
      await carregar();
    } catch (e) {
      console.error(e);
      const codigo = (e as { code?: string })?.code ?? 'erro desconhecido';
      setItens((atual) => [...previa, ...atual.filter((i) => !previa.some((p) => p.id === i.id))]);
      setPrevia(null);
      setMsg(`Não foi possível gravar no Firestore (${codigo}${codigo === 'permission-denied' ? ': as regras não permitem escrever na coleção chamados' : ''}). Os chamados lidos estão exibidos abaixo, mas não foram salvos e somem ao atualizar a página.`);
    } finally {
      setGravando(false);
    }
  };

  const clientes = useMemo(() => [...new Set(itens.map((i) => i.cliente).filter(Boolean))].sort(), [itens]);
  const revisions = useMemo(() => [...new Set(itens.map((i) => i.revision).filter(Boolean))].sort().reverse(), [itens]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const lista = itens.filter((c) => {
      if (!passa(c.temPr, fPr) || !passa(c.temEvidencia, fEvid) || !passa(c.temPlano, fPlano) || !passa(c.temBm, fBm)) return false;
      if (fCliente && c.cliente !== fCliente) return false;
      if (fRevision && c.revision !== fRevision) return false;
      if (!q) return true;
      const cabecalho = [c.numero, c.id, c.cliente, c.assunto, c.resumo, c.status, ...c.prs.map((p) => p.numero), ...c.branches]
        .join(' ')
        .toLowerCase();
      if (cabecalho.includes(q)) return true;
      return noConteudo && Object.values(c.docs ?? {}).some((t) => t.toLowerCase().includes(q));
    });
    return lista.sort((a, b) =>
      ordem === 'numero' ? b.id.localeCompare(a.id) : dataParaNumero(b.atualizadoEm) - dataParaNumero(a.atualizadoEm) || b.id.localeCompare(a.id),
    );
  }, [itens, busca, noConteudo, fPr, fEvid, fPlano, fBm, fCliente, fRevision, ordem]);

  const limpar = () => {
    setBusca('');
    setFPr('todos');
    setFEvid('todos');
    setFPlano('todos');
    setFBm('todos');
    setFCliente('');
    setFRevision('');
  };

  const abrir = (c: Chamado) => {
    setAberto(c);
    setAba(Object.keys(c.docs ?? {})[0] ?? '');
  };

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FolderSearch className="h-7 w-7 text-sky-400" />
          <div>
            <h1 className="text-2xl font-bold">Contexto de chamados</h1>
            <p className="text-sm text-zinc-400">Contexto, PRs, evidências e plano de testes de cada chamado.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={carregar} className="flex items-center gap-2 rounded-md border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900">
            <RefreshCcw className="h-4 w-4" /> Atualizar
          </button>
          <button
            onClick={() => pastaRef.current?.click()}
            className="flex items-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-sm font-medium hover:bg-sky-500"
          >
            <Upload className="h-4 w-4" /> Importar contextos
          </button>
          <input
            ref={pastaRef}
            type="file"
            className="hidden"
            onChange={aoEscolherPasta}
            // @ts-expect-error webkitdirectory não está nos tipos do React
            webkitdirectory=""
            multiple
          />
        </div>
      </header>

      {msg && <div className="mb-4 rounded-md border border-sky-700/50 bg-sky-900/20 px-3 py-2 text-sm text-sky-200">{msg}</div>}
      {erro && <div className="mb-4 rounded-md border border-rose-700/50 bg-rose-900/20 px-3 py-2 text-sm text-rose-200">{erro}</div>}

      <section className="mb-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Pasta dos contextos (caminho no computador onde o sistema está rodando)
          <div className="flex gap-2">
            <input
              value={caminho}
              onChange={(e) => setCaminho(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !lendo && lerDoCaminho()}
              placeholder="C:/RepositorioGit/chatgpt/chamados"
              className="flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100"
            />
            <button
              onClick={lerDoCaminho}
              disabled={lendo || !caminho.trim()}
              className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium hover:bg-sky-500 disabled:opacity-60"
            >
              {lendo ? 'Lendo...' : 'Ler pasta'}
            </button>
          </div>
        </label>
      </section>

      <section className="mb-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[260px] flex-1 flex-col gap-1 text-xs text-zinc-400">
            Pesquisar
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Chamado, cliente, assunto, número do PR, branch..."
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 py-2 pl-8 pr-3 text-sm text-zinc-100"
              />
            </div>
          </label>
          <FiltroTri rotulo="Tem PR" valor={fPr} onChange={setFPr} />
          <FiltroTri rotulo="Evidência de testes" valor={fEvid} onChange={setFEvid} />
          <FiltroTri rotulo="Plano de testes" valor={fPlano} onChange={setFPlano} />
          <FiltroTri rotulo="Tem BM" valor={fBm} onChange={setFBm} />
          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            Cliente
            <select value={fCliente} onChange={(e) => setFCliente(e.target.value)} className="max-w-[200px] rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100">
              <option value="">Todos</option>
              {clientes.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            Revision
            <select value={fRevision} onChange={(e) => setFRevision(e.target.value)} className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100">
              <option value="">Todas</option>
              {revisions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            Ordenar por
            <select value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100">
              <option value="numero">Número do chamado</option>
              <option value="atualizado">Última atualização</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={noConteudo} onChange={(e) => setNoConteudo(e.target.checked)} />
            Pesquisar também dentro dos documentos (mais lento)
          </label>
          <span>
            {filtrados.length} de {itens.length} chamado(s){' '}
            <button onClick={limpar} className="ml-2 text-sky-400 hover:underline">limpar filtros</button>
          </span>
        </div>
      </section>

      <section className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900 text-xs uppercase text-zinc-400">
            <tr>
              <th className="px-3 py-2">Chamado</th>
              <th className="px-3 py-2">Cliente / assunto</th>
              <th className="px-3 py-2">PRs</th>
              <th className="px-3 py-2">Evidência</th>
              <th className="px-3 py-2">Plano</th>
              <th className="px-3 py-2">Revision</th>
              <th className="px-3 py-2">Atualizado</th>
            </tr>
          </thead>
          <tbody>
            {carregando && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-zinc-500">Carregando...</td></tr>
            )}
            {!carregando && !filtrados.length && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-zinc-500">
                  {itens.length ? 'Nenhum chamado com esses filtros.' : 'Nenhum contexto importado ainda. Use “Importar contextos”.'}
                </td>
              </tr>
            )}
            {filtrados.map((c) => (
              <tr key={c.id} onClick={() => abrir(c)} className="cursor-pointer border-t border-zinc-800 hover:bg-zinc-900/60">
                <td className="whitespace-nowrap px-3 py-2 font-mono text-sky-300">{c.numero}</td>
                <td className="px-3 py-2">
                  <div className="font-medium">{c.cliente || '—'}</div>
                  <div className="text-xs text-zinc-400">{c.assunto}</div>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {c.prs.length ? c.prs.slice(0, 4).map((p) => (
                      <span key={p.numero} className="rounded bg-violet-500/15 px-1.5 py-0.5 text-xs text-violet-300">
                        {p.repo ? `${p.repo} ` : ''}#{p.numero}
                      </span>
                    )) : <span className="text-xs text-zinc-600">—</span>}
                    {c.prs.length > 4 && <span className="text-xs text-zinc-500">+{c.prs.length - 4}</span>}
                  </div>
                </td>
                <td className="px-3 py-2"><Selo ok={c.temEvidencia} label={c.temEvidencia ? 'Sim' : 'Não'} /></td>
                <td className="px-3 py-2"><Selo ok={c.temPlano} label={c.temPlano ? 'Sim' : 'Não'} /></td>
                <td className="px-3 py-2 text-zinc-300">{c.revision || '—'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-zinc-400">{c.atualizadoEm || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {previa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-950 p-5">
            <h2 className="mb-1 text-lg font-semibold">Importar {previa.length} chamado(s)</h2>
            <p className="mb-3 text-sm text-zinc-400">
              Chamados que já existem serão atualizados com o conteúdo atual das pastas. Nada é apagado.
            </p>
            <ul className="mb-4 max-h-64 overflow-y-auto rounded border border-zinc-800 text-sm">
              {previa.map((c) => (
                <li key={c.id} className="flex justify-between gap-3 border-b border-zinc-800 px-3 py-1.5 last:border-0">
                  <span><span className="font-mono text-sky-300">{c.numero}</span> {c.cliente} — {c.assunto}</span>
                  <span className="whitespace-nowrap text-xs text-zinc-500">
                    {itens.some((i) => i.id === c.id) ? 'atualiza' : 'novo'}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPrevia(null)} disabled={gravando} className="rounded-md border border-zinc-700 px-3 py-2 text-sm">Cancelar</button>
              <button onClick={gravar} disabled={gravando} className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium disabled:opacity-60">
                {gravando ? 'Gravando...' : 'Gravar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {aberto && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/60" onClick={() => setAberto(null)}>
          <aside className="h-full w-full max-w-3xl overflow-y-auto border-l border-zinc-700 bg-zinc-950 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-sky-300">{aberto.numero}</div>
                <h2 className="text-xl font-semibold">{aberto.cliente || '—'}</h2>
                <p className="text-sm text-zinc-400">{aberto.assunto}</p>
              </div>
              <button onClick={() => setAberto(null)} className="rounded p-1 hover:bg-zinc-800"><X className="h-5 w-5" /></button>
            </div>

            <dl className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-xs text-zinc-500">Revision do cliente</dt><dd>{aberto.revision || '—'}</dd></div>
              <div><dt className="text-xs text-zinc-500">Atualizado</dt><dd>{aberto.atualizadoEm || '—'}</dd></div>
              {aberto.status && <div className="col-span-2"><dt className="text-xs text-zinc-500">Situação registrada</dt><dd>{aberto.status}</dd></div>}
              {aberto.resumo && <div className="col-span-2"><dt className="text-xs text-zinc-500">Resumo</dt><dd className="text-zinc-300">{aberto.resumo}</dd></div>}
            </dl>

            <div className="mb-4 space-y-3 text-sm">
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs text-zinc-500"><GitPullRequest className="h-4 w-4" /> PRs</div>
                <div className="flex flex-wrap gap-2">
                  {aberto.prs.length ? aberto.prs.map((p) =>
                    p.url ? (
                      <a key={p.numero} href={p.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded bg-violet-500/15 px-2 py-1 text-violet-300 hover:underline">
                        {p.repo} #{p.numero} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span key={p.numero} className="rounded bg-zinc-800 px-2 py-1 text-zinc-300">#{p.numero} (citado)</span>
                    )) : <span className="text-zinc-600">Nenhum PR citado.</span>}
                </div>
                {aberto.branches.length > 0 && (
                  <div className="mt-2 space-y-0.5 font-mono text-xs text-zinc-400">
                    {aberto.branches.map((b) => <div key={b}>{b}</div>)}
                  </div>
                )}
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs text-zinc-500"><FlaskConical className="h-4 w-4" /> Evidência de testes</div>
                {aberto.evidencias.length ? aberto.evidencias.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="mr-3 inline-flex items-center gap-1 text-sky-400 hover:underline">{l.texto} <ExternalLink className="h-3 w-3" /></a>
                )) : <span className="text-zinc-600">{aberto.temEvidencia ? 'Há arquivo de evidência nas pastas, sem link.' : 'Sem link de evidência.'}</span>}
              </div>
              <div>
                <div className="mb-1 flex items-center gap-2 text-xs text-zinc-500"><ClipboardList className="h-4 w-4" /> Plano de testes</div>
                {aberto.planosTeste.length ? aberto.planosTeste.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="mr-3 inline-flex items-center gap-1 text-sky-400 hover:underline">{l.texto} <ExternalLink className="h-3 w-3" /></a>
                )) : <span className="text-zinc-600">{aberto.temPlano ? 'Há plano de testes nos documentos, sem link.' : 'Sem plano de testes registrado.'}</span>}
              </div>
            </div>

            <div className="mb-2 flex flex-wrap gap-1 border-b border-zinc-800">
              {Object.keys(aberto.docs ?? {}).map((n) => (
                <button key={n} onClick={() => setAba(n)} className={`rounded-t px-3 py-1.5 text-xs ${aba === n ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}>{n.replace(/\.md$/i, '')}</button>
              ))}
            </div>
            <pre className="whitespace-pre-wrap break-words rounded bg-zinc-900 p-3 text-xs leading-relaxed text-zinc-200">{aberto.docs?.[aba] ?? ''}</pre>
          </aside>
        </div>
      )}
    </div>
  );
}

export default withAuth(ChamadosPage);
