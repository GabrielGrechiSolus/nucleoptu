import { createSign } from 'node:crypto';

// Token de acesso da conta de serviço (OAuth), sem o pacote firebase-admin, que não carrega na Vercel.
const guardados = new Map<string, { token: string; expira: number }>();

const b64url = (v: Buffer | string) => Buffer.from(v).toString('base64url');

export async function tokenDeServico(c: Record<string, unknown>, escopo: string): Promise<string> {
  const email = String(c.client_email ?? '');
  const chave = String(c.private_key ?? '');
  const id = `${email}|${escopo}`;
  const guardado = guardados.get(id);
  if (guardado && guardado.expira - 60_000 > Date.now()) return guardado.token;
  const destino = String(c.token_uri ?? 'https://oauth2.googleapis.com/token');
  const agora = Math.floor(Date.now() / 1000);
  const corpo = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({ iss: email, scope: escopo, aud: destino, iat: agora, exp: agora + 3600 }))}`;
  const assinatura = createSign('RSA-SHA256').update(corpo).sign(chave).toString('base64url');
  const r = await fetch(destino, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${corpo}.${assinatura}` }),
    cache: 'no-store',
  });
  const j = (await r.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
  if (!r.ok || !j.access_token) throw Object.assign(new Error(`Falha ao obter token (${j.error ?? r.status})`), { code: `token-${r.status}` });
  guardados.set(id, { token: j.access_token, expira: Date.now() + (j.expires_in ?? 3600) * 1000 });
  return j.access_token;
}
