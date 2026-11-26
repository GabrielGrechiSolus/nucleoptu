import { NextResponse } from 'next/server';
import { anexosRelatus, documentosRelatus, mensagensRelatus, somenteCamposExibidos, textoDeHtml } from '../../../chamados/relatusDados';
import { autoriza, buscaJson, noAtendimento, respostaDeErro } from '../_consulta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const pedido = await autoriza(req);
  if (pedido instanceof NextResponse) return pedido;

  try {
    const dados = await noAtendimento(pedido.numero, async (token, caminho) => {
      const atendimento = await buscaJson<Record<string, unknown>>(token, caminho);
      const falhas: string[] = [];
      const parte = async (nome: string, sufixo: string): Promise<unknown> => {
        try {
          return await buscaJson<unknown>(token, `${caminho}/${sufixo}`);
        } catch (erro) {
          if ((erro as { status?: number }).status === 401) throw erro;
          falhas.push(nome);
          return [];
        }
      };
      const [mensagens, anexos, documentos] = await Promise.all([
        parte('mensagens', 'mensagens'),
        parte('anexos', 'anexos-cliente'),
        parte('documentos', 'docs-google'),
      ]);
      return {
        ...somenteCamposExibidos(atendimento),
        descricao: textoDeHtml(atendimento.descricao),
        mensagens: mensagensRelatus(mensagens),
        anexos: anexosRelatus(anexos),
        documentos: documentosRelatus(documentos),
        falhas,
      };
    });
    return NextResponse.json({ ...dados, numero: pedido.numero });
  } catch (erro) {
    return respostaDeErro(erro, 'Chamado não encontrado no Relatus.');
  }
}
