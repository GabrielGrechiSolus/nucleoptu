'use client';

import React from 'react';
import { Edit2, Trash2, Eye, MapPin } from 'lucide-react';
import { Study } from './StudyModal';

interface StudyCardProps {
  study: Study;
  onEdit: (study: Study) => void;
  onDelete: (id: string) => void;
  onView: (study: Study) => void;
  ticketMap?: { [key: string]: { ticketNumber: string; clientName: string } };
}

const StudyCard: React.FC<StudyCardProps> = ({
  study,
  onEdit,
  onDelete,
  onView,
  ticketMap = {},
}) => {
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 hover:border-zinc-600 transition-colors flex flex-col">
      <div className="flex justify-between items-start gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-white truncate">{study.title}</h3>
          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 mt-1">
            {study.category}
          </span>
        </div>

        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onView(study)}
            className="p-2 bg-zinc-700 rounded-lg hover:bg-sky-500/20 hover:border-sky-500/30 border border-transparent transition-colors text-zinc-400 hover:text-sky-400"
            title="Visualizar"
          >
            <Eye size={18} />
          </button>
          <button
            onClick={() => onEdit(study)}
            className="p-2 bg-zinc-700 rounded-lg hover:bg-blue-500/20 hover:border-blue-500/30 border border-transparent transition-colors text-zinc-400 hover:text-blue-400"
            title="Editar"
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={() => onDelete(study.id)}
            className="p-2 bg-zinc-700 rounded-lg hover:bg-red-500/20 hover:border-red-500/30 border border-transparent transition-colors text-zinc-400 hover:text-red-400"
            title="Deletar"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {study.description && (
        <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{study.description}</p>
      )}

      {study.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {study.tags.map(tag => (
            <span
              key={tag}
              className="inline-block px-2 py-0.5 bg-zinc-700 rounded text-xs text-zinc-300"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {study.ticketIds.length > 0 && (
        <div className="mt-auto pt-3 border-t border-zinc-700">
          <p className="text-xs text-zinc-500 mb-2 flex items-center gap-1">
            <MapPin size={12} />
            Vinculado a:
          </p>
          <div className="space-y-1">
            {study.ticketIds.map(ticketId => {
              const ticket = ticketMap[ticketId];
              return (
                <div key={ticketId} className="text-xs text-zinc-400">
                  {ticket ? `${ticket.ticketNumber} - ${ticket.clientName}` : `ID: ${ticketId}`}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-zinc-500 mt-3">
        {new Date(study.createdAt).toLocaleDateString('pt-BR')}
      </p>
    </div>
  );
};

export default StudyCard;
