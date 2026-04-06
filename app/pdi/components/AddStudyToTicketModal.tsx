'use client';

import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { X, BookOpen, Tag, FileText, Link as LinkIcon, AlertCircle } from 'lucide-react';

type StudyPayload = {
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  url?: string;
  estimatedHours?: number;
  actualHours?: number;
  startDate?: string;
  endDate?: string;
  tags: string[];
  userId: string;
  tickets: string[];
};

interface AddStudyToTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: StudyPayload) => Promise<void>;
  ticketId: string;
  ticketNumber: string;
  ticketDescription?: string;
  categories: string[];
}

interface FormData {
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  url?: string;
  estimatedHours?: number;
  actualHours?: number;
  startDate?: string;
  endDate?: string;
  tags: string[];
}

const AddStudyToTicketModal: React.FC<AddStudyToTicketModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  ticketId,
  ticketNumber,
  ticketDescription,
  categories
}) => {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    category: '',
    status: 'pending',
    priority: 'medium',
    url: '',
    estimatedHours: undefined,
    actualHours: undefined,
    startDate: '',
    endDate: '',
    tags: []
  });
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Preencher título automaticamente baseado no chamado
  useEffect(() => {
    if (isOpen && ticketNumber) {
      setFormData(prev => ({
        ...prev,
        title: `Estudo - Chamado #${ticketNumber}`,
        description: ticketDescription || ''
      }));
    }
  }, [isOpen, ticketNumber, ticketDescription]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Título é obrigatório';
    }
    if (!formData.category) {
      newErrors.category = 'Categoria é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const studyData: StudyPayload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        status: formData.status,
        priority: formData.priority,
        url: formData.url || undefined,
        estimatedHours: formData.estimatedHours,
        actualHours: formData.actualHours,
        startDate: formData.startDate,
        endDate: formData.endDate,
        tags: formData.tags,
        userId: '', // será preenchido no componente pai
        tickets: [ticketId]
      };

      await onSubmit(studyData);
      handleClose();
    } catch (error) {
      console.error('Erro ao criar estudo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      status: 'pending',
      priority: 'medium',
      url: '',
      estimatedHours: undefined,
      actualHours: undefined,
      startDate: '',
      endDate: '',
      tags: []
    });
    setNewTag('');
    setErrors({});
    onClose();
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()]
      });
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(t => t !== tag)
    });
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/70" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-zinc-900 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-zinc-700">
          {/* Header */}
          <div className="sticky top-0 bg-zinc-900 p-6 border-b border-zinc-800">
            <div className="flex items-center justify-between">
              <div>
                <Dialog.Title className="text-xl font-bold text-white flex items-center gap-2">
                  <BookOpen size={24} className="text-purple-400" />
                  Criar Estudo a partir do Chamado
                </Dialog.Title>
                <p className="text-sm text-zinc-400 mt-1">
                  Chamado #{ticketNumber} - {ticketDescription?.substring(0, 50) || 'Sem descrição'}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X size={20} className="text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Formulário */}
          <div className="p-6 space-y-6">
            {/* Título */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Título do Estudo *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className={`w-full p-2 rounded-lg bg-zinc-800 border ${errors.title ? 'border-red-500' : 'border-zinc-700'
                  } text-white focus:border-sky-500 outline-none`}
                placeholder="Ex: Análise do chamado #12345"
              />
              {errors.title && (
                <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {errors.title}
                </p>
              )}
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Descrição
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="w-full p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-sky-500 outline-none resize-none"
                placeholder="Descreva o que será estudado, objetivos, etc."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Categoria */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Categoria *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className={`w-full p-2 rounded-lg bg-zinc-800 border ${errors.category ? 'border-red-500' : 'border-zinc-700'
                    } text-white focus:border-sky-500 outline-none`}
                >
                  <option value="">Selecione uma categoria</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {errors.category && (
                  <p className="text-xs text-red-400 mt-1">{errors.category}</p>
                )}
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-sky-500 outline-none"
                >
                  <option value="pending">Pendente</option>
                  <option value="in_progress">Em Andamento</option>
                  <option value="completed">Concluído</option>
                </select>
              </div>

              {/* Prioridade */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Prioridade
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                  className="w-full p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-sky-500 outline-none"
                >
                  <option value="low">Baixa</option>
                  <option value="medium">Média</option>
                  <option value="high">Alta</option>
                </select>
              </div>

              {/* URL */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Link de Referência
                </label>
                <input
                  type="url"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-sky-500 outline-none"
                  placeholder="https://..."
                />
              </div>

              {/* Horas Estimadas */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Horas Estimadas
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.estimatedHours || ''}
                  onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-sky-500 outline-none"
                  placeholder="Ex: 2.5"
                />
              </div>

              {/* Horas Reais */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Horas Reais
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.actualHours || ''}
                  onChange={(e) => setFormData({ ...formData, actualHours: e.target.value ? parseFloat(e.target.value) : undefined })}
                  className="w-full p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-sky-500 outline-none"
                  placeholder="Ex: 3.0"
                />
              </div>

              {/* Data Início */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Data de Início
                </label>
                <input
                  type="date"
                  value={formData.startDate || ''}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-sky-500 outline-none"
                />
              </div>

              {/* Data Término */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Data de Término
                </label>
                <input
                  type="date"
                  value={formData.endDate || ''}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-sky-500 outline-none"
                />
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Tags
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTag()}
                  className="flex-1 p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-sky-500 outline-none"
                  placeholder="Adicionar tag..."
                />
                <button
                  onClick={addTag}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white"
                >
                  Adicionar
                </button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 px-2 py-1 bg-sky-500/20 text-sky-400 rounded-full text-xs"
                    >
                      <Tag size={10} />
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:text-white"
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-zinc-900 p-6 border-t border-zinc-800 flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 rounded-lg text-white font-medium disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <BookOpen size={18} />
                  Criar Estudo
                </>
              )}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default AddStudyToTicketModal;