'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
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
} from 'firebase/firestore';
import TicketModal, { Ticket, Observation } from './components/TicketModal';
import ObservationModal from './components/ObservationModal';
import TicketCard from './components/TicketCard';
import AddStudyToTicketModal from './components/AddStudyToTicketModal';
import { Study } from '../studies/components/StudyModal';

const TicketsPage = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'closed'>('all');
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [isObservationModalOpen, setIsObservationModalOpen] = useState(false);
  const [isAddStudyModalOpen, setIsAddStudyModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [editingTicket, setEditingTicket] = useState<Ticket | undefined>(undefined);
  const [categories, setCategories] = useState<string[]>([]);

  // Carrega tickets do Firestore
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'tickets'), where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ticketsData: Ticket[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        ticketsData.push({
          id: doc.id,
          ticketNumber: data.ticketNumber,
          clientName: data.clientName,
          openDate: data.openDate,
          closeDate: data.closeDate || undefined,
          status: data.status,
          observations: data.observations || [],
          studies: data.studies || [],
          githubLinks: data.githubLinks || [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });
      setTickets(ticketsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });

    return () => unsubscribe();
  }, [user]);

  // Carrega categorias de estudos
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'studies'), where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const categoriesSet = new Set<string>();
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        categoriesSet.add(data.category);
      });
      setCategories(Array.from(categoriesSet).sort());
    });

    return () => unsubscribe();
  }, [user]);

  const handleCreateTicket = async (data: Omit<Ticket, 'id' | 'observations' | 'studies' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;

    try {
      const now = new Date().toISOString();
      const newTicketData = {
        ...data,
        userId: user.uid,
        observations: [],
        studies: [],
        createdAt: now,
        updatedAt: now,
      };

      if (editingTicket) {
        // Atualizar ticket existente
        const ticketRef = doc(db, 'tickets', editingTicket.id);
        await updateDoc(ticketRef, {
          ...newTicketData,
          observations: editingTicket.observations,
          studies: editingTicket.studies,
          updatedAt: now,
        });
      } else {
        // Criar novo ticket
        await addDoc(collection(db, 'tickets'), newTicketData);
      }

      setIsTicketModalOpen(false);
      setEditingTicket(undefined);
    } catch (error) {
      console.error('Erro ao salvar chamado:', error);
    }
  };

  const handleDeleteTicket = async (id: string) => {
    if (confirm('Tem certeza que deseja deletar este chamado?')) {
      try {
        await deleteDoc(doc(db, 'tickets', id));
      } catch (error) {
        console.error('Erro ao deletar chamado:', error);
      }
    }
  };

  const handleAddObservation = async (text: string) => {
    if (!selectedTicket) return;

    const newObservation: Observation = {
      id: Date.now().toString(),
      text,
      createdAt: new Date().toISOString(),
    };

    const updatedObservations = [...selectedTicket.observations, newObservation];
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
    } catch (error) {
      console.error('Erro ao adicionar observação:', error);
    }
  };

  const handleCreateStudyFromTicket = async (data: Omit<Study, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;

    try {
      const now = new Date().toISOString();
      const newStudyData = {
        ...data,
        userId: user.uid,
        createdAt: now,
        updatedAt: now,
      };

      await addDoc(collection(db, 'studies'), newStudyData);
      setIsAddStudyModalOpen(false);
      setSelectedTicket(null);
    } catch (error) {
      console.error('Erro ao criar estudo:', error);
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch = 
      ticket.ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || ticket.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="w-full p-4 sm:p-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Chamados</h1>
          <p className="text-zinc-400 mt-1">Gerencie seus chamados, observações e estudos</p>
        </div>
        <button
          onClick={() => {
            setEditingTicket(undefined);
            setIsTicketModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-sky-500 rounded-lg text-white font-medium hover:bg-sky-600 transition-colors"
        >
          <Plus size={20} />
          Novo Chamado
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 text-zinc-500" size={20} />
          <input
            type="text"
            placeholder="Buscar por número ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as 'all' | 'open' | 'closed')}
          className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500 transition-colors"
        >
          <option value="all">Todos os Status</option>
          <option value="open">Abertos</option>
          <option value="closed">Fechados</option>
        </select>
      </div>

      {/* Grid de Chamados */}
      {filteredTickets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onEdit={(t) => {
                setEditingTicket(t);
                setIsTicketModalOpen(true);
              }}
              onDelete={handleDeleteTicket}
              onOpenObservations={(t) => {
                setSelectedTicket(t);
                setIsObservationModalOpen(true);
              }}
              onAddStudy={(ticket) => {
                // Será implementado com a integração de estudos
                console.log('Adicionar estudo ao chamado:', ticket);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-zinc-400 text-lg">Nenhum chamado encontrado</p>
          <p className="text-zinc-500 text-sm mt-2">
            Clique em "Novo Chamado" para começar
          </p>
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
            onClose={() => setIsObservationModalOpen(false)}
            onSubmit={handleAddObservation}
            observations={selectedTicket.observations}
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
            categories={categories}
          />
        </>
      )}
    </div>
  );
};

export default TicketsPage;
