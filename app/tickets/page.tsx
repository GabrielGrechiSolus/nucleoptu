"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Search, Filter, X, Tag, User, FileText, BookOpen } from 'lucide-react';
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
  writeBatch,
  arrayRemove
} from 'firebase/firestore';
import TicketModal, { Ticket, Observation } from './components/TicketModal';
import ObservationModal from './components/ObservationModal';
import AddStudyToTicketModal from './components/AddStudyToTicketModal';
import { Study } from '../studies/components/StudyModal';

// ==================== TIPOS ====================

interface TicketStats {
  total: number;
  open: number;
  closed: number;
  withStudies: number;
}

interface FilterOptions {
  status: 'all' | 'open' | 'closed';
  client: string;
  dateRange: 'all' | 'today' | 'week' | 'month';
  hasStudies: 'all' | 'yes' | 'no';
}

// ==================== COMPONENTE PRINCIPAL ====================

const TicketsPage = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    status: 'all',
    client: '',
    dateRange: 'all',
    hasStudies: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isObservationModalOpen, setIsObservationModalOpen] = useState(false);
  const [isAddStudyModalOpen, setIsAddStudyModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [editingTicket, setEditingTicket] = useState<Ticket | undefined>(undefined);
  const [categories, setCategories] = useState<string[]>([]);
  const [clients, setClients] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TicketStats>({ total: 0, open: 0, closed: 0, withStudies: 0 });
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Carrega tickets do Firestore com ordenação
  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const q = query(
      collection(db, 'tickets'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ticketsData: Ticket[] = [];
      const clientsSet = new Set<string>();

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const ticket = {
          id: doc.id,
          ticketNumber: data.ticketNumber,
          clientName: data.clientName,
          openDate: data.openDate,
          closeDate: data.closeDate || undefined,
          status: data.status,
          observations: data.observations || [],
          studies: data.studies || [],
          githubLinks: data.githubLinks || [],
          priority: data.priority || 'medium',
          category: data.category || '',
          description: data.description || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as Ticket;

        ticketsData.push(ticket);

        if (data.clientName) {
          clientsSet.add(data.clientName);
        }
      });

      setTickets(ticketsData);
      setClients(Array.from(clientsSet).sort());

      // Calcular estatísticas
      const total = ticketsData.length;
      const open = ticketsData.filter(t => t.status === 'open').length;
      const closed = ticketsData.filter(t => t.status === 'closed').length;
      const withStudies = ticketsData.filter(t => t.studies && t.studies.length > 0).length;

      setStats({ total, open, closed, withStudies });
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar tickets:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Carrega categorias de estudos
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'studies'),
      where('userId', '==', user.uid),
      orderBy('category')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const categoriesSet = new Set<string>();
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.category) {
          categoriesSet.add(data.category);
        }
      });
      setCategories(Array.from(categoriesSet).sort());
    });

    return () => unsubscribe();
  }, [user]);

  // Criar/Atualizar ticket
  const handleCreateTicket = async (data: Omit<Ticket, 'id' | 'observations' | 'studies' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;

    try {
      const now = new Date().toISOString();

      if (editingTicket) {
        const ticketRef = doc(db, 'tickets', editingTicket.id);
        await updateDoc(ticketRef, {
          ...data,
          updatedAt: now,
        });
      } else {
        const newTicketData = {
          ...data,
          userId: user.uid,
          observations: [],
          studies: [],
          githubLinks: data.githubLinks || [],
          createdAt: now,
          updatedAt: now,
        };

        await addDoc(collection(db, 'tickets'), newTicketData);
      }

      setIsTicketModalOpen(false);
      setEditingTicket(undefined);
    } catch (error) {
      console.error('Erro ao salvar chamado:', error);
      alert('Erro ao salvar chamado. Tente novamente.');
    }
  };

  // Deletar ticket
  const handleDeleteTicket = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este chamado? Esta ação não pode ser desfeita.')) {
      return;
    }

    setIsDeleting(id);

    try {
      const ticket = tickets.find(t => t.id === id);

      // Remover referências nos estudos
      if (ticket?.studies && ticket.studies.length > 0) {
        const batch = writeBatch(db);
        for (const studyId of ticket.studies) {
          const studyRef = doc(db, 'studies', studyId);
          batch.update(studyRef, {
            tickets: arrayRemove(id)
          });
        }
        await batch.commit();
      }

      await deleteDoc(doc(db, 'tickets', id));

    } catch (error) {
      console.error('Erro ao deletar chamado:', error);
      alert('Erro ao deletar chamado. Tente novamente.');
    } finally {
      setIsDeleting(null);
    }
  };

  // Fechar/Abrir ticket
  const handleToggleStatus = async (ticket: Ticket) => {
    const newStatus = ticket.status === 'open' ? 'closed' : 'open';

    try {
      const ticketRef = doc(db, 'tickets', ticket.id);
      const updateData: any = {
        status: newStatus,
        updatedAt: new Date().toISOString()
      };

      if (newStatus === 'closed') {
        updateData.closeDate = new Date().toISOString();
      } else {
        updateData.closeDate = null;
      }

      await updateDoc(ticketRef, updateData);
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  };

  // Adicionar observação
  const handleAddObservation = async (text: string) => {
    if (!selectedTicket) return;

    const newObservation: Observation = {
      id: Date.now().toString(),
      text,
      createdAt: new Date().toISOString(),
      createdBy: user?.displayName || user?.email || 'Usuário'
    };

    const updatedObservations = [newObservation, ...selectedTicket.observations];
    const ticketRef = doc(db, 'tickets', selectedTicket.id);

    try {
      await updateDoc(ticketRef, {
        observations: updatedObservations,
        updatedAt: new Date().toISOString(),
      });

      setSelectedTicket({
        ...selectedTicket,
        observations: updatedObservations,
      });

      const input = document.querySelector('input[placeholder="Adicionar observação..."]') as HTMLInputElement;
      if (input) input.value = '';

    } catch (error) {
      console.error('Erro ao adicionar observação:', error);
      alert('Erro ao adicionar observação. Tente novamente.');
    }
  };

  // Deletar observação
  const handleDeleteObservation = async (ticketId: string, observationId: string) => {
    if (!confirm('Remover esta observação?')) return;

    const ticket = tickets.find(t => t.id === ticketId);
    if (!ticket) return;

    const updatedObservations = ticket.observations.filter(obs => obs.id !== observationId);

    try {
      await updateDoc(doc(db, 'tickets', ticketId), {
        observations: updatedObservations,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Erro ao deletar observação:', error);
    }
  };

  // Criar estudo a partir do ticket
  const handleCreateStudyFromTicket = async (data: Omit<Study, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user || !selectedTicket) return;

    try {
      const now = new Date().toISOString();
      const newStudyData = {
        ...data,
        userId: user.uid,
        tickets: [selectedTicket.id],
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await addDoc(collection(db, 'studies'), newStudyData);

      const ticketRef = doc(db, 'tickets', selectedTicket.id);
      await updateDoc(ticketRef, {
        studies: [...(selectedTicket.studies || []), docRef.id],
        updatedAt: now
      });

      setIsAddStudyModalOpen(false);
      setSelectedTicket(null);

    } catch (error) {
      console.error('Erro ao criar estudo:', error);
      alert('Erro ao criar estudo. Tente novamente.');
    }
  };

  // Filtrar tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        searchTerm === '' ||
        ticket.ticketNumber.toLowerCase().includes(searchLower) ||
        ticket.clientName.toLowerCase().includes(searchLower) ||
        (ticket.description && ticket.description.toLowerCase().includes(searchLower)) ||
        (ticket.category && ticket.category.toLowerCase().includes(searchLower));

      const matchesStatus = filterOptions.status === 'all' || ticket.status === filterOptions.status;
      const matchesClient = filterOptions.client === '' || ticket.clientName === filterOptions.client;

      const matchesStudies =
        filterOptions.hasStudies === 'all' ||
        (filterOptions.hasStudies === 'yes' && ticket.studies && ticket.studies.length > 0) ||
        (filterOptions.hasStudies === 'no' && (!ticket.studies || ticket.studies.length === 0));

      let matchesDate = true;
      if (filterOptions.dateRange !== 'all' && ticket.createdAt) {
        const ticketDate = new Date(ticket.createdAt);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (filterOptions.dateRange) {
          case 'today':
            matchesDate = ticketDate >= today;
            break;
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            matchesDate = ticketDate >= weekAgo;
            break;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            matchesDate = ticketDate >= monthAgo;
            break;
        }
      }

      return matchesSearch && matchesStatus && matchesClient && matchesStudies && matchesDate;
    });
  }, [tickets, searchTerm, filterOptions]);

  // Limpar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setFilterOptions({
      status: 'all',
      client: '',
      dateRange: 'all',
      hasStudies: 'all'
    });
  };

  const activeFiltersCount = Object.values(filterOptions).filter(v => v !== 'all' && v !== '').length + (searchTerm ? 1 : 0);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-400">Carregando chamados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-sky-500 to-purple-500 bg-clip-text text-transparent">
              Chamados
            </h1>
            <p className="text-zinc-400 mt-1">Gerencie seus chamados e estudos</p>
          </div>

          <button
            onClick={() => {
              setEditingTicket(undefined);
              setIsTicketModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-purple-500 rounded-lg text-white font-medium hover:from-sky-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus size={20} />
            Novo Chamado
          </button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <p className="text-sm text-zinc-400">Total</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <p className="text-sm text-zinc-400">Abertos</p>
            <p className="text-2xl font-bold text-green-500">{stats.open}</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <p className="text-sm text-zinc-400">Fechados</p>
            <p className="text-2xl font-bold text-zinc-500">{stats.closed}</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <p className="text-sm text-zinc-400">Com Estudos</p>
            <p className="text-2xl font-bold text-purple-500">{stats.withStudies}</p>
          </div>
        </div>

        {/* Barra de busca e filtros */}
        <div className="mb-6 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 text-zinc-500" size={20} />
              <input
                type="text"
                placeholder="Buscar por número, cliente, descrição ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-2.5 text-zinc-500 hover:text-white"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-all ${showFilters || activeFiltersCount > 0
                ? 'bg-sky-500/10 border-sky-500 text-sky-500'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                }`}
            >
              <Filter size={18} />
              Filtros
              {activeFiltersCount > 0 && (
                <span className="ml-1 bg-sky-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>

          {/* Painel de filtros expandido */}
          {showFilters && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Status</label>
                <select
                  value={filterOptions.status}
                  onChange={(e) => setFilterOptions(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="all">Todos</option>
                  <option value="open">Abertos</option>
                  <option value="closed">Fechados</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Cliente</label>
                <select
                  value={filterOptions.client}
                  onChange={(e) => setFilterOptions(prev => ({ ...prev, client: e.target.value }))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">Todos</option>
                  {clients.map(client => (
                    <option key={client} value={client}>{client}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Período</label>
                <select
                  value={filterOptions.dateRange}
                  onChange={(e) => setFilterOptions(prev => ({ ...prev, dateRange: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="all">Todo período</option>
                  <option value="today">Hoje</option>
                  <option value="week">Últimos 7 dias</option>
                  <option value="month">Últimos 30 dias</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Estudos</label>
                <select
                  value={filterOptions.hasStudies}
                  onChange={(e) => setFilterOptions(prev => ({ ...prev, hasStudies: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="all">Todos</option>
                  <option value="yes">Com estudos</option>
                  <option value="no">Sem estudos</option>
                </select>
              </div>

              {activeFiltersCount > 0 && (
                <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
                  <button
                    onClick={clearFilters}
                    className="text-sm text-zinc-400 hover:text-white flex items-center gap-1"
                  >
                    <X size={14} />
                    Limpar filtros
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Grid de Chamados */}
        {filteredTickets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTickets.map((ticket) => {
              return (
                <div
                  key={ticket.id}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-700 transition-all"
                >
                  {/* Header do Card */}
                  <div className="p-4 border-b border-zinc-800">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-sky-400">#{ticket.ticketNumber}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ticket.status === 'open'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-zinc-500/20 text-zinc-400'
                            }`}>
                            {ticket.status === 'open' ? 'Aberto' : 'Fechado'}
                          </span>
                        </div>
                        <h3 className="text-white font-semibold mt-1">{ticket.clientName}</h3>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditingTicket(ticket);
                            setIsTicketModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors"
                          title="Editar"
                        >
                          <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteTicket(ticket.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                          title="Excluir"
                          disabled={isDeleting === ticket.id}
                        >
                          <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {ticket.description && (
                      <p className="text-sm text-zinc-400 mt-2 line-clamp-2">{ticket.description}</p>
                    )}
                    {ticket.category && (
                      <div className="flex items-center gap-1 mt-2">
                        <Tag size={12} className="text-zinc-500" />
                        <span className="text-xs text-zinc-500">{ticket.category}</span>
                      </div>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="p-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setIsObservationModalOpen(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      {ticket.observations.length} Obs
                    </button>

                    <button
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setIsAddStudyModalOpen(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      <BookOpen size={12} />
                      Estudo
                    </button>

                    {ticket.status === 'open' && (
                      <button
                        onClick={() => handleToggleStatus(ticket)}
                        className="px-3 py-1.5 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                      >
                        Fechar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-zinc-900/50 border border-zinc-800 rounded-lg">
            <FileText size={48} className="mx-auto text-zinc-700 mb-4" />
            <p className="text-zinc-400 text-lg mb-2">Nenhum chamado encontrado</p>
            <p className="text-zinc-500 text-sm mb-6">
              {searchTerm || activeFiltersCount > 0
                ? 'Tente ajustar seus filtros ou termos de busca'
                : 'Clique em "Novo Chamado" para começar'}
            </p>
            {(searchTerm || activeFiltersCount > 0) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-zinc-800 rounded-lg text-sm hover:bg-zinc-700 transition"
              >
                Limpar filtros
              </button>
            )}
          </div>
        )}

        {/* Modais */}
        <TicketModal
          isOpen={isTicketModalOpen}
          onClose={() => {
            setIsTicketModalOpen(false);
            setEditingTicket(undefined);
          }}
          onSubmit={handleCreateTicket}
          ticket={editingTicket}
        />

        {selectedTicket && (
          <>
            <ObservationModal
              isOpen={isObservationModalOpen}
              onClose={() => {
                setIsObservationModalOpen(false);
                setSelectedTicket(null);
              }}
              onSubmit={handleAddObservation}
              observations={selectedTicket.observations}
              ticketId={selectedTicket.id}
              onDeleteObservation={(obsId: string) => handleDeleteObservation(selectedTicket.id, obsId)}
            />

            <AddStudyToTicketModal
              isOpen={isAddStudyModalOpen}
              onClose={() => {
                setIsAddStudyModalOpen(false);
                setSelectedTicket(null);
              }}
              onSubmit={handleCreateStudyFromTicket}
              ticketId={selectedTicket.id}
              ticketNumber={selectedTicket.ticketNumber}
              ticketDescription={selectedTicket.description}
              categories={categories}
            />

          </>
        )}
      </div>
    </div>
  );
};

export default TicketsPage;