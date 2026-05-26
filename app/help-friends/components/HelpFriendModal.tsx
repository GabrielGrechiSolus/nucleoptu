'use client';

import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { HelpType, UrgencyLevel, HelpMode } from '../types';
import { useAuth } from '../../AuthContext';
import { db } from '../../../firebase';
import { collection, getDocs } from 'firebase/firestore';

interface HelpFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    ticketId: string;
    ticketNumber: string;
    helpMode: HelpMode;
    friendEmail?: string;
    friendName?: string;
    urgency: UrgencyLevel;
    helpType: HelpType;
    description: string;
  }) => Promise<void>;
  availableTickets: Array<{ id: string; ticketNumber: string; clientName: string }>;
}

const HelpFriendModal: React.FC<HelpFriendModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  availableTickets,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [friends, setFriends] = useState<Array<{ email: string; displayName: string }>>([]);
  const [friendSearch, setFriendSearch] = useState('');
  const [showFriendsList, setShowFriendsList] = useState(false);
  const [formData, setFormData] = useState({
    ticketId: '',
    helpMode: 'public' as HelpMode,
    friendEmail: '',
    friendName: '',
    urgency: 'medium' as UrgencyLevel,
    helpType: 'technical' as HelpType,
    description: '',
  });

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
    }
  }, [isOpen, user]);

  const fetchFriends = async () => {
    if (!user) return;
    try {
      // Busca todos os usuários a partir da coleção usada em /users
      const usersRef = collection(db, 'profiles');
      const snapshot = await getDocs(usersRef);
      
      const friendsList = snapshot.docs
        .map((doc) => ({
          email: doc.data().email,
          displayName: doc.data().name || doc.data().displayName || doc.data().email,
        }))
        .filter((friend) => friend.email !== user.email) // Exclui o próprio usuário
        .sort((a, b) => a.displayName.localeCompare(b.displayName));

      setFriends(friendsList);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      setFriends([]);
    }
  };

  const handleSelectTicket = (ticketId: string) => {
    const ticket = availableTickets.find(t => t.id === ticketId);
    setFormData(prev => ({
      ...prev,
      ticketId,
    }));
  };

  const handleModeChange = (mode: HelpMode) => {
    setFormData(prev => ({
      ...prev,
      helpMode: mode,
      friendEmail: mode === 'friend' ? prev.friendEmail : '',
      friendName: mode === 'friend' ? prev.friendName : '',
    }));
  };

  const handleSelectFriend = (email: string, displayName: string) => {
    setFormData(prev => ({
      ...prev,
      friendEmail: email,
      friendName: displayName,
    }));
    setFriendSearch(displayName);
    setShowFriendsList(false);
  };

  // Filtrar amigos pela busca
  const filteredFriends = friends.filter(friend =>
    friend.displayName.toLowerCase().includes(friendSearch.toLowerCase()) ||
    friend.email.toLowerCase().includes(friendSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.ticketId) {
      alert('Selecione um chamado');
      return;
    }

    if (formData.helpMode === 'friend' && !formData.friendEmail) {
      alert('Selecione um amigo');
      return;
    }

    const selectedTicket = availableTickets.find(t => t.id === formData.ticketId);
    if (!selectedTicket) {
      alert('Chamado inválido');
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        ticketId: formData.ticketId,
        ticketNumber: selectedTicket.ticketNumber,
        helpMode: formData.helpMode,
        friendEmail: formData.helpMode === 'friend' ? formData.friendEmail : undefined,
        friendName: formData.helpMode === 'friend' ? formData.friendName : undefined,
        urgency: formData.urgency,
        helpType: formData.helpType,
        description: formData.description,
      });
      setFormData({
        ticketId: '',
        helpMode: 'public',
        friendEmail: '',
        friendName: '',
        urgency: 'medium',
        helpType: 'technical',
        description: '',
      });
      setFriendSearch('');
      onClose();
    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
      alert('Erro ao criar solicitação de ajuda');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Pedir Ajuda</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Seleção de Chamado */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Chamado * <span className="text-zinc-500">(vinculado)</span>
            </label>
            <select
              value={formData.ticketId}
              onChange={(e) => handleSelectTicket(e.target.value)}
              required
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
            >
              <option value="">Selecione um chamado...</option>
              {availableTickets.map(ticket => (
                <option key={ticket.id} value={ticket.id}>
                  {ticket.ticketNumber} - {ticket.clientName}
                </option>
              ))}
            </select>
          </div>

          {/* Modo de Ajuda */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3">
              Como você quer pedir ajuda? *
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleModeChange('friend')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.helpMode === 'friend'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                }`}
              >
                <div className="font-medium text-white">👤 Amigo Específico</div>
                <div className="text-sm text-zinc-400 mt-1">Solicitar a alguém</div>
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('public')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  formData.helpMode === 'public'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600'
                }`}
              >
                <div className="font-medium text-white">🌐 Público</div>
                <div className="text-sm text-zinc-400 mt-1">Qualquer um pode ajudar</div>
              </button>
            </div>
          </div>

          {/* Seleção de Amigo (se modo = friend) */}
          {formData.helpMode === 'friend' && (
            <div className="relative">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Escolha um amigo *
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-3 text-zinc-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar por nome ou email..."
                  value={friendSearch}
                  onChange={(e) => {
                    setFriendSearch(e.target.value);
                    setShowFriendsList(true);
                  }}
                  onFocus={() => setShowFriendsList(true)}
                  className="w-full pl-10 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {/* Dropdown de Amigos */}
              {showFriendsList && filteredFriends.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                  {filteredFriends.map(friend => (
                    <button
                      key={friend.email}
                      type="button"
                      onClick={() => handleSelectFriend(friend.email, friend.displayName)}
                      className="w-full text-left px-4 py-2 hover:bg-zinc-700/50 transition-colors border-b border-zinc-700 last:border-b-0"
                    >
                      <div className="font-medium text-white">{friend.displayName}</div>
                      <div className="text-xs text-zinc-400">{friend.email}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Amigo selecionado */}
              {formData.friendEmail && (
                <div className="mt-2 p-2 bg-blue-500/10 border border-blue-500/50 rounded-lg">
                  <p className="text-sm text-blue-400">
                    ✓ {formData.friendName} ({formData.friendEmail})
                  </p>
                </div>
              )}

              {/* Nenhum resultado */}
              {showFriendsList && friendSearch && filteredFriends.length === 0 && (
                <div className="mt-2 p-2 text-sm text-zinc-400 text-center bg-zinc-800/50 rounded-lg">
                  Nenhum amigo encontrado
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Nível de Urgência */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Urgência *
              </label>
              <select
                value={formData.urgency}
                onChange={(e) => setFormData(prev => ({ ...prev, urgency: e.target.value as UrgencyLevel }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="low">🟢 Baixa</option>
                <option value="medium">🟡 Média</option>
                <option value="high">🔴 Alta</option>
              </select>
            </div>

            {/* Tipo de Ajuda */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Tipo de Ajuda *
              </label>
              <select
                value={formData.helpType}
                onChange={(e) => setFormData(prev => ({ ...prev, helpType: e.target.value as HelpType }))}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition-colors"
              >
                <option value="business">💼 Regra de Negócio</option>
                <option value="technical">🛠️ Técnico</option>
                <option value="independent">⚙️ Independente</option>
              </select>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Observações Adicionais
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors min-h-[120px] resize-vertical"
              placeholder="Descreva detalhadamente o que você precisa de ajuda..."
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white transition-colors font-medium"
            >
              {loading ? 'Criando...' : 'Criar Solicitação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HelpFriendModal;
