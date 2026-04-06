"use client";

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { Dialog } from '@headlessui/react'; // Add this import
import { Plus, Search, Filter, X, ChevronDown, Clock, CheckCircle, AlertCircle, Calendar, Tag, User, FileText, BookOpen, Link as LinkIcon, CheckSquare, Target, ChevronRight } from 'lucide-react';
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
  Timestamp,
  orderBy,
  limit,
  increment,
  writeBatch,
  getDocs,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import TicketModal, { Ticket, Observation } from './components/TicketModal';
import ObservationModal from './components/ObservationModal';
import TicketCard from './components/TicketCard';
import AddStudyToTicketModal from './components/AddStudyToTicketModal';
import { Study } from '../studies/components/StudyModal';
import Link from 'next/link';

// ==================== TIPOS ====================

interface TicketStats {
  total: number;
  open: number;
  closed: number;
  withStudies: number;
  withTasks: number;
}

interface FilterOptions {
  status: 'all' | 'open' | 'closed';
  client: string;
  dateRange: 'all' | 'today' | 'week' | 'month';
  hasStudies: 'all' | 'yes' | 'no';
  hasTasks: 'all' | 'yes' | 'no';
}

interface LinkedTask {
  id: string;
  title: string;
  status: 'pendente' | 'feito';
  type: string;
  date: string;
  completedAt?: number;
}

// ==================== COMPONENTE PRINCIPAL ====================

const TicketsPage = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    status: 'all',
    client: '',
    dateRange: 'all',
    hasStudies: 'all',
    hasTasks: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isObservationModalOpen, setIsObservationModalOpen] = useState(false);
  const [isAddStudyModalOpen, setIsAddStudyModalOpen] = useState(false);
  const [isLinkTaskModalOpen, setIsLinkTaskModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [editingTicket, setEditingTicket] = useState<Ticket | undefined>(undefined);
  const [categories, setCategories] = useState<string[]>([]);
  const [clients, setClients] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TicketStats>({ total: 0, open: 0, closed: 0, withStudies: 0, withTasks: 0 });
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [availableTasks, setAvailableTasks] = useState<any[]>([]);

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
          tasks: data.tasks || [],
          githubLinks: data.githubLinks || [],
          priority: data.priority || 'medium',
          category: data.category || '',
          description: data.description || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        } as Ticket & { tasks?: string[] };

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
      const withTasks = ticketsData.filter(t => t.tasks && t.tasks.length > 0).length;

      setStats({ total, open, closed, withStudies, withTasks });
      setLoading(false);
    }, (error) => {
      console.error('Erro ao carregar tickets:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Carrega tarefas da agenda
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'tasks'),
      where('userEmail', '==', user.email),
      orderBy('date', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const tasksData = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setTasks(tasksData);
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

  // Carrega tarefas disponíveis para vincular
  useEffect(() => {
    if (!selectedTicket) return;

    const linkedTaskIds = selectedTicket.tasks || [];
    const available = tasks.filter(task =>
      !linkedTaskIds.includes(task.id) &&
      task.status !== 'feito'
    );
    setAvailableTasks(available);
  }, [selectedTicket, tasks]);

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
          tasks: [],
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

  // Vincular tarefa ao chamado
  const handleLinkTask = async (taskId: string) => {
    if (!selectedTicket) return;

    try {
      const ticketRef = doc(db, 'tickets', selectedTicket.id);
      await updateDoc(ticketRef, {
        tasks: arrayUnion(taskId),
        updatedAt: new Date().toISOString()
      });

      // Atualizar tarefa com referência ao chamado
      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        ticketId: selectedTicket.id,
        ticketNumber: selectedTicket.ticketNumber
      });

      alert('Tarefa vinculada com sucesso!');
    } catch (error) {
      console.error('Erro ao vincular tarefa:', error);
      alert('Erro ao vincular tarefa');
    }
  };

  // Desvincular tarefa do chamado
  const handleUnlinkTask = async (ticketId: string, taskId: string) => {
    if (!confirm('Remover vínculo com esta tarefa?')) return;

    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      await updateDoc(ticketRef, {
        tasks: arrayRemove(taskId),
        updatedAt: new Date().toISOString()
      });

      const taskRef = doc(db, 'tasks', taskId);
      await updateDoc(taskRef, {
        ticketId: null,
        ticketNumber: null
      });

      alert('Tarefa desvinculada com sucesso!');
    } catch (error) {
      console.error('Erro ao desvincular tarefa:', error);
      alert('Erro ao desvincular tarefa');
    }
  };

  // Finalizar chamado via tarefa concluída
  const handleCompleteTaskAndTicket = async (ticket: Ticket, taskId: string) => {
    if (!confirm('Marcar tarefa como concluída e finalizar este chamado?')) return;

    try {
      const batch = writeBatch(db);

      // Atualizar tarefa
      const taskRef = doc(db, 'tasks', taskId);
      batch.update(taskRef, {
        status: 'feito',
        completedAt: Date.now()
      });

      // Atualizar ticket
      const ticketRef = doc(db, 'tickets', ticket.id);
      batch.update(ticketRef, {
        status: 'closed',
        closeDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      await batch.commit();

      alert('Tarefa concluída e chamado finalizado com sucesso!');
    } catch (error) {
      console.error('Erro ao finalizar:', error);
      alert('Erro ao finalizar');
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

      // Remover referências nas tarefas
      if (ticket?.tasks && ticket.tasks.length > 0) {
        const batch = writeBatch(db);
        for (const taskId of ticket.tasks) {
          const taskRef = doc(db, 'tasks', taskId);
          batch.update(taskRef, {
            ticketId: null,
            ticketNumber: null
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

      const matchesTasks =
        filterOptions.hasTasks === 'all' ||
        (filterOptions.hasTasks === 'yes' && ticket.tasks && ticket.tasks.length > 0) ||
        (filterOptions.hasTasks === 'no' && (!ticket.tasks || ticket.tasks.length === 0));

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

      return matchesSearch && matchesStatus && matchesClient && matchesStudies && matchesTasks && matchesDate;
    });
  }, [tickets, searchTerm, filterOptions]);

  // Limpar filtros
  const clearFilters = () => {
    setSearchTerm('');
    setFilterOptions({
      status: 'all',
      client: '',
      dateRange: 'all',
      hasStudies: 'all',
      hasTasks: 'all'
    });
  };

  const activeFiltersCount = Object.values(filterOptions).filter(v => v !== 'all' && v !== '').length + (searchTerm ? 1 : 0);

  // Obter tarefas vinculadas
  const getLinkedTasks = (ticket: Ticket) => {
    const taskIds = ticket.tasks || [];
    return tasks.filter(task => taskIds.includes(task.id));
  };

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
            <p className="text-zinc-400 mt-1">Gerencie seus chamados, tarefas e estudos</p>
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
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
            <p className="text-sm text-zinc-400">Com Tarefas</p>
            <p className="text-2xl font-bold text-sky-500">{stats.withTasks}</p>
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

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Tarefas</label>
                <select
                  value={filterOptions.hasTasks}
                  onChange={(e) => setFilterOptions(prev => ({ ...prev, hasTasks: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="all">Todos</option>
                  <option value="yes">Com tarefas</option>
                  <option value="no">Sem tarefas</option>
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
              const linkedTasks = getLinkedTasks(ticket);
              const hasPendingTasks = linkedTasks.some(task => task.status === 'pendente');
              const allTasksCompleted = linkedTasks.length > 0 && linkedTasks.every(task => task.status === 'feito');

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

                  {/* Tarefas Vinculadas */}
                  {linkedTasks.length > 0 && (
                    <div className="p-3 border-b border-zinc-800 bg-zinc-900/30">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckSquare size={14} className="text-sky-400" />
                        <span className="text-xs font-medium text-zinc-300">Tarefas Vinculadas</span>
                        <span className="text-xs text-zinc-500">
                          ({linkedTasks.filter(t => t.status === 'feito').length}/{linkedTasks.length})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {linkedTasks.map(task => (
                          <div key={task.id} className="flex items-center justify-between bg-zinc-800/30 rounded-lg p-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs ${task.status === 'feito' ? 'line-through text-zinc-500' : 'text-white'}`}>
                                  {task.title}
                                </span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${task.type === 'importante' ? 'bg-blue-500/20 text-blue-400' :
                                    task.type === 'urgente' ? 'bg-red-500/20 text-red-400' :
                                      'bg-zinc-500/20 text-zinc-400'
                                  }`}>
                                  {task.type === 'importante' ? '📌' : task.type === 'urgente' ? '⚠️' : '📝'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                                <Calendar size={10} />
                                <span>{new Date(task.date).toLocaleDateString('pt-BR')}</span>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {task.status !== 'feito' && ticket.status === 'open' && (
                                <button
                                  onClick={() => handleCompleteTaskAndTicket(ticket, task.id)}
                                  className="p-1 rounded hover:bg-green-500/10 transition-colors"
                                  title="Concluir tarefa e finalizar chamado"
                                >
                                  <CheckCircle size={14} className="text-green-400" />
                                </button>
                              )}
                              <button
                                onClick={() => handleUnlinkTask(ticket.id, task.id)}
                                className="p-1 rounded hover:bg-red-500/10 transition-colors"
                                title="Desvincular"
                              >
                                <X size={12} className="text-red-400" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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

                    <button
                      onClick={() => {
                        setSelectedTicket(ticket);
                        setIsLinkTaskModalOpen(true);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
                    >
                      <Target size={12} />
                      Vincular Tarefa
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

            {/* Modal para vincular tarefas */}
            <Dialog open={isLinkTaskModalOpen} onClose={() => setIsLinkTaskModalOpen(false)} className="relative z-50">
              <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
              <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="bg-zinc-900 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto border border-zinc-700">
                  <div className="p-6 border-b border-zinc-800">
                    <Dialog.Title className="text-xl font-bold text-white flex items-center gap-2">
                      <Target size={20} className="text-sky-400" />
                      Vincular Tarefa ao Chamado
                    </Dialog.Title>
                    <p className="text-sm text-zinc-400 mt-1">
                      Chamado: #{selectedTicket.ticketNumber} - {selectedTicket.clientName}
                    </p>
                  </div>

                  <div className="p-6">
                    {availableTasks.length === 0 ? (
                      <div className="text-center py-8">
                        <Target size={48} className="mx-auto text-zinc-600 mb-3" />
                        <p className="text-zinc-500">Nenhuma tarefa disponível para vincular</p>
                        <p className="text-zinc-600 text-sm mt-1">
                          Todas as tarefas já estão vinculadas ou concluídas
                        </p>
                        <Link
                          href="/produtividade"
                          className="inline-block mt-4 text-sky-400 hover:text-sky-300 text-sm"
                        >
                          Ir para Agenda →
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {availableTasks.map(task => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${task.status === 'feito' ? 'line-through text-zinc-500' : 'text-white'
                                  }`}>
                                  {task.title}
                                </span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${task.type === 'importante' ? 'bg-blue-500/20 text-blue-400' :
                                    task.type === 'urgente' ? 'bg-red-500/20 text-red-400' :
                                      'bg-zinc-500/20 text-zinc-400'
                                  }`}>
                                  {task.type === 'importante' ? '📌 Importante' :
                                    task.type === 'urgente' ? '⚠️ Urgente' : '📝 Circunstancial'}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                                <span className="flex items-center gap-1">
                                  <Calendar size={10} />
                                  {new Date(task.date).toLocaleDateString('pt-BR')}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock size={10} />
                                  {task.time || 'Sem horário'}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                handleLinkTask(task.id);
                                setIsLinkTaskModalOpen(false);
                              }}
                              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 rounded-lg text-sm transition-colors"
                            >
                              Vincular
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="p-6 border-t border-zinc-800 flex justify-end">
                    <button
                      onClick={() => setIsLinkTaskModalOpen(false)}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white"
                    >
                      Fechar
                    </button>
                  </div>
                </Dialog.Panel>
              </div>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
};

export default TicketsPage;