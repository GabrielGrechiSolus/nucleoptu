import { randomBytes } from 'node:crypto';
import { credencial } from './_credencial';
import { tokenDeServico } from './_tokenServico';

type Dados = Record<string, unknown>;
type Valor = Record<string, unknown>;

export type Documento = { id: string; exists: boolean; data: () => Dados };
export type RefDocumento = { id: string; get: () => Promise<Documento>; set: (d: Dados, opcoes?: { merge?: boolean }) => Promise<void>; delete: () => Promise<void> };
export type Colecao = { get: () => Promise<{ docs: Documento[] }>; doc: (id?: string) => RefDocumento; add: (d: Dados) => Promise<RefDocumento> };
export type Db = { collection: (nome: string) => Colecao };

const ESCOPO = 'https://www.googleapis.com/auth/datastore';

export function paraValor(v: unknown): Valor | undefined {
  if (v === undefined) return undefined;
  if (v === null) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
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
      headers: { Authorization: `Bearer ${await tokenDeServico(c, ESCOPO)}`, 'Content-Type': 'application/json' },
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
        set: async (d, opcoes) => {
          const campos = paraCampos(d);
          // Sem a máscara, o PATCH substitui o documento inteiro; com merge, só os campos enviados mudam.
          const mascara = opcoes?.merge ? Object.keys(campos).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&') : '';
          await chama('PATCH', mascara ? `${caminho}?${mascara}` : caminho, { fields: campos });
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
