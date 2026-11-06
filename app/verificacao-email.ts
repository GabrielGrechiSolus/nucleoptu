export const CORTE_VERIFICACAO_EMAIL = process.env.NEXT_PUBLIC_VERIFICACAO_EMAIL_A_PARTIR_DE ?? '2026-11-06T00:00:00Z';

export function exigeVerificacaoEmail(conta: { emailVerificado?: boolean; criadoEm?: string | number | null }, corteIso: string = CORTE_VERIFICACAO_EMAIL): boolean {
  if (conta.emailVerificado) return false;
  const criado = typeof conta.criadoEm === 'number' ? conta.criadoEm : Date.parse(String(conta.criadoEm ?? ''));
  if (!Number.isFinite(criado)) return false;
  return criado >= Date.parse(corteIso);
}
