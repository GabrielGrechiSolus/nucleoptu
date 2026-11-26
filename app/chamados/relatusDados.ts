export const CAMPOS_RELATUS = [
  { id: 'cliente', rotulo: 'Cliente' },
  { id: 'status', rotulo: 'Status' },
  { id: 'situacao', rotulo: 'Situação' },
  { id: 'etapa', rotulo: 'Etapa BusinessMap' },
  { id: 'prioridade', rotulo: 'Prioridade' },
  { id: 'modalidade', rotulo: 'Modalidade' },
  { id: 'motivo', rotulo: 'Motivo' },
  { id: 'solicitante', rotulo: 'Solicitante' },
  { id: 'operador', rotulo: 'Operador' },
  { id: 'release', rotulo: 'Release' },
  { id: 'dataAbertura', rotulo: 'Abertura', data: true },
  { id: 'previsaoInicio', rotulo: 'Previsão de início', data: true },
  { id: 'previsaoConclusao', rotulo: 'Previsão de conclusão', data: true },
  { id: 'dataConclusao', rotulo: 'Fechamento', data: true },
  { id: 'horasOrcadas', rotulo: 'Horas orçadas' },
  { id: 'horasAprovadas', rotulo: 'Horas aprovadas' },
  { id: 'horasRealizadas', rotulo: 'Horas realizadas' },
] as const;

type CampoRelatus = (typeof CAMPOS_RELATUS)[number]['id'] | 'numero' | 'titulo';

export type AtendimentoRelatus = Partial<Record<CampoRelatus, string>>;

export function somenteCamposExibidos(origem: Record<string, unknown>): AtendimentoRelatus {
  const ids: CampoRelatus[] = ['numero', 'titulo', ...CAMPOS_RELATUS.map((c) => c.id)];
  return Object.fromEntries(
    ids.flatMap((id) => {
      const v = origem[id];
      return (typeof v === 'string' && v.trim()) || typeof v === 'number' ? [[id, String(v)]] : [];
    }),
  );
}

export function formataData(valor: string): string {
  const [, ano, mes, dia] = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor) ?? [];
  return ano ? `${dia}/${mes}/${ano}` : valor;
}

export interface AnexoRelatus { id: string; nome: string; tamanhoKb?: number; data?: string; chamadoPai?: string }
export interface MensagemRelatus { id: string; tipo: string; autor: string; data: string; titulo: string; texto: string; temAnexo: boolean }
export interface DocumentoRelatus { nome: string; url: string }

export interface DetalheRelatus extends AtendimentoRelatus {
  descricao: string;
  mensagens: MensagemRelatus[];
  anexos: AnexoRelatus[];
  documentos: DocumentoRelatus[];
  falhas: string[];
}

export const TIPOS_MENSAGEM: Record<string, string> = {
  E: 'Mensagem ao cliente',
  W: 'Complemento do cliente',
  L: 'Laudo interno',
  C: 'Conclusão',
  R: 'Reabertura',
  O: 'Mensagem interna',
};

const ENTIDADES: Record<string, string> = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", ordm: 'º', ordf: 'ª', ndash: '–', mdash: '—', bull: '•', hellip: '…' };
const ACENTOS: Record<string, string> = { grave: '\u0300', acute: '\u0301', circ: '\u0302', tilde: '\u0303', uml: '\u0308', cedil: '\u0327' };

function decodifica(entidade: string, nome: string): string {
  if (nome.startsWith('#')) {
    const codigo = nome[1]?.toLowerCase() === 'x' ? parseInt(nome.slice(2), 16) : Number(nome.slice(1));
    return codigo > 0 && codigo <= 0x10ffff ? String.fromCodePoint(codigo) : entidade;
  }
  const [, letra, acento] = /^([A-Za-z])(grave|acute|circ|tilde|uml|cedil)$/.exec(nome) ?? [];
  return letra ? (letra + ACENTOS[acento]).normalize('NFC') : (ENTIDADES[nome] ?? entidade);
}

export function textoDeHtml(valor: unknown): string {
  if (typeof valor !== 'string') return '';
  const semBlocos = valor.replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, '');
  const comQuebras = /<[a-z][^>]*>/i.test(semBlocos)
    ? semBlocos.replace(/\r?\n/g, ' ').replace(/<li\b[^>]*>/gi, '\n• ').replace(/<br\s*\/?>|<\/(p|div|tr|ul|ol|h[1-6])\s*>/gi, '\n')
    : semBlocos;
  return comQuebras
    .replace(/<\/?[a-z!][^>]*>/gi, '')
    .replace(/&(#?[A-Za-z0-9]+);/g, decodifica)
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{2,}(?=• )/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const linhas = (lista: unknown): Record<string, unknown>[] =>
  Array.isArray(lista) ? lista.filter((l): l is Record<string, unknown> => Boolean(l) && typeof l === 'object') : [];

const texto = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');

export function anexosRelatus(lista: unknown): AnexoRelatus[] {
  return linhas(lista).map((a) => ({
    id: texto(a.id),
    nome: texto(a.nome) || `anexo-${texto(a.id)}`,
    ...(typeof a.tamanhoKb === 'number' ? { tamanhoKb: a.tamanhoKb } : {}),
    ...(texto(a.dataMensagem) ? { data: texto(a.dataMensagem) } : {}),
    ...(texto(a.chamadoPaiNumero) ? { chamadoPai: texto(a.chamadoPaiNumero) } : {}),
  })).filter((a) => a.id);
}

export function mensagensRelatus(lista: unknown): MensagemRelatus[] {
  return linhas(lista).map((m) => ({
    id: texto(m.id),
    tipo: texto(m.tipo),
    autor: texto(m.autor),
    data: texto(m.data),
    titulo: texto(m.titulo),
    texto: textoDeHtml(m.texto),
    temAnexo: Boolean(m.temAnexo),
  }));
}

export function documentosRelatus(lista: unknown): DocumentoRelatus[] {
  return linhas(lista)
    .map((d) => ({ nome: texto(d.nome) || 'Documento', url: texto(d.url) }))
    .filter((d) => d.url.startsWith('https://'));
}
