'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../AuthContext';
import Header from './Header';
import { auth, db } from '../../firebase';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, onSnapshot } from 'firebase/firestore';

import {
  Home,
  Settings,
  LogOut,
  Bell,
  Users,
  Link as LinkIcon,
  HelpCircle,
  User,
  Network,
  Kanban,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Search,
  ArrowUpRight,
  FolderSearch,
  ListChecks,
} from 'lucide-react';
import { usePessoa } from './usePessoa';
import { useAdmin } from '../admin/useAdmin';
import { pendenciasPara, type Vinculo } from '../chamados/aplicacao';

// ===== Tipos =====
interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  color: string;
  gradient: string;
  badge?: number;
}

// ===== Constantes =====
const NAV_ITEMS: NavItem[] = [
  {
    href: '/home',
    label: 'Início',
    icon: Home,
    color: 'text-sky-400',
    gradient: 'from-sky-500/20 to-sky-600/10',
  },
  {
    href: '/notice-board',
    label: 'Mural',
    icon: Bell,
    color: 'text-rose-400',
    gradient: 'from-rose-500/20 to-rose-600/10',
  },
  {
    href: '/chamados',
    label: 'Contexto de chamados',
    icon: FolderSearch,
    color: 'text-teal-400',
    gradient: 'from-teal-500/20 to-teal-600/10',
  },
  {
    href: '/fila',
    label: 'Fila de aplicação',
    icon: ListChecks,
    color: 'text-sky-400',
    gradient: 'from-sky-500/20 to-sky-600/10',
  },
  {
    href: '/links',
    label: 'Links Úteis',
    icon: LinkIcon,
    color: 'text-cyan-400',
    gradient: 'from-cyan-500/20 to-cyan-600/10',
  },
  {
    href: '/client-connections',
    label: 'Conexões',
    icon: Network,
    color: 'text-pink-400',
    gradient: 'from-pink-500/20 to-pink-600/10',
  },
];

const ADMIN_ITEMS: NavItem[] = [
  {
    href: '/users',
    label: 'Usuários',
    icon: Users,
    color: 'text-gray-300',
    gradient: 'from-gray-500/10 to-gray-600/5',
  },
  {
    href: '/profile',
    label: 'Perfil',
    icon: User,
    color: 'text-gray-300',
    gradient: 'from-gray-500/10 to-gray-600/5',
  },
];

// ===== Componentes Auxiliares =====

// Item de navegação individual
const NavigationItem: React.FC<{
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
  badge?: number;
  onClick?: () => void;
}> = ({ item, isActive, isCollapsed, badge, onClick }) => {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`
        group relative flex items-center gap-3 px-3 py-2.5 rounded-md
        transition-all duration-300 ease-out cursor-pointer
        ${isCollapsed ? 'justify-center' : 'justify-start'}
        ${
          isActive
            ? 'bg-[#00518C]/10 text-[#00518C] font-semibold'
            : 'text-[#454343] hover:text-[#00518C] hover:bg-[#00518C]/5'
        }
      `}
      title={isCollapsed ? item.label : undefined}
    >
      {/* Active Indicator */}
      {isActive && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-[#00518C]" />
      )}

      {/* Icon Container */}
      <div className="relative">
        <Icon
          size={20}
          className={`
            shrink-0 transition-all duration-300
            
            ${isActive ? 'scale-110' : ''}
          `}
        />

      </div>

      {/* Label */}
      {!isCollapsed && (
        <span className="font-medium text-sm truncate flex-1">{item.label}</span>
      )}

      {/* Badge */}
      {badge && badge > 0 ? (
        <span
          className={`
          flex items-center justify-center bg-gradient-to-r from-red-500 to-red-600
          text-white text-[10px] font-bold rounded-full shadow-lg shadow-red-500/25
          ${isCollapsed ? 'absolute -top-1 -right-1 w-5 h-5' : 'min-w-[20px] h-5 px-1.5'}
        `}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}

      {/* Hover Tooltip (collapsed) */}
      {isCollapsed && (
        <div className="absolute left-full ml-3 px-3 py-1.5 bg-zinc-800 text-zinc-100 text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 shadow-xl border border-zinc-700/50">
          {item.label}
          <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-zinc-800 rotate-45 border-l border-b border-zinc-700/50" />
        </div>
      )}
    </Link>
  );
};

// Tecla de atalho visual
const ShortcutKey: React.FC<{ keys: string[] }> = ({ keys }) => (
  <div className="flex items-center gap-1">
    {keys.map((key, index) => (
      <kbd
        key={index}
        className="px-1.5 py-0.5 text-[10px] font-mono bg-zinc-800 text-zinc-400 rounded border border-zinc-700"
      >
        {key}
      </kbd>
    ))}
  </div>
);

// ===== Componente Principal =====
const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // ===== Estados =====
  const [unreadNotices, setUnreadNotices] = useState(0);
  const [pendFila, setPendFila] = useState(0); // pedidos da fila de aplicação que dependem de você
  const pessoa = usePessoa();
  const eu = useAdmin();
  // Administração de usuários aparece só para administradores.
  const adminItens: NavItem[] = eu.admin ? [{ href: '/admin/usuarios', label: 'Administração', icon: ListChecks, color: 'text-sky-400', gradient: 'from-sky-500/20 to-sky-600/10' }, ...ADMIN_ITEMS] : ADMIN_ITEMS;
  const contadorDe = (href: string) => (href === '/notice-board' ? unreadNotices : href === '/fila' ? pendFila : 0);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // ===== Efeitos =====

  // Pedidos de aplicação: para o dono do PR (aberto/aplicando) e para quem pediu (aplicado)
  useEffect(() => {
    if (!pessoa.uid) return;
    const q = query(collection(db, 'vinculos'), where('aplicacao', 'in', ['aberto', 'aplicando', 'aplicado']));
    return onSnapshot(
      q,
      (snap) => {
        const itens = snap.docs.map((d) => ({ ...(d.data() as Vinculo), id: d.id }));
        setPendFila(pendenciasPara(itens, { uid: pessoa.uid, gitUser: pessoa.gitUser }).total);
      },
      () => setPendFila(0),
    );
  }, [pessoa.uid, pessoa.gitUser]);

  // Buscar avisos não lidos
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'notices'), where('active', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const count = snapshot.docs.filter(
        (doc) => !doc.data().readBy?.includes(user.email)
      ).length;
      setUnreadNotices(count);
    });

    return () => unsubscribe();
  }, [user]);

  // Fechar menu mobile ao navegar
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setIsCollapsed((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('sidebar-search')?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ===== Handlers =====
  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  // Filtrar itens de navegação baseado na busca
  const filteredNavItems = NAV_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAdminItems = adminItens.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ===== Renderização =====
  const sidebarContent = (
    <>
      {/* Busca no menu */}
      <div className="p-4 border-b border-zinc-800/50">
        {/* Barra de Pesquisa */}
        {!isCollapsed && (
          <div className="mt-3 relative">
            <div
              className={`
                flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900/80 border transition-all duration-300
                ${isSearchFocused ? 'border-sky-500/50 shadow-lg shadow-sky-500/10' : 'border-zinc-800'}
              `}
            >
              <Search size={14} className="text-zinc-500 shrink-0" />
              <input
                id="sidebar-search"
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                onBlur={() => setIsSearchFocused(false)}
                className="bg-transparent text-sm text-zinc-300 placeholder-zinc-600 outline-none flex-1 min-w-0"
              />
              <ShortcutKey keys={['⌘', 'K']} />
            </div>
          </div>
        )}
      </div>

      {/* Navegação Principal */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent px-3 py-4">
        {/* Seção Principal */}
        <div className="mb-2">
          {!isCollapsed && (
            <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              Principal
            </p>
          )}
          <nav className="flex flex-col gap-0.5">
            {(searchQuery ? filteredNavItems : NAV_ITEMS).map((item) => (
              <NavigationItem
                key={item.href}
                item={item}
                isActive={pathname === item.href}
                isCollapsed={isCollapsed}
                badge={contadorDe(item.href) || undefined}
              />
            ))}
          </nav>
        </div>

        {/* Seção Administração */}
        <div className="mt-6 mb-2">
          <div className="relative mb-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800/50" />
            </div>
            {!isCollapsed && (
              <div className="relative flex justify-center">
                <span className="px-3 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600 bg-zinc-950 rounded-full border border-zinc-800/50">
                  Administração
                </span>
              </div>
            )}
          </div>
          <nav className="flex flex-col gap-0.5">
            {(searchQuery ? filteredAdminItems : adminItens).map((item) => (
              <NavigationItem
                key={item.href}
                item={item}
                isActive={pathname === item.href}
                isCollapsed={isCollapsed}
              />
            ))}
          </nav>
        </div>
      </div>

      {/* Footer - Configurações e Logout */}
      <div className="p-3 border-t border-zinc-800/50 space-y-2">
        {/* Logout */}
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200 group ${
            isCollapsed ? 'justify-center' : 'justify-start'
          }`}
          title={isCollapsed ? 'Sair' : undefined}
        >
          <LogOut size={18} className="group-hover:translate-x-1 transition-transform" />
          {!isCollapsed && <span className="text-sm font-medium">Sair</span>}
        </button>

        {/* Shortcut Hint */}
        {!isCollapsed && (
          <div className="pt-1">
            <div className="flex items-center justify-between px-3 text-[10px] text-zinc-600">
              <span>Recolher menu</span>
              <ShortcutKey keys={['⌘', 'B']} />
            </div>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      <Header />
      {/* ===== CSS Animações ===== */}
      <style jsx global>{`
        @keyframes ledPulse {
          0%, 100% {
            opacity: 0.5;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
          }
        }

        @keyframes ledGlow {
          0%, 100% {
            box-shadow: 0 0 5px currentColor, 0 0 10px currentColor;
          }
          50% {
            box-shadow: 0 0 20px currentColor, 0 0 40px currentColor;
          }
        }

        @keyframes ledWave {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          25% {
            transform: scale(1.15);
            opacity: 1;
          }
          75% {
            transform: scale(0.9);
            opacity: 0.4;
          }
        }

        .animate-led-pulse {
          animation: ledPulse 2s ease-in-out infinite;
        }

        .animate-led-glow {
          animation: ledGlow 1.5s ease-in-out infinite;
        }

        .animate-led-wave {
          animation: ledWave 2s ease-in-out infinite;
        }

        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
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

        .animate-slide-in {
          animation: slideInLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .animate-fade-in {
          animation: fadeIn 0.2s ease-out;
        }

        /* Scrollbar personalizada */
        .scrollbar-thin::-webkit-scrollbar {
          width: 4px;
        }

        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: rgb(39 39 42);
          border-radius: 2px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: rgb(63 63 70);
        }
      `}</style>

      {/* ===== Mobile Toggle Button ===== */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-2 left-3 z-50 p-2.5 bg-zinc-900/90 backdrop-blur-xl rounded-xl border border-zinc-800/50 shadow-2xl hover:scale-105 transition-all duration-200"
        aria-label="Menu"
      >
        {isMobileOpen ? <X size={20} className="text-zinc-300" /> : <Menu size={20} className="text-zinc-300" />}
      </button>

      {/* ===== Mobile Overlay ===== */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 animate-fade-in"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ===== Desktop Sidebar ===== */}
      <aside
        style={{ borderTop: '6px solid', borderImage: 'linear-gradient(90deg, #0053BC 0%, #00234F 100%) 1' }}
        className={`
          hidden lg:flex flex-col h-full sticky top-0 shrink-0
          bg-white border-r border-[#ebebf0] shadow-md
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-[72px]' : 'w-72'}
          relative z-30
        `}
      >
        {/* Collapse Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 z-20 p-1.5 bg-zinc-800/90 backdrop-blur-sm rounded-full border border-zinc-700/50 hover:border-sky-500/50 transition-all duration-200 shadow-lg hover:scale-110 group"
          aria-label={isCollapsed ? 'Expandir' : 'Recolher'}
        >
          {isCollapsed ? (
            <ChevronRight size={14} className="text-zinc-400 group-hover:text-sky-400 transition-colors" />
          ) : (
            <ChevronLeft size={14} className="text-zinc-400 group-hover:text-sky-400 transition-colors" />
          )}
        </button>

        {sidebarContent}
      </aside>

      {/* ===== Mobile Drawer ===== */}
      <div
        className={`
          lg:hidden fixed inset-y-0 left-0 w-72 z-50
          bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-900
          border-r border-zinc-800/50 shadow-2xl
          transform transition-transform duration-300 ease-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          flex flex-col
        `}
      >
        {sidebarContent}
      </div>

      {/* ===== Mobile Bottom Navigation ===== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-zinc-900/95 backdrop-blur-xl border-t border-zinc-800/50 z-30 safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {NAV_ITEMS.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-200 min-w-[60px] ${
                  isActive ? `${item.color} scale-105` : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <div className="relative">
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  {contadorDe(item.href) > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center shadow-lg shadow-red-500/25">
                      {contadorDe(item.href) > 9 ? '9+' : contadorDe(item.href)}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium leading-none">{item.label}</span>
                {isActive && <div className="w-1 h-1 rounded-full bg-current mt-0.5" />}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default Sidebar;