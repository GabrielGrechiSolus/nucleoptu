import { textoDeHtml } from '../chamados/relatusDados';

export type Marca = 'remoto' | 'ferias' | 'passagem' | 'hospedagem' | 'travado' | 'replica';

export const MARCAS: Record<Marca, { simbolo: string; rotulo: string }> = {
  remoto: { simbolo: '⌂', rotulo: 'remoto' },
  ferias: { simbolo: '☀', rotulo: 'férias' },
  passagem: { simbolo: '✈', rotulo: 'passagem' },
  hospedagem: { simbolo: '⌸', rotulo: 'hospedagem' },
  travado: { simbolo: '🔒', rotulo: 'bloqueado' },
  replica: { simbolo: '⧉', rotulo: 'réplica' },
};

export interface EventoCronograma {
  id: string;
  descricao: string;
  inicio: string;
  fim: string;
  situacao: string;
  projeto: boolean;
  horario: string;
  fundo: string;
  texto: string;
  marcas: Marca[];
  observacao: string;
}

export interface Cronograma {
  ano: number;
  colaborador: { nome: string; equipe: string };
  feriados: Record<string, string>;
  eventos: EventoCronograma[];
}

export interface MesCronograma {
  nome: string;
  vazios: number;
  dias: { data: string; numero: number; fimDeSemana: boolean }[];
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const PALETA = ['#1A73E8', '#0B8043', '#D93025', '#8E24AA', '#F09300', '#3F51B5', '#039BE5', '#C0CA33', '#E67C73', '#00838F', '#616161', '#AD1457'];
const COR = /^#[0-9a-f]{6}$/i;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

const doisDigitos = (n: number) => String(n).padStart(2, '0');

export function montaMeses(ano: number): MesCronograma[] {
  return MESES.map((nome, mes) => {
    const total = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
    return {
      nome,
      vazios: (new Date(Date.UTC(ano, mes, 1)).getUTCDay() + 6) % 7,
      dias: Array.from({ length: total }, (_, i) => {
        const semana = new Date(Date.UTC(ano, mes, i + 1)).getUTCDay();
        return { data: `${ano}-${doisDigitos(mes + 1)}-${doisDigitos(i + 1)}`, numero: i + 1, fimDeSemana: semana === 0 || semana === 6 };
      }),
    };
  });
}

const textoSimples = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '');
const dia = (v: unknown) => textoSimples(v).slice(0, 10);

function corDeContraste(fundo: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(fundo.slice(i, i + 2), 16));
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#1F2937' : '#FFFFFF';
}

function cores(e: Record<string, unknown>): { fundo: string; texto: string } {
  const projeto = e.tipo === 'PROJETO';
  if (projeto) return { fundo: '', texto: '' };
  const informado = textoSimples(e.corFundo);
  const semente = Math.abs(Number(e.clienteId ?? e.colaboradorId ?? 0)) || 0;
  const fundo = COR.test(informado) && informado.toUpperCase() !== '#FFFFFF' ? informado : PALETA[semente % PALETA.length];
  const fonte = textoSimples(e.corFonte);
  return { fundo, texto: COR.test(fonte) ? fonte : corDeContraste(fundo) };
}

function horario(inicio: string, fim: string): string {
  if (inicio && fim) return `${inicio} às ${fim}`;
  if (inicio) return `a partir de ${inicio}`;
  return fim ? `até ${fim}` : '';
}

const objetos = (lista: unknown): Record<string, unknown>[] =>
  Array.isArray(lista) ? lista.filter((l): l is Record<string, unknown> => Boolean(l) && typeof l === 'object') : [];

export function feriadosDoRelatus(lista: unknown): Record<string, string> {
  return Object.fromEntries(objetos(lista).filter((e) => e.tipo === 'FERIADO' && DATA.test(dia(e.dataInicio))).map((e) => [dia(e.dataInicio), textoSimples(e.descricao)]));
}

export function eventosDoColaborador(lista: unknown, colaboradorId: string): EventoCronograma[] {
  return objetos(lista)
    .filter((e) => e.tipo !== 'FERIADO' && textoSimples(e.colaboradorId) === colaboradorId && DATA.test(dia(e.dataInicio)))
    .map((e, i) => ({
      id: textoSimples(e.guid) || `evento-${i}`,
      descricao: textoSimples(e.descricao),
      inicio: dia(e.dataInicio),
      fim: DATA.test(dia(e.dataFim)) ? dia(e.dataFim) : dia(e.dataInicio),
      situacao: textoSimples(e.situacao),
      projeto: e.tipo === 'PROJETO',
      horario: horario(textoSimples(e.horaInicio), textoSimples(e.horaFim)),
      ...cores(e),
      marcas: (Object.keys(MARCAS) as Marca[]).filter((m) => Boolean(e[m])),
      observacao: textoDeHtml(e.observacao),
    }));
}

const normaliza = (v: unknown) => textoSimples(v).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

export function achaColaborador(lista: unknown, email: string, nomeDoOperador: string): { id: string; nome: string; equipe: string } | null {
  const todos = objetos(lista);
  const unico = (campo: 'email' | 'nome', valor: string) => {
    const alvo = normaliza(valor);
    const achados = alvo ? todos.filter((c) => normaliza(c[campo]) === alvo) : [];
    return achados.length === 1 ? achados[0] : undefined;
  };
  const c = unico('email', email) ?? unico('nome', nomeDoOperador);
  return c ? { id: textoSimples(c.id), nome: textoSimples(c.nome), equipe: textoSimples(c.perfilNome) } : null;
}
