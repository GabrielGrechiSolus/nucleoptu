'use client';

import React, { useMemo } from 'react';
import { ExternalLink, RefreshCcw } from 'lucide-react';
import { GRUPOS_ORDEM, cartaoSemGit, conferenciaDeCartao, type BmCartao, type BmResumoLista } from './bm';
import type { RegistroBm } from './bmRegistro';
import { ocultaGit } from './semgit';
import type { Chamado } from './parse';

const dataBr = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

const COR_SECAO: Record<string, string> = { Solicitado: 'bg-zinc-700/40 text-zinc-300', 'Em andamento': 'bg-sky-500/15 text-sky-300', Concluído: 'bg-emerald-500/15 text-emerald-300' };

export function BmColuna({ r }: { r?: BmResumoLista | null }) {
  if (!r) return <span className="text-zinc-600">—</span>;
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`inline-block w-fit rounded px-1.5 py-0.5 text-xs ${COR_SECAO[r.secao] ?? 'bg-zinc-700/40 text-zinc-300'}`}>{r.coluna}</span>
      {r.bloqueado && <span className="w-fit rounded bg-red-500/15 px-1.5 py-0.5 text-xs text-red-300">bloqueado</span>}
    </div>
  );
}

const COR_CONF = { ok: 'bg-emerald-500/15 text-emerald-300', pendente: 'bg-red-500/15 text-red-300', atencao: 'bg-amber-500/15 text-amber-300' } as const;
const ROT_CONF = { ok: 'ok', pendente: 'pendente', atencao: 'atenção' } as const;

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">{titulo}</div>
      {children}
    </div>
  );
}

// Seção "Businessmap" do detalhe: mostra o registro gravado no banco (não consulta o BM ao abrir).
// Só quem tem a chave do BM pode atualizar o registro.
export default function BmPainel({
  chamado,
  registro,
  semGit,
  temChave,
  atualizando,
  onAtualizar,
}: {
  chamado: Chamado;
  registro?: RegistroBm;
  semGit: boolean;
  temChave: boolean;
  atualizando: boolean;
  onAtualizar: () => void;
}) {
  const cartao: BmCartao | null = useMemo(() => {
    if (!registro?.cartao) return null;
    const conf = conferenciaDeCartao(registro.cartao, { temPr: chamado.temPr, temEvidencia: chamado.temEvidencia }, semGit);
    const base = semGit ? cartaoSemGit(registro.cartao, ocultaGit) : registro.cartao;
    return { ...base, conferencia: conf };
  }, [registro, chamado.temPr, chamado.temEvidencia, semGit]);

  const botao = temChave && (
    <button onClick={onAtualizar} disabled={atualizando} className="inline-flex items-center gap-1 rounded border border-zinc-700 px-3 py-1.5 text-xs hover:bg-zinc-800 disabled:opacity-50">
      <RefreshCcw className={`h-3.5 w-3.5 ${atualizando ? 'animate-spin' : ''}`} /> {atualizando ? 'Atualizando...' : 'Atualizar do BM'}
    </button>
  );

  if (!registro) {
    return (
      <div className="rounded border border-zinc-800 p-4 text-sm text-zinc-400">
        <p className="mb-2">Os dados do Businessmap deste chamado ainda não foram sincronizados.</p>
        {temChave ? botao : <p className="text-xs text-zinc-500">Quem tem a chave do BM no perfil pode sincronizar (botão “Atualizar do BM” na lista de chamados).</p>}
      </div>
    );
  }
  if (!registro.encontrado || !cartao) {
    return (
      <div className="rounded border border-zinc-800 p-4 text-sm text-zinc-400">
        <p className="mb-2">Nenhum cartão encontrado no Businessmap para o chamado {chamado.numero} (verificado em {dataBr(registro.sincronizadoEm)} por {registro.sincronizadoPor || '—'}).</p>
        {botao}
      </div>
    );
  }

  const resumo = registro.resumo!;
  return (
    <section className="text-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded border border-zinc-800 p-3">
        <div className="text-xs text-zinc-400">
          Sincronizado em <strong className="text-zinc-200">{dataBr(registro.sincronizadoEm)}</strong> por {registro.sincronizadoPor || '—'}. Os dados mudam no BM, mas aqui só são atualizados quando alguém com a chave do BM sincroniza.
        </div>
        <div className="flex items-center gap-2">
          <a href={resumo.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky-400 hover:underline">Abrir cartão {resumo.cardId} <ExternalLink className="h-3 w-3" /></a>
          {botao}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2"><BmColuna r={resumo} /><span className="text-zinc-400">{resumo.secao}</span><span className="text-zinc-400">Responsável: {resumo.responsavel}</span></div>

      <div className="grid gap-x-6 lg:grid-cols-2">
        <div>
          <Secao titulo="Conferência do card">
            <ul className="space-y-1">
              {cartao.conferencia.map((i) => (
                <li key={i.item} className="flex flex-wrap items-center gap-2">
                  <span className={`rounded px-1.5 py-0.5 text-xs ${COR_CONF[i.situacao]}`}>{ROT_CONF[i.situacao]}</span>
                  <span>{i.item}</span>
                  <span className="text-xs text-zinc-500">{i.detalhe}</span>
                </li>
              ))}
            </ul>
          </Secao>

          <Secao titulo="Dados gerais">
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
              {[
                ['Título', cartao.titulo],
                ['Tipo', cartao.tipo],
                ['Raia', cartao.raia],
                ['Prioridade', cartao.prioridade],
                ['Tamanho', cartao.tamanho],
                ['Solicitante', cartao.solicitante],
                ['Responsável', cartao.responsavel],
                ['Co-responsáveis', cartao.coResponsaveis.join(', ')],
                ['Observadores', cartao.observadores.join(', ')],
                ['Criado em', cartao.criadoEm ? dataBr(cartao.criadoEm) : ''],
                ['Atualizado em', cartao.atualizadoEm ? dataBr(cartao.atualizadoEm) : ''],
                ['Na coluna desde', cartao.naColunaDesde ? dataBr(cartao.naColunaDesde) : ''],
                ['Prazo', cartao.prazo ? dataBr(cartao.prazo) : ''],
                ['Bloqueio', cartao.motivoBloqueio],
                ['Tags', cartao.tags.join(', ')],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k} className={k === 'Título' ? 'col-span-2' : undefined}><dt className="text-xs text-zinc-500">{k}</dt><dd className="break-words">{v}</dd></div>
              ))}
            </dl>
          </Secao>

          {cartao.tempos.length > 0 && (
            <Secao titulo="Tempos do fluxo">
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                {cartao.tempos.map((t) => <div key={t.rotulo}><dt className="text-xs text-zinc-500">{t.rotulo}</dt><dd>{dataBr(t.valor)}</dd></div>)}
              </dl>
            </Secao>
          )}

          {cartao.descricao && <Secao titulo="Descrição"><div className="whitespace-pre-wrap break-words rounded bg-zinc-900 p-3 text-zinc-200">{cartao.descricao}</div></Secao>}
        </div>

        <div>
          {GRUPOS_ORDEM.map((g) => {
            const lista = cartao.campos.filter((c) => c.grupo === g);
            if (!lista.length) return null;
            return (
              <Secao key={g} titulo={`Campos — ${g}`}>
                <dl className="grid grid-cols-1 gap-y-2">
                  {lista.map((c) => <div key={c.nome}><dt className="text-xs text-zinc-500">{c.nome}</dt><dd className="whitespace-pre-wrap break-words">{c.valor}</dd></div>)}
                </dl>
              </Secao>
            );
          })}

          {cartao.subtarefas.length > 0 && (
            <Secao titulo={`Subtarefas (${cartao.subtarefas.filter((s) => s.concluida).length}/${cartao.subtarefas.length})`}>
              <ul className="space-y-1">
                {cartao.subtarefas.map((s, i) => (
                  <li key={i} className="flex gap-2"><span>{s.concluida ? '☑' : '☐'}</span><span className="break-words">{s.descricao}{s.responsavel && <span className="text-xs text-zinc-500"> — {s.responsavel}</span>}</span></li>
                ))}
              </ul>
            </Secao>
          )}

          {cartao.vinculados.length > 0 && (
            <Secao titulo="Cartões vinculados">
              <ul className="space-y-1">{cartao.vinculados.map((v) => <li key={v.cardId}>{v.chamado || v.cardId} — {v.titulo || 'sem título'} <span className="text-xs text-zinc-500">{v.coluna}{v.tipoVinculo && ` · ${v.tipoVinculo}`}</span></li>)}</ul>
            </Secao>
          )}

          {cartao.anexos.length > 0 && (
            <Secao titulo="Anexos">
              <ul className="space-y-1">{cartao.anexos.map((a, i) => <li key={i}>{a.link ? <a href={a.link} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">{a.nome}</a> : a.nome}</li>)}</ul>
            </Secao>
          )}
        </div>
      </div>

      {cartao.comentarios.length > 0 && (
        <Secao titulo={`Comentários (${cartao.comentarios.length})`}>
          <ul className="space-y-2">
            {cartao.comentarios.map((m, i) => (
              <li key={i} className="rounded bg-zinc-900 p-2"><div className="text-xs text-zinc-500">{m.autor} · {dataBr(m.em)}</div><div className="whitespace-pre-wrap break-words">{m.texto}</div></li>
            ))}
          </ul>
        </Secao>
      )}
    </section>
  );
}
