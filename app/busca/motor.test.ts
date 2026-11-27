import { corresponde, numerosDeChamado } from './motor';

const acha = (texto: unknown[], consulta: string) => corresponde(texto, consulta);

describe('motor de busca', () => {
  const chamado = ['568.361', 'Unimed Limeira', 'Geração do A500 sem executante', 'banco#1234', 'https://github.com/solussaude/ptu/pull/77', 'Comentário do João sobre carência'];

  it('aceita as palavras em qualquer ordem, vindas de campos diferentes', () => {
    expect(acha(chamado, 'a500 limeira')).toBe(true);
    expect(acha(chamado, 'executante unimed joao')).toBe(true);
    expect(acha(chamado, 'a500 araguaina')).toBe(false);
  });

  it('ignora acentos, maiúsculas e espaços a mais', () => {
    expect(acha(chamado, '  GERACAO   carencia ')).toBe(true);
    expect(acha(['Geracao'], 'geração')).toBe(true);
  });

  it('encontra o número do chamado com ou sem ponto, dos dois lados', () => {
    expect(acha(['568361'], '568.361')).toBe(true);
    expect(acha(['568.361'], '568361')).toBe(true);
    expect(acha(['hotfix/(570.276)-ajuste'], '570276')).toBe(true);
    expect(acha(['568361'], '568.362')).toBe(false);
  });

  it('entende PR por #número, repositório#número, repositório e número, ou link', () => {
    expect(acha(chamado, '#1234')).toBe(true);
    expect(acha(chamado, 'banco#1234')).toBe(true);
    expect(acha(chamado, 'banco 1234')).toBe(true);
    expect(acha(chamado, 'https://github.com/solussaude/banco/pull/1234')).toBe(true);
    expect(acha(chamado, 'ptu#77')).toBe(true);
    expect(acha(chamado, 'https://github.com/solussaude/ptu/pull/77/files')).toBe(true);
  });

  it('#número não confunde com um número maior', () => {
    expect(acha(chamado, '#123')).toBe(false);
    expect(acha(chamado, 'banco#123')).toBe(false);
  });

  it('link de cartão do BM encontra pelo id do cartão', () => {
    expect(acha(['cartão 45678'], 'https://empresa.businessmap.io/ctrl_board/45/cards/45678/details/')).toBe(true);
  });

  it('texto entre aspas precisa aparecer junto', () => {
    expect(acha(chamado, '"sem executante"')).toBe(true);
    expect(acha(chamado, '"executante sem"')).toBe(false);
  });

  it('consulta vazia encontra tudo', () => {
    expect(acha([], '   ')).toBe(true);
  });

  it('extrai os números de chamado digitados', () => {
    expect(numerosDeChamado('chamado 568.361 e 570276 do banco#1234')).toEqual(['568361', '570276']);
    expect(numerosDeChamado('unimed')).toEqual([]);
  });
});
