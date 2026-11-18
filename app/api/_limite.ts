const acessos = new Map<string, number[]>();

export function permite(chave: string, maximo: number, janelaMs: number, agora: number = Date.now()): boolean {
  const recentes = (acessos.get(chave) ?? []).filter((t) => agora - t < janelaMs);
  if (recentes.length >= maximo) {
    acessos.set(chave, recentes);
    return false;
  }
  recentes.push(agora);
  acessos.set(chave, recentes);
  if (acessos.size > 5000) for (const [k, v] of acessos) if (!v.some((t) => agora - t < janelaMs)) acessos.delete(k);
  return true;
}
