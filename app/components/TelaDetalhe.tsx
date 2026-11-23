'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

// Parâmetros da URL como estado da tela: o detalhe aberto vira link compartilhável e o Voltar do navegador funciona.
export function useParametrosUrl() {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const hrefCom = useCallback(
    (mudancas: Record<string, string | null>) => {
      const p = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(mudancas)) {
        if (v === null) p.delete(k);
        else p.set(k, v);
      }
      const q = p.toString();
      return q ? `${pathname}?${q}` : pathname;
    },
    [params, pathname],
  );

  const vaiPara = useCallback(
    (mudancas: Record<string, string | null>, substituir = false) => {
      const href = hrefCom(mudancas);
      if (substituir) router.replace(href);
      else router.push(href);
    },
    [hrefCom, router],
  );

  const voltar = useCallback(
    (limpar: string[]) => {
      if (window.history.length > 1) router.back();
      else router.replace(hrefCom(Object.fromEntries(limpar.map((k) => [k, null]))));
    },
    [hrefCom, router],
  );

  const le = useCallback((k: string) => params.get(k) ?? '', [params]);

  return { hrefCom, vaiPara, voltar, le };
}

export function useDetalheNaUrl(param: string) {
  const { hrefCom, vaiPara, voltar, le } = useParametrosUrl();
  return {
    valor: le(param),
    hrefDe: (v: string) => hrefCom({ [param]: v }),
    abrir: (v: string) => vaiPara({ [param]: v }),
    voltar: () => voltar([param]),
  };
}

// Para telas sem endereço próprio (ex.: prévia de importação): o Voltar do navegador fecha a tela em vez de sair da página.
export function useDetalheNoHistorico(aberto: boolean, fechar: () => void) {
  const fecharRef = useRef(fechar);
  useEffect(() => {
    fecharRef.current = fechar;
  });

  useEffect(() => {
    if (!aberto) return;
    window.history.pushState({ detalhe: true }, '', window.location.href);
    const aoVoltar = () => fecharRef.current();
    window.addEventListener('popstate', aoVoltar);
    return () => window.removeEventListener('popstate', aoVoltar);
  }, [aberto]);

  return useCallback(() => {
    if (window.history.state?.detalhe) window.history.back();
    else fecharRef.current();
  }, []);
}

export default function TelaDetalhe({
  onVoltar,
  rotuloVoltar = 'Voltar',
  cabecalho,
  abas,
  rodape,
  children,
}: {
  onVoltar: () => void;
  rotuloVoltar?: string;
  cabecalho: React.ReactNode;
  abas?: React.ReactNode;
  rodape?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rel-page rel-tela mx-auto w-full max-w-7xl">
      <div className="rel-tela-topo">
        <button type="button" onClick={onVoltar} className="rel-btn rel-btn-ghost"><ArrowLeft className="h-4 w-4" /> {rotuloVoltar}</button>
      </div>
      <header className="rel-box rel-tela-cab">{cabecalho}</header>
      {abas && <nav className="rel-tabs rel-tela-abas">{abas}</nav>}
      <div className="rel-tela-corpo">{children}</div>
      {rodape && <footer className="rel-tela-rodape">{rodape}</footer>}
    </div>
  );
}
