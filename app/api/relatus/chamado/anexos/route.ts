import { NextResponse } from 'next/server';
import { anexosRelatus } from '../../../../chamados/relatusDados';
import { autoriza, buscaJson, idValido, noAtendimento, recusado, respostaDeErro } from '../../_consulta';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const pedido = await autoriza(req);
  if (pedido instanceof NextResponse) return pedido;
  const mensagem = pedido.params.get('mensagem') ?? '';
  if (!idValido(mensagem)) return recusado('Mensagem inválida.', 400);

  try {
    const lista = await noAtendimento(pedido.numero, (token, caminho) => buscaJson<unknown>(token, `${caminho}/mensagens/${mensagem}/anexos`));
    return NextResponse.json({ anexos: anexosRelatus(lista) });
  } catch (erro) {
    return respostaDeErro(erro, 'Anexos não encontrados no Relatus.');
  }
}
