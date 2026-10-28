'use client';

import React from 'react';
import Link from 'next/link';
import { User } from 'lucide-react';
import { useAuth } from '../AuthContext';

// Cabeçalho no padrão do web_relatus: faixa branca de 60px, logo à esquerda, usuário à direita.
export default function Header() {
  const { user } = useAuth();
  const nome = (user?.displayName || user?.email || '').split(/[ @]/)[0];

  return (
    <header className="fixed left-0 right-0 top-0 z-40 flex h-[60px] items-center justify-between border-b border-[#ebebf0] bg-white pl-14 pr-5 shadow-sm lg:pl-5">
      <Link href="/home" className="flex items-center" aria-label="Início">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Núcleo PTU" className="h-9 w-auto" />
      </Link>
      <div className="flex items-center gap-4">
        {nome && <span className="text-sm text-[#333333]">{nome}</span>}
        <Link
          href="/profile"
          title="Meu perfil"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00518C] text-white transition-colors hover:bg-[#003D67]"
        >
          <User size={18} />
        </Link>
      </div>
    </header>
  );
}
