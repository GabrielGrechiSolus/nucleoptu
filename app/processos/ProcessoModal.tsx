'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { htmlParaTexto } from '../chamados/bm';
import type { Chamado } from '../chamados/parse';
import type { RegistroBm } from '../chamados/bmRegistro';
import { anexaLinksNaDescricao, avaliaCriterio, linksGitDoChamado, linksQueFaltam, propostasDeCampos, textoConclusaoComplementado, type PropostaCampo } from './automacao';
import { aplicarProcesso, lerProcesso, simularProcesso, type EstadoProcesso, type MudancaProcesso, type RequisicaoSimulada, type ResultadoGravacao } from './clienteProcesso';

const norma = (t: string) => t.replace(/\s+/g, ' ').trim().toLowerCase();

type SituacaoCampo = 'igual' | 'vazio' | 'diferente';

const situacaoDoCampo = (atual: string, proposto: string): SituacaoCampo => (!atual.trim() ? 'vazio' : norma(atual) === norma(proposto) ? 'igual' : 'diferente');

const ROTULO_SITUACAO: Record<SituacaoCampo, string> = { igual: 'já igual', vazio: 'vazio no BM', diferente: 'diferente do Git' };
const COR_SITUACAO: Record<SituacaoCampo, string> = { igual: 'bg-emerald-500/15 text-emerald-300', vazio: 'bg-amber-500/15 text-amber-300', diferente: 'bg-sky-500/15 text-sky-300' };

function Bloco({ titulo, children, className = '' }: { titulo: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-zinc-800 p-4 ${className}`}>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">{titulo}</h3>
      {children}
    </section>
  );
}

export default function ProcessoModal({ chamado, registro, onClose, onGravado }: { chamado: Chamado; registro: RegistroBm; onClose: () => void; onGravado: () => void }) {
  const cardId = registro.cardId ?? 0;
  const [estado, setEstado] = useState<EstadoProcesso | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [campoMarcado, setCampoMarcado] = useState<Record<string, boolean>>({});
  const [criterioMarcado, setCriterioMarcado] = useState<Record<number, boolean>>({});
  const [linksMarcado, setLinksMarcado] = useState(false);
  const [comentario, setComentario] = useState('');
  const [comentarioMarcado, setComentarioMarcado] = useState(false);
  const [moverMarcado, setMoverMarcado] = useState(false);
  const [destino, setDestino] = useState(0);
  const [simulacao, setSimulacao] = useState<RequisicaoSimulada[] | null>(null);
  const [resultados, setResultados] = useState<ResultadoGravacao[] | null>(null);
  const [trabalhando, setTrabalhando] = useState(false);

  const propostas = useMemo<PropostaCampo[]>(() => propostasDeCampos(chamado), [chamado]);

  const iniciaSelecao = useCallback(
    (e: EstadoProcesso) => {
      const v: Record<string, string> = {};
      const m: Record<string, boolean> = {};
      for (const p of propostas) {
        const campo = e.campos.find((c) => c.chave === p.chave);
        v[p.chave] = p.valor;
        const sit = situacaoDoCampo(campo?.valorAtual ?? '', p.valor);
        const padraoSomente = p.chave === 'texto' && !textoConclusaoComplementado(campo?.valorAtual ?? '');
        m[p.chave] = !!campo?.disponivel && (sit === 'vazio' || (sit === 'diferente' && padraoSomente));
      }
      setValores(v);
      setCampoMarcado(m);
      setCriterioMarcado({});
      setLinksMarcado(linksQueFaltam(e.descricaoHtml, linksGitDoChamado(chamado)).length > 0);
      setComentario('');
      setComentarioMarcado(false);
      setMoverMarcado(false);
      const atual = e.colunas.find((c) => c.id === e.card.colunaId);
      const alvo = e.colunas.find((c) => c.posicao > (atual?.posicao ?? 0) && (c.secao === 3 || /conclu/i.test(c.nome))) ?? e.colunas.find((c) => c.posicao > (atual?.posicao ?? 0));
      setDestino(alvo?.id ?? 0);
    },
    [propostas, chamado],
  );

  const carrega = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const e = await lerProcesso(cardId, chamado.numero);
      setEstado(e);
      iniciaSelecao(e);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }, [cardId, chamado.numero, iniciaSelecao]);

  useEffect(() => {
    carrega();
  }, [carrega]);

  const textoAtual = estado?.campos.find((c) => c.chave === 'texto')?.valorAtual ?? '';
  const textoFinal = campoMarcado.texto ? valores.texto ?? '' : textoAtual;
  const temPr = chamado.temPr;
  const temEvidencia = chamado.evidencias.length > 0;
  const temPlano = chamado.planosTeste.length > 0;
  const textoConclusaoOk = textoConclusaoComplementado(textoFinal);
  const temRevision = !!chamado.revision;

  const criterios = useMemo(
    () => (estado?.criterios ?? []).map((c) => ({ ...c, avaliacao: avaliaCriterio(c.texto, { temPr, temEvidencia, temPlano, textoConclusaoOk, temRevision }) })),
    [estado, temPr, temEvidencia, temPlano, textoConclusaoOk, temRevision],
  );

  useEffect(() => {
    if (!estado) return;
    setCriterioMarcado((atual) => {
      const novo = { ...atual };
      for (const c of criterios) if (!(c.itemId in novo)) novo[c.itemId] = !c.marcado && c.avaliacao.automatico && c.avaliacao.cumprido;
      return novo;
    });
  }, [criterios, estado]);

  const linksGit = useMemo(() => linksGitDoChamado(chamado), [chamado]);
  const linksFaltantes = useMemo(() => (estado ? linksQueFaltam(estado.descricaoHtml, linksGit) : []), [estado, linksGit]);
  const descricaoDepois = useMemo(() => (estado ? anexaLinksNaDescricao(estado.descricaoHtml, linksGit) : ''), [estado, linksGit]);
  const faltam = criterios.filter((c) => !c.marcado && !criterioMarcado[c.itemId]);
  const podeMover = !!estado && !estado.card.bloqueado && faltam.length === 0 && destino > 0;

  const monta = (): MudancaProcesso[] => {
    const m: MudancaProcesso[] = [];
    for (const p of propostas) if (campoMarcado[p.chave]) m.push({ tipo: 'campo', campo: p.rotulo, valor: valores[p.chave] ?? p.valor });
    for (const c of criterios) if (!c.marcado && criterioMarcado[c.itemId]) m.push({ tipo: 'checklist', itemId: c.itemId });
    if (linksMarcado && linksFaltantes.length) m.push({ tipo: 'descricao', links: linksGit });
    if (comentarioMarcado && comentario.trim()) m.push({ tipo: 'comentario', texto: comentario.trim() });
    if (moverMarcado && podeMover) m.push({ tipo: 'mover', colunaId: destino });
    return m;
  };

  const revisar = async () => {
    const m = monta();
    if (!m.length) {
      setErro('Nenhuma alteração selecionada.');
      return;
    }
    setTrabalhando(true);
    setErro('');
    try {
      setSimulacao(await simularProcesso(cardId, chamado.numero, m));
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setTrabalhando(false);
    }
  };

  const gravar = async () => {
    setTrabalhando(true);
    setErro('');
    try {
      const r = await aplicarProcesso(cardId, chamado.numero, monta());
      setResultados(r.resultados);
      setSimulacao(null);
      if (r.estado) {
        setEstado(r.estado);
        iniciaSelecao(r.estado);
      }
      if (r.resultados.some((x) => x.ok)) onGravado();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setTrabalhando(false);
    }
  };

  const colunaAtual = estado?.colunas.find((c) => c.id === estado.card.colunaId)?.nome ?? '—';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-2 sm:p-6" onClick={onClose}>
      <div className="flex h-full max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between gap-3 border-b border-zinc-800 p-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sky-300">{chamado.numero}</span>
              <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-xs text-sky-300">coluna atual: {colunaAtual}</span>
              {registro.resumo && (
                <a href={registro.resumo.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-sky-400 hover:underline">
                  Abrir cartão <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <h2 className="mt-1 text-xl font-semibold">{chamado.assunto}</h2>
            <p className="text-xs text-zinc-500">Experimento restrito ao seu usuário Git. Nada é gravado no BM sem a sua confirmação.</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="rounded p-1 hover:bg-zinc-800"><X className="h-5 w-5" /></button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {carregando && <p className="text-sm text-zinc-400">Lendo o cartão no Businessmap...</p>}
          {erro && <p className="rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{erro}</p>}

          {estado && (
            <>
              {estado.card.bloqueado && <p className="rounded border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">O cartão está bloqueado no BM: não é possível mover enquanto estiver assim.</p>}

              <Bloco titulo="1. Campos do cartão preenchidos a partir do Git">
                <p className="mb-3 text-xs text-zinc-500">Marque o que deve ser gravado no cartão. Campos já iguais ao Git não precisam ser regravados; campos diferentes vêm desmarcados para não sobrescrever o que alguém escreveu.</p>
                <div className="space-y-3">
                  {propostas.map((p) => {
                    const campo = estado.campos.find((c) => c.chave === p.chave);
                    const sit = situacaoDoCampo(campo?.valorAtual ?? '', valores[p.chave] ?? p.valor);
                    return (
                      <div key={p.chave} className="rounded border border-zinc-800 p-3">
                        <label className="flex flex-wrap items-center gap-2 text-sm">
                          <input type="checkbox" checked={!!campoMarcado[p.chave]} disabled={!campo?.disponivel} onChange={(e) => setCampoMarcado((a) => ({ ...a, [p.chave]: e.target.checked }))} />
                          <strong>{p.rotulo}</strong>
                          {campo?.disponivel ? <span className={`rounded px-1.5 py-0.5 text-xs ${COR_SITUACAO[sit]}`}>{ROTULO_SITUACAO[sit]}</span> : <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-xs text-red-300">{campo?.id ? 'campo não habilitado no quadro deste cartão' : 'campo não existe no BM'}</span>}
                        </label>
                        <div className="mt-2 grid gap-3 md:grid-cols-2">
                          <div>
                            <div className="mb-1 text-xs text-zinc-500">Hoje no BM</div>
                            <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded bg-zinc-900 p-2 text-xs text-zinc-300">{campo?.valorAtual || '—'}</pre>
                          </div>
                          <div>
                            <div className="mb-1 text-xs text-zinc-500">Proposto pelo Git (pode editar)</div>
                            <textarea
                              value={valores[p.chave] ?? ''}
                              onChange={(e) => setValores((a) => ({ ...a, [p.chave]: e.target.value }))}
                              rows={p.chave === 'texto' ? 8 : 3}
                              className="w-full rounded border border-zinc-700 bg-zinc-900 p-2 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {!propostas.length && <p className="text-sm text-zinc-500">O Git não tem dados para preencher campos deste chamado.</p>}
                </div>
              </Bloco>

              <Bloco titulo="2. Links do Git na descrição do cartão">
                <p className="mb-3 text-xs text-zinc-500">Os links são acrescentados no fim do texto da aba Detalhes, abaixo dos outros links (Entendimento, Análise etc.). O texto que já existe não é alterado.</p>
                {linksGit.length ? (
                  <>
                    <label className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                      <input type="checkbox" checked={linksMarcado && linksFaltantes.length > 0} disabled={!linksFaltantes.length} onChange={(e) => setLinksMarcado(e.target.checked)} />
                      <strong>Acrescentar os links do Git</strong>
                      {!linksFaltantes.length && <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs text-emerald-300">já constam na descrição</span>}
                    </label>
                    <ul className="mb-3 space-y-1 text-sm">
                      {linksGit.map((l) => (
                        <li key={l.url} className="flex flex-wrap items-center gap-2">
                          <a href={l.url} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">{l.texto}</a>
                          <span className={`rounded px-1.5 py-0.5 text-xs ${linksFaltantes.some((x) => x.url === l.url) ? 'bg-amber-500/15 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'}`}>{linksFaltantes.some((x) => x.url === l.url) ? 'falta no cartão' : 'já no cartão'}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mb-1 text-xs text-zinc-500">Como ficará o fim da descrição</div>
                    <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded bg-zinc-900 p-2 text-xs text-zinc-300">{htmlParaTexto(descricaoDepois).slice(-800)}</pre>
                  </>
                ) : (
                  <p className="text-sm text-zinc-500">Este chamado não tem PR com link do GitHub.</p>
                )}
              </Bloco>

              <Bloco titulo="3. Critérios de saída da coluna atual">
                {criterios.length ? (
                  <ul className="space-y-2">
                    {criterios.map((c) => (
                      <li key={c.itemId} className="rounded border border-zinc-800 p-3 text-sm">
                        <label className="flex flex-wrap items-center gap-2">
                          <input type="checkbox" checked={c.marcado || !!criterioMarcado[c.itemId]} disabled={c.marcado} onChange={(e) => setCriterioMarcado((a) => ({ ...a, [c.itemId]: e.target.checked }))} />
                          <span className="font-medium">{c.texto}</span>
                          {c.marcado ? (
                            <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-xs text-emerald-300">já marcado no BM</span>
                          ) : c.avaliacao.automatico ? (
                            <span className={`rounded px-1.5 py-0.5 text-xs ${c.avaliacao.cumprido ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'}`}>{c.avaliacao.cumprido ? 'cumprido pelo Git' : 'não cumprido'}</span>
                          ) : (
                            <span className="rounded bg-zinc-700/40 px-1.5 py-0.5 text-xs text-zinc-300">manual</span>
                          )}
                        </label>
                        {!c.marcado && <p className="mt-1 pl-6 text-xs text-zinc-500">{c.avaliacao.motivo}</p>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-zinc-500">A coluna atual não tem critérios de saída.</p>
                )}
              </Bloco>

              <div className="grid gap-4 lg:grid-cols-2">
                <Bloco titulo="4. Comentário no cartão (opcional)">
                  <label className="mb-2 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={comentarioMarcado} onChange={(e) => setComentarioMarcado(e.target.checked)} /> Publicar comentário
                  </label>
                  <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={4} placeholder="Texto do comentário" className="w-full rounded border border-zinc-700 bg-zinc-900 p-2 text-sm" />
                </Bloco>

                <Bloco titulo="5. Mover o cartão">
                  <label className="mb-2 flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={moverMarcado && podeMover} disabled={!podeMover} onChange={(e) => setMoverMarcado(e.target.checked)} /> Mover para a coluna
                  </label>
                  <select value={destino} onChange={(e) => setDestino(Number(e.target.value))} className="mb-2 w-full rounded border border-zinc-700 bg-zinc-900 p-2 text-sm">
                    {estado.colunas.filter((c) => c.id !== estado.card.colunaId).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                  {!podeMover && (
                    <p className="text-xs text-amber-300">
                      {estado.card.bloqueado ? 'Cartão bloqueado.' : faltam.length ? `Faltam ${faltam.length} critério(s) de saída: ${faltam.map((c) => c.texto).join('; ')}.` : 'Escolha a coluna de destino.'}
                    </p>
                  )}
                </Bloco>
              </div>

              {resultados && (
                <Bloco titulo="Resultado da gravação">
                  <ul className="space-y-1 text-sm">
                    {resultados.map((r, i) => (
                      <li key={i} className={r.ok ? 'text-emerald-300' : 'text-red-300'}>{r.ok ? '✔' : '✖'} {r.descricao}{r.erro ? ` — ${r.erro}` : ''}</li>
                    ))}
                  </ul>
                </Bloco>
              )}
            </>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 p-3">
          <span className="text-xs text-zinc-500">A gravação fica registrada no BM em nome do dono da chave.</span>
          <div className="flex gap-2">
            <button onClick={carrega} disabled={carregando || trabalhando} className="rounded border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800 disabled:opacity-50">Reler do BM</button>
            <button onClick={revisar} disabled={!estado || trabalhando} className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">{trabalhando ? 'Aguarde...' : 'Revisar alterações'}</button>
          </div>
        </footer>

        {simulacao && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => !trabalhando && setSimulacao(null)}>
            <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-950 p-5" onClick={(e) => e.stopPropagation()}>
              <h3 className="mb-1 text-lg font-semibold">Confirmar gravação no Businessmap</h3>
              <p className="mb-3 text-sm text-zinc-400">As alterações abaixo serão feitas no cartão {chamado.numero}, nesta ordem, em nome do dono da chave.</p>
              <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm">
                {simulacao.map((r, i) => <li key={i}>{r.descricao}</li>)}
              </ol>
              <details className="mb-4 text-xs text-zinc-400">
                <summary className="cursor-pointer">Ver as requisições exatas</summary>
                <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-words rounded bg-zinc-900 p-2">{simulacao.map((r) => `${r.metodo} ${r.caminho}\n${r.corpo === undefined ? '' : JSON.stringify(r.corpo)}`).join('\n\n')}</pre>
              </details>
              <div className="flex justify-end gap-2">
                <button onClick={() => setSimulacao(null)} disabled={trabalhando} className="rounded border border-zinc-700 px-3 py-1.5 text-sm hover:bg-zinc-800 disabled:opacity-50">Cancelar</button>
                <button onClick={gravar} disabled={trabalhando} className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50">{trabalhando ? 'Gravando...' : 'Confirmar e gravar'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
