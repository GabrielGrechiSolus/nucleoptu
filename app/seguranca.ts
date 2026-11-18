const AGENTES = [
  'GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'Claude-Web', 'Claude-User', 'Claude-SearchBot', 'anthropic-ai',
  'CCBot', 'PerplexityBot', 'Perplexity-User', 'Bytespider', 'Google-Extended', 'GoogleOther', 'Amazonbot', 'Applebot-Extended',
  'cohere-ai', 'cohere-training-data-crawler', 'Diffbot', 'ImagesiftBot', 'Omgilibot', 'FacebookBot', 'Meta-ExternalAgent', 'Meta-ExternalFetcher',
  'YouBot', 'PetalBot', 'SemrushBot', 'AhrefsBot', 'MJ12bot', 'DotBot', 'Timpibot', 'VelenPublicWebCrawler', 'Webzio', 'img2dataset',
  'Scrapy', 'python-requests', 'python-httpx', 'aiohttp', 'Go-http-client', 'node-fetch', 'axios', 'got/', 'libwww-perl', 'Java/', 'okhttp',
  'HeadlessChrome', 'PhantomJS', 'Selenium', 'Playwright', 'Puppeteer', 'Lighthouse', 'wget', 'HTTrack',
];

const PADRAO = new RegExp(AGENTES.map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');

export const AGENTES_DO_ROBOTS = AGENTES.filter((a) => /^[A-Za-z][\w-]+$/.test(a));

export function ehAgenteBloqueado(userAgent: string | null | undefined): boolean {
  const ua = (userAgent ?? '').trim();
  if (!ua) return true;
  return PADRAO.test(ua);
}

export function mesmaOrigem(origem: string | null, host: string | null, hostEncaminhado: string | null = null): boolean {
  if (!origem) return true;
  try {
    const o = new URL(origem).host.toLowerCase();
    return o === (hostEncaminhado ?? host ?? '').toLowerCase() || o === (host ?? '').toLowerCase();
  } catch {
    return false;
  }
}
