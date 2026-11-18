'use client';

import { auth } from '../../firebase';
import { normalizaCliente, type ClienteConexao } from './modelo';

const idToken = async () => (await (auth.currentUser as unknown as { getIdToken(): Promise<string> } | null)?.getIdToken()) ?? '';

async function chama<T>(caminho: string, init: { method?: string; corpo?: unknown } = {}): Promise<T> {
  const r = await fetch(caminho, {
    method: init.method ?? 'GET',
    headers: { Authorization: `Bearer ${await idToken()}`, ...(init.corpo !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    body: init.corpo !== undefined ? JSON.stringify(init.corpo) : undefined,
    cache: 'no-store',
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { erro?: string }).erro ?? `Erro ${r.status}`);
  return j as T;
}

const converte = (c: unknown) => normalizaCliente(String((c as { id?: string }).id ?? ''), c as Record<string, unknown>);

export const listaClientes = async (): Promise<ClienteConexao[]> => (await chama<{ clientes: unknown[] }>('/api/conexoes')).clientes.map(converte);

export const salvaCliente = async (cliente: ClienteConexao): Promise<ClienteConexao> => converte((await chama<{ cliente: unknown }>('/api/conexoes', { method: 'POST', corpo: { cliente } })).cliente);

export const excluiCliente = async (id: string) => {
  await chama<{ ok: boolean }>(`/api/conexoes?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
};

export const revelaSenha = async (clienteId: string, conexaoId: string): Promise<string> => (await chama<{ senha: string }>('/api/conexoes/senha', { method: 'POST', corpo: { clienteId, conexaoId } })).senha;
