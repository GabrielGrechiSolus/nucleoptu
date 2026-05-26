'use client';

import React, { useState } from 'react';
import { X, User, Clock, AlertCircle, FileText, CheckCircle2, XCircle } from 'lucide-react';
import { HelpFriend } from '../types';

interface HelpDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  helpFriend: HelpFriend | null;
  currentUserEmail: string;
  onAccept?: (requiresRelatus: boolean) => Promise<void>;
  onResolve?: (resolution: string) => Promise<void>;
  onReject?: () => Promise<void>;
  onClose2?: () => Promise<void>;
  onEdit?: () => void;
  onDelete?: () => Promise<void>;
}

const HelpDetailModal: React.FC<HelpDetailModalProps> = ({
  isOpen,
  onClose,
  helpFriend,
  currentUserEmail,
  onAccept,
  onResolve,
  onReject,
  onClose2,
  onEdit,
  onDelete,
}) => {
  const [loading, setLoading] = useState(false);
  const [resolutionText, setResolutionText] = useState('');
  const [showResolutionForm, setShowResolutionForm] = useState(false);
  const [requiresRelatus, setRequiresRelatus] = useState(false);

  if (!isOpen || !helpFriend) return null;

  const isRequester = helpFriend.requesterEmail === currentUserEmail;
  const isHelper = helpFriend.helperEmail === currentUserEmail;
  const isFriendRequest = helpFriend.helpMode === 'friend' && helpFriend.friendEmail === currentUserEmail;
  const isDirectedToMe = helpFriend.helpMode === 'friend' && helpFriend.friendEmail === currentUserEmail;

  const handleAccept = async () => {
    if (!onAccept) return;
    try {
      setLoading(true);
      await onAccept(requiresRelatus);
      onClose();
    } catch (error) {
      console.error('Erro ao aceitar:', error);
      alert('Erro ao aceitar a solicitação');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!onResolve || !resolutionText.trim()) {
      alert('Descreva a resolução');
      return;
    }
    try {
      setLoading(true);
      await onResolve(resolutionText);
      setResolutionText('');
      setShowResolutionForm(false);
      onClose();
    } catch (error) {
      console.error('Erro ao resolver:', error);
      alert('Erro ao resolver a solicitação');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!onReject) return;
    if (!confirm('Tem certeza que deseja rejeitar esta solicitação?')) return;
    try {
      setLoading(true);
      await onReject();
      onClose();
    } catch (error) {
      console.error('Erro ao rejeitar:', error);
      alert('Erro ao rejeitar a solicitação');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = async () => {
    if (!onClose2) return;
    if (!confirm('Tem certeza que deseja fechar esta solicitação?')) return;
    try {
      setLoading(true);
      await onClose2();
      onClose();
    } catch (error) {
      console.error('Erro ao fechar:', error);
      alert('Erro ao fechar a solicitação');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm('Tem certeza que deseja excluir esta solicitação permanentemente?')) return;
    try {
      setLoading(true);
      await onDelete();
      onClose();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir a solicitação');
    } finally {
      setLoading(false);
    }
  };

  const getHelpTypeLabel = (type: string) => {
    switch (type) {
      case 'business':
        return '💼 Regra de Negócio';
      case 'technical':
        return '🛠️ Técnico';
      case 'independent':
        return '⚙️ Independente';
      default:
        return type;
    }
  };

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return '🔴 Alta';
      case 'medium':
        return '🟡 Média';
      case 'low':
        return '🟢 Baixa';
      default:
        return urgency;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            Detalhes - {helpFriend.ticketNumber}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Status Badge */}
          <div className="flex flex-wrap items-center gap-2">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              helpFriend.status === 'open'
                ? 'bg-blue-500/20 text-blue-400'
                : helpFriend.status === 'in-progress'
                ? 'bg-purple-500/20 text-purple-400'
                : helpFriend.status === 'resolved'
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-gray-500/20 text-gray-400'
            }`}>
              {helpFriend.status === 'open' && 'Aberta'}
              {helpFriend.status === 'in-progress' && 'Em Progresso'}
              {helpFriend.status === 'resolved' && 'Resolvida'}
              {helpFriend.status === 'closed' && 'Fechada'}
            </div>
            {isDirectedToMe && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Pedido direcionado a você
              </span>
            )}
          </div>

          {/* Info Básicas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-800/50 p-3 rounded-lg">
              <p className="text-xs text-zinc-400 mb-1">Solicitante</p>
              <p className="text-white font-medium">{helpFriend.requesterName}</p>
              <p className="text-xs text-zinc-500">{helpFriend.requesterEmail}</p>
            </div>
            <div className="bg-zinc-800/50 p-3 rounded-lg">
              <p className="text-xs text-zinc-400 mb-1">Data de Criação</p>
              <p className="text-white font-medium">
                {new Date(helpFriend.createdAt).toLocaleDateString('pt-BR')}
              </p>
              <p className="text-xs text-zinc-500">
                {new Date(helpFriend.createdAt).toLocaleTimeString('pt-BR')}
              </p>
            </div>
          </div>

          {/* Modo e Tipo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-zinc-800/50 p-3 rounded-lg">
              <p className="text-xs text-zinc-400 mb-1">Modo</p>
              <p className="text-white font-medium">
                {helpFriend.helpMode === 'friend' ? '👤 Amigo Específico' : '🌐 Público'}
              </p>
              {helpFriend.helpMode === 'friend' && (
                <p className="text-xs text-zinc-500">{helpFriend.friendName}</p>
              )}
            </div>
            <div className="bg-zinc-800/50 p-3 rounded-lg">
              <p className="text-xs text-zinc-400 mb-1">Tipo de Ajuda</p>
              <p className="text-white font-medium">{getHelpTypeLabel(helpFriend.helpType)}</p>
            </div>
          </div>

          {/* Urgência */}
          <div className="bg-zinc-800/50 p-3 rounded-lg">
            <p className="text-xs text-zinc-400 mb-1">Nível de Urgência</p>
            <p className="text-white font-medium">{getUrgencyLabel(helpFriend.urgency)}</p>
          </div>

          {/* Descrição */}
          {helpFriend.description && (
            <div className="bg-zinc-800/50 p-4 rounded-lg">
              <p className="text-xs text-zinc-400 mb-2 flex items-center gap-2">
                <FileText size={14} />
                Observações
              </p>
              <p className="text-zinc-100 whitespace-pre-wrap">{helpFriend.description}</p>
            </div>
          )}

          {/* Helper Info */}
          {helpFriend.helperEmail && (
            <div className="bg-emerald-500/10 border border-emerald-500/50 p-4 rounded-lg">
              <p className="text-xs text-emerald-400 mb-2">Ajudante</p>
              <p className="text-white font-medium">{helpFriend.helperName}</p>
              <p className="text-xs text-zinc-500">{helpFriend.helperEmail}</p>
              {helpFriend.acceptedAt && (
                <p className="text-xs text-emerald-400 mt-2">
                  Aceitou em: {new Date(helpFriend.acceptedAt).toLocaleDateString('pt-BR')}
                </p>
              )}
              {helpFriend.requiresRelatus && (
                <p className="text-xs text-emerald-200 mt-2">
                  Necessita registrar auxílio no Relatus
                </p>
              )}
            </div>
          )}

          {/* Resolução */}
          {helpFriend.resolution && (
            <div className="bg-blue-500/10 border border-blue-500/50 p-4 rounded-lg">
              <p className="text-xs text-blue-400 mb-2">Resolução</p>
              <p className="text-zinc-100 whitespace-pre-wrap">{helpFriend.resolution}</p>
              {helpFriend.resolvedAt && (
                <p className="text-xs text-blue-400 mt-2">
                  Resolvido em: {new Date(helpFriend.resolvedAt).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          )}

          {/* Formulário de Resolução */}
          {showResolutionForm && (
            <div className="bg-zinc-800/50 p-4 rounded-lg border border-zinc-700">
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Descreva a Resolução
              </label>
              <textarea
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors min-h-[120px]"
                placeholder="Descreva como você resolveu o problema..."
              />
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-3 flex-wrap pt-4 border-t border-zinc-700">
            {/* Se é o amigo ou modo público e ainda não aceitou */}
            {!isRequester && !isHelper && (helpFriend.status === 'open') && onAccept && (
              <div className="w-full space-y-4">
                <label className="flex items-center gap-3 p-4 bg-zinc-800 border border-zinc-700 rounded-lg">
                  <input
                    type="checkbox"
                    checked={requiresRelatus}
                    onChange={(e) => setRequiresRelatus(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-zinc-200">
                    Precisa registrar auxílio no Relatus ao iniciar a ajuda?
                  </span>
                </label>
                <button
                  onClick={handleAccept}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 text-white transition-colors font-medium"
                >
                  <CheckCircle2 size={18} />
                  Aceitar Ajudar
                </button>
              </div>
            )}

            {/* Se é o ajudante e a solicitação está em progresso */}
            {isHelper && helpFriend.status === 'in-progress' && (
              <>
                {!showResolutionForm ? (
                  <button
                    onClick={() => setShowResolutionForm(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors font-medium"
                  >
                    Marcar como Resolvido
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleResolve}
                      disabled={loading}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white transition-colors font-medium"
                    >
                      {loading ? 'Resolvendo...' : 'Confirmar Resolução'}
                    </button>
                    <button
                      onClick={() => setShowResolutionForm(false)}
                      className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white transition-colors"
                    >
                      Cancelar
                    </button>
                  </>
                )}
              </>
            )}

            {/* Se é o solicitante e está aberta, pode fechar */}
            {isRequester && helpFriend.status === 'open' && onClose2 && (
              <button
                onClick={handleClose}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white transition-colors font-medium"
              >
                <XCircle size={18} />
                Fechar Solicitação
              </button>
            )}

            {/* Se for o solicitante, pode editar enquanto estiver aberta */}
            {isRequester && helpFriend.status === 'open' && onEdit && (
              <button
                onClick={onEdit}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition-colors font-medium"
              >
                Editar Solicitação
              </button>
            )}

            {/* Se for o solicitante, pode excluir */}
            {isRequester && onDelete && (
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:bg-rose-800 text-white transition-colors font-medium"
              >
                {loading ? 'Excluindo...' : 'Excluir Solicitação'}
              </button>
            )}

            {/* Se é o amigo e rejeitar é possível */}
            {isFriendRequest && helpFriend.status === 'open' && onReject && (
              <button
                onClick={handleReject}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-800 text-white transition-colors font-medium"
              >
                {loading ? 'Rejeitando...' : 'Rejeitar'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpDetailModal;
