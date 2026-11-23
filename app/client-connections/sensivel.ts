// Detecta segredos e dados de acesso a banco digitados em campos de texto livre.
// Credenciais só podem ficar no campo Senha da conexão (cifrado no servidor).

const PADROES: { rotulo: string; re: RegExp }[] = [
  { rotulo: 'um token do GitHub', re: /\b(?:github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{30,})/ },
  { rotulo: 'uma chave de acesso de serviço (nuvem, API ou pagamento)', re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b|\bAIza[0-9A-Za-z_-]{35}\b|\bxox[baprs]-[A-Za-z0-9-]{10,}|\bsk-[A-Za-z0-9_-]{20,}|\b[sr]k_(?:live|test)_[A-Za-z0-9]{16,}/ },
  { rotulo: 'uma chave privada', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { rotulo: 'um token JWT', re: /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+/ },
  { rotulo: 'uma string de conexão de banco de dados', re: /jdbc:[a-z]+:|\b(?:mongodb(?:\+srv)?|postgres(?:ql)?|mysql|oracle|sqlserver|redis):\/\/[^\s:@/]+:[^\s@/]+@|\b(?:Password|Pwd)\s*=[^;\s]+;?/i },
  { rotulo: 'um acesso a banco no formato usuário/senha@base', re: /\b[\w$#.]+\/[^\s/@]{3,}@(?![\w.-]*\.(?:ovpn|rdp|txt|docx?|pdf|xlsx?|crt|pem|ppk|connect|ini|png|jpe?g)\b)[\w.-]+(?::\d+)?(?:\/[\w.-]+)?/ },
  { rotulo: 'a configuração de um banco de dados (TNS/SQL)', re: /\(\s*DESCRIPTION\s*=|\bSERVICE_NAME\s*=|\bIDENTIFIED\s+BY\b/i },
  { rotulo: 'uma senha escrita no texto', re: /\b(?:senha|password|passwd|pwd|pass)\b\s*[:=]\s*\S{3,}/i },
  { rotulo: 'um token ou segredo escrito no texto', re: /\b(?:token|secret|api[_ -]?key|chave)\s*[:=]\s*\S{12,}/i },
  { rotulo: 'uma sequência que parece uma chave ou token', re: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z0-9+/=]{32,}$/ },
];

// Devolve o que parece ser o dado sensível (nunca o valor), ou null.
export function achaDadoSensivel(texto: string): string | null {
  const t = texto.trim();
  if (!t) return null;
  return PADROES.find((p) => p.re.test(t))?.rotulo ?? null;
}

export const ORIENTACAO_SENSIVEL = 'Guarde senhas apenas no campo Senha da conexão e não registre acessos a banco de dados, tokens ou chaves neste cadastro.';
