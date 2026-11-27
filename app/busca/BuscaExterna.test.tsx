import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { limpaDadosSalvos } from '../chamados/dadosSalvos';
import BuscaExterna from './BuscaExterna';

let mockChave = 'chave-de-teste';
jest.mock('../chamados/atualizaGit', () => ({ tokenDoLogin: jest.fn(async () => 'token-de-teste') }));
jest.mock('../chamados/bmChave', () => ({ lerChaveBm: () => mockChave, cabecalhoBm: () => ({ 'x-bm-key': mockChave }) }));

let urls: string[] = [];

describe('busca ao vivo no GitHub e no BM', () => {
  beforeEach(() => {
    limpaDadosSalvos();
    mockChave = 'chave-de-teste';
    urls = [];
    global.fetch = jest.fn(async (url: unknown) => {
      urls.push(String(url));
      if (String(url).startsWith('/api/bm')) return { ok: true, json: async () => ({ cartoes: { '568361': { cardId: 45678, chamado: '568361', coluna: 'Análise', responsavel: 'Marina', url: 'https://exemplo.invalid/c', secao: 'Análise' } } }) };
      return { ok: true, json: async () => ({ total: 1, prs: [{ repo: 'banco', numero: 7, titulo: 'hotfix/(568.361)-ajuste', estado: 'mesclado', autor: 'dev', atualizadoEm: '2026-11-20T00:00:00Z', url: 'https://exemplo.invalid/pr', chamado: '568.361' }] }) };
    }) as unknown as typeof fetch;
  });

  const tela = (consulta: string, semGit = false) => <BuscaExterna consulta={consulta} semGit={semGit} idsComContexto={new Set(['568361'])} hrefDoChamado={(id) => `/chamados?chamado=${id}`} />;
  const botao = () => screen.getByRole('button', { name: /Buscar no GitHub e no BM|Buscar no BM/ });

  it('só consulta quando pedido e mostra PRs e cartão, com atalho para o contexto', async () => {
    render(tela('568.361'));
    expect(urls).toEqual([]);
    fireEvent.click(botao());
    expect(await screen.findByRole('link', { name: /banco #7/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Ver contexto' }).getAttribute('href')).toBe('/chamados?chamado=568361');
    expect(screen.getByText(/Marina/)).toBeTruthy();
    expect(urls.sort()).toEqual(['/api/bm/chamados', '/api/git/busca?q=568.361']);
  });

  it('o resultado some quando o texto muda e a mesma busca não é repetida', async () => {
    const { rerender } = render(tela('568.361'));
    fireEvent.click(botao());
    await screen.findByRole('link', { name: /banco #7/ });
    rerender(tela('568.362'));
    expect(screen.queryByRole('link', { name: /banco #7/ })).toBeNull();
    rerender(tela('568.361'));
    fireEvent.click(botao());
    await screen.findByRole('link', { name: /banco #7/ });
    expect(urls).toHaveLength(2);
  });

  it('sem número de chamado não consulta o BM e explica o motivo', async () => {
    render(tela('carencia'));
    fireEvent.click(botao());
    await screen.findByRole('link', { name: /banco #7/ });
    expect(urls).toEqual(['/api/git/busca?q=carencia']);
    expect(screen.getByText(/O BM só é consultado ao vivo pelo número do chamado/)).toBeTruthy();
  });

  it('perfil sem Git não consulta o GitHub', async () => {
    render(tela('568.361', true));
    fireEvent.click(botao());
    await screen.findByText(/Marina/);
    expect(urls).toEqual(['/api/bm/chamados']);
  });
});
