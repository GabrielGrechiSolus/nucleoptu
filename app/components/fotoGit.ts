// Foto de quem tem o Git vinculado: vem direto do GitHub e acompanha a troca de foto lá.
export const fotoDoGit = (login: string, tamanho = 96) => `https://github.com/${encodeURIComponent(login.trim().replace(/^@/, ''))}.png?size=${tamanho}`;
