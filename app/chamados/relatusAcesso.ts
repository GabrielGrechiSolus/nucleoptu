// Quem enxerga o Web Relatus, na tela e na API. Para liberar outras pessoas, defina
// NEXT_PUBLIC_RELATUS_USUARIOS (e-mails separados por vírgula) e publique de novo.
const PADRAO = 'gabriel.grechi@solus.inf.br';

export function podeVerRelatus(email: string | null | undefined, lista: string | undefined = process.env.NEXT_PUBLIC_RELATUS_USUARIOS): boolean {
  const alvo = (email ?? '').trim().toLowerCase();
  if (!alvo) return false;
  return (lista?.trim() || PADRAO).split(',').some((e) => e.trim().toLowerCase() === alvo);
}
