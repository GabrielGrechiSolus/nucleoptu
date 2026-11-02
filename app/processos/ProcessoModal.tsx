'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { htmlParaTexto } from '../chamados/bm';
import type { Chamado } from '../chamados/parse';
import type { RegistroBm } from '../chamados/bmRegistro';
import { anexaLinksNaDescricao, avaliaChecks, avaliaCriterio, linksGitDoChamado, linksQueFaltam, propostasDeCampos, textoConclusaoComplementado, type PropostaCampo } from './automacao';
import { aplicarProcesso, consultaChecksGit, lerProcesso, simularProcesso, type EstadoProcesso, type MudancaProcesso, type RequisicaoSimulada, type ResultadoGravacao } from './clienteProcesso';

const norma = (t: string) => t.replace(/\s+/g, ' ').trim().toLowerCase();

type SituacaoCampo = 'igual' | 'vazio' | 'diferente';

const situacaoDoCampo = (atual: string, proposto: string): SituacaoCampo => (!atual.trim() ? 'vazio' : norma(atual) === norma(proposto) ? 'igual' : 'diferente');

const ROTULO_SITUACAO: Record<SituacaoCampo, string> = { igual: 'já igual', vazio: 'vazio no BM', diferente: 'diferente do Git' };
const COR_SITUACAO: Record<SituacaoCampo, string> = { igual: 'rel-tag-ok', vazio: 'rel-tag-alert', diferente: 'rel-tag-info' };

function Bloco({ titulo, children, className = '' }: { titulo: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rel-box ${className}`}>
      <h3 className="rel-subtitle">{titulo}</h3>
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
  const criterioTocado = useRef<Set<number>>(new Set());
  const [linksMarcado, setLinksMarcado] = useState(false);
  const [comentario, setComentario] = useState('');
  const [comentarioMarcado, setComentarioMarcado] = useState(false);
  const [moverMarcado, setMoverMarcado] = useState(false);
  const [destino, setDestino] = useState(0);
  const [simulacao, setSimulacao] = useState<RequisicaoSimulada[] | null>(null);
  const [resultados, setResultados] = useState<ResultadoGravacao[] | null>(null);
  const [trabalhando, setTrabalhando] = useState(false);
  const [checks, setChecks] = useState<Awaited<ReturnType<typeof consultaChecksGit>> | undefined>(undefined);

  const propostasDe = useCallback(
    (e: EstadoProcesso): PropostaCampo[] => propostasDeCampos(chamado, { texto: e.campos.find((c) => c.chave === 'texto')?.valorAtual ?? '' }),
    [chamado],
  );
  const propostas = useMemo<PropostaCampo[]>(() => (estado ? propostasDe(estado) : []), [estado, propostasDe]);

  const iniciaSelecao = useCallback(
    (e: EstadoProcesso) => {
      const v: Record<string, string> = {};
      const m: Record<string, boolean> = {};
      for (const p of propostasDe(e)) {
        const campo = e.campos.find((c) => c.chave === p.chave);
        v[p.chave] = p.valor;
        const sit = situacaoDoCampo(campo?.valorAtual ?? '', p.valor);
        const padraoSomente = p.chave === 'texto' && !textoConclusaoComplementado(campo?.valorAtual ?? '');
        m[p.chave] = !!campo?.disponivel && (sit === 'vazio' || (sit === 'diferente' && padraoSomente));
      }
      setValores(v);
      setCampoMarcado(m);
      setCriterioMarcado({});
      criterioTocado.current = new Set();
      setLinksMarcado(linksQueFaltam(e.descricaoHtml, linksGitDoChamado(chamado)).length > 0);
      setComentario('');
      setComentarioMarcado(false);
      setMoverMarcado(false);
      const atual = e.colunas.find((c) => c.id === e.card.colunaId);
      const alvo = e.colunas.find((c) => c.posicao > (atual?.posicao ?? 0) && (c.secao === 3 || /conclu/i.test(c.nome))) ?? e.colunas.find((c) => c.posicao > (atual?.posicao ?? 0));
      setDestino(alvo?.id ?? 0);
    },
    [propostasDe, chamado],
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

  useEffect(() => {
    let ativo = true;
    consultaChecksGit(chamado.prs.filter((p) => p.repo && p.numero).map((p) => ({ repo: p.repo as string, numero: Number(p.numero) }))).then((r) => ativo && setChecks(r));
    return () => {
      ativo = false;
    };
  }, [chamado]);

  const textoAtual = estado?.campos.find((c) => c.chave === 'texto')?.valorAtual ?? '';
  const textoFinal = campoMarcado.texto ? valores.texto ?? '' : textoAtual;
  const temPr = chamado.temPr;
  const temEvidencia = chamado.evidencias.length > 0;
  const temPlano = chamado.planosTeste.length > 0;
  const textoConclusaoOk = textoConclusaoComplementado(textoFinal);
  const temRevision = !!chamado.revision;
  const build = useMemo(() => (checks === undefined ? { ok: null, motivo: 'Consultando os checks do GitHub...' } : avaliaChecks(checks)), [checks]);

  const criterios = useMemo(
    () => (estado?.criterios ?? []).map((c) => ({ ...c, avaliacao: avaliaCriterio(c.texto, { temPr, temEvidencia, temPlano, textoConclusaoOk, temRevision, build }) })),
    [estado, temPr, temEvidencia, temPlano, textoConclusaoOk, temRevision, build],
  );

  useEffect(() => {
    if (!estado) return;
    setCriterioMarcado((atual) => {
      const novo = { ...atual };
      for (const c of criterios) if (!criterioTocado.current.has(c.itemId)) novo[c.itemId] = !c.marcado && c.avaliacao.automatico && c.avaliacao.cumprido;
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
    <div className="rel-backdrop" onClick={onClose}>
      <div className="rel-modal" onClick={(e) => e.stopPropagation()}>
        <header className="rel-modal-head">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rel-mono">{chamado.numero}</span>
              <span className="rel-tag rel-tag-info">coluna atual: {colunaAtual}</span>
              {registro.resumo && (
                <a href={registro.resumo.url} target="_blank" rel="noreferrer" className="rel-link inline-flex items-center gap-1 text-xs">
                  Abrir cartão <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <h2 className="rel-strong mt-1 text-xl">{chamado.assunto}</h2>
            <p className="rel-desc">Experimento restrito ao seu usuário Git. Nada é gravado no BM sem a sua confirmação.</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="rel-btn rel-btn-icon"><X className="h-5 w-5" /></button>
        </header>

        <div className="rel-modal-body">
          {carregando && <p className="rel-desc">Lendo o cartão no Businessmap...</p>}
          {erro && <p className="rel-notice rel-notice-error">{erro}</p>}

          {estado && (
            <>
              {estado.card.bloqueado && <p className="rel-notice rel-notice-alert">O cartão está bloqueado no BM: não é possível mover enquanto estiver assim.</p>}

              <Bloco titulo="1. Campos do cartão preenchidos a partir do Git">
                <p className="rel-desc mb-3">Marque o que deve ser gravado no cartão. Campos já iguais ao Git não precisam ser regravados; campos diferentes vêm desmarcados para não sobrescrever o que alguém escreveu.</p>
                <div className="rel-list">
                  {propostas.map((p) => {
                    const campo = estado.campos.find((c) => c.chave === p.chave);
                    const sit = situacaoDoCampo(campo?.valorAtual ?? '', valores[p.chave] ?? p.valor);
                    return (
                      <div key={p.chave} className="rel-item">
                        <label className="flex flex-wrap items-center gap-2">
                          <input type="checkbox" checked={!!campoMarcado[p.chave]} disabled={!campo?.disponivel} onChange={(e) => setCampoMarcado((a) => ({ ...a, [p.chave]: e.target.checked }))} />
                          <span className="rel-strong">{p.rotulo}</span>
                          {campo?.disponivel ? <span className={`rel-tag ${COR_SITUACAO[sit]}`}>{ROTULO_SITUACAO[sit]}</span> : <span className="rel-tag rel-tag-error">{campo?.id ? 'campo não habilitado no quadro deste cartão' : 'campo não existe no BM'}</span>}
                        </label>
                        <div className="rel-grid rel-grid-s2 mt-3">
                          <div className="rel-field">
                            <span className="rel-label">Hoje no BM</span>
                            <pre className="rel-pre">{campo?.valorAtual || '—'}</pre>
                          </div>
                          <div className="rel-field">
                            <span className="rel-label">Proposto pelo Git (pode editar)</span>
                            <textarea
                              value={valores[p.chave] ?? ''}
                              onChange={(e) => setValores((a) => ({ ...a, [p.chave]: e.target.value }))}
                              rows={p.chave === 'texto' ? 8 : 3}
                              className="rel-input"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {!propostas.length && <p className="rel-desc">O Git não tem dados para preencher campos deste chamado.</p>}
                </div>
              </Bloco>

              <Bloco titulo="2. Links do Git na descrição do cartão">
                <p className="rel-desc mb-3">Os links são acrescentados no fim do texto da aba Detalhes, abaixo dos outros links (Entendimento, Análise etc.). O texto que já existe não é alterado.</p>
                {linksGit.length ? (
                  <>
                    <label className="mb-3 flex flex-wrap items-center gap-2">
                      <input type="checkbox" checked={linksMarcado && linksFaltantes.length > 0} disabled={!linksFaltantes.length} onChange={(e) => setLinksMarcado(e.target.checked)} />
                      <span className="rel-strong">Acrescentar os links do Git</span>
                      {!linksFaltantes.length && <span className="rel-tag rel-tag-ok">já constam na descrição</span>}
                    </label>
                    <ul className="rel-list mb-3">
                      {linksGit.map((l) => (
                        <li key={l.url} className="flex flex-wrap items-center gap-2">
                          <a href={l.url} target="_blank" rel="noreferrer" className="rel-link">{l.texto}</a>
                          <span className={`rel-tag ${linksFaltantes.some((x) => x.url === l.url) ? 'rel-tag-alert' : 'rel-tag-ok'}`}>{linksFaltantes.some((x) => x.url === l.url) ? 'falta no cartão' : 'já no cartão'}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="rel-field">
                      <span className="rel-label">Como ficará o fim da descrição</span>
                      <pre className="rel-pre">{htmlParaTexto(descricaoDepois).slice(-800)}</pre>
                    </div>
                  </>
                ) : (
                  <p className="rel-desc">Este chamado não tem PR com link do GitHub.</p>
                )}
              </Bloco>

              <Bloco titulo="3. Critérios de saída da coluna atual">
                {criterios.length ? (
                  <ul className="rel-list">
                    {criterios.map((c) => (
                      <li key={c.itemId} className="rel-item">
                        <label className="flex flex-wrap items-center gap-2">
                          <input
                            type="checkbox"
                            checked={c.marcado || !!criterioMarcado[c.itemId]}
                            disabled={c.marcado}
                            onChange={(e) => {
                              criterioTocado.current.add(c.itemId);
                              setCriterioMarcado((a) => ({ ...a, [c.itemId]: e.target.checked }));
                            }}
                          />
                          <span className="rel-strong">{c.texto}</span>
                          {c.marcado ? (
                            <span className="rel-tag rel-tag-ok">já marcado no BM</span>
                          ) : c.avaliacao.automatico ? (
                            <span className={`rel-tag ${c.avaliacao.cumprido ? 'rel-tag-ok' : 'rel-tag-error'}`}>{c.avaliacao.cumprido ? 'cumprido pelo Git' : 'não cumprido'}</span>
                          ) : (
                            <span className="rel-tag">manual</span>
                          )}
                        </label>
                        {!c.marcado && <p className="rel-desc mt-1 pl-6">{c.avaliacao.motivo}</p>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rel-desc">A coluna atual não tem critérios de saída.</p>
                )}
              </Bloco>

              <div className="rel-grid rel-grid-2">
                <Bloco titulo="4. Comentário no cartão (opcional)">
                  <label className="mb-3 flex items-center gap-2">
                    <input type="checkbox" checked={comentarioMarcado} onChange={(e) => setComentarioMarcado(e.target.checked)} />
                    <span className="rel-strong">Publicar comentário</span>
                  </label>
                  <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={4} placeholder="Texto do comentário" className="rel-input" />
                </Bloco>

                <Bloco titulo="5. Mover o cartão">
                  <label className="mb-3 flex items-center gap-2">
                    <input type="checkbox" checked={moverMarcado && podeMover} disabled={!podeMover} onChange={(e) => setMoverMarcado(e.target.checked)} />
                    <span className="rel-strong">Mover para a coluna</span>
                  </label>
                  <select value={destino} onChange={(e) => setDestino(Number(e.target.value))} className="rel-input mb-2">
                    {estado.colunas.filter((c) => c.id !== estado.card.colunaId).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                  {!podeMover && (
                    <p className="rel-notice rel-notice-alert">
                      {estado.card.bloqueado ? 'Cartão bloqueado.' : faltam.length ? `Faltam ${faltam.length} critério(s) de saída: ${faltam.map((c) => c.texto).join('; ')}.` : 'Escolha a coluna de destino.'}
                    </p>
                  )}
                </Bloco>
              </div>

              {resultados && (
                <Bloco titulo="Resultado da gravação">
                  <ul className="rel-list">
                    {resultados.map((r, i) => (
                      <li key={i} className={`rel-notice ${r.ok ? 'rel-notice-ok' : 'rel-notice-error'}`}>{r.ok ? '✔' : '✖'} {r.descricao}{r.erro ? ` — ${r.erro}` : ''}</li>
                    ))}
                  </ul>
                </Bloco>
              )}
            </>
          )}
        </div>

        <footer className="rel-modal-foot">
          <span className="rel-desc">A gravação fica registrada no BM em nome do dono da chave.</span>
          <div className="flex gap-2">
            <button onClick={carrega} disabled={carregando || trabalhando} className="rel-btn rel-btn-ghost">Reler do BM</button>
            <button onClick={revisar} disabled={!estado || trabalhando} className="rel-btn rel-btn-primary">{trabalhando ? 'Aguarde...' : 'Revisar alterações'}</button>
          </div>
        </footer>

        {simulacao && (
          <div className="rel-backdrop rel-backdrop-top" onClick={() => !trabalhando && setSimulacao(null)}>
            <div className="rel-modal rel-modal-sm" onClick={(e) => e.stopPropagation()}>
              <div className="rel-modal-head">
                <div>
                  <h3 className="rel-strong text-lg">Confirmar gravação no Businessmap</h3>
                  <p className="rel-desc">As alterações abaixo serão feitas no cartão {chamado.numero}, nesta ordem, em nome do dono da chave.</p>
                </div>
              </div>
              <div className="rel-modal-body">
                <ol className="list-decimal pl-5">
                  {simulacao.map((r, i) => <li key={i} className="rel-value">{r.descricao}</li>)}
                </ol>
                <details>
                  <summary className="rel-link cursor-pointer text-xs">Ver as requisições exatas</summary>
                  <pre className="rel-pre mt-2">{simulacao.map((r) => `${r.metodo} ${r.caminho}\n${r.corpo === undefined ? '' : JSON.stringify(r.corpo)}`).join('\n\n')}</pre>
                </details>
              </div>
              <div className="rel-modal-foot justify-end">
                <button onClick={() => setSimulacao(null)} disabled={trabalhando} className="rel-btn rel-btn-ghost">Cancelar</button>
                <button onClick={gravar} disabled={trabalhando} className="rel-btn rel-btn-primary">{trabalhando ? 'Gravando...' : 'Confirmar e gravar'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
