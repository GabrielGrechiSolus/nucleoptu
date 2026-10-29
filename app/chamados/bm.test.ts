import { cartaoSemGit, grupoDoCampo, htmlParaTexto, montaCartaoBm, resumoDoCartao, urlDoCartao, MENSAGEM_PADRAO_CONCLUSAO, type BmCartaoBruto, type BmMeta } from './bm';

const meta: BmMeta = {
  usuarios: { 112: 'Gabriel Grechi', 88: 'Luiz Gustavo', 90: 'Letícia Scheffer' },
  colunas: { 1085: { nome: 'Backlog do Desenvolvimento', secao: 2 }, 1105: { nome: 'Chamado Concluído', secao: 3 } },
  raias: { 161: 'Expedite' },
  tipos: { 11: 'Issue' },
  tags: { 5: 'Newsletter' },
  campos: {
    36: { nome: 'Cliente', tipo: 'dropdown', valores: { 982: 'Solus' } },
    39: { nome: 'Modalidade', tipo: 'dropdown', valores: { 1359: 'Correção' } },
    48: { nome: 'Git PR', tipo: 'single_line_text', valores: {} },
    47: { nome: 'Git branch', tipo: 'single_line_text', valores: {} },
    57: { nome: 'QA - Documentação', tipo: 'multi_line_text', valores: {} },
    61: { nome: 'Texto conclusão', tipo: 'multi_line_text', valores: {} },
  },
};

const BASE = 'https://solussaude.businessmap.io/api/v2';
const card: BmCartaoBruto = {
  card_id: 5060,
  custom_id: '568361',
  board_id: 45,
  title: '568.361 - COMPLEMENTAR(568018) - PTU - AO VALIDAR O A410',
  description: 'Descrição: <br>Bom dia,<br><p>Erro no elemento &lt;diarias&gt; &amp; taxas</p>',
  owner_user_id: 112,
  reporter: { type: 'internal', value: 88 },
  type_id: 11,
  column_id: 1085,
  lane_id: 161,
  section: 2,
  size: 1,
  priority: 3,
  created_at: '2026-10-26T18:50:01Z',
  last_modified: '2026-10-26T18:50:34Z',
  is_blocked: 0,
  tag_ids: [5],
  custom_fields: [
    { field_id: 36, values: [{ value_id: 982 }] },
    { field_id: 39, values: [{ value_id: 1359 }] },
    { field_id: 61, value: `[]\n\n${MENSAGEM_PADRAO_CONCLUSAO}\n\nObrigado pelo retorno.` },
    { field_id: 48, value: 'https://github.com/solussaude/banco/pull/3965' },
    { field_id: 47, value: 'hotfix/(568.361)-x' },
    { field_id: 99, value: 'campo desconhecido' },
  ],
  subtasks: [{ subtask_id: 1, description: '<p>Criar <a href="https://github.com/x/y/pull/1">PR</a></p>', owner_user_id: 112, finished_at: '2026-10-27T10:00:00Z' }, { subtask_id: 2, description: '<p>Testar</p>' }],
  attachments: [{ file_name: 'evidencia.pdf', link: 'https://exemplo.com/e.pdf' }, { file_name: 'pr', link: 'https://github.com/x/y' }],
  linked_cards: [{ card_id: 7000, link_type: 'child' }],
};

describe('cartão do Businessmap organizado para a tela', () => {
  it('converte HTML do BM em texto legível', () => {
    expect(htmlParaTexto('<p>Olá</p><p>Mundo &amp; cia</p>')).toBe('Olá\nMundo & cia');
    expect(htmlParaTexto('Linha<br>2')).toBe('Linha\n2');
    expect(htmlParaTexto('<a href="https://x.com/a">https://x.com/a</a>')).toBe('https://x.com/a');
    expect(htmlParaTexto('<a href="https://x.com/a">veja</a>')).toBe('veja (https://x.com/a)');
    expect(htmlParaTexto(null)).toBe('');
  });

  it('monta o resumo da lista com coluna, responsável e link do cartão', () => {
    const r = resumoDoCartao(card, meta, BASE);
    expect(r.coluna).toBe('Backlog do Desenvolvimento');
    expect(r.secao).toBe('Em andamento');
    expect(r.responsavel).toBe('Gabriel Grechi');
    expect(r.url).toBe('https://solussaude.businessmap.io/ctrl_board/45/cards/5060/details/');
    expect(urlDoCartao(BASE, 45, 5060)).toBe(r.url);
  });

  it('organiza os dados do cartão', () => {
    const c = montaCartaoBm(card, [{ comment_id: 2, text: '<p>Depois</p>', created_at: '2026-10-28T10:00:00Z', author: { type: 'internal', value: 90 } }, { comment_id: 1, text: '<p>Antes</p>', created_at: '2026-10-27T10:00:00Z', author: { type: 'internal', value: 112 } }], [{ card_id: 7000, custom_id: '568400', title: 'Filho', column_id: 1105 }], meta, BASE);
    expect(c.titulo).toContain('568.361');
    expect(c.raia).toBe('Expedite');
    expect(c.tipo).toBe('Issue');
    expect(c.prioridade).toBe('Média');
    expect(c.solicitante).toBe('Luiz Gustavo');
    expect(c.tags).toEqual(['Newsletter']);
    expect(c.descricao).toBe('Descrição:\nBom dia,\nErro no elemento <diarias> & taxas');
    expect(c.campos.find((x) => x.nome === 'Cliente')).toEqual({ nome: 'Cliente', valor: 'Solus', grupo: 'Identificação' });
    expect(c.campos.some((x) => x.nome.includes('desconhecido'))).toBe(false);
    expect(c.comentarios.map((x) => x.texto)).toEqual(['Antes', 'Depois']);
    expect(c.subtarefas.map((s) => [s.descricao.startsWith('Criar'), s.concluida])).toEqual([[true, true], [false, false]]);
    expect(c.vinculados).toEqual([{ cardId: 7000, chamado: '568400', titulo: 'Filho', coluna: 'Chamado Concluído', tipoVinculo: 'child' }]);
    expect(grupoDoCampo('Git branch')).toBe('Git');
    expect(grupoDoCampo('QA - cenários')).toBe('Qualidade');
  });

  it('confere o card: texto de conclusão padrão pede atenção e PR/evidência vêm do card ou do contexto', () => {
    const c = montaCartaoBm(card, [], [], meta, BASE, { temPr: true, temEvidencia: false });
    const por = (nome: string) => c.conferencia.find((i) => i.item.startsWith(nome))!;
    expect(por('Analista').situacao).toBe('ok');
    expect(por('Texto').situacao).toBe('atencao');
    expect(por('PR').situacao).toBe('ok');
    expect(por('Evidência').situacao).toBe('pendente');
    expect(por('Sem bloqueio').situacao).toBe('ok');
    const bloqueado = montaCartaoBm({ ...card, is_blocked: 1, block_reason: { comment: 'Aguardando cliente' } }, [], [], meta, BASE);
    expect(bloqueado.conferencia.find((i) => i.item === 'Sem bloqueio')!.detalhe).toBe('Aguardando cliente');
    expect(bloqueado.motivoBloqueio).toBe('Aguardando cliente');
  });

  it('visão sem Git remove campos Git, links do GitHub e anexos do Git', () => {
    const c = montaCartaoBm(card, [{ comment_id: 1, text: '<p>Veja https://github.com/solussaude/banco/pull/1</p>', created_at: '2026-10-27T10:00:00Z', author: { value: 112 } }], [], meta, BASE);
    const oculta = (t: string) => t.replace(/https?:\/\/github\.com\/\S*/g, '[link do Git oculto]');
    const s = cartaoSemGit(c, oculta);
    expect(s.campos.some((x) => x.grupo === 'Git')).toBe(false);
    expect(JSON.stringify(s).includes('github.com')).toBe(false);
    expect(s.anexos.map((a) => a.nome)).toEqual(['evidencia.pdf']);
    expect(s.comentarios[0].texto).toBe('Veja [link do Git oculto]');
  });
});
