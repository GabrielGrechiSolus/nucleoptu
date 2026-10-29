import { ehAdminBase, listaAdmins, normalizaEmail, validaNovoUsuario, validaSenha } from './validacao';

describe('administração de usuários', () => {
  it('lê a lista de administradores base, com padrão e sem diferenciar maiúsculas', () => {
    expect(listaAdmins(undefined)).toEqual(['gabriel.grechi@solus.inf.br']);
    expect(listaAdmins(' A@x.com , B@y.com ,')).toEqual(['a@x.com', 'b@y.com']);
    expect(ehAdminBase('Gabriel.Grechi@solus.inf.br', listaAdmins(undefined))).toBe(true);
    expect(ehAdminBase('outro@solus.inf.br', listaAdmins(undefined))).toBe(false);
    expect(ehAdminBase(undefined, listaAdmins(undefined))).toBe(false);
  });

  it('valida a senha', () => {
    expect(validaSenha('curta')).toBe('A senha precisa ter pelo menos 8 caracteres.');
    expect(validaSenha('  espaco1')).toBe('A senha não pode começar ou terminar com espaço.');
    expect(validaSenha('SenhaForte1')).toBeNull();
  });

  it('valida o cadastro de um novo usuário', () => {
    const ok = { nome: 'Fulano de Tal', email: 'fulano@solus.inf.br', senha: 'SenhaForte1', tipo: 'analise' as const, admin: false };
    expect(validaNovoUsuario(ok)).toBeNull();
    expect(validaNovoUsuario({ ...ok, nome: ' ' })).toBe('Informe o nome do usuário.');
    expect(validaNovoUsuario({ ...ok, email: 'semarroba' })).toBe('Informe um e-mail válido.');
    expect(validaNovoUsuario({ ...ok, senha: '123' })).toBe('A senha precisa ter pelo menos 8 caracteres.');
    expect(validaNovoUsuario({ ...ok, tipo: 'chefe' as never })).toBe('Escolha o tipo de perfil.');
    expect(normalizaEmail('  A@B.com ')).toBe('a@b.com');
  });
});
