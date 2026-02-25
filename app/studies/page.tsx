'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Search, Folder } from 'lucide-react';
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
} from 'firebase/firestore';
import StudyModal, { Study } from './components/StudyModal';
import StudyCard from './components/StudyCard';
import StudyViewModal from './components/StudyViewModal';
import CategoryModal from './components/CategoryModal';

const StudiesPage = () => {
  const { user } = useAuth();
  const [studies, setStudies] = useState<Study[]>([]);
  const [tickets, setTickets] = useState<{ id: string; ticketNumber: string; clientName: string }[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isStudyViewOpen, setIsStudyViewOpen] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState<Study | null>(null);
  const [editingStudy, setEditingStudy] = useState<Study | undefined>(undefined);

  // Carrega categorias do Firestore
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'categories'), where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const categoriesData: string[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        categoriesData.push(data.name);
      });
      setCategories(categoriesData.sort());
    });

    return () => unsubscribe();
  }, [user]);

  // Carrega estudos do Firestore
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'studies'), where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const studiesData: Study[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        studiesData.push({
          id: doc.id,
          title: data.title,
          description: data.description || '',
          category: data.category,
          content: data.content,
          ticketIds: data.ticketIds || [],
          tags: data.tags || [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      });

      setStudies(studiesData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });

    return () => unsubscribe();
  }, [user]);

  // Carrega tickets para vincular
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'tickets'), where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ticketsData: typeof tickets = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        ticketsData.push({
          id: doc.id,
          ticketNumber: data.ticketNumber,
          clientName: data.clientName,
        });
      });
      setTickets(ticketsData);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCreateStudy = async (data: Omit<Study, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;

    try {
      const now = new Date().toISOString();
      const newStudyData = {
        ...data,
        userId: user.uid,
        createdAt: editingStudy ? editingStudy.createdAt : now,
        updatedAt: now,
      };

      if (editingStudy) {
        // Atualizar estudo existente
        const studyRef = doc(db, 'studies', editingStudy.id);
        await updateDoc(studyRef, newStudyData);
      } else {
        // Criar novo estudo
        await addDoc(collection(db, 'studies'), newStudyData);
      }

      setIsStudyModalOpen(false);
      setEditingStudy(undefined);
    } catch (error) {
      console.error('Erro ao salvar estudo:', error);
    }
  };

  const handleDeleteStudy = async (id: string) => {
    if (confirm('Tem certeza que deseja deletar este estudo?')) {
      try {
        await deleteDoc(doc(db, 'studies', id));
      } catch (error) {
        console.error('Erro ao deletar estudo:', error);
      }
    }
  };

  const handleAddCategory = async (categoryName: string) => {
    if (!user) return;

    try {
      const now = new Date().toISOString();
      const categoryData = {
        name: categoryName,
        userId: user.uid,
        createdAt: now,
      };

      await addDoc(collection(db, 'categories'), categoryData);
      setIsCategoryModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
    }
  };

  const ticketMap = Object.fromEntries(
    tickets.map(t => [t.id, { ticketNumber: t.ticketNumber, clientName: t.clientName }])
  );

  const filteredStudies = studies.filter((study) => {
    const matchesSearch = 
      study.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      study.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      study.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || study.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const categoriesWithAll = ['all', ...categories];

  return (
    <div className="w-full p-4 sm:p-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Estudos</h1>
          <p className="text-zinc-400 mt-1">Organize seus conhecimentos e aprendizados por categoria</p>
        </div>
        <div className="flex gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 hover:text-white hover:border-sky-500 transition-colors"
          >
            <Folder size={20} />
            Nova Categoria
          </button>
          <button
            onClick={() => {
              setEditingStudy(undefined);
              setIsStudyModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 rounded-lg text-white font-medium hover:bg-emerald-600 transition-colors"
          >
            <Plus size={20} />
            Novo Estudo
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 text-zinc-500" size={20} />
          <input
            type="text"
            placeholder="Buscar por título, descrição ou tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500 transition-colors"
        >
          <option value="all">Todas as Categorias</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Grid de Estudos */}
      {filteredStudies.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudies.map((study) => (
            <StudyCard
              key={study.id}
              study={study}
              onEdit={(s) => {
                setEditingStudy(s);
                setIsStudyModalOpen(true);
              }}
              onDelete={handleDeleteStudy}
              onView={(s) => {
                setSelectedStudy(s);
                setIsStudyViewOpen(true);
              }}
              ticketMap={ticketMap}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-zinc-400 text-lg">Nenhum estudo encontrado</p>
          <p className="text-zinc-500 text-sm mt-2">
            Clique em "Novo Estudo" para começar
          </p>
        </div>
      )}

      {/* Modais */}
      <StudyModal
        isOpen={isStudyModalOpen}
        onClose={() => {
          setIsStudyModalOpen(false);
          setEditingStudy(undefined);
        }}
        onSubmit={handleCreateStudy}
        study={editingStudy}
        categories={categories}
        availableTickets={tickets}
      />

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSubmit={handleAddCategory}
        existingCategories={categories}
      />

      {selectedStudy && (
        <StudyViewModal
          isOpen={isStudyViewOpen}
          onClose={() => setIsStudyViewOpen(false)}
          study={selectedStudy}
          ticketMap={ticketMap}
        />
      )}
    </div>
  );
};

export default StudiesPage;
