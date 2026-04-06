'use client';

import React, { useState } from 'react';
import { 
  MoreHorizontal, 
  Edit3, 
  Trash2, 
  MessageCircle, 
  BookOpen,
  Github,
  Clock,
  CheckCircle,
  AlertCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  Tag,
  User,
  Calendar
} from 'lucide-react';
import { Ticket } from './TicketModal';
import TicketDetailModal from './TicketDetailModal';

interface TicketCardProps {
  ticket: Ticket;
  onEdit: (ticket: Ticket) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (ticket: Ticket) => void;
  onOpenObservations: (ticket: Ticket) => void;
  onAddStudy: (ticket: Ticket) => void;
  onDeleteObservation?: (ticketId: string, observationId: string) => void;
  isDeleting?: boolean;
}

const TicketCard = ({ 
  ticket, 
  onEdit, 
  onDelete, 
  onToggleStatus,
  onOpenObservations,
  onAddStudy,
  onDeleteObservation,
  isDeleting 
}: TicketCardProps) => {
  const [showOptions, setShowOptions] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatShortDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days < 1) return 'Hoje';
    if (days === 1) return 'Ontem';
    if (days < 7) return `${days} dias atrás`;
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date);
  };

  const getStatusColor = (status: string) => {
    return status === 'open' 
      ? 'text-green-500 bg-green-500/10 border-green-500/20' 
      : 'text-zinc-500 bg-zinc-500/10 border-zinc-500/20';
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-blue-500';
      default:
        return 'text-zinc-400';
    }
  };

  return (
    <>
      <div className={`bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 hover:border-zinc-700 transition-all group relative ${isDeleting ? 'opacity-50 pointer-events-none' : ''}`}>
        
        {/* Header compacto */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${getStatusColor(ticket.status)}`}>
              {ticket.status === 'open' ? 'Aberto' : 'Fechado'}
            </span>
            <span className="font-mono text-xs text-zinc-400 truncate">
              #{ticket.ticketNumber}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Botão de visualização rápida */}
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-zinc-500 hover:text-sky-500 transition p-1"
              title="Visualização rápida"
            >
              <Eye size={14} />
            </button>

            {/* Menu de opções */}
            <div className="relative">
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="text-zinc-500 hover:text-white transition p-1"
              >
                <MoreHorizontal size={14} />
              </button>

              {showOptions && (
                <div className="absolute right-0 mt-1 w-36 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-20">
                  <button
                    onClick={() => {
                      onEdit(ticket);
                      setShowOptions(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-700 flex items-center gap-2"
                  >
                    <Edit3 size={12} /> Editar
                  </button>
                  <button
                    onClick={() => {
                      onToggleStatus(ticket);
                      setShowOptions(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-zinc-700 flex items-center gap-2"
                  >
                    {ticket.status === 'open' ? (
                      <>
                        <CheckCircle size={12} /> Fechar
                      </>
                    ) : (
                      <>
                        <Clock size={12} /> Reabrir
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      onDelete(ticket.id);
                      setShowOptions(false);
                    }}
                    disabled={isDeleting}
                    className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-zinc-700 flex items-center gap-2 disabled:opacity-50"
                  >
                    <Trash2 size={12} /> Excluir
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Preview rápida (expansível) */}
        {showPreview && (
          <div className="mb-3 p-2 bg-zinc-800/50 rounded text-xs border-l-2 border-sky-500">
            <p className="text-zinc-300 line-clamp-2 mb-2">
              {ticket.description || 'Sem descrição'}
            </p>
            <div className="flex items-center gap-3 text-zinc-500">
              <span className="flex items-center gap-1">
                <User size={10} />
                {ticket.clientName}
              </span>
              {ticket.category && (
                <span className="flex items-center gap-1">
                  <Tag size={10} />
                  {ticket.category}
                </span>
              )}
              {ticket.priority && (
                <span className={`flex items-center gap-1 ${getPriorityColor(ticket.priority)}`}>
                  <AlertCircle size={10} />
                  {ticket.priority === 'high' ? 'Alta' : ticket.priority === 'medium' ? 'Média' : 'Baixa'}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Linha principal com informações resumidas */}
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-zinc-400 min-w-0">
            <User size={12} className="shrink-0" />
            <span className="truncate max-w-[100px]">{ticket.clientName}</span>
            
            {ticket.category && (
              <>
                <span className="text-zinc-600">•</span>
                <Tag size={12} className="shrink-0" />
                <span className="truncate max-w-[80px]">{ticket.category}</span>
              </>
            )}
          </div>

          <span className="text-zinc-600 shrink-0 ml-2" title={formatDate(ticket.createdAt)}>
            {formatShortDate(ticket.createdAt)}
          </span>
        </div>

        {/* Badges de atividades */}
        <div className="flex gap-2 mt-2">
          {/* Contador de observações */}
          {ticket.observations.length > 0 && (
            <button
              onClick={() => onOpenObservations(ticket)}
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-sky-500 transition"
              title={`${ticket.observations.length} observações`}
            >
              <MessageCircle size={12} />
              <span>{ticket.observations.length}</span>
            </button>
          )}

          {/* Contador de estudos */}
          {ticket.studies && ticket.studies.length > 0 && (
            <button
              onClick={() => onAddStudy(ticket)}
              className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition"
              title={`${ticket.studies.length} estudos vinculados`}
            >
              <BookOpen size={12} />
              <span>{ticket.studies.length}</span>
            </button>
          )}

          {/* Link do GitHub (ícone apenas) */}
          {ticket.githubLinks && ticket.githubLinks.length > 0 && (
            <a
              href={ticket.githubLinks[0]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 hover:text-white transition"
              title="Ver no GitHub"
            >
              <Github size={12} />
            </a>
          )}

          {/* Botão "Ver detalhes" */}
          <button
            onClick={() => setShowDetailModal(true)}
            className="ml-auto text-xs text-sky-500 hover:text-sky-400 transition"
          >
            Detalhes →
          </button>
        </div>

        {/* Loading overlay */}
        {isDeleting && (
          <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Modal de detalhes */}
      <TicketDetailModal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        ticket={ticket}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleStatus={onToggleStatus}
        onOpenObservations={onOpenObservations}
        onAddStudy={onAddStudy}
        onDeleteObservation={onDeleteObservation}
        formatDate={formatDate}
      />
    </>
  );
};

export default TicketCard;