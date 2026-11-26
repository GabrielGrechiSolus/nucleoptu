import { NextResponse } from 'next/server';
import { podeVerRelatus } from '../../../chamados/relatusAcesso';
import { permite } from '../../_limite';
import { dadosDoPerfil, verificaFirebase } from '../../_servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_PAGINAS_SPRINTS = 100;
const PARALELO = 6;
const cache = new Map<string, { ate: number; dados: ResultadoRelatus | null }>();
const cacheSprints = new Map<number, { ate: number; itens: Sprint[]; paginas: number }>();

interface LinhaPreSprint {
  idChamadoPreSprint: number;
  idChamado: number;
  nomeAnalista: string;
  tituloChamado: string;
  origemChamado: string;
  razaoCliente: string;
  HoraEstimada?: number;
  observacao?: string;
}

interface Sprint {
  idPreSprint: number;
  descricao: string;
  competencia: string;
  tipo: string;
  equipe: string;
  responsavel: string;
}

interface Pagina<T> { docs?: T[]; pages?: number; total?: number }
interface ResultadoRelatus {
  atendimento: { idAtendimento: number; titulo: string; idCliente: number; razaoCliente: string; tipo: string };
  vinculos: (LinhaPreSprint & { preSprint: string })[];
}

const normaliza = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('pt-BR');

async function requisicao<T>(base: string, token: string, caminho: string, paginada = false): Promise<T> {
  const resposta = await fetch(`${base.replace(/\/$/, '')}${caminho}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Token': token,
      'X-Authorization': token,
      ...(paginada ? { 'X-Paginate': 'true' } : {}),
      Accept: 'application/json',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(20_000),
  });
  if (!resposta.ok) throw Object.assign(new Error(`Relatus respondeu HTTP ${resposta.status}.`), { status: resposta.status >= 500 ? 502 : resposta.status });
  return (await resposta.json()) as T;
}

async function buscaRelatus(numero: string, nomeUsuario: string, base: string, token: string): Promise<ResultadoRelatus> {
  const pessoa = normaliza(nomeUsuario);
  const atend = await requisicao<ResultadoRelatus['atendimento']>(base, token, `/pre-sprint/atendimento/${encodeURIComponent(numero)}`);
  let paginas = 1;
  const vinculos: ResultadoRelatus['vinculos'] = [];
  for (let pagina = 1; pagina <= MAX_PAGINAS_SPRINTS; pagina++) {
    let entrada = cacheSprints.get(pagina);
    if (!entrada || entrada.ate <= Date.now()) {
      const params = new URLSearchParams({ page: String(pagina), limit: '100' });
      const resposta = await requisicao<Sprint[] | Pagina<Sprint>>(base, token, `/pre-sprint/lista?${params}`, true);
      entrada = { ate: Date.now() + 5 * 60_000, itens: Array.isArray(resposta) ? resposta : (resposta.docs ?? []), paginas: Array.isArray(resposta) ? 1 : Math.max(1, Number(resposta.pages) || 1) };
      cacheSprints.set(pagina, entrada);
    }
    paginas = entrada.paginas;
    const sprints = [...entrada.itens].sort((a, b) => Number(b.idPreSprint) - Number(a.idPreSprint));
    for (let i = 0; i < sprints.length; i += PARALELO) {
      const grupo = sprints.slice(i, i + PARALELO);
      const encontrados = await Promise.all(grupo.map(async (sprint) => {
        const params = new URLSearchParams({ idChamado: numero, nomeAnalista: nomeUsuario });
        const resposta = await requisicao<LinhaPreSprint[] | Pagina<LinhaPreSprint>>(
          base, token, `/pre-sprint/${encodeURIComponent(String(sprint.idPreSprint))}/chamado/lista?${params}`,
        );
        const linhas = Array.isArray(resposta) ? resposta : (resposta.docs ?? []);
        return linhas
          .filter((linha) => String(linha.idChamado) === numero && normaliza(linha.nomeAnalista) === pessoa)
          .map((linha) => ({ ...linha, preSprint: sprint.descricao || String(sprint.idPreSprint) }));
      }));
      vinculos.push(...encontrados.flat());
      if (vinculos.length) break;
    }
    if (vinculos.length || pagina >= paginas) break;
    if (pagina === MAX_PAGINAS_SPRINTS) throw new Error('A consulta excedeu o limite de 100 páginas de pré-sprints.');
  }
  if (!vinculos.length) throw Object.assign(new Error('O chamado existe no Relatus, mas não está vinculado ao seu nome.'), { status: 404 });
  return { atendimento: atend, vinculos };
}

export async function GET(req: Request) {
  const login = await verificaFirebase(req);
  if (!login.ok) return NextResponse.json({ erro: login.motivo }, { status: 401 });
  if (!podeVerRelatus(login.email)) return NextResponse.json({ erro: 'Recurso não encontrado.' }, { status: 404 });
  if (!permite(`relatus:${login.uid}`, 10, 60_000)) return NextResponse.json({ erro: 'Muitas consultas ao Relatus. Aguarde um minuto.' }, { status: 429 });

  const numero = (new URL(req.url).searchParams.get('numero') ?? '').replace(/\D/g, '');
  if (!/^\d{5,12}$/.test(numero)) return NextResponse.json({ erro: 'Informe um número de chamado válido.' }, { status: 400 });
  const base = process.env.RELATUS_API_BASE_URL;
  const token = process.env.RELATUS_SERVICE_TOKEN;
  if (!base || !token) return NextResponse.json({ erro: 'Integração do Relatus não configurada no servidor. Configure RELATUS_API_BASE_URL e RELATUS_SERVICE_TOKEN.' }, { status: 503 });

  const perfil = await dadosDoPerfil(login.uid ?? '', login.token ?? '');
  if (!perfil.ok) return NextResponse.json({ erro: 'Não foi possível validar o perfil do Nucléo PTU.' }, { status: 503 });
  if (!perfil.nome.trim()) return NextResponse.json({ erro: 'Seu perfil no Nucléo PTU precisa ter o nome preenchido para vincular o chamado ao analista do Relatus.' }, { status: 403 });

  const chave = `${login.uid}:${numero}:${normaliza(perfil.nome)}`;
  const guardado = cache.get(chave);
  if (guardado && guardado.ate > Date.now()) {
    return guardado.dados ? NextResponse.json(guardado.dados) : NextResponse.json({ erro: 'O chamado não está vinculado ao seu nome no Relatus.' }, { status: 404 });
  }
  try {
    const dados = await buscaRelatus(numero, perfil.nome, base, token);
    cache.set(chave, { ate: Date.now() + 5 * 60_000, dados });
    return NextResponse.json(dados);
  } catch (erro) {
    const status = Number((erro as { status?: number }).status) || 502;
    const mensagem = erro instanceof Error ? erro.message : 'Não foi possível consultar o Relatus.';
    if (status === 404) cache.set(chave, { ate: Date.now() + 60_000, dados: null });
    if (status >= 500) console.error('[relatus/chamado] Falha na consulta:', status, mensagem);
    return NextResponse.json({ erro: mensagem }, { status });
  }
}
