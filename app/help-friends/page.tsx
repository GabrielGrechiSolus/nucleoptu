'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Search, Filter, X } from 'lucide-react';
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

// ==================== COMPONENTE PRINCIPAL ====================

const HelpFriendsPage = () => {
  const { user } = useAuth();
  const [helpFriends, setHelpFriends] = useState<HelpFriend[]>([]);
  const [availableTickets, setAvailableTickets] = useState<Ticket[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    status: 'all',
    mode: 'all',
    helpType: 'all',
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedHelpFriend, setSelectedHelpFriend] = useState<HelpFriend | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // ==================== BUSCAR TICKETS ====================

  useEffect(() => {
    if (!user) return;

    const ticketsRef = collection(db, 'tickets');
    const q = query(
      ticketsRef,
      where('status', '==', 'open'),
      orderBy('openDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tickets: Ticket[] = [];
      querySnapshot.forEach((doc) => {
        tickets.push({
          ...(doc.data() as Ticket),
          id: doc.id,
        });
      });
      setAvailableTickets(tickets);
    });

    return () => unsubscribe();
  }, [user]);

  // ==================== BUSCAR HELP FRIENDS ====================

  useEffect(() => {
    if (!user) return;

    const helpFriendsRef = collection(db, 'helpFriends');

    // Busca solicitações criadas pelo usuário OU direcionadas ao usuário
    const q = query(
      helpFriendsRef,
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const helps: HelpFriend[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as HelpFriend;
        
        // Filtrar para mostrar:
        // 1. Solicitações do próprio usuário
        // 2. Solicitações públicas
        // 3. Solicitações direcionadas ao usuário (friend mode)
        if (
          data.requesterEmail === user.email ||
          data.helpMode === 'public' ||
          data.friendEmail === user.email
        ) {
          helps.push({
            ...data,
            id: doc.id,
          });
        }
      });
      setHelpFriends(helps);
    });

    return () => unsubscribe();
  }, [user]);

  // ==================== CRIAR SOLICITAÇÃO ====================

  const handleCreateHelpFriend = async (data: any) => {
    if (!user) return;

    try {
      setLoading(true);
      await addDoc(collection(db, 'helpFriends'), {
        ticketId: data.ticketId,
        ticketNumber: data.ticketNumber,
        requesterEmail: user.email,
        requesterName: user.displayName || user.email,
        createdAt: new Date().toISOString(),
        status: 'open' as HelpStatus,
        helpMode: data.helpMode,
        friendEmail: data.friendEmail || null,
        friendName: data.friendName || null,
        urgency: data.urgency,
        helpType: data.helpType,
        description: data.description,
        updatedAt: new Date().toISOString(),
      });
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ==================== ACEITAR AJUDA ====================

  const handleAcceptHelp = async () => {
    if (!selectedHelpFriend || !user) return;

    try {
      setLoading(true);
      await updateDoc(doc(db, 'helpFriends', selectedHelpFriend.id), {
        status: 'in-progress' as HelpStatus,
        helperEmail: user.email,
        helperName: user.displayName || user.email,
        acceptedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setShowDetailModal(false);
    } catch (error) {
      console.error('Erro ao aceitar:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ==================== RESOLVER AJUDA ====================

  const handleResolveHelp = async (resolution: string) => {
    if (!selectedHelpFriend) return;

    try {
      setLoading(true);
      await updateDoc(doc(db, 'helpFriends', selectedHelpFriend.id), {
        status: 'resolved' as HelpStatus,
        resolution,
        resolvedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setShowDetailModal(false);
    } catch (error) {
      console.error('Erro ao resolver:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ==================== REJEITAR AJUDA ====================

  const handleRejectHelp = async () => {
    if (!selectedHelpFriend) return;

    try {
      setLoading(true);
      await updateDoc(doc(db, 'helpFriends', selectedHelpFriend.id), {
        status: 'closed' as HelpStatus,
        updatedAt: new Date().toISOString(),
      });
      setShowDetailModal(false);
    } catch (error) {
      console.error('Erro ao rejeitar:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ==================== FECHAR SOLICITAÇÃO ====================

  const handleCloseHelp = async () => {
    if (!selectedHelpFriend) return;

    try {
      setLoading(true);
      await updateDoc(doc(db, 'helpFriends', selectedHelpFriend.id), {
        status: 'closed' as HelpStatus,
        updatedAt: new Date().toISOString(),
      });
      setShowDetailModal(false);
    } catch (error) {
      console.error('Erro ao fechar:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // ==================== FILTROS ====================

  const filteredHelpFriends = useMemo(() => {
    return helpFriends.filter(help => {
      // View mode
      if (viewMode === 'mine' && help.requesterEmail !== user?.email) {
        return false;
      }

      if (viewMode === 'assignedToMe' && help.friendEmail !== user?.email) {
        return false;
      }

      if (viewMode === 'helpOthers') {
        if (help.status !== 'open') return false;
        if (help.requesterEmail === user?.email) return false;
        if (help.helpMode === 'friend' && help.friendEmail !== user?.email) return false;
        if (help.helpMode === 'public') return true;
        return help.friendEmail === user?.email;
      }

      // Filtro de status
      if (filterOptions.status !== 'all' && help.status !== filterOptions.status) {
        return false;
      }

      // Filtro de modo
      if (filterOptions.mode !== 'all' && help.helpMode !== filterOptions.mode) {
        return false;
      }

      // Filtro de tipo
      if (filterOptions.helpType !== 'all' && help.helpType !== filterOptions.helpType) {
        return false;
      }

      // Filtro de busca
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          help.ticketNumber.toLowerCase().includes(search) ||
          help.requesterName.toLowerCase().includes(search) ||
          (help.friendName && help.friendName.toLowerCase().includes(search)) ||
          help.description.toLowerCase().includes(search)
        );
      }

      return true;
    });
  }, [helpFriends, filterOptions, searchTerm, viewMode, user?.email]);

  // ==================== ESTATÍSTICAS ====================

  const stats = useMemo(() => {
    return {
      total: helpFriends.length,
      mine: helpFriends.filter(h => h.requesterEmail === user?.email).length,
      assignedToMe: helpFriends.filter(h => h.friendEmail === user?.email).length,
      open: helpFriends.filter(h => h.status === 'open').length,
      inProgress: helpFriends.filter(h => h.status === 'in-progress').length,
      resolved: helpFriends.filter(h => h.status === 'resolved').length,
      closed: helpFriends.filter(h => h.status === 'closed').length,
    };
  }, [helpFriends, user?.email]);

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🤝 Help Friends</h1>
        <p className="text-zinc-400">
          Peça ajuda de amigos ou ofereça sua ajuda para resolver chamados
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 mb-8">
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
          <p className="text-zinc-400 text-sm">Total</p>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
          <p className="text-blue-400 text-sm">Meus Pedidos</p>
          <p className="text-2xl font-bold text-white">{stats.mine}</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/50 rounded-lg p-4">
          <p className="text-emerald-400 text-sm">Pedidos para mim</p>
          <p className="text-2xl font-bold text-white">{stats.assignedToMe}</p>
        </div>
        <div className="bg-sky-500/10 border border-sky-500/50 rounded-lg p-4">
          <p className="text-sky-400 text-sm">Abertos</p>
          <p className="text-2xl font-bold text-white">{stats.open}</p>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/50 rounded-lg p-4">
          <p className="text-purple-400 text-sm">Em Progresso</p>
          <p className="text-2xl font-bold text-white">{stats.inProgress}</p>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/50 rounded-lg p-4">
          <p className="text-emerald-400 text-sm">Resolvidos</p>
          <p className="text-2xl font-bold text-white">{stats.resolved}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 mb-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${viewMode === 'all' ? 'bg-sky-500 text-white' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'}`}
            >
              Todos ({stats.total})
            </button>
            <button
              onClick={() => setViewMode('mine')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${viewMode === 'mine' ? 'bg-blue-500 text-white' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'}`}
            >
              Meus Pedidos ({stats.mine})
            </button>
            <button
              onClick={() => setViewMode('assignedToMe')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${viewMode === 'assignedToMe' ? 'bg-emerald-500 text-white' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'}`}
            >
              Pedidos para mim ({stats.assignedToMe})
            </button>
            <button
              onClick={() => setViewMode('helpOthers')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition ${viewMode === 'helpOthers' ? 'bg-purple-500 text-white' : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'}`}
            >
              Ajudar outros
            </button>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px] flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2">
              <Search size={18} className="text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar por ticket, nome ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent outline-none text-white placeholder-zinc-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <select
                value={filterOptions.status}
                onChange={(e) =>
                  setFilterOptions(prev => ({ ...prev, status: e.target.value as any }))
                }
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="all">Todos os Status</option>
                <option value="open">Abertos</option>
                <option value="in-progress">Em Progresso</option>
                <option value="resolved">Resolvidos</option>
                <option value="closed">Fechados</option>
              </select>

              <select
                value={filterOptions.mode}
                onChange={(e) =>
                  setFilterOptions(prev => ({ ...prev, mode: e.target.value as any }))
                }
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="all">Todos os Modos</option>
                <option value="friend">👤 Amigo Específico</option>
                <option value="public">🌐 Público</option>
              </select>

              <select
                value={filterOptions.helpType}
                onChange={(e) =>
                  setFilterOptions(prev => ({ ...prev, helpType: e.target.value as any }))
                }
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="all">Todos os Tipos</option>
                <option value="business">💼 Negócio</option>
                <option value="technical">🛠️ Técnico</option>
                <option value="independent">⚙️ Independente</option>
              </select>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 font-medium transition-colors"
            >
              <Plus size={18} />
              Nova Solicitação
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Solicitações */}
      {filteredHelpFriends.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHelpFriends.map(helpFriend => (
            <HelpFriendCard
              key={helpFriend.id}
              helpFriend={helpFriend}
              currentUserEmail={user?.email || ''}
              onOpenDetails={(id) => {
                const help = helpFriends.find(h => h.id === id);
                if (help) {
                  setSelectedHelpFriend(help);
                  setShowDetailModal(true);
                }
              }}
              isOwner={helpFriend.requesterEmail === user?.email}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-zinc-400 text-lg mb-4">
            {searchTerm || filterOptions.status !== 'all' || filterOptions.mode !== 'all'
              ? 'Nenhuma solicitação encontrada com os filtros aplicados'
              : 'Nenhuma solicitação de ajuda por enquanto'}
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-2 font-medium transition-colors"
          >
            <Plus size={18} />
            Criar Nova Solicitação
          </button>
        </div>
      )}

      {/* Modais */}
      <HelpFriendModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateHelpFriend}
        availableTickets={availableTickets}
      />

      <HelpDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        helpFriend={selectedHelpFriend}
        currentUserEmail={user?.email || ''}
        onAccept={handleAcceptHelp}
        onResolve={handleResolveHelp}
        onReject={handleRejectHelp}
        onClose2={handleCloseHelp}
      />
    </div>
  );
};

export default HelpFriendsPage;
