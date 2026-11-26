import { consultaRelatus } from './relatusApi';
import { AnexoRelatus, DetalheRelatus } from './relatusDados';

const CHAVE = 'relatus:consultas:v1';
const VALIDADE_ABERTO_MS = 30 * 60_000;
const MAXIMO = 30;

export interface ConsultaSalva {
  salvoEm: number;
  dados: DetalheRelatus;
  anexosMensagem: Record<string, AnexoRelatus[]>;
}

type Salvas = Record<string, ConsultaSalva>;

let memoria: Salvas | null = null;
const emAndamento = new Map<string, Promise<ConsultaSalva>>();

function carrega(): Salvas {
  if (memoria) return memoria;
  try {
    memoria = JSON.parse(window.localStorage.getItem(CHAVE) ?? '{}') as Salvas;
  } catch {
    memoria = {};
  }
  return memoria;
}

function grava(numero: string, consulta: ConsultaSalva): void {
  const todas = { ...carrega(), [numero]: consulta };
  memoria = Object.fromEntries(Object.entries(todas).sort(([, a], [, b]) => b.salvoEm - a.salvoEm).slice(0, MAXIMO));
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(memoria));
  } catch {}
}

export function limpaRelatusSalvo(): void {
  memoria = null;
  emAndamento.clear();
  try {
    window.localStorage.removeItem(CHAVE);
  } catch {}
}

export const consultaSalva = (numero: string): ConsultaSalva | null => carrega()[numero] ?? null;

function aindaVale({ dados, salvoEm }: ConsultaSalva): boolean {
  if (dados.falhas.length) return false;
  return Boolean(dados.dataConclusao) || Date.now() - salvoEm < VALIDADE_ABERTO_MS;
}

export function obtemRelatus(numero: string, atualizar = false): Promise<ConsultaSalva> {
  const salva = consultaSalva(numero);
  if (!atualizar && salva && aindaVale(salva)) return Promise.resolve(salva);
  let pedido = emAndamento.get(numero);
  if (!pedido) {
    pedido = consultaRelatus<DetalheRelatus>('chamado', { numero })
      .then((dados) => {
        const nova = { salvoEm: Date.now(), dados, anexosMensagem: consultaSalva(numero)?.anexosMensagem ?? {} };
        grava(numero, nova);
        return nova;
      })
      .finally(() => emAndamento.delete(numero));
    emAndamento.set(numero, pedido);
  }
  return pedido;
}

export async function obtemAnexosDaMensagem(numero: string, mensagem: string): Promise<AnexoRelatus[]> {
  const salvos = consultaSalva(numero)?.anexosMensagem[mensagem];
  if (salvos) return salvos;
  const { anexos } = await consultaRelatus<{ anexos: AnexoRelatus[] }>('chamado/anexos', { numero, mensagem });
  const atual = consultaSalva(numero);
  if (atual && anexos.length) grava(numero, { ...atual, anexosMensagem: { ...atual.anexosMensagem, [mensagem]: anexos } });
  return anexos;
}
