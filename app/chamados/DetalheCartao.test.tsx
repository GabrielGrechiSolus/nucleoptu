import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import DetalheCartao from './DetalheCartao';

let mockEmail = '';
const mockPainel = jest.fn();

const cartao = (numero: string) => ({ cardId: 1, customId: numero, numero, titulo: 'Cartão 1', tipoId: null, tipo: 'Correção', colunaId: 1, coluna: 'Análise', secao: 2, ownerId: null, responsavel: 'Pessoa', bloqueado: false, prioridade: null, prazo: '', criadoEm: '', atualizadoEm: '', naColunaDesde: '', boardId: 45, url: 'https://exemplo.invalid/cartao' });

jest.mock('../AuthContext', () => ({ useAuth: () => ({ user: { email: mockEmail } }) }));
jest.mock('./RelatusPanel', () => ({ __esModule: true, default: (p: { chamadoInicial: string }) => { mockPainel(p.chamadoInicial); return <div>Painel do Relatus {p.chamadoInicial}</div>; } }));
jest.mock('../components/TelaDetalhe', () => ({
  __esModule: true,
  default: ({ cabecalho, abas, children }: { cabecalho: React.ReactNode; abas?: React.ReactNode; children: React.ReactNode }) => <div>{cabecalho}{abas && <nav>{abas}</nav>}{children}</div>,
}));

const abre = (numero = '568361') => render(<DetalheCartao cartao={cartao(numero)} reports={undefined} agora={0} onVoltar={jest.fn()} />);

describe('detalhe do cartão sem PR', () => {
  beforeEach(() => {
    mockPainel.mockClear();
    mockEmail = 'gabriel.grechi@solus.inf.br';
  });

  it('quem está liberado tem a aba do Relatus, e a consulta só começa ao abri-la', () => {
    abre();
    expect(screen.getByText('Fase')).toBeTruthy();
    expect(mockPainel).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Web Relatus' }));
    expect(screen.getByText('Painel do Relatus 568361')).toBeTruthy();
    expect(screen.queryByText('Fase')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Cartão' }));
    expect(screen.getByText('Fase')).toBeTruthy();
  });

  it('cartão sem número de chamado abre a consulta para digitar o número', () => {
    abre('');
    fireEvent.click(screen.getByRole('button', { name: 'Web Relatus' }));
    expect(mockPainel).toHaveBeenLastCalledWith('');
  });

  it('para os demais não há aba nem consulta', () => {
    mockEmail = 'outra@solus.inf.br';
    abre();
    expect(screen.queryByRole('button', { name: /Relatus|Cartão$/ })).toBeNull();
    expect(mockPainel).not.toHaveBeenCalled();
  });
});
