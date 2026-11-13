import { perfisDoAmbiente, podeUsarProcessos, usuariosGitDoAmbiente } from './acesso';

describe('acesso à tela de processos do BM', () => {
  it('libera desenvolvedores e analistas, com ou sem usuário Git', () => {
    expect(podeUsarProcessos('desenvolvimento', 'RodrigoZandona')).toBe(true);
    expect(podeUsarProcessos('desenvolvimento', '')).toBe(true);
    expect(podeUsarProcessos('analise', '')).toBe(true);
    expect(podeUsarProcessos('Analise', 'x')).toBe(true);
  });

  it('não libera sustentação, liderança e perfis sem tipo, salvo usuário Git autorizado', () => {
    expect(podeUsarProcessos('sustentacao', 'gabrielgrechisolus')).toBe(false);
    expect(podeUsarProcessos('lideranca', 'outro')).toBe(false);
    expect(podeUsarProcessos('', '')).toBe(false);
    expect(podeUsarProcessos('lideranca', 'GabrielGrechiSolus')).toBe(true);
  });

  it('lê as listas do ambiente com valor padrão', () => {
    expect(perfisDoAmbiente(undefined)).toEqual(['desenvolvimento', 'analise']);
    expect(perfisDoAmbiente(' Analise , lideranca ')).toEqual(['analise', 'lideranca']);
    expect(usuariosGitDoAmbiente(undefined)).toEqual(['gabrielgrechisolus']);
    expect(podeUsarProcessos('lideranca', '', perfisDoAmbiente('analise,lideranca'))).toBe(true);
  });
});
