import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ChamadosBmPage from './page';

let mockEmail = '';
let mockCartao = '';
const mockPainel = jest.fn();

const cartao = (cardId: number, numero: string) => ({ cardId, customId: numero, numero, titulo: `Cartão ${cardId}`, tipoId: null, tipo: 'Correção', colunaId: 1, coluna: 'Análise', secao: 2, ownerId: null, responsavel: 'Pessoa', bloqueado: false, prioridade: null, prazo: '', criadoEm: '', atualizadoEm: '', naColunaDesde: '', boardId: 45, url: 'https://exemplo.invalid/cartao' });

jest.mock('../components/withAuth', () => ({ __esModule: true, default: (C: React.ComponentType) => C }));
jest.mock('../AuthContext', () => ({ useAuth: () => ({ user: { email: mockEmail } }) }));
jest.mock('../chamados/bmQuadroSync', () => ({ lerQuadroBm: async () => ({ cartoes: [cartao(1, '568361'), cartao(2, '')], meta: null }) }));
jest.mock('../chamados/chamadosDados', () => ({ lerChamados: async () => [] }));
jest.mock('../chamados/RelatusPanel', () => ({ __esModule: true, default: (p: { chamadoInicial: string }) => { mockPainel(p.chamadoInicial); return <div>Painel do Relatus {p.chamadoInicial}</div>; } }));
jest.mock('../components/TelaDetalhe', () => ({
  __esModule: true,
  useDetalheNaUrl: () => ({ valor: mockCartao, voltar: jest.fn(), abrir: jest.fn(), hrefDe: () => '/chamados-bm' }),
  default: ({ cabecalho, abas, children }: { cabecalho: React.ReactNode; abas?: React.ReactNode; children: React.ReactNode }) => <div>{cabecalho}{abas && <nav>{abas}</nav>}{children}</div>,
}));

describe('Web Relatus nos chamados sem PR', () => {
  beforeEach(() => {
    mockPainel.mockClear();
    mockCartao = '1';
    mockEmail = 'gabriel.grechi@solus.inf.br';
  });

  it('quem está liberado tem a aba, e a consulta só começa ao abri-la', async () => {
    render(<ChamadosBmPage />);
    const aba = await screen.findByRole('button', { name: 'Web Relatus' });
    expect(screen.getByText('Fase')).toBeTruthy();
    expect(mockPainel).not.toHaveBeenCalled();
    fireEvent.click(aba);
    expect(screen.getByText('Painel do Relatus 568361')).toBeTruthy();
    expect(screen.queryByText('Fase')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Cartão' }));
    expect(screen.getByText('Fase')).toBeTruthy();
    expect(screen.queryByText(/Painel do Relatus/)).toBeNull();
  });

  it('cartão sem número de chamado abre a consulta para digitar o número', async () => {
    mockCartao = '2';
    render(<ChamadosBmPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Web Relatus' }));
    expect(mockPainel).toHaveBeenLastCalledWith('');
  });

  it('para os demais não há aba nem consulta', async () => {
    mockEmail = 'outra@solus.inf.br';
    render(<ChamadosBmPage />);
    await screen.findByText('Fase');
    expect(screen.queryByRole('button', { name: /Relatus|Cartão$/ })).toBeNull();
    expect(mockPainel).not.toHaveBeenCalled();
  });
});
