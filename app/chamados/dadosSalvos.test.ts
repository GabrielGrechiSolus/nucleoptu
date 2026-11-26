/** @jest-environment jsdom */
import { criaConsultaSalva, limpaDadosSalvos } from './dadosSalvos';

const MINUTO = 60_000;
let agora = 1_800_000_000_000;

describe('dados salvos entre telas', () => {
  beforeEach(() => {
    limpaDadosSalvos();
    jest.spyOn(Date, 'now').mockImplementation(() => agora);
  });
  afterEach(() => jest.restoreAllMocks());

  it('consulta uma vez, inclusive com pedidos simultâneos, e renova ao vencer', async () => {
    const consulta = criaConsultaSalva<number>({ nome: 'a', validade: () => 5 * MINUTO });
    let n = 0;
    const carrega = jest.fn(async () => ++n);
    const juntos = await Promise.all([consulta.obtem('x', carrega), consulta.obtem('x', carrega)]);
    agora += 4 * MINUTO;
    expect([...juntos, await consulta.obtem('x', carrega)]).toEqual([1, 1, 1]);
    agora += 2 * MINUTO;
    expect(await consulta.obtem('x', carrega)).toBe(2);
  });

  it('valor fixo não vence; atualizar e invalidar forçam nova consulta', async () => {
    const consulta = criaConsultaSalva<number>({ nome: 'b', validade: () => Infinity });
    let n = 0;
    const carrega = async () => ++n;
    await consulta.obtem('x', carrega);
    agora += 100 * 24 * 60 * MINUTO;
    expect(await consulta.obtem('x', carrega)).toBe(1);
    expect(await consulta.obtem('x', carrega, true)).toBe(2);
    consulta.invalida();
    expect(await consulta.obtem('x', carrega)).toBe(3);
    expect(consulta.salvoEm('x')).toBe(agora);
  });

  it('não guarda erro nem o que não deve ser guardado', async () => {
    const consulta = criaConsultaSalva<number | null>({ nome: 'c', validade: () => Infinity, guarda: (v) => v !== null });
    await expect(consulta.obtem('x', async () => { throw new Error('falhou'); })).rejects.toThrow('falhou');
    expect(await consulta.obtem('x', async () => null)).toBeNull();
    expect(await consulta.obtem('x', async () => 7)).toBe(7);
  });

  it('o que foi lido antes de uma gravação não é salvo por cima', async () => {
    const consulta = criaConsultaSalva<string>({ nome: 'd', validade: () => Infinity });
    let solta: (v: string) => void = () => undefined;
    const antiga = consulta.obtem('x', () => new Promise<string>((r) => { solta = r; }));
    consulta.invalida();
    expect(await consulta.obtem('x', async () => 'novo')).toBe('novo');
    solta('velho');
    expect(await antiga).toBe('velho');
    expect(await consulta.obtem('x', async () => 'outro')).toBe('novo');
  });

  it('persistente sobrevive à memória e é apagado ao sair', async () => {
    const opcoes = { nome: 'e', validade: () => Infinity, persiste: true };
    await criaConsultaSalva<string>(opcoes).obtem('x', async () => 'salvo');
    expect(await criaConsultaSalva<string>(opcoes).obtem('x', async () => 'outro')).toBe('salvo');
    limpaDadosSalvos();
    expect(Object.keys(window.localStorage).filter((k) => k.startsWith('nucleoptu.salvo.'))).toEqual([]);
    expect(await criaConsultaSalva<string>(opcoes).obtem('x', async () => 'outro')).toBe('outro');
  });
});
