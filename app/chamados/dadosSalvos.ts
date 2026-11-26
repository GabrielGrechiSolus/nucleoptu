const PREFIXO = 'nucleoptu.salvo.';

interface Item<T> { salvoEm: number; valor: T }

interface Opcoes<T> {
  nome: string;
  validade: (valor: T) => number;
  guarda?: (valor: T) => boolean;
  persiste?: boolean;
  maximo?: number;
}

export interface ConsultaGuardada<T> {
  obtem(chave: string, carrega: () => Promise<T>, atualizar?: boolean): Promise<T>;
  define(chave: string, valor: T): void;
  salvoEm(chave: string): number | undefined;
  invalida(): void;
}

const invalidadores = new Map<string, () => void>();

export function criaConsultaSalva<T>({ nome, validade, guarda, persiste, maximo = 30 }: Opcoes<T>): ConsultaGuardada<T> {
  const chaveLocal = PREFIXO + nome;
  const emAndamento = new Map<string, Promise<T>>();
  let memoria: Record<string, Item<T>> | null = null;
  let geracao = 0;

  const itens = (): Record<string, Item<T>> => {
    if (memoria) return memoria;
    try {
      memoria = persiste ? (JSON.parse(window.localStorage.getItem(chaveLocal) ?? '{}') as Record<string, Item<T>>) : {};
    } catch {
      memoria = {};
    }
    return memoria;
  };

  const define = (chave: string, valor: T) => {
    const todos = { ...itens(), [chave]: { salvoEm: Date.now(), valor } };
    memoria = Object.fromEntries(Object.entries(todos).sort(([, a], [, b]) => b.salvoEm - a.salvoEm).slice(0, maximo));
    if (!persiste) return;
    try {
      window.localStorage.setItem(chaveLocal, JSON.stringify(memoria));
    } catch {}
  };

  const invalida = () => {
    geracao++;
    memoria = {};
    emAndamento.clear();
    if (!persiste) return;
    try {
      window.localStorage.removeItem(chaveLocal);
    } catch {}
  };

  invalidadores.set(nome, invalida);

  return {
    define,
    invalida,
    salvoEm: (chave) => itens()[chave]?.salvoEm,
    obtem(chave, carrega, atualizar = false) {
      const item = itens()[chave];
      if (!atualizar && item && Date.now() - item.salvoEm < validade(item.valor)) return Promise.resolve(item.valor);
      const pendente = emAndamento.get(chave);
      if (!atualizar && pendente) return pendente;
      const minhaGeracao = geracao;
      const pedido: Promise<T> = carrega()
        .then((valor) => {
          if (minhaGeracao === geracao && (guarda?.(valor) ?? true)) define(chave, valor);
          return valor;
        })
        .finally(() => {
          if (emAndamento.get(chave) === pedido) emAndamento.delete(chave);
        });
      emAndamento.set(chave, pedido);
      return pedido;
    },
  };
}

export function limpaDadosSalvos(): void {
  invalidadores.forEach((invalida) => invalida());
  try {
    Object.keys(window.localStorage).filter((k) => k.startsWith(PREFIXO)).forEach((k) => window.localStorage.removeItem(k));
  } catch {}
}
