'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X, User, FileText, CheckCircle2, XCircle, Clock,
  AlertTriangle, Edit2, Trash2, ChevronRight,
  HandHelping, Globe, UserCheck, Calendar, Zap,
} from 'lucide-react';
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

// ==================== HELPERS ====================

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  'open':        { label: 'Aberta',       cls: 'bg-sky-500/15 text-sky-300 border border-sky-500/30' },
  'in-progress': { label: 'Em Progresso', cls: 'bg-purple-500/15 text-purple-300 border border-purple-500/30' },
  'resolved':    { label: 'Resolvida',    cls: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' },
  'closed':      { label: 'Fechada',      cls: 'bg-zinc-500/15 text-zinc-400 border border-zinc-500/30' },
};

const URGENCY_MAP: Record<string, { label: string; cls: string; dot: string }> = {
  high:   { label: 'Alta',  cls: 'text-red-400',    dot: 'bg-red-400' },
  medium: { label: 'Média', cls: 'text-amber-400',  dot: 'bg-amber-400' },
  low:    { label: 'Baixa', cls: 'text-emerald-400', dot: 'bg-emerald-400' },
};

const HELP_TYPE_MAP: Record<string, string> = {
  business:    '💼 Regra de Negócio',
  technical:   '🛠️ Técnico',
  independent: '⚙️ Independente',
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const initials = (name: string) =>
  name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

// ==================== SUBCOMPONENTS ====================

const Avatar: React.FC<{ name: string; color?: string }> = ({ name, color = 'bg-blue-500/20 text-blue-300' }) => (
  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${color}`}>
    {initials(name)}
  </div>
);

const InfoRow: React.FC<{ label: string; children: React.ReactNode; icon?: React.ReactNode }> = ({ label, children, icon }) => (
  <div className="flex items-start justify-between gap-4 py-2.5 border-b border-zinc-800/70 last:border-0">
    <span className="flex items-center gap-1.5 text-xs text-zinc-500 shrink-0 pt-0.5 min-w-[110px]">
      {icon}
      {label}
    </span>
    <div className="text-sm text-zinc-200 text-right">{children}</div>
  </div>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">{children}</p>
);

const ActionBtn: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'danger' | 'ghost' | 'success' | 'warning';
  icon?: React.ReactNode;
  children: React.ReactNode;
  fullWidth?: boolean;
}> = ({ onClick, disabled, variant = 'ghost', icon, children, fullWidth }) => {
  const variantCls = {
    primary: 'bg-blue-600 hover:bg-blue-500 text-white border-transparent',
    success: 'bg-emerald-600 hover:bg-emerald-500 text-white border-transparent',
    danger:  'bg-rose-600 hover:bg-rose-500 text-white border-transparent',
    warning: 'bg-amber-600 hover:bg-amber-500 text-white border-transparent',
    ghost:   'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700',
  }[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
        border transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
        ${variantCls} ${fullWidth ? 'w-full' : ''}
      `}
    >
      {icon}
      {children}
    </button>
  );
};

// ==================== MODAL PRINCIPAL ====================

const scrollbarStyle = `
  .hf-scroll::-webkit-scrollbar { width: 4px; }
  .hf-scroll::-webkit-scrollbar-track { background: transparent; }
  .hf-scroll::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 999px; }
  .hf-scroll::-webkit-scrollbar-thumb:hover { background: #52525b; }
` as string;

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
  const [confirmAction, setConfirmAction] = useState<null | 'close' | 'delete' | 'reject'>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setResolutionText('');
      setShowResolutionForm(false);
      setRequiresRelatus(false);
      setConfirmAction(null);
      setLoading(false);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const withLoading = useCallback(async (fn: () => Promise<void>) => {
    try {
      setLoading(true);
      await fn();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  if (!isOpen || !helpFriend) return null;

  const isRequester = helpFriend.requesterEmail === currentUserEmail;
  const isHelper    = helpFriend.helperEmail === currentUserEmail;
  const isDirectedToMe = helpFriend.helpMode === 'friend' && helpFriend.friendEmail === currentUserEmail;
  const canAccept   = !isRequester && !isHelper && helpFriend.status === 'open';

  const status  = STATUS_MAP[helpFriend.status]  ?? STATUS_MAP['closed'];
  const urgency = URGENCY_MAP[helpFriend.urgency] ?? { label: helpFriend.urgency, cls: 'text-zinc-400', dot: 'bg-zinc-400' };

  const handleAccept = () => withLoading(async () => {
    await onAccept?.(requiresRelatus);
    onClose();
  });

  const handleResolve = () => {
    if (!resolutionText.trim()) return;
    withLoading(async () => {
      await onResolve?.(resolutionText);
      setResolutionText('');
      setShowResolutionForm(false);
      onClose();
    });
  };

  const handleConfirmed = () => withLoading(async () => {
    if (confirmAction === 'close')   await onClose2?.();
    if (confirmAction === 'delete')  await onDelete?.();
    if (confirmAction === 'reject')  await onReject?.();
    setConfirmAction(null);
    onClose();
  });

  // ── Confirm overlay ──
  const confirmLabels: Record<string, { title: string; body: string; btnLabel: string }> = {
    close:  { title: 'Fechar solicitação?', body: 'Esta ação irá encerrar a solicitação. Não será possível desfazer.', btnLabel: 'Confirmar fechamento' },
    delete: { title: 'Excluir solicitação?', body: 'Esta ação é permanente e não poderá ser desfeita.', btnLabel: 'Sim, excluir' },
    reject: { title: 'Rejeitar solicitação?', body: 'Você irá rejeitar esta solicitação de ajuda.', btnLabel: 'Confirmar rejeição' },
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{scrollbarStyle}</style>
      <div
        className="
          relative bg-zinc-900 border border-zinc-800 rounded-2xl
          w-full max-w-lg
          flex flex-col
          max-h-[90dvh] sm:max-h-[85vh]
          shadow-2xl shadow-black/50
        "
      >
        {/* ── HEADER ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 shrink-0">
              <HandHelping size={16} className="text-blue-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white truncate leading-tight">
                {helpFriend.ticketNumber}
              </h2>
              <p className="text-xs text-zinc-500 truncate">Solicitação de ajuda</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.cls}`}>
              {status.label}
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              aria-label="Fechar modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── SCROLLABLE BODY ── */}
        <div
          className="overflow-y-auto flex-1 px-5 py-4 space-y-5 hf-scroll"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#3f3f46 transparent' }}
        >

          {/* Badge direcionado */}
          {isDirectedToMe && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs">
              <UserCheck size={14} />
              Este pedido foi direcionado diretamente a você
            </div>
          )}

          {/* ── SOLICITANTE ── */}
          <div>
            <SectionTitle>Solicitante</SectionTitle>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <Avatar name={helpFriend.requesterName} color="bg-blue-500/20 text-blue-300" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{helpFriend.requesterName}</p>
                <p className="text-xs text-zinc-500 truncate">{helpFriend.requesterEmail}</p>
              </div>
              {isRequester && (
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/25 shrink-0">
                  Você
                </span>
              )}
            </div>
          </div>

          {/* ── DETALHES ── */}
          <div>
            <SectionTitle>Detalhes</SectionTitle>
            <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-3 divide-y divide-zinc-800">
              <InfoRow label="Modo" icon={<Globe size={12} />}>
                {helpFriend.helpMode === 'friend' ? (
                  <span className="flex flex-col items-end gap-0.5">
                    <span>👤 Amigo específico</span>
                    {helpFriend.friendName && (
                      <span className="text-xs text-zinc-500">{helpFriend.friendName}</span>
                    )}
                  </span>
                ) : (
                  '🌐 Público'
                )}
              </InfoRow>
              <InfoRow label="Tipo" icon={<FileText size={12} />}>
                {HELP_TYPE_MAP[helpFriend.helpType] ?? helpFriend.helpType}
              </InfoRow>
              <InfoRow label="Urgência" icon={<Zap size={12} />}>
                <span className={`flex items-center gap-1.5 justify-end ${urgency.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${urgency.dot}`} />
                  {urgency.label}
                </span>
              </InfoRow>
              <InfoRow label="Criado em" icon={<Calendar size={12} />}>
                <span className="text-xs">{fmtDate(helpFriend.createdAt)}</span>
              </InfoRow>
            </div>
          </div>

          {/* ── DESCRIÇÃO ── */}
          {helpFriend.description && (
            <div>
              <SectionTitle>Observações</SectionTitle>
              <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                {helpFriend.description}
              </div>
            </div>
          )}

          {/* ── AJUDANTE ── */}
          {helpFriend.helperEmail && (
            <div>
              <SectionTitle>Ajudante</SectionTitle>
              <div className="p-3 rounded-xl bg-emerald-500/8 border border-emerald-500/25 space-y-2">
                <div className="flex items-center gap-3">
                  <Avatar name={helpFriend.helperName ?? helpFriend.helperEmail} color="bg-emerald-500/20 text-emerald-300" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{helpFriend.helperName}</p>
                    <p className="text-xs text-zinc-500 truncate">{helpFriend.helperEmail}</p>
                  </div>
                </div>
                {helpFriend.acceptedAt && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1.5 pl-0.5">
                    <Clock size={11} />
                    Aceitou em {fmtDate(helpFriend.acceptedAt)}
                  </p>
                )}
                {helpFriend.requiresRelatus && (
                  <p className="text-xs text-emerald-300 bg-emerald-500/10 px-2.5 py-1.5 rounded-lg border border-emerald-500/20">
                    Necessita registrar auxílio no Relatus
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── RESOLUÇÃO ── */}
          {helpFriend.resolution && (
            <div>
              <SectionTitle>Resolução</SectionTitle>
              <div className="p-3 rounded-xl bg-blue-500/8 border border-blue-500/25 space-y-2">
                <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
                  {helpFriend.resolution}
                </p>
                {helpFriend.resolvedAt && (
                  <p className="text-xs text-blue-400 flex items-center gap-1.5">
                    <Clock size={11} />
                    Resolvido em {fmtDate(helpFriend.resolvedAt)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── FORMULÁRIO DE RESOLUÇÃO ── */}
          {showResolutionForm && (
            <div>
              <SectionTitle>Descreva a resolução</SectionTitle>
              <textarea
                value={resolutionText}
                onChange={e => setResolutionText(e.target.value)}
                placeholder="Como você resolveu o problema…"
                rows={4}
                className="
                  w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl
                  text-sm text-white placeholder-zinc-600
                  focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/20
                  transition-colors resize-none
                "
              />
            </div>
          )}

          {/* ── ACEITAR (checkbox relatus) ── */}
          {canAccept && onAccept && (
            <div>
              <SectionTitle>Aceitar ajuda</SectionTitle>
              <label className="flex items-start gap-3 p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50 cursor-pointer hover:bg-zinc-800 transition-colors">
                <input
                  type="checkbox"
                  checked={requiresRelatus}
                  onChange={e => setRequiresRelatus(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-emerald-500 focus:ring-emerald-500 shrink-0"
                />
                <span className="text-sm text-zinc-300 leading-snug">
                  Precisa registrar auxílio no Relatus ao iniciar a ajuda?
                </span>
              </label>
            </div>
          )}

          {/* ── CONFIRM OVERLAY (inline) ── */}
          {confirmAction && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/8 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-rose-300">
                    {confirmLabels[confirmAction].title}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {confirmLabels[confirmAction].body}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <ActionBtn variant="danger" onClick={handleConfirmed} disabled={loading}>
                  {loading ? 'Aguarde…' : confirmLabels[confirmAction].btnLabel}
                </ActionBtn>
                <ActionBtn variant="ghost" onClick={() => setConfirmAction(null)}>
                  Cancelar
                </ActionBtn>
              </div>
            </div>
          )}

        </div>

        {/* ── FOOTER / AÇÕES ── */}
        {!confirmAction && (
          <div className="px-5 py-4 border-t border-zinc-800 shrink-0 space-y-2">

            {/* Aceitar */}
            {canAccept && onAccept && (
              <ActionBtn variant="success" icon={<CheckCircle2 size={15} />} onClick={handleAccept} disabled={loading} fullWidth>
                {loading ? 'Aceitando…' : 'Aceitar ajudar'}
              </ActionBtn>
            )}

            {/* Helper: resolver */}
            {isHelper && helpFriend.status === 'in-progress' && (
              showResolutionForm ? (
                <div className="flex gap-2">
                  <ActionBtn
                    variant="primary"
                    onClick={handleResolve}
                    disabled={loading || !resolutionText.trim()}
                    fullWidth
                  >
                    {loading ? 'Salvando…' : 'Confirmar resolução'}
                  </ActionBtn>
                  <ActionBtn variant="ghost" onClick={() => setShowResolutionForm(false)}>
                    Cancelar
                  </ActionBtn>
                </div>
              ) : (
                <ActionBtn variant="primary" icon={<CheckCircle2 size={15} />} onClick={() => setShowResolutionForm(true)} fullWidth>
                  Marcar como resolvido
                </ActionBtn>
              )
            )}

            {/* Requester: editar + fechar + excluir */}
            {isRequester && helpFriend.status === 'open' && (
              <div className="flex gap-2 flex-wrap">
                {onEdit && (
                  <ActionBtn variant="ghost" icon={<Edit2 size={14} />} onClick={onEdit}>
                    Editar
                  </ActionBtn>
                )}
                {onClose2 && (
                  <ActionBtn variant="warning" icon={<XCircle size={14} />} onClick={() => setConfirmAction('close')}>
                    Fechar
                  </ActionBtn>
                )}
                {onDelete && (
                  <ActionBtn variant="danger" icon={<Trash2 size={14} />} onClick={() => setConfirmAction('delete')}>
                    Excluir
                  </ActionBtn>
                )}
              </div>
            )}

            {/* Requester: excluir quando não está open */}
            {isRequester && helpFriend.status !== 'open' && onDelete && (
              <ActionBtn variant="danger" icon={<Trash2 size={14} />} onClick={() => setConfirmAction('delete')}>
                Excluir permanentemente
              </ActionBtn>
            )}

            {/* Friend: rejeitar */}
            {isDirectedToMe && helpFriend.status === 'open' && onReject && (
              <ActionBtn variant="danger" icon={<XCircle size={14} />} onClick={() => setConfirmAction('reject')}>
                Rejeitar solicitação
              </ActionBtn>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HelpDetailModal;
