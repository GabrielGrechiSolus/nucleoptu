import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { limpaDadosSalvos } from '../chamados/dadosSalvos';
import CronogramaAno from './CronogramaAno';
import { montaMeses } from './dados';
import { itensDoMenu, montaMenu } from '../components/navegacao';

jest.mock('../chamados/atualizaGit', () => ({ tokenDoLogin: jest.fn(async () => 'token-de-teste') }));

const resposta = (ano: number) => ({
  ano,
  colaborador: { nome: 'Titular Exemplo', equipe: 'Equipe B' },
  feriados: { [`${ano}-12-25`]: 'Natal' },
  eventos: [
    { id: 'a', descricao: 'Férias', inicio: `${ano}-01-05`, fim: `${ano}-01-07`, situacao: 'C', projeto: false, horario: '08:00 às 12:00', fundo: '#FF0000', texto: '#FFFFFF', marcas: ['ferias'], observacao: 'Texto livre' },
    { id: 'p', descricao: 'Fase do projeto', inicio: `${ano}-03-02`, fim: `${ano}-03-02`, situacao: 'R', projeto: true, horario: '', fundo: '', texto: '', marcas: [], observacao: '' },
  ],
});

describe('cronograma somente leitura', () => {
  let urls: string[] = [];

  beforeEach(() => {
    limpaDadosSalvos();
    urls = [];
    global.fetch = jest.fn(async (url: unknown) => {
      urls.push(String(url));
      const ano = Number(new URL(String(url), 'http://x').searchParams.get('ano'));
      return { ok: true, json: async () => resposta(ano) };
    }) as unknown as typeof fetch;
  });

  it('o item do menu só existe para quem está liberado', () => {
    const rotas = (cronograma: boolean) => itensDoMenu(montaMenu({ admin: false, processos: false, cronograma })).map((i) => i.href);
    expect(rotas(true)).toContain('/cronograma');
    expect(rotas(false)).not.toContain('/cronograma');
  });

  it('monta os doze meses começando na segunda-feira', () => {
    const meses = montaMeses(2026);
    expect(meses).toHaveLength(12);
    expect(meses[0].nome).toBe('Janeiro');
    expect(meses[0].vazios).toBe(3);
    expect(meses[0].dias[0]).toEqual({ data: '2026-01-01', numero: 1, fimDeSemana: false });
    expect(meses[1].dias).toHaveLength(28);
  });

  it('mostra o ano, o colaborador e o detalhe do dia, sem nenhuma ação de alteração', async () => {
    render(<CronogramaAno anoInicial={2026} hoje="2026-11-27" />);
    expect(await screen.findByText('Titular Exemplo')).toBeTruthy();
    expect(screen.getByText('Dezembro')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /^06\/01\/2026: Férias/ }));
    expect(screen.getByText('Texto livre')).toBeTruthy();
    expect(screen.getByText(/08:00 às 12:00/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /salvar|excluir|editar|novo|replicar/i })).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('feriados e projetos podem ser ocultados sem nova consulta', async () => {
    render(<CronogramaAno anoInicial={2026} hoje="2026-11-27" />);
    await screen.findByText('Titular Exemplo');
    expect(screen.getByRole('button', { name: /^25\/12\/2026: Feriado: Natal/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Feriados' }));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Projetos' }));
    expect(screen.queryByRole('button', { name: /Feriado: Natal/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Fase do projeto/ })).toBeNull();
    expect(urls).toHaveLength(1);
  });

  it('troca de ano consulta uma vez cada; voltar não repete e Atualizar força', async () => {
    render(<CronogramaAno anoInicial={2026} hoje="2026-11-27" />);
    await screen.findByText('Titular Exemplo');
    fireEvent.click(screen.getByRole('button', { name: 'Próximo ano' }));
    await screen.findByRole('button', { name: /^05\/01\/2027/ });
    fireEvent.click(screen.getByRole('button', { name: 'Ano anterior' }));
    await screen.findByRole('button', { name: /^05\/01\/2026/ });
    expect(urls).toEqual(['/api/relatus/cronograma?ano=2026', '/api/relatus/cronograma?ano=2027']);
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    await screen.findByRole('button', { name: /^05\/01\/2026/ });
    expect(urls).toHaveLength(3);
  });
});
