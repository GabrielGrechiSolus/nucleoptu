import { NextResponse } from 'next/server';
import { ehTitularRelatus, podeVerCronograma } from '../../../chamados/relatusAcesso';
import { achaColaborador, eventosDoColaborador, feriadosDoRelatus } from '../../../cronograma/dados';
import { BASE, autorizaRelatus, buscaJson, exigeConfiguracao, recusado, respostaDeErro } from '../_consulta';
import { comTokenRelatus } from '../_sessao';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NAO_ENCONTRADO = 'Seu usuário não foi encontrado no cronograma do Relatus.';

export async function GET(req: Request) {
  const pedido = await autorizaRelatus(req, podeVerCronograma);
  if (pedido instanceof NextResponse) return pedido;
  const ano = Number(pedido.params.get('ano'));
  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) return recusado('Informe um ano válido.', 400);
  const semConfiguracao = exigeConfiguracao();
  if (semConfiguracao) return semConfiguracao;
  const periodo = { inicio: `${ano}-01-01`, fim: `${ano}-12-31` };

  try {
    const dados = await comTokenRelatus(BASE, async (token) => {
      const lista = await buscaJson<unknown>(token, `/v1/cronograma/colaboradores?${new URLSearchParams({ inicio: periodo.inicio })}`);
      const operador = ehTitularRelatus(pedido.email) ? (await buscaJson<{ nome?: string }>(token, '/v1/me')).nome ?? '' : '';
      const eu = achaColaborador(lista, pedido.email, operador);
      if (!eu) return null;
      const consulta = new URLSearchParams({ ...periodo, incluirFeriados: 'true', incluirProjetos: 'true', colaboradorId: eu.id });
      const agenda = await buscaJson<unknown>(token, `/v1/cronograma?${consulta}`);
      return { ano, colaborador: { nome: eu.nome, equipe: eu.equipe }, feriados: feriadosDoRelatus(agenda), eventos: eventosDoColaborador(agenda, eu.id) };
    });
    return dados ? NextResponse.json(dados) : recusado(NAO_ENCONTRADO, 404);
  } catch (erro) {
    return respostaDeErro(erro, 'Cronograma não encontrado no Relatus.');
  }
}
