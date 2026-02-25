'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Study } from '../../studies/components/StudyModal';

interface AddStudyToTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Study, 'id' | 'createdAt' | 'updatedAt'>) => void;
  ticketId: string;
  ticketNumber: string;
  categories: string[];
}

const AddStudyToTicketModal: React.FC<AddStudyToTicketModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  ticketId,
  ticketNumber,
  categories,
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    content: '',
    ticketIds: [ticketId] as string[],
    tags: [''],
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '',
        description: '',
        category: '',
        content: '',
        ticketIds: [ticketId],
        tags: [''],
      });
    }
  }, [isOpen, ticketId]);

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
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">
            Novo Estudo
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-4 p-3 bg-sky-500/10 border border-sky-500/30 rounded-lg">
          <p className="text-sm text-sky-400">
            <span className="font-medium">Vinculado ao chamado:</span> {ticketNumber}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Título do Estudo *
            </label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
              placeholder="Qual foi seu aprendizado?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Categoria *
            </label>
            <div className="flex gap-2">
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500 transition-colors"
              >
                <option value="">Selecione uma categoria</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Se não encontrar a categoria, crie uma na tela de Estudos
            </p>
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
              placeholder="Breve descrição do aprendizado"
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
              placeholder="Detalhe seu aprendizado, insights, soluções encontradas, etc..."
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
                    placeholder="Ex: React, Bug Fix"
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
              Criar Estudo
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStudyToTicketModal;
