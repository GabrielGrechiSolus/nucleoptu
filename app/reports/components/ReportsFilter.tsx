'use client';

import React from 'react';
import { Calendar, Filter } from 'lucide-react';

export interface ReportFilter {
  dateRange: 'week' | 'month' | 'quarter' | 'year' | 'all';
  category?: string;
  status?: 'all' | 'open' | 'closed';
}

interface ReportsFilterProps {
  filters: ReportFilter;
  onFilterChange: (filters: ReportFilter) => void;
  categories?: string[];
}

const ReportsFilter: React.FC<ReportsFilterProps> = ({
  filters,
  onFilterChange,
  categories = [],
}) => {
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 mb-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="flex items-center gap-2 text-white">
          <Filter size={20} />
          <span className="font-semibold">Filtros</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto sm:ml-auto">
          <select
            value={filters.dateRange}
            onChange={(e) => onFilterChange({
              ...filters,
              dateRange: e.target.value as 'week' | 'month' | 'quarter' | 'year' | 'all',
            })}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-sky-500 transition-colors"
          >
            <option value="week">Última Semana</option>
            <option value="month">Último Mês</option>
            <option value="quarter">Último Trimestre</option>
            <option value="year">Último Ano</option>
            <option value="all">Todo Período</option>
          </select>

          {categories.length > 0 && (
            <select
              value={filters.category || 'all'}
              onChange={(e) => onFilterChange({
                ...filters,
                category: e.target.value === 'all' ? undefined : e.target.value,
              })}
              className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-sky-500 transition-colors"
            >
              <option value="all">Todas as Categorias</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}

          <select
            value={filters.status || 'all'}
            onChange={(e) => onFilterChange({
              ...filters,
              status: e.target.value as 'all' | 'open' | 'closed',
            })}
            className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-sky-500 transition-colors"
          >
            <option value="all">Todos os Status</option>
            <option value="open">Abertos</option>
            <option value="closed">Fechados</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default ReportsFilter;
