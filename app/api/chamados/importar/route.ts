import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { montaChamado, numeroDaPasta, type Chamado } from '../../../chamados/parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Importação de contextos liberada somente na rede interna.
// - O endereço usado no acesso precisa estar em IMPORT_HOSTS (padrão: 172.16.81.235 e localhost).
// - Quando o IP de origem é informado (x-forwarded-for / x-real-ip), precisa começar com IMPORT_REDE_PREFIXO
//   (padrão: 172.16.81.) ou ser o próprio computador.
// - A rota só lê dentro da pasta CONTEXTOS_DIR (padrão: C:/RepositorioGit/claude/contextos_prs), nunca outro caminho.
// O Next.js não expõe o IP do socket nas rotas; a barreira de rede de verdade é o firewall
// (liberar a porta apenas para 172.16.81.0/24) e o fato de o servidor só escutar nessa rede.
const HOSTS_PERMITIDOS = (process.env.IMPORT_HOSTS ?? '172.16.81.235,localhost,127.0.0.1,[::1]')
  .split(',')
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);
const REDE_PREFIXO = process.env.IMPORT_REDE_PREFIXO ?? '172.16.81.';
const PASTA_CONTEXTOS = path.resolve(process.env.CONTEXTOS_DIR ?? 'C:/RepositorioGit/claude/contextos_prs');
const LOCAIS = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

function origemPermitida(req: Request): { ok: boolean; motivo?: string } {
  // Endereço que a pessoa digitou (cabeçalho Host); req.url pode vir normalizado para o endereço de escuta (0.0.0.0).
  const bruto = (req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? new URL(req.url).host).toLowerCase();
  const host = bruto.startsWith('[') ? bruto.slice(0, bruto.indexOf(']') + 1) : bruto.split(':')[0];
  if (!HOSTS_PERMITIDOS.includes(host)) {
    return { ok: false, motivo: `A importação só é permitida na rede interna. Acesse por http://${HOSTS_PERMITIDOS[0]}.` };
  }
  const ip = (req.headers.get('x-forwarded-for')?.split(',')[0] ?? req.headers.get('x-real-ip') ?? '').trim();
  if (ip && !ip.startsWith(REDE_PREFIXO) && !LOCAIS.has(ip)) {
    return { ok: false, motivo: 'A importação só é permitida a partir da rede interna.' };
  }
  return { ok: true };
}

const dentroDaPasta = (alvo: string) => {
  const a = alvo.toLowerCase();
  const b = PASTA_CONTEXTOS.toLowerCase();
  return a === b || a.startsWith(b + path.sep);
};

async function lePastaChamado(dir: string): Promise<Chamado | null> {
  const nome = path.basename(dir);
  const arquivos: Record<string, string> = {};
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (e.isFile() && /\.md$/i.test(e.name)) arquivos[e.name] = await fs.readFile(path.join(dir, e.name), 'utf8');
  }
  return montaChamado(nome, arquivos);
}

// A página consulta se a importação está liberada para quem a abriu.
export async function GET(req: Request) {
  const o = origemPermitida(req);
  return NextResponse.json({ permitido: o.ok, motivo: o.motivo ?? '', pasta: PASTA_CONTEXTOS.replace(/\\/g, '/') });
}

export async function POST(req: Request) {
  const o = origemPermitida(req);
  if (!o.ok) return NextResponse.json({ erro: o.motivo }, { status: 403 });

  let pedido = '';
  try {
    pedido = String((await req.json())?.caminho ?? '').trim().replace(/^"|"$/g, '');
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 });
  }
  const alvo = path.resolve(pedido || PASTA_CONTEXTOS);
  if (!dentroDaPasta(alvo)) {
    return NextResponse.json({ erro: `Só é possível ler a pasta de contextos configurada (${PASTA_CONTEXTOS.replace(/\\/g, '/')}).` }, { status: 403 });
  }

  let stat;
  try {
    stat = await fs.stat(alvo);
  } catch {
    return NextResponse.json({ erro: `Pasta não encontrada: ${alvo.replace(/\\/g, '/')}` }, { status: 404 });
  }
  if (!stat.isDirectory()) {
    return NextResponse.json({ erro: 'O caminho informado não é uma pasta.' }, { status: 400 });
  }

  const chamados: Chamado[] = [];
  const ignoradas: string[] = [];
  try {
    if (numeroDaPasta(path.basename(alvo))) {
      const c = await lePastaChamado(alvo);
      if (c) chamados.push(c);
    } else {
      for (const e of await fs.readdir(alvo, { withFileTypes: true })) {
        if (!e.isDirectory()) continue;
        if (!numeroDaPasta(e.name)) {
          ignoradas.push(e.name);
          continue;
        }
        const c = await lePastaChamado(path.join(alvo, e.name));
        if (c) chamados.push(c);
        else ignoradas.push(e.name);
      }
    }
  } catch (e) {
    return NextResponse.json({ erro: `Erro ao ler a pasta: ${(e as Error).message}` }, { status: 500 });
  }

  chamados.sort((a, b) => b.id.localeCompare(a.id));
  return NextResponse.json({ chamados, ignoradas });
}
