import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import FiltrosChamados, { FILTROS_VAZIOS, FiltrosTela } from './FiltrosChamados';

const mockLimpar = jest.fn();

function Tela({ semGit = false }: { semGit?: boolean }) {
  const [filtros, setFiltros] = useState<FiltrosTela>(FILTROS_VAZIOS);
  return (
    <>
      <FiltrosChamados
        filtros={filtros}
        onMuda={(campo, valor) => setFiltros((f) => ({ ...f, [campo]: valor }))}
        onLimpar={() => { mockLimpar(); setFiltros(FILTROS_VAZIOS); }}
        aba="todos"
        onAba={jest.fn()}
        contagem={{ todos: 10, 'em-correcao': 3, corrigidos: 6, regras: 1 }}
        opcoes={{ clientes: ['Cliente A', 'Cliente B'], modulos: ['PTU'], autores: ['Pessoa'], revisions: ['100'] }}
        exibidos={4}
        total={10}
        semGit={semGit}
      />
      <output>{JSON.stringify(filtros)}</output>
    </>
  );
}

describe('filtros do contexto de chamados', () => {
  beforeEach(() => mockLimpar.mockClear());

  it('mostra busca e abas; os demais filtros ficam recolhidos', () => {
    render(<Tela />);
    expect(screen.getByRole('textbox', { name: 'Pesquisar chamados' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Em correção \(3\)/ })).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByText('4 de 10 chamados')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Filtros' }));
    expect(screen.getAllByRole('combobox')).toHaveLength(8);
    expect(screen.getByRole('button', { name: 'Filtros' }).getAttribute('aria-expanded')).toBe('true');
  });

  it('filtro escolhido vira etiqueta removível, mesmo com o painel fechado', () => {
    render(<Tela />);
    const botao = screen.getByRole('button', { name: 'Filtros' });
    fireEvent.click(botao);
    fireEvent.change(screen.getByRole('combobox', { name: 'Cliente' }), { target: { value: 'Cliente B' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Evidência' }), { target: { value: 'nao' } });
    fireEvent.click(screen.getByRole('button', { name: /^Filtros/ }));
    expect(screen.getByRole('button', { name: /^Filtros/ }).textContent).toContain('2');
    fireEvent.click(screen.getByRole('button', { name: 'Remover filtro Cliente: Cliente B' }));
    expect(screen.getByRole('button', { name: 'Remover filtro Evidência: Não' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Remover filtro Cliente/ })).toBeNull();
  });

  it('a busca tem botão para apagar e limpar só aparece quando há o que limpar', () => {
    render(<Tela />);
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull();
    const campo = screen.getByRole('textbox', { name: 'Pesquisar chamados' }) as HTMLInputElement;
    fireEvent.change(campo, { target: { value: 'unimed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apagar busca' }));
    expect(campo.value).toBe('');
    fireEvent.change(campo, { target: { value: 'ptu' } });
    fireEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(mockLimpar).toHaveBeenCalledTimes(1);
  });

  it('perfil sem Git não tem o filtro de PR', () => {
    render(<Tela semGit />);
    fireEvent.click(screen.getByRole('button', { name: 'Filtros' }));
    expect(screen.queryByRole('combobox', { name: 'Tem PR' })).toBeNull();
    expect(screen.getAllByRole('combobox')).toHaveLength(7);
  });
});
