import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { montaChamado, numeroDaPasta, type Chamado } from '../../../chamados/parse';
import { origemPermitida } from '../../_servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Importação de contextos liberada somente na rede interna (regras em ../../_servidor).
// A rota só lê dentro da pasta CONTEXTOS_DIR (padrão: C:/RepositorioGit/claude/contextos_prs), nunca outro caminho.
const PASTA_CONTEXTOS = path.resolve(process.env.CONTEXTOS_DIR ?? 'C:/RepositorioGit/claude/contextos_prs');

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
