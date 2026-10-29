'use client';

import { auth } from '../../firebase';

// Chamada às rotas de administração com o login do Firebase (ID token) no cabeçalho.
export async function chamaApi<T = unknown>(url: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; dados: T & { erro?: string } }> {
  // Os tipos do Firebase neste projeto são simplificados (types/firebase.d.ts): getIdToken existe em tempo de execução.
  const token = await (auth.currentUser as unknown as { getIdToken(): Promise<string> } | null)?.getIdToken();
  const r = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}`, ...(init.headers ?? {}) },
  });
  const dados = (await r.json().catch(() => ({}))) as T & { erro?: string };
  return { ok: r.ok, status: r.status, dados };
}
