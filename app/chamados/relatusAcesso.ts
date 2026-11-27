// Quem enxerga o Web Relatus, na tela e na API. Para liberar outras pessoas, defina
// NEXT_PUBLIC_RELATUS_USUARIOS (e-mails separados por vírgula) e publique de novo.
const PADRAO = 'gabriel.grechi@solus.inf.br';

export function podeVerRelatus(email: string | null | undefined, lista: string | undefined = process.env.NEXT_PUBLIC_RELATUS_USUARIOS): boolean {
  const alvo = (email ?? '').trim().toLowerCase();
  if (!alvo) return false;
  return (lista?.trim() || PADRAO).split(',').some((e) => e.trim().toLowerCase() === alvo);
}

// Cronograma tem lista própria: liberar a agenda de alguém não libera os chamados do Relatus.
// Para liberar, defina NEXT_PUBLIC_CRONOGRAMA_USUARIOS (e-mails separados por vírgula) e publique de novo.
export const podeVerCronograma = (email: string | null | undefined): boolean => podeVerRelatus(email, process.env.NEXT_PUBLIC_CRONOGRAMA_USUARIOS ?? '');

// Dono do operador configurado no servidor: só para ele a agenda pode ser achada pelo nome do operador.
export const ehTitularRelatus = (email: string | null | undefined): boolean => (email ?? '').trim().toLowerCase() === PADRAO;
