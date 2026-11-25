'use client';

import { useCallback, useEffect, useState } from 'react';

const evento = 'nucleoptu:menu-favoritos';
const chave = (uid: string) => `nucleoptu.menu-favoritos.${uid}`;

export type MenuFavorito = { href: string; label: string; color: string };

function ler(uid: string): MenuFavorito[] {
  try {
    const dados = JSON.parse(localStorage.getItem(chave(uid)) ?? '[]') as MenuFavorito[];
    return Array.isArray(dados) ? dados.filter((item) => item && typeof item.href === 'string') : [];
  } catch { return []; }
}

export function useMenuFavoritos(uid?: string) {
  const [favoritos, setFavoritos] = useState<MenuFavorito[]>([]);
  useEffect(() => {
    if (!uid) { setFavoritos([]); return; }
    const atualizar = () => setFavoritos(ler(uid));
    atualizar();
    window.addEventListener(evento, atualizar);
    window.addEventListener('storage', atualizar);
    return () => { window.removeEventListener(evento, atualizar); window.removeEventListener('storage', atualizar); };
  }, [uid]);

  const alternar = useCallback((item: MenuFavorito) => {
    if (!uid) return;
    const atual = ler(uid);
    const proximo = atual.some((favorito) => favorito.href === item.href)
      ? atual.filter((favorito) => favorito.href !== item.href)
      : [...atual, item];
    try { localStorage.setItem(chave(uid), JSON.stringify(proximo)); } catch { /* armazenamento indisponível */ }
    setFavoritos(proximo);
    window.dispatchEvent(new Event(evento));
  }, [uid]);

  return { favoritos, alternar };
}
