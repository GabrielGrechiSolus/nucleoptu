'use client';

import React from 'react';
import { X } from 'lucide-react';
import { Study } from './StudyModal';

interface StudyViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  study: Study | null;
  ticketMap?: { [key: string]: { ticketNumber: string; clientName: string } };
}

const StudyViewModal: React.FC<StudyViewModalProps> = ({
  isOpen,
  onClose,
  study,
  ticketMap = {},
}) => {
  if (!isOpen || !study) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-3xl max-h-screen overflow-y-auto">
        <div className="flex justify-between items-start gap-4 mb-4">
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-white mb-2">{study.title}</h2>
            <div className="flex items-center gap-2">
              <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {study.category}
              </span>
              <p className="text-sm text-zinc-400">
                {new Date(study.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors shrink-0"
          >
            <X size={24} />
          </button>
        </div>

        {study.description && (
          <div className="mb-6 p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
            <p className="text-zinc-300">{study.description}</p>
          </div>
        )}

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Conteúdo</h3>
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 text-zinc-300 whitespace-pre-wrap break-words">
            {study.content}
          </div>
        </div>

        {study.tags.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {study.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-block px-3 py-1 bg-zinc-700 rounded-full text-sm text-zinc-300"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {study.ticketIds.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3">Chamados Vinculados</h3>
            <div className="space-y-2">
              {study.ticketIds.map(ticketId => {
                const ticket = ticketMap[ticketId];
                return (
                  <div
                    key={ticketId}
                    className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg"
                  >
                    <p className="text-zinc-300">
                      {ticket 
                        ? `${ticket.ticketNumber} - ${ticket.clientName}`
                        : `Chamado ID: ${ticketId}`
                      }
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end pt-4 border-t border-zinc-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white hover:bg-zinc-700 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudyViewModal;
