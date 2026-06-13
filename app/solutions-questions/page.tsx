'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Plus, Search, X, MessageCircle, Users, Lock, Globe,
  CheckCircle2, HelpCircle, Clock, ChevronDown, Filter,
  RefreshCw, Send, BookOpen, Award, Pin, Eye, EyeOff,
  MessageSquare, ThumbsUp, Tag, Calendar, UserPlus, Link2,
  FileText, Sparkles, Zap, Shield, Star, TrendingUp, FolderKanban,
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
  arrayUnion,
  arrayRemove,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { Ticket } from '../tickets/components/TicketModal';

// ==================== TIPOS ====================

type QuestionVisibility = 'public' | 'specific' | 'private';
type QuestionStatus = 'open' | 'answered' | 'closed' | 'featured';
type QuestionCategory = 'technical' | 'business' | 'process' | 'product' | 'general';

interface Answer {
  id: string;
  content: string;
  authorEmail: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  isSolution: boolean;
  likes: string[];
  attachments?: string[];
}

interface Question {
  id: string;
  title: string;
  content: string;
  authorEmail: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  status: QuestionStatus;
  visibility: QuestionVisibility;
  category: QuestionCategory;
  tags: string[];
  allowedUsers: string[]; // emails dos usuários permitidos (quando visibility = 'specific')
  answers: Answer[];
  views: number;
  likes: string[];
  linkedTickets: string[]; // IDs dos tickets vinculados
  solutionAnswerId?: string;
  isAnonymous?: boolean;
  pinned?: boolean;
}

interface Solution {
  id: string;
  questionId: string;
  content: string;
  authorEmail: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  likes: string[];
  isOfficial: boolean;
  linkedTickets: string[];
  steps: string[];
  attachments?: string[];
}

// ==================== MODAIS ====================

interface QuestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  editingQuestion?: Question | null;
  availableTickets: Ticket[];
}

const QuestionModal: React.FC<QuestionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  editingQuestion,
  availableTickets,
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general' as QuestionCategory,
    visibility: 'public' as QuestionVisibility,
    tags: [] as string[],
    allowedUsers: [] as string[],
    linkedTickets: [] as string[],
    isAnonymous: false,
  });
  const [tagInput, setTagInput] = useState('');
  const [allowedUserInput, setAllowedUserInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingQuestion) {
      setFormData({
        title: editingQuestion.title,
        content: editingQuestion.content,
        category: editingQuestion.category,
        visibility: editingQuestion.visibility,
        tags: editingQuestion.tags,
        allowedUsers: editingQuestion.allowedUsers,
        linkedTickets: editingQuestion.linkedTickets,
        isAnonymous: editingQuestion.isAnonymous || false,
      });
    } else {
      setFormData({
        title: '',
        content: '',
        category: 'general',
        visibility: 'public',
        tags: [],
        allowedUsers: [],
        linkedTickets: [],
        isAnonymous: false,
      });
    }
  }, [editingQuestion]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) return;

    setSubmitting(true);
    try {
      // Cria um objeto sem o id se não for edição
      const submitData = editingQuestion
        ? { ...formData, id: editingQuestion.id }
        : formData;

      await onSubmit(submitData);
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const addAllowedUser = () => {
    if (allowedUserInput.trim() && !formData.allowedUsers.includes(allowedUserInput.trim())) {
      setFormData(prev => ({ ...prev, allowedUsers: [...prev.allowedUsers, allowedUserInput.trim()] }));
      setAllowedUserInput('');
    }
  };

  const removeAllowedUser = (email: string) => {
    setFormData(prev => ({ ...prev, allowedUsers: prev.allowedUsers.filter(e => e !== email) }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-zinc-800 shadow-2xl">
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/15 border border-blue-500/25">
              <MessageCircle size={20} className="text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-white">
              {editingQuestion ? 'Editar Pergunta' : 'Nova Pergunta'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X size={20} className="text-zinc-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Título *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Como resolver erro de autenticação no módulo X?"
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
          </div>

          {/* Conteúdo */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Descrição *
            </label>
            <textarea
              value={formData.content}
              onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Descreva sua dúvida em detalhes..."
              rows={5}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors resize-none"
              required
            />
          </div>

          {/* Categoria e Visibilidade */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Categoria
              </label>
              <select
                value={formData.category}
                onChange={e => setFormData(prev => ({ ...prev, category: e.target.value as QuestionCategory }))}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
              >
                <option value="technical">🛠️ Técnico</option>
                <option value="business">💼 Negócio</option>
                <option value="process">📋 Processo</option>
                <option value="product">📦 Produto</option>
                <option value="general">💬 Geral</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Visibilidade
              </label>
              <select
                value={formData.visibility}
                onChange={e => setFormData(prev => ({ ...prev, visibility: e.target.value as QuestionVisibility }))}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
              >
                <option value="public">🌐 Público (todos veem)</option>
                <option value="specific">👥 Específico (apenas alguns usuários)</option>
                <option value="private">🔒 Privado (só você)</option>
              </select>
            </div>
          </div>

          {/* Usuários permitidos (quando específico) */}
          {formData.visibility === 'specific' && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Usuários permitidos
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="email"
                  value={allowedUserInput}
                  onChange={e => setAllowedUserInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addAllowedUser())}
                  placeholder="email@exemplo.com"
                  className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={addAllowedUser}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors"
                >
                  <UserPlus size={20} />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.allowedUsers.map(email => (
                  <span key={email} className="flex items-center gap-1 px-2 py-1 bg-zinc-800 rounded-lg text-sm">
                    {email}
                    <button type="button" onClick={() => removeAllowedUser(email)} className="text-zinc-400 hover:text-red-400">
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Adicionar tag..."
                className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2.5 bg-zinc-700 hover:bg-zinc-600 rounded-xl transition-colors"
              >
                <Tag size={20} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-sm">
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)} className="text-blue-300 hover:text-red-300">
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Vincular Tickets */}
          {availableTickets.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Vincular chamados
              </label>
              <div className="space-y-2">
                {availableTickets.map(ticket => (
                  <label key={ticket.id} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl cursor-pointer hover:bg-zinc-800 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.linkedTickets.includes(ticket.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setFormData(prev => ({ ...prev, linkedTickets: [...prev.linkedTickets, ticket.id] }));
                        } else {
                          setFormData(prev => ({ ...prev, linkedTickets: prev.linkedTickets.filter(id => id !== ticket.id) }));
                        }
                      }}
                      className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-blue-500 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-white">#{ticket.ticketNumber}</span>
                      <p className="text-xs text-zinc-400">{ticket.description || 'Sem descrição'}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Opções adicionais */}
          <div className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isAnonymous}
                onChange={e => setFormData(prev => ({ ...prev, isAnonymous: e.target.checked }))}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-blue-500"
              />
              <span className="text-sm text-zinc-300">Postar anonimamente</span>
            </label>
          </div>

          {/* Ações */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Salvando...' : editingQuestion ? 'Atualizar' : 'Publicar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==================== MODAL DE SOLUÇÃO ====================

interface SolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  questionId: string;
  editingSolution?: Solution | null;
  availableTickets: Ticket[];
}

const SolutionModal: React.FC<SolutionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  questionId,
  editingSolution,
  availableTickets,
}) => {
  const [formData, setFormData] = useState({
    content: '',
    steps: [] as string[],
    linkedTickets: [] as string[],
    isOfficial: false,
  });
  const [stepInput, setStepInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingSolution) {
      setFormData({
        content: editingSolution.content,
        steps: editingSolution.steps,
        linkedTickets: editingSolution.linkedTickets,
        isOfficial: editingSolution.isOfficial || false,
      });
    } else {
      setFormData({
        content: '',
        steps: [],
        linkedTickets: [],
        isOfficial: false,
      });
    }
  }, [editingSolution]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        questionId,
        id: editingSolution?.id,
      });
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const addStep = () => {
    if (stepInput.trim()) {
      setFormData(prev => ({ ...prev, steps: [...prev.steps, stepInput.trim()] }));
      setStepInput('');
    }
  };

  const removeStep = (index: number) => {
    setFormData(prev => ({ ...prev, steps: prev.steps.filter((_, i) => i !== index) }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-zinc-800">
        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/25">
              <Award size={20} className="text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white">
              {editingSolution ? 'Editar Solução' : 'Nova Solução'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800">
            <X size={20} className="text-zinc-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Conteúdo */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Descrição da Solução *
            </label>
            <textarea
              value={formData.content}
              onChange={e => setFormData(prev => ({ ...prev, content: e.target.value }))}
              placeholder="Descreva a solução detalhadamente..."
              rows={4}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
              required
            />
          </div>

          {/* Passos */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Passos para implementação
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={stepInput}
                onChange={e => setStepInput(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addStep())}
                placeholder="Ex: 1. Acessar o módulo X..."
                className="flex-1 px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={addStep}
                className="px-4 py-2.5 bg-zinc-700 hover:bg-zinc-600 rounded-xl transition-colors"
              >
                <Plus size={20} />
              </button>
            </div>
            <div className="space-y-2">
              {formData.steps.map((step, index) => (
                <div key={index} className="flex items-center gap-2 p-2 bg-zinc-800/50 rounded-lg">
                  <span className="text-emerald-400 font-bold">{index + 1}.</span>
                  <span className="flex-1 text-sm text-white">{step}</span>
                  <button type="button" onClick={() => removeStep(index)} className="text-zinc-400 hover:text-red-400">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Vincular Tickets */}
          {availableTickets.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Vincular chamados a esta solução
              </label>
              <div className="space-y-2">
                {availableTickets.map(ticket => (
                  <label key={ticket.id} className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.linkedTickets.includes(ticket.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setFormData(prev => ({ ...prev, linkedTickets: [...prev.linkedTickets, ticket.id] }));
                        } else {
                          setFormData(prev => ({ ...prev, linkedTickets: prev.linkedTickets.filter(id => id !== ticket.id) }));
                        }
                      }}
                      className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-emerald-500"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-white">#{ticket.ticketNumber}</span>
                      <p className="text-xs text-zinc-400">{ticket.description || 'Sem descrição'}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Opções */}
          <div className="flex items-center gap-4 p-4 bg-zinc-800/50 rounded-xl">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isOfficial}
                onChange={e => setFormData(prev => ({ ...prev, isOfficial: e.target.checked }))}
                className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 text-emerald-500"
              />
              <span className="text-sm text-zinc-300">Marcar como solução oficial</span>
            </label>
          </div>

          {/* Ações */}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-medium transition-colors disabled:opacity-50">
              {submitting ? 'Salvando...' : editingSolution ? 'Atualizar' : 'Publicar Solução'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==================== CARD DE PERGUNTA ====================

interface QuestionCardProps {
  question: Question;
  currentUserEmail: string;
  onOpenDetails: (id: string) => void;
  onLike: (id: string) => void;
  onPin?: (id: string) => void;
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  currentUserEmail,
  onOpenDetails,
  onLike,
  onPin,
}) => {
  const getStatusIcon = () => {
    switch (question.status) {
      case 'answered': return <CheckCircle2 size={14} className="text-green-400" />;
      case 'closed': return <X size={14} className="text-red-400" />;
      case 'featured': return <Star size={14} className="text-yellow-400" />;
      default: return <HelpCircle size={14} className="text-blue-400" />;
    }
  };

  const getStatusText = () => {
    switch (question.status) {
      case 'answered': return 'Respondida';
      case 'closed': return 'Fechada';
      case 'featured': return 'Destaque';
      default: return 'Aberta';
    }
  };

  const getVisibilityIcon = () => {
    switch (question.visibility) {
      case 'public': return <Globe size={14} className="text-green-400" />;
      case 'specific': return <Users size={14} className="text-yellow-400" />;
      default: return <Lock size={14} className="text-red-400" />;
    }
  };

  return (
    <div className="group bg-zinc-900/70 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-all duration-200 hover:shadow-lg">
      {/* Pin Indicator */}
      {question.pinned && (
        <div className="absolute -top-2 left-4">
          <div className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full flex items-center gap-1">
            <Pin size={10} /> Fixado
          </div>
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
              {question.title}
            </h3>
            <div className="flex flex-wrap gap-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                ${question.status === 'open' ? 'bg-blue-500/20 text-blue-300' :
                  question.status === 'answered' ? 'bg-green-500/20 text-green-300' :
                    question.status === 'featured' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-red-500/20 text-red-300'}`}>
                {getStatusIcon()}
                {getStatusText()}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-800 rounded-full text-xs text-zinc-400">
                {getVisibilityIcon()}
                {question.visibility === 'public' ? 'Público' : question.visibility === 'specific' ? 'Específico' : 'Privado'}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-800 rounded-full text-xs text-zinc-400">
                <Tag size={10} />
                {question.category === 'technical' ? 'Técnico' :
                  question.category === 'business' ? 'Negócio' :
                    question.category === 'process' ? 'Processo' :
                      question.category === 'product' ? 'Produto' : 'Geral'}
              </span>
            </div>
          </div>
        </div>

        {/* Tags */}
        {question.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {question.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs text-blue-400/80">#{tag}</span>
            ))}
            {question.tags.length > 3 && (
              <span className="text-xs text-zinc-500">+{question.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Content Preview */}
        <p className="text-zinc-400 text-sm mb-4 line-clamp-2">
          {question.content}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <MessageSquare size={12} />
              {question.answers.length} respostas
            </span>
            <span className="flex items-center gap-1">
              <Eye size={12} />
              {question.views} visualizações
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {new Date(question.createdAt).toLocaleDateString('pt-BR')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onLike(question.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors
                ${question.likes.includes(currentUserEmail)
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
            >
              <ThumbsUp size={12} />
              {question.likes.length}
            </button>

            {onPin && question.authorEmail === currentUserEmail && (
              <button
                onClick={() => onPin(question.id)}
                className={`p-1 rounded-lg transition-colors
                  ${question.pinned ? 'text-yellow-400 bg-yellow-500/20' : 'text-zinc-500 hover:text-yellow-400'}`}
              >
                <Pin size={14} />
              </button>
            )}

            <button
              onClick={() => onOpenDetails(question.id)}
              className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg text-xs font-medium transition-colors"
            >
              Ver detalhes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== COMPONENTE PRINCIPAL ====================

const QuestionsPage = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [availableTickets, setAvailableTickets] = useState<Ticket[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<QuestionCategory | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<QuestionStatus | 'all'>('all');
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [isSolutionModalOpen, setIsSolutionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editingSolution, setEditingSolution] = useState<Solution | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [selectedQuestionForSolution, setSelectedQuestionForSolution] = useState<Question | null>(null);
  const [showAnswerForm, setShowAnswerForm] = useState(false);
  const [answerContent, setAnswerContent] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  // Carregar perguntas
  useEffect(() => {
    if (!user?.email) return;
    const userEmail = user.email;
    const q = query(collection(db, 'questions'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      const allQuestions: Question[] = [];
      snap.forEach(doc => {
        const data = doc.data() as Question;
        // Filtrar por visibilidade
        const isOwner = data.authorEmail === userEmail;
        const isPublic = data.visibility === 'public';
        const isAllowed = data.visibility === 'specific' && data.allowedUsers.includes(userEmail);
        const isPrivate = data.visibility === 'private' && isOwner;

        if (isOwner || isPublic || isAllowed || isPrivate) {
          allQuestions.push({ ...data, id: doc.id });
        }
      });
      setQuestions(allQuestions);
    });
  }, [user]);

  // Carregar soluções
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'solutions'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setSolutions(snap.docs.map(doc => ({ ...(doc.data() as Solution), id: doc.id })));
    });
  }, [user]);

  // Carregar tickets
  useEffect(() => {
    if (!user?.email) return;
    const userEmail = user.email;
    const q = query(collection(db, 'tickets'), where('userEmail', '==', userEmail));
    return onSnapshot(q, (snap) => {
      setAvailableTickets(snap.docs.map(d => ({ ...(d.data() as Ticket), id: d.id })));
    });
  }, [user]);

  // Actions
  const handleCreateQuestion = useCallback(async (data: any) => {
    if (!user?.email) return;
    const userEmail = user.email;

    // Remove qualquer id que possa ter vindo do formulário
    const { id, ...questionData } = data;

    await addDoc(collection(db, 'questions'), {
      ...questionData,  // Sem o campo id
      authorEmail: userEmail,
      authorName: questionData.isAnonymous ? 'Anônimo' : (user.displayName || userEmail.split('@')[0] || 'Usuário'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'open',
      answers: [],
      views: 0,
      likes: [],
      solutionAnswerId: null,
    });
  }, [user]);

  const handleUpdateQuestion = useCallback(async (data: any, questionId: string) => {
    await updateDoc(doc(db, 'questions', questionId), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const handleDeleteQuestion = useCallback(async (questionId: string) => {
    await deleteDoc(doc(db, 'questions', questionId));
  }, []);

  const handleCreateSolution = useCallback(async (data: any) => {
    if (!user?.email) return;
    const userEmail = user.email;
    await addDoc(collection(db, 'solutions'), {
      ...data,
      authorEmail: userEmail,
      authorName: user.displayName || userEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      likes: [],
    });

    // Atualizar o status da pergunta para 'answered'
    if (data.questionId) {
      await updateDoc(doc(db, 'questions', data.questionId), {
        status: 'answered',
        updatedAt: new Date().toISOString(),
      });
    }
  }, [user]);

  const handleUpdateSolution = useCallback(async (data: any, solutionId: string) => {
    await updateDoc(doc(db, 'solutions', solutionId), {
      ...data,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const handleDeleteSolution = useCallback(async (solutionId: string, questionId: string) => {
    await deleteDoc(doc(db, 'solutions', solutionId));
    // Atualizar pergunta se necessário
    const questionRef = doc(db, 'questions', questionId);
    const questionSnap = await getDoc(questionRef);
    if (questionSnap.exists()) {
      const questionData = questionSnap.data() as Question;
      if (questionData.solutionAnswerId === solutionId) {
        await updateDoc(questionRef, {
          solutionAnswerId: null,
          status: 'open',
        });
      }
    }
  }, []);

  const handleAddAnswer = useCallback(async (questionId: string, content: string) => {
    if (!user?.email || !content.trim()) return;
    const userEmail = user.email;

    const answer: Answer = {
      id: Date.now().toString(),
      content,
      authorEmail: userEmail,
      authorName: user.displayName || userEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSolution: false,
      likes: [],
    };

    const questionRef = doc(db, 'questions', questionId);
    const questionSnap = await getDoc(questionRef);
    if (questionSnap.exists()) {
      const questionData = questionSnap.data() as Question;
      await updateDoc(questionRef, {
        answers: [...(questionData.answers || []), answer],
        updatedAt: new Date().toISOString(),
      });
    }
  }, [user]);

  const handleMarkAsSolution = useCallback(async (questionId: string, answerId: string) => {
    const questionRef = doc(db, 'questions', questionId);
    const questionSnap = await getDoc(questionRef);
    if (questionSnap.exists()) {
      const questionData = questionSnap.data() as Question;
      const updatedAnswers = questionData.answers.map(a => ({
        ...a,
        isSolution: a.id === answerId,
      }));
      await updateDoc(questionRef, {
        answers: updatedAnswers,
        solutionAnswerId: answerId,
        status: 'answered',
        updatedAt: new Date().toISOString(),
      });
    }
  }, []);

  const handleLikeQuestion = useCallback(async (questionId: string) => {
    if (!user?.email) return;
    const userEmail = user.email;
    const questionRef = doc(db, 'questions', questionId);
    const questionSnap = await getDoc(questionRef);
    if (questionSnap.exists()) {
      const questionData = questionSnap.data() as Question;
      const hasLiked = questionData.likes.includes(userEmail);
      await updateDoc(questionRef, {
        likes: hasLiked ? arrayRemove(userEmail) : arrayUnion(userEmail),
      });
    }
  }, [user]);

  const handleLikeSolution = useCallback(async (solutionId: string) => {
    if (!user?.email) return;
    const userEmail = user.email;
    const solutionRef = doc(db, 'solutions', solutionId);
    const solutionSnap = await getDoc(solutionRef);
    if (solutionSnap.exists()) {
      const solutionData = solutionSnap.data() as Solution;
      const hasLiked = solutionData.likes.includes(userEmail);
      await updateDoc(solutionRef, {
        likes: hasLiked ? arrayRemove(userEmail) : arrayUnion(userEmail),
      });
    }
  }, [user]);

  const handlePinQuestion = useCallback(async (questionId: string) => {
    const questionRef = doc(db, 'questions', questionId);
    const questionSnap = await getDoc(questionRef);
    if (questionSnap.exists()) {
      const questionData = questionSnap.data() as Question;
      await updateDoc(questionRef, {
        pinned: !questionData.pinned,
      });
    }
  }, []);

  const handleIncrementViews = useCallback(async (questionId: string) => {
    const questionRef = doc(db, 'questions', questionId);
    const questionSnap = await getDoc(questionRef);
    if (questionSnap.exists()) {
      const questionData = questionSnap.data() as Question;
      await updateDoc(questionRef, {
        views: (questionData.views || 0) + 1,
      });
    }
  }, []);

  // Filtros
  const filteredQuestions = useMemo(() => {
    return questions.filter(q => {
      if (showOnlyMine && q.authorEmail !== user?.email) return false;
      if (selectedCategory !== 'all' && q.category !== selectedCategory) return false;
      if (selectedStatus !== 'all' && q.status !== selectedStatus) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return q.title.toLowerCase().includes(term) ||
          q.content.toLowerCase().includes(term) ||
          q.tags.some(t => t.toLowerCase().includes(term));
      }
      return true;
    });
  }, [questions, searchTerm, selectedCategory, selectedStatus, showOnlyMine, user?.email]);

  // Estatísticas
  const stats = useMemo(() => ({
    total: questions.length,
    open: questions.filter(q => q.status === 'open').length,
    answered: questions.filter(q => q.status === 'answered').length,
    featured: questions.filter(q => q.status === 'featured').length,
    myQuestions: questions.filter(q => q.authorEmail === user?.email).length,
  }), [questions, user?.email]);

  const solutionsByQuestion = useMemo(() => {
    const map = new Map<string, Solution[]>();
    solutions.forEach(s => {
      if (!map.has(s.questionId)) map.set(s.questionId, []);
      map.get(s.questionId)!.push(s);
    });
    return map;
  }, [solutions]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-emerald-400 to-purple-500" />

      <div className="max-w-screen-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-blue-500/25">
                <MessageCircle size={22} className="text-blue-400" />
              </div>
            </div>
            <p className="text-zinc-400 text-sm pl-[52px]">
              Faça perguntas, compartilhe conhecimento e encontre soluções
            </p>
          </div>

          <button
            onClick={() => {
              setEditingQuestion(null);
              setIsQuestionModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm
              bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400
              shadow-lg shadow-blue-900/30 transition-all duration-200 active:scale-95"
          >
            <Sparkles size={16} />
            Nova Pergunta
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-white">{stats.total}</div>
            <div className="text-xs text-zinc-500 mt-1">Total</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-400">{stats.open}</div>
            <div className="text-xs text-zinc-500 mt-1">Abertas</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{stats.answered}</div>
            <div className="text-xs text-zinc-500 mt-1">Respondidas</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">{stats.featured}</div>
            <div className="text-xs text-zinc-500 mt-1">Destaques</div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">{stats.myQuestions}</div>
            <div className="text-xs text-zinc-500 mt-1">Minhas</div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 space-y-3 backdrop-blur-sm">
          <div className="flex gap-2 flex-wrap">
            <div className="flex-1 min-w-[220px] flex items-center gap-2 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2">
              <Search size={15} className="text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar por título, conteúdo ou tags..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm text-white placeholder-zinc-600"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="text-zinc-500 hover:text-zinc-300">
                  <X size={14} />
                </button>
              )}
            </div>

            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value as any)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white"
            >
              <option value="all">Todas categorias</option>
              <option value="technical">🛠️ Técnico</option>
              <option value="business">💼 Negócio</option>
              <option value="process">📋 Processo</option>
              <option value="product">📦 Produto</option>
              <option value="general">💬 Geral</option>
            </select>

            <select
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value as any)}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white"
            >
              <option value="all">Todos status</option>
              <option value="open">🔵 Abertas</option>
              <option value="answered">🟢 Respondidas</option>
              <option value="featured">⭐ Destaques</option>
              <option value="closed">⚫ Fechadas</option>
            </select>

            <button
              onClick={() => setShowOnlyMine(!showOnlyMine)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all
                ${showOnlyMine
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50'
                  : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
            >
              <Users size={16} className="inline mr-1" />
              Minhas perguntas
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-500">
            {filteredQuestions.length} pergunta{filteredQuestions.length !== 1 ? 's' : ''} encontrada{filteredQuestions.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Questions Grid */}
        {filteredQuestions.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredQuestions.map(question => (
              <QuestionCard
                key={question.id}
                question={question}
                currentUserEmail={user?.email || ''}
                onOpenDetails={(id) => {
                  handleIncrementViews(id);
                  const q = questions.find(qq => qq.id === id);
                  if (q) setSelectedQuestion(q);
                }}
                onLike={handleLikeQuestion}
                onPin={question.authorEmail === user?.email ? handlePinQuestion : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center mb-4">
              <MessageCircle size={28} className="text-zinc-500" />
            </div>
            <p className="text-zinc-300 font-medium mb-1">Nenhuma pergunta encontrada</p>
            <p className="text-zinc-500 text-sm mb-6">Seja o primeiro a compartilhar uma dúvida ou conhecimento!</p>
            <button
              onClick={() => setIsQuestionModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-blue-600 hover:bg-blue-500"
            >
              <Plus size={16} />
              Criar Pergunta
            </button>
          </div>
        )}
      </div>

      {/* Question Detail Modal */}
      {selectedQuestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-zinc-900 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-zinc-800">
            <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-sm border-b border-zinc-800 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <MessageCircle size={20} className="text-blue-400" />
                <h2 className="text-xl font-bold text-white">{selectedQuestion.title}</h2>
              </div>
              <div className="flex items-center gap-2">
                {selectedQuestion.authorEmail === user?.email && (
                  <>
                    <button
                      onClick={() => {
                        setEditingQuestion(selectedQuestion);
                        setIsQuestionModalOpen(true);
                        setSelectedQuestion(null);
                      }}
                      className="p-2 rounded-lg hover:bg-zinc-800"
                    >
                      <FileText size={18} className="text-zinc-400" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Excluir esta pergunta?')) {
                          handleDeleteQuestion(selectedQuestion.id);
                          setSelectedQuestion(null);
                        }
                      }}
                      className="p-2 rounded-lg hover:bg-red-500/20"
                    >
                      <X size={18} className="text-red-400" />
                    </button>
                  </>
                )}
                <button onClick={() => setSelectedQuestion(null)} className="p-2 rounded-lg hover:bg-zinc-800">
                  <X size={20} className="text-zinc-400" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Question Content */}
              <div className="prose prose-invert max-w-none">
                <div className="flex items-center gap-2 text-sm text-zinc-500 mb-4">
                  <span>Por {selectedQuestion.authorName}</span>
                  <span>•</span>
                  <span>{new Date(selectedQuestion.createdAt).toLocaleDateString('pt-BR')}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Eye size={12} /> {selectedQuestion.views} views</span>
                </div>
                <p className="text-zinc-300 whitespace-pre-wrap">{selectedQuestion.content}</p>
              </div>

              {/* Linked Tickets */}
              {selectedQuestion.linkedTickets.length > 0 && (
                <div className="p-4 bg-zinc-800/50 rounded-xl">
                  <h4 className="text-sm font-medium text-zinc-300 mb-2 flex items-center gap-2">
                    <Link2 size={14} /> Chamados vinculados
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedQuestion.linkedTickets.map(ticketId => (
                      <span key={ticketId} className="px-2 py-1 bg-zinc-700 rounded-lg text-xs text-zinc-300">
                        #{ticketId.slice(-6)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Solutions Section */}
              {solutionsByQuestion.get(selectedQuestion.id) && solutionsByQuestion.get(selectedQuestion.id)!.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Award size={18} className="text-emerald-400" />
                    Soluções
                  </h3>
                  {solutionsByQuestion.get(selectedQuestion.id)!.map(solution => (
                    <div key={solution.id} className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-emerald-300">{solution.authorName}</span>
                          {solution.isOfficial && (
                            <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">Oficial</span>
                          )}
                        </div>
                        <button
                          onClick={() => handleLikeSolution(solution.id)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs
                            ${solution.likes.includes(user?.email || '')
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}
                        >
                          <ThumbsUp size={12} />
                          {solution.likes.length}
                        </button>
                      </div>
                      <p className="text-white text-sm mb-3">{solution.content}</p>
                      {solution.steps.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-sm font-medium text-zinc-300">Passos:</p>
                          <ol className="list-decimal list-inside space-y-1 text-sm text-zinc-400">
                            {solution.steps.map((step, idx) => (
                              <li key={idx}>{step}</li>
                            ))}
                          </ol>
                        </div>
                      )}
                      {solution.linkedTickets.length > 0 && (
                        <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                          <FolderKanban size={12} />
                          {solution.linkedTickets.length} chamado(s) vinculado(s)
                        </div>
                      )}
                      {solution.authorEmail === user?.email && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => {
                              setEditingSolution(solution);
                              setSelectedQuestionForSolution(selectedQuestion);
                              setIsSolutionModalOpen(true);
                            }}
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Excluir solução?')) {
                                handleDeleteSolution(solution.id, selectedQuestion.id);
                              }
                            }}
                            className="text-xs text-red-400 hover:text-red-300"
                          >
                            Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add Solution Button */}
              {selectedQuestion.authorEmail === user?.email && (
                <button
                  onClick={() => {
                    setSelectedQuestionForSolution(selectedQuestion);
                    setEditingSolution(null);
                    setIsSolutionModalOpen(true);
                  }}
                  className="w-full py-3 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/50 rounded-xl text-emerald-400 font-medium transition-colors"
                >
                  <Award size={16} className="inline mr-2" />
                  Adicionar Solução Oficial
                </button>
              )}

              {/* Answers Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MessageSquare size={18} />
                  Respostas ({selectedQuestion.answers.length})
                </h3>

                {selectedQuestion.answers.map(answer => (
                  <div key={answer.id} className="p-4 bg-zinc-800/50 rounded-xl">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-zinc-300">{answer.authorName}</span>
                        <span className="text-xs text-zinc-500">{new Date(answer.createdAt).toLocaleDateString()}</span>
                        {answer.isSolution && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1">
                            <CheckCircle2 size={10} /> Solução
                          </span>
                        )}
                      </div>
                      {selectedQuestion.authorEmail === user?.email && !answer.isSolution && (
                        <button
                          onClick={() => handleMarkAsSolution(selectedQuestion.id, answer.id)}
                          className="text-xs text-green-400 hover:text-green-300"
                        >
                          Marcar como solução
                        </button>
                      )}
                    </div>
                    <p className="text-zinc-400 text-sm whitespace-pre-wrap">{answer.content}</p>
                  </div>
                ))}

                {/* Answer Form */}
                {!showAnswerForm ? (
                  <button
                    onClick={() => setShowAnswerForm(true)}
                    className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 font-medium transition-colors"
                  >
                    <MessageCircle size={16} className="inline mr-2" />
                    Responder
                  </button>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      value={answerContent}
                      onChange={e => setAnswerContent(e.target.value)}
                      placeholder="Escreva sua resposta..."
                      rows={4}
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                    />
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowAnswerForm(false);
                          setAnswerContent('');
                        }}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={async () => {
                          setSubmittingAnswer(true);
                          await handleAddAnswer(selectedQuestion.id, answerContent);
                          setAnswerContent('');
                          setShowAnswerForm(false);
                          setSubmittingAnswer(false);
                        }}
                        disabled={!answerContent.trim() || submittingAnswer}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        <Send size={14} className="inline mr-1" />
                        Enviar resposta
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <QuestionModal
        isOpen={isQuestionModalOpen}
        onClose={() => {
          setIsQuestionModalOpen(false);
          setEditingQuestion(null);
        }}
        onSubmit={async (data) => {
          if (editingQuestion) {
            await handleUpdateQuestion(data, editingQuestion.id);
          } else {
            // Não passe o id para criação
            const { id, ...createData } = data;
            await handleCreateQuestion(createData);
          }
          setIsQuestionModalOpen(false);
          setEditingQuestion(null);
        }}
        editingQuestion={editingQuestion}
        availableTickets={availableTickets}
      />

      <SolutionModal
        isOpen={isSolutionModalOpen}
        onClose={() => {
          setIsSolutionModalOpen(false);
          setEditingSolution(null);
          setSelectedQuestionForSolution(null);
        }}
        onSubmit={async (data) => {
          if (editingSolution) {
            await handleUpdateSolution(data, editingSolution.id);
          } else {
            await handleCreateSolution(data);
          }
          setIsSolutionModalOpen(false);
          setEditingSolution(null);
          setSelectedQuestionForSolution(null);
        }}
        questionId={selectedQuestionForSolution?.id || ''}
        editingSolution={editingSolution}
        availableTickets={availableTickets}
      />
    </div>
  );
};

export default QuestionsPage;