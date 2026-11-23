import { achaDadoSensivel } from './sensivel';
import { novaConexao, novoCliente, validaCliente } from './modelo';
import { limpaEntrada } from './servidor';

describe('trava de dados sensíveis nos campos de texto', () => {
  it('bloqueia tokens, chaves e conexões de banco', () => {
    const casos: [string, string][] = [
      ['github_pat_' + 'A1b2C3d4E5'.repeat(4), 'token do GitHub'],
      ['ghp_' + 'a1B2c3D4e5'.repeat(4), 'token do GitHub'],
      ['AKIA' + 'ABCDEFGHIJKLMNOP', 'chave de acesso'],
      ['-----BEGIN RSA PRIVATE KEY-----', 'chave privada'],
      ['eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc123_def', 'token JWT'],
      ['jdbc:oracle:thin:@10.0.0.1:1521/solus', 'string de conexão de banco'],
      ['Data Source=10.0.0.1;User Id=sa;Password=abc123;', 'string de conexão de banco'],
      ['postgres://app:segredo@10.0.0.1/db', 'string de conexão de banco'],
      ['solus/segredo123@PROD', 'usuário/senha@base'],
      ['(DESCRIPTION = (ADDRESS = (PROTOCOL = TCP)(HOST = DBS)(PORT = 1521)))', 'configuração de um banco'],
      ['senha: Abc12345', 'senha escrita'],
      ['token: abcdef1234567890', 'token ou segredo'],
      ['a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8', 'sequência que parece'],
    ];
    for (const [texto, trecho] of casos) expect(achaDadoSensivel(texto)).toContain(trecho);
    expect(achaDadoSensivel('password=Abc12345')).not.toBeNull();
  });

  it('não bloqueia dados comuns do cadastro', () => {
    const ok = ['Unimed Cuiabá', '10.20.30.40', 'servidor.cliente.com.br', '264177948', '123 456 789', 'Origem: Afrerj/AFRERJ — Novo acesso.docx', 'Conferir as senhas com o original.', 'Ligar antes de acessar', 'Rondonópolis/MT', 'administrator', 'Terminal Service (porta 10010)', 'Unimed_Jauru_VPN_01-2026_certificados_cliente', 'Arquivo Casf/usuario.solus@servidor.cliente.com.br.ovpn', ''];
    for (const t of ok) expect(achaDadoSensivel(t)).toBeNull();
  });

  it('a validação recusa o cadastro sem repetir o valor digitado', () => {
    const c = novoCliente();
    c.nome = 'Cliente Exemplo';
    c.codigo = 'github_pat_' + 'A1b2C3d4E5'.repeat(4);
    const erro = validaCliente(c);
    expect(erro).toContain('Código');
    expect(erro).toContain('token do GitHub');
    expect(erro).not.toContain('github_pat_');
    c.codigo = '';
    const x = novaConexao('terminal');
    x.host = '10.0.0.1';
    x.observacao = 'usuario solus senha: Abc12345';
    c.conexoes = [x];
    expect(validaCliente(c)).toContain('Terminal Service: observação');
  });

  it('a senha da conexão continua livre e a API também recusa', () => {
    const c = novoCliente();
    c.nome = 'Cliente Exemplo';
    const x = novaConexao('terminal');
    x.host = '10.0.0.1';
    x.senha = 'github_pat_' + 'A1b2C3d4E5'.repeat(4);
    c.conexoes = [x];
    expect(validaCliente(c)).toBeNull();
    expect(limpaEntrada({ ...c, descricao: 'ghp_' + 'a1B2c3D4e5'.repeat(4) })).toMatchObject({ ok: false });
    expect(limpaEntrada(c)).toMatchObject({ ok: true });
  });
});
