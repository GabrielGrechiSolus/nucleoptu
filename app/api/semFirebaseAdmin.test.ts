/** @jest-environment node */
// Na Vercel o pacote firebase-admin não carrega: qualquer rota que o importe de forma estática responde 500 sem corpo.
// Já aconteceu em 18/11 e em 24/11/2026. Quem precisar dele deve usar import() dentro de try/catch.
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';

const RAIZ = resolve(__dirname);
const rotas = (pasta: string): string[] =>
  readdirSync(pasta).flatMap((nome) => {
    const caminho = join(pasta, nome);
    return statSync(caminho).isDirectory() ? rotas(caminho) : nome === 'route.ts' ? [caminho] : [];
  });

function cadeiaAteFirebaseAdmin(arquivo: string, vistos = new Set<string>()): string[] | null {
  vistos.add(arquivo);
  const fonte = readFileSync(arquivo, 'utf8');
  for (const m of fonte.matchAll(/^(?:import|export)\s+(type\s+)?(?:[^;'"]*?from\s+)?['"]([^'"]+)['"]/gm)) {
    const [, soTipo, alvo] = m;
    if (soTipo) continue;
    if (alvo.startsWith('firebase-admin')) return [arquivo, alvo];
    if (!alvo.startsWith('.')) continue;
    const base = resolve(dirname(arquivo), alvo);
    const achado = [`${base}.ts`, `${base}.tsx`, join(base, 'index.ts')].find((x) => existsSync(x));
    if (achado && !vistos.has(achado)) {
      const resto = cadeiaAteFirebaseAdmin(achado, vistos);
      if (resto) return [arquivo, ...resto];
    }
  }
  return null;
}

test('nenhuma rota de API carrega firebase-admin de forma estática', () => {
  const problemas = rotas(RAIZ)
    .map((r) => cadeiaAteFirebaseAdmin(r))
    .filter((c): c is string[] => !!c)
    .map((c) => c.map((x) => (x.startsWith(RAIZ) ? relative(RAIZ, x) : x)).join(' > '));
  expect(problemas).toEqual([]);
});
