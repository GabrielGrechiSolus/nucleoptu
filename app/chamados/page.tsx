'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import withAuth from '../components/withAuth';
import { collection, doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { FolderSearch, Search, Upload, RefreshCcw, X, ExternalLink, GitPullRequest, FlaskConical, ClipboardList, FileText, Copy } from 'lucide-react';
import { Chamado, lerPasta, ROTULO_SITUACAO, ROTULO_TIPO } from './parse';
import { CAMPOS_REGRA, MODELO_REGRA } from './modelo';
import { SortTh, sortRows, useSort } from '../components/SortableTable';

type Tri = 'todos' | 'sim' | 'nao';
type Aba = 'todos' | 'em-correcao' | 'corrigidos' | 'regras';

const COLECAO = 'chamados';

const passa = (v: boolean, f: Tri) => f === 'todos' || (f === 'sim' ? v : !v);

const dataParaNumero = (d: string) => {
  const m = d.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? Number(`${m[3]}${m[2]}${m[1]}`) : 0;
};

const formataIso = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '');

const estiloSituacao: Record<string, string> = {
  'em-correcao': 'bg-amber-500/15 text-amber-600',
  corrigido: 'bg-emerald-500/15 text-emerald-600',
  encerrado: 'bg-zinc-800 text-zinc-400',
};

function Selo({ ok }: { ok: boolean }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-xs ${ok ? 'bg-emerald-500/15 text-emerald-600' : 'bg-zinc-800 text-zinc-500'}`}>
      {ok ? 'Sim' : 'Não'}
    </span>
  );
}

function FiltroTri({ rotulo, valor, onChange }: { rotulo: string; valor: Tri; onChange: (v: Tri) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-zinc-400">
      {rotulo}
      <select value={valor} onChange={(e) => onChange(e.target.value as Tri)} className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100">
        <option value="todos">Todos</option>
        <option value="sim">Sim</option>
        <option value="nao">Não</option>
      </select>
    </label>
  );
}

// Renderização mínima de markdown (títulos, listas e negrito) para o REGRA.md.
function Md({ texto }: { texto: string }) {
  const blocos: React.ReactNode[] = [];
  let lista: string[] = [];
  const negrito = (t: string) =>
    t.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <React.Fragment key={i}>{p}</React.Fragment>));
  const fechaLista = () => {
    if (lista.length) {
      blocos.push(
        <ul key={`ul${blocos.length}`} className="ml-5 list-disc space-y-1 text-sm text-zinc-200">
          {lista.map((l, i) => <li key={i}>{negrito(l)}</li>)}
        </ul>,
      );
      lista = [];
    }
  };
  for (const linha of texto.split('\n')) {
    const t = linha.trim();
    if (/^#{1,6}\s/.test(t)) {
      fechaLista();
      blocos.push(<h3 key={`h${blocos.length}`} className="mt-4 text-base font-semibold text-[#00518C]">{t.replace(/^#{1,6}\s+/, '')}</h3>);
    } else if (/^[-*]\s+/.test(t)) {
      lista.push(t.replace(/^[-*]\s+/, ''));
    } else if (t) {
      fechaLista();
      blocos.push(<p key={`p${blocos.length}`} className="text-sm leading-relaxed text-zinc-200">{negrito(t)}</p>);
    } else {
      fechaLista();
    }
  }
  fechaLista();
  return <div className="space-y-2">{blocos}</div>;
}

function ChamadosPage() {
  const [itens, setItens] = useState<Chamado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [noConteudo, setNoConteudo] = useState(false);
  const [aba, setAba] = useState<Aba>('todos');
  const [fPr, setFPr] = useState<Tri>('todos');
  const [fEvid, setFEvid] = useState<Tri>('todos');
  const [fPlano, setFPlano] = useState<Tri>('todos');
  const [fRegra, setFRegra] = useState<Tri>('todos');
  const [fCliente, setFCliente] = useState('');
  const [fModulo, setFModulo] = useState('');
  const [fRevision, setFRevision] = useState('');
  const [aberto, setAberto] = useState<Chamado | null>(null);
  const [docAberto, setDocAberto] = useState('');
  const [previa, setPrevia] = useState<Chamado[] | null>(null);
  const [gravando, setGravando] = useState(false);
  const [msg, setMsg] = useState('');
  const [mostraModelo, setMostraModelo] = useState(false);
  const [mostraImportar, setMostraImportar] = useState(false);
  const pastaRef = useRef<HTMLInputElement>(null);
  const [caminho, setCaminho] = useState('C:/RepositorioGit/chatgpt/chamados');
  const [lendo, setLendo] = useState(false);
  const { sort, toggleSort } = useSort({ key: 'publicado', dir: 'desc' });

  useEffect(() => {
    try {
      const salvo = localStorage.getItem('chamados-caminho');
      if (salvo) setCaminho(salvo);
    } catch {}
  }, []);

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
      setMsg('Nenhum chamado encontrado. Escolha a pasta que contém as pastas dos chamados (ou a pasta de um chamado).');
      return;
    }
    setPrevia(lidos);
  };

  const lerDoCaminho = async () => {
    setMsg('');
    setLendo(true);
    try {
      const r = await fetch('/api/chamados/importar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caminho }) });
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
      setMsg('Não foi possível ler a pasta. A leitura por caminho só funciona com o sistema rodando na sua máquina.');
    } finally {
      setLendo(false);
    }
  };

  const gravar = async () => {
    if (!previa) return;
    setGravando(true);
    try {
      const por = auth.currentUser?.email ?? '';
      for (let i = 0; i < previa.length; i += 20) {
        const lote = writeBatch(db);
        for (const c of previa.slice(i, i + 20)) lote.set(doc(db, COLECAO, c.id), { ...c, importadoEm: serverTimestamp(), importadoPor: por });
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
  const modulos = useMemo(() => [...new Set(itens.map((i) => i.modulo).filter(Boolean))].sort(), [itens]);
  const revisions = useMemo(() => [...new Set(itens.map((i) => i.revision).filter(Boolean))].sort().reverse(), [itens]);

  const contagem = useMemo(
    () => ({
      todos: itens.length,
      'em-correcao': itens.filter((c) => c.situacao === 'em-correcao').length,
      corrigidos: itens.filter((c) => c.situacao === 'corrigido').length,
      regras: itens.filter((c) => c.tipo === 'regra' || c.tipo === 'orientacao').length,
    }),
    [itens],
  );

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const lista = itens.filter((c) => {
      if (aba === 'em-correcao' && c.situacao !== 'em-correcao') return false;
      if (aba === 'corrigidos' && c.situacao !== 'corrigido') return false;
      if (aba === 'regras' && c.tipo !== 'regra' && c.tipo !== 'orientacao') return false;
      if (!passa(c.temPr, fPr) || !passa(c.temEvidencia, fEvid) || !passa(c.temPlano, fPlano) || !passa(!!c.temRegra, fRegra)) return false;
      if (fCliente && c.cliente !== fCliente) return false;
      if (fModulo && c.modulo !== fModulo) return false;
      if (fRevision && c.revision !== fRevision) return false;
      if (!q) return true;
      const cabecalho = [c.numero, c.id, c.cliente, c.assunto, c.resumo, c.status, c.modulo, c.caminhoTela, c.revision, ...c.prs.map((p) => p.numero), ...c.branches].join(' ').toLowerCase();
      if (cabecalho.includes(q)) return true;
      return noConteudo && Object.values(c.docs ?? {}).some((t) => t.toLowerCase().includes(q));
    });
    return sortRows(lista, sort, {
      numero: (c) => c.id,
      assunto: (c) => c.assunto,
      tipo: (c) => ROTULO_TIPO[c.tipo ?? ''] === '—' ? '' : ROTULO_TIPO[c.tipo ?? ''],
      situacao: (c) => (c.situacao ? ROTULO_SITUACAO[c.situacao] : ''),
      modulo: (c) => c.modulo,
      revision: (c) => c.revision,
      publicado: (c) => c.publicadoEm || '',
      prs: (c) => c.prs.length,
      evidencia: (c) => c.temEvidencia,
      plano: (c) => c.temPlano,
      atualizado: (c) => dataParaNumero(c.atualizadoEm),
    });
  }, [itens, busca, noConteudo, aba, fPr, fEvid, fPlano, fRegra, fCliente, fModulo, fRevision, sort]);

  const limpar = () => {
    setBusca('');
    setFPr('todos');
    setFEvid('todos');
    setFPlano('todos');
    setFRegra('todos');
    setFCliente('');
    setFModulo('');
    setFRevision('');
    setAba('todos');
  };

  const abrir = (c: Chamado) => {
    setAberto(c);
    setDocAberto(Object.keys(c.docs ?? {})[0] ?? '');
  };

  const copiarModelo = async () => {
    try {
      await navigator.clipboard.writeText(MODELO_REGRA);
      setMsg('Modelo copiado. Salve como REGRA.md na pasta do chamado.');
    } catch {
      setMsg('Não foi possível copiar automaticamente; selecione o texto do modelo e copie.');
    }
  };

  const abas: { id: Aba; rotulo: string }[] = [
    { id: 'todos', rotulo: 'Todos' },
    { id: 'em-correcao', rotulo: 'Em correção' },
    { id: 'corrigidos', rotulo: 'Corrigidos' },
    { id: 'regras', rotulo: 'Regras e orientações' },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <FolderSearch className="h-7 w-7 text-sky-400" />
          <div>
            <h1 className="text-2xl font-bold">Contexto de chamados</h1>
            <p className="text-sm text-zinc-400">O que está em correção, o que já foi corrigido (e em qual revision saiu) e as regras que estavam escondidas.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setMostraModelo(true)} className="flex items-center gap-2 rounded-md border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900">
            <FileText className="h-4 w-4" /> Modelo de contexto
          </button>
          <button onClick={carregar} className="flex items-center gap-2 rounded-md border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900">
            <RefreshCcw className="h-4 w-4" /> Atualizar
          </button>
          <button onClick={() => setMostraImportar((v) => !v)} className="flex items-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-sm font-medium hover:bg-sky-500">
            <Upload className="h-4 w-4" /> Importar contextos
          </button>
        </div>
      </header>

      {msg && <div className="mb-4 rounded-md border border-sky-700/50 bg-sky-900/20 px-3 py-2 text-sm text-sky-200">{msg}</div>}
      {erro && <div className="mb-4 rounded-md border border-rose-700/50 bg-rose-900/20 px-3 py-2 text-sm text-rose-200">{erro}</div>}

      {mostraImportar && (
        <section className="mb-4 space-y-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <div>
            <div className="mb-1 text-xs text-zinc-400">Escolher a pasta no computador (a que contém as pastas dos chamados)</div>
            <button onClick={() => pastaRef.current?.click()} className="rounded-md border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900">
              Escolher pasta...
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
          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            Ou informar o caminho (somente com o sistema rodando na sua máquina)
            <div className="flex flex-wrap gap-2">
              <input
                value={caminho}
                onChange={(e) => setCaminho(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !lendo && lerDoCaminho()}
                placeholder="C:/RepositorioGit/chatgpt/chamados"
                className="min-w-[240px] flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100"
              />
              <button onClick={lerDoCaminho} disabled={lendo || !caminho.trim()} className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium hover:bg-sky-500 disabled:opacity-60">
                {lendo ? 'Lendo...' : 'Ler pasta'}
              </button>
            </div>
          </label>
        </section>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        {abas.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`rounded-full border px-3 py-1.5 text-sm ${aba === a.id ? 'border-[#00518C] bg-[#00518C] text-white' : 'border-zinc-700 text-zinc-300 hover:bg-zinc-900'}`}
          >
            {a.rotulo} <span className="opacity-75">({contagem[a.id]})</span>
          </button>
        ))}
      </div>

      <section className="mb-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-xs text-zinc-400">
            Pesquisar
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Chamado, cliente, assunto, módulo, revision, PR..."
                className="w-full rounded-md border border-zinc-700 bg-zinc-900 py-2 pl-8 pr-3 text-sm text-zinc-100"
              />
            </div>
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            Módulo
            <select value={fModulo} onChange={(e) => setFModulo(e.target.value)} className="max-w-[180px] rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100">
              <option value="">Todos</option>
              {modulos.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            Cliente
            <select value={fCliente} onChange={(e) => setFCliente(e.target.value)} className="max-w-[180px] rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100">
              <option value="">Todos</option>
              {clientes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            Revision
            <select value={fRevision} onChange={(e) => setFRevision(e.target.value)} className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100">
              <option value="">Todas</option>
              {revisions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <FiltroTri rotulo="Tem PR" valor={fPr} onChange={setFPr} />
          <FiltroTri rotulo="Evidência" valor={fEvid} onChange={setFEvid} />
          <FiltroTri rotulo="Plano de testes" valor={fPlano} onChange={setFPlano} />
          <FiltroTri rotulo="Tem REGRA.md" valor={fRegra} onChange={setFRegra} />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={noConteudo} onChange={(e) => setNoConteudo(e.target.checked)} />
            Pesquisar também dentro dos documentos (mais lento)
          </label>
          <span>
            {filtrados.length} de {itens.length} chamado(s)
            <button onClick={limpar} className="ml-2 text-sky-400 hover:underline">limpar filtros</button>
          </span>
        </div>
      </section>

      <section className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-zinc-400">
            <tr>
              <SortTh label="Chamado" k="numero" sort={sort} onSort={toggleSort} />
              <SortTh label="Assunto" k="assunto" sort={sort} onSort={toggleSort} />
              <SortTh label="Tipo" k="tipo" sort={sort} onSort={toggleSort} className="hidden md:table-cell" />
              <SortTh label="Situação" k="situacao" sort={sort} onSort={toggleSort} />
              <SortTh label="Módulo" k="modulo" sort={sort} onSort={toggleSort} className="hidden lg:table-cell" />
              <SortTh label="Revision" k="revision" sort={sort} onSort={toggleSort} className="hidden sm:table-cell" />
              <SortTh label="Publicado em" k="publicado" sort={sort} onSort={toggleSort} className="hidden md:table-cell" />
              <SortTh label="PRs" k="prs" sort={sort} onSort={toggleSort} className="hidden lg:table-cell" />
              <SortTh label="Evidência" k="evidencia" sort={sort} onSort={toggleSort} className="hidden xl:table-cell" />
              <SortTh label="Plano" k="plano" sort={sort} onSort={toggleSort} className="hidden xl:table-cell" />
            </tr>
          </thead>
          <tbody>
            {carregando && <tr><td colSpan={10} className="px-3 py-8 text-center text-zinc-500">Carregando...</td></tr>}
            {!carregando && !filtrados.length && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-zinc-500">
                  {itens.length ? 'Nenhum chamado com esses filtros.' : 'Nenhum contexto importado ainda. Use “Importar contextos”.'}
                </td>
              </tr>
            )}
            {filtrados.map((c) => (
              <tr key={c.id} onClick={() => abrir(c)} className="cursor-pointer border-t border-zinc-800 hover:bg-zinc-900/60">
                <td className="whitespace-nowrap px-3 py-2 font-mono text-sky-300">{c.numero}</td>
                <td className="max-w-[360px] px-3 py-2">
                  <div className="font-medium">{c.assunto}</div>
                  <div className="text-xs text-zinc-400">{c.cliente || '—'}</div>
                </td>
                <td className="hidden px-3 py-2 text-zinc-300 md:table-cell">{ROTULO_TIPO[c.tipo ?? '']}</td>
                <td className="px-3 py-2">
                  {c.situacao ? <span className={`rounded px-1.5 py-0.5 text-xs ${estiloSituacao[c.situacao]}`}>{ROTULO_SITUACAO[c.situacao]}</span> : <span className="text-zinc-600">—</span>}
                </td>
                <td className="hidden px-3 py-2 text-zinc-300 lg:table-cell">{c.modulo || '—'}</td>
                <td className="hidden px-3 py-2 text-zinc-300 sm:table-cell">{c.revision || (c.situacao === 'em-correcao' ? 'ainda não saiu' : '—')}</td>
                <td className="hidden whitespace-nowrap px-3 py-2 text-zinc-400 md:table-cell">{formataIso(c.publicadoEm) || '—'}</td>
                <td className="hidden px-3 py-2 lg:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {c.prs.length ? c.prs.slice(0, 3).map((p) => (
                      <span key={p.numero} className="rounded bg-violet-500/15 px-1.5 py-0.5 text-xs text-violet-300">#{p.numero}</span>
                    )) : <span className="text-xs text-zinc-600">—</span>}
                    {c.prs.length > 3 && <span className="text-xs text-zinc-500">+{c.prs.length - 3}</span>}
                  </div>
                </td>
                <td className="hidden px-3 py-2 xl:table-cell"><Selo ok={c.temEvidencia} /></td>
                <td className="hidden px-3 py-2 xl:table-cell"><Selo ok={c.temPlano} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {previa && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-950 p-5">
            <h2 className="mb-1 text-lg font-semibold">Importar {previa.length} chamado(s)</h2>
            <p className="mb-3 text-sm text-zinc-400">Chamados que já existem serão atualizados com o conteúdo atual das pastas. Nada é apagado.</p>
            <ul className="mb-4 max-h-64 overflow-y-auto rounded border border-zinc-800 text-sm">
              {previa.map((c) => (
                <li key={c.id} className="flex justify-between gap-3 border-b border-zinc-800 px-3 py-1.5 last:border-0">
                  <span><span className="font-mono text-sky-300">{c.numero}</span> {c.cliente} — {c.assunto}</span>
                  <span className="whitespace-nowrap text-xs text-zinc-500">{c.temRegra ? 'REGRA.md · ' : ''}{itens.some((i) => i.id === c.id) ? 'atualiza' : 'novo'}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPrevia(null)} disabled={gravando} className="rounded-md border border-zinc-700 px-3 py-2 text-sm">Cancelar</button>
              <button onClick={gravar} disabled={gravando} className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium disabled:opacity-60">{gravando ? 'Gravando...' : 'Gravar'}</button>
            </div>
          </div>
        </div>
      )}

      {mostraModelo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setMostraModelo(false)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-950 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Modelo de contexto (REGRA.md)</h2>
                <p className="text-sm text-zinc-400">
                  Um arquivo <code>REGRA.md</code> dentro da pasta de cada chamado (por exemplo <code>568.361-unimed-limeira/REGRA.md</code>), escrito em linguagem de regra de negócio.
                  Depois, use “Importar contextos”.
                </p>
              </div>
              <button onClick={() => setMostraModelo(false)} className="rounded p-1 hover:bg-zinc-800"><X className="h-5 w-5" /></button>
            </div>
            <div className="mb-3 flex gap-2">
              <button onClick={copiarModelo} className="flex items-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-sm font-medium hover:bg-sky-500"><Copy className="h-4 w-4" /> Copiar modelo</button>
            </div>
            <pre className="mb-4 whitespace-pre-wrap break-words rounded bg-zinc-900 p-3 text-xs leading-relaxed text-zinc-200">{MODELO_REGRA}</pre>
            <h3 className="mb-2 text-sm font-semibold">Campos do cabeçalho</h3>
            <div className="overflow-x-auto rounded border border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead><tr><th className="px-3 py-2">Campo</th><th className="px-3 py-2">Valores</th><th className="px-3 py-2">Descrição</th></tr></thead>
                <tbody>
                  {CAMPOS_REGRA.map((c) => (
                    <tr key={c.campo} className="border-t border-zinc-800">
                      <td className="px-3 py-2 font-mono text-sky-300">{c.campo}</td>
                      <td className="px-3 py-2 font-mono text-zinc-300">{c.valores}</td>
                      <td className="px-3 py-2 text-zinc-300">{c.descricao}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-zinc-400">
              Sem tabela, rotina, branch, commit ou SQL no texto: a regra precisa entender sem abrir o banco ou o Delphi. Pastas sem REGRA.md continuam aparecendo, mas só com os dados lidos do CONTEXTO.md.
            </p>
          </div>
        </div>
      )}

      {aberto && (
        <div className="fixed inset-0 z-40 flex justify-end bg-black/60" onClick={() => setAberto(null)}>
          <aside className="h-full w-full max-w-3xl overflow-y-auto border-l border-zinc-700 bg-zinc-950 p-4 sm:p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="font-mono text-sky-300">{aberto.numero}</div>
                <h2 className="text-xl font-semibold">{aberto.assunto}</h2>
                <p className="text-sm text-zinc-400">{aberto.cliente || '—'}</p>
              </div>
              <button onClick={() => setAberto(null)} className="rounded p-1 hover:bg-zinc-800"><X className="h-5 w-5" /></button>
            </div>

            <dl className="mb-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div><dt className="text-xs text-zinc-500">Tipo</dt><dd>{ROTULO_TIPO[aberto.tipo ?? '']}</dd></div>
              <div><dt className="text-xs text-zinc-500">Situação</dt><dd>{aberto.situacao ? ROTULO_SITUACAO[aberto.situacao] : aberto.status || '—'}</dd></div>
              <div><dt className="text-xs text-zinc-500">Módulo</dt><dd>{aberto.modulo || '—'}</dd></div>
              <div><dt className="text-xs text-zinc-500">Revision</dt><dd>{aberto.revision || (aberto.situacao === 'em-correcao' ? 'ainda não saiu' : '—')}</dd></div>
              <div><dt className="text-xs text-zinc-500">Publicado em</dt><dd>{formataIso(aberto.publicadoEm) || '—'}</dd></div>
              <div><dt className="text-xs text-zinc-500">Atualizado</dt><dd>{aberto.atualizadoEm || '—'}</dd></div>
              {aberto.caminhoTela && <div className="col-span-2 sm:col-span-3"><dt className="text-xs text-zinc-500">Onde conferir na tela</dt><dd>{aberto.caminhoTela}</dd></div>}
              {aberto.resumo && !aberto.temRegra && <div className="col-span-2 sm:col-span-3"><dt className="text-xs text-zinc-500">Resumo</dt><dd className="text-zinc-300">{aberto.resumo}</dd></div>}
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
                    ) : <span key={p.numero} className="rounded bg-zinc-800 px-2 py-1 text-zinc-300">#{p.numero} (citado)</span>,
                  ) : <span className="text-zinc-600">Nenhum PR citado.</span>}
                </div>
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
                <button key={n} onClick={() => setDocAberto(n)} className={`rounded-t px-3 py-1.5 text-xs ${docAberto === n ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}`}>
                  {n === 'REGRA.md' ? 'Regra de negócio' : n.replace(/\.md$/i, '')}
                </button>
              ))}
            </div>
            {docAberto === 'REGRA.md' ? (
              <div className="rounded bg-zinc-900 p-4"><Md texto={aberto.docs?.[docAberto] ?? ''} /></div>
            ) : (
              <pre className="whitespace-pre-wrap break-words rounded bg-zinc-900 p-3 text-xs leading-relaxed text-zinc-200">{aberto.docs?.[docAberto] ?? ''}</pre>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

export default withAuth(ChamadosPage);
