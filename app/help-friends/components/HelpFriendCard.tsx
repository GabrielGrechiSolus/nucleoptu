'use client';

import React from 'react';
import { HelpFriend } from '../types';
import { Clock, User, AlertCircle, Zap } from 'lucide-react';

interface HelpFriendCardProps {
  helpFriend: HelpFriend;
  onOpenDetails: (id: string) => void;
  isOwner: boolean;
  currentUserEmail: string;
}

const HelpFriendCard: React.FC<HelpFriendCardProps> = ({
  helpFriend,
  onOpenDetails,
  isOwner,
  currentUserEmail,
}) => {
  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'low':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-500/20 text-blue-400';
      case 'in-progress':
        return 'bg-purple-500/20 text-purple-400';
      case 'resolved':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'closed':
        return 'bg-gray-500/20 text-gray-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getHelpTypeIcon = (type: string) => {
    switch (type) {
      case 'business':
        return '💼';
      case 'technical':
        return '🛠️';
      case 'independent':
        return '⚙️';
      default:
        return '❓';
    }
  };

  const getHelpTypeLabel = (type: string) => {
    switch (type) {
      case 'business':
        return 'Regra de Negócio';
      case 'technical':
        return 'Técnico';
      case 'independent':
        return 'Independente';
      default:
        return type;
    }
  };

  const isDirectedToMe = helpFriend.helpMode === 'friend' && helpFriend.friendEmail === currentUserEmail;
  const cardBorderClass = isDirectedToMe ? 'border-emerald-400/30 shadow-lg shadow-emerald-500/10' : 'border-zinc-700';
  const createdDate = new Date(helpFriend.createdAt).toLocaleDateString('pt-BR');

  return (
    <div
      onClick={() => onOpenDetails(helpFriend.id)}
      className={`bg-zinc-800 ${cardBorderClass} rounded-lg p-4 hover:border-blue-500/50 transition-all cursor-pointer hover:shadow-lg hover:shadow-blue-500/10`}
    >
      <div className="space-y-3">
        {/* Header: Ticket e Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold text-white">
                {helpFriend.ticketNumber}
              </h3>
              {isDirectedToMe && (
                <span className="text-emerald-400 text-xs font-semibold uppercase tracking-[0.1em]">
                  Pedido para você
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-400 mt-1">
              {helpFriend.helpMode === 'friend'
                ? `👤 Pedido para ${helpFriend.friendName || 'Amigo'}`
                : '🌐 Solicitação Pública'}
            </p>
            <p className="text-sm text-zinc-500 mt-1">
              Solicitante: {helpFriend.requesterName}
            </p>
          </div>
          <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(helpFriend.status)}`}>
            {helpFriend.status === 'open' && 'Aberta'}
            {helpFriend.status === 'in-progress' && 'Em Progresso'}
            {helpFriend.status === 'resolved' && 'Resolvida'}
            {helpFriend.status === 'closed' && 'Fechada'}
          </div>
        </div>

        {/* Descrição */}
        {helpFriend.description && (
          <p className="text-sm text-zinc-300 line-clamp-2">
            {helpFriend.description}
          </p>
        )}

        {/* Tags: Urgência, Tipo, Modo */}
        <div className="flex flex-wrap gap-2">
          <span className={`px-2 py-1 text-xs font-medium rounded border ${getUrgencyColor(helpFriend.urgency)}`}>
            {helpFriend.urgency === 'high' && '🔴 Alta'}
            {helpFriend.urgency === 'medium' && '🟡 Média'}
            {helpFriend.urgency === 'low' && '🟢 Baixa'}
          </span>
          <span className="px-2 py-1 text-xs font-medium rounded bg-blue-500/20 text-blue-400 border border-blue-500/50">
            {getHelpTypeIcon(helpFriend.helpType)} {getHelpTypeLabel(helpFriend.helpType)}
          </span>
        </div>

        {/* Footer: Info e Datas */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-700 text-xs text-zinc-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <User size={14} />
              {isOwner ? 'Você' : helpFriend.requesterName}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {createdDate}
            </span>
          </div>
          {helpFriend.helperName && (
            <span className="text-emerald-400 flex items-center gap-1">
              <Zap size={14} />
              {helpFriend.helperName}
            </span>
          )}
          {helpFriend.helpMode === 'friend' && !isDirectedToMe && !isOwner && (
            <span className="text-zinc-400 text-xs">Pedido direcionado a {helpFriend.friendName}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpFriendCard;
