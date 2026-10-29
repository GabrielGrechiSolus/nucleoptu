import { agrupaPorChamado, assuntoDoTitulo, chamadoDoTitulo, montaContextoDePrs, type PrGithub, type UsuarioGithub } from './github';
import { montaChamado } from './parse';

const pr = (o: Partial<PrGithub>): PrGithub => ({
  repo: 'banco',
  numero: 3965,
  titulo: 'hotfix/(568.098)-ajuste-tamanho-justificativa-opme-na-importacao-a500',
  url: 'https://github.com/solussaude/banco/pull/3965',
  criadoEm: '2026-10-26T10:00:00Z',
  fechadoEm: '',
  mescladoEm: '',
  estado: 'aberto',
  corpo: '## Regra de negocio:\nA justificativa longa nao deve impedir a importacao.\n\n## Descricao tecnica:\nAjuste interno.\n\n## Links pertinentes\n[Evidencia de teste](https://docs.example.com/evid)',
  rascunho: false,
  ...o,
});

const usuario: UsuarioGithub = { login: 'RodrigoZandona', nome: 'Rodrigo Zandoná', avatar: '', url: '' };

describe('contextos a partir do GitHub', () => {
  it('lê o número do chamado do título do PR', () => {
    expect(chamadoDoTitulo('hotfix/(568.098)-ajuste')).toBe('568.098');
    expect(chamadoDoTitulo('hotfix/(567680)-impede-autorizacao')).toBe('567.680');
    expect(chamadoDoTitulo('build/(0)-ajuste')).toBeNull();
    expect(assuntoDoTitulo('hotfix/(568.098)-ajuste-tamanho-justificativa')).toBe('Ajuste tamanho justificativa');
  });

  it('agrupa por chamado e separa os PRs sem chamado', () => {
    const { grupos, semChamado } = agrupaPorChamado([pr({}), pr({ repo: 'TestesIntegracao', numero: 1 }), pr({ numero: 9, titulo: 'build/(0)-x' })]);
    expect([...grupos.keys()]).toEqual(['568.098']);
    expect(grupos.get('568.098')!.length).toBe(2);
    expect(semChamado.length).toBe(1);
  });

  it('cria o contexto de um PR aberto: em correção, com autor e texto do próprio PR', () => {
    const { chamado, novo } = montaContextoDePrs('568.098', [pr({})], usuario, null, '2026-10-29T12:00:00Z');
    expect(novo).toBe(true);
    expect(chamado.numero).toBe('568.098');
    expect(chamado.situacao).toBe('em-correcao');
    expect(chamado.autores).toEqual(['Rodrigo Zandoná']);
    expect(chamado.autoresLogin).toEqual(['RodrigoZandona']);
    expect(chamado.prs.map((p) => `${p.repo}#${p.numero}`)).toEqual(['banco#3965']);
    expect(chamado.evidencias[0].url).toBe('https://docs.example.com/evid');
    expect(chamado.docs['REGRA.md']).toContain('A justificativa longa nao deve impedir');
    expect(Object.keys(chamado.docs)).toContain('GITHUB.md');
    expect(chamado.atualizadoEm).toBe('29/10/2026');
  });

  it('PR mesclado vira corrigido, com a data do merge', () => {
    const { chamado } = montaContextoDePrs('568.098', [pr({ estado: 'mesclado', mescladoEm: '2026-10-27T15:00:00Z', fechadoEm: '2026-10-27T15:00:00Z' })], usuario, null, '2026-10-29T12:00:00Z');
    expect(chamado.situacao).toBe('corrigido');
    expect(chamado.publicadoEm).toBe('2026-10-27');
  });

  it('PR de testes não decide a situação; PR fechado sem merge encerra', () => {
    const t = montaContextoDePrs('568.098', [pr({ estado: 'mesclado', mescladoEm: '2026-10-27T15:00:00Z' }), pr({ repo: 'TestesIntegracao', numero: 461, estado: 'aberto' })], usuario, null, '2026-10-29T12:00:00Z');
    expect(t.chamado.situacao).toBe('corrigido');
    const f = montaContextoDePrs('568.098', [pr({ estado: 'fechado', fechadoEm: '2026-10-27T15:00:00Z' })], usuario, null, '2026-10-29T12:00:00Z');
    expect(f.chamado.situacao).toBe('encerrado');
  });

  it('atualiza um contexto existente sem perder o texto de regra, o cliente e a revision', () => {
    const existente = montaChamado('568.098-x', {
      'REGRA.md': '---\nchamado: 568.098\ncliente: Unimed Pato Branco\nassunto: PTU A500 – Recebimento\nautor: Gabriel Grechi\nautorLogin: GabrielGrechiSolus\ntipo: correcao\nsituacao: em-correcao\nmodulo: PTU A500\nrevision: 40127\npr: banco#3000\n---\n\n## Problema\nTexto escrito pela regra.\n',
      'CONTEXTO.md': '# 568.098 - Unimed Pato Branco - Recebimento\n\nAnálise do chamado.',
    })!;
    const { chamado, novo } = montaContextoDePrs('568.098', [pr({ estado: 'mesclado', mescladoEm: '2026-10-27T15:00:00Z' })], usuario, existente, '2026-10-29T12:00:00Z');
    expect(novo).toBe(false);
    expect(chamado.cliente).toBe('Unimed Pato Branco');
    expect(chamado.modulo).toBe('PTU A500');
    expect(chamado.revision).toBe('40127');
    expect(chamado.docs['REGRA.md']).toContain('Texto escrito pela regra.');
    expect(chamado.docs['CONTEXTO.md']).toContain('Análise do chamado.');
    expect(chamado.autores).toEqual(['Gabriel Grechi', 'Rodrigo Zandoná']);
    expect(chamado.prs.map((p) => `${p.repo}#${p.numero}`).sort()).toEqual(['banco#3000', 'banco#3965']);
    // o PR de outra pessoa (banco#3000) ainda em correção mantém o chamado em correção
    expect(chamado.situacao).toBe('em-correcao');
  });
});
