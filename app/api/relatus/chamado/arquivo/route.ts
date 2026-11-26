import { NextResponse } from 'next/server';
import { autoriza, busca, idValido, noAtendimento, recusado, respostaDeErro } from '../../_consulta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: Request) {
  const pedido = await autoriza(req);
  if (pedido instanceof NextResponse) return pedido;
  const anexo = pedido.params.get('anexo') ?? '';
  const mensagem = pedido.params.get('mensagem');
  if (!idValido(anexo) || (mensagem !== null && !idValido(mensagem))) return recusado('Anexo inválido.', 400);
  const sufixo = mensagem === null ? `anexos-cliente/${anexo}` : `mensagens/${mensagem}/anexos/${anexo}`;

  try {
    const arquivo = await noAtendimento(pedido.numero, (token, caminho) => busca(token, `${caminho}/${sufixo}`, 55_000));
    return new NextResponse(arquivo.body, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
      },
    });
  } catch (erro) {
    return respostaDeErro(erro, 'Anexo não encontrado no Relatus.');
  }
}
