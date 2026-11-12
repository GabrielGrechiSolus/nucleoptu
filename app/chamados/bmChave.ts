// Chave pessoal do Businessmap, guardada só neste navegador (localStorage). O servidor não a grava.
const K = 'nucleoptu.bm.chave';
const aviso = () => typeof window !== 'undefined' && window.dispatchEvent(new Event('nucleoptu-bm-chave'));

export function lerChaveBm(): string {
  try {
    return localStorage.getItem(K) ?? '';
  } catch {
    return '';
  }
}
export function gravaChaveBm(chave: string) {
  try {
    if (chave) localStorage.setItem(K, chave);
    else localStorage.removeItem(K);
  } catch {
    /* navegador sem armazenamento: a chave vale só até recarregar */
  }
  aviso();
}
export const cabecalhoBm = (): Record<string, string> => {
  const c = lerChaveBm();
  return c ? { 'x-bm-key': c } : {};
};

const K_EU = 'nucleoptu.bm.eu';

export interface EuBm {
  id: number;
  nome: string;
  email: string;
}

export function lerEuBm(): EuBm | null {
  try {
    const bruto = localStorage.getItem(K_EU);
    return bruto ? (JSON.parse(bruto) as EuBm) : null;
  } catch {
    return null;
  }
}

export function gravaEuBm(eu: EuBm | null) {
  try {
    if (eu) localStorage.setItem(K_EU, JSON.stringify(eu));
    else localStorage.removeItem(K_EU);
  } catch {
    return;
  }
}
