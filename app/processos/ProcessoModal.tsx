'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';
import { htmlParaTexto } from '../chamados/bm';
import type { Chamado } from '../chamados/parse';
import type { RegistroBm } from '../chamados/bmRegistro';
import { anexaLinksNaDescricao, avaliaChecks, avaliaCriterio, linksDoChamado, linksQueFaltam, propostasDeCampos, textoConclusaoComplementado } from './automacao';
import { aplicarProcesso, consultaChecksGit, lerProcesso, simularProcesso, type EstadoProcesso, type MudancaProcesso, type RequisicaoSimulada, type ResultadoGravacao } from './clienteProcesso';

const norma = (t: string) => t.replace(/\s+/g, ' ').trim().toLowerCase();

function Secao({ titulo, aside, children }: { titulo: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rel-box">
      <div className="rel-section-head">
        <h3 className="rel-subtitle">{titulo}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

export default function ProcessoModal({ chamado, registro, onClose, onGravado }: { chamado: Chamado; registro: RegistroBm; onClose: () => void; onGravado: () => void }) {
  const cardId = registro.cardId ?? 0;
  const [estado, setEstado] = useState<EstadoProcesso | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [valorTexto, setValorTexto] = useState('');
  const [textoMarcado, setTextoMarcado] = useState(false);
  const [linksSel, setLinksSel] = useState<Record<string, boolean>>({});
  const [criterioMarcado, setCriterioMarcado] = useState<Record<number, boolean>>({});
  const criterioTocado = useRef<Set<number>>(new Set());
  const [comentario, setComentario] = useState('');
  const [comentarioMarcado, setComentarioMarcado] = useState(false);
  const [moverMarcado, setMoverMarcado] = useState(false);
  const [destino, setDestino] = useState(0);
  const [simulacao, setSimulacao] = useState<RequisicaoSimulada[] | null>(null);
  const [resultados, setResultados] = useState<ResultadoGravacao[] | null>(null);
  const [trabalhando, setTrabalhando] = useState(false);
  const [checks, setChecks] = useState<Awaited<ReturnType<typeof consultaChecksGit>> | undefined>(undefined);

  const links = useMemo(() => linksDoChamado(chamado), [chamado]);
  const campoTexto = estado?.campos.find((c) => c.chave === 'texto');
  const textoAtual = campoTexto?.valorAtual ?? '';
  const proposta = useMemo(() => (estado ? propostasDeCampos(chamado, { texto: textoAtual })[0] : undefined), [estado, chamado, textoAtual]);

  const iniciaSelecao = useCallback(
    (e: EstadoProcesso) => {
      const atual = e.campos.find((c) => c.chave === 'texto');
      const p = propostasDeCampos(chamado, { texto: atual?.valorAtual ?? '' })[0];
      setValorTexto(p?.valor ?? '');
      setTextoMarcado(!!p && !!atual?.disponivel && !textoConclusaoComplementado(atual?.valorAtual ?? '') && norma(atual?.valorAtual ?? '') !== norma(p.valor));
      const faltantes = new Set(linksQueFaltam(e.descricaoHtml, links).map((l) => l.url));
      setLinksSel(Object.fromEntries(links.map((l) => [l.url, faltantes.has(l.url)])));
      setCriterioMarcado({});
      criterioTocado.current = new Set();
      setComentario('');
      setComentarioMarcado(false);
      setMoverMarcado(false);
      const col = e.colunas.find((c) => c.id === e.card.colunaId);
      const alvo = e.colunas.find((c) => c.posicao > (col?.posicao ?? 0) && (c.secao === 3 || /conclu/i.test(c.nome))) ?? e.colunas.find((c) => c.posicao > (col?.posicao ?? 0));
      setDestino(alvo?.id ?? 0);
    },
    [chamado, links],
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

  const textoFinal = textoMarcado ? valorTexto : textoAtual;
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

  const faltantes = useMemo(() => new Set((estado ? linksQueFaltam(estado.descricaoHtml, links) : []).map((l) => l.url)), [estado, links]);
  const linksEscolhidos = links.filter((l) => faltantes.has(l.url) && linksSel[l.url]);
  const descricaoDepois = useMemo(() => (estado ? anexaLinksNaDescricao(estado.descricaoHtml, linksEscolhidos) : ''), [estado, linksEscolhidos]);

  const pendentes = criterios.filter((c) => !c.marcado && !criterioMarcado[c.itemId]);
  const totalMarcados = criterios.length - pendentes.length;
  const podeMover = !!estado && !estado.card.bloqueado && pendentes.length === 0 && destino > 0;

  const monta = (): MudancaProcesso[] => {
    const m: MudancaProcesso[] = [];
    if (textoMarcado && valorTexto.trim() && campoTexto) m.push({ tipo: 'campo', campo: campoTexto.rotulo, valor: valorTexto });
    for (const c of criterios) if (!c.marcado && criterioMarcado[c.itemId]) m.push({ tipo: 'checklist', itemId: c.itemId });
    if (linksEscolhidos.length) m.push({ tipo: 'descricao', links: linksEscolhidos });
    if (comentarioMarcado && comentario.trim()) m.push({ tipo: 'comentario', texto: comentario.trim() });
    if (moverMarcado && podeMover) m.push({ tipo: 'mover', colunaId: destino });
    return m;
  };
  const quantidade = estado ? monta().length : 0;

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
  const progresso = criterios.length ? Math.round((totalMarcados / criterios.length) * 100) : 100;

  return (
    <div className="rel-backdrop" onClick={onClose}>
      <div className="rel-modal" onClick={(e) => e.stopPropagation()}>
        <header className="rel-modal-head">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rel-mono">{chamado.numero}</span>
              <span className="rel-tag rel-tag-info">{colunaAtual}</span>
              {registro.resumo && (
                <a href={registro.resumo.url} target="_blank" rel="noreferrer" className="rel-link inline-flex items-center gap-1 text-xs">
                  Abrir cartão <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            <h2 className="rel-strong mt-1 text-xl">{chamado.assunto}</h2>
            <p className="rel-desc">Escolha o que atualizar no cartão. Nada é gravado sem a sua confirmação.</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="rel-btn rel-btn-icon"><X className="h-5 w-5" /></button>
        </header>

        <div className="rel-modal-body">
          {carregando && <p className="rel-desc">Lendo o cartão no Businessmap...</p>}
          {erro && <p className="rel-notice rel-notice-error">{erro}</p>}
          {estado?.card.bloqueado && <p className="rel-notice rel-notice-alert">O cartão está bloqueado no BM: não é possível mover enquanto estiver assim.</p>}

          {estado && (
            <div className="rel-split">
              <div className="rel-stack">
                <Secao titulo="Texto de conclusão" aside={campoTexto && !campoTexto.disponivel ? <span className="rel-tag rel-tag-error">campo não habilitado no quadro</span> : undefined}>
                  {proposta ? (
                    <>
                      <label className="rel-check">
                        <input type="checkbox" checked={textoMarcado} disabled={!campoTexto?.disponivel} onChange={(e) => setTextoMarcado(e.target.checked)} />
                        <span className="rel-strong">Gravar o texto abaixo no cartão</span>
                        {textoConclusaoComplementado(textoAtual) ? <span className="rel-tag rel-tag-ok">já complementado no BM</span> : <span className="rel-tag rel-tag-alert">ainda é a mensagem padrão</span>}
                      </label>
                      <textarea value={valorTexto} onChange={(e) => setValorTexto(e.target.value)} rows={8} className="rel-input mt-3" aria-label="Texto de conclusão" />
                      <details className="rel-details">
                        <summary>Ver o texto que está hoje no BM</summary>
                        <pre className="rel-pre mt-2">{textoAtual || '—'}</pre>
                      </details>
                    </>
                  ) : (
                    <p className="rel-desc">O chamado não tem regra de negócio escrita (REGRA.md) para montar o texto de conclusão.</p>
                  )}
                </Secao>

                <Secao titulo="Links na descrição do cartão">
                  <p className="rel-desc mb-2">Entram no fim do texto da aba Detalhes, abaixo dos outros links. O que já existe não é alterado.</p>
                  {links.length ? (
                    <>
                      <div>
                        {links.map((l) => {
                          const falta = faltantes.has(l.url);
                          return (
                            <label key={l.url} className="rel-check">
                              <input type="checkbox" checked={falta && !!linksSel[l.url]} disabled={!falta} onChange={(e) => setLinksSel((a) => ({ ...a, [l.url]: e.target.checked }))} />
                              <a href={l.url} target="_blank" rel="noreferrer" className="rel-link" onClick={(e) => e.stopPropagation()}>{l.texto}</a>
                              <span className={`rel-tag ${falta ? 'rel-tag-alert' : 'rel-tag-ok'}`}>{falta ? 'falta no cartão' : 'já no cartão'}</span>
                            </label>
                          );
                        })}
                      </div>
                      {linksEscolhidos.length > 0 && (
                        <details className="rel-details">
                          <summary>Ver como ficará o fim da descrição</summary>
                          <pre className="rel-pre mt-2">{htmlParaTexto(descricaoDepois).slice(-700)}</pre>
                        </details>
                      )}
                    </>
                  ) : (
                    <p className="rel-desc">Este chamado não tem PR, plano de testes nem evidência com link.</p>
                  )}
                </Secao>

                <Secao titulo="Critérios de saída da coluna" aside={criterios.length ? <span className="rel-desc">{totalMarcados} de {criterios.length}</span> : undefined}>
                  {criterios.length ? (
                    <div>
                      {criterios.map((c) => (
                        <label key={c.itemId} className="rel-check">
                          <input
                            type="checkbox"
                            checked={c.marcado || !!criterioMarcado[c.itemId]}
                            disabled={c.marcado}
                            onChange={(e) => {
                              criterioTocado.current.add(c.itemId);
                              setCriterioMarcado((a) => ({ ...a, [c.itemId]: e.target.checked }));
                            }}
                          />
                          <span className="rel-check-body">
                            <span className="rel-strong">{c.texto}</span>
                            {!c.marcado && <span className="rel-check-note">{c.avaliacao.motivo}</span>}
                          </span>
                          {c.marcado ? (
                            <span className="rel-tag rel-tag-ok">marcado no BM</span>
                          ) : c.avaliacao.automatico ? (
                            <span className={`rel-tag ${c.avaliacao.cumprido ? 'rel-tag-ok' : 'rel-tag-error'}`}>{c.avaliacao.cumprido ? 'cumprido pelo Git' : 'não cumprido'}</span>
                          ) : (
                            <span className="rel-tag">manual</span>
                          )}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <p className="rel-desc">A coluna atual não tem critérios de saída.</p>
                  )}
                </Secao>

                <Secao titulo="Comentário no cartão">
                  <label className="rel-check">
                    <input type="checkbox" checked={comentarioMarcado} onChange={(e) => setComentarioMarcado(e.target.checked)} />
                    <span className="rel-strong">Publicar um comentário</span>
                  </label>
                  {comentarioMarcado && <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={4} placeholder="Texto do comentário" className="rel-input mt-3" aria-label="Comentário" />}
                </Secao>
              </div>

              <aside className="rel-stack rel-side">
                <Secao titulo="Resumo">
                  <div className="rel-stat"><span className="rel-desc">Coluna atual</span><span className="rel-strong">{colunaAtual}</span></div>
                  <div className="rel-stat"><span className="rel-desc">Critérios de saída</span><span className="rel-strong">{totalMarcados} de {criterios.length}</span></div>
                  <div className="rel-progress" aria-hidden="true"><span style={{ width: `${progresso}%` }} /></div>
                  <div className="rel-stat"><span className="rel-desc">Alterações selecionadas</span><span className="rel-strong">{quantidade}</span></div>
                </Secao>

                <Secao titulo="Mover o cartão">
                  <label className="rel-check">
                    <input type="checkbox" checked={moverMarcado && podeMover} disabled={!podeMover} onChange={(e) => setMoverMarcado(e.target.checked)} />
                    <span className="rel-strong">Mover para</span>
                  </label>
                  <select value={destino} onChange={(e) => setDestino(Number(e.target.value))} className="rel-input mt-2" aria-label="Coluna de destino">
                    {estado.colunas.filter((c) => c.id !== estado.card.colunaId).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                  {!podeMover && (
                    <p className="rel-notice rel-notice-alert mt-3">
                      {estado.card.bloqueado ? 'Cartão bloqueado.' : pendentes.length ? `Faltam ${pendentes.length} critério(s) de saída: ${pendentes.map((c) => c.texto).join('; ')}.` : 'Escolha a coluna de destino.'}
                    </p>
                  )}
                </Secao>

                {resultados && (
                  <Secao titulo="Resultado da gravação">
                    <ul className="rel-list">
                      {resultados.map((r, i) => (
                        <li key={i} className={`rel-notice ${r.ok ? 'rel-notice-ok' : 'rel-notice-error'}`}>{r.ok ? '✔' : '✖'} {r.descricao}{r.erro ? ` — ${r.erro}` : ''}</li>
                      ))}
                    </ul>
                  </Secao>
                )}
              </aside>
            </div>
          )}
        </div>

        <footer className="rel-modal-foot">
          <span className="rel-desc">A gravação fica registrada no BM em nome do dono da chave.</span>
          <div className="flex gap-2">
            <button onClick={carrega} disabled={carregando || trabalhando} className="rel-btn rel-btn-ghost">Reler do BM</button>
            <button onClick={revisar} disabled={!estado || trabalhando || quantidade === 0} className="rel-btn rel-btn-primary">{trabalhando ? 'Aguarde...' : `Revisar alterações${quantidade ? ` (${quantidade})` : ''}`}</button>
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
                <details className="rel-details">
                  <summary>Ver as requisições exatas</summary>
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
