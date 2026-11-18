import fs from 'node:fs';

export function arrumaChavePrivada(c: Record<string, unknown>): Record<string, unknown> {
  const chave = c.private_key;
  return typeof chave === 'string' && chave.includes('\\n') ? { ...c, private_key: chave.replace(/\\n/g, '\n') } : c;
}

export function credencial(): Record<string, unknown> | null {
  try {
    const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (json) return arrumaChavePrivada(JSON.parse(json));
    const caminho = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (caminho && fs.existsSync(caminho)) return arrumaChavePrivada(JSON.parse(fs.readFileSync(caminho, 'utf8')));
  } catch {
    return null;
  }
  return null;
}
