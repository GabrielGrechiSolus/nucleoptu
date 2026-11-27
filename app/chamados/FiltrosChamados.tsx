'use client';

import { useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import CampoBusca from '../components/CampoBusca';
import type { Tri } from './filtro';

export type AbaChamados = 'todos' | 'em-correcao' | 'corrigidos' | 'regras';

export interface FiltrosTela {
  busca: string;
  cliente: string;
  modulo: string;
  autor: string;
  revision: string;
  pr: Tri;
  evidencia: Tri;
  plano: Tri;
  regra: Tri;
}

export const FILTROS_VAZIOS: FiltrosTela = { busca: '', cliente: '', modulo: '', autor: '', revision: '', pr: 'todos', evidencia: 'todos', plano: 'todos', regra: 'todos' };

const ABAS: { id: AbaChamados; rotulo: string }[] = [
  { id: 'todos', rotulo: 'Todos' },
  { id: 'em-correcao', rotulo: 'Em correção' },
  { id: 'corrigidos', rotulo: 'Corrigidos' },
  { id: 'regras', rotulo: 'Regras e orientações' },
];

type CampoLista = 'cliente' | 'modulo' | 'autor' | 'revision';
type CampoTri = 'pr' | 'evidencia' | 'plano' | 'regra';

const LISTAS: { campo: CampoLista; rotulo: string; todos: string; opcoes: keyof Props['opcoes'] }[] = [
  { campo: 'cliente', rotulo: 'Cliente', todos: 'Todos', opcoes: 'clientes' },
  { campo: 'modulo', rotulo: 'Módulo', todos: 'Todos', opcoes: 'modulos' },
  { campo: 'autor', rotulo: 'Autor do PR', todos: 'Todos', opcoes: 'autores' },
  { campo: 'revision', rotulo: 'Revision', todos: 'Todas', opcoes: 'revisions' },
];

const SIM_NAO: { campo: CampoTri; rotulo: string }[] = [
  { campo: 'pr', rotulo: 'Tem PR' },
  { campo: 'evidencia', rotulo: 'Evidência' },
  { campo: 'plano', rotulo: 'Plano de testes' },
  { campo: 'regra', rotulo: 'Tem REGRA.md' },
];

interface Props {
  filtros: FiltrosTela;
  onMuda: <K extends keyof FiltrosTela>(campo: K, valor: FiltrosTela[K]) => void;
  onLimpar: () => void;
  aba: AbaChamados;
  onAba: (aba: AbaChamados) => void;
  contagem: Record<AbaChamados, number>;
  opcoes: { clientes: string[]; modulos: string[]; autores: string[]; revisions: string[] };
  exibidos: number;
  total: number;
  semGit: boolean;
}

export default function FiltrosChamados({ filtros, onMuda, onLimpar, aba, onAba, contagem, opcoes, exibidos, total, semGit }: Props) {
  const [aberto, setAberto] = useState(false);
  const simNao = SIM_NAO.filter((f) => !(semGit && f.campo === 'pr'));
  const ativos = [
    ...LISTAS.filter((f) => filtros[f.campo]).map((f) => ({ campo: f.campo as keyof FiltrosTela, texto: `${f.rotulo}: ${filtros[f.campo]}`, vazio: '' as string })),
    ...simNao.filter((f) => filtros[f.campo] !== 'todos').map((f) => ({ campo: f.campo as keyof FiltrosTela, texto: `${f.rotulo}: ${filtros[f.campo] === 'sim' ? 'Sim' : 'Não'}`, vazio: 'todos' })),
  ];
  const temOQueLimpar = ativos.length > 0 || Boolean(filtros.busca) || aba !== 'todos';

  return (
    <section className="rel-box space-y-3">
      <div className="rel-segmentos" role="group" aria-label="Situação dos chamados">
        {ABAS.map((a) => (
          <button key={a.id} type="button" onClick={() => onAba(a.id)} aria-pressed={aba === a.id} className={`rel-segmento ${aba === a.id ? 'rel-segmento-ativo' : ''}`}>
            {a.rotulo} <span className="rel-segmento-contagem">({contagem[a.id]})</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="min-w-[240px] flex-1">
          <CampoBusca valor={filtros.busca} onChange={(v) => onMuda('busca', v)} placeholder="Buscar em chamado, documentos, PR, branch e BM" rotulo="Pesquisar chamados" />
        </div>
        <button type="button" onClick={() => setAberto((v) => !v)} aria-expanded={aberto} aria-label="Filtros" className={`rel-btn rel-btn-alto ${aberto ? 'rel-btn-primary' : 'rel-btn-outline'}`}>
          <SlidersHorizontal size={15} />Filtros{ativos.length > 0 && <span className="rel-contador">{ativos.length}</span>}
        </button>
      </div>

      {aberto && (
        <div className="space-y-3">
          <fieldset className="rel-grupo-filtros">
            <legend>Chamado</legend>
            <div className="rel-filters">
              {LISTAS.map((f) => (
                <label key={f.campo} className="rel-field">
                  <span className="rel-label">{f.rotulo}</span>
                  <select value={filtros[f.campo]} onChange={(e) => onMuda(f.campo, e.target.value)} className="rel-input">
                    <option value="">{f.todos}</option>
                    {opcoes[f.opcoes].map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="rel-grupo-filtros">
            <legend>Entrega e documentação</legend>
            <div className="rel-filters">
              {simNao.map((f) => (
                <label key={f.campo} className="rel-field">
                  <span className="rel-label">{f.rotulo}</span>
                  <select value={filtros[f.campo]} onChange={(e) => onMuda(f.campo, e.target.value as Tri)} className="rel-input">
                    <option value="todos">Todos</option>
                    <option value="sim">Sim</option>
                    <option value="nao">Não</option>
                  </select>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      )}

      {ativos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ativos.map((a) => (
            <button key={a.campo} type="button" onClick={() => onMuda(a.campo, a.vazio as never)} aria-label={`Remover filtro ${a.texto}`} className="rel-tag rel-tag-info rel-tag-remover">
              {a.texto}<X size={12} />
            </button>
          ))}
        </div>
      )}

      <div className="rel-filtros-rodape">
        <span className="rel-desc">
          {aba === 'regras' ? 'Tudo o que ainda não tem PR. Ao ganhar um PR, passa para Em correção ou Corrigidos.' : 'A busca inclui documentos, PRs, branches e os dados do BM.'}
        </span>
        <div className="flex items-center gap-3">
          <span className="rel-desc">{`${exibidos} de ${total} chamados`}</span>
          {temOQueLimpar && <button type="button" onClick={onLimpar} className="rel-btn rel-btn-sm rel-btn-ghost">Limpar filtros</button>}
        </div>
      </div>
    </section>
  );
}
