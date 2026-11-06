'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import withAuth from '../components/withAuth';
import { collection, doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../firebase';
import { FolderSearch, Search, Upload, RefreshCcw, X, FileText, Copy } from 'lucide-react';
import { Chamado, lerPasta, ROTULO_SITUACAO, ROTULO_TIPO } from './parse';
import { CAMPOS_REGRA, MODELO_REGRA } from './modelo';
import { SortTh, sortRows, useSort } from '../components/SortableTable';
import { filtraChamados } from './filtro';
import { usePessoa } from '../components/usePessoa';
import { semGitChamado } from './semgit';
import { BmColuna } from './BmPainel';
import { chamadosDaPessoa, soDigitos, type RegistroBm } from './bmRegistro';
import { lerRegistrosBm, sincronizaBm } from './bmSync';
import { lerChaveBm } from './bmChave';
import DetalheChamado from './DetalheChamado';
import { previsaoDe } from './previsao';
import { EVENTO_DADOS_ATUALIZADOS } from '../components/AtualizaAoEntrar';
import { usePrevisaoRevisao } from './usePrevisaoRevisao';

type Tri = 'todos' | 'sim' | 'nao';
type Aba = 'todos' | 'em-correcao' | 'corrigidos' | 'regras';

const COLECAO = 'chamados';

const tokenDoLogin = async () => (await (auth.currentUser as unknown as { getIdToken(): Promise<string> } | null)?.getIdToken()) ?? '';

const passa = (v: boolean, f: Tri) => f === 'todos' || (f === 'sim' ? v : !v);

const dataParaNumero = (d: string) => {
  const m = d.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  return m ? Number(`${m[3]}${m[2]}${m[1]}`) : 0;
};

const formataIso = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '');

const estiloSituacao: Record<string, string> = {
  'em-correcao': 'rel-tag-alert',
  corrigido: 'rel-tag-ok',
  encerrado: '',
};

function Selo({ ok }: { ok: boolean }) {
  return (
    <span className={`rel-tag ${ok ? 'rel-tag-ok' : ''}`}>
      {ok ? 'Sim' : 'Não'}
    </span>
  );
}

function FiltroTri({ rotulo, valor, onChange }: { rotulo: string; valor: Tri; onChange: (v: Tri) => void }) {
  return (
    <label className="rel-field rel-label">
      {rotulo}
      <select value={valor} onChange={(e) => onChange(e.target.value as Tri)} className="rel-input">
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
  const [itensBrutos, setItens] = useState<Chamado[]>([]);
  const pessoa = usePessoa();
  const previsaoGlobal = usePrevisaoRevisao();
  const semGit = pessoa.semGit;
  // Perfil Sustentação: sem links, PRs nem branches do Git (evidência, plano e análise continuam visíveis).
  const itens = useMemo(() => (semGit ? itensBrutos.map(semGitChamado) : itensBrutos), [itensBrutos, semGit]);
  const [carregando, setCarregando] = useState(true);
  // Dados do BM gravados no banco (coleção chamados_bm): todos leem; só quem tem a chave do BM sincroniza.
  const [registros, setRegistros] = useState<Record<string, RegistroBm>>({});
  const [temChave, setTemChave] = useState(false);
  const [escopoBm, setEscopoBm] = useState<'filtrados' | 'meus' | 'todos'>('filtrados');
  const [progressoBm, setProgressoBm] = useState<{ feito: number; total: number } | null>(null);
  const [msgBm, setMsgBm] = useState('');
  const [atualizandoUm, setAtualizandoUm] = useState(false);
  const pararBm = useRef(false);

  useEffect(() => {
    const ler = () => setTemChave(!!lerChaveBm());
    ler();
    window.addEventListener('nucleoptu-bm-chave', ler);
    return () => window.removeEventListener('nucleoptu-bm-chave', ler);
  }, []);

  useEffect(() => {
    lerRegistrosBm()
      .then(setRegistros)
      .catch((e) => {
        console.error(e);
        const codigo = (e as { code?: string })?.code ?? 'erro desconhecido';
        setMsgBm(`Não foi possível ler os dados do BM gravados no banco (${codigo}).${codigo === 'permission-denied' ? ' Libere a leitura e a escrita da coleção chamados_bm nas regras do Firestore.' : ''}`);
      });
  }, []);

  const sincronizarBm = async (lista: Chamado[], forcar: boolean) => {
    if (!lista.length) {
      setMsgBm(escopoBm === 'meus' ? 'Nenhum chamado seu na lista (confira o usuário Git no perfil) ou escolha outra opção.' : 'Nenhum chamado para sincronizar.');
      return;
    }
    pararBm.current = false;
    setMsgBm('');
    setProgressoBm({ feito: 0, total: lista.length });
    const r = await sincronizaBm({
      chamados: lista,
      registros,
      por: auth.currentUser?.email ?? '',
      forcar,
      onProgresso: (feito, total, parcial) => {
        setProgressoBm({ feito, total });
        setRegistros({ ...parcial });
      },
      deveParar: () => pararBm.current,
    });
    setProgressoBm(null);
    setMsgBm(`BM sincronizado: ${r.atualizados} atualizado(s), ${r.iguais} sem mudança, ${r.semCartao} sem cartão no BM${r.erros ? `, ${r.erros} com erro` : ''}${r.parado ? ' (interrompido)' : ''}.${r.aviso ? ` ${r.aviso}` : ''}`);
  };
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
  const [fAutor, setFAutor] = useState('');
  const [fRevision, setFRevision] = useState('');
  const [aberto, setAberto] = useState<Chamado | null>(null);
  const [previa, setPrevia] = useState<Chamado[] | null>(null);
  const [gravando, setGravando] = useState(false);
  const [substituir, setSubstituir] = useState(false);
  const [msg, setMsg] = useState('');
  const [mostraModelo, setMostraModelo] = useState(false);
  const [mostraImportar, setMostraImportar] = useState(false);
  const pastaRef = useRef<HTMLInputElement>(null);
  const [caminho, setCaminho] = useState('C:/RepositorioGit/claude/contextos_prs');
  const [lendo, setLendo] = useState(false);
  const [importPermitido, setImportPermitido] = useState<boolean | null>(null);
  const [importMotivo, setImportMotivo] = useState('');
  const { sort, toggleSort } = useSort({ key: 'publicado', dir: 'desc' });

  useEffect(() => {
    tokenDoLogin()
      .then((token) => fetch('/api/chamados/importar', { headers: { Authorization: `Bearer ${token}` } }))
      .then((r) => r.json())
      .then((j) => {
        setImportPermitido(!!j.permitido);
        setImportMotivo(j.motivo ?? '');
        if (j.pasta) setCaminho(j.pasta);
      })
      .catch(() => {
        setImportPermitido(false);
        setImportMotivo('Não foi possível confirmar se a importação está liberada.');
      });
  }, []);

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

  useEffect(() => {
    const recarrega = () => {
      carregar();
      lerRegistrosBm().then(setRegistros).catch(() => undefined);
    };
    window.addEventListener(EVENTO_DADOS_ATUALIZADOS, recarrega);
    return () => window.removeEventListener(EVENTO_DADOS_ATUALIZADOS, recarrega);
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
      const r = await fetch('/api/chamados/importar', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await tokenDoLogin()}` }, body: JSON.stringify({ caminho }) });
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
      setMsg('Não foi possível ler a pasta. Tente novamente.');
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
      // Substituir tudo: remove da coleção os chamados que não estão na importação.
      const sobrando = substituir ? itens.filter((i) => !previa.some((p) => p.id === i.id)) : [];
      for (let i = 0; i < sobrando.length; i += 400) {
        const lote = writeBatch(db);
        for (const c of sobrando.slice(i, i + 400)) lote.delete(doc(db, COLECAO, c.id));
        await lote.commit();
      }
      setMsg(
        `${previa.length} chamado(s) importado(s). Quem já existia foi atualizado.${substituir ? ` ${sobrando.length} chamado(s) que não estavam na pasta foram removidos da lista.` : ''}`,
      );
      setSubstituir(false);
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
  const autoresLista = useMemo(() => [...new Set(itens.flatMap((i) => i.autores ?? []))].sort(), [itens]);
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

  // Sem useMemo: a lista é pequena e assim nenhum filtro fica de fora das dependências (o filtro de autor já ficou).
  const filtrados = sortRows(
    filtraChamados(itens, { busca, noConteudo, aba, pr: fPr, evidencia: fEvid, plano: fPlano, regra: fRegra, cliente: fCliente, modulo: fModulo, autor: fAutor, revision: fRevision }),
    sort,
    {
    numero: (c) => c.id,
    assunto: (c) => c.assunto,
    tipo: (c) => ROTULO_TIPO[c.tipo ?? ''] === '—' ? '' : ROTULO_TIPO[c.tipo ?? ''],
    situacao: (c) => (c.situacao ? ROTULO_SITUACAO[c.situacao] : ''),
    modulo: (c) => c.modulo,
    autor: (c) => (c.autores ?? []).join(', '),
    revision: (c) => c.revision,
    publicado: (c) => c.publicadoEm || '',
    prs: (c) => c.prs.length,
    evidencia: (c) => c.temEvidencia,
    plano: (c) => c.temPlano,
    bm: (c) => registros[soDigitos(c.numero)]?.resumo?.coluna ?? '',
    atualizado: (c) => dataParaNumero(c.atualizadoEm),
    },
  );

  const limpar = () => {
    setBusca('');
    setFPr('todos');
    setFEvid('todos');
    setFPlano('todos');
    setFRegra('todos');
    setFCliente('');
    setFModulo('');
    setFAutor('');
    setFRevision('');
    setAba('todos');
  };

  const abrir = (c: Chamado) => {
    setAberto(c);
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
    <div className="rel-page mx-auto max-w-7xl">
      <header className="rel-box flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="rel-title"><FolderSearch className="h-5 w-5" /> Contexto de chamados</h1>
          <p className="rel-desc">O que está em correção, o que já foi corrigido (e em qual revision saiu) e as regras que estavam escondidas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setMostraModelo(true)} className="rel-btn rel-btn-outline">
            <FileText className="h-4 w-4" /> Modelo de contexto
          </button>
          <button onClick={carregar} className="rel-btn rel-btn-outline">
            <RefreshCcw className="h-4 w-4" /> Atualizar
          </button>
          {importPermitido ? (
            <button onClick={() => setMostraImportar((v) => !v)} className="rel-btn rel-btn-primary">
              <Upload className="h-4 w-4" /> Importar contextos
            </button>
          ) : (
            importPermitido === false && (
              <span title={importMotivo} className="rel-tag">
                <Upload className="h-4 w-4" /> Importação indisponível
              </span>
            )
          )}
        </div>
      </header>

      {msg && <div className="rel-notice">{msg}</div>}
      {erro && <div className="rel-notice rel-notice-error">{erro}</div>}

      {mostraImportar && importPermitido && (
        <section className="rel-box space-y-3">
          <div>
            <div className="rel-label mb-1">Escolher a pasta no computador (a que contém as pastas dos chamados)</div>
            <button onClick={() => pastaRef.current?.click()} className="rel-btn rel-btn-outline">
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
          <label className="rel-field rel-label">
            Ou ler a pasta de contextos do servidor (somente dentro da pasta configurada no servidor)
            <div className="flex flex-wrap gap-2">
              <input
                value={caminho}
                onChange={(e) => setCaminho(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !lendo && lerDoCaminho()}
                placeholder="C:/RepositorioGit/claude/contextos_prs"
                className="rel-input min-w-[240px] flex-1 font-mono"
              />
              <button onClick={lerDoCaminho} disabled={lendo || !caminho.trim()} className="rel-btn rel-btn-primary">
                {lendo ? 'Lendo...' : 'Ler pasta'}
              </button>
            </div>
          </label>
        </section>
      )}

      <div className="flex flex-wrap gap-2">
        {abas.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`rel-btn rel-btn-sm ${aba === a.id ? 'rel-btn-primary' : 'rel-btn-ghost'}`}
          >
            {a.rotulo} <span className="opacity-75">({contagem[a.id]})</span>
          </button>
        ))}
      </div>

      <section className="rel-box">
        <div className="flex flex-wrap items-end gap-3">
          <label className="rel-field rel-label min-w-[220px] flex-1">
            Pesquisar
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Chamado, cliente, assunto, módulo, revision, PR..."
                className="rel-input pl-8"
              />
            </div>
          </label>
          <label className="rel-field rel-label">
            Módulo
            <select value={fModulo} onChange={(e) => setFModulo(e.target.value)} className="rel-input max-w-[200px]">
              <option value="">Todos</option>
              {modulos.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </label>
          <label className="rel-field rel-label">
            Autor do PR
            <select value={fAutor} onChange={(e) => setFAutor(e.target.value)} className="rel-input max-w-[200px]">
              <option value="">Todos</option>
              {autoresLista.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label className="rel-field rel-label">
            Cliente
            <select value={fCliente} onChange={(e) => setFCliente(e.target.value)} className="rel-input max-w-[200px]">
              <option value="">Todos</option>
              {clientes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="rel-field rel-label">
            Revision
            <select value={fRevision} onChange={(e) => setFRevision(e.target.value)} className="rel-input">
              <option value="">Todas</option>
              {revisions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          {!semGit && <FiltroTri rotulo="Tem PR" valor={fPr} onChange={setFPr} />}
          <FiltroTri rotulo="Evidência" valor={fEvid} onChange={setFEvid} />
          <FiltroTri rotulo="Plano de testes" valor={fPlano} onChange={setFPlano} />
          <FiltroTri rotulo="Tem REGRA.md" valor={fRegra} onChange={setFRegra} />
        </div>
        <div className="rel-desc mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={noConteudo} onChange={(e) => setNoConteudo(e.target.checked)} />
            Pesquisar também dentro dos documentos (mais lento)
          </label>
          {temChave && !semGit && (
            <span className="flex flex-wrap items-center gap-2">
              <select value={escopoBm} onChange={(e) => setEscopoBm(e.target.value as 'filtrados' | 'meus' | 'todos')} className="rel-input max-w-[220px]" disabled={!!progressoBm}>
                <option value="filtrados">Filtrados na tela ({filtrados.length})</option>
                <option value="meus">Meus chamados</option>
                <option value="todos">Todos os chamados</option>
              </select>
              {progressoBm ? (
                <>
                  <span>BM: {progressoBm.feito}/{progressoBm.total}</span>
                  <button onClick={() => { pararBm.current = true; }} className="rel-btn rel-btn-ghost rel-btn-sm">Parar</button>
                </>
              ) : (
                <button onClick={() => sincronizarBm(escopoBm === 'filtrados' ? filtrados : escopoBm === 'meus' ? chamadosDaPessoa(itens, pessoa.gitUser) : itens, false)} className="rel-btn rel-btn-outline rel-btn-sm">
                  <RefreshCcw className="h-3.5 w-3.5" /> Atualizar do BM
                </button>
              )}
            </span>
          )}
          <span>
            {filtrados.length} de {itens.length} chamado(s)
            <button onClick={limpar} className="ml-2 text-sky-400 hover:underline">limpar filtros</button>
          </span>
        </div>
      </section>

      {msgBm && <p className="mb-2 text-xs text-amber-300">Businessmap: {msgBm}</p>}
      <section className="rel-table-wrap">
        <table className="w-full text-left text-sm">
          <thead className="text-xs">
            <tr>
              <SortTh label="Chamado" k="numero" sort={sort} onSort={toggleSort} />
              <SortTh label="Assunto" k="assunto" sort={sort} onSort={toggleSort} />
              <SortTh label="Tipo" k="tipo" sort={sort} onSort={toggleSort} className="hidden md:table-cell" />
              <SortTh label="Situação" k="situacao" sort={sort} onSort={toggleSort} />
              <SortTh label="Coluna no BM" k="bm" sort={sort} onSort={toggleSort} className="hidden md:table-cell" />
              <SortTh label="Autor" k="autor" sort={sort} onSort={toggleSort} className="hidden sm:table-cell" />
              <SortTh label="Módulo" k="modulo" sort={sort} onSort={toggleSort} className="hidden lg:table-cell" />
              <SortTh label="Revision" k="revision" sort={sort} onSort={toggleSort} className="hidden sm:table-cell" />
              <SortTh label="Publicado em" k="publicado" sort={sort} onSort={toggleSort} className="hidden md:table-cell" />
              {!semGit && <SortTh label="PRs" k="prs" sort={sort} onSort={toggleSort} className="hidden lg:table-cell" />}
              <SortTh label="Evidência" k="evidencia" sort={sort} onSort={toggleSort} className="hidden xl:table-cell" />
              <SortTh label="Plano" k="plano" sort={sort} onSort={toggleSort} className="hidden xl:table-cell" />
            </tr>
          </thead>
          <tbody>
            {carregando && <tr><td colSpan={semGit ? 11 : 12} className="rel-empty">Carregando...</td></tr>}
            {!carregando && !filtrados.length && (
              <tr>
                <td colSpan={semGit ? 11 : 12} className="rel-empty">
                  {itens.length ? 'Nenhum chamado com esses filtros.' : 'Nenhum contexto importado ainda. Use “Importar contextos”.'}
                </td>
              </tr>
            )}
            {filtrados.map((c) => (
              <tr key={c.id} onClick={() => abrir(c)} className="rel-row">
                <td className="rel-mono whitespace-nowrap px-3 py-2">{c.numero}</td>
                <td className="max-w-[360px] px-3 py-2">
                  <div className="rel-strong">{c.assunto}</div>
                  <div className="rel-desc">{c.cliente || '—'}</div>
                </td>
                <td className="hidden px-3 py-2 text-zinc-300 md:table-cell">{ROTULO_TIPO[c.tipo ?? '']}</td>
                <td className="px-3 py-2">
                  {c.situacao ? <span className={`rel-tag ${estiloSituacao[c.situacao]}`}>{ROTULO_SITUACAO[c.situacao]}</span> : <span className="text-zinc-600">—</span>}
                </td>
                <td className="hidden px-3 py-2 md:table-cell"><BmColuna r={registros[soDigitos(c.numero)]?.resumo} /></td>
                <td className="hidden px-3 py-2 text-zinc-300 sm:table-cell">{(c.autores ?? []).join(', ') || '—'}</td>
                <td className="hidden px-3 py-2 text-zinc-300 lg:table-cell">{c.modulo || '—'}</td>
                <td className="hidden px-3 py-2 text-zinc-300 sm:table-cell">{c.revision || (previsaoDe(c, previsaoGlobal) ? `previsão ${previsaoDe(c, previsaoGlobal)}` : c.situacao === 'em-correcao' ? 'ainda não saiu' : '—')}</td>
                <td className="hidden whitespace-nowrap px-3 py-2 text-zinc-400 md:table-cell">{formataIso(c.publicadoEm) || '—'}</td>
                <td className={semGit ? 'hidden' : 'hidden px-3 py-2 lg:table-cell'}>
                  <div className="flex flex-wrap gap-1">
                    {c.prs.length ? c.prs.slice(0, 3).map((p) => (
                      <span key={p.numero} className="rel-tag rel-tag-info">#{p.numero}</span>
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
        <div className="rel-backdrop rel-backdrop-top">
          <div className="rel-box max-h-[85vh] w-full max-w-2xl overflow-y-auto">
            <h2 className="mb-1 text-lg font-semibold">Importar {previa.length} chamado(s)</h2>
            <p className="mb-3 text-sm text-zinc-400">Chamados que já existem serão atualizados com o conteúdo atual das pastas.</p>
            <label className="mb-3 flex items-start gap-2 rounded border border-zinc-700 p-3 text-sm">
              <input type="checkbox" className="mt-1" checked={substituir} onChange={(e) => setSubstituir(e.target.checked)} />
              <span>
                <strong>Substituir tudo:</strong> remover da lista os chamados que não estão nesta pasta.
                {' '}
                {(() => {
                  const sobra = itens.filter((i) => !previa.some((p) => p.id === i.id)).length;
                  return substituir
                    ? `Serão removidos ${sobra} chamado(s) da lista do sistema (as pastas no computador não são apagadas).`
                    : `${sobra} chamado(s) da lista não estão nesta pasta e serão mantidos.`;
                })()}
              </span>
            </label>
            <ul className="mb-4 max-h-64 overflow-y-auto rounded border border-zinc-800 text-sm">
              {previa.map((c) => (
                <li key={c.id} className="flex justify-between gap-3 border-b border-zinc-800 px-3 py-1.5 last:border-0">
                  <span><span className="font-mono text-sky-300">{c.numero}</span> {c.cliente} — {c.assunto}</span>
                  <span className="whitespace-nowrap text-xs text-zinc-500">{c.temRegra ? 'REGRA.md · ' : ''}{itens.some((i) => i.id === c.id) ? 'atualiza' : 'novo'}</span>
                </li>
              ))}
            </ul>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setPrevia(null); setSubstituir(false); }} disabled={gravando} className="rel-btn rel-btn-ghost">Cancelar</button>
              <button onClick={gravar} disabled={gravando} className="rel-btn rel-btn-primary">{gravando ? 'Gravando...' : 'Gravar'}</button>
            </div>
          </div>
        </div>
      )}

      {mostraModelo && (
        <div className="rel-backdrop rel-backdrop-top" onClick={() => setMostraModelo(false)}>
          <div className="rel-box max-h-[90vh] w-full max-w-3xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Modelo de contexto (REGRA.md)</h2>
                <p className="text-sm text-zinc-400">
                  Um arquivo <code>REGRA.md</code> dentro da pasta de cada chamado (por exemplo <code>568.361-unimed-limeira/REGRA.md</code>), escrito em linguagem de regra de negócio.
                  Depois, use “Importar contextos”.
                </p>
              </div>
              <button onClick={() => setMostraModelo(false)} className="rel-btn rel-btn-icon"><X className="h-5 w-5" /></button>
            </div>
            <div className="mb-3 flex gap-2">
              <button onClick={copiarModelo} className="rel-btn rel-btn-primary"><Copy className="h-4 w-4" /> Copiar modelo</button>
            </div>
            <pre className="rel-pre rel-pre-lg mb-4">{MODELO_REGRA}</pre>
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
        <DetalheChamado
          key={aberto.id}
          c={aberto}
          previsao={previsaoDe(aberto, previsaoGlobal)}
          semGit={semGit}
          registro={registros[soDigitos(aberto.numero)]}
          temChave={temChave}
          atualizando={atualizandoUm}
          onAtualizar={async () => {
            setAtualizandoUm(true);
            await sincronizarBm([aberto], true);
            setAtualizandoUm(false);
          }}
          onClose={() => setAberto(null)}
          Md={Md}
        />
      )}
    </div>
  );
}

export default withAuth(ChamadosPage);
