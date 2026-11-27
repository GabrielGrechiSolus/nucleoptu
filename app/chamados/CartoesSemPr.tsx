'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { SortTh, sortRows, useSort } from '../components/SortableTable';
import { ROTULO_PRIORIDADE, ROTULO_SECAO, atencaoDe, concluido, diasDesde, pontuacao, type CartaoQuadro } from './bmQuadro';
import { FILTROS_CARTOES, filtraCartoes, type AbaCartoes, type FiltrosCartoes } from './regrasSemPr';
import { COR_ATENCAO, ROTULO_ATENCAO, dataBr } from './rotulosCartao';

const ABAS: { id: AbaCartoes; rotulo: string }[] = [
  { id: 'andamento', rotulo: 'Em andamento' },
  { id: 'atencao', rotulo: 'Com atenção' },
  { id: 'concluidos', rotulo: 'Concluídos' },
  { id: 'todos', rotulo: 'Todos' },
];

const LISTAS = [
  { campo: 'responsavel', rotulo: 'Responsável', todos: 'Todos' },
  { campo: 'coluna', rotulo: 'Coluna', todos: 'Todas' },
  { campo: 'tipo', rotulo: 'Tipo', todos: 'Todos' },
] as const;

interface Props {
  cartoes: CartaoQuadro[];
  filtros: FiltrosCartoes;
  onFiltros: (f: FiltrosCartoes) => void;
  reports: Map<string, CartaoQuadro[]>;
  agora: number;
  carregando: boolean;
  sincronizado: string;
  onAbrir: (id: string) => void;
  hrefDe: (id: string) => string;
}

export default function CartoesSemPr({ cartoes, filtros, onFiltros, reports, agora, carregando, sincronizado, onAbrir, hrefDe }: Props) {
  const { sort, toggleSort } = useSort({ key: 'relevancia', dir: 'desc' });
  const [mostraListas, setMostraListas] = useState(false);
  const reportsDe = (c: CartaoQuadro) => (c.numero ? reports.get(c.numero) : undefined);
  const contagem = useMemo(
    () => Object.fromEntries(ABAS.map((a) => [a.id, filtraCartoes(cartoes, { ...filtros, aba: a.id }, reports, agora).length])) as Record<AbaCartoes, number>,
    [cartoes, filtros, reports, agora],
  );
  const filtrados = sortRows(filtraCartoes(cartoes, filtros, reports, agora), sort, {
    relevancia: (c) => pontuacao(c, reportsDe(c), agora) * 1e6 + Date.parse(c.atualizadoEm || '') / 1e6,
    numero: (c) => c.numero,
    titulo: (c) => c.titulo,
    coluna: (c) => c.coluna,
    responsavel: (c) => c.responsavel,
    prazo: (c) => (c.prazo ? Date.parse(c.prazo) : null),
    parado: (c) => (concluido(c) ? null : diasDesde(c.naColunaDesde, agora)),
    atualizado: (c) => Date.parse(c.atualizadoEm || ''),
  });
  const escondidos = cartoes.length - filtrados.length;
  const opcoes = (campo: (typeof LISTAS)[number]['campo']) => [...new Set(cartoes.map((c) => c[campo]).filter(Boolean))].sort();
  const listasAtivas = LISTAS.filter((l) => filtros[l.campo]).length;

  return (
    <div className="space-y-3">
      <section className="rel-box space-y-3">
        <div>
          <h2 className="rel-secao-titulo">Cartões do BM sem PR</h2>
          <p className="rel-desc mt-1">Ordenados pelo que pede atenção: report, bloqueio, prazo, prioridade e tempo parado.{sincronizado ? ` ${sincronizado}` : ''}</p>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1" role="group" aria-label="Situação dos cartões">
            {ABAS.map((a) => (
              <button key={a.id} type="button" onClick={() => onFiltros({ ...filtros, aba: a.id })} aria-pressed={filtros.aba === a.id} className={`rel-segmento ${filtros.aba === a.id ? 'rel-segmento-ativo' : ''}`}>
                {a.rotulo} <span className="rel-segmento-contagem">({contagem[a.id]})</span>
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setMostraListas((v) => !v)} aria-expanded={mostraListas} className="rel-btn rel-btn-sm rel-btn-outline">
            Filtros dos cartões{listasAtivas > 0 && <span className="rel-contador">{listasAtivas}</span>}
          </button>
        </div>
        {mostraListas && (
          <div className="rel-filters">
            {LISTAS.map((l) => (
              <label key={l.campo} className="rel-field">
                <span className="rel-label">{l.rotulo}</span>
                <select value={filtros[l.campo]} onChange={(e) => onFiltros({ ...filtros, [l.campo]: e.target.value })} className="rel-input">
                  <option value="">{l.todos}</option>
                  {opcoes(l.campo).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
            ))}
            <label className="rel-desc rel-check-inline">
              <input type="checkbox" checked={filtros.semNumero} onChange={(e) => onFiltros({ ...filtros, semNumero: e.target.checked })} />
              Incluir cartões sem número de chamado
            </label>
          </div>
        )}
        <div className="rel-filtros-rodape">
          <span className="rel-desc">{`${filtrados.length} de ${cartoes.length} cartões`}</span>
          {escondidos > 0 && (
            <button type="button" onClick={() => onFiltros({ ...FILTROS_CARTOES, aba: 'todos', semNumero: true })} className="rel-btn rel-btn-sm rel-btn-ghost">
              Mostrar os {cartoes.length}
            </button>
          )}
        </div>
      </section>

      <section className="rel-table-wrap">
        <table className="w-full text-left text-sm">
          <thead className="text-xs">
            <tr>
              <SortTh label="Relevância" k="relevancia" sort={sort} onSort={toggleSort} className="hidden md:table-cell" />
              <SortTh label="Chamado" k="numero" sort={sort} onSort={toggleSort} />
              <SortTh label="Assunto" k="titulo" sort={sort} onSort={toggleSort} />
              <SortTh label="Coluna" k="coluna" sort={sort} onSort={toggleSort} />
              <SortTh label="Responsável" k="responsavel" sort={sort} onSort={toggleSort} className="hidden sm:table-cell" />
              <th className="px-3 py-2">Atenção</th>
              <SortTh label="Prazo" k="prazo" sort={sort} onSort={toggleSort} className="hidden lg:table-cell" />
              <SortTh label="Parado" k="parado" sort={sort} onSort={toggleSort} className="hidden lg:table-cell" />
              <SortTh label="Atualizado" k="atualizado" sort={sort} onSort={toggleSort} className="hidden xl:table-cell" />
            </tr>
          </thead>
          <tbody>
            {carregando && <tr><td colSpan={9} className="rel-empty">Carregando...</td></tr>}
            {!carregando && !filtrados.length && (
              <tr><td colSpan={9} className="rel-empty">{cartoes.length ? 'Nenhum cartão com esses filtros.' : 'Aguardando a sincronização automática do Businessmap.'}</td></tr>
            )}
            {filtrados.map((c) => {
              const rep = reportsDe(c);
              const atencao = atencaoDe(c, rep, agora);
              const pontos = pontuacao(c, rep, agora);
              return (
                <tr key={c.cardId} onClick={() => onAbrir(String(c.cardId))} className="rel-row">
                  <td className="hidden px-3 py-2 md:table-cell"><span className={`rel-tag ${pontos >= 50 ? 'rel-tag-error' : pontos >= 20 ? 'rel-tag-alert' : ''}`}>{Math.round(pontos)}</span></td>
                  <td className="rel-mono whitespace-nowrap px-3 py-2"><Link href={hrefDe(String(c.cardId))} onClick={(e) => e.stopPropagation()} className="rel-link">{c.numero || '—'}</Link></td>
                  <td className="max-w-[420px] px-3 py-2"><div className="rel-strong">{c.titulo}</div><div className="rel-desc">{c.tipo || '—'}</div></td>
                  <td className="px-3 py-2"><span className={`rel-tag ${concluido(c) ? 'rel-tag-ok' : 'rel-tag-info'}`}>{c.coluna || ROTULO_SECAO[c.secao] || '—'}</span></td>
                  <td className="hidden px-3 py-2 sm:table-cell">{c.responsavel || '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {atencao.map((a) => (
                        <span key={a} className={`rel-tag ${COR_ATENCAO[a]}`}>
                          {a === 'parado' ? `Parado ${diasDesde(c.naColunaDesde, agora)}d` : a === 'prioridade' ? ROTULO_PRIORIDADE[c.prioridade ?? 0] : ROTULO_ATENCAO[a]}
                        </span>
                      ))}
                      {!atencao.length && <span className="rel-desc">—</span>}
                    </div>
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-2 lg:table-cell">{dataBr(c.prazo)}</td>
                  <td className="hidden whitespace-nowrap px-3 py-2 lg:table-cell">{concluido(c) ? '—' : `${diasDesde(c.naColunaDesde, agora)} dia(s)`}</td>
                  <td className="hidden whitespace-nowrap px-3 py-2 xl:table-cell">{dataBr(c.atualizadoEm)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
