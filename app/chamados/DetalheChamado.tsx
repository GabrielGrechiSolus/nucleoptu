'use client';

import React, { useState } from 'react';
import { ClipboardList, ExternalLink, FlaskConical, GitPullRequest, X } from 'lucide-react';
import { Chamado, ROTULO_SITUACAO, ROTULO_TIPO } from './parse';
import Vinculos from './Vinculos';
import BmPainel, { BmColuna } from './BmPainel';
import type { RegistroBm } from './bmRegistro';

type Aba = 'resumo' | 'regra' | 'bm' | 'docs';

const formataIso = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '');

const estiloSituacao: Record<string, string> = {
  'em-correcao': 'rel-tag-alert',
  corrigido: 'rel-tag-ok',
  encerrado: '',
};

function Cartao({ titulo, children, className = '' }: { titulo: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rel-box ${className}`}>
      <h3 className="rel-subtitle">{titulo}</h3>
      {children}
    </section>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="rel-field">
      <dt className="rel-label">{rotulo}</dt>
      <dd className="rel-value">{children || '—'}</dd>
    </div>
  );
}

function Cabecalho({ icone, texto }: { icone: React.ReactNode; texto: string }) {
  return (
    <div className="rel-label mb-2 flex items-center gap-2">
      {icone} {texto}
    </div>
  );
}

export default function DetalheChamado({
  c,
  previsao,
  semGit,
  registro,
  temChave,
  atualizando,
  onAtualizar,
  onClose,
  Md,
}: {
  c: Chamado;
  previsao: string;
  semGit: boolean;
  registro?: RegistroBm;
  temChave: boolean;
  atualizando: boolean;
  onAtualizar: () => void;
  onClose: () => void;
  Md: React.ComponentType<{ texto: string }>;
}) {
  const [aba, setAba] = useState<Aba>('resumo');
  const [doc, setDoc] = useState('');
  const outrosDocs = Object.keys(c.docs ?? {}).filter((n) => n !== 'REGRA.md');
  const docAtual = outrosDocs.includes(doc) ? doc : outrosDocs[0] ?? '';

  const abas: { id: Aba; rotulo: string; mostra: boolean }[] = [
    { id: 'resumo', rotulo: 'Resumo', mostra: true },
    { id: 'regra', rotulo: 'Regra de negócio', mostra: !!c.docs?.['REGRA.md'] },
    { id: 'bm', rotulo: 'Businessmap', mostra: true },
    { id: 'docs', rotulo: `Documentos (${outrosDocs.length})`, mostra: outrosDocs.length > 0 },
  ];

  return (
    <div className="rel-backdrop" onClick={onClose}>
      <div className="rel-modal" onClick={(e) => e.stopPropagation()}>
        <header className="rel-modal-head">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rel-mono">{c.numero}</span>
              {c.situacao && <span className={`rel-tag ${estiloSituacao[c.situacao]}`}>{ROTULO_SITUACAO[c.situacao]}</span>}
              {c.revision && <span className="rel-tag rel-tag-info">revision {c.revision}</span>}
              {!c.revision && previsao && <span className="rel-tag rel-tag-alert">previsão {previsao}</span>}
              <BmColuna r={registro?.resumo} />
            </div>
            <h2 className="rel-strong mt-1 text-xl">{c.assunto}</h2>
            <p className="rel-desc">{c.cliente || '—'}</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="rel-btn rel-btn-icon"><X className="h-5 w-5" /></button>
        </header>

        <nav className="rel-tabs">
          {abas.filter((a) => a.mostra).map((a) => (
            <button key={a.id} onClick={() => setAba(a.id)} className={`rel-tab ${aba === a.id ? 'rel-tab-active' : ''}`}>
              {a.rotulo}
            </button>
          ))}
        </nav>

        <div className="rel-modal-body">
          {aba === 'resumo' && (
            <div className="rel-grid rel-grid-2">
              <Cartao titulo="Identificação">
                <dl className="rel-grid rel-grid-s2">
                  <Campo rotulo="Quem fez o PR">{(c.autores ?? []).join(', ')}</Campo>
                  <Campo rotulo="Tipo">{ROTULO_TIPO[c.tipo ?? ''] === '—' ? '' : ROTULO_TIPO[c.tipo ?? '']}</Campo>
                  <Campo rotulo="Módulo">{c.modulo}</Campo>
                  <Campo rotulo="Situação">{c.situacao ? ROTULO_SITUACAO[c.situacao] : c.status}</Campo>
                  {c.caminhoTela && <div className="sm:col-span-2"><Campo rotulo="Onde conferir na tela">{c.caminhoTela}</Campo></div>}
                </dl>
              </Cartao>

              <Cartao titulo="Publicação">
                <dl className="rel-grid rel-grid-s2">
                  <Campo rotulo="Revision">{c.revision || (previsao ? `ainda não saiu (previsão de liberação: ${previsao})` : c.situacao === 'em-correcao' ? 'ainda não saiu' : '')}</Campo>
                  <Campo rotulo="Publicado em">{formataIso(c.publicadoEm)}</Campo>
                  <Campo rotulo="Atualizado">{c.atualizadoEm}</Campo>
                </dl>
              </Cartao>

              {c.resumo && !c.temRegra && (
                <Cartao titulo="Resumo" className="lg:col-span-2"><p className="rel-value whitespace-pre-wrap">{c.resumo}</p></Cartao>
              )}

              <Cartao titulo="Entrega e testes" className="lg:col-span-2">
                <div className="rel-grid rel-grid-s3">
                  <div className={semGit ? 'hidden' : undefined}>
                    <Cabecalho icone={<GitPullRequest className="h-4 w-4" />} texto="PRs" />
                    <div className="flex flex-wrap gap-2">
                      {c.prs.length ? c.prs.map((p) =>
                        p.url ? (
                          <a key={`${p.repo}${p.numero}`} href={p.url} target="_blank" rel="noreferrer" className="rel-tag rel-tag-info">
                            {p.repo} #{p.numero} <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : <span key={`${p.repo}${p.numero}`} className="rel-tag">#{p.numero} (citado)</span>,
                      ) : <span className="rel-desc">Nenhum PR citado.</span>}
                    </div>
                  </div>
                  <div>
                    <Cabecalho icone={<FlaskConical className="h-4 w-4" />} texto="Evidência de testes" />
                    <div className="rel-list">
                      {c.evidencias.length ? c.evidencias.map((l) => (
                        <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="rel-link flex items-center gap-1 text-sm">{l.texto} <ExternalLink className="h-3 w-3" /></a>
                      )) : <span className="rel-desc">{c.temEvidencia ? 'Há arquivo de evidência nas pastas, sem link.' : 'Sem link de evidência.'}</span>}
                    </div>
                  </div>
                  <div>
                    <Cabecalho icone={<ClipboardList className="h-4 w-4" />} texto="Plano de testes" />
                    <div className="rel-list">
                      {c.planosTeste.length ? c.planosTeste.map((l) => (
                        <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="rel-link flex items-center gap-1 text-sm">{l.texto} <ExternalLink className="h-3 w-3" /></a>
                      )) : <span className="rel-desc">{c.temPlano ? 'Há plano de testes nos documentos, sem link.' : 'Sem plano de testes registrado.'}</span>}
                    </div>
                  </div>
                </div>
              </Cartao>

              {c.temPr && <div className="lg:col-span-2"><Vinculos contexto={c} semGit={semGit} /></div>}
            </div>
          )}

          {aba === 'regra' && (
            <div className="rel-box mx-auto w-full max-w-3xl"><Md texto={c.docs?.['REGRA.md'] ?? ''} /></div>
          )}

          {aba === 'bm' && (
            <div className="rel-box">
              <BmPainel chamado={c} registro={registro} semGit={semGit} temChave={temChave} atualizando={atualizando} onAtualizar={onAtualizar} />
            </div>
          )}

          {aba === 'docs' && (
            <div className="rel-grid" style={{ gridTemplateColumns: 'minmax(0, 14rem) minmax(0, 1fr)' }}>
              <ul className="rel-list">
                {outrosDocs.map((n) => (
                  <li key={n}>
                    <button onClick={() => setDoc(n)} className={`rel-btn rel-btn-sm w-full justify-start ${docAtual === n ? 'rel-btn-primary' : 'rel-btn-ghost'}`}>{n.replace(/\.md$/i, '')}</button>
                  </li>
                ))}
              </ul>
              <pre className="rel-pre rel-pre-lg" style={{ maxHeight: 'none' }}>{c.docs?.[docAtual] ?? ''}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
