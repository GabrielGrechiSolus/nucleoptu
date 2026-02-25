'use client';

import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

interface ReportConfig {
  name: string;
  description: string;
  type: 'tickets' | 'studies' | 'meetings';
  filters: {
    dateRange: { start: string; end: string };
    status?: string;
    category?: string;
    searchTerm?: string;
    customFilters: Record<string, string>;
  };
  columns: string[];
  groupBy?: string;
  sorting: { field: string; order: 'asc' | 'desc' }[];
}

interface ReportBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: ReportConfig) => void;
  initialConfig?: ReportConfig;
  isEditing?: boolean;
}

const REPORT_TYPES = [
  { value: 'tickets', label: 'Chamados', defaultColumns: ['ticketNumber', 'clientName', 'status', 'openDate', 'observations'] },
  { value: 'studies', label: 'Estudos', defaultColumns: ['title', 'category', 'tags', 'createdAt', 'ticketLinks'] },
  { value: 'meetings', label: 'Reuniões', defaultColumns: ['title', 'date', 'attendees', 'observations'] },
];

const ReportBuilder: React.FC<ReportBuilderProps> = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
  isEditing = false,
}) => {
  const [config, setConfig] = useState<ReportConfig>(
    initialConfig || {
      name: '',
      description: '',
      type: 'tickets',
      filters: {
        dateRange: {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0],
        },
        customFilters: {},
      },
      columns: REPORT_TYPES[0].defaultColumns,
      sorting: [{ field: 'createdAt', order: 'desc' }],
    }
  );

  const handleTypeChange = (newType: 'tickets' | 'studies' | 'meetings') => {
    const reportType = REPORT_TYPES.find(rt => rt.value === newType);
    setConfig({
      ...config,
      type: newType,
      columns: reportType?.defaultColumns || [],
    });
  };

  const handleAddFilter = () => {
    setConfig({
      ...config,
      filters: {
        ...config.filters,
        customFilters: {
          ...config.filters.customFilters,
          [`filter_${Date.now()}`]: '',
        },
      },
    });
  };

  const handleRemoveFilter = (key: string) => {
    const { [key]: _, ...rest } = config.filters.customFilters;
    setConfig({
      ...config,
      filters: {
        ...config.filters,
        customFilters: rest,
      },
    });
  };

  const handleToggleColumn = (column: string) => {
    setConfig({
      ...config,
      columns: config.columns.includes(column)
        ? config.columns.filter(c => c !== column)
        : [...config.columns, column],
    });
  };

  const handleAddSorting = () => {
    setConfig({
      ...config,
      sorting: [
        ...config.sorting,
        { field: 'createdAt', order: 'asc' },
      ],
    });
  };

  const handleRemoveSorting = (index: number) => {
    setConfig({
      ...config,
      sorting: config.sorting.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (config.name.trim()) {
      onSave(config);
      onClose();
    }
  };

  if (!isOpen) return null;

  const currentType = REPORT_TYPES.find(rt => rt.value === config.type);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto my-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">
            {isEditing ? 'Editar Relatório' : 'Novo Relatório'}
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nome e Descrição */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Nome do Relatório *
              </label>
              <input
                type="text"
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
                placeholder="Ex: Chamados Abertos Fevereiro"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Descrição
              </label>
              <textarea
                value={config.description}
                onChange={(e) => setConfig({ ...config, description: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-colors resize-none"
                placeholder="Descreva o propósito deste relatório..."
                rows={3}
              />
            </div>
          </div>

          {/* Tipo de Relatório */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Tipo de Relatório *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {REPORT_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleTypeChange(type.value as 'tickets' | 'studies' | 'meetings')}
                  className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                    config.type === type.value
                      ? 'bg-sky-500 text-white'
                      : 'bg-zinc-800 border border-zinc-700 text-zinc-300 hover:border-sky-500'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Intervalo de Datas */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Intervalo de Datas
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <input
                  type="date"
                  value={config.filters.dateRange.start}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      filters: {
                        ...config.filters,
                        dateRange: { ...config.filters.dateRange, start: e.target.value },
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <input
                  type="date"
                  value={config.filters.dateRange.end}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      filters: {
                        ...config.filters,
                        dateRange: { ...config.filters.dateRange, end: e.target.value },
                      },
                    })
                  }
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Colunas a Exibir */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Colunas a Exibir
            </label>
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
              {currentType?.defaultColumns.map(column => (
                <label key={column} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.columns.includes(column)}
                    onChange={() => handleToggleColumn(column)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-zinc-300 capitalize">
                    {column.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Ordenação */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-zinc-300">
                Ordenação
              </label>
              <button
                type="button"
                onClick={handleAddSorting}
                className="flex items-center gap-1 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300 hover:border-sky-500 transition-colors"
              >
                <Plus size={14} />
                Adicionar
              </button>
            </div>
            <div className="space-y-2">
              {config.sorting.map((sort, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={sort.field}
                    onChange={(e) => {
                      const newSorting = [...config.sorting];
                      newSorting[index].field = e.target.value;
                      setConfig({ ...config, sorting: newSorting });
                    }}
                    className="flex-1 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                    placeholder="Campo"
                  />
                  <select
                    value={sort.order}
                    onChange={(e) => {
                      const newSorting = [...config.sorting];
                      newSorting[index].order = e.target.value as 'asc' | 'desc';
                      setConfig({ ...config, sorting: newSorting });
                    }}
                    className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                  >
                    <option value="asc">Ascendente</option>
                    <option value="desc">Descendente</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleRemoveSorting(index)}
                    className="p-1 text-red-500 hover:bg-red-500/10 rounded transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-2 justify-end pt-4 border-t border-zinc-700">
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
              {isEditing ? 'Atualizar' : 'Criar'} Relatório
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReportBuilder;
