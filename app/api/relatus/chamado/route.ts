import { NextResponse } from 'next/server';
import { podeVerRelatus } from '../../../chamados/relatusAcesso';
import { somenteCamposExibidos } from '../../../chamados/relatusDados';
import { permite } from '../../_limite';
import { verificaFirebase } from '../../_servidor';
import { comTokenRelatus, relatusConfigurado } from '../_sessao';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BASE_PADRAO = 'https://relatus.solus.inf.br/api';

async function requisicao<T>(base: string, token: string, caminho: string): Promise<T> {
  const resposta = await fetch(`${base}${caminho}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(20_000),
  });
  if (!resposta.ok) throw Object.assign(new Error(`Relatus respondeu HTTP ${resposta.status}.`), { status: resposta.status >= 500 ? 502 : resposta.status });
  return (await resposta.json()) as T;
}

export async function GET(req: Request) {
  const login = await verificaFirebase(req);
  if (!login.ok) return NextResponse.json({ erro: login.motivo }, { status: 401 });
  if (!podeVerRelatus(login.email)) return NextResponse.json({ erro: 'Recurso não encontrado.' }, { status: 404 });
  if (!permite(`relatus:${login.uid}`, 10, 60_000)) return NextResponse.json({ erro: 'Muitas consultas ao Relatus. Aguarde um minuto.' }, { status: 429 });

  const numero = (new URL(req.url).searchParams.get('numero') ?? '').replace(/\D/g, '');
  if (!/^\d{5,12}$/.test(numero)) return NextResponse.json({ erro: 'Informe um número de chamado válido.' }, { status: 400 });
  if (!relatusConfigurado()) return NextResponse.json({ erro: 'Integração do Relatus não configurada no servidor. Configure RELATUS_LOGIN e RELATUS_SENHA.' }, { status: 503 });
  const base = (process.env.RELATUS_API_BASE_URL || BASE_PADRAO).replace(/\/$/, '');

  try {
    const atendimento = await comTokenRelatus(base, async (token) => {
      const { guid } = await requisicao<{ guid?: string }>(base, token, `/v1/atendimentos/numero/${numero}`);
      if (!guid) throw Object.assign(new Error('Chamado não encontrado no Relatus.'), { status: 404 });
      return requisicao<Record<string, unknown>>(base, token, `/v1/atendimentos/${encodeURIComponent(guid)}`);
    });
    return NextResponse.json({ ...somenteCamposExibidos(atendimento), numero });
  } catch (erro) {
    const status = Number((erro as { status?: number }).status) || 502;
    const detalhe = erro instanceof Error ? erro.message : 'Não foi possível consultar o Relatus.';
    if (status >= 500) console.error('[relatus/chamado] Falha na consulta:', status, detalhe);
    return NextResponse.json({ erro: status === 404 ? 'Chamado não encontrado no Relatus.' : detalhe }, { status });
  }
}
