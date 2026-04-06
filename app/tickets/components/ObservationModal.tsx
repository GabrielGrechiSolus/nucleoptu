'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Observation } from './TicketModal';

interface ObservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
  observations: Observation[];
  ticketId: string;
  onDeleteObservation?: (obsId: string) => void;
}

const ObservationModal: React.FC<ObservationModalProps> = ({ isOpen, onClose, onSubmit, observations, ticketId, onDeleteObservation }) => {
  const [observationText, setObservationText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (observationText.trim()) {
      onSubmit(observationText);
      setObservationText('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Observações</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Nova Observação
            </label>
            <textarea
              value={observationText}
              onChange={(e) => setObservationText(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-colors resize-none"
              placeholder="Digite sua observação aqui..."
            />
            <p className="text-xs text-zinc-400 mt-1">
              A data e hora serão registradas automaticamente
            </p>
          </div>

          <button
            type="submit"
            className="w-full px-4 py-2 bg-sky-500 rounded-lg text-white font-medium hover:bg-sky-600 transition-colors"
          >
            Adicionar Observação
          </button>
        </form>

        {observations.length > 0 && (
          <div className="mt-6 pt-6 border-t border-zinc-700">
            <h3 className="text-lg font-bold text-white mb-4">Histórico de Observações</h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {observations.map((obs) => (
                <div key={obs.id} className="bg-zinc-800 border border-zinc-700 rounded-lg p-3">
                  <p className="text-white text-sm">{obs.text}</p>
                  <p className="text-xs text-zinc-400 mt-2">
                    {new Date(obs.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end pt-4 mt-6 border-t border-zinc-700">
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

export default ObservationModal;
