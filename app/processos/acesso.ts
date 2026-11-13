export const PERFIS_PROCESSOS_PADRAO = ['desenvolvimento', 'analise'];
export const USUARIOS_GIT_PROCESSOS_PADRAO = ['gabrielgrechisolus'];

const lista = (valor: string | undefined, padrao: string[]) =>
  (valor ? valor.split(',') : padrao)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);

export function podeUsarProcessos(perfil: string, gitUser: string, perfisPermitidos: string[] = PERFIS_PROCESSOS_PADRAO, usuariosGit: string[] = USUARIOS_GIT_PROCESSOS_PADRAO): boolean {
  if (perfil === 'sustentacao') return false;
  if (perfisPermitidos.includes(perfil.trim().toLowerCase())) return true;
  return !!gitUser && usuariosGit.includes(gitUser.trim().toLowerCase());
}

export const perfisDoAmbiente = (valor: string | undefined) => lista(valor, PERFIS_PROCESSOS_PADRAO);
export const usuariosGitDoAmbiente = (valor: string | undefined) => lista(valor, USUARIOS_GIT_PROCESSOS_PADRAO);
