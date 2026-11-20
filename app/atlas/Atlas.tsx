'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Compass, ExternalLink, GitBranch, Layers3, Map, Network, RefreshCw, Search, ShieldCheck, Sparkles, Telescope, X, ZoomIn, ZoomOut } from 'lucide-react';
import { auth } from '../../firebase';
import { useAuth } from '../AuthContext';
import { CATEGORIAS, DOMINIOS, filtrarRegras, type Categoria, type Dominio, type NovidadeAtlas, type RegraAtlas, type RepoGitAtlas } from './modelo';
import { useAtlasGit, ErroConsultaAtlas, type ConsultaAtlas } from './useAtlasGit';
import './atlas.css';
const AREAS = Object.keys(DOMINIOS) as Dominio[];
const formatDate = (value: string) => value ? new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Não informado';
const numero = (n: number) => n.toLocaleString('pt-BR');
const TRILHAS = [
    { nome: 'O caminho de uma conta', texto: 'Descubra quem recebe, confere e calcula.', repos: ['ptu', 'contas', 'banco'], categoria: 'regra' },
    { nome: 'Por que houve uma glosa?', texto: 'Siga os sinais de validação até a fonte.', repos: ['contas', 'banco', 'tiss'], categoria: 'glosa' },
    { nome: 'Cada cliente, um contexto', texto: 'Investigue documentos e parâmetros.', repos: ['banco', 'ptu', 'contas'], categoria: 'cliente' },
] as const;
async function consultarAutenticado<T>(suffix = '', method = 'GET', signal?: AbortSignal, corpo?: unknown): Promise<T> {
    const token = await (auth.currentUser as unknown as {
        getIdToken(): Promise<string>;
    } | null)?.getIdToken();
    if (!token)
        throw new ErroConsultaAtlas('Entre no sistema para explorar o Atlas.', 401);
    const response = await fetch(`/api/atlas${suffix}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, signal, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
    const json = await response.json();
    if (!response.ok)
        throw new ErroConsultaAtlas(json.erro || 'Não foi possível carregar o Atlas.', response.status, json.retomarEm, json.acessoNegado);
    return json as T;
}
export default function Atlas({ consultar = consultarAutenticado }: {
    consultar?: ConsultaAtlas;
}) {
    const { user } = useAuth();
    const [aba, setAba] = useState<'mapa' | 'regras' | 'novidades'>('mapa');
    const [area, setArea] = useState<Dominio | ''>('');
    const [busca, setBusca] = useState('');
    const [categoria, setCategoria] = useState<Categoria | ''>('');
    const [selecionado, setSelecionado] = useState('');
    const { catalogo, erro, setErro, atualizar, atualizando: sincronizando, pausado, setPausado, lendo, retomarEm } = useAtlasGit(consultar, user?.uid, selecionado);
    const sincronizar = () => { void atualizar(true); };
    const ocupado = !!lendo && !pausado;
    const consultaEm = catalogo?.geradoEm ?? '';
    const reposGit: RepoGitAtlas[] = useMemo(() => catalogo?.repos.map((r) => ({ nome: r.nome, descricao: r.descricao, atualizadoEm: r.atualizadoEm, branch: r.branch, url: r.url, arquivado: false })) ?? [], [catalogo]);
    const [regra, setRegra] = useState<RegraAtlas | null>(null);
    const [visitados, setVisitados] = useState<string[]>([]);
    const [pagina, setPagina] = useState(1);
    const [zoom, setZoom] = useState(1);
    const [trilha, setTrilha] = useState<number | null>(null);
    const [etapa, setEtapa] = useState(0);
    const [novidades, setNovidades] = useState<NovidadeAtlas[]>([]);
    const [erroNovidades, setErroNovidades] = useState('');
    const [carregandoNovidades, setCarregandoNovidades] = useState(false);
    const [divergente, setDivergente] = useState(false);
    const [ajuda, setAjuda] = useState(false);
    const mapRef = useRef<HTMLDivElement>(null);
    const detailRef = useRef<HTMLElement>(null);
    const [linhas, setLinhas] = useState<{
        d: string;
        ativa: boolean;
        label: string;
    }[]>([]);
    useEffect(() => {
        try {
            const salvo: unknown = JSON.parse(localStorage.getItem(`atlas.explorados.${user?.uid}`) ?? '[]');
            setVisitados(Array.isArray(salvo) ? salvo.filter((item): item is string => typeof item === 'string') : []);
        }
        catch {
            setVisitados([]);
        }
    }, [user?.uid]);
    useEffect(() => {
        if (!selecionado || !detailRef.current)
            return;
        detailRef.current.focus({ preventScroll: true });
        if (window.matchMedia('(max-width: 1250px)').matches)
            detailRef.current.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }, [selecionado, regra?.id]);
    function explorar(id: string) {
        setSelecionado(id);
        setRegra(null);
        setVisitados((old) => {
            const next = [...new Set([...old, id])];
            try {
                localStorage.setItem(`atlas.explorados.${user?.uid}`, JSON.stringify(next));
            }
            catch { /* progresso local opcional */ }
            return next;
        });
    }
    const repo = catalogo?.repos.find((r) => r.id === selecionado);
    useEffect(() => {
        if (!selecionado)
            return;
        const controller = new AbortController();
        const carregar = async () => {
            setCarregandoNovidades(true);
            setErroNovidades('');
            try {
                const dados = await consultar<{
                    novidades: NovidadeAtlas[];
                    shaAtual: string;
                }>(`?modo=novidades&repo=${encodeURIComponent(selecionado)}`, 'GET', controller.signal);
                setNovidades(dados.novidades);
                setDivergente(!!repo?.sha && !!dados.shaAtual && dados.shaAtual !== repo.sha);
            }
            catch (e) {
                if (!controller.signal.aborted)
                    setErroNovidades((e as Error).message);
            }
            finally {
                if (!controller.signal.aborted)
                    setCarregandoNovidades(false);
            }
        };
        setNovidades([]);
        setDivergente(false);
        void carregar();
        const interval = setInterval(() => {
            if (document.visibilityState === 'visible')
                void carregar();
        }, 5 * 60000);
        return () => { controller.abort(); clearInterval(interval); };
    }, [selecionado, repo?.sha, consultar]);
    const repos = useMemo(() => {
        if (!catalogo)
            return [];
        const locais = catalogo.repos.map((r) => ({ ...r, remoto: reposGit.find((g) => g.nome === r.id) }));
        return locais.filter((r) => (!area || r.dominio === area) && (!busca || `${r.nome} ${r.descricao} ${DOMINIOS[r.dominio].nome}`.toLowerCase().includes(busca.toLowerCase())));
    }, [catalogo, reposGit, area, busca]);
    const remotosSemIndice = reposGit.filter((g) => !catalogo?.repos.some((r) => r.id === g.nome));
    const conexoes = catalogo?.conexoes.filter((c) => c.origem === selecionado || c.destino === selecionado) ?? [];
    const explorados = visitados.filter((id) => catalogo?.repos.some((r) => r.id === id)).length;
    const percentual = catalogo?.repos.length ? Math.round(explorados / catalogo.repos.length * 100) : 0;
    useEffect(() => { setPagina(1); }, [busca, categoria, selecionado, area]);
    const todasRegras = useMemo(() => filtrarRegras(catalogo?.regras ?? [], busca, selecionado, categoria).filter((r) => !area || catalogo?.repos.find((p) => p.id === r.repo)?.dominio === area), [catalogo, busca, selecionado, categoria, area]);
    const totalRegras = todasRegras.length;
    const regras = todasRegras.slice((pagina - 1) * 12, pagina * 12);
    const carregandoRegras = !!lendo && !totalRegras && !pausado;
    const erroRegras = repo?.erroLeitura ?? '';
    useEffect(() => {
        const mapa = mapRef.current;
        if (!mapa || aba !== 'mapa')
            return;
        const desenhar = () => {
            const bounds = mapa.getBoundingClientRect();
            const nodes = new globalThis.Map(Array.from(mapa.querySelectorAll<HTMLElement>('[data-repo]')).map((n) => [n.dataset.repo, n.getBoundingClientRect()]));
            setLinhas((catalogo?.conexoes ?? []).flatMap((c) => {
                const a = nodes.get(c.origem), b = nodes.get(c.destino);
                if (!a || !b)
                    return [];
                const x1 = a.x + a.width / 2 - bounds.x, y1 = a.y + a.height / 2 - bounds.y;
                const x2 = b.x + b.width / 2 - bounds.x, y2 = b.y + b.height / 2 - bounds.y;
                return [{ d: `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`, ativa: c.origem === selecionado || c.destino === selecionado, label: `${c.origem} → ${c.destino}: ${c.motivo}` }];
            }));
        };
        const observer = new ResizeObserver(desenhar);
        observer.observe(mapa);
        desenhar();
        return () => observer.disconnect();
    }, [catalogo, repos, selecionado, aba, zoom]);
    const reindexar = () => { setPausado(false); void atualizar(true); };
    function iniciarTrilha(i: number) {
        setTrilha(i);
        setEtapa(0);
        setArea('');
        setBusca('');
        setCategoria(TRILHAS[i].categoria);
        explorar(TRILHAS[i].repos[0]);
        setAba('mapa');
    }
    return <div className="atlas">
    <header className="atlas-header">
      <div className="atlas-brand"><span className="atlas-brand-icon"><Compass size={23}/></span><div><span className="atlas-overline">SOLUS · EXPLORADOR DE CONHECIMENTO</span><h1>Atlas Solus<span>beta</span></h1></div></div>
      <div className="atlas-header-actions"><span className="atlas-live"><i />{catalogo ? 'Git conectado' : erro ? 'Git indisponível' : 'Consultando Git'}{consultaEm && <small> · {new Date(consultaEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</small>}</span><button className="atlas-icon-button" aria-label="Como funciona o Atlas" onClick={() => setAjuda(!ajuda)}><BookOpen size={19}/></button><button className="atlas-button" onClick={sincronizar} disabled={sincronizando}><RefreshCw size={15} className={sincronizando ? 'atlas-spin' : ''}/>{sincronizando ? 'Consultando…' : 'Atualizar Git'}</button></div>
    </header>

    <section className="atlas-intro">
      <div><div className="atlas-eyebrow"><Sparkles size={14}/> GRANDES SISTEMAS. CAMINHOS COMPREENSÍVEIS.</div><h2>Conheça o que conecta<br /><em>o universo Solus.</em></h2><p>Viaje pelos sistemas, siga as conexões e descubra as decisões<br className="atlas-desktop"/> que estão por trás de cada atendimento.</p></div>
      <div className="atlas-passport"><div className="atlas-passport-top"><span className="atlas-compass"><Telescope size={25}/></span><div><small>SEU PASSAPORTE DE EXPLORAÇÃO</small><strong>{explorados === 0 ? 'Toda descoberta começa aqui' : `${explorados} territórios explorados`}</strong></div></div><div className="atlas-progress"><span style={{ width: `${percentual}%` }}/></div><div className="atlas-passport-bottom"><span>{explorados} de {catalogo?.repos.length ?? '…'} sistemas visitados</span><b>{percentual}%</b></div><p>Seu progresso é pessoal. Explorar não significa dominar.</p></div>
    </section>

    {catalogo && <section className="atlas-git-status" aria-live="polite"><div><GitBranch size={17}/><div><strong>Fontes carregadas diretamente do Git</strong><p>{catalogo.repos.filter((r) => r.estadoLeitura === 'concluido').length} de {catalogo.repos.length} sistemas lidos · {numero(catalogo.regras.length)} pistas encontradas{lendo && !pausado ? ` · Lendo ${lendo}` : ''}</p>{retomarEm > Date.now() && <p>Retomada após a pausa do Git: {new Date(retomarEm).toLocaleTimeString('pt-BR')}</p>}</div></div><button className="atlas-button" onClick={() => setPausado(!pausado)}>{pausado ? 'Retomar leitura' : 'Pausar leitura'}</button>{catalogo.repos.some((r) => r.estadoLeitura === 'erro') && <button className="atlas-button" onClick={reindexar}>Tentar sistemas com falha</button>}</section>}

    {erro && <div className="atlas-notice" role="status">{erro}<button onClick={() => { setErro(''); }} aria-label="Fechar aviso"><X size={16}/></button></div>}
    {ajuda && <section className="atlas-help"><h3>Um mapa para investigar com segurança</h3><p>Os territórios agrupam os sistemas por assunto. As linhas mostram referências encontradas no código. Os cartões são pistas automáticas, sempre acompanhadas da fonte. Confirme a regra, os parâmetros e a versão do cliente antes de orientar um atendimento.</p>{catalogo?.limites.map((l) => <p key={l}>• {l}</p>)}<button className="atlas-button" onClick={reindexar} disabled={ocupado}><RefreshCw size={14}/>{ocupado ? 'Lendo os repositórios…' : 'Atualizar fontes do Git'}</button></section>}

    <section className="atlas-workspace">
      <div className="atlas-toolbar"><div className="atlas-tabs" role="tablist" aria-label="Modos de exploração">{([{ id: 'mapa', nome: 'Mapa do universo', icon: Map }, { id: 'regras', nome: 'Biblioteca de regras', icon: Layers3 }, { id: 'novidades', nome: 'O que mudou', icon: GitBranch }] as const).map((t) => <button key={t.id} role="tab" aria-selected={aba === t.id} onClick={() => setAba(t.id)} className={aba === t.id ? 'active' : ''}><t.icon size={16}/>{t.nome}</button>)}</div><label className="atlas-search"><Search size={17}/><input maxLength={180} aria-label="Buscar sistema, regra ou CNPJ" placeholder={aba === 'mapa' ? 'Buscar um sistema…' : 'Buscar assunto, parâmetro ou CNPJ…'} value={busca} onChange={(e) => setBusca(e.target.value)}/>{busca && <button aria-label="Limpar busca" onClick={() => setBusca('')}><X size={14}/></button>}</label></div>
      <div className="atlas-filterbar"><div><button className={`atlas-filter ${!area ? 'active' : ''}`} onClick={() => setArea('')}>Todos os territórios</button>{AREAS.map((d) => <button key={d} className={`atlas-filter ${area === d ? 'active' : ''}`} onClick={() => setArea(d)}><i style={{ background: DOMINIOS[d].cor }}/>{DOMINIOS[d].nome}</button>)}</div><span>{catalogo ? `${numero(catalogo.repos.length)} sistemas · ${numero(catalogo.conexoes.length)} conexões` : 'Preparando seu mapa…'}</span></div>

      {!catalogo && !erro && <div className="atlas-empty" role="status"><Compass size={36} className="atlas-spin"/><h3>Abrindo o mapa…</h3><p>Estamos recuperando as fontes do conhecimento.</p></div>}
      {!catalogo && erro && <div className="atlas-empty"><Telescope size={36}/><h3>O mapa ainda não está disponível</h3><p>{erro}</p><button className="atlas-button" disabled={ocupado} onClick={reindexar}>Carregar repositórios do Git</button></div>}

      {catalogo && <div className={`atlas-content ${selecionado ? 'with-detail' : ''}`}>
        <div className="atlas-main-panel">
          {trilha !== null && <div className="atlas-route"><span className="atlas-route-number">{etapa + 1}/3</span><div><small>TRILHA DE DESCOBERTA</small><strong>{TRILHAS[trilha].nome}</strong><span>Explore {TRILHAS[trilha].repos[etapa]} e leia as pistas na lateral.</span></div><button className="atlas-button" onClick={() => {
                    if (etapa < 2) {
                        setEtapa(etapa + 1);
                        explorar(TRILHAS[trilha].repos[etapa + 1]);
                    }
                    else {
                        setTrilha(null);
                        setCategoria('');
                    }
                }}>{etapa < 2 ? 'Próxima parada' : 'Concluir percurso'}<ArrowRight size={14}/></button><button className="atlas-icon-button" aria-label="Sair da trilha" onClick={() => { setTrilha(null); setCategoria(''); }}><X size={16}/></button></div>}

          {aba === 'mapa' && <>
            <div className="atlas-map-title"><div><span className="atlas-overline">SEU MAPA DE DESCOBERTAS</span><h3>Um ecossistema. Muitas conexões.</h3></div><div className="atlas-zoom"><button aria-label="Reduzir mapa" disabled={zoom <= .8} onClick={() => setZoom(Math.max(.8, zoom - .1))}><ZoomOut size={16}/></button><span>{Math.round(zoom * 100)}%</span><button aria-label="Ampliar mapa" disabled={zoom >= 1.4} onClick={() => setZoom(Math.min(1.4, zoom + .1))}><ZoomIn size={16}/></button></div></div>
            <div className="atlas-map-scroll"><div ref={mapRef} className="atlas-map" style={{ width: `${zoom * 100}%`, minWidth: 680 * zoom, minHeight: 590 * zoom }}>
              <svg className="atlas-edges" aria-label="Conexões comprovadas entre repositórios">{linhas.map((l, i) => <path key={i} d={l.d} className={l.ativa ? 'active' : ''}><title>{l.label}</title></path>)}</svg><div className="atlas-map-center"><span><Network size={26}/></span><strong>Ecossistema Solus</strong><small>Selecione um território para explorar</small></div>
              <div className="atlas-territories">{AREAS.filter((d) => !area || area === d).map((d) => {
                    const items = repos.filter((r) => r.dominio === d);
                    if (!items.length)
                        return null;
                    return <section key={d} className={`atlas-territory territory-${d}`} style={{ '--territory': DOMINIOS[d].cor } as React.CSSProperties}><header><span className="atlas-territory-mark"><Layers3 size={16}/></span><div><h4>{DOMINIOS[d].nome}</h4><p>{DOMINIOS[d].descricao}</p></div><b>{items.length}</b></header><div className="atlas-nodes">{items.map((r) => <button key={r.id} data-repo={r.id} className={`atlas-node ${selecionado === r.id ? 'selected' : ''} ${visitados.includes(r.id) ? 'visited' : ''}`} onClick={() => explorar(r.id)} aria-pressed={selecionado === r.id}><span className="atlas-node-dot">{visitados.includes(r.id) ? <Check size={10}/> : null}</span><span>{r.nome}</span>{r.catalogados > 0 && <small>{r.catalogados}</small>}</button>)}</div></section>;
                })}</div>
              {!repos.length && <div className="atlas-empty"><Search size={26}/><h3>Nenhum sistema encontrado</h3><p>Tente outro nome ou selecione todos os territórios.</p></div>}
            </div></div>
            <div className="atlas-map-footer"><span><i />Visitado</span><span><i />Pistas a explorar</span><p>Linhas = referências no código ou documentação · selecione um sistema para seguir as conexões.</p></div>
            {remotosSemIndice.length > 0 && <details className="atlas-unindexed"><summary>{remotosSemIndice.length} outros repositórios encontrados no Git <ChevronRight size={14}/></summary><p>Ainda sem leitura do código. Para incluir regras e conexões, selecione o sistema para priorizar a leitura direta no Git.</p><div>{remotosSemIndice.filter((r) => !busca || r.nome.toLowerCase().includes(busca.toLowerCase())).map((r) => <button key={r.nome} onClick={() => { explorar(r.nome); setAba('novidades'); }}>{r.nome}<ArrowRight size={12}/></button>)}</div></details>}
          </>}

          {aba === 'regras' && <section className="atlas-library"><div className="atlas-section-heading"><div><span className="atlas-overline">DOS CÓDIGOS ÀS PERGUNTAS CERTAS</span><h3>Pistas de regras de negócio</h3><p>{numero(totalRegras)} ocorrências catalogadas{selecionado ? ` em ${selecionado}` : ' nos sistemas indexados'}.</p></div>{selecionado && <button className="atlas-button" onClick={() => { setSelecionado(''); setRegra(null); }}>Todos os sistemas<X size={14}/></button>}</div><div className="atlas-categories"><button className={!categoria ? 'active' : ''} onClick={() => setCategoria('')}>Todas</button>{Object.entries(CATEGORIAS).map(([c, label]) => <button key={c} className={categoria === c ? 'active' : ''} onClick={() => setCategoria(c as Categoria)}>{label}</button>)}</div><p className="atlas-caption"><ShieldCheck size={14}/>Detectadas automaticamente · aguardam validação de negócio</p><div className="atlas-rule-grid">{regras.map((r) => <button className="atlas-rule-card" key={r.id} onClick={() => { setRegra(r); setSelecionado(r.repo); }}><div><span className={`atlas-category cat-${r.categoria}`}>{CATEGORIAS[r.categoria]}</span><ArrowRight size={16}/></div><small>{r.repo}{r.explicacao ? ' · leitura técnica disponível' : ''}</small><h4>{r.titulo}</h4><p>{r.resumo}</p><footer><span>{r.cnpjs[0] || r.fonte.arquivo.split('/').pop()}</span><span>Explorar fonte</span></footer></button>)}</div>{carregandoRegras && <p className="atlas-caption" role="status">Buscando pistas…</p>}{erroRegras && <p role="alert" className="atlas-warning">{erroRegras}</p>}{!carregandoRegras && !erroRegras && !regras.length && <div className="atlas-empty"><Search size={30}/><h3>Nenhuma pista com estes filtros</h3><p>Experimente outro assunto, remova o sistema selecionado ou busque o CNPJ só com números.</p><button className="atlas-button" onClick={() => { setBusca(''); setCategoria(''); setArea(''); setSelecionado(''); }}>Limpar filtros</button></div>}{totalRegras > 12 && <div className="atlas-pagination"><button aria-label="Página anterior" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}><ArrowLeft size={15}/></button><span>Página {pagina} de {Math.ceil(totalRegras / 12)}</span><button aria-label="Próxima página" disabled={pagina * 12 >= totalRegras} onClick={() => setPagina(pagina + 1)}><ArrowRight size={15}/></button></div>}</section>}

          {aba === 'novidades' && <section className="atlas-library"><div className="atlas-section-heading"><div><span className="atlas-overline">CONHECIMENTO EM MOVIMENTO</span><h3>O que está mudando no universo?</h3><p>Atividade recente dos repositórios. Uma atualização no Git não confirma publicação para o cliente.</p></div></div><div className="atlas-updates">{(reposGit.length ? reposGit : catalogo.repos.map((r) => ({ nome: r.nome, descricao: r.descricao, atualizadoEm: r.atualizadoEm, branch: r.branch, url: r.url, arquivado: false }))).filter((r) => (!busca || `${r.nome} ${r.descricao}`.toLowerCase().includes(busca.toLowerCase())) && (!area || catalogo.repos.find((p) => p.id === r.nome)?.dominio === area)).sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm)).map((r) => <button key={r.nome} onClick={() => explorar(r.nome)} className={selecionado === r.nome ? 'active' : ''}><span className="atlas-update-icon"><GitBranch size={18}/></span><div><strong>{r.nome}</strong><p>{r.descricao || 'Selecione para consultar commits e PRs recentes.'}</p></div><time>{formatDate(r.atualizadoEm)}</time><ChevronRight size={16}/></button>)}</div></section>}
        </div>

        {selecionado && <aside ref={detailRef} tabIndex={-1} className="atlas-detail" aria-label={`Detalhes de ${selecionado}`}><div className="atlas-detail-top"><span className="atlas-overline">TERRITÓRIO EM FOCO</span><button className="atlas-icon-button" aria-label="Fechar detalhes" onClick={() => { setSelecionado(''); setRegra(null); }}><X size={18}/></button></div><span className="atlas-detail-icon" style={{ color: repo ? DOMINIOS[repo.dominio].cor : undefined }}><Layers3 size={27}/></span><h3>{selecionado}</h3><p>{reposGit.find((r) => r.nome === selecionado)?.descricao || repo?.descricao || 'Repositório descoberto no Git, aguardando a leitura das fontes do Git.'}</p><div className="atlas-detail-badges"><span><GitBranch size={12}/>{repo?.branch || 'Git'}</span><span>{repo ? `${numero(repo.arquivos)} arquivos lidos` : 'Código não indexado'}</span></div>
          {divergente && <div className="atlas-warning">Há diferenças entre a branch no Git e o mapa salvo. Releia o código antes de confiar na atualidade das pistas.</div>}{repo?.estadoLeitura === 'erro' && <div className="atlas-warning">{repo.erroLeitura}</div>}{repo?.estadoLeitura !== 'concluido' && <p className="atlas-caption">Leitura {repo?.estadoLeitura === 'lendo' ? 'em andamento' : 'pendente'}: {repo?.arquivos ?? 0} de {repo?.arquivosTotal ?? '…'} arquivos. Selecione este sistema para priorizar a leitura.</p>}{repo?.alterado && <div className="atlas-warning">O checkout tinha alterações locais. Elas não comprovam uma versão publicada.</div>}
          {regra ? <div className="atlas-rule-detail"><button className="atlas-back" onClick={() => setRegra(null)}><ArrowLeft size={14}/>Voltar ao sistema</button><span className={`atlas-category cat-${regra.categoria}`}>{CATEGORIAS[regra.categoria]}</span><h4>{regra.titulo}</h4><p>{regra.resumo}</p>{regra.explicacao && <div className="atlas-explanation"><span className="atlas-category">Leitura técnica · negócio a validar</span><h5>Quando acontece</h5><p>{regra.explicacao.quando}</p><h5>O que o sistema faz</h5><p>{regra.explicacao.efeito}</p><h5>Até onde esta leitura vale</h5><p>{regra.explicacao.limites}</p></div>}<h5>O que investigar</h5><ul><li>Qual condição ativa este comportamento?</li><li>Quais parâmetros e datas influenciam o resultado?</li><li>A revision do cliente contém esta versão?</li></ul>{regra.cnpjs.length > 0 && <><h5>Documentos encontrados</h5>{regra.cnpjs.map((c) => <button className="atlas-document" key={c} onClick={() => { setBusca(c); setSelecionado(''); setRegra(null); setAba('regras'); }}>{c}<Search size={13}/></button>)}<p>Menção literal; exclusividade por cliente ainda não confirmada.</p></>}<details className="atlas-source"><summary>Ver evidência técnica</summary><code>{regra.fonte.arquivo}:{regra.fonte.linha}</code><pre>{regra.fonte.trecho}</pre></details>{regra.fonte.url ? <a className="atlas-source-link" href={regra.fonte.url} target="_blank" rel="noreferrer">Abrir fonte na versão indexada<ExternalLink size={14}/></a> : <p className="atlas-caption">Fonte sem link disponível nesta leitura.</p>}<span className="atlas-caption">Leitura automática · não validada como regra</span></div> : <>
            <section className="atlas-detail-section"><h4><Network size={16}/>Como se conecta <span>{conexoes.length}</span></h4>{!conexoes.length && <p>Nenhuma conexão comprovada pelo indexador neste recorte. Isso não significa que o sistema seja independente.</p>}{conexoes.map((c, i) => <div className="atlas-connection" key={`${c.origem}-${c.destino}-${i}`}><button onClick={() => explorar(c.origem === selecionado ? c.destino : c.origem)}>{c.origem}<ArrowRight size={13}/>{c.destino}</button><p>{c.motivo}</p><details><summary>Por que esta conexão existe?</summary><p>{c.arquivo}:{c.linha}<br />{numero(c.ocorrencias)} referências detectadas.</p></details></div>)}</section>
            <section className="atlas-detail-section"><h4><Layers3 size={16}/>Pistas para descobrir <span>{numero(repo?.catalogados ?? 0)}</span></h4>{(Object.keys(CATEGORIAS) as Categoria[]).map((c) => { const total = repo?.categorias?.[c] ?? 0; return total > 0 ? <button key={c} className="atlas-detail-category" onClick={() => { setCategoria(c); setAba('regras'); setBusca(''); }}>{CATEGORIAS[c]}<span>{numero(total)}<ChevronRight size={13}/></span></button> : null; })}{repo && <p>{numero(repo.sinais)} sinais no código; {numero(repo.catalogados)} exemplos catalogados. {repo.ignorados > 0 && `${numero(repo.ignorados)} arquivos fora da leitura.`}</p>}</section>
            <section className="atlas-detail-section"><h4><GitBranch size={16}/>Últimos movimentos</h4>{carregandoNovidades && <p role="status">Consultando o Git…</p>}{erroNovidades && <p role="status">{erroNovidades}</p>}{!carregandoNovidades && !novidades.length && !erroNovidades && <p>Nenhum movimento encontrado nesta consulta.</p>}{novidades.slice(0, 6).map((n) => <a className="atlas-timeline-item" key={n.url} href={n.url} target="_blank" rel="noreferrer"><i /><small>{formatDate(n.data)} · {n.tipo === 'pr' ? 'PR mergeado' : 'Alteração no código'}</small><span>{n.titulo}<ExternalLink size={12}/></span></a>)}</section>
          </>}
        </aside>}
      </div>}
    </section>

    <section className="atlas-discover"><div className="atlas-discover-title"><span className="atlas-eyebrow"><Compass size={14}/> NÃO SABE POR ONDE COMEÇAR?</span><h3>Escolha sua próxima descoberta.</h3><p>Percursos curtos para ligar os pontos, sem precisar ler código.</p></div><div className="atlas-journeys">{TRILHAS.map((t, i) => <button key={t.nome} onClick={() => iniciarTrilha(i)} disabled={!catalogo}><span className={`atlas-journey-icon journey-${i}`}>{i === 0 ? <Network size={22}/> : i === 1 ? <ShieldCheck size={22}/> : <Telescope size={22}/>}</span><small>TRILHA 0{i + 1} · 3 PARADAS</small><h4>{t.nome}</h4><p>{t.texto}</p><span className="atlas-journey-link">Começar a explorar<ArrowRight size={16}/></span></button>)}</div></section>
    <footer className="atlas-footer"><span><ShieldCheck size={14}/>Conhecimento com origem, contexto e limites.</span><span>{ocupado ? 'Relendo código…' : 'Mapa lido em'} {catalogo ? formatDate(catalogo.geradoEm) : '…'} · <button onClick={() => setAjuda(true)}>Entenda a cobertura</button></span></footer>
  </div>;
}
