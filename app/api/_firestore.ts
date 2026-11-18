import { createSign, randomBytes } from 'node:crypto';
import { credencial } from './_admin';

type Dados = Record<string, unknown>;
type Valor = Record<string, unknown>;

export type Documento = { id: string; exists: boolean; data: () => Dados };
export type RefDocumento = { id: string; get: () => Promise<Documento>; set: (d: Dados) => Promise<void>; delete: () => Promise<void> };
export type Colecao = { get: () => Promise<{ docs: Documento[] }>; doc: (id?: string) => RefDocumento; add: (d: Dados) => Promise<RefDocumento> };
export type Db = { collection: (nome: string) => Colecao };

const ESCOPO = 'https://www.googleapis.com/auth/datastore';
let guardado: { token: string; expira: number; chave: string } | null = null;

const b64url = (v: Buffer | string) => Buffer.from(v).toString('base64url');

async function tokenDeAcesso(c: Dados): Promise<string> {
  const email = String(c.client_email ?? '');
  const chave = String(c.private_key ?? '');
  if (guardado && guardado.chave === email && guardado.expira - 60_000 > Date.now()) return guardado.token;
  const destino = String(c.token_uri ?? 'https://oauth2.googleapis.com/token');
  const agora = Math.floor(Date.now() / 1000);
  const corpo = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: email, scope: ESCOPO, aud: destino, iat: agora, exp: agora + 3600 }))}`;
  const assinatura = createSign('RSA-SHA256').update(corpo).sign(chave).toString('base64url');
  const r = await fetch(destino, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${corpo}.${assinatura}` }),
    cache: 'no-store',
  });
  const j = (await r.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
  if (!r.ok || !j.access_token) throw Object.assign(new Error(`Falha ao obter token (${j.error ?? r.status})`), { code: `token-${r.status}` });
  guardado = { token: j.access_token, expira: Date.now() + (j.expires_in ?? 3600) * 1000, chave: email };
  return j.access_token;
}

export function paraValor(v: unknown): Valor | undefined {
  if (v === undefined) return undefined;
  if (v === null) return { nullValue: null };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map((x) => paraValor(x) ?? { nullValue: null }) } };
  if (typeof v === 'object') return { mapValue: { fields: paraCampos(v as Dados) } };
  return { stringValue: String(v) };
}

export function paraCampos(d: Dados): Record<string, Valor> {
  const campos: Record<string, Valor> = {};
  for (const [k, v] of Object.entries(d)) {
    const valor = paraValor(v);
    if (valor) campos[k] = valor;
  }
  return campos;
}

export function deValor(v: Valor | undefined): unknown {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return ((v.arrayValue as { values?: Valor[] }).values ?? []).map(deValor);
  if ('mapValue' in v) return deCampos((v.mapValue as { fields?: Record<string, Valor> }).fields);
  return null;
}

export function deCampos(campos: Record<string, Valor> | undefined): Dados {
  const d: Dados = {};
  for (const [k, v] of Object.entries(campos ?? {})) d[k] = deValor(v);
  return d;
}

const idAleatorio = () => randomBytes(15).toString('base64url').replace(/[^A-Za-z0-9]/g, 'x').slice(0, 20);

export function bancoDeDados(c: Dados): Db {
  const projeto = String(c.project_id ?? '');
  const raiz = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projeto)}/databases/(default)/documents`;

  async function chama(metodo: string, caminho: string, corpo?: unknown, aceita404 = false) {
    const r = await fetch(`${raiz}${caminho}`, {
      method: metodo,
      headers: { Authorization: `Bearer ${await tokenDeAcesso(c)}`, 'Content-Type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      cache: 'no-store',
    });
    if (r.status === 404 && aceita404) return null;
    const j = (await r.json().catch(() => ({}))) as { error?: { status?: string; message?: string }; [k: string]: unknown };
    if (!r.ok) throw Object.assign(new Error(j.error?.message ?? `Firestore ${r.status}`), { code: j.error?.status ?? String(r.status) });
    return j;
  }

  const comoDocumento = (nome: string, campos: Record<string, Valor> | undefined): Documento => ({
    id: nome.split('/').pop() ?? '',
    exists: true,
    data: () => deCampos(campos),
  });

  const colecao = (nome: string): Colecao => {
    const doc = (id?: string): RefDocumento => {
      const docId = id ?? idAleatorio();
      const caminho = `/${nome}/${encodeURIComponent(docId)}`;
      return {
        id: docId,
        get: async () => {
          const j = await chama('GET', caminho, undefined, true);
          return j ? comoDocumento(String(j.name), j.fields as Record<string, Valor>) : { id: docId, exists: false, data: () => ({}) };
        },
        set: async (d) => {
          await chama('PATCH', caminho, { fields: paraCampos(d) });
        },
        delete: async () => {
          await chama('DELETE', caminho, undefined, true);
        },
      };
    };
    return {
      doc,
      get: async () => {
        const docs: Documento[] = [];
        let pagina = '';
        do {
          const j = await chama('GET', `/${nome}?pageSize=300${pagina ? `&pageToken=${encodeURIComponent(pagina)}` : ''}`);
          for (const x of ((j?.documents as { name: string; fields?: Record<string, Valor> }[] | undefined) ?? [])) docs.push(comoDocumento(x.name, x.fields));
          pagina = String(j?.nextPageToken ?? '');
        } while (pagina);
        return { docs };
      },
      add: async (d) => {
        const ref = doc();
        await ref.set(d);
        return ref;
      },
    };
  };

  return { collection: colecao };
}

export function bancoDoAmbiente(): Db | null {
  const c = credencial();
  return c && c.project_id && c.client_email && c.private_key ? bancoDeDados(c) : null;
}
