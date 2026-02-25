'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (categoryName: string) => void;
  existingCategories: string[];
}

const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  existingCategories,
}) => {
  const [categoryName, setCategoryName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (categoryName.trim() && !existingCategories.includes(categoryName)) {
      onSubmit(categoryName);
      setCategoryName('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Nova Categoria</h2>
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
              Nome da Categoria *
            </label>
            <input
              type="text"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
              placeholder="Ex: Backend, Frontend, DevOps"
              autoFocus
            />
          </div>

          {existingCategories.length > 0 && (
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3">
              <p className="text-xs text-zinc-400 mb-2">Categorias existentes:</p>
              <div className="flex flex-wrap gap-2">
                {existingCategories.map(cat => (
                  <span
                    key={cat}
                    className="inline-block px-2 py-1 bg-zinc-700 rounded text-xs text-zinc-300"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          )}

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
              className="px-4 py-2 bg-emerald-500 rounded-lg text-white font-medium hover:bg-emerald-600 transition-colors"
            >
              Criar Categoria
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;
