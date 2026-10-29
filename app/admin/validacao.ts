// Regras de administração de usuários, usadas na tela e no servidor.

export const TIPOS_PERFIL = ['todos', 'analise', 'desenvolvimento', 'lideranca', 'sustentacao'] as const;
export type TipoPerfil = (typeof TIPOS_PERFIL)[number];

export const ROTULO_PERFIL: Record<TipoPerfil, string> = {
  todos: 'Todos',
  analise: 'Análise',
  desenvolvimento: 'Desenvolvimento',
  lideranca: 'Liderança',
  sustentacao: 'Sustentação',
};

export const SENHA_MINIMA = 8;

export interface NovoUsuario {
  nome: string;
  email: string;
  senha: string;
  tipo: TipoPerfil;
  admin: boolean;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizaEmail = (e: string) => e.trim().toLowerCase();

// Lista de administradores base (variável ADMIN_EMAILS, separada por vírgula).
export const listaAdmins = (valor: string | undefined, padrao = 'gabriel.grechi@solus.inf.br') =>
  (valor ?? padrao)
    .split(',')
    .map(normalizaEmail)
    .filter(Boolean);

export const ehAdminBase = (email: string | undefined, lista: string[]) => !!email && lista.includes(normalizaEmail(email));

export function validaSenha(senha: string): string | null {
  if (senha.length < SENHA_MINIMA) return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
  if (/^\s|\s$/.test(senha)) return 'A senha não pode começar ou terminar com espaço.';
  return null;
}

// Devolve a mensagem do primeiro problema, ou null se estiver tudo certo.
export function validaNovoUsuario(d: Partial<NovoUsuario>): string | null {
  if (!d.nome || d.nome.trim().length < 2) return 'Informe o nome do usuário.';
  if (!d.email || !EMAIL.test(normalizaEmail(d.email))) return 'Informe um e-mail válido.';
  const senha = validaSenha(d.senha ?? '');
  if (senha) return senha;
  if (!d.tipo || !TIPOS_PERFIL.includes(d.tipo)) return 'Escolha o tipo de perfil.';
  return null;
}
