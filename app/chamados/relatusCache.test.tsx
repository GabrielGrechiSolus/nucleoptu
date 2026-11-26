import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import RelatusPanel from './RelatusPanel';
import { limpaRelatusSalvo } from './relatusCache';

jest.mock('./atualizaGit', () => ({ tokenDoLogin: jest.fn(async () => 'token-de-teste') }));

const base = {
  numero: '568361',
  titulo: 'Ajuste',
  descricao: 'Texto do descritivo',
  anexos: [],
  documentos: [],
  mensagens: [{ id: '1', tipo: 'E', autor: 'Ana', data: '2026-11-20T10:00:00', titulo: 'Retorno', texto: 'Segue', temAnexo: true }],
  falhas: [] as string[],
};

const MINUTO = 60_000;
let agora = 1_800_000_000_000;
let urls: string[] = [];
let respostas: unknown[] = [];

const consultas = () => urls.filter((u) => u.startsWith('/api/relatus/chamado?')).length;
const falhou = Symbol('falhou');

async function abre(texto = 'Texto do descritivo') {
  render(<RelatusPanel chamadoInicial="568361" />);
  await screen.findByText(texto);
}

describe('consulta salva do Web Relatus', () => {
  beforeEach(() => {
    limpaRelatusSalvo();
    urls = [];
    respostas = [];
    jest.spyOn(Date, 'now').mockImplementation(() => agora);
    global.fetch = jest.fn(async (url: unknown) => {
      const u = String(url);
      urls.push(u);
      if (u.includes('/anexos')) return { ok: true, json: async () => ({ anexos: [{ id: '9', nome: 'tela.png' }] }) };
      const r = respostas.length > 1 ? respostas.shift() : respostas[0];
      if (r === falhou) return { ok: false, json: async () => ({ erro: 'Relatus fora do ar.' }) };
      return { ok: true, json: async () => r };
    }) as unknown as typeof fetch;
  });

  afterEach(() => jest.restoreAllMocks());

  it('chamado fechado não é consultado de novo, mesmo dias depois', async () => {
    respostas = [{ ...base, dataConclusao: '2026-11-21' }];
    await abre();
    cleanup();
    agora += 10 * 24 * 60 * MINUTO;
    await abre();
    fireEvent.click(screen.getByRole('button', { name: 'Buscar no Relatus' }));
    await screen.findByText('Texto do descritivo');
    expect(consultas()).toBe(1);
    expect(screen.getByText(/Consulta salva em/)).toBeTruthy();
  });

  it('chamado aberto é reaproveitado por 30 minutos', async () => {
    respostas = [base, { ...base, descricao: 'Descritivo novo' }];
    await abre();
    cleanup();
    agora += 29 * MINUTO;
    await abre();
    expect(consultas()).toBe(1);
    cleanup();
    agora += 2 * MINUTO;
    await abre('Descritivo novo');
    expect(consultas()).toBe(2);
  });

  it('Atualizar consulta de novo e os anexos de mensagem já vistos continuam salvos', async () => {
    respostas = [base, { ...base, descricao: 'Descritivo novo' }];
    await abre();
    fireEvent.click(screen.getByRole('button', { name: 'Ver anexos' }));
    await screen.findByRole('button', { name: /tela\.png/ });
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    await screen.findByText('Descritivo novo');
    expect(consultas()).toBe(2);
    expect(screen.getByRole('button', { name: /tela\.png/ })).toBeTruthy();
    expect(urls.filter((u) => u.includes('/anexos'))).toHaveLength(1);
  });

  it('se a atualização falhar, mantém o que estava salvo e mostra o erro', async () => {
    respostas = [base, falhou];
    await abre();
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    expect(await screen.findByText('Relatus fora do ar.')).toBeTruthy();
    expect(screen.getByText('Texto do descritivo')).toBeTruthy();
  });

  it('consulta incompleta é refeita na próxima abertura', async () => {
    respostas = [{ ...base, dataConclusao: '2026-11-21', falhas: ['anexos'] }];
    await abre();
    cleanup();
    await abre();
    expect(consultas()).toBe(2);
  });

  it('ao sair do sistema, o que foi salvo é apagado', async () => {
    respostas = [{ ...base, dataConclusao: '2026-11-21' }];
    await abre();
    cleanup();
    limpaRelatusSalvo();
    await waitFor(() => expect(Object.keys(window.localStorage).filter((k) => k.startsWith('relatus'))).toEqual([]));
    await abre();
    expect(consultas()).toBe(2);
  });
});
