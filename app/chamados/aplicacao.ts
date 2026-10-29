// Vínculo entre uma correção (PR) e os chamados que precisaram dela, e a fila de aplicação no cliente.
// Lógica pura (sem Firebase) para poder ser testada. A gravação fica em Vinculos.tsx e na página /fila.

export type StatusAplicacao = 'nao-solicitada' | 'aberto' | 'aplicando' | 'aplicado' | 'concluido' | 'cancelado';

export const ROTULO_STATUS: Record<StatusAplicacao, string> = {
  'nao-solicitada': 'Sem pedido de aplicação',
  aberto: 'Aberto (aguardando o dono do PR)',
  aplicando: 'Aplicando',
  aplicado: 'Aplicado (aguardando a regra)',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

export const ROTULO_STATUS_CURTO: Record<StatusAplicacao, string> = {
  'nao-solicitada': 'Sem pedido',
  aberto: 'Aberto',
  aplicando: 'Aplicando',
  aplicado: 'Aplicado',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

export const STATUS_FILA: StatusAplicacao[] = ['aberto', 'aplicando', 'aplicado', 'concluido', 'cancelado'];
export const STATUS_ABERTOS: StatusAplicacao[] = ['aberto', 'aplicando', 'aplicado'];

export interface HistoricoAplicacao {
  em: string; // ISO
  por: string;
  de: StatusAplicacao | '';
  para: StatusAplicacao;
  nota?: string;
}

export interface Vinculo {
  id: string;
  contextoId: string; // id do contexto (chamado do PR), ex.: 568098
  contextoNumero: string;
  contextoAssunto: string;
  prs: string[]; // repo#número
  donoLogins: string[]; // usuários no Git de quem fez o PR
  donoNomes: string[];
  chamadoNumero: string; // chamado que precisou da correção
  cliente: string;
  assunto: string;
  observacao: string;
  criadoPorUid: string;
  criadoPorNome: string;
  criadoPorEmail: string;
  criadoEm: string;
  atualizadoEm: string;
  aplicacao: StatusAplicacao;
  historico: HistoricoAplicacao[];
}

export interface Pessoa {
  uid: string;
  gitUser: string;
}

const norm = (s: string) => s.trim().replace(/^@/, '').toLowerCase();

// Sem dono cadastrado no PR, qualquer pessoa pode assumir a aplicação (a fila não trava).
export const ehDono = (v: Pick<Vinculo, 'donoLogins'>, p: Pessoa) =>
  v.donoLogins.length === 0 || (!!p.gitUser && v.donoLogins.map(norm).includes(norm(p.gitUser)));

export const ehSolicitante = (v: Pick<Vinculo, 'criadoPorUid'>, p: Pessoa) => !!p.uid && v.criadoPorUid === p.uid;

export interface AcaoAplicacao {
  para: StatusAplicacao;
  rotulo: string;
  tom: 'primario' | 'sucesso' | 'neutro' | 'perigo';
  pedeNota?: boolean;
}

// Ações que a pessoa pode fazer no pedido, conforme o papel (dono do PR ou quem pediu) e o status.
export function acoesPermitidas(v: Pick<Vinculo, 'aplicacao' | 'donoLogins' | 'criadoPorUid'>, p: Pessoa): AcaoAplicacao[] {
  const dono = ehDono(v, p);
  const solicitante = ehSolicitante(v, p);
  const a: AcaoAplicacao[] = [];
  switch (v.aplicacao) {
    case 'nao-solicitada':
      if (solicitante) a.push({ para: 'aberto', rotulo: 'Pedir aplicação no cliente', tom: 'primario' });
      break;
    case 'aberto':
      if (dono) {
        a.push({ para: 'aplicando', rotulo: 'Iniciar aplicação', tom: 'primario' });
        a.push({ para: 'aplicado', rotulo: 'Marcar como aplicado', tom: 'sucesso', pedeNota: true });
      }
      if (solicitante) a.push({ para: 'cancelado', rotulo: 'Cancelar pedido', tom: 'perigo' });
      break;
    case 'aplicando':
      if (dono) {
        a.push({ para: 'aplicado', rotulo: 'Marcar como aplicado', tom: 'sucesso', pedeNota: true });
        a.push({ para: 'aberto', rotulo: 'Devolver à fila', tom: 'neutro', pedeNota: true });
      }
      if (solicitante) a.push({ para: 'cancelado', rotulo: 'Cancelar pedido', tom: 'perigo' });
      break;
    case 'aplicado':
      if (solicitante) {
        a.push({ para: 'concluido', rotulo: 'Dar continuidade e concluir', tom: 'sucesso' });
        a.push({ para: 'aplicando', rotulo: 'Pedir nova aplicação', tom: 'neutro', pedeNota: true });
      } else if (dono) {
        a.push({ para: 'aplicando', rotulo: 'Reabrir aplicação', tom: 'neutro', pedeNota: true });
      }
      break;
    case 'concluido':
    case 'cancelado':
      if (solicitante) a.push({ para: 'aberto', rotulo: 'Reabrir pedido', tom: 'neutro', pedeNota: true });
      break;
  }
  return a;
}

// O que cada pessoa precisa olhar: dono (aberto/aplicando) e quem pediu (aplicado, para dar continuidade).
export function pendenciasPara(vinculos: Vinculo[], p: Pessoa) {
  const paraAplicar = vinculos.filter((v) => (v.aplicacao === 'aberto' || v.aplicacao === 'aplicando') && ehDono(v, p) && v.donoLogins.length > 0);
  const paraContinuar = vinculos.filter((v) => v.aplicacao === 'aplicado' && ehSolicitante(v, p));
  return { paraAplicar, paraContinuar, total: paraAplicar.length + paraContinuar.length };
}

export const nomeDoStatus = (s: string) => ROTULO_STATUS[s as StatusAplicacao] ?? s;

// Número do chamado digitado pelo usuário: aceita 568361 ou 568.361.
export function normalizaChamado(txt: string): string | null {
  const m = txt.trim().match(/^(\d{3})\.?(\d{3})$/);
  return m ? `${m[1]}.${m[2]}` : null;
}
