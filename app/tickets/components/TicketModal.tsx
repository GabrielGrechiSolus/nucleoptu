'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export interface Ticket {
  id: string;
  ticketNumber: string;
  clientName: string;
  openDate: string;
  closeDate?: string;
  status: 'open' | 'closed';
  observations: Observation[];
  studies: string[];
  githubLinks: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Observation {
  id: string;
  text: string;
  createdAt: string;
}

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Ticket, 'id' | 'observations' | 'studies' | 'createdAt' | 'updatedAt'>) => void;
  ticket?: Ticket;
}

const TicketModal: React.FC<TicketModalProps> = ({ isOpen, onClose, onSubmit, ticket }) => {
  const [formData, setFormData] = useState({
    ticketNumber: '',
    clientName: '',
    openDate: '',
    closeDate: '',
    status: 'open' as 'open' | 'closed',
    githubLinks: [''],
  });

  useEffect(() => {
    if (ticket) {
      setFormData({
        ticketNumber: ticket.ticketNumber,
        clientName: ticket.clientName,
        openDate: ticket.openDate,
        closeDate: ticket.closeDate || '',
        status: ticket.status,
        githubLinks: ticket.githubLinks.length > 0 ? ticket.githubLinks : [''],
      });
    } else {
      setFormData({
        ticketNumber: '',
        clientName: '',
        openDate: '',
        closeDate: '',
        status: 'open',
        githubLinks: [''],
      });
    }
  }, [ticket, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGithubLinkChange = (index: number, value: string) => {
    const newLinks = [...formData.githubLinks];
    newLinks[index] = value;
    setFormData(prev => ({
      ...prev,
      githubLinks: newLinks
    }));
  };

  const addGithubLink = () => {
    setFormData(prev => ({
      ...prev,
      githubLinks: [...prev.githubLinks, '']
    }));
  };

  const removeGithubLink = (index: number) => {
    setFormData(prev => ({
      ...prev,
      githubLinks: prev.githubLinks.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      githubLinks: formData.githubLinks.filter(link => link.trim() !== ''),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">
            {ticket ? 'Editar Chamado' : 'Novo Chamado'}
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
                Número do Chamado *
              </label>
              <input
                type="text"
                name="ticketNumber"
                value={formData.ticketNumber}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
                placeholder="EX: #123456"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Nome do Cliente *
              </label>
              <input
                type="text"
                name="clientName"
                value={formData.clientName}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
                placeholder="Nome do cliente"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Data de Abertura *
              </label>
              <input
                type="date"
                name="openDate"
                value={formData.openDate}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Data de Fechamento
              </label>
              <input
                type="date"
                name="closeDate"
                value={formData.closeDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Status *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500 transition-colors"
              >
                <option value="open">Aberto</option>
                <option value="closed">Fechado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Links do GitHub
            </label>
            <div className="space-y-2">
              {formData.githubLinks.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => handleGithubLinkChange(index, e.target.value)}
                    className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
                    placeholder="https://github.com/..."
                  />
                  {formData.githubLinks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeGithubLink(index)}
                      className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors"
                    >
                      Remover
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addGithubLink}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-300 hover:text-white hover:border-sky-500 transition-colors"
              >
                + Adicionar Link
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
              className="px-4 py-2 bg-sky-500 rounded-lg text-white font-medium hover:bg-sky-600 transition-colors"
            >
              {ticket ? 'Atualizar' : 'Criar'} Chamado
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TicketModal;
