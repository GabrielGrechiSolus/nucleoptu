'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import withAuth from '../components/withAuth';
import { usePessoa } from '../components/usePessoa';
import { SortTh, sortRows, useSort } from '../components/SortableTable';
import { BmColuna } from '../chamados/BmPainel';
import { chamadosDaPessoa, soDigitos, type RegistroBm } from '../chamados/bmRegistro';
import { lerRegistrosBm } from '../chamados/bmSync';
import { indiceDoChamado, textoDoBm } from '../chamados/buscaChamado';
import { lerChamados } from '../chamados/chamadosDados';
import BotaoAtualizarDados from '../components/BotaoAtualizarDados';
import type { Chamado } from '../chamados/parse';
import { ROTULO_SITUACAO } from '../chamados/parse';
import { ArrowDown, GripVertical, ListChecks } from 'lucide-react';
import { concluido, ehReport, formataNumero, registroResumoDoCartao, reportsAtivos, reportsPorNumero, ROTULO_SECAO, type CartaoQuadro } from '../chamados/bmQuadro';
import { buscaEuBm, lerQuadroBm, type MetaQuadro } from '../chamados/bmQuadroSync';
import type { EuBm } from '../chamados/bmChave';
import ProcessoTela from './ProcessoTela';
import { aplicarProcesso, lerProcesso } from './clienteProcesso';
import Link from 'next/link';
import { useDetalheNaUrl } from '../components/TelaDetalhe';
import { EVENTO_DADOS_ATUALIZADOS } from '../components/AtualizaAoEntrar';
import { permissaoProcessos } from './clienteProcesso';
import { FILTROS_INICIAIS, filtrosAtivos, passaFiltros, type FiltrosProcessos } from './filtros';

function chamadoMinimo(c: CartaoQuadro): Chamado {
  return {
    id: c.numero || String(c.cardId),
    numero: c.numero ? formataNumero(c.numero) : String(c.cardId),
    cliente: '',
    assunto: c.titulo,
    resumo: '',
    status: '',
    revision: '',
    previsaoRevision: '',
    atualizadoEm: '',
    prs: [],
    branches: [],
    evidencias: [],
    planosTeste: [],
    temPr: false,
    temEvidencia: false,
    temPlano: false,
    temBm: true,
    tipo: '',
    situacao: '',
    modulo: '',
    caminhoTela: '',
    publicadoEm: '',
    temRegra: false,
    autores: [],
    autoresLogin: [],
    docs: {},
  };
}

function ProcessosPage() {
  const pessoa = usePessoa();
  const [itens, setItens] = useState<Chamado[]>([]);
  const [registros, setRegistros] = useState<Record<string, RegistroBm>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [permissao, setPermissao] = useState<{ permitido: boolean; motivo: string } | null>(null);
  const [filtros, setFiltros] = useState<FiltrosProcessos>(FILTROS_INICIAIS);
  const [quadro, setQuadro] = useState<CartaoQuadro[]>([]);
  const [metaQuadro, setMetaQuadro] = useState<MetaQuadro | null>(null);
  const [eu, setEu] = useState<EuBm | null>(null);
  const [visualizacao, setVisualizacao] = useState<'lista' | 'kanban'>('kanban');
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [movendo, setMovendo] = useState(false);
  const urlChamado = useDetalheNaUrl('chamado');
  const urlCartao = useDetalheNaUrl('cartao');
  const { sort, toggleSort } = useSort({ key: 'numero', dir: 'desc' });

  const carregar = useCallback(async (atualizar = false) => {
    setCarregando(true);
    setErro('');
    try {
      const [lista, regs, q] = await Promise.all([lerChamados(atualizar), lerRegistrosBm(atualizar), lerQuadroBm(atualizar).catch(() => ({ cartoes: [] as CartaoQuadro[], meta: null }))]);
      setItens(lista);
      setRegistros(regs);
      setQuadro(q.cartoes);
      setMetaQuadro(q.meta);
    } catch (e) {
      setErro(`Não foi possível carregar os dados (${(e as { code?: string })?.code ?? 'erro'}).`);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
    permissaoProcessos().then(setPermissao);
    buscaEuBm().then(setEu);
    const recarrega = () => void carregar();
    window.addEventListener(EVENTO_DADOS_ATUALIZADOS, recarrega);
    return () => window.removeEventListener(EVENTO_DADOS_ATUALIZADOS, recarrega);
  }, [carregar]);



  const reports = useMemo(() => reportsPorNumero(quadro), [quadro]);
  const comPr = useMemo(() => new Set(itens.filter((c) => c.temPr).map((c) => c.id)), [itens]);
  const quadroPorId = useMemo(() => new Map(quadro.map((c) => [c.cardId, c])), [quadro]);
  const semPrBase = useMemo(() => quadro.filter((c) => !ehReport(c) && eu?.id && c.ownerId === eu.id && (!c.numero || !comPr.has(c.numero))), [quadro, eu, comPr]);
  const temReport = useCallback((numero: string) => reportsAtivos(reports.get(numero)).length > 0, [reports]);
  const semPr = useMemo(
    () =>
      semPrBase.filter((c) =>
        passaFiltros(
          { texto: [c.numero, c.titulo, c.tipo, c.coluna, c.responsavel, ...textoDoBm(registros[soDigitos(c.numero)], [c], pessoa.semGit)].join(' '), coluna: c.coluna, concluido: concluido(c), bloqueado: c.bloqueado, report: temReport(c.numero), situacao: '', cliente: '', temPr: false },
          filtros,
        ),
      ),
    [semPrBase, filtros, temReport],
  );

  const meus = useMemo(() => chamadosDaPessoa(itens, pessoa.gitUser).filter((c) => registros[soDigitos(c.numero)]?.encontrado), [itens, pessoa.gitUser, registros]);

  const concluidoDoChamado = useCallback(
    (c: Chamado) => {
      const reg = registros[soDigitos(c.numero)];
      const doQuadro = reg?.cardId ? quadroPorId.get(reg.cardId) : undefined;
      if (doQuadro) return concluido(doQuadro);
      return reg?.resumo?.secao === 'Concluído' || reg?.resumo?.secao === 'Documentado';
    },
    [registros, quadroPorId],
  );

  const linhas = useMemo(() => {
    const filtradas = meus.filter((c) => {
      const resumo = registros[soDigitos(c.numero)]?.resumo;
      return passaFiltros(
        { texto: [indiceDoChamado(c, registros[soDigitos(c.numero)], quadro.filter((q) => q.numero === soDigitos(c.numero)), pessoa.semGit).tudo].join(' '), coluna: resumo?.coluna ?? '', concluido: concluidoDoChamado(c), bloqueado: !!resumo?.bloqueado, report: temReport(soDigitos(c.numero)), situacao: c.situacao, cliente: c.cliente, temPr: true },
        filtros,
      );
    });
    return sortRows(filtradas, sort, {
      numero: (c) => c.id,
      assunto: (c) => c.assunto,
      situacao: (c) => (c.situacao ? ROTULO_SITUACAO[c.situacao] : ''),
      bm: (c) => registros[soDigitos(c.numero)]?.resumo?.coluna ?? '',
    });
  }, [meus, filtros, sort, registros, concluidoDoChamado, temReport]);

  const opcoes = useMemo(() => {
    const colunas = new Set<string>();
    for (const c of meus) {
      const col = registros[soDigitos(c.numero)]?.resumo?.coluna;
      if (col) colunas.add(col);
    }
    for (const c of semPrBase) if (c.coluna) colunas.add(c.coluna);
    return {
      colunas: [...colunas].sort(),
      situacoes: [...new Set(meus.map((c) => c.situacao).filter(Boolean))].sort(),
      clientes: [...new Set(meus.map((c) => c.cliente).filter(Boolean))].sort(),
    };
  }, [meus, semPrBase, registros]);

  const altera = <K extends keyof FiltrosProcessos>(k: K, v: FiltrosProcessos[K]) => setFiltros((a) => {
    const novo = { ...a, [k]: v };
    if (k !== 'busca' || !a.busca === !v) return novo;
    return { ...novo, andamento: v ? 'todos' : FILTROS_INICIAIS.andamento };
  });

  const aberto = useMemo(() => (urlChamado.valor ? itens.find((c) => soDigitos(c.numero) === urlChamado.valor) ?? null : null), [itens, urlChamado.valor]);
  const abertoSemPr = useMemo(() => (urlCartao.valor ? quadro.find((c) => String(c.cardId) === urlCartao.valor) ?? null : null), [quadro, urlCartao.valor]);
  const registroAberto = aberto ? registros[soDigitos(aberto.numero)] : undefined;

  const cardsKanban = useMemo(() => quadro.filter((c) => {
    if (ehReport(c) || !eu?.id || c.ownerId !== eu.id) return false;
    return passaFiltros({ texto: [c.numero, c.titulo, c.tipo, c.coluna, c.responsavel, ...textoDoBm(registros[soDigitos(c.numero)], [c], pessoa.semGit)].join(' '), coluna: c.coluna, concluido: concluido(c), bloqueado: c.bloqueado, report: temReport(c.numero), situacao: '', cliente: '', temPr: comPr.has(c.numero) }, filtros);
  }), [quadro, eu, filtros, temReport, comPr]);
  const moverProximaEtapa = async (card: CartaoQuadro, secaoDestino: number) => {
    if (movendo || secaoDestino !== card.secao + 1 || card.bloqueado) return;
    setMovendo(true); setErro('');
    try {
      const estado = await lerProcesso(card.cardId, card.numero || String(card.cardId), true);
      const destino = estado.colunas.filter((coluna) => (coluna.secao ?? 0) === secaoDestino).sort((a, b) => a.posicao - b.posicao)[0];
      if (!destino) throw new Error('Não há uma coluna seguinte configurada para este cartão.');
      const gravacao = await aplicarProcesso(card.cardId, card.numero || String(card.cardId), [{ tipo: 'mover', colunaId: destino.id }]);
      const falha = gravacao.resultados.find((r) => !r.ok);
      if (falha) throw new Error(falha.erro || falha.descricao);
      await carregar();
    } catch (e) {
      setErro(`Não foi possível mover ${card.numero || card.cardId}: ${(e as Error).message}`);
    } finally { setMovendo(false); setArrastando(null); }
  };
  const soltarNaSecao = (e: React.DragEvent<HTMLDivElement>, secao: number) => {
    e.preventDefault();
    const cardId = Number(e.dataTransfer.getData('text/plain'));
    const card = cardsKanban.find((c) => c.cardId === cardId);
    if (card) void moverProximaEtapa(card, secao);
  };

  if (permissao && !permissao.permitido) {
    return (
      <div className="rel-page mx-auto max-w-xl">
        <section className="rel-box">
          <h1 className="rel-title rel-title-line"><ListChecks size={20} /> Processos do BM</h1>
          <p className="rel-notice rel-notice-alert">{permissao.motivo || 'Esta tela é liberada para os perfis Desenvolvimento e Análise.'}</p>
          <p className="rel-desc mt-3">Para usar, informe a sua chave do Businessmap em Perfil → Businessmap.</p>
        </section>
      </div>
    );
  }

  if ((urlChamado.valor || urlCartao.valor) && carregando) {
    return <p className="rel-desc">Carregando...</p>;
  }

  if (abertoSemPr) {
    return (
      <ProcessoTela
        key={abertoSemPr.cardId}
        chamado={chamadoMinimo(abertoSemPr)}
        registro={{ chamado: abertoSemPr.numero || String(abertoSemPr.cardId), encontrado: true, cardId: abertoSemPr.cardId, resumo: registroResumoDoCartao(abertoSemPr), cartao: null, sincronizadoEm: metaQuadro?.sincronizadoEm ?? '', sincronizadoPor: metaQuadro?.por ?? '' }}
        onVoltar={urlCartao.voltar}
        rotuloVoltar="Voltar aos processos"
        onGravado={() => void carregar()}
      />
    );
  }

  if (aberto && registroAberto) {
    return <ProcessoTela key={aberto.id} chamado={aberto} registro={registroAberto} onVoltar={urlChamado.voltar} rotuloVoltar="Voltar aos processos" onGravado={() => void carregar()} />;
  }

  return (
    <div className="rel-page">
      <section className="rel-box">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="rel-title rel-title-line"><ListChecks size={20} /> Processos do BM</h1>
          <BotaoAtualizarDados carregando={carregando} onAtualizar={() => void carregar(true)} />
        </div>
        <p className="rel-desc mb-4">Preenche o texto de conclusão e os links a partir do Git, marca os critérios de saída que o Git comprova, comenta e move o cartão. Cada gravação pede a sua confirmação.</p>
        <div className="rel-filters">
          <div className="rel-field rel-filter-wide">
            <label className="rel-label" htmlFor="busca-processos">Pesquisar</label>
            <input id="busca-processos" value={filtros.busca} onChange={(e) => altera('busca', e.target.value)} placeholder="Chamado, assunto, cliente ou módulo" className="rel-input" />
          </div>
          <label className="rel-field rel-label">
            Mostrar
            <select value={filtros.mostrar} onChange={(e) => altera('mostrar', e.target.value as FiltrosProcessos['mostrar'])} className="rel-input">
              <option value="todos">Com e sem PR</option>
              <option value="com">Só com PR</option>
              <option value="sem">Só sem PR</option>
            </select>
          </label>
          <label className="rel-field rel-label">
            Andamento
            <select value={filtros.andamento} onChange={(e) => altera('andamento', e.target.value as FiltrosProcessos['andamento'])} className="rel-input">
              <option value="andamento">Em andamento</option>
              <option value="concluidos">Concluídos</option>
              <option value="todos">Todos</option>
            </select>
          </label>
          <label className="rel-field rel-label">
            Coluna no BM
            <select value={filtros.coluna} onChange={(e) => altera('coluna', e.target.value)} className="rel-input">
              <option value="">Todas</option>
              {opcoes.colunas.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          <label className="rel-field rel-label">
            Situação
            <select value={filtros.situacao} onChange={(e) => altera('situacao', e.target.value)} className="rel-input">
              <option value="">Todas</option>
              {opcoes.situacoes.map((o) => <option key={o} value={o}>{ROTULO_SITUACAO[o] ?? o}</option>)}
            </select>
          </label>
          <label className="rel-field rel-label">
            Cliente
            <select value={filtros.cliente} onChange={(e) => altera('cliente', e.target.value)} className="rel-input">
              <option value="">Todos</option>
              {opcoes.clientes.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
          <label className="rel-field rel-label">
            Report
            <select value={filtros.report} onChange={(e) => altera('report', e.target.value as FiltrosProcessos['report'])} className="rel-input">
              <option value="todos">Todos</option>
              <option value="com">Com report</option>
              <option value="sem">Sem report</option>
            </select>
          </label>
          <label className="rel-field rel-label">
            Bloqueio
            <select value={filtros.bloqueado} onChange={(e) => altera('bloqueado', e.target.value as FiltrosProcessos['bloqueado'])} className="rel-input">
              <option value="todos">Todos</option>
              <option value="sim">Bloqueados</option>
              <option value="nao">Não bloqueados</option>
            </select>
          </label>
          <div className="rel-filter-actions">
            <button onClick={() => setFiltros(FILTROS_INICIAIS)} disabled={filtrosAtivos(filtros) === 0} className="rel-btn rel-btn-ghost">Limpar filtros{filtrosAtivos(filtros) ? ` (${filtrosAtivos(filtros)})` : ''}</button>
          </div>
        </div>
        <p className="rel-desc mt-3">{linhas.length} chamado(s) com PR e {semPr.length} sem PR nos filtros atuais.</p>
        <div className="mt-3 inline-flex rounded-lg border border-[var(--rel-line)] p-1"><button type="button" onClick={() => setVisualizacao('kanban')} className={`rel-btn rel-btn-sm ${visualizacao === 'kanban' ? 'rel-btn-primary' : 'rel-btn-ghost'}`}>Kanban</button><button type="button" onClick={() => setVisualizacao('lista')} className={`rel-btn rel-btn-sm ${visualizacao === 'lista' ? 'rel-btn-primary' : 'rel-btn-ghost'}`}>Lista</button></div>
      </section>

      {erro && <p className="rel-notice rel-notice-error">{erro}</p>}

      {visualizacao === 'kanban' && <section className="grid items-start gap-3 overflow-x-auto pb-2 sm:grid-cols-2 xl:grid-cols-5">
        {[1, 2, 3, 4, 5].map((secao) => (
          <div key={secao} onDragOver={(e) => e.preventDefault()} onDrop={(e) => soltarNaSecao(e, secao)} className={`min-h-64 rounded-xl border p-3 transition-colors ${(arrastando ? (cardsKanban.find((c) => c.cardId === arrastando)?.secao ?? -1) + 1 === secao : false) ? 'border-[var(--rel-primary)] bg-[var(--rel-primary-soft)]' : 'border-[var(--rel-line)] bg-[var(--rel-bg)]'}`}>
            <header className="mb-3 flex items-center justify-between"><h2 className="font-semibold">{ROTULO_SECAO[secao]}</h2><span className="rel-tag rel-tag-info">{cardsKanban.filter((c) => c.secao === secao).length}</span></header>
            <div className="space-y-2">
              {cardsKanban.filter((c) => c.secao === secao).map((card) => (
                <article key={card.cardId} draggable={!movendo && !card.bloqueado && secao < 5} onDragStart={(e) => { setArrastando(card.cardId); e.dataTransfer.setData('text/plain', String(card.cardId)); }} onDragEnd={() => setArrastando(null)} onClick={() => urlCartao.abrir(String(card.cardId))} className={`cursor-pointer rounded-lg border border-[var(--rel-line)] bg-[var(--rel-surface)] p-3 shadow-sm ${card.bloqueado ? 'opacity-60' : 'hover:border-[var(--rel-primary)]'} ${arrastando === card.cardId ? 'opacity-40' : ''}`}>
                  <div className="mb-2 flex items-start justify-between gap-2"><span className="rel-mono text-xs">{card.numero ? formataNumero(card.numero) : card.cardId}</span>{!card.bloqueado && secao < 5 && <GripVertical size={16} className="text-[var(--rel-muted)]" aria-label="Arraste para a próxima etapa"/>}</div>
                  <strong className="block text-sm">{card.titulo}</strong><p className="rel-desc mt-1">{card.coluna}</p>{card.bloqueado && <span className="rel-tag rel-tag-error mt-2">Bloqueado</span>}
                  {!card.bloqueado && secao < 5 && <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><p className="flex items-center gap-1 text-[11px] text-[var(--rel-muted)]"><ArrowDown size={12}/> Arraste para a próxima etapa</p><button type="button" disabled={movendo} onClick={(e) => { e.stopPropagation(); void moverProximaEtapa(card, secao + 1); }} className="rel-btn rel-btn-ghost rel-btn-sm">Avançar</button></div>}
                </article>
              ))}
            </div>
            {!cardsKanban.some((c) => c.secao === secao) && <p className="rel-empty text-xs">Solte aqui para avançar o cartão.</p>}
          </div>
        ))}
        {movendo && <p className="rel-desc col-span-full">Validando critérios de saída e atualizando o Businessmap…</p>}
      </section>}

      {visualizacao === 'lista' && filtros.mostrar !== 'sem' && (
      <section className="rel-table-wrap">
        <table className="w-full text-left text-sm">
          <thead className="text-xs">
            <tr>
              <SortTh label="Chamado" k="numero" sort={sort} onSort={toggleSort} />
              <SortTh label="Assunto" k="assunto" sort={sort} onSort={toggleSort} />
              <SortTh label="Situação" k="situacao" sort={sort} onSort={toggleSort} className="hidden md:table-cell" />
              <SortTh label="Coluna no BM" k="bm" sort={sort} onSort={toggleSort} />
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {carregando && <tr><td colSpan={5} className="rel-empty">Carregando...</td></tr>}
            {!carregando && !linhas.length && (
              <tr><td colSpan={5} className="rel-empty">{meus.length ? "Nenhum chamado com esses filtros." : "Nenhum chamado seu com cartão do BM sincronizado; a atualização automática será feita quando alguém com acesso estiver conectado."}</td></tr>
            )}
            {linhas.map((c) => (
              <tr key={c.id} onClick={() => urlChamado.abrir(soDigitos(c.numero))} className="rel-row">
                <td className="rel-mono whitespace-nowrap px-3 py-2"><Link href={urlChamado.hrefDe(soDigitos(c.numero))} onClick={(e) => e.stopPropagation()} className="rel-link">{c.numero}</Link></td>
                <td className="max-w-[420px] px-3 py-2"><div className="rel-strong">{c.assunto}</div><div className="rel-desc">{c.cliente || '—'}</div>{reportsAtivos(reports.get(soDigitos(c.numero))).length > 0 && <div className="mt-1"><span className="rel-tag rel-tag-error">Report {reportsAtivos(reports.get(soDigitos(c.numero))).map((r) => r.coluna).join(', ')}</span></div>}</td>
                <td className="hidden px-3 py-2 md:table-cell">{c.situacao ? ROTULO_SITUACAO[c.situacao] : '—'}</td>
                <td className="px-3 py-2"><BmColuna r={registros[soDigitos(c.numero)]?.resumo} /></td>
                <td className="px-3 py-2 text-right"><span className="rel-btn rel-btn-primary rel-btn-sm">Processo</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      )}

      {visualizacao === 'lista' && filtros.mostrar !== 'com' && (
      <>
      <section className="rel-box">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="rel-title" style={{ marginBottom: 0 }}>Chamados sem PR</h2>
            <p className="rel-desc">Cartões do BM em que você é o responsável e que não têm PR. Os reports abertos aparecem em destaque.</p>
          </div>
        </div>
        {!eu?.id && <p className="rel-notice rel-notice-alert mt-3">Não foi possível identificar o seu usuário no BM. Confira a chave em Perfil → Businessmap.</p>}
        {eu?.id && !metaQuadro && <p className="rel-notice mt-3">Aguardando a sincronização automática do quadro do Businessmap.</p>}
      </section>

      <section className="rel-table-wrap">
        <table className="w-full text-left text-sm">
          <thead className="text-xs">
            <tr>
              <th className="px-3 py-2">Chamado</th>
              <th className="px-3 py-2">Assunto</th>
              <th className="px-3 py-2">Coluna no BM</th>
              <th className="px-3 py-2">Atenção</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {!semPr.length && <tr><td colSpan={5} className="rel-empty">{semPrBase.length ? 'Nenhum cartão sem PR com esses filtros.' : 'Nenhum cartão seu sem PR.'}</td></tr>}
            {semPr.map((c) => {
              const rep = reportsAtivos(reports.get(c.numero));
              return (
                <tr key={c.cardId} onClick={() => urlCartao.abrir(String(c.cardId))} className="rel-row">
                  <td className="rel-mono whitespace-nowrap px-3 py-2"><Link href={urlCartao.hrefDe(String(c.cardId))} onClick={(e) => e.stopPropagation()} className="rel-link">{c.numero ? formataNumero(c.numero) : c.cardId}</Link></td>
                  <td className="max-w-[420px] px-3 py-2"><div className="rel-strong">{c.titulo}</div><div className="rel-desc">{c.tipo || '—'}</div></td>
                  <td className="px-3 py-2"><span className={`rel-tag ${concluido(c) ? 'rel-tag-ok' : 'rel-tag-info'}`}>{c.coluna}</span></td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {rep.length > 0 && <span className="rel-tag rel-tag-error">Report {rep.map((r) => r.coluna).join(', ')}</span>}
                      {c.bloqueado && <span className="rel-tag rel-tag-error">Bloqueado</span>}
                      {!rep.length && !c.bloqueado && <span className="rel-desc">—</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right"><span className="rel-btn rel-btn-primary rel-btn-sm">Processo</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      </>
      )}
    </div>
  );
}

export default withAuth(ProcessosPage);
