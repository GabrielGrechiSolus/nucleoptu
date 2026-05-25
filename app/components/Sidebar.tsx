'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { auth, db } from '../../firebase';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';

// Ícones do lucide-react
import {
  Home,
  Settings,
  LogOut,
  Bell,
  Users,
  FileText,
  Link as LinkIcon,
  HeadphonesIcon,
  User,
  Network,
  Calendar,
  Kanban,
  Ticket,
  BookOpen,
  PieChart,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Circle,
  CircleDot,
  Zap,
} from 'lucide-react';

const Sidebar = () => {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [profileAvatar, setProfileAvatar] = useState('/profile.jpg');
  const [ledColor, setLedColor] = useState('#00ff00');
  const [ledAnimation, setLedAnimation] = useState<'pulse' | 'glow' | 'wave' | 'none'>('pulse');
  const [unreadNoticesCount, setUnreadNoticesCount] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

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

  // Função para gerar cor aleatória com mais controle
  const getRandomColor = () => {
    const hue = Math.random() * 360;
    return `hsl(${hue}, 70%, 55%)`;
  };

  // Função para gerar avatar em SVG Base64 com gradiente
  const generateAvatar = (username: string) => {
    const initial = username.charAt(0).toUpperCase() || '?';
    const hue = Math.random() * 360;
    const gradientStart = `hsl(${hue}, 70%, 55%)`;
    const gradientEnd = `hsl(${hue + 40}, 70%, 45%)`;

    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${gradientStart}" />
            <stop offset="100%" stop-color="${gradientEnd}" />
          </linearGradient>
        </defs>
        <rect width="128" height="128" fill="url(#grad)" />
        <text x="50%" y="50%" font-size="64" dy=".35em" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif" font-weight="bold">${initial}</text>
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
          setLedAnimation(data?.ledAnimation || 'pulse');
          setProfileAvatar(data?.avatar || generateAvatar(user.displayName || user.email || ''));
        } else {
          setLedColor(getRandomColor());
          setProfileAvatar(generateAvatar(user.displayName || user.email || ''));
        }
      } catch (error) {
        console.error('Erro ao buscar perfil:', error);
        setLedColor(getRandomColor());
        setProfileAvatar(generateAvatar(user.displayName || user.email || ''));
      }
    };

    fetchProfile();
  }, [user]);

  // Fechar menu mobile ao mudar de rota
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Navegação
  const navItems = [
    { href: '/home', label: 'Início', icon: Home, color: 'text-sky-400', bgColor: 'bg-sky-500/10' },
    { href: '/tickets', label: 'Chamados', icon: Ticket, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
    { href: '/studies', label: 'Estudos', icon: BookOpen, color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
    { href: '/reports', label: 'Relatórios', icon: PieChart, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
    { href: '/notice-board', label: 'Mural', icon: Bell, color: 'text-amber-400', bgColor: 'bg-amber-500/10' },
    { href: '/meetings', label: 'Reuniões', icon: Calendar, color: 'text-indigo-400', bgColor: 'bg-indigo-500/10' },
    { href: '/links', label: 'Links Úteis', icon: LinkIcon, color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
    { href: '/client-connections', label: 'Conexões', icon: Network, color: 'text-pink-400', bgColor: 'bg-pink-500/10' },
    { href: '/socialfield', label: 'Rede Social', icon: HeadphonesIcon, color: 'text-orange-400', bgColor: 'bg-orange-500/10' }
  ];

  const adminItems = [
    { href: '/db-registry', label: 'DB Registry', icon: FileText, color: 'text-gray-400', bgColor: 'bg-gray-500/10' },
    { href: '/users', label: 'Usuários', icon: Users, color: 'text-gray-400', bgColor: 'bg-gray-500/10' },
    { href: '/profile', label: 'Perfil', icon: User, color: 'text-gray-400', bgColor: 'bg-gray-500/10' },
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

  // Componente de item de navegação com LED
  const NavItem = ({ item, isAdmin = false }: { item: any; isAdmin?: boolean }) => {
    const Icon = item.icon;
    const isActive = pathname === item.href;
    const isHovered = hoveredItem === item.href;

    return (
      <Link
        href={item.href}
        className={`
          group relative flex items-center gap-3 px-3 py-2.5 rounded-lg
          transition-all duration-300 ease-out
          ${isCollapsed ? 'justify-center' : 'justify-start'}
          ${isActive
            ? `${item.bgColor} ${item.color} shadow-lg`
            : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
          }
        `}
        title={isCollapsed ? item.label : undefined}
        onMouseEnter={() => setHoveredItem(item.href)}
        onMouseLeave={() => setHoveredItem(null)}
      >
        {/* LED Indicator */}
        {isActive && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-current" />
        )}

        <div className="relative">
          <Icon
            size={20}
            className={`
              shrink-0 transition-all duration-300
              ${!isCollapsed && isActive ? 'scale-110' : ''}
              ${isHovered ? 'scale-110 rotate-3' : ''}
            `}
          />

          {/* LED Glow Effect */}
          {isActive && (
            <span
              className="absolute inset-0 rounded-full blur-md opacity-50 animate-pulse"
              style={{ backgroundColor: 'currentColor' }}
            />
          )}
        </div>

        {!isCollapsed && (
          <span className="font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis">
            {item.label}
          </span>
        )}

        {!isCollapsed && item.href === '/notice-board' && unreadNoticesCount > 0 && (
          <span className="ml-auto bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center shadow-lg animate-pulse">
            {unreadNoticesCount}
          </span>
        )}

        {isCollapsed && item.href === '/notice-board' && unreadNoticesCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg animate-pulse">
            {unreadNoticesCount}
          </span>
        )}
      </Link>
    );
  };

  // Animações CSS
  const getLedAnimationStyle = () => {
    switch (ledAnimation) {
      case 'glow':
        return `
          @keyframes ledGlow {
            0%, 100% { box-shadow: 0 0 2px 0 ${ledColor}, 0 0 4px 0 ${ledColor}; }
            50% { box-shadow: 0 0 8px 2px ${ledColor}, 0 0 12px 4px ${ledColor}; }
          }
          animation: ledGlow 1.5s ease-in-out infinite;
        `;
      case 'wave':
        return `
          @keyframes ledWave {
            0%, 100% { transform: scale(1); opacity: 0.8; }
            25% { transform: scale(1.1); opacity: 1; }
            75% { transform: scale(0.95); opacity: 0.6; }
          }
          animation: ledWave 2s ease-in-out infinite;
        `;
      case 'pulse':
      default:
        return `
          @keyframes ledPulse {
            0%, 100% { box-shadow: 0 0 0 0 ${ledColor}40; }
            50% { box-shadow: 0 0 0 4px ${ledColor}80; }
          }
          animation: ledPulse 2s infinite;
        `;
    }
  };

  return (
    <>
      <style jsx>{`
        ${getLedAnimationStyle()}
        
        @keyframes slideIn {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        @keyframes gradientShift {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }
        
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }
        
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .led-container {
          position: relative;
          display: inline-flex;
        }
        
        .led-container::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 50%;
          background: ${ledColor};
          opacity: 0.3;
          filter: blur(4px);
          animation: ledPulse 2s infinite;
        }
        
        .sidebar-gradient {
          background: linear-gradient(135deg, rgb(24 24 27) 0%, rgb(9 9 11) 100%);
        }
      `}</style>

      {/* Botão do menu mobile */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="sm:hidden fixed top-4 left-4 z-50 p-2.5 bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-xl border border-zinc-800 shadow-lg hover:shadow-xl transition-all duration-200 backdrop-blur-sm"
      >
        {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay mobile */}
      {isMobileMenuOpen && (
        <div
          className="sm:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Desktop */}
      <aside
        className={`
          hidden sm:flex flex-col sidebar-gradient
          border-r border-zinc-800/50 shadow-2xl transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-20' : 'w-72'}
          h-screen sticky top-0 shrink-0 overflow-y-auto scrollbar-hide
          relative
        `}
      >
        {/* Botão de minimizar */}
        <div className="absolute -right-3 top-6 z-10">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-full border border-zinc-700 hover:border-sky-500/50 transition-all duration-200 shadow-lg hover:scale-110 group"
            aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {isCollapsed ? (
              <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            ) : (
              <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            )}
          </button>
        </div>

        {/* Header com perfil */}
        <div className="p-4 border-b border-zinc-800/50">
          <Link
            href="/profile"
            className={`
              flex items-center gap-3 p-2 rounded-xl hover:bg-zinc-800/30 transition-all duration-200 group
              ${isCollapsed ? 'justify-center' : ''}
            `}
            title={isCollapsed ? user?.displayName || 'Perfil' : undefined}
          >
            <div className="relative shrink-0">
              <div
                className="led-container w-10 h-10 rounded-full p-0.5"
                style={{
                  animation: ledAnimation === 'none' ? 'none' : undefined
                }}
              >
                <img
                  src={profileAvatar}
                  alt="Foto do perfil"
                  className="w-full h-full rounded-full object-cover ring-2 ring-white/10 group-hover:ring-sky-500/50 transition-all duration-300"
                />
              </div>

              {/* Status LED */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 ring-2 ring-zinc-900 animate-pulse" />
            </div>

            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-zinc-50 truncate text-sm group-hover:text-sky-400 transition-colors">
                  {user?.displayName || user?.email?.split('@')[0]}
                </p>
                <p className="text-xs text-zinc-400 truncate">
                  {user?.email}
                </p>
              </div>
            )}
          </Link>
        </div>

        {/* Navegação principal */}
        <div className="flex-1 px-3 py-4">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavItem key={item.href} item={item} />
            ))}
          </nav>

          {/* Divisor com LED decorativo */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800/50" />
            </div>
            {!isCollapsed && (
              <div className="relative flex justify-center">
                <span className="px-2 bg-zinc-950 text-[10px] text-zinc-500">ADMIN</span>
              </div>
            )}
          </div>

          <nav className="flex flex-col gap-1">
            {adminItems.map((item) => (
              <NavItem key={item.href} item={item} />
            ))}
          </nav>
        </div>

        {/* Logout */}
        <div className="p-3 border-t border-zinc-800/50">
          <button
            onClick={handleLogout}
            className={`
              w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
              text-red-400 hover:bg-red-500/20 hover:text-red-300
              transition-all duration-200 group
              ${isCollapsed ? 'justify-center' : 'justify-start'}
            `}
            title={isCollapsed ? 'Sair' : undefined}
          >
            <LogOut size={20} className="shrink-0 group-hover:scale-110 transition-transform group-hover:rotate-12" />
            {!isCollapsed && (
              <span className="font-medium text-sm">Sair</span>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-800/50 flex justify-around items-center px-2 py-2 z-30">
        {navItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                flex flex-col items-center p-2 rounded-xl transition-all duration-200
                ${isActive
                  ? `${item.color} scale-105`
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                }
              `}
            >
              <div className="relative">
                <Icon size={20} />
                {item.href === '/notice-board' && unreadNoticesCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center animate-pulse">
                    {unreadNoticesCount > 9 ? '9+' : unreadNoticesCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}

        <button
          onClick={handleLogout}
          className="flex flex-col items-center p-2 rounded-xl text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut size={20} />
          <span className="text-[10px] mt-1 font-medium">Sair</span>
        </button>
      </nav>

      {/* Mobile Menu Drawer */}
      <div
        className={`
          sm:hidden fixed top-0 left-0 bottom-0 w-72 bg-gradient-to-b from-zinc-900 to-zinc-950 
          z-50 transform transition-transform duration-300 ease-out shadow-2xl
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-4 border-b border-zinc-800/50 bg-gradient-to-r from-sky-500/5 to-transparent">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold bg-gradient-to-r from-sky-400 to-sky-600 bg-clip-text text-transparent">
              Menu
            </h2>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Perfil Mobile */}
          <Link
            href="/profile"
            className="flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800/50 transition-all duration-200"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <div className="relative">
              <div
                className="w-12 h-12 rounded-full p-0.5"
                style={{
                  animation: ledAnimation === 'none' ? 'none' : undefined
                }}
              >
                <img
                  src={profileAvatar}
                  alt="Foto do perfil"
                  className="w-full h-full rounded-full object-cover ring-2 ring-white/10"
                />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 ring-2 ring-zinc-900" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-zinc-50">{user?.displayName || user?.email?.split('@')[0]}</p>
              <p className="text-xs text-zinc-400 truncate">{user?.email}</p>
            </div>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <nav className="flex flex-col gap-1">
            {[...navItems, ...adminItems].map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                    ${isActive
                      ? `${item.bgColor} ${item.color}`
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-100'
                    }
                  `}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon size={20} />
                  <span className="font-medium text-sm">{item.label}</span>
                  {item.href === '/notice-board' && unreadNoticesCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                      {unreadNoticesCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </>
  );
};

export default Sidebar;