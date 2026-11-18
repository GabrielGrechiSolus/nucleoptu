import { chaveDoAmbiente, decifra } from '../../_cripto';
import { permite } from '../../_limite';
import { COLECAO_CONEXOES, audita, exigeConexoes, falhaInterna, respostaSegura } from '../_acesso';
import { contextoDaSenha } from '../../../client-connections/servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function revela(req: Request) {
  const a = await exigeConexoes(req);
  if (!a.ok) return respostaSegura({ erro: a.erro }, a.status);
  if (!permite(`senha:${a.uid}`, 20, 10 * 60_000)) return respostaSegura({ erro: 'Muitas senhas consultadas em pouco tempo. Aguarde alguns minutos.' }, 429);
  const corpo = (await req.json().catch(() => ({}))) as { clienteId?: unknown; conexaoId?: unknown };
  const clienteId = String(corpo.clienteId ?? '');
  const conexaoId = String(corpo.conexaoId ?? '');
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(clienteId) || !/^[A-Za-z0-9_-]{1,60}$/.test(conexaoId)) return respostaSegura({ erro: 'Conexão inválida.' }, 400);
  const chave = chaveDoAmbiente();
  if (!chave) return respostaSegura({ erro: 'CONEXOES_CHAVE_CRIPTO não está configurada no servidor.' }, 503);
  const doc = await a.db.collection(COLECAO_CONEXOES).doc(clienteId).get();
  const conexoes = (doc.exists ? (doc.data()?.conexoes as Record<string, unknown>[] | undefined) : undefined) ?? [];
  const conexao = conexoes.find((x) => String(x.id) === conexaoId);
  const cifrada = typeof conexao?.senhaCifrada === 'string' ? conexao.senhaCifrada : '';
  if (!cifrada) return respostaSegura({ erro: 'Esta conexão não tem senha cadastrada.' }, 404);
  let senha: string;
  try {
    senha = decifra(cifrada, chave, contextoDaSenha(clienteId, conexaoId));
  } catch {
    return respostaSegura({ erro: 'Não foi possível abrir a senha. Confira a chave de criptografia do servidor.' }, 500);
  }
  await audita(a.db, a.email, 'revelar-senha', { clienteId, conexaoId, nome: String(doc.data()?.nome ?? '') });
  return respostaSegura({ senha });
}

export const POST = (req: Request) => revela(req).catch(falhaInterna);
