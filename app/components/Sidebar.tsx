'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { auth, db } from '../../firebase';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';

// Ícones
import { HomeIcon } from '../home/HomeIcon';
import { ChartIcon } from '../home/ChartIcon';
import { SettingsIcon } from '../home/SettingsIcon';
import { LogoutIcon } from '../home/LogoutIcon';
import { NoticeBoardIcon } from '../home/NoticeBoardIcon';
import { UsersIcon } from '../home/UsersIcon';
import { ReportIcon } from '../home/ReportIcon';
import { LinkIcon } from '../home/LinkIcon';
import { SupportIcon } from '../home/SupportIcon';
import { ProfileIcon } from '../home/ProfileIcon';
import { ConnectionIcon } from '../home/ConnectionIcon';

const Sidebar = () => {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [profileAvatar, setProfileAvatar] = useState('/profile.jpg');
  const [ledColor, setLedColor] = useState('#00ff00');
  const [unreadNoticesCount, setUnreadNoticesCount] = useState(0);

  // Busca de avisos não lidos
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'notices'), where('active', '==', true));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      let unreadCount = 0;
      querySnapshot.forEach((doc) => {
        const notice = doc.data();
        if (!notice.readBy || !notice.readBy.includes(user.email)) {
          unreadCount++;
        }
      });
      setUnreadNoticesCount(unreadCount);
    });

    return () => unsubscribe();
  }, [user]);

  // Função para gerar cor aleatória
  const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  // Função para gerar avatar em SVG Base64
  const generateAvatar = (username: string) => {
    const initial = username.charAt(0).toUpperCase() || '?';
    const bgColor = getRandomColor();
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
        <rect width="128" height="128" fill="${bgColor}" />
        <text x="50%" y="50%" font-size="64" dy=".35em" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif">${initial}</text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  // Busca perfil do Firestore
  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        const docRef = doc(db, 'profiles', user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setLedColor(data?.ledColor || getRandomColor());
          setProfileAvatar(data?.avatar || generateAvatar(user.displayName || ''));
        } else {
          setLedColor(getRandomColor());
          setProfileAvatar(generateAvatar(user.displayName || ''));
        }
      } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        setLedColor(getRandomColor());
        setProfileAvatar(generateAvatar(user.displayName || ''));
      }
    };

    fetchProfile();
  }, [user]);

  // Navegação
  const navItems = [
    { href: '/home', label: 'Início', icon: <HomeIcon /> },
    { href: '/notice-board', label: 'Mural de Avisos', icon: <NoticeBoardIcon /> },
    // { href: '/reports', label: 'Relatórios', icon: <ReportIcon /> },
    { href: '/links', label: 'Links Úteis', icon: <LinkIcon /> },
    { href: '/client-connections', label: 'Conexões de Clientes', icon: <ConnectionIcon /> },
    { href: '/socialfield', label: 'Rede social', icon: <SupportIcon /> },
  ];

  const adminItems = [
    // { href: '/dashboard', label: 'Dashboard', icon: <ChartIcon /> },
    { href: '/users', label: 'Usuários', icon: <UsersIcon /> },
    { href: '/profile', label: 'Perfil', icon: <ProfileIcon /> },
    // { href: '/home/settings', label: 'Configurações', icon: <SettingsIcon /> },
  ];

  // Função de logout
  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <>
      <style jsx>{`
        @keyframes pulseLED {
          0% {
            box-shadow: 0 0 5px ${ledColor}, 0 0 10px ${ledColor}33;
          }
          50% {
            box-shadow: 0 0 10px ${ledColor}, 0 0 20px ${ledColor}66;
          }
          100% {
            box-shadow: 0 0 5px ${ledColor}, 0 0 10px ${ledColor}33;
          }
        }
      `}</style>

      {/* Sidebar Desktop */}
      <aside className="hidden sm:flex flex-col w-64 min-w-64 max-w-64 bg-zinc-900 border-r border-zinc-800 p-4 overflow-hidden">

        {/* Perfil */}
        <Link
          href="/profile"
          className="block p-2 rounded-lg hover:bg-zinc-800 transition-colors mb-8 overflow-hidden"
        >
          <div className="flex items-center gap-3 whitespace-nowrap overflow-hidden">
            <div
              className="w-10 h-10 rounded-full p-1 animate-pulseLED shrink-0"
              style={{
                backgroundColor: '#0000',
                animation: 'pulseLED 2s infinite',
                borderRadius: '9999px',
              }}
            >
              <img
                src={profileAvatar}
                alt="Foto do perfil"
                className="w-full h-full rounded-full object-cover"
              />
            </div>

            <div className="overflow-hidden">
              <p className="font-semibold text-zinc-50 whitespace-nowrap overflow-hidden text-ellipsis">
                {user?.displayName}
              </p>
              <p className="text-xs text-zinc-400 whitespace-nowrap overflow-hidden text-ellipsis">
                {user?.email}
              </p>
            </div>
          </div>
        </Link>

        {/* Navegação principal */}
        <nav className="flex flex-col gap-2 mb-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg whitespace-nowrap overflow-hidden transition-colors ${
                pathname === item.href
                  ? 'bg-sky-500/20 text-sky-400'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50'
              }`}
            >
              <span className="w-6 h-6 shrink-0">{item.icon}</span>
              <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                {item.label}
              </span>
              {item.href === '/notice-board' && unreadNoticesCount > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {unreadNoticesCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Administração */}
        <p className="text-xs text-zinc-500 uppercase mt-4 mb-2 px-2 tracking-wide">
          Administração
        </p>

        <nav className="flex flex-col gap-2 mb-4">
          {adminItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg whitespace-nowrap overflow-hidden transition-colors ${
                pathname === item.href
                  ? 'bg-sky-500/20 text-sky-400'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50'
              }`}
            >
              <span className="w-6 h-6 shrink-0">{item.icon}</span>
              <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                {item.label}
              </span>
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="mt-auto w-full flex items-center gap-3 px-4 py-2 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors whitespace-nowrap overflow-hidden"
        >
          <span className="w-6 h-6 shrink-0"><LogoutIcon /></span>
          <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">
            Sair
          </span>
        </button>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 flex justify-around p-2">
        {navItems.slice(0, 3).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center p-2 rounded-md transition-colors ${
              pathname === item.href ? 'text-sky-400' : 'text-zinc-400'
            }`}
          >
            <span className="w-7 h-7 shrink-0">{item.icon}</span>
            <span className="text-xs whitespace-nowrap">{item.label}</span>
          </Link>
        ))}

        <button
          onClick={handleLogout}
          className="flex flex-col items-center p-2 rounded-md text-zinc-400"
        >
          <span className="w-7 h-7 shrink-0"><LogoutIcon /></span>
          <span className="text-xs whitespace-nowrap">Sair</span>
        </button>
      </nav>
    </>
  );
};

export default Sidebar;
