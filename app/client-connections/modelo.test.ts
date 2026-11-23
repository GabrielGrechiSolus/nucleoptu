import { previaImportacao, filtraClientes, FILTROS_CLIENTES_INICIAIS, linkTeams, migraDadosLocais, normalizaCliente, novaConexao, novoCliente, novoContato, resumoConexoes, validaCliente } from './modelo';

const cliente = () => {
  const c = novoCliente();
  c.nome = 'Cliente Exemplo';
  return c;
};

describe('cadastro de clientes e conexões', () => {
  it('valida o cliente, as conexões e os contatos do Teams', () => {
    expect(validaCliente(novoCliente())).toBe('Informe o nome do cliente.');
    const c = cliente();
    expect(validaCliente(c)).toBe(null);
    c.conexoes.push(novaConexao('anydesk'));
    expect(validaCliente(c)).toBe('AnyDesk: informe o ID de acesso.');
    c.conexoes[0].idRemoto = '123 456 789';
    c.conexoes.push(novaConexao('vpn'));
    expect(validaCliente(c)).toBe('VPN: informe o servidor (host ou IP).');
    c.conexoes[1].host = 'vpn.exemplo.com.br';
    c.contatos.push({ ...novoContato(), nome: 'Ana', teams: 'ana-sem-arroba' });
    expect(validaCliente(c)).toBe('Contato Ana: o endereço do Teams deve ser um e-mail válido.');
    c.contatos[0].teams = 'ana@exemplo.com.br';
    c.contatos[0].perfil = 'gerente';
    expect(validaCliente(c)).toBe(null);
  });

  it('conta as conexões por tipo e monta o link do Teams', () => {
    const c = cliente();
    c.conexoes = [novaConexao('anydesk'), novaConexao('anydesk'), novaConexao('terminal')];
    expect(resumoConexoes(c)).toEqual({ anydesk: 2, teamviewer: 0, terminal: 1, vpn: 0 });
    expect(linkTeams(' ana@exemplo.com.br ')).toBe('https://teams.microsoft.com/l/chat/0/0?users=ana%40exemplo.com.br');
    expect(novaConexao('terminal').porta).toBe('3389');
  });

  it('normaliza o documento do banco com valores padrão e perfis válidos', () => {
    const c = normalizaCliente('abc', { nome: 'X', status: 'inativo', conexoes: [{ tipo: 'vpn', host: 'h' }, { tipo: 'invalido' }], contatos: [{ nome: 'Bia', perfil: 'tecnica' }, { nome: 'Caio', perfil: 'outro' }] });
    expect(c.id).toBe('abc');
    expect(c.status).toBe('inativo');
    expect(c.conexoes.length).toBe(1);
    expect(c.conexoes[0].protocolo).toBe('OpenVPN');
    expect(c.contatos.map((p) => p.perfil)).toEqual(['tecnica', '']);
    expect(normalizaCliente('z', {}).status).toBe('ativo');
  });

  it('filtra por texto, status, tipo de conexão e perfil de contato', () => {
    const a = cliente();
    a.conexoes = [{ ...novaConexao('anydesk'), idRemoto: '999' }];
    a.contatos = [{ ...novoContato(), nome: 'Ana', teams: 'ana@x.com', perfil: 'regra' }];
    const b = { ...cliente(), nome: 'Outro', status: 'inativo' as const };
    const lista = [a, b];
    expect(filtraClientes(lista, FILTROS_CLIENTES_INICIAIS).length).toBe(2);
    expect(filtraClientes(lista, { ...FILTROS_CLIENTES_INICIAIS, status: 'inativo' }).map((c) => c.nome)).toEqual(['Outro']);
    expect(filtraClientes(lista, { ...FILTROS_CLIENTES_INICIAIS, tipo: 'anydesk' }).length).toBe(1);
    expect(filtraClientes(lista, { ...FILTROS_CLIENTES_INICIAIS, perfil: 'regra' }).length).toBe(1);
    expect(filtraClientes(lista, { ...FILTROS_CLIENTES_INICIAIS, busca: 'ANA@X' }).length).toBe(1);
    expect(filtraClientes(lista, { ...FILTROS_CLIENTES_INICIAIS, busca: '999' }).length).toBe(1);
  });

  it('migra os dados da versão anterior, guardada no navegador', () => {
    const migrados = migraDadosLocais([
      {
        clientName: 'Unimed Teste',
        clientCode: '012',
        status: 'archived',
        anydesks: [{ name: 'Servidor', anydeskId: '111 222', password: 'p' }, { name: 'sem id', anydeskId: '' }],
        terminalServices: [{ name: 'TS', host: '10.0.0.1', port: '3390', users: [{ username: 'adm', password: 'x' }] }],
        vpns: [{ name: 'VPN', host: 'vpn.x', protocol: 'wireguard', users: [] }],
        contacts: [{ name: 'Gerente Teste', role: 'Gerente de TI', email: 'g@x.com' }, { name: 'Sem e-mail', role: 'Analista de regra de negócio', email: 'invalido' }],
      },
      { clientName: '' },
    ]);
    expect(migrados.length).toBe(1);
    const m = migrados[0];
    expect(m.nome).toBe('Unimed Teste');
    expect(m.status).toBe('inativo');
    expect(m.conexoes.map((x) => x.tipo)).toEqual(['anydesk', 'terminal', 'vpn']);
    expect(m.contatos.map((p) => [p.perfil, p.teams])).toEqual([['gerente', 'g@x.com'], ['regra', '']]);
    expect(migraDadosLocais('x')).toEqual([]);
  });
});

describe('importação de clientes por arquivo', () => {
  const cliente = (nome: string, conexoes: Record<string, unknown>[] = [{ tipo: 'terminal', host: '10.0.0.1', senha: 'x' }]) => ({ nome, conexoes });

  it('separa novos, repetidos (pelo nome, sem diferenciar maiúsculas) e inválidos', () => {
    const p = previaImportacao({ clientes: [cliente('Novo A'), cliente('já existe'), cliente('Novo A'), cliente('X'), 'lixo', cliente('Sem host', [{ tipo: 'vpn', host: '' }])] }, [{ nome: 'Já Existe' }]);
    expect(p.novos.map((c) => c.nome)).toEqual(['Novo A']);
    expect(p.repetidos).toEqual(['já existe', 'Novo A']);
    expect(p.invalidos).toBe(3);
    expect(p.conexoes).toBe(1);
    expect(p.comSenha).toBe(1);
  });

  it('aceita uma lista simples e arquivos fora do formato', () => {
    expect(previaImportacao([cliente('Lista')], []).novos).toHaveLength(1);
    expect(previaImportacao({ outro: 1 }, []).novos).toHaveLength(0);
    expect(previaImportacao(null, []).novos).toHaveLength(0);
  });
});
