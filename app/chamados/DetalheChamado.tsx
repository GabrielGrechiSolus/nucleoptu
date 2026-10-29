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
  'em-correcao': 'bg-amber-500/15 text-amber-600',
  corrigido: 'bg-emerald-500/15 text-emerald-600',
  encerrado: 'bg-zinc-800 text-zinc-400',
};

function Cartao({ titulo, children, className = '' }: { titulo: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-zinc-800 p-4 ${className}`}>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">{titulo}</h3>
      {children}
    </section>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-zinc-500">{rotulo}</dt>
      <dd className="break-words text-sm">{children || '—'}</dd>
    </div>
  );
}

// Detalhe do chamado em janela grande, dividido em abas (Resumo, Regra de negócio, Businessmap, Documentos).
export default function DetalheChamado({
  c,
  semGit,
  registro,
  temChave,
  atualizando,
  onAtualizar,
  onClose,
  Md,
}: {
  c: Chamado;
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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-2 sm:p-6" onClick={onClose}>
      <div className="flex h-full max-h-[96vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-zinc-700 bg-zinc-950" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between gap-3 border-b border-zinc-800 p-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sky-300">{c.numero}</span>
              {c.situacao && <span className={`rounded px-1.5 py-0.5 text-xs ${estiloSituacao[c.situacao]}`}>{ROTULO_SITUACAO[c.situacao]}</span>}
              {c.revision && <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-xs text-sky-300">revision {c.revision}</span>}
              <BmColuna r={registro?.resumo} />
            </div>
            <h2 className="mt-1 text-xl font-semibold">{c.assunto}</h2>
            <p className="text-sm text-zinc-400">{c.cliente || '—'}</p>
          </div>
          <button onClick={onClose} aria-label="Fechar" className="rounded p-1 hover:bg-zinc-800"><X className="h-5 w-5" /></button>
        </header>

        <nav className="flex flex-wrap gap-1 border-b border-zinc-800 px-4">
          {abas.filter((a) => a.mostra).map((a) => (
            <button key={a.id} onClick={() => setAba(a.id)} className={`-mb-px border-b-2 px-3 py-2 text-sm ${aba === a.id ? 'border-sky-400 text-sky-300' : 'border-transparent text-zinc-400 hover:text-zinc-200'}`}>
              {a.rotulo}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto p-4">
          {aba === 'resumo' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Cartao titulo="Identificação">
                <dl className="grid grid-cols-2 gap-3">
                  <Campo rotulo="Quem fez o PR">{(c.autores ?? []).join(', ')}</Campo>
                  <Campo rotulo="Tipo">{ROTULO_TIPO[c.tipo ?? ''] === '—' ? '' : ROTULO_TIPO[c.tipo ?? '']}</Campo>
                  <Campo rotulo="Módulo">{c.modulo}</Campo>
                  <Campo rotulo="Situação">{c.situacao ? ROTULO_SITUACAO[c.situacao] : c.status}</Campo>
                  {c.caminhoTela && <div className="col-span-2"><Campo rotulo="Onde conferir na tela">{c.caminhoTela}</Campo></div>}
                </dl>
              </Cartao>

              <Cartao titulo="Publicação">
                <dl className="grid grid-cols-2 gap-3">
                  <Campo rotulo="Revision">{c.revision || (c.situacao === 'em-correcao' ? 'ainda não saiu' : '')}</Campo>
                  <Campo rotulo="Publicado em">{formataIso(c.publicadoEm)}</Campo>
                  <Campo rotulo="Atualizado">{c.atualizadoEm}</Campo>
                </dl>
              </Cartao>

              {c.resumo && !c.temRegra && (
                <Cartao titulo="Resumo" className="lg:col-span-2"><p className="whitespace-pre-wrap text-sm text-zinc-300">{c.resumo}</p></Cartao>
              )}

              <Cartao titulo="Entrega e testes" className="lg:col-span-2">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className={semGit ? 'hidden' : undefined}>
                    <div className="mb-1 flex items-center gap-2 text-xs text-zinc-500"><GitPullRequest className="h-4 w-4" /> PRs</div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      {c.prs.length ? c.prs.map((p) =>
                        p.url ? (
                          <a key={`${p.repo}${p.numero}`} href={p.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded bg-violet-500/15 px-2 py-1 text-violet-300 hover:underline">
                            {p.repo} #{p.numero} <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : <span key={`${p.repo}${p.numero}`} className="rounded bg-zinc-800 px-2 py-1 text-zinc-300">#{p.numero} (citado)</span>,
                      ) : <span className="text-zinc-600">Nenhum PR citado.</span>}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-xs text-zinc-500"><FlaskConical className="h-4 w-4" /> Evidência de testes</div>
                    <div className="space-y-1 text-sm">
                      {c.evidencias.length ? c.evidencias.map((l) => (
                        <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sky-400 hover:underline">{l.texto} <ExternalLink className="h-3 w-3" /></a>
                      )) : <span className="text-zinc-600">{c.temEvidencia ? 'Há arquivo de evidência nas pastas, sem link.' : 'Sem link de evidência.'}</span>}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-2 text-xs text-zinc-500"><ClipboardList className="h-4 w-4" /> Plano de testes</div>
                    <div className="space-y-1 text-sm">
                      {c.planosTeste.length ? c.planosTeste.map((l) => (
                        <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sky-400 hover:underline">{l.texto} <ExternalLink className="h-3 w-3" /></a>
                      )) : <span className="text-zinc-600">{c.temPlano ? 'Há plano de testes nos documentos, sem link.' : 'Sem plano de testes registrado.'}</span>}
                    </div>
                  </div>
                </div>
              </Cartao>

              {c.temPr && <div className="lg:col-span-2"><Vinculos contexto={c} semGit={semGit} /></div>}
            </div>
          )}

          {aba === 'regra' && (
            <div className="mx-auto max-w-3xl rounded-lg bg-zinc-900 p-5"><Md texto={c.docs?.['REGRA.md'] ?? ''} /></div>
          )}

          {aba === 'bm' && <BmPainel chamado={c} registro={registro} semGit={semGit} temChave={temChave} atualizando={atualizando} onAtualizar={onAtualizar} />}

          {aba === 'docs' && (
            <div className="grid gap-4 md:grid-cols-[14rem_1fr]">
              <ul className="space-y-1 text-sm">
                {outrosDocs.map((n) => (
                  <li key={n}>
                    <button onClick={() => setDoc(n)} className={`w-full rounded px-3 py-1.5 text-left ${docAtual === n ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-900'}`}>{n.replace(/\.md$/i, '')}</button>
                  </li>
                ))}
              </ul>
              <pre className="whitespace-pre-wrap break-words rounded-lg bg-zinc-900 p-4 text-xs leading-relaxed text-zinc-200">{c.docs?.[docAtual] ?? ''}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
