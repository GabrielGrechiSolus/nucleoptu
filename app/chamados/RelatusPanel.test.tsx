import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import RelatusPanel from './RelatusPanel';
import { limpaRelatusSalvo } from './relatusCache';

jest.mock('./atualizaGit', () => ({ tokenDoLogin: jest.fn(async () => 'token-de-teste') }));

const detalhe = {
  numero: '568361',
  titulo: 'Ajuste',
  cliente: 'Cliente X',
  descricao: 'Texto do descritivo',
  anexos: [{ id: '3', nome: 'log.txt', tamanhoKb: 12 }],
  mensagens: Array.from({ length: 7 }, (_, i) => ({ id: String(i + 1), tipo: 'E', autor: 'Ana', data: '2026-11-20T10:00:00', titulo: `Retorno ${i + 1}`, texto: 'Segue', temAnexo: i === 0 })),
  documentos: [{ nome: 'Plano de testes', url: 'https://docs.google.com/d/1' }],
  falhas: [],
};

describe('painel do Web Relatus', () => {
  let urls: string[] = [];
  let baixados: string[] = [];

  beforeEach(() => {
    limpaRelatusSalvo();
    urls = [];
    baixados = [];
    URL.createObjectURL = jest.fn(() => 'blob:teste');
    URL.revokeObjectURL = jest.fn();
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { baixados.push(this.download); });
    global.fetch = jest.fn(async (url: unknown) => {
      const u = String(url);
      urls.push(u);
      if (u.includes('/arquivo')) return { ok: true, blob: async () => new Blob(['x']) };
      if (u.includes('/anexos')) return { ok: true, json: async () => ({ anexos: [{ id: '9', nome: 'tela.png' }] }) };
      return { ok: true, json: async () => detalhe };
    }) as unknown as typeof fetch;
  });

  it('mostra descritivo, anexos, documentos e as mensagens mais recentes primeiro na lista recebida', async () => {
    render(<RelatusPanel chamadoInicial="568361" />);
    expect(await screen.findByText('Texto do descritivo')).toBeTruthy();
    expect(screen.getByText('Anexos (1)')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Plano de testes/ }).getAttribute('href')).toBe('https://docs.google.com/d/1');
    expect(screen.queryByText('Retorno 6')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Ver mais 2 mensagens' }));
    expect(screen.getByText('Retorno 7')).toBeTruthy();
  });

  it('baixa o anexo do chamado e o de uma mensagem com o nome do arquivo', async () => {
    render(<RelatusPanel chamadoInicial="568361" />);
    fireEvent.click(await screen.findByRole('button', { name: /log\.txt/ }));
    await waitFor(() => expect(baixados).toEqual(['log.txt']));
    fireEvent.click(screen.getByRole('button', { name: 'Ver anexos' }));
    fireEvent.click(await screen.findByRole('button', { name: /tela\.png/ }));
    await waitFor(() => expect(baixados).toEqual(['log.txt', 'tela.png']));
    expect(urls).toEqual([
      '/api/relatus/chamado?numero=568361',
      '/api/relatus/chamado/arquivo?numero=568361&anexo=3',
      '/api/relatus/chamado/anexos?numero=568361&mensagem=1',
      '/api/relatus/chamado/arquivo?numero=568361&mensagem=1&anexo=9',
    ]);
  });
});
