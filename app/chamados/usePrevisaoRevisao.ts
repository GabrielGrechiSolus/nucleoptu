'use client';

import { useEffect, useState } from 'react';
import { buscaPrevisaoGlobal } from './atualizaGit';

let cache: { em: number; valor: number | null } | null = null;

export function usePrevisaoRevisao(): number | null {
  const [valor, setValor] = useState<number | null>(null);
  useEffect(() => {
    let ativo = true;
    const fresco = cache !== null && Date.now() - cache.em < 600_000;
    const obter = fresco
      ? Promise.resolve(cache ? cache.valor : null)
      : buscaPrevisaoGlobal().then((v) => {
          cache = { em: Date.now(), valor: v };
          return v;
        });
    obter.then((v) => {
      if (ativo) setValor(v);
    });
    return () => {
      ativo = false;
    };
  }, []);
  return valor;
}
