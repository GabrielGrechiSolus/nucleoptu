'use client';

import React from 'react';
import { Edit2, Trash2, MessageSquare, BookOpen, ExternalLink } from 'lucide-react';
import { Ticket } from './TicketModal';

interface TicketCardProps {
  ticket: Ticket;
  onEdit: (ticket: Ticket) => void;
  onDelete: (id: string) => void;
  onOpenObservations: (ticket: Ticket) => void;
  onAddStudy: (ticket: Ticket) => void;
}

const TicketCard: React.FC<TicketCardProps> = ({
  ticket,
  onEdit,
  onDelete,
  onOpenObservations,
  onAddStudy,
}) => {
  const isOpen = ticket.status === 'open';

  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 hover:border-zinc-600 transition-colors">
      <div className="flex justify-between items-start gap-4 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-bold text-white">{ticket.ticketNumber}</h3>
            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
              isOpen 
                ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                : 'bg-green-500/20 text-green-400 border border-green-500/30'
            }`}>
              {isOpen ? 'Aberto' : 'Fechado'}
            </span>
          </div>
          <p className="text-zinc-300 font-medium">{ticket.clientName}</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onEdit(ticket)}
            className="p-2 bg-zinc-700 rounded-lg hover:bg-sky-500/20 hover:border-sky-500/30 border border-transparent transition-colors text-zinc-400 hover:text-sky-400"
            title="Editar"
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={() => onDelete(ticket.id)}
            className="p-2 bg-zinc-700 rounded-lg hover:bg-red-500/20 hover:border-red-500/30 border border-transparent transition-colors text-zinc-400 hover:text-red-400"
            title="Deletar"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3 text-sm text-zinc-400">
        <div>
          <span className="text-zinc-500">Abertura:</span> {new Date(ticket.openDate).toLocaleDateString('pt-BR')}
        </div>
        {ticket.closeDate && (
          <div>
            <span className="text-zinc-500">Fechamento:</span> {new Date(ticket.closeDate).toLocaleDateString('pt-BR')}
          </div>
        )}
      </div>

      {ticket.githubLinks.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-zinc-500 mb-1">Links do GitHub:</p>
          <div className="flex flex-wrap gap-1">
            {ticket.githubLinks.map((link, index) => (
              <a
                key={index}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-700/50 border border-zinc-600 rounded text-xs text-sky-400 hover:bg-zinc-700 transition-colors"
              >
                <ExternalLink size={12} />
                Repo
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-3 border-t border-zinc-700">
        <button
          onClick={() => onOpenObservations(ticket)}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-zinc-700/50 hover:bg-sky-500/20 border border-zinc-600 hover:border-sky-500/30 rounded-lg text-sm text-zinc-300 hover:text-sky-400 transition-colors"
        >
          <MessageSquare size={16} />
          Observações ({ticket.observations.length})
        </button>
        <button
          onClick={() => onAddStudy(ticket)}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-zinc-700/50 hover:bg-emerald-500/20 border border-zinc-600 hover:border-emerald-500/30 rounded-lg text-sm text-zinc-300 hover:text-emerald-400 transition-colors"
        >
          <BookOpen size={16} />
          Estudos ({ticket.studies.length})
        </button>
      </div>
    </div>
  );
};

export default TicketCard;
