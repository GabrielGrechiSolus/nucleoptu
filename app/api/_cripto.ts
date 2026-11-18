import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export function chaveDoAmbiente(valor: string | undefined = process.env.CONEXOES_CHAVE_CRIPTO): Buffer | null {
  if (!valor) return null;
  const chave = Buffer.from(valor.trim(), 'base64');
  return chave.length === 32 ? chave : null;
}

export function cifra(texto: string, chave: Buffer, contexto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', chave, iv);
  c.setAAD(Buffer.from(contexto, 'utf8'));
  const dados = Buffer.concat([c.update(texto, 'utf8'), c.final()]);
  return ['v1', iv.toString('base64'), c.getAuthTag().toString('base64'), dados.toString('base64')].join(':');
}

export function decifra(valor: string, chave: Buffer, contexto: string): string {
  const [versao, iv, tag, dados] = valor.split(':');
  if (versao !== 'v1' || !iv || !tag || dados === undefined) throw new Error('Formato de segredo inválido.');
  const d = createDecipheriv('aes-256-gcm', chave, Buffer.from(iv, 'base64'));
  d.setAAD(Buffer.from(contexto, 'utf8'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(dados, 'base64')), d.final()]).toString('utf8');
}
