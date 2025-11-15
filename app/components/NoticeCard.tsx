'use client';

import React from 'react';
import { Edit3, Trash2, Check } from 'lucide-react';

// Define the shape of a notice object
interface Notice {
  id: string;
  title: string;
  description: string;
  type: string;
  link?: string;
  importance: 'alta' | 'media' | 'baixa';
  createdAt: number;
  readBy?: string[];
}

// Define the props for the NoticeCard component
interface NoticeCardProps {
  notice: Notice;
  currentUser: any; // Firebase user object
  onEdit: (notice: Notice) => void;
  onDelete: (id: string) => void;
  onMarkAsRead: (id: string) => void;
  formatDate: (timestamp: number) => string;
  iconForType: Record<string, string>;
  importanceColor: Record<string, string>;
}

const NoticeCard: React.FC<NoticeCardProps> = ({
  notice,
  currentUser,
  onEdit,
  onDelete,
  onMarkAsRead,
  formatDate,
  iconForType,
  importanceColor,
}) => {
  const isRead = notice.readBy?.includes(currentUser?.uid);

  return (
    <div
      key={notice.id}
      className={`p-4 border rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition-colors ${
        isRead ? 'bg-zinc-900/50 border-zinc-800/50' : 'bg-zinc-900 border-zinc-800'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-sky-400 flex items-center gap-2 truncate">
            <span>{iconForType[notice.type]}</span>
            <span className="truncate">{notice.title}</span>
          </h2>

          {!isRead && (
            <span className="ml-2 text-xs font-bold text-black bg-sky-400 px-2 py-0.5 rounded-full">
              NOVO
            </span>
          )}

          <span className={`ml-auto text-sm font-medium ${importanceColor[notice.importance || 'media']}`}>
            {((notice.importance || 'media') as string).toUpperCase()}
          </span>
        </div>

        <p className="text-zinc-400 mt-2 line-clamp-3">{notice.description}</p>

        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-3">
          {notice.link && (
            <a href={notice.link} target="_blank" rel="noreferrer" className="text-sky-500 underline text-sm">
              Abrir Link
            </a>
          )}
          <span className="text-zinc-500 text-sm">Criado: {formatDate(notice.createdAt)}</span>
        </div>
      </div>

      <div className="flex-shrink-0 flex items-center gap-3">
        {!isRead && (
          <button
            onClick={() => onMarkAsRead(notice.id)}
            className="text-green-400 hover:text-green-300 flex items-center gap-1 text-sm"
            title="Marcar como lido"
          >
            <Check size={18} />
            <span>Lido</span>
          </button>
        )}
        <button onClick={() => onEdit(notice)} className="text-yellow-400 hover:text-yellow-300" title="Editar">
          <Edit3 />
        </button>
        <button onClick={() => onDelete(notice.id)} className="text-red-500 hover:text-red-400" title="Excluir">
          <Trash2 />
        </button>
      </div>
    </div>
  );
};

export default NoticeCard;
