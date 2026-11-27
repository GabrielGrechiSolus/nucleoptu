import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import ChamadosPage from './page';
import { montaChamado } from './parse';

const contexto = (numero: string, assunto: string, pr: string) => montaChamado(`${numero}-x`, {
  'REGRA.md': `---\nchamado: ${numero}\ncliente: Cliente Exemplo\nassunto: ${assunto}\ntipo: correcao\nsituacao: corrigido\n${pr ? `pr: banco#${pr}\n` : ''}---\n\n## Problema\nTexto.`,
})!;

const cartao = (cardId: number, numero: string, titulo: string, extra: object = {}) => ({ cardId, customId: numero, numero, titulo, tipoId: null, tipo: 'Correção', colunaId: 1, coluna: 'Em análise', secao: 2, ownerId: null, responsavel: 'Marina Souza', bloqueado: false, prioridade: null, prazo: '', criadoEm: '', atualizadoEm: '2026-11-20T10:00:00Z', naColunaDesde: '2026-11-25T10:00:00Z', boardId: 45, url: 'https://exemplo.invalid', ...extra });

const mockContextos = [contexto('568.001', 'Contexto sem PR', ''), contexto('568.002', 'Contexto com PR', '10')];
const mockCartoes = [
  cartao(1, '570001', 'Cartão sem PR em andamento'),
  cartao(2, '570002', 'Cartão sem PR concluído', { coluna: 'Concluído', secao: 4 }),
  cartao(3, '', 'Cartão sem número'),
  cartao(4, '568002', 'Cartão de chamado que já tem PR'),
];
const mockAbrir = jest.fn();

jest.mock('../components/withAuth', () => ({ __esModule: true, default: (C: React.ComponentType) => C }));
jest.mock('../../firebase', () => ({ db: {}, auth: { currentUser: null } }));
jest.mock('firebase/firestore', () => ({ doc: jest.fn(), serverTimestamp: jest.fn(), writeBatch: jest.fn() }));
jest.mock('../components/usePessoa', () => ({ usePessoa: () => ({ semGit: false, carregado: true, gitUser: '', perfil: '' }) }));
jest.mock('./usePrevisaoRevisao', () => ({ usePrevisaoRevisao: () => null }));
jest.mock('./chamadosDados', () => ({ lerChamados: async () => mockContextos, invalidaChamados: jest.fn() }));
jest.mock('./bmSync', () => ({ lerRegistrosBm: async () => ({}) }));
jest.mock('./bmQuadroSync', () => ({ lerQuadroBm: async () => ({ cartoes: mockCartoes, meta: null }) }));
jest.mock('./BmPainel', () => ({ __esModule: true, default: () => null, BmColuna: () => null }));
jest.mock('./DetalheChamado', () => ({ __esModule: true, default: () => null }));
jest.mock('./DetalheCartao', () => ({ __esModule: true, default: () => null }));
jest.mock('../components/AtualizaAoEntrar', () => ({ EVENTO_DADOS_ATUALIZADOS: 'x' }));
jest.mock('../busca/BuscaExterna', () => ({ __esModule: true, default: () => null }));
jest.mock('../components/TelaDetalhe', () => ({
  __esModule: true,
  default: () => null,
  useDetalheNaUrl: (nome: string) => ({ valor: '', voltar: jest.fn(), abrir: (v: string) => mockAbrir(nome, v), hrefDe: (v: string) => `/chamados?${nome}=${v}` }),
  useDetalheNoHistorico: () => jest.fn(),
}));

const linhas = () => within(screen.getByRole('table')).getAllByRole('row').slice(1).map((r) => r.textContent ?? '');
const aba = (nome: RegExp) => fireEvent.click(screen.getByRole('button', { name: nome }));

describe('contexto de chamados: sem PR na própria lista', () => {
  beforeEach(() => {
    mockAbrir.mockClear();
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ permitido: false }) })) as unknown as typeof fetch;
  });

  it('Regras e orientações traz contextos e cartões sem PR na mesma tabela, sem bloco separado', async () => {
    render(<ChamadosPage />);
    await screen.findByText('Cartão sem PR em andamento');
    aba(/Regras e orientações \(3\)/);
    expect(screen.getAllByRole('table')).toHaveLength(1);
    expect(screen.queryByText('Cartões do BM sem PR')).toBeNull();
    expect(screen.queryByRole('button', { name: /Filtros dos cartões|Com atenção/ })).toBeNull();
    const texto = linhas().join(' | ');
    expect(linhas()).toHaveLength(3);
    for (const t of ['Contexto sem PR', 'Cartão sem PR em andamento', 'Cartão sem PR concluído']) expect(texto).toContain(t);
    expect(texto).not.toContain('já tem PR');
    expect(texto).not.toContain('Contexto com PR');
  });

  it('chamado com PR fica em Corrigidos, sem os cartões', async () => {
    render(<ChamadosPage />);
    await screen.findByText('Cartão sem PR em andamento');
    aba(/Corrigidos \(1\)/);
    expect(linhas()).toHaveLength(1);
    expect(linhas()[0]).toContain('Contexto com PR');
  });

  it('a mesma busca encontra o cartão, inclusive sem número, e a linha abre o cartão', async () => {
    render(<ChamadosPage />);
    await screen.findByText('Cartão sem PR em andamento');
    const campo = screen.getByRole('textbox', { name: 'Pesquisar chamados' });
    fireEvent.change(campo, { target: { value: 'marina concluido' } });
    expect(linhas()).toHaveLength(1);
    fireEvent.click(screen.getByText('Cartão sem PR concluído'));
    expect(mockAbrir).toHaveBeenLastCalledWith('cartao', '2');
    fireEvent.change(campo, { target: { value: 'sem numero' } });
    expect(linhas()[0]).toContain('Cartão sem número');
  });
});
