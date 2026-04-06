'use client';

import React, { useState } from 'react';
import {
  X,
  Edit3,
  Trash2,
  Clock,
  CheckCircle,
  AlertCircle,
  MessageCircle,
  BookOpen,
  Github,
  User,
  Tag,
  Calendar,
  Link as LinkIcon,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check
} from 'lucide-react';
import { Ticket, Observation } from './TicketModal';

interface TicketDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: Ticket;
  onEdit: (ticket: Ticket) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (ticket: Ticket) => void;
  onOpenObservations: (ticket: Ticket) => void;
  onAddStudy: (ticket: Ticket) => void;
  onDeleteObservation?: (ticketId: string, observationId: string) => void;
  formatDate: (date?: string) => string;
}

const TicketDetailModal = ({
  isOpen,
  onClose,
  ticket,
  onEdit,
  onDelete,
  onToggleStatus,
  onOpenObservations,
  onAddStudy,
  onDeleteObservation,
  formatDate
}: TicketDetailModalProps) => {
  const [activeTab, setActiveTab] = useState<'details' | 'observations' | 'studies'>('details');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const getStatusColor = (status: string) => {
    return status === 'open'
      ? 'bg-green-500/10 text-green-500 border-green-500/20'
      : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500 bg-red-500/10';
      case 'medium':
        return 'text-yellow-500 bg-yellow-500/10';
      case 'low':
        return 'text-blue-500 bg-blue-500/10';
      default:
        return 'text-zinc-400 bg-zinc-400/10';
    }
  };

  const getPriorityLabel = (priority?: string) => {
    switch (priority) {
      case 'high': return 'Alta';
      case 'medium': return 'Média';
      case 'low': return 'Baixa';
      default: return 'Não definida';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">
              Chamado #{ticket.ticketNumber}
            </h2>
            <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(ticket.status)}`}>
              {ticket.status === 'open' ? 'Aberto' : 'Fechado'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/50">
          <button
            onClick={() => setActiveTab('details')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition ${activeTab === 'details'
                ? 'text-sky-500 border-b-2 border-sky-500'
                : 'text-zinc-400 hover:text-white'
              }`}
          >
            Detalhes
          </button>
          <button
            onClick={() => setActiveTab('observations')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition ${activeTab === 'observations'
                ? 'text-sky-500 border-b-2 border-sky-500'
                : 'text-zinc-400 hover:text-white'
              }`}
          >
            Observações ({ticket.observations.length})
          </button>
          <button
            onClick={() => setActiveTab('studies')}
            className={`flex-1 px-4 py-2 text-sm font-medium transition ${activeTab === 'studies'
                ? 'text-sky-500 border-b-2 border-sky-500'
                : 'text-zinc-400 hover:text-white'
              }`}
          >
            Estudos ({ticket.studies?.length || 0})
          </button>
        </div>

        {/* Conteúdo - Scrollável */}
        <div className="overflow-y-auto p-4 max-h-[calc(90vh-120px)]">

          {/* Tab Detalhes */}
          {activeTab === 'details' && (
            <div className="space-y-4">
              {/* Informações principais */}
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-zinc-400 mb-3">Informações Gerais</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Cliente</p>
                    <p className="text-sm text-white flex items-center gap-2">
                      <User size={14} className="text-zinc-500" />
                      {ticket.clientName}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Prioridade</p>
                    <p className={`text-sm inline-flex items-center gap-1 px-2 py-1 rounded-full ${getPriorityColor(ticket.priority)}`}>
                      <AlertCircle size={12} />
                      {getPriorityLabel(ticket.priority)}
                    </p>
                  </div>

                  {ticket.category && (
                    <div>
                      <p className="text-xs text-zinc-500 mb-1">Categoria</p>
                      <p className="text-sm text-white flex items-center gap-2">
                        <Tag size={14} className="text-zinc-500" />
                        {ticket.category}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-zinc-500 mb-1">Número</p>
                    <p className="text-sm text-white font-mono">#{ticket.ticketNumber}</p>
                  </div>
                </div>
              </div>

              {/* Datas */}
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-zinc-400 mb-3">Datas</h3>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Abertura:</span>
                    <span className="text-sm text-white flex items-center gap-1">
                      <Calendar size={14} className="text-zinc-500" />
                      {formatDate(ticket.createdAt)}
                    </span>
                  </div>

                  {ticket.closeDate && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-zinc-500">Fechamento:</span>
                      <span className="text-sm text-white flex items-center gap-1">
                        <CheckCircle size={14} className="text-green-500" />
                        {formatDate(ticket.closeDate)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Última atualização:</span>
                    <span className="text-sm text-white">{formatDate(ticket.updatedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Descrição */}
              <div className="bg-zinc-800/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-zinc-400 mb-3">Descrição</h3>
                <p className="text-sm text-white whitespace-pre-wrap">
                  {ticket.description || 'Nenhuma descrição fornecida.'}
                </p>
              </div>

              {/* Links GitHub */}
              {ticket.githubLinks && ticket.githubLinks.length > 0 && (
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-zinc-400 mb-3">Links GitHub</h3>
                  <div className="space-y-2">
                    {ticket.githubLinks.map((link, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Github size={14} className="text-zinc-500 shrink-0" />
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-sky-500 hover:underline truncate flex-1"
                        >
                          {link}
                        </a>
                        <button
                          onClick={() => copyToClipboard(link)}
                          className="text-zinc-500 hover:text-white p-1"
                          title="Copiar link"
                        >
                          {copied ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab Observações */}
          {activeTab === 'observations' && (
            <div className="space-y-3">
              {ticket.observations.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle size={40} className="mx-auto text-zinc-700 mb-3" />
                  <p className="text-zinc-500">Nenhuma observação</p>
                  <p className="text-sm text-zinc-600 mt-1">
                    Clique em "Adicionar observação" para começar
                  </p>
                </div>
              ) : (
                ticket.observations.map((obs) => (
                  <div key={obs.id} className="bg-zinc-800/50 rounded-lg p-3 group relative">
                    <p className="text-sm text-white pr-6">{obs.text}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-zinc-500">
                        {formatDate(obs.createdAt)}
                        {obs.createdBy && ` • por ${obs.createdBy}`}
                      </span>
                    </div>
                    {onDeleteObservation && (
                      <button
                        onClick={() => onDeleteObservation(ticket.id, obs.id)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-500 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab Estudos */}
          {activeTab === 'studies' && (
            <div className="space-y-3">
              {!ticket.studies || ticket.studies.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen size={40} className="mx-auto text-zinc-700 mb-3" />
                  <p className="text-zinc-500">Nenhum estudo vinculado</p>
                  <p className="text-sm text-zinc-600 mt-1">
                    Clique em "Criar estudo" para vincular um estudo
                  </p>
                </div>
              ) : (
                <div className="grid gap-2">
                  {ticket.studies.map((studyId) => (
                    <div key={studyId} className="bg-zinc-800/50 rounded-lg p-3">
                      <p className="text-sm text-white">Estudo ID: {studyId}</p>
                      {/* Aqui você pode adicionar mais detalhes do estudo quando integrado */}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer com ações */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onEdit(ticket)}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-lg text-sm hover:bg-zinc-700 transition"
            >
              <Edit3 size={16} />
              Editar
            </button>

            <button
              onClick={() => onOpenObservations(ticket)}
              className="flex items-center gap-2 px-3 py-2 bg-zinc-800 rounded-lg text-sm hover:bg-zinc-700 transition"
            >
              <MessageCircle size={16} />
              Observações
            </button>

            <button
              onClick={() => onAddStudy(ticket)}
              className="flex items-center gap-2 px-3 py-2 bg-purple-500/10 text-purple-500 rounded-lg text-sm hover:bg-purple-500/20 transition"
            >
              <BookOpen size={16} />
              Criar Estudo
            </button>

            <button
              onClick={() => onToggleStatus(ticket)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ml-auto ${ticket.status === 'open'
                  ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
            >
              {ticket.status === 'open' ? (
                <>
                  <CheckCircle size={16} />
                  Fechar Chamado
                </>
              ) : (
                <>
                  <Clock size={16} />
                  Reabrir Chamado
                </>
              )}
            </button>

            <button
              onClick={() => onDelete(ticket.id)}
              className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-500 rounded-lg text-sm hover:bg-red-500/20 transition"
            >
              <Trash2 size={16} />
              Excluir
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailModal;