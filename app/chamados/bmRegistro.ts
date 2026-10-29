// Registro do cartão do BM gravado no banco (coleção chamados_bm), junto aos contextos.
// Quem tem a chave do BM lê e grava; os demais só leem. Lógica pura: sem rede e sem Firestore.
import type { BmCartao, BmResumoLista } from './bm';
import type { Chamado } from './parse';

export const COLECAO_BM = 'chamados_bm';
const UM_DIA_MS = 24 * 3_600_000;

export interface RegistroBm {
  chamado: string; // só dígitos, igual ao id do documento
  encontrado: boolean;
  cardId: number | null;
  resumo: BmResumoLista | null;
  cartao: BmCartao | null;
  sincronizadoEm: string; // ISO
  sincronizadoPor: string;
}

export const soDigitos = (n: string) => n.replace(/\D/g, '');

// Decide se vale reler o cartão no BM. Só relê quando o cartão mudou (data de atualização ou coluna), quando não há dado gravado,
// quando se força, ou, para chamados sem cartão, depois de 24 horas.
export function precisaAtualizar(reg: RegistroBm | undefined, resumo: BmResumoLista | undefined, agoraMs: number, forcar = false): boolean {
  if (forcar || !reg) return true;
  if (!resumo) return reg.encontrado || agoraMs - Date.parse(reg.sincronizadoEm) > UM_DIA_MS;
  if (!reg.encontrado || !reg.cartao || !reg.resumo) return true;
  return reg.resumo.atualizadoEm !== resumo.atualizadoEm || reg.resumo.coluna !== resumo.coluna || reg.resumo.bloqueado !== resumo.bloqueado;
}

// Chamados em que a pessoa aparece como autora de PR ("Meus chamados"). Sem usuário Git, devolve vazio.
export function chamadosDaPessoa(itens: Chamado[], gitUser: string): Chamado[] {
  const u = gitUser.trim().toLowerCase();
  if (!u) return [];
  return itens.filter((c) => (c.autores ?? []).some((a) => a.toLowerCase() === u));
}

// O Firestore não aceita undefined: descarta propriedades indefinidas.
export const semIndefinidos = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export function montaRegistro(numeros: string, resumo: BmResumoLista | undefined, cartao: BmCartao | null, por: string, agoraIso: string): RegistroBm {
  return {
    chamado: soDigitos(numeros),
    encontrado: !!resumo,
    cardId: resumo?.cardId ?? null,
    resumo: resumo ?? null,
    cartao,
    sincronizadoEm: agoraIso,
    sincronizadoPor: por,
  };
}
