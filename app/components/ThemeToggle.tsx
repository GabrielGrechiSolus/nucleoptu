'use client';

import React, { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

const CHAVE = 'nucleoptu.tema';
const EVENTO = 'nucleoptu-tema';

const assina = (aviso: () => void) => {
  window.addEventListener(EVENTO, aviso);
  return () => window.removeEventListener(EVENTO, aviso);
};
const lerEscuro = () => document.documentElement.classList.contains('dark');

export default function ThemeToggle() {
  const escuro = useSyncExternalStore(assina, lerEscuro, () => false);

  const alternar = () => {
    document.documentElement.classList.toggle('dark', !escuro);
    try {
      localStorage.setItem(CHAVE, escuro ? 'light' : 'dark');
    } catch {
      document.documentElement.dataset.temaSemPersistencia = 'true';
    }
    window.dispatchEvent(new Event(EVENTO));
  };

  return (
    <button
      type="button"
      onClick={alternar}
      title={escuro ? 'Mudar para o modo claro' : 'Mudar para o modo escuro'}
      aria-label={escuro ? 'Mudar para o modo claro' : 'Mudar para o modo escuro'}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#454343] hover:bg-[#00518C]/10 hover:text-[#00518C]"
    >
      {escuro ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
