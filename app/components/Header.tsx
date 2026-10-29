'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../AuthContext';
import { fotoDoGit } from './fotoGit';

interface PerfilHeader {
  avatar?: string;
  gitUser?: string;
  ledColor: string;
  ledAnimation: string;
  displayName?: string;
}

// Avatar com iniciais, usado quando o perfil não tem foto cadastrada.
const avatarIniciais = (nome: string) => {
  const inicial = nome.charAt(0).toUpperCase() || '?';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" fill="#00518C"/><text x="50%" y="50%" font-size="64" dy=".35em" text-anchor="middle" fill="white" font-family="Arial" font-weight="bold">${inicial}</text></svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
};

// Cabeçalho no padrão do web_relatus: faixa branca de 60px, logo à esquerda e usuário à direita.
// O botão do usuário usa a foto configurada no perfil (sem LED piscando).
export default function Header() {
  const { user } = useAuth();
  const [perfil, setPerfil] = useState<PerfilHeader>({ ledColor: '#00518C', ledAnimation: 'none' });

  useEffect(() => {
    if (!user) return;
    let ativo = true;
    getDoc(doc(db, 'profiles', user.uid))
      .then((snap) => {
        if (!ativo || !snap.exists()) return;
        const d = snap.data();
        setPerfil({
          avatar: d?.avatar,
          gitUser: d?.gitUser,
          ledColor: d?.ledColor || '#00518C',
          ledAnimation: d?.ledAnimation || 'pulse',
          displayName: d?.displayName,
        });
      })
      .catch((e) => console.error('Erro ao carregar perfil:', e));
    return () => {
      ativo = false;
    };
  }, [user]);

  const nomeCompleto = perfil.displayName || user?.displayName || user?.email || '';
  const nome = nomeCompleto.split(/[ @]/)[0];
  // Quem tem o Git vinculado usa automaticamente a foto do GitHub; senão, a foto do perfil ou as iniciais.
  const foto = useMemo(
    () => (perfil.gitUser ? fotoDoGit(perfil.gitUser) : perfil.avatar || avatarIniciais(nomeCompleto || '?')),
    [perfil.gitUser, perfil.avatar, nomeCompleto],
  );

  return (
    <header className="fixed left-0 right-0 top-0 z-40 flex h-[60px] items-center justify-between border-b border-[#ebebf0] bg-white pl-14 pr-5 shadow-sm lg:pl-5">
      <Link href="/home" className="flex items-center" aria-label="Início">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Núcleo PTU" className="h-9 w-auto" />
      </Link>
      <div className="flex items-center gap-4">
        {nome && <span className="text-sm text-[#333333]">{nome}</span>}
        <Link href="/profile" title="Meu perfil" className="relative inline-flex shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={foto}
            alt={nomeCompleto || 'Perfil'}
            className="relative h-9 w-9 rounded-full border-2 border-white object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = avatarIniciais(nomeCompleto || '?');
            }}
          />
        </Link>
      </div>
    </header>
  );
}
