import { tokenDoLogin } from './atualizaGit';

async function pede(rota: string, parametros: Record<string, string>): Promise<Response> {
  const token = await tokenDoLogin();
  return fetch(`/api/relatus/${rota}?${new URLSearchParams(parametros)}`, { headers: { Authorization: `Bearer ${token}` } });
}

async function falha(resposta: Response, padrao: string): Promise<Error> {
  const corpo = (await resposta.json().catch(() => ({}))) as { erro?: string };
  return new Error(corpo.erro ?? padrao);
}

export async function consultaRelatus<T>(rota: string, parametros: Record<string, string>): Promise<T> {
  const resposta = await pede(rota, parametros);
  if (!resposta.ok) throw await falha(resposta, 'Não foi possível consultar o Relatus.');
  return (await resposta.json()) as T;
}

export async function baixaAnexoRelatus(parametros: Record<string, string>, nome: string): Promise<void> {
  const resposta = await pede('chamado/arquivo', parametros);
  if (!resposta.ok) throw await falha(resposta, 'Não foi possível baixar o anexo.');
  const url = URL.createObjectURL(await resposta.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
