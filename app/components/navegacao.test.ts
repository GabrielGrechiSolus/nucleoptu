import { contemRota, filtraMenu, itensDoMenu, montaMenu, rotaAtiva, somaContadores } from './navegacao';

describe('menu lateral por assunto', () => {
  const menu = montaMenu({ admin: false, processos: false });

  it('agrupa por assunto e não tem mais o Atlas', () => {
    const rotulos = menu.map((n) => n.label);
    expect(rotulos).toEqual(['Início', 'Mural', 'Chamados', 'Apoio ao atendimento', 'Conta e administração']);
    expect(itensDoMenu(menu).some((i) => i.href.includes('atlas'))).toBe(false);
  });

  it('mostra Processos do BM e Gestão de usuários só para quem tem acesso', () => {
    const hrefs = (o: Parameters<typeof montaMenu>[0]) => itensDoMenu(montaMenu(o)).map((i) => i.href);
    expect(hrefs({ admin: false, processos: false })).not.toContain('/processos');
    expect(hrefs({ admin: false, processos: false })).not.toContain('/admin/usuarios');
    expect(hrefs({ admin: true, processos: true })).toEqual(expect.arrayContaining(['/processos', '/admin/usuarios']));
  });

  it('não repete rotas e identifica a rota ativa, inclusive em subrotas', () => {
    const hrefs = itensDoMenu(montaMenu({ admin: true, processos: true })).map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    expect(rotaAtiva('/chamados', '/chamados')).toBe(true);
    expect(rotaAtiva('/notice-board/abc', '/notice-board')).toBe(true);
    expect(rotaAtiva('/chamados-bm', '/chamados')).toBe(false);
    const chamados = menu.find((n) => n.label === 'Chamados')!;
    expect(contemRota(chamados, '/chamados-bm')).toBe(true);
    expect(contemRota(chamados, '/links')).toBe(false);
  });

  it('filtra pela busca sem considerar acento e mantém o grupo dos itens encontrados', () => {
    const r = filtraMenu(montaMenu({ admin: true, processos: true }), 'FILA');
    expect(r).toHaveLength(1);
    expect(itensDoMenu(r).map((i) => i.href)).toEqual(['/fila']);
    expect(itensDoMenu(filtraMenu(menu, 'conexoes')).map((i) => i.href)).toEqual(['/client-connections']);
    expect(itensDoMenu(filtraMenu(menu, 'businessmap')).map((i) => i.href)).toEqual(['/chamados-bm']);
    expect(filtraMenu(menu, 'zzz')).toEqual([]);
    expect(filtraMenu(menu, '  ')).toBe(menu);
  });

  it('soma os contadores do grupo', () => {
    const chamados = menu.find((n) => n.label === 'Chamados')!;
    expect(somaContadores(chamados, (href) => (href === '/fila' ? 3 : 0))).toBe(3);
  });
});
