import { normalizaCliente, validaCliente, type ClienteConexao, type OpcoesValidacao } from './modelo';

export const LIMITES = { texto: 2000, senha: 500, conexoes: 100, contatos: 100 };

type Entrada = { ok: true; cliente: ClienteConexao } | { ok: false; erro: string };

const longo = (valores: unknown[], max: number) => valores.some((v) => typeof v === 'string' && v.length > max);

export function limpaEntrada(bruto: unknown, opcoes: OpcoesValidacao = {}): Entrada {
  if (!bruto || typeof bruto !== 'object' || Array.isArray(bruto)) return { ok: false, erro: 'Dados do cliente inválidos.' };
  const dados = bruto as Record<string, unknown>;
  const id = typeof dados.id === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(dados.id) ? dados.id : '';
  const marcadas = new Set(Array.isArray(dados.conexoes) ? (dados.conexoes as Record<string, unknown>[]).filter((c) => c?.limparSenha === true).map((c) => String(c.id)) : []);
  const c = normalizaCliente(id, dados);
  if (c.conexoes.length > LIMITES.conexoes || c.contatos.length > LIMITES.contatos) return { ok: false, erro: 'Quantidade de conexões ou contatos acima do limite.' };
  if (longo([c.nome, c.codigo, c.cidadeUf, c.descricao], LIMITES.texto) || c.conexoes.some((x) => longo([x.nome, x.idRemoto, x.host, x.porta, x.usuario, x.dominio, x.protocolo, x.observacao], LIMITES.texto)) || c.contatos.some((p) => longo([p.nome, p.teams, p.cargo, p.telefone, p.observacao], LIMITES.texto))) {
    return { ok: false, erro: 'Algum campo ultrapassa o tamanho permitido.' };
  }
  if (c.conexoes.some((x) => longo([x.senha], LIMITES.senha))) return { ok: false, erro: 'Senha acima do tamanho permitido.' };
  c.conexoes = c.conexoes.map((x) => ({ ...x, limparSenha: marcadas.has(x.id) }));
  const problema = validaCliente(c, opcoes);
  return problema ? { ok: false, erro: problema } : { ok: true, cliente: c };
}

export type Cifrador = (texto: string, contexto: string) => string;

export const contextoDaSenha = (clienteId: string, conexaoId: string) => `${clienteId}:${conexaoId}`;

export function preparaParaGravar(c: ClienteConexao, antigo: Record<string, unknown> | null, cifrar: Cifrador): Record<string, unknown> {
  const antigas = new Map<string, string>();
  if (antigo && Array.isArray(antigo.conexoes)) {
    for (const x of antigo.conexoes as Record<string, unknown>[]) if (typeof x.senhaCifrada === 'string' && x.senhaCifrada) antigas.set(String(x.id), x.senhaCifrada);
  }
  const conexoes = c.conexoes.map((x) => {
    const { senha, temSenha, limparSenha, ...resto } = x;
    void temSenha;
    const senhaCifrada = senha ? cifrar(senha, contextoDaSenha(c.id, x.id)) : limparSenha ? '' : antigas.get(x.id) ?? '';
    return { ...resto, senhaCifrada };
  });
  return { ...c, conexoes };
}

export function paraLista(id: string, bruto: Record<string, unknown>): ClienteConexao {
  const c = normalizaCliente(id, bruto);
  const cifradas = new Set(Array.isArray(bruto.conexoes) ? (bruto.conexoes as Record<string, unknown>[]).filter((x) => typeof x.senhaCifrada === 'string' && x.senhaCifrada).map((x) => String(x.id)) : []);
  return { ...c, conexoes: c.conexoes.map((x) => ({ ...x, senha: '', temSenha: cifradas.has(x.id), limparSenha: false })) };
}
