'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Plus, Search, X, HandHelping, Users, Clock,
  CheckCircle2, CircleDot, AlertCircle, ChevronDown,
  SlidersHorizontal, RefreshCw, TrendingUp,
} from 'lucide-react';
import { useAuth } from '../AuthContext';
import { db } from '../../firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  orderBy,
} from 'firebase/firestore';
import HelpFriendModal from './components/HelpFriendModal';
import HelpDetailModal from './components/HelpDetailModal';
import HelpFriendCard from './components/HelpFriendCard';
import { HelpFriend, HelpStatus } from './types';
import { Ticket } from '../tickets/components/TicketModal';

// ==================== TIPOS ====================

type ViewMode = 'all' | 'mine' | 'assignedToMe' | 'helpOthers';

interface FilterOptions {
  status: 'all' | 'open' | 'in-progress' | 'resolved' | 'closed';
  mode: 'all' | 'friend' | 'public';
  helpType: 'all' | 'business' | 'technical' | 'independent';
}

const INITIAL_FILTERS: FilterOptions = {
  status: 'all',
  mode: 'all',
  helpType: 'all',
};

// ==================== HELPERS ====================

const buildHelpFriendPayload = (data: any, extras: Record<string, unknown> = {}) => ({
  ticketId: data.ticketId,
  ticketNumber: data.ticketNumber,
  helpMode: data.helpMode,
  friendEmail: data.helpMode === 'friend' ? (data.friendEmail ?? null) : null,
  friendName: data.helpMode === 'friend' ? (data.friendName ?? null) : null,
  urgency: data.urgency,
  helpType: data.helpType,
  description: data.description,
  updatedAt: new Date().toISOString(),
  ...extras,
});

// ==================== COMPONENTE DE ESTATÍSTICAS ====================

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color, icon, active, onClick }) => (
  <button
    onClick={onClick}
    className={`
      relative flex flex-col gap-1 rounded-xl p-4 border text-left transition-all duration-200
      ${active
        ? `${color} shadow-lg scale-[1.02]`
        : 'bg-zinc-800/60 border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600'
      }
    `}
  >
    <div className="flex items-center justify-between mb-1">
      <span className={`text-xs font-medium uppercase tracking-wider ${active ? 'text-white/80' : 'text-zinc-400'}`}>
        {label}
      </span>
      <span className={`opacity-70 ${active ? 'text-white' : 'text-zinc-500'}`}>{icon}</span>
    </div>
    <span className={`text-3xl font-bold tabular-nums ${active ? 'text-white' : 'text-white'}`}>
      {value}
    </span>
  </button>
);

// ==================== COMPONENTE DE FILTRO SELECT ====================

interface FilterSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: { value: string; label: string }[];
  label: string;
}

const FilterSelect: React.FC<FilterSelectProps> = ({ value, onChange, options, label }) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`
        appearance-none cursor-pointer pr-8 pl-3 py-2 rounded-lg text-sm
        border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/40
        ${value !== 'all'
          ? 'bg-blue-600/20 border-blue-500/60 text-blue-300'
          : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-zinc-500'
        }
      `}
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
    <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
  </div>
);

// ==================== COMPONENTE PRINCIPAL ====================

const HelpFriendsPage = () => {
  const { user } = useAuth();

  // --- Estado ---
  const [helpFriends, setHelpFriends] = useState<HelpFriend[]>([]);
  const [availableTickets, setAvailableTickets] = useState<Ticket[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [filterOptions, setFilterOptions] = useState<FilterOptions>(INITIAL_FILTERS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHelpFriend, setSelectedHelpFriend] = useState<HelpFriend | null>(null);
  const [editingHelpFriend, setEditingHelpFriend] = useState<HelpFriend | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // ==================== SUBSCRIPTIONS ====================

  useEffect(() => {
    if (!user) return;
    // Filtra apenas os tickets abertos do próprio usuário logado.
    // Ajuste o campo abaixo caso o seu modelo use outro nome
    // (ex: 'createdBy', 'ownerEmail', 'assignedTo', etc.)
    const q = query(
      collection(db, 'tickets'),
      where('status', '==', 'open'),
      where('userEmail', '==', user.email),
      orderBy('openDate', 'desc')
    );
    return onSnapshot(q, (snap) => {
      setAvailableTickets(
        snap.docs.map(d => ({ ...(d.data() as Ticket), id: d.id }))
      );
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'helpFriends'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const helps: HelpFriend[] = [];
      snap.forEach(d => {
        const data = d.data() as HelpFriend;
        const isOwner = data.requesterEmail === user.email;
        const isPublic = data.helpMode === 'public';
        const isTarget = data.friendEmail === user.email;
        if (isOwner || isPublic || isTarget) {
          helps.push({ ...data, id: d.id });
        }
      });
      setHelpFriends(helps);
    });
  }, [user]);

  // ==================== ACTIONS ====================

  const withLoading = useCallback(async (fn: () => Promise<void>) => {
    try {
      setLoading(true);
      await fn();
    } catch (err) {
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreateHelpFriend = useCallback(async (data: any) => {
    if (!user) return;
    await withLoading(async () => {
      await addDoc(collection(db, 'helpFriends'), buildHelpFriendPayload(data, {
        requesterEmail: user.email,
        requesterName: user.displayName || user.email,
        createdAt: new Date().toISOString(),
        status: 'open' as HelpStatus,
      }));
      setIsModalOpen(false);
    });
  }, [user, withLoading]);

  const handleUpdateHelpFriend = useCallback(async (data: any, helpFriendId: string) => {
    if (!helpFriendId) return;
    await withLoading(async () => {
      await updateDoc(doc(db, 'helpFriends', helpFriendId), buildHelpFriendPayload(data));
      setEditingHelpFriend(null);
      setIsModalOpen(false);
    });
  }, [withLoading]);

  const handleDeleteHelpFriend = useCallback(async () => {
    if (!selectedHelpFriend) return;
    await withLoading(async () => {
      await deleteDoc(doc(db, 'helpFriends', selectedHelpFriend.id));
      setShowDetailModal(false);
      setSelectedHelpFriend(null);
    });
  }, [selectedHelpFriend, withLoading]);

  const handleStatusUpdate = useCallback(
    async (id: string, fields: Partial<HelpFriend>) => {
      await withLoading(async () => {
        await updateDoc(doc(db, 'helpFriends', id), {
          ...fields,
          updatedAt: new Date().toISOString(),
        });
        setShowDetailModal(false);
      });
    },
    [withLoading]
  );

  const handleAcceptHelp = useCallback(async (requiresRelatus: boolean) => {
    if (!selectedHelpFriend || !user) return;
    await handleStatusUpdate(selectedHelpFriend.id, {
      status: 'in-progress',
      helperEmail: user.email,
      helperName: user.displayName || user.email,
      acceptedAt: new Date().toISOString(),
      requiresRelatus,
    } as any);
  }, [selectedHelpFriend, user, handleStatusUpdate]);

  const handleResolveHelp = useCallback(async (resolution: string) => {
    if (!selectedHelpFriend) return;
    await handleStatusUpdate(selectedHelpFriend.id, {
      status: 'resolved',
      resolution,
      resolvedAt: new Date().toISOString(),
    } as any);
  }, [selectedHelpFriend, handleStatusUpdate]);

  const handleRejectHelp = useCallback(async () => {
    if (!selectedHelpFriend) return;
    await handleStatusUpdate(selectedHelpFriend.id, { status: 'closed' });
  }, [selectedHelpFriend, handleStatusUpdate]);

  const handleCloseHelp = useCallback(async () => {
    if (!selectedHelpFriend) return;
    await handleStatusUpdate(selectedHelpFriend.id, { status: 'closed' });
  }, [selectedHelpFriend, handleStatusUpdate]);

  // ==================== COMPUTED ====================

  const stats = useMemo(() => ({
    total: helpFriends.length,
    mine: helpFriends.filter(h => h.requesterEmail === user?.email).length,
    assignedToMe: helpFriends.filter(h => h.friendEmail === user?.email).length,
    open: helpFriends.filter(h => h.status === 'open').length,
    inProgress: helpFriends.filter(h => h.status === 'in-progress').length,
    resolved: helpFriends.filter(h => h.status === 'resolved').length,
    closed: helpFriends.filter(h => h.status === 'closed').length,
  }), [helpFriends, user?.email]);

  const hasActiveFilters = useMemo(
    () =>
      filterOptions.status !== 'all' ||
      filterOptions.mode !== 'all' ||
      filterOptions.helpType !== 'all' ||
      searchTerm.length > 0,
    [filterOptions, searchTerm]
  );

  const filteredHelpFriends = useMemo(() => {
    return helpFriends.filter(help => {
      // View mode filter
      if (viewMode === 'mine' && help.requesterEmail !== user?.email) return false;
      if (viewMode === 'assignedToMe' && help.friendEmail !== user?.email) return false;
      if (viewMode === 'helpOthers') {
        if (help.status !== 'open' || help.requesterEmail === user?.email) return false;
        if (help.helpMode === 'friend' && help.friendEmail !== user?.email) return false;
        return true;
      }

      // Standard filters
      if (filterOptions.status !== 'all' && help.status !== filterOptions.status) return false;
      if (filterOptions.mode !== 'all' && help.helpMode !== filterOptions.mode) return false;
      if (filterOptions.helpType !== 'all' && help.helpType !== filterOptions.helpType) return false;

      // Search
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        return (
          help.ticketNumber.toLowerCase().includes(s) ||
          help.requesterName.toLowerCase().includes(s) ||
          (help.friendName?.toLowerCase().includes(s) ?? false) ||
          help.description.toLowerCase().includes(s)
        );
      }

      return true;
    });
  }, [helpFriends, filterOptions, searchTerm, viewMode, user?.email]);

  const handleClearFilters = useCallback(() => {
    setFilterOptions(INITIAL_FILTERS);
    setSearchTerm('');
  }, []);

  const openNewModal = useCallback(() => {
    setEditingHelpFriend(null);
    setIsModalOpen(true);
  }, []);

  const openDetailModal = useCallback((id: string) => {
    const help = helpFriends.find(h => h.id === id);
    if (help) {
      setSelectedHelpFriend(help);
      setShowDetailModal(true);
    }
  }, [helpFriends]);

  const handleModalSubmit = useCallback(async (data: any, helpFriendId?: string) => {
    if (helpFriendId) {
      await handleUpdateHelpFriend(data, helpFriendId);
    } else {
      await handleCreateHelpFriend(data);
    }
  }, [handleCreateHelpFriend, handleUpdateHelpFriend]);

  const handleEditFromDetail = useCallback(() => {
    if (!selectedHelpFriend) return;
    setShowDetailModal(false);
    setEditingHelpFriend(selectedHelpFriend);
    setIsModalOpen(true);
  }, [selectedHelpFriend]);

  // ==================== VIEW TABS ====================

  const viewTabs: { key: ViewMode; label: string; count?: number; color: string }[] = [
    { key: 'all', label: 'Todos', count: stats.total, color: 'bg-sky-500' },
    { key: 'mine', label: 'Meus Pedidos', count: stats.mine, color: 'bg-blue-500' },
    { key: 'assignedToMe', label: 'Para mim', count: stats.assignedToMe, color: 'bg-emerald-500' },
    { key: 'helpOthers', label: 'Ajudar outros', color: 'bg-purple-500' },
  ];

  const statusOptions = [
    { value: 'all', label: 'Todos os Status' },
    { value: 'open', label: '🔵 Abertos' },
    { value: 'in-progress', label: '🟣 Em Progresso' },
    { value: 'resolved', label: '🟢 Resolvidos' },
    { value: 'closed', label: '⚫ Fechados' },
  ];

  const modeOptions = [
    { value: 'all', label: 'Todos os Modos' },
    { value: 'friend', label: '👤 Amigo Específico' },
    { value: 'public', label: '🌐 Público' },
  ];

  const typeOptions = [
    { value: 'all', label: 'Todos os Tipos' },
    { value: 'business', label: '💼 Negócio' },
    { value: 'technical', label: '🛠️ Técnico' },
    { value: 'independent', label: '⚙️ Independente' },
  ];

  // ==================== RENDER ====================

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Top gradient bar */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-sky-400 to-emerald-500" />

      <div className="max-w-screen-2xl mx-auto p-6 space-y-6">

        {/* ── HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/25">
                <HandHelping size={22} className="text-blue-400" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Help Friends</h1>
            </div>
            <p className="text-zinc-400 text-sm pl-[52px]">
              Peça ajuda de amigos ou ofereça sua ajuda para resolver chamados
            </p>
          </div>

          <button
            onClick={openNewModal}
            className="
              inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm
              bg-blue-600 hover:bg-blue-500 active:scale-95
              shadow-lg shadow-blue-900/30 transition-all duration-150
            "
          >
            <Plus size={16} />
            Nova Solicitação
          </button>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard
            label="Total" value={stats.total}
            color="bg-zinc-700/60 border-zinc-600"
            icon={<TrendingUp size={15} />}
          />
          <StatCard
            label="Meus Pedidos" value={stats.mine}
            color="bg-blue-600/40 border-blue-500/60"
            icon={<Users size={15} />}
            active={viewMode === 'mine'}
            onClick={() => setViewMode(viewMode === 'mine' ? 'all' : 'mine')}
          />
          <StatCard
            label="Para mim" value={stats.assignedToMe}
            color="bg-emerald-600/40 border-emerald-500/60"
            icon={<HandHelping size={15} />}
            active={viewMode === 'assignedToMe'}
            onClick={() => setViewMode(viewMode === 'assignedToMe' ? 'all' : 'assignedToMe')}
          />
          <StatCard
            label="Abertos" value={stats.open}
            color="bg-sky-600/40 border-sky-500/60"
            icon={<CircleDot size={15} />}
          />
          <StatCard
            label="Em Progresso" value={stats.inProgress}
            color="bg-purple-600/40 border-purple-500/60"
            icon={<RefreshCw size={15} />}
          />
          <StatCard
            label="Resolvidos" value={stats.resolved}
            color="bg-emerald-600/40 border-emerald-500/60"
            icon={<CheckCircle2 size={15} />}
          />
        </div>

        {/* ── TOOLBAR ── */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 space-y-3 backdrop-blur-sm">

          {/* View mode tabs */}
          <div className="flex flex-wrap gap-1.5">
            {viewTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setViewMode(tab.key)}
                className={`
                  flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium
                  transition-all duration-150 active:scale-95
                  ${viewMode === tab.key
                    ? `${tab.color} text-white shadow-md`
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/80'
                  }
                `}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`
                    text-xs px-1.5 py-0.5 rounded-full font-bold tabular-nums
                    ${viewMode === tab.key ? 'bg-white/20' : 'bg-zinc-700 text-zinc-300'}
                  `}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search + filter toggle */}
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[220px] flex items-center gap-2 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 focus-within:border-blue-500/60 transition-colors">
              <Search size={15} className="text-zinc-500 shrink-0" />
              <input
                type="text"
                placeholder="Buscar por ticket, nome ou descrição…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm text-white placeholder-zinc-600"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters(v => !v)}
              className={`
                flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border transition-all
                ${showFilters || hasActiveFilters
                  ? 'bg-blue-600/20 border-blue-500/60 text-blue-300'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
                }
              `}
            >
              <SlidersHorizontal size={15} />
              Filtros
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              )}
            </button>

            {hasActiveFilters && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-200 bg-zinc-800 border border-zinc-700 hover:border-zinc-600 transition-all"
              >
                <X size={12} />
                Limpar
              </button>
            )}
          </div>

          {/* Expandable filters */}
          {showFilters && (
            <div className="flex flex-wrap gap-2 pt-1 border-t border-zinc-800">
              <FilterSelect
                value={filterOptions.status}
                onChange={v => setFilterOptions(p => ({ ...p, status: v as any }))}
                options={statusOptions}
                label="Status"
              />
              <FilterSelect
                value={filterOptions.mode}
                onChange={v => setFilterOptions(p => ({ ...p, mode: v as any }))}
                options={modeOptions}
                label="Modo"
              />
              <FilterSelect
                value={filterOptions.helpType}
                onChange={v => setFilterOptions(p => ({ ...p, helpType: v as any }))}
                options={typeOptions}
                label="Tipo"
              />
            </div>
          )}
        </div>

        {/* ── RESULTS HEADER ── */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            {filteredHelpFriends.length === 0
              ? 'Nenhum resultado'
              : `${filteredHelpFriends.length} solicitaç${filteredHelpFriends.length === 1 ? 'ão' : 'ões'}`
            }
            {hasActiveFilters && <span className="text-blue-400 ml-1">(filtrado)</span>}
          </p>
        </div>

        {/* ── GRID / EMPTY STATE ── */}
        {filteredHelpFriends.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredHelpFriends.map(helpFriend => (
              <HelpFriendCard
                key={helpFriend.id}
                helpFriend={helpFriend}
                currentUserEmail={user?.email ?? ''}
                onOpenDetails={openDetailModal}
                isOwner={helpFriend.requesterEmail === user?.email}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center mb-4">
              {hasActiveFilters
                ? <AlertCircle size={28} className="text-zinc-500" />
                : <HandHelping size={28} className="text-zinc-500" />
              }
            </div>
            <p className="text-zinc-300 font-medium mb-1">
              {hasActiveFilters
                ? 'Nenhum resultado encontrado'
                : 'Nenhuma solicitação ainda'
              }
            </p>
            <p className="text-zinc-500 text-sm mb-6 max-w-xs">
              {hasActiveFilters
                ? 'Tente ajustar ou limpar os filtros para ver mais resultados.'
                : 'Crie uma solicitação para pedir ou oferecer ajuda a colegas.'
              }
            </p>
            {hasActiveFilters ? (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-zinc-800 border border-zinc-700 text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                <X size={14} />
                Limpar Filtros
              </button>
            ) : (
              <button
                onClick={openNewModal}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/30 transition-all active:scale-95"
              >
                <Plus size={16} />
                Criar Solicitação
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── MODAIS ── */}
      <HelpFriendModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingHelpFriend(null);
        }}
        onSubmit={handleModalSubmit}
        availableTickets={availableTickets}
        existingHelpFriend={editingHelpFriend}
      />

      <HelpDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        helpFriend={selectedHelpFriend}
        currentUserEmail={user?.email ?? ''}
        onAccept={handleAcceptHelp}
        onResolve={handleResolveHelp}
        onReject={handleRejectHelp}
        onClose2={handleCloseHelp}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteHelpFriend}
      />
    </div>
  );
};

export default HelpFriendsPage;
