import { chaveDoAmbiente, cifra } from '../_cripto';
import { permite } from '../_limite';
import { COLECAO_CONEXOES, audita, exigeConexoes, falhaInterna, respostaSegura } from './_acesso';
import { limpaEntrada, paraLista, preparaParaGravar } from '../../client-connections/servidor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function lista(req: Request) {
  const a = await exigeConexoes(req);
  if (!a.ok) return respostaSegura({ erro: a.erro }, a.status);
  if (!permite(`lista:${a.uid}`, 60, 60_000)) return respostaSegura({ erro: 'Muitas consultas. Aguarde um instante.' }, 429);
  const snap = await a.db.collection(COLECAO_CONEXOES).get();
  return respostaSegura({ clientes: snap.docs.map((d) => paraLista(d.id, d.data())) });
}

async function grava(req: Request) {
  const a = await exigeConexoes(req);
  if (!a.ok) return respostaSegura({ erro: a.erro }, a.status);
  if (!permite(`grava:${a.uid}`, 40, 60_000)) return respostaSegura({ erro: 'Muitas alterações seguidas. Aguarde um instante.' }, 429);
  const texto = await req.text();
  if (texto.length > 400_000) return respostaSegura({ erro: 'Requisição grande demais.' }, 413);
  let corpo: unknown;
  try {
    corpo = JSON.parse(texto);
  } catch {
    return respostaSegura({ erro: 'Requisição inválida.' }, 400);
  }
  const entrada = limpaEntrada((corpo as { cliente?: unknown })?.cliente);
  if (!entrada.ok) return respostaSegura({ erro: entrada.erro }, 400);
  const cliente = entrada.cliente;
  const chave = chaveDoAmbiente();
  if (!chave && cliente.conexoes.some((x) => x.senha)) {
    return respostaSegura({ erro: 'Defina CONEXOES_CHAVE_CRIPTO no servidor para guardar senhas criptografadas.' }, 503);
  }

  const novo = !cliente.id;
  const ref = novo ? a.db.collection(COLECAO_CONEXOES).doc() : a.db.collection(COLECAO_CONEXOES).doc(cliente.id);
  const existente = novo ? null : await ref.get();
  const antigo = existente?.exists ? (existente.data() as Record<string, unknown>) : null;
  const agora = new Date().toISOString();
  const final = {
    ...cliente,
    id: ref.id,
    criadoEm: antigo ? String(antigo.criadoEm ?? agora) : agora,
    criadoPor: antigo ? String(antigo.criadoPor ?? a.email) : a.email,
    atualizadoEm: agora,
    atualizadoPor: a.email,
  };
  const gravar = preparaParaGravar(final, antigo, (t, ctx) => cifra(t, chave as Buffer, ctx));
  await ref.set(gravar);
  await audita(a.db, a.email, novo ? 'criar' : 'editar', { clienteId: ref.id, nome: cliente.nome });
  return respostaSegura({ cliente: paraLista(ref.id, gravar) });
}

async function exclui(req: Request) {
  const a = await exigeConexoes(req);
  if (!a.ok) return respostaSegura({ erro: a.erro }, a.status);
  if (!permite(`exclui:${a.uid}`, 20, 60_000)) return respostaSegura({ erro: 'Muitas exclusões seguidas. Aguarde um instante.' }, 429);
  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) return respostaSegura({ erro: 'Cliente inválido.' }, 400);
  const ref = a.db.collection(COLECAO_CONEXOES).doc(id);
  const doc = await ref.get();
  if (!doc.exists) return respostaSegura({ erro: 'Cliente não encontrado.' }, 404);
  await ref.delete();
  await audita(a.db, a.email, 'excluir', { clienteId: id, nome: String(doc.data()?.nome ?? '') });
  return respostaSegura({ ok: true });
}

export const GET = (req: Request) => lista(req).catch(falhaInterna);
export const POST = (req: Request) => grava(req).catch(falhaInterna);
export const DELETE = (req: Request) => exclui(req).catch(falhaInterna);
