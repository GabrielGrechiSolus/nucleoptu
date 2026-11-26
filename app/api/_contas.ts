import { credencial } from './_credencial';
import { tokenDeServico } from './_tokenServico';

// Contas do Firebase Authentication pela API REST (Identity Toolkit), com a chave de serviço e sem firebase-admin.
const ESCOPO = 'https://www.googleapis.com/auth/identitytoolkit';

export interface Conta {
  uid: string;
  email: string;
  nome: string;
  inativo: boolean;
  atributos: Record<string, unknown>; // custom claims (ex.: { admin: true })
  criadoEm: string;
  ultimoAcesso: string;
  validoDesde: number; // segundos; logins anteriores a isso foram revogados
}

export interface MudancaConta {
  senha?: string;
  inativo?: boolean;
  atributos?: Record<string, unknown>;
  revogarSessoes?: boolean;
}

export interface Contas {
  listar: () => Promise<Conta[]>;
  buscar: (uid: string) => Promise<Conta | null>;
  criar: (d: { email: string; senha: string; nome: string }) => Promise<string>;
  atualizar: (uid: string, m: MudancaConta) => Promise<void>;
}

interface ContaBruta {
  localId: string;
  email?: string;
  displayName?: string;
  disabled?: boolean;
  customAttributes?: string;
  createdAt?: string;
  lastLoginAt?: string;
  validSince?: string;
}

const dataDeMs = (v: string | undefined) => (v && Number(v) > 0 ? new Date(Number(v)).toISOString() : '');

function converte(u: ContaBruta): Conta {
  let atributos: Record<string, unknown> = {};
  try {
    atributos = u.customAttributes ? (JSON.parse(u.customAttributes) as Record<string, unknown>) : {};
  } catch {
    atributos = {};
  }
  return {
    uid: u.localId,
    email: u.email ?? '',
    nome: u.displayName ?? '',
    inativo: u.disabled === true,
    atributos,
    criadoEm: dataDeMs(u.createdAt),
    ultimoAcesso: dataDeMs(u.lastLoginAt),
    validoDesde: Number(u.validSince ?? 0),
  };
}

export function contasDe(c: Record<string, unknown>): Contas {
  const raiz = `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(String(c.project_id ?? ''))}`;

  async function chama<T>(metodo: 'GET' | 'POST', caminho: string, corpo?: unknown): Promise<T> {
    const r = await fetch(`${raiz}${caminho}`, {
      method: metodo,
      headers: { Authorization: `Bearer ${await tokenDeServico(c, ESCOPO)}`, 'Content-Type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      cache: 'no-store',
    });
    const j = (await r.json().catch(() => ({}))) as { error?: { message?: string; status?: string } };
    // A mensagem vem como "CODIGO" ou "CODIGO : detalhe".
    if (!r.ok) throw Object.assign(new Error(j.error?.message ?? `Authentication ${r.status}`), { code: j.error?.message?.split(/[ :]/)[0] || j.error?.status || String(r.status) });
    return j as T;
  }

  return {
    listar: async () => {
      const contas: Conta[] = [];
      let pagina = '';
      do {
        const j = await chama<{ users?: ContaBruta[]; nextPageToken?: string }>('GET', `/accounts:batchGet?maxResults=1000${pagina ? `&nextPageToken=${encodeURIComponent(pagina)}` : ''}`);
        contas.push(...(j.users ?? []).map(converte));
        pagina = j.users?.length ? j.nextPageToken ?? '' : '';
      } while (pagina);
      return contas;
    },
    buscar: async (uid) => {
      const j = await chama<{ users?: ContaBruta[] }>('POST', '/accounts:lookup', { localId: [uid] });
      return j.users?.[0] ? converte(j.users[0]) : null;
    },
    criar: async ({ email, senha, nome }) => (await chama<{ localId: string }>('POST', '/accounts', { email, password: senha, displayName: nome, emailVerified: true })).localId,
    atualizar: async (uid, m) => {
      await chama('POST', '/accounts:update', {
        localId: uid,
        ...(m.senha !== undefined ? { password: m.senha } : {}),
        ...(m.inativo !== undefined ? { disableUser: m.inativo } : {}),
        ...(m.atributos !== undefined ? { customAttributes: JSON.stringify(m.atributos) } : {}),
        ...(m.revogarSessoes ? { validSince: String(Math.floor(Date.now() / 1000)) } : {}),
      });
    },
  };
}

export function contasDoAmbiente(): Contas | null {
  const c = credencial();
  return c && c.project_id && c.client_email && c.private_key ? contasDe(c) : null;
}
