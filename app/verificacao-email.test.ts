import { exigeVerificacaoEmail } from './verificacao-email';

const CORTE = '2026-11-06T00:00:00Z';

describe('verificação de e-mail só para contas novas', () => {
  it('exige quando a conta é criada depois do corte e o e-mail não foi confirmado', () => {
    expect(exigeVerificacaoEmail({ emailVerificado: false, criadoEm: '2026-11-07T10:00:00Z' }, CORTE)).toBe(true);
    expect(exigeVerificacaoEmail({ emailVerificado: false, criadoEm: Date.parse('2026-11-06T00:00:00Z') }, CORTE)).toBe(true);
  });

  it('não exige para contas antigas, e-mail confirmado ou data desconhecida', () => {
    expect(exigeVerificacaoEmail({ emailVerificado: false, criadoEm: '2026-10-01T10:00:00Z' }, CORTE)).toBe(false);
    expect(exigeVerificacaoEmail({ emailVerificado: true, criadoEm: '2026-11-07T10:00:00Z' }, CORTE)).toBe(false);
    expect(exigeVerificacaoEmail({ emailVerificado: false }, CORTE)).toBe(false);
    expect(exigeVerificacaoEmail({ emailVerificado: false, criadoEm: 'inválida' }, CORTE)).toBe(false);
  });
});
