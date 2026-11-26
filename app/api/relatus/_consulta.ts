import { NextResponse } from 'next/server';
import { podeVerRelatus } from '../../chamados/relatusAcesso';
import { permite } from '../_limite';
import { verificaFirebase } from '../_servidor';
import { comTokenRelatus, relatusConfigurado } from './_sessao';

const BASE = 'https://relatus.solus.inf.br/api';
const ID = /^[A-Za-z0-9-]{1,64}$/;

export const idValido = (id: string) => ID.test(id);

const guids = new Map<string, string>();
export const esqueceGuids = () => guids.clear();

export const recusado = (erro: string, status: number) => NextResponse.json({ erro }, { status });

export async function autoriza(req: Request): Promise<NextResponse | { numero: string; params: URLSearchParams }> {
  const login = await verificaFirebase(req);
  if (!login.ok) return recusado(login.motivo ?? 'Entre no sistema para usar este recurso.', 401);
  if (!podeVerRelatus(login.email)) return recusado('Recurso não encontrado.', 404);
  if (!permite(`relatus:${login.uid}`, 40, 60_000)) return recusado('Muitas consultas ao Relatus. Aguarde um minuto.', 429);

  const params = new URL(req.url).searchParams;
  const numero = (params.get('numero') ?? '').replace(/\D/g, '');
  if (!/^\d{5,12}$/.test(numero)) return recusado('Informe um número de chamado válido.', 400);
  if (!relatusConfigurado()) return recusado('Integração do Relatus não configurada no servidor. Configure RELATUS_LOGIN e RELATUS_SENHA.', 503);
  return { numero, params };
}

export async function busca(token: string, caminho: string, limite = 20_000): Promise<Response> {
  const resposta = await fetch(`${BASE}${caminho}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json, */*' },
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(limite),
  });
  if (!resposta.ok) throw Object.assign(new Error(`Relatus respondeu HTTP ${resposta.status}.`), { status: resposta.status >= 500 ? 502 : resposta.status });
  return resposta;
}

export const buscaJson = async <T>(token: string, caminho: string): Promise<T> => (await (await busca(token, caminho)).json()) as T;

export async function noAtendimento<T>(numero: string, consulta: (token: string, caminho: string) => Promise<T>): Promise<T> {
  return comTokenRelatus(BASE, async (token) => {
    const guid = guids.get(numero) ?? (await buscaJson<{ guid?: string }>(token, `/v1/atendimentos/numero/${numero}`)).guid;
    if (!guid) throw Object.assign(new Error('Chamado não encontrado no Relatus.'), { status: 404 });
    guids.set(numero, guid);
    return consulta(token, `/v1/atendimentos/${encodeURIComponent(guid)}`);
  });
}

export function respostaDeErro(erro: unknown, naoEncontrado: string): NextResponse {
  const status = Number((erro as { status?: number }).status) || 502;
  const detalhe = erro instanceof Error ? erro.message : 'Não foi possível consultar o Relatus.';
  if (status >= 500) console.error('[relatus] Falha na consulta:', status, detalhe);
  return recusado(status === 404 ? naoEncontrado : detalhe, status);
}
