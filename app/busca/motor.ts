export const normaliza = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const LINK_PR = /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w.-]+\/([\w.-]+)\/pull\/(\d+)[^\s"]*/g;
const LINK_CARTAO = /(?:https?:\/\/)?[\w.-]*(?:businessmap\.io|kanbanize\.com)\/\S*?\/cards\/(\d+)[^\s"]*/g;

const juntaNumeros = (t: string) => t.replace(/(?<!\d)(\d{3})\.(\d{3})(?!\d)/g, '$1$2');

export function indexa(partes: unknown[]): string {
  const texto = normaliza(partes.filter((p) => p !== null && p !== undefined && p !== '').map(String).join(' \n '));
  const extras = [...texto.matchAll(LINK_PR)].map((m) => `${m[1]}#${m[2]} ${m[1]} ${m[2]}`);
  extras.push(...[...texto.matchAll(/([\w.-]+)#(\d+)/g)].map((m) => `${m[1]} ${m[2]}`));
  return juntaNumeros(extras.length ? `${texto} \n ${extras.join(' \n ')}` : texto);
}

export function termosDaBusca(consulta: string): string[] {
  const preparado = normaliza(consulta)
    .replace(LINK_PR, ' $1#$2 ')
    .replace(LINK_CARTAO, ' $1 ');
  const termos = [...preparado.matchAll(/"([^"]+)"|(\S+)/g)].map((m) => (m[1] ?? m[2]).replace(/\s+/g, ' ').trim());
  return termos.map((t) => juntaNumeros(t.replace(/^"|"$/g, ''))).filter(Boolean);
}

const escapa = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function contemTermo(indice: string, termo: string): boolean {
  if (!/#\d+$/.test(termo)) return indice.includes(termo);
  const inicio = termo.startsWith('#') ? '' : '(?<![\\w.-])';
  return new RegExp(`${inicio}${escapa(termo)}(?!\\d)`).test(indice);
}

export const indiceContem = (indice: string, termos: string[]) => termos.every((t) => contemTermo(indice, t));

export function corresponde(partes: unknown[], consulta: string): boolean {
  const termos = termosDaBusca(consulta);
  return !termos.length || indiceContem(indexa(partes), termos);
}

export function numerosDeChamado(consulta: string): string[] {
  return [...new Set([...consulta.matchAll(/(?<![\d#])(\d{3})\.?(\d{3})(?!\d)/g)].map((m) => m[1] + m[2]))];
}
