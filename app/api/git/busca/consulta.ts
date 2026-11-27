export function termosParaGithub(consulta: string): string[] {
  return consulta
    .slice(0, 120)
    .replace(/["()\\]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !t.includes(':') && !t.startsWith('-'))
    .map((t) => (/^(AND|OR|NOT)$/.test(t) ? t.toLowerCase() : t))
    .map((t) => {
      const chamado = /^(\d{3})\.?(\d{3})$/.exec(t);
      return chamado ? `"${chamado[1]}.${chamado[2]}"` : t;
    })
    .slice(0, 6);
}
