// Cartão do Businessmap (BM) organizado para a tela. Lógica pura (sem rede): o servidor busca os dados
// brutos (somente leitura) e este arquivo os transforma. Formatos conferidos na API v2 em 29/10/2026.

// ---------- tipos do BM (somente o que usamos) ----------
export interface BmCartaoBruto {
  card_id: number;
  custom_id?: string | null;
  board_id?: number;
  workflow_id?: number;
  title?: string;
  description?: string | null;
  owner_user_id?: number | null;
  co_owner_ids?: number[];
  watcher_ids?: number[];
  reporter?: { type?: string; value?: number | string } | null;
  type_id?: number | null;
  column_id?: number;
  lane_id?: number;
  section?: number | null;
  size?: number | null;
  priority?: number | null;
  deadline?: string | null;
  created_at?: string | null;
  last_modified?: string | null;
  in_current_position_since?: string | null;
  first_request_time?: string | null;
  first_start_time?: string | null;
  first_end_time?: string | null;
  last_request_time?: string | null;
  last_start_time?: string | null;
  last_end_time?: string | null;
  is_blocked?: number | boolean;
  block_reason?: { comment?: string | null; reason_id?: number | null } | string | null;
  tag_ids?: number[];
  custom_fields?: { field_id: number; value?: string | number | null; other_value?: string | null; values?: { value_id: number }[] }[];
  subtasks?: { subtask_id: number; description?: string | null; owner_user_id?: number | null; finished_at?: string | null; deadline?: string | null; created_at?: string | null; attachments?: unknown[] }[];
  attachments?: { id?: number; file_name?: string; name?: string; link?: string; url?: string; size?: number }[];
  linked_cards?: { card_id: number; link_type?: string }[];
  finished_subtask_count?: number;
  unfinished_subtask_count?: number;
}

export interface BmComentarioBruto {
  comment_id: number;
  text?: string | null;
  created_at?: string | null;
  author?: { type?: string; value?: number | string } | null;
  attachments?: unknown[];
}

export interface BmMeta {
  usuarios: Record<number, string>;
  colunas: Record<number, { nome: string; secao: number | null }>;
  raias: Record<number, string>;
  tipos: Record<number, string>;
  tags: Record<number, string>;
  campos: Record<number, { nome: string; tipo: string; valores: Record<number, string> }>;
}

export interface BmVinculadoBruto {
  card_id: number;
  custom_id?: string | null;
  title?: string;
  column_id?: number;
}

// ---------- saída organizada ----------
export interface BmCampo {
  nome: string;
  valor: string;
  grupo: string;
}

export interface BmResumoLista {
  cardId: number;
  chamado: string;
  coluna: string;
  secao: string; // Solicitado, Em andamento, Concluído
  bloqueado: boolean;
  prazo: string;
  responsavel: string;
  url: string;
}

export interface BmCartao extends BmResumoLista {
  titulo: string;
  quadroId: number | null;
  raia: string;
  tipo: string;
  prioridade: string;
  tamanho: string;
  coResponsaveis: string[];
  solicitante: string;
  observadores: string[];
  criadoEm: string;
  atualizadoEm: string;
  naColunaDesde: string;
  motivoBloqueio: string;
  tempos: { rotulo: string; valor: string }[];
  descricao: string;
  tags: string[];
  campos: BmCampo[];
  subtarefas: { descricao: string; concluida: boolean; responsavel: string; concluidaEm: string }[];
  comentarios: { autor: string; em: string; texto: string }[];
  anexos: { nome: string; link: string }[];
  vinculados: { cardId: number; chamado: string; titulo: string; coluna: string; tipoVinculo: string }[];
  conferencia: { item: string; situacao: 'ok' | 'pendente' | 'atencao'; detalhe: string }[];
}

export const MENSAGEM_PADRAO_CONCLUSAO = 'As alterações/desenvolvimentos foram efetivadas, ficando disponíveis para atualização via revision.';

const SECOES: Record<number, string> = { 1: 'Solicitado', 2: 'Em andamento', 3: 'Concluído', 4: 'Arquivado' };
const PRIORIDADES: Record<number, string> = { 1: 'Crítica', 2: 'Alta', 3: 'Média', 4: 'Baixa' };

// Texto simples a partir do HTML do BM (descrição, comentários, subtarefas).
export function htmlParaTexto(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, (_m, href: string, t: string) => (t.replace(/<[^>]+>/g, '').trim() === href ? href : `${t.replace(/<[^>]+>/g, '')} (${href})`))
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export const urlDoCartao = (base: string, boardId: number | undefined, cardId: number) => `${base.replace(/\/api\/v2\/?$/, '')}/ctrl_board/${boardId ?? 0}/cards/${cardId}/details/`;

const autorDe = (a: { type?: string; value?: number | string } | null | undefined, usuarios: Record<number, string>) => {
  if (!a || a.value === undefined || a.value === null) return '—';
  const id = Number(a.value);
  return Number.isFinite(id) ? usuarios[id] ?? `usuário ${id}` : String(a.value);
};

const data = (iso: string | null | undefined) => iso ?? '';

// Grupo do campo personalizado, pelo nome (organiza a tela).
export function grupoDoCampo(nome: string): string {
  const n = nome.toLowerCase();
  if (/^git|^reponame/.test(n)) return 'Git';
  if (/^qa\b|^qa -/.test(n)) return 'Qualidade';
  if (/texto conclus|release|newsletter|^pe -/.test(n)) return 'Entrega';
  if (/an[aá]lise|data\/hora|dura[cç][aã]o/.test(n)) return 'Tempo';
  if (/cliente|prioridade|programa|modalidade|motivo|n[uú]cleo|tamanho/.test(n)) return 'Identificação';
  return 'Outros';
}
export const GRUPOS_ORDEM = ['Identificação', 'Entrega', 'Qualidade', 'Git', 'Tempo', 'Outros'];

function camposDe(card: BmCartaoBruto, meta: BmMeta): BmCampo[] {
  const out: BmCampo[] = [];
  for (const f of card.custom_fields ?? []) {
    const def = meta.campos[f.field_id];
    if (!def) continue;
    let valor = '';
    if (f.values?.length) valor = f.values.map((v) => def.valores[v.value_id] ?? `valor ${v.value_id}`).join(', ');
    else if (f.value !== undefined && f.value !== null && String(f.value).trim() !== '') valor = def.tipo === 'multi_line_text' ? htmlParaTexto(String(f.value)) : String(f.value);
    if (f.other_value) valor = valor ? `${valor} (${f.other_value})` : f.other_value;
    if (!valor.trim()) continue;
    out.push({ nome: def.nome, valor, grupo: grupoDoCampo(def.nome) });
  }
  return out;
}

const motivo = (b: BmCartaoBruto['block_reason']) => (typeof b === 'string' ? b : b?.comment ?? '');

export function resumoDoCartao(card: BmCartaoBruto, meta: BmMeta, base: string): BmResumoLista {
  const col = card.column_id !== undefined ? meta.colunas[card.column_id] : undefined;
  return {
    cardId: card.card_id,
    chamado: String(card.custom_id ?? ''),
    coluna: col?.nome ?? (card.column_id ? `coluna ${card.column_id}` : '—'),
    secao: SECOES[card.section ?? col?.secao ?? 0] ?? '',
    bloqueado: !!card.is_blocked,
    prazo: data(card.deadline),
    responsavel: card.owner_user_id ? meta.usuarios[card.owner_user_id] ?? `usuário ${card.owner_user_id}` : '—',
    url: urlDoCartao(base, card.board_id, card.card_id),
  };
}

export function montaCartaoBm(
  card: BmCartaoBruto,
  comentarios: BmComentarioBruto[],
  vinculados: BmVinculadoBruto[],
  meta: BmMeta,
  base: string,
  contexto: { temPr: boolean; temEvidencia: boolean } = { temPr: false, temEvidencia: false },
): BmCartao {
  const resumo = resumoDoCartao(card, meta, base);
  const campos = camposDe(card, meta);
  const campo = (re: RegExp) => campos.find((c) => re.test(c.nome))?.valor ?? '';
  const conclusao = campo(/texto conclus/i);
  const prVinculado = campo(/^git pr/i);

  const lig = new Map(vinculados.map((v) => [v.card_id, v]));
  return {
    ...resumo,
    titulo: card.title ?? '',
    quadroId: card.board_id ?? null,
    raia: card.lane_id ? meta.raias[card.lane_id] ?? '' : '',
    tipo: card.type_id ? meta.tipos[card.type_id] ?? '' : '',
    prioridade: card.priority ? PRIORIDADES[card.priority] ?? String(card.priority) : '',
    tamanho: card.size !== null && card.size !== undefined ? String(card.size) : '',
    coResponsaveis: (card.co_owner_ids ?? []).map((id) => meta.usuarios[id] ?? `usuário ${id}`),
    solicitante: autorDe(card.reporter, meta.usuarios),
    observadores: (card.watcher_ids ?? []).map((id) => meta.usuarios[id] ?? `usuário ${id}`),
    criadoEm: data(card.created_at),
    atualizadoEm: data(card.last_modified),
    naColunaDesde: data(card.in_current_position_since),
    motivoBloqueio: card.is_blocked ? motivo(card.block_reason) : '',
    tempos: [
      { rotulo: 'Primeiro pedido', valor: data(card.first_request_time) },
      { rotulo: 'Primeiro início', valor: data(card.first_start_time) },
      { rotulo: 'Primeira conclusão', valor: data(card.first_end_time) },
      { rotulo: 'Último pedido', valor: data(card.last_request_time) },
      { rotulo: 'Último início', valor: data(card.last_start_time) },
      { rotulo: 'Última conclusão', valor: data(card.last_end_time) },
    ].filter((t) => t.valor),
    descricao: htmlParaTexto(card.description),
    tags: (card.tag_ids ?? []).map((id) => meta.tags[id] ?? `tag ${id}`),
    campos,
    subtarefas: (card.subtasks ?? []).map((s) => ({
      descricao: htmlParaTexto(s.description),
      concluida: !!s.finished_at,
      responsavel: s.owner_user_id ? meta.usuarios[s.owner_user_id] ?? `usuário ${s.owner_user_id}` : '',
      concluidaEm: data(s.finished_at),
    })),
    comentarios: comentarios
      .map((c) => ({ autor: autorDe(c.author, meta.usuarios), em: data(c.created_at), texto: htmlParaTexto(c.text) }))
      .sort((a, b) => (a.em < b.em ? -1 : 1)),
    anexos: (card.attachments ?? []).map((a) => ({ nome: a.file_name ?? a.name ?? 'anexo', link: a.link ?? a.url ?? '' })),
    vinculados: (card.linked_cards ?? []).map((l) => {
      const v = lig.get(l.card_id);
      return {
        cardId: l.card_id,
        chamado: String(v?.custom_id ?? ''),
        titulo: v?.title ?? '',
        coluna: v?.column_id ? meta.colunas[v.column_id]?.nome ?? '' : '',
        tipoVinculo: l.link_type ?? '',
      };
    }),
    conferencia: [
      { item: 'Analista responsável definido', situacao: card.owner_user_id ? 'ok' : 'pendente', detalhe: card.owner_user_id ? resumo.responsavel : 'Sem responsável no card.' },
      {
        item: 'Texto de conclusão complementado',
        situacao: !conclusao.trim() ? 'pendente' : conclusao.includes(MENSAGEM_PADRAO_CONCLUSAO) && conclusao.replace(MENSAGEM_PADRAO_CONCLUSAO, '').replace(/\[\]|Obrigado[\s\S]*$/gi, '').trim().length < 40 ? 'atencao' : 'ok',
        detalhe: !conclusao.trim() ? 'Campo vazio.' : 'Preenchido; confira se vai além da mensagem padrão (problema, origem e ação).',
      },
      { item: 'PR informado', situacao: prVinculado || contexto.temPr ? 'ok' : 'pendente', detalhe: prVinculado ? 'Campo Git PR do card preenchido.' : contexto.temPr ? 'Há PR no contexto (o campo Git PR do card está vazio).' : 'Sem PR no card nem no contexto.' },
      { item: 'Evidência e plano de testes', situacao: campo(/^qa - document/i) || contexto.temEvidencia ? 'ok' : 'pendente', detalhe: campo(/^qa - document/i) ? 'Campo QA - Documentação preenchido.' : contexto.temEvidencia ? 'Há evidência no contexto.' : 'Sem evidência nem documentação de QA.' },
      { item: 'Sem bloqueio', situacao: card.is_blocked ? 'atencao' : 'ok', detalhe: card.is_blocked ? motivo(card.block_reason) || 'Card bloqueado.' : 'Não está bloqueado.' },
    ],
  };
}

// Visão sem Git (perfil Sustentação): esconde campos e links do Git nos textos do cartão.
export function cartaoSemGit(c: BmCartao, ocultaGit: (t: string) => string): BmCartao {
  const sem = (t: string) => ocultaGit(t);
  return {
    ...c,
    descricao: sem(c.descricao),
    campos: c.campos.filter((x) => x.grupo !== 'Git').map((x) => ({ ...x, valor: sem(x.valor) })),
    subtarefas: c.subtarefas.map((s) => ({ ...s, descricao: sem(s.descricao) })),
    comentarios: c.comentarios.map((m) => ({ ...m, texto: sem(m.texto) })),
    anexos: c.anexos.filter((a) => !/github\.com/i.test(a.link)),
    conferencia: c.conferencia.map((i) => (i.item === 'PR informado' ? { ...i, detalhe: i.situacao === 'ok' ? 'Informado.' : 'Pendente.' } : i)),
  };
}
