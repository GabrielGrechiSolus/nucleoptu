'use client';

import React, { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { auth } from '../../firebase';
import { GRUPOS_ORDEM, type BmCartao, type BmResumoLista } from './bm';
import type { Chamado } from './parse';
import { cabecalhoBm } from './bmChave';

// Muda quando a pessoa grava ou remove a chave no perfil, para refazer as consultas.
function useVersaoChave() {
  const [v, setV] = useState(0);
  useEffect(() => {
    const f = () => setV((x) => x + 1);
    window.addEventListener('nucleoptu-bm-chave', f);
    return () => window.removeEventListener('nucleoptu-bm-chave', f);
  }, []);
  return v;
}

// Os tipos do Firebase neste projeto são simplificados (types/firebase.d.ts): getIdToken existe em tempo de execução.
const idToken = async () => (await (auth.currentUser as unknown as { getIdToken(): Promise<string> } | null)?.getIdToken()) ?? '';

export const soDigitos = (n: string) => n.replace(/\D/g, '');

// Busca em lote a coluna do BM de cada chamado (somente leitura; o servidor aplica cache e limites do BM).
export function useBmLista(numeros: string[]) {
  const [estado, setEstado] = useState<{ configurado: boolean; cartoes: Record<string, BmResumoLista>; erro: string; carregando: boolean }>({ configurado: true, cartoes: {}, erro: '', carregando: false });
  const chave = numeros.map(soDigitos).filter(Boolean).sort().join(',');
  const versao = useVersaoChave();
  useEffect(() => {
    if (!chave) return;
    let cancelado = false;
    setEstado((e) => ({ ...e, carregando: true, erro: '' }));
    (async () => {
      try {
        const r = await fetch('/api/bm/chamados', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await idToken()}`, ...cabecalhoBm() }, body: JSON.stringify({ chamados: chave.split(',') }) });
        const j = await r.json();
        if (cancelado) return;
        if (!r.ok) setEstado({ configurado: true, cartoes: {}, erro: j.erro ?? 'Falha ao consultar o Businessmap.', carregando: false });
        else setEstado({ configurado: !!j.configurado, cartoes: j.cartoes ?? {}, erro: '', carregando: false });
      } catch {
        if (!cancelado) setEstado({ configurado: true, cartoes: {}, erro: 'Não foi possível consultar o Businessmap agora.', carregando: false });
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [chave, versao]);
  return estado;
}

const dataBr = (iso: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
};

const COR_SECAO: Record<string, string> = { Solicitado: 'bg-zinc-700/40 text-zinc-300', 'Em andamento': 'bg-sky-500/15 text-sky-300', Concluído: 'bg-emerald-500/15 text-emerald-300' };

export function BmColuna({ r }: { r?: BmResumoLista }) {
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
    <div className="mb-3">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">{titulo}</div>
      {children}
    </div>
  );
}

// Seção "Businessmap" do detalhe do chamado: carrega o cartão sob demanda (uma consulta ao abrir).
export default function BmPainel({ chamado, resumo, configurado }: { chamado: Chamado; resumo?: BmResumoLista; configurado: boolean }) {
  const [cartao, setCartao] = useState<BmCartao | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const cardId = resumo?.cardId;
  const versao = useVersaoChave();

  useEffect(() => {
    setCartao(null);
    setErro('');
    if (!cardId) return;
    let cancelado = false;
    setCarregando(true);
    (async () => {
      try {
        const r = await fetch('/api/bm/cartao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await idToken()}`, ...cabecalhoBm() },
          body: JSON.stringify({ cardId, chamado: soDigitos(chamado.numero), temPr: chamado.temPr, temEvidencia: chamado.temEvidencia }),
        });
        const j = await r.json();
        if (cancelado) return;
        if (!r.ok) setErro(j.erro ?? 'Falha ao consultar o Businessmap.');
        else setCartao(j.cartao);
      } catch {
        if (!cancelado) setErro('Não foi possível consultar o Businessmap agora.');
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [cardId, chamado.numero, chamado.temPr, chamado.temEvidencia, versao]);

  if (!configurado) return <div className="mb-4 rounded border border-zinc-800 p-3 text-sm text-zinc-500">Businessmap sem chave: informe a sua em Perfil → Businessmap.</div>;
  if (!resumo) return <div className="mb-4 rounded border border-zinc-800 p-3 text-sm text-zinc-500">Businessmap: nenhum cartão encontrado para o chamado {chamado.numero}.</div>;

  return (
    <section className="mb-4 rounded border border-zinc-800 p-3 text-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Businessmap</h3>
        <a href={resumo.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky-400 hover:underline">Abrir cartão {resumo.cardId} <ExternalLink className="h-3 w-3" /></a>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2"><BmColuna r={resumo} /><span className="text-zinc-400">{resumo.secao}</span><span className="text-zinc-400">Responsável: {resumo.responsavel}</span></div>
      {carregando && <p className="text-zinc-500">Carregando dados do cartão...</p>}
      {erro && <p className="text-red-300">{erro}</p>}
      {cartao && (
        <>
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
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
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
                <div key={k} className={k === 'Título' ? 'col-span-2 sm:col-span-3' : undefined}><dt className="text-xs text-zinc-500">{k}</dt><dd className="break-words">{v}</dd></div>
              ))}
            </dl>
          </Secao>

          {cartao.tempos.length > 0 && (
            <Secao titulo="Tempos do fluxo">
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
                {cartao.tempos.map((t) => <div key={t.rotulo}><dt className="text-xs text-zinc-500">{t.rotulo}</dt><dd>{dataBr(t.valor)}</dd></div>)}
              </dl>
            </Secao>
          )}

          {GRUPOS_ORDEM.map((g) => {
            const lista = cartao.campos.filter((c) => c.grupo === g);
            if (!lista.length) return null;
            return (
              <Secao key={g} titulo={`Campos — ${g}`}>
                <dl className="grid grid-cols-1 gap-x-3 gap-y-2 sm:grid-cols-2">
                  {lista.map((c) => <div key={c.nome}><dt className="text-xs text-zinc-500">{c.nome}</dt><dd className="whitespace-pre-wrap break-words">{c.valor}</dd></div>)}
                </dl>
              </Secao>
            );
          })}

          {cartao.descricao && <Secao titulo="Descrição"><div className="whitespace-pre-wrap break-words rounded bg-zinc-900 p-3 text-zinc-200">{cartao.descricao}</div></Secao>}

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

          {cartao.comentarios.length > 0 && (
            <Secao titulo={`Comentários (${cartao.comentarios.length})`}>
              <ul className="space-y-2">
                {cartao.comentarios.map((m, i) => (
                  <li key={i} className="rounded bg-zinc-900 p-2"><div className="text-xs text-zinc-500">{m.autor} · {dataBr(m.em)}</div><div className="whitespace-pre-wrap break-words">{m.texto}</div></li>
                ))}
              </ul>
            </Secao>
          )}
        </>
      )}
    </section>
  );
}
