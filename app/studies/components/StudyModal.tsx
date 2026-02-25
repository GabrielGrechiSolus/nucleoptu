'use client';

import React, { useState } from 'react';
import { X, Search } from 'lucide-react';

export interface Study {
  id: string;
  title: string;
  description: string;
  category: string;
  content: string;
  ticketIds: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface StudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Study, 'id' | 'createdAt' | 'updatedAt'>) => void;
  study?: Study;
  categories: string[];
  availableTickets: { id: string; ticketNumber: string; clientName: string }[];
}

const StudyModal: React.FC<StudyModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  study,
  categories,
  availableTickets,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    content: '',
    ticketIds: [] as string[],
    tags: [''],
  });

  const [ticketSearch, setTicketSearch] = useState('');
  const [showTicketResults, setShowTicketResults] = useState(false);

  React.useEffect(() => {
    if (study) {
      setFormData({
        title: study.title,
        description: study.description,
        category: study.category,
        content: study.content,
        ticketIds: study.ticketIds,
        tags: study.tags.length > 0 ? study.tags : [''],
      });
    } else {
      setFormData({
        title: '',
        description: '',
        category: '',
        content: '',
        ticketIds: [],
        tags: [''],
      });
    }
    setTicketSearch('');
  }, [study, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTagChange = (index: number, value: string) => {
    const newTags = [...formData.tags];
    newTags[index] = value;
    setFormData(prev => ({
      ...prev,
      tags: newTags
    }));
  };

  const addTag = () => {
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, '']
    }));
  };

  const removeTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  const toggleTicket = (ticketId: string) => {
    setFormData(prev => ({
      ...prev,
      ticketIds: prev.ticketIds.includes(ticketId)
        ? prev.ticketIds.filter(id => id !== ticketId)
        : [...prev.ticketIds, ticketId]
    }));
  };

  // Filtrar chamados baseado na busca
  const filteredTickets = availableTickets.filter(ticket =>
    ticket.ticketNumber.toLowerCase().includes(ticketSearch.toLowerCase()) ||
    ticket.clientName.toLowerCase().includes(ticketSearch.toLowerCase())
  ).slice(0, 8); // Limitar a 8 resultados

  const selectedTicketsList = availableTickets.filter(t => formData.ticketIds.includes(t.id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      tags: formData.tags.filter(tag => tag.trim() !== ''),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-3xl max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">
            {study ? 'Editar Estudo' : 'Novo Estudo'}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Título *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
                placeholder="Título do estudo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Categoria *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500 transition-colors"
              >
                <option value="">Selecione uma categoria</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Descrição
            </label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
              placeholder="Breve descrição do estudo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Conteúdo *
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleInputChange}
              required
              rows={6}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-colors resize-none"
              placeholder="Conteúdo do estudo..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Tags
            </label>
            <div className="space-y-2">
              {formData.tags.map((tag, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={tag}
                    onChange={(e) => handleTagChange(index, e.target.value)}
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
                    placeholder="Ex: React, TypeScript"
                  />
                  {formData.tags.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTag(index)}
                      className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      Remover
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addTag}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 hover:text-white hover:border-sky-500 transition-colors"
              >
                + Adicionar Tag
              </button>
            </div>
          </div>

          {availableTickets.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Vincular a Chamados
              </label>

              <div className="relative">
                <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 focus-within:border-sky-500 transition-colors">
                  <Search size={18} className="text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Buscar chamado por número ou cliente..."
                    value={ticketSearch}
                    onChange={(e) => {
                      setTicketSearch(e.target.value);
                      setShowTicketResults(true);
                    }}
                    onFocus={() => setShowTicketResults(true)}
                    className="flex-1 bg-transparent text-white placeholder-zinc-500 outline-none"
                  />
                </div>

                {/* Resultados da busca - Dropdown */}
                {showTicketResults && ticketSearch && filteredTickets.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                    {filteredTickets.map(ticket => (
                      <button
                        key={ticket.id}
                        type="button"
                        onClick={() => {
                          if (!formData.ticketIds.includes(ticket.id)) {
                            toggleTicket(ticket.id);
                          }
                          setTicketSearch('');
                          setShowTicketResults(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-zinc-700 transition-colors border-b border-zinc-700 last:border-b-0 text-zinc-300 hover:text-white"
                      >
                        <div className="font-medium">{ticket.ticketNumber}</div>
                        <div className="text-xs text-zinc-400">{ticket.clientName}</div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Mostrar "sem resultados" */}
                {showTicketResults && ticketSearch && filteredTickets.length === 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-center text-xs text-zinc-400">
                    Nenhum chamado encontrado
                  </div>
                )}
              </div>

              {/* Chamados selecionados como Chips */}
              {selectedTicketsList.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedTicketsList.map(ticket => (
                    <div
                      key={ticket.id}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-sky-500/20 border border-sky-500/50 rounded-full text-sm text-sky-400 hover:bg-sky-500/30 transition-colors group"
                    >
                      <span>{ticket.ticketNumber}</span>
                      <button
                        type="button"
                        onClick={() => toggleTicket(ticket.id)}
                        className="ml-1 opacity-70 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-zinc-400 mt-2">
                {selectedTicketsList.length} chamado(s) selecionado(s)
              </p>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white hover:bg-zinc-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-500 rounded-lg text-white font-medium hover:bg-emerald-600 transition-colors"
            >
              {study ? 'Atualizar' : 'Criar'} Estudo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudyModal;
