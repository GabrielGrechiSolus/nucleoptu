'use client';

import React, { useState, useEffect } from 'react';
import { X, Download, Settings } from 'lucide-react';
import { Ticket } from '../../tickets/components/TicketModal';
import { Study } from '../../studies/components/StudyModal';

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

interface ReportViewerProps {
  isOpen: boolean;
  onClose: () => void;
  config: ReportConfig;
  data: (Ticket | Study | any)[];
  onEdit?: () => void;
}

const ReportViewer: React.FC<ReportViewerProps> = ({
  isOpen,
  onClose,
  config,
  data,
  onEdit,
}) => {
  const [filteredData, setFilteredData] = useState<any[]>([]);

  useEffect(() => {
    let result = [...data];

    // Filtrar por data
    const startDate = new Date(config.filters.dateRange.start).getTime();
    const endDate = new Date(config.filters.dateRange.end).getTime() + 86400000;

    result = result.filter(item => {
      const itemDate = new Date(item.createdAt || item.date || 0).getTime();
      return itemDate >= startDate && itemDate <= endDate;
    });

    // Aplicar ordenação
    config.sorting.forEach(sort => {
      result.sort((a, b) => {
        const aVal = a[sort.field];
        const bVal = b[sort.field];
        if (typeof aVal === 'string') {
          return sort.order === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        return sort.order === 'asc' ? aVal - bVal : bVal - aVal;
      });
    });

    setFilteredData(result);
  }, [data, config]);

  const formatValue = (value: any): string => {
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    if (typeof value === 'string' && (value.includes('T') || value.includes('-'))) {
      return new Date(value).toLocaleDateString('pt-BR');
    }
    return String(value);
  };

  const handleExportCSV = () => {
    const headers = config.columns.join(',');
    const rows = filteredData.map(item =>
      config.columns.map(col => {
        const value = item[col];
        const formatted = formatValue(value);
        return `"${formatted.replace(/"/g, '""')}"`;
      }).join(',')
    );
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name}.csv`;
    a.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-auto">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-6xl max-h-screen overflow-y-auto my-4">
        {/* Header */}
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-700 p-6 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-bold text-white">{config.name}</h2>
            {config.description && (
              <p className="text-zinc-400 text-sm mt-1">{config.description}</p>
            )}
            <p className="text-zinc-500 text-xs mt-2">
              {filteredData.length} registro{filteredData.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white hover:border-sky-500 transition-colors"
              title="Exportar como CSV"
            >
              <Download size={20} />
            </button>
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-400 hover:text-white hover:border-sky-500 transition-colors"
                title="Editar relatório"
              >
                <Settings size={20} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="p-6">
          {filteredData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-800 sticky top-14">
                  <tr>
                    {config.columns.map(col => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-zinc-300 font-medium border-b border-zinc-700 capitalize text-xs"
                      >
                        {col.replace(/([A-Z])/g, ' $1').trim()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((item, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors"
                    >
                      {config.columns.map(col => (
                        <td
                          key={`${idx}-${col}`}
                          className="px-4 py-3 text-zinc-400"
                        >
                          {formatValue(item[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-zinc-400">Nenhum dado encontrado para os filtros selecionados</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportViewer;
