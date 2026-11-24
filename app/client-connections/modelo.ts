import { ORIENTACAO_SENSIVEL, achaDadoSensivel } from './sensivel';

export type TipoConexao = 'anydesk' | 'teamviewer' | 'terminal' | 'vpn';
export type PerfilContato = '' | 'tecnica' | 'regra' | 'gerente';
export type StatusCliente = 'ativo' | 'inativo';

export const TIPOS_CONEXAO: TipoConexao[] = ['anydesk', 'teamviewer', 'terminal', 'vpn'];
export const ROTULO_TIPO_CONEXAO: Record<TipoConexao, string> = { anydesk: 'AnyDesk', teamviewer: 'TeamViewer', terminal: 'Terminal Service', vpn: 'VPN' };
export const PERFIS_CONTATO: PerfilContato[] = ['tecnica', 'regra', 'gerente'];
export const ROTULO_PERFIL: Record<PerfilContato, string> = { '': 'Sem perfil', tecnica: 'Técnica', regra: 'Regra de negócio', gerente: 'Gerente' };
export const PROTOCOLOS_VPN = ['OpenVPN', 'WireGuard', 'IPsec', 'L2TP', 'PPTP', 'Outro'];

export interface Conexao {
  id: string;
  tipo: TipoConexao;
  nome: string;
  idRemoto: string;
  host: string;
  porta: string;
  usuario: string;
  senha: string;
  temSenha: boolean;
  limparSenha: boolean;
  dominio: string;
  protocolo: string;
  observacao: string;
}

export interface ContatoTeams {
  id: string;
  nome: string;
  teams: string;
  perfil: PerfilContato;
  cargo: string;
  telefone: string;
  observacao: string;
}

export interface ClienteConexao {
  id: string;
  nome: string;
  codigo: string;
  cidadeUf: string;
  descricao: string;
  status: StatusCliente;
  conexoes: Conexao[];
  contatos: ContatoTeams[];
  criadoEm: string;
  criadoPor: string;
  atualizadoEm: string;
  atualizadoPor: string;
}

export const novoId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const novaConexao = (tipo: TipoConexao): Conexao => ({
  id: novoId(),
  tipo,
  nome: '',
  idRemoto: '',
  host: '',
  porta: tipo === 'terminal' ? '3389' : '',
  usuario: '',
  senha: '',
  temSenha: false,
  limparSenha: false,
  dominio: '',
  protocolo: tipo === 'vpn' ? 'OpenVPN' : '',
  observacao: '',
});

export const novoContato = (): ContatoTeams => ({ id: novoId(), nome: '', teams: '', perfil: '', cargo: '', telefone: '', observacao: '' });

export const novoCliente = (): ClienteConexao => ({
  id: '',
  nome: '',
  codigo: '',
  cidadeUf: '',
  descricao: '',
  status: 'ativo',
  conexoes: [],
  contatos: [],
  criadoEm: '',
  criadoPor: '',
  atualizadoEm: '',
  atualizadoPor: '',
});

const texto = (v: unknown) => (typeof v === 'string' ? v : v === null || v === undefined ? '' : String(v));

export function normalizaCliente(id: string, bruto: Record<string, unknown>): ClienteConexao {
  const conexoes = Array.isArray(bruto.conexoes) ? (bruto.conexoes as Record<string, unknown>[]) : [];
  const contatos = Array.isArray(bruto.contatos) ? (bruto.contatos as Record<string, unknown>[]) : [];
  return {
    id,
    nome: texto(bruto.nome),
    codigo: texto(bruto.codigo),
    cidadeUf: texto(bruto.cidadeUf),
    descricao: texto(bruto.descricao),
    status: bruto.status === 'inativo' ? 'inativo' : 'ativo',
    conexoes: conexoes
      .filter((c) => TIPOS_CONEXAO.includes(c.tipo as TipoConexao))
      .map((c) => {
        const base = novaConexao(c.tipo as TipoConexao);
        return { ...base, id: texto(c.id) || novoId(), nome: texto(c.nome), idRemoto: texto(c.idRemoto), host: texto(c.host), porta: texto(c.porta) || base.porta, usuario: texto(c.usuario), senha: texto(c.senha), temSenha: c.temSenha === true, limparSenha: false, dominio: texto(c.dominio), protocolo: texto(c.protocolo) || base.protocolo, observacao: texto(c.observacao) };
      }),
    contatos: contatos.map((c) => ({
      id: texto(c.id) || novoId(),
      nome: texto(c.nome),
      teams: texto(c.teams),
      perfil: PERFIS_CONTATO.includes(c.perfil as PerfilContato) ? (c.perfil as PerfilContato) : '',
      cargo: texto(c.cargo),
      telefone: texto(c.telefone),
      observacao: texto(c.observacao),
    })),
    criadoEm: texto(bruto.criadoEm),
    criadoPor: texto(bruto.criadoPor),
    atualizadoEm: texto(bruto.atualizadoEm),
    atualizadoPor: texto(bruto.atualizadoPor),
  };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function textoSensivel(c: ClienteConexao): string | null {
  const campos: [string, string][] = [['Nome do cliente', c.nome], ['Código', c.codigo], ['Cidade/UF', c.cidadeUf], ['Descrição', c.descricao]];
  for (const x of c.conexoes) {
    const r = ROTULO_TIPO_CONEXAO[x.tipo];
    campos.push([`${r}: nome`, x.nome], [`${r}: ID de acesso`, x.idRemoto], [`${r}: servidor`, x.host], [`${r}: usuário`, x.usuario], [`${r}: domínio`, x.dominio], [`${r}: observação`, x.observacao]);
  }
  for (const p of c.contatos) campos.push(['Contato: nome', p.nome], ['Contato: cargo', p.cargo], ['Contato: observação', p.observacao]);
  for (const [rotulo, valor] of campos) {
    const achado = achaDadoSensivel(valor);
    if (achado) return `${rotulo}: parece conter ${achado}. ${ORIENTACAO_SENSIVEL}`;
  }
  return null;
}

export interface OpcoesValidacao {
  semTravaSensivel?: boolean;
}

export function validaCliente(c: ClienteConexao, opcoes: OpcoesValidacao = {}): string | null {
  if (c.nome.trim().length < 2) return 'Informe o nome do cliente.';
  for (const x of c.conexoes) {
    const rotulo = ROTULO_TIPO_CONEXAO[x.tipo];
    if ((x.tipo === 'anydesk' || x.tipo === 'teamviewer') && !x.idRemoto.trim()) return `${rotulo}: informe o ID de acesso.`;
    if ((x.tipo === 'terminal' || x.tipo === 'vpn') && !x.host.trim()) return `${rotulo}: informe o servidor (host ou IP).`;
  }
  for (const p of c.contatos) {
    if (!p.nome.trim()) return 'Contato do Teams: informe o nome.';
    if (p.teams.trim() && !EMAIL.test(p.teams.trim())) return `Contato ${p.nome}: o endereço do Teams deve ser um e-mail válido.`;
  }
  return opcoes.semTravaSensivel ? null : textoSensivel(c);
}

export interface PreviaImportacao {
  novos: ClienteConexao[];
  repetidos: string[];
  invalidos: number;
  conexoes: number;
  comSenha: number;
}

const chaveNome = (n: string) => n.trim().toLowerCase();

// Lê um arquivo de importação ({ clientes: [...] } ou uma lista) e separa o que é novo do que já está cadastrado (pelo nome).
export function previaImportacao(bruto: unknown, existentes: Pick<ClienteConexao, 'nome'>[], opcoes: OpcoesValidacao = {}): PreviaImportacao {
  const lista: unknown[] = Array.isArray(bruto) ? bruto : Array.isArray((bruto as { clientes?: unknown })?.clientes) ? (bruto as { clientes: unknown[] }).clientes : [];
  const conhecidos = new Set(existentes.map((c) => chaveNome(c.nome)));
  const novos: ClienteConexao[] = [];
  const repetidos: string[] = [];
  let invalidos = 0;
  for (const item of lista) {
    if (!item || typeof item !== 'object') {
      invalidos++;
      continue;
    }
    const c = normalizaCliente('', item as Record<string, unknown>);
    if (validaCliente(c, opcoes)) {
      invalidos++;
      continue;
    }
    if (conhecidos.has(chaveNome(c.nome))) {
      repetidos.push(c.nome);
      continue;
    }
    conhecidos.add(chaveNome(c.nome));
    novos.push(c);
  }
  return {
    novos,
    repetidos,
    invalidos,
    conexoes: novos.reduce((n, c) => n + c.conexoes.length, 0),
    comSenha: novos.reduce((n, c) => n + c.conexoes.filter((x) => x.senha).length, 0),
  };
}

export function resumoConexoes(c: Pick<ClienteConexao, 'conexoes'>): Record<TipoConexao, number> {
  const r: Record<TipoConexao, number> = { anydesk: 0, teamviewer: 0, terminal: 0, vpn: 0 };
  for (const x of c.conexoes) r[x.tipo]++;
  return r;
}

export const linkTeams = (email: string) => `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(email.trim())}`;

export interface FiltrosClientes {
  busca: string;
  status: '' | StatusCliente;
  tipo: '' | TipoConexao;
  perfil: '' | PerfilContato;
}

export const FILTROS_CLIENTES_INICIAIS: FiltrosClientes = { busca: '', status: '', tipo: '', perfil: '' };

export function filtraClientes(lista: ClienteConexao[], f: FiltrosClientes): ClienteConexao[] {
  const q = f.busca.trim().toLowerCase();
  return lista.filter((c) => {
    if (f.status && c.status !== f.status) return false;
    if (f.tipo && !c.conexoes.some((x) => x.tipo === f.tipo)) return false;
    if (f.perfil && !c.contatos.some((p) => p.perfil === f.perfil)) return false;
    if (!q) return true;
    const palavras = [c.nome, c.codigo, c.cidadeUf, c.descricao, ...c.conexoes.flatMap((x) => [x.nome, x.idRemoto, x.host]), ...c.contatos.flatMap((p) => [p.nome, p.teams, p.cargo])];
    return palavras.join(' ').toLowerCase().includes(q);
  });
}

const perfilDoCargo = (cargo: string): PerfilContato => (/ger/i.test(cargo) ? 'gerente' : /regra|neg[oó]cio|analis/i.test(cargo) ? 'regra' : /t[eé]cn|suporte|ti\b/i.test(cargo) ? 'tecnica' : '');

export function migraDadosLocais(bruto: unknown): Omit<ClienteConexao, 'id'>[] {
  if (!Array.isArray(bruto)) return [];
  const primeiroUsuario = (r: Record<string, unknown>) => ((Array.isArray(r.users) ? r.users[0] : null) ?? {}) as Record<string, unknown>;
  return (bruto as Record<string, unknown>[])
    .filter((c) => texto(c.clientName).trim())
    .map((c) => {
      const lista = (chave: string) => (Array.isArray(c[chave]) ? (c[chave] as Record<string, unknown>[]) : []);
      const conexoes: Conexao[] = [
        ...lista('anydesks').map((a) => ({ ...novaConexao('anydesk'), nome: texto(a.name), idRemoto: texto(a.anydeskId), senha: texto(a.password), observacao: texto(a.description) })),
        ...lista('teamviewers').map((a) => ({ ...novaConexao('teamviewer'), nome: texto(a.name), idRemoto: texto(a.teamviewerId), senha: texto(a.password), observacao: texto(a.description) })),
        ...lista('terminalServices').map((a) => ({ ...novaConexao('terminal'), nome: texto(a.name), host: texto(a.host), porta: texto(a.port) || '3389', usuario: texto(primeiroUsuario(a).username), senha: texto(primeiroUsuario(a).password), observacao: texto(a.description) })),
        ...lista('vpns').map((a) => ({ ...novaConexao('vpn'), nome: texto(a.name), host: texto(a.host), porta: texto(a.port), protocolo: texto(a.protocol) || 'OpenVPN', usuario: texto(primeiroUsuario(a).username), senha: texto(primeiroUsuario(a).password), observacao: texto(a.description) })),
      ].filter((x) => (x.tipo === 'anydesk' || x.tipo === 'teamviewer' ? x.idRemoto.trim() : x.host.trim()));
      const contatos: ContatoTeams[] = lista('contacts')
        .filter((p) => texto(p.name).trim())
        .map((p) => ({ ...novoContato(), nome: texto(p.name), teams: EMAIL.test(texto(p.email).trim()) ? texto(p.email).trim() : '', perfil: perfilDoCargo(texto(p.role)), cargo: texto(p.role), telefone: texto(p.phone), observacao: texto(p.notes) }));
      return {
        nome: texto(c.clientName).trim(),
        codigo: texto(c.clientCode),
        cidadeUf: '',
        descricao: texto(c.description),
        status: c.status === 'inactive' || c.status === 'archived' ? ('inativo' as const) : ('ativo' as const),
        conexoes,
        contatos,
        criadoEm: '',
        criadoPor: '',
        atualizadoEm: '',
        atualizadoPor: '',
      };
    });
}
