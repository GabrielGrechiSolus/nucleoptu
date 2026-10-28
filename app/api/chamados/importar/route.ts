import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { montaChamado, numeroDaPasta, type Chamado } from '../../../chamados/parse';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Lê os .md de uma pasta do disco do servidor. É uma ferramenta de uso local: fica desligada em
// produção (NODE_ENV=production), porque lê caminhos arbitrários do servidor e não exige login.
// O cabeçalho Host não é usado como proteção, pois quem chama pode forjá-lo.
const HOSTS_LOCAIS = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

async function lePastaChamado(dir: string): Promise<Chamado | null> {
  const nome = path.basename(dir);
  const arquivos: Record<string, string> = {};
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    if (e.isFile() && /\.md$/i.test(e.name)) arquivos[e.name] = await fs.readFile(path.join(dir, e.name), 'utf8');
  }
  return montaChamado(nome, arquivos);
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ erro: 'A leitura por caminho só está disponível no ambiente de desenvolvimento local.' }, { status: 403 });
  }
  if (!HOSTS_LOCAIS.has(new URL(req.url).hostname)) {
    return NextResponse.json({ erro: 'A leitura por caminho só está disponível em localhost.' }, { status: 403 });
  }

  let caminho = '';
  try {
    caminho = String((await req.json())?.caminho ?? '').trim().replace(/^"|"$/g, '');
  } catch {
    return NextResponse.json({ erro: 'Requisição inválida.' }, { status: 400 });
  }
  if (!caminho || !path.isAbsolute(caminho)) {
    return NextResponse.json({ erro: 'Informe o caminho completo da pasta, por exemplo C:\\RepositorioGit\\chatgpt\\chamados.' }, { status: 400 });
  }

  let stat;
  try {
    stat = await fs.stat(caminho);
  } catch {
    return NextResponse.json({ erro: `Pasta não encontrada: ${caminho}` }, { status: 404 });
  }
  if (!stat.isDirectory()) {
    return NextResponse.json({ erro: 'O caminho informado não é uma pasta.' }, { status: 400 });
  }

  const chamados: Chamado[] = [];
  const ignoradas: string[] = [];
  try {
    if (numeroDaPasta(path.basename(caminho))) {
      const c = await lePastaChamado(caminho);
      if (c) chamados.push(c);
    } else {
      for (const e of await fs.readdir(caminho, { withFileTypes: true })) {
        if (!e.isDirectory()) continue;
        if (!numeroDaPasta(e.name)) {
          ignoradas.push(e.name);
          continue;
        }
        const c = await lePastaChamado(path.join(caminho, e.name));
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
