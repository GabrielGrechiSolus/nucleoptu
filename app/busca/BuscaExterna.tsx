'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Globe } from 'lucide-react';
import { tokenDoLogin } from '../chamados/atualizaGit';
import { cabecalhoBm, lerChaveBm } from '../chamados/bmChave';
import type { BmResumoLista } from '../chamados/bm';
import { criaConsultaSalva } from '../chamados/dadosSalvos';
import { formataData } from '../chamados/relatusDados';
import { numerosDeChamado } from './motor';

interface PrEncontrado { repo: string; numero: number; titulo: string; estado: string; autor: string; atualizadoEm: string; url: string; chamado: string }

interface Resultado {
  consulta: string;
  prs: PrEncontrado[];
  total: number;
  cartoes: BmResumoLista[];
  avisos: string[];
}

const VALIDADE_MS = 5 * 60_000;
const consultaGit = criaConsultaSalva<{ prs: PrEncontrado[]; total: number }>({ nome: 'busca-git', validade: () => VALIDADE_MS });
const consultaBm = criaConsultaSalva<BmResumoLista[]>({ nome: 'busca-bm', validade: () => VALIDADE_MS });

async function pedeJson<T>(url: string, init: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  const corpo = (await r.json().catch(() => ({}))) as T & { erro?: string };
  if (!r.ok) throw new Error(corpo.erro ?? `Erro ${r.status}`);
  return corpo;
}

const buscaGit = (consulta: string) =>
  consultaGit.obtem(consulta, async () => pedeJson(`/api/git/busca?q=${encodeURIComponent(consulta)}`, { headers: { Authorization: `Bearer ${await tokenDoLogin()}` } }));

const buscaBm = (numeros: string[]) =>
  consultaBm.obtem(numeros.join(','), async () => {
    const r = await pedeJson<{ cartoes?: Record<string, BmResumoLista> }>('/api/bm/chamados', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await tokenDoLogin()}`, ...cabecalhoBm() },
      body: JSON.stringify({ chamados: numeros }),
    });
    return Object.values(r.cartoes ?? {});
  });

interface Props {
  consulta: string;
  semGit: boolean;
  idsComContexto: Set<string>;
  hrefDoChamado: (id: string) => string;
}

export default function BuscaExterna({ consulta, semGit, idsComContexto, hrefDoChamado }: Props) {
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [buscando, setBuscando] = useState('');
  const texto = consulta.trim();
  const atual = resultado?.consulta === texto ? resultado : null;

  const buscar = async () => {
    setBuscando(texto);
    const avisos: string[] = [];
    const numeros = numerosDeChamado(texto).slice(0, 20);
    let prs: PrEncontrado[] = [];
    let total = 0;
    let cartoes: BmResumoLista[] = [];
    const tarefas: Promise<void>[] = [];
    if (!semGit) tarefas.push(buscaGit(texto).then((r) => { prs = r.prs; total = r.total; }).catch((e: Error) => { avisos.push(`GitHub: ${e.message}`); }));
    if (!numeros.length) avisos.push('O BM só é consultado ao vivo pelo número do chamado. Nos demais textos, vale a busca nos dados já sincronizados.');
    else if (!lerChaveBm()) avisos.push('Para consultar o BM ao vivo, informe a sua chave em Perfil → Businessmap.');
    else tarefas.push(buscaBm(numeros).then((r) => { cartoes = r; if (!r.length) avisos.push('BM: nenhum cartão encontrado com esse número.'); }).catch((e: Error) => { avisos.push(`BM: ${e.message}`); }));
    await Promise.all(tarefas);
    setResultado({ consulta: texto, prs, total, cartoes, avisos });
    setBuscando('');
  };

  if (texto.length < 3) return null;

  return (
    <section className="rel-box space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="rel-desc">Não achou? A lista acima só tem o que já foi importado ou sincronizado.</p>
        <button type="button" onClick={() => void buscar()} disabled={buscando === texto} className="rel-btn rel-btn-sm rel-btn-outline">
          <Globe size={14} />{buscando === texto ? 'Buscando…' : semGit ? 'Buscar no BM ao vivo' : 'Buscar no GitHub e no BM ao vivo'}
        </button>
      </div>

      {atual && (
        <div className="space-y-3" aria-live="polite">
          {atual.avisos.map((a) => <p key={a} className="rel-notice">{a}</p>)}
          {atual.cartoes.length > 0 && (
            <div className="space-y-2">
              <h3 className="rel-secao-titulo">Businessmap ({atual.cartoes.length})</h3>
              <ul className="rel-list">
                {atual.cartoes.map((c) => (
                  <li key={c.cardId} className="rel-box-flat flex flex-wrap items-center gap-2">
                    <a href={c.url} target="_blank" rel="noreferrer" className="rel-link inline-flex items-center gap-1">{c.chamado} · cartão {c.cardId}<ExternalLink size={13} /></a>
                    <span className="rel-tag rel-tag-info">{c.coluna || c.secao}</span>
                    <span className="rel-desc">{c.responsavel || 'Sem responsável'}</span>
                    {idsComContexto.has(c.chamado.replace(/\D/g, '')) && <Link href={hrefDoChamado(c.chamado.replace(/\D/g, ''))} className="rel-link">Ver contexto</Link>}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!semGit && (
            <div className="space-y-2">
              <h3 className="rel-secao-titulo">Pull requests no GitHub ({atual.total})</h3>
              {!atual.prs.length && <p className="rel-desc">Nenhum PR encontrado no título ou na descrição.</p>}
              <ul className="rel-list">
                {atual.prs.map((p) => {
                  const id = p.chamado.replace(/\D/g, '');
                  return (
                    <li key={`${p.repo}#${p.numero}`} className="rel-box-flat space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <a href={p.url} target="_blank" rel="noreferrer" className="rel-link inline-flex items-center gap-1">{p.repo} #{p.numero}<ExternalLink size={13} /></a>
                        <span className={`rel-tag ${p.estado === 'mesclado' ? 'rel-tag-ok' : p.estado === 'aberto' ? 'rel-tag-alert' : ''}`}>{p.estado}</span>
                        <span className="rel-desc">{[p.autor, formataData(p.atualizadoEm)].filter(Boolean).join(' · ')}</span>
                        {id && idsComContexto.has(id) && !atual.cartoes.some((c) => c.chamado.replace(/\D/g, '') === id) && <Link href={hrefDoChamado(id)} className="rel-link">Ver contexto</Link>}
                      </div>
                      <p className="rel-value">{p.titulo}</p>
                    </li>
                  );
                })}
              </ul>
              {atual.total > atual.prs.length && <p className="rel-desc">Mostrando os {atual.prs.length} atualizados mais recentemente. Acrescente palavras para refinar.</p>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
