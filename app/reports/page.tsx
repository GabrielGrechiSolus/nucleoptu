'use client';

import React, { useEffect, useState } from 'react';
import { Download, TrendingUp, Plus, Trash2, Edit3 } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { db } from '../../firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import ChartCard from './components/ChartCard';
import BarChart from './components/BarChart';
import PieChart from './components/PieChart';
import ReportsFilter, { ReportFilter } from './components/ReportsFilter';
import ReportBuilder from './components/ReportBuilder';
import ReportViewer from './components/ReportViewer';
import { Study } from '../studies/components/StudyModal';

interface SavedReport {
  id?: string;
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
  userId?: string;
  createdAt?: string;
}

const ReportsPage = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [studies, setStudies] = useState<Study[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filters, setFilters] = useState<ReportFilter>({
    dateRange: 'month',
    status: 'all',
  });

  // Estados para relatórios personalizados
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<SavedReport | null>(null);
  const [editingReport, setEditingReport] = useState<SavedReport | undefined>(undefined);

  // Carrega tickets
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'tickets'), where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ticketsData: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        ticketsData.push({
          id: doc.id,
          ticketNumber: data.ticketNumber,
          clientName: data.clientName,
          status: data.status,
          openDate: data.openDate,
          closeDate: data.closeDate,
          observations: data.observations || [],
          studies: data.studies || [],
          createdAt: data.createdAt,
        });
      });
      setTickets(ticketsData);
    });

    return () => unsubscribe();
  }, [user]);

  // Carrega estudos
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'studies'), where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const studiesData: Study[] = [];
      const categoriesSet = new Set<string>();

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        studiesData.push({
          id: doc.id,
          title: data.title,
          description: data.description || '',
          category: data.category,
          content: data.content,
          ticketIds: data.ticketIds || [],
          tags: data.tags || [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
        categoriesSet.add(data.category);
      });

      setStudies(studiesData);
      setCategories(Array.from(categoriesSet).sort());
    });

    return () => unsubscribe();
  }, [user]);

  // Carrega reuniões
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'meetings'), where('createdBy', '==', user.uid));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const meetingsData: any[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        meetingsData.push({
          id: doc.id,
          title: data.title,
          date: data.date,
          observations: data.observations || '',
          attendees: data.attendees || [],
          createdBy: data.createdBy,
          createdAt: data.createdAt,
        });
      });
      setMeetings(meetingsData);
    });

    return () => unsubscribe();
  }, [user]);

  // Carrega relatórios salvos
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'savedReports'), where('userId', '==', user.uid));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const reportsData: SavedReport[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        reportsData.push({
          id: doc.id,
          ...data as SavedReport,
        });
      });
      setSavedReports(reportsData);
    });

    return () => unsubscribe();
  }, [user]);

  // Salva relatório personalizado
  const handleSaveReport = async (config: SavedReport) => {
    if (!user) return;

    try {
      const reportData = {
        ...config,
        userId: user.uid,
        createdAt: new Date().toISOString(),
      };

      if (editingReport?.id) {
        // Editar relatório existente
        const reportRef = doc(db, 'savedReports', editingReport.id);
        await updateDoc(reportRef, reportData);
      } else {
        // Criar novo relatório
        await addDoc(collection(db, 'savedReports'), reportData);
      }

      setIsBuilderOpen(false);
      setEditingReport(undefined);
    } catch (error) {
      console.error('Erro ao salvar relatório:', error);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (confirm('Tem certeza que deseja deletar este relatório?')) {
      try {
        await deleteDoc(doc(db, 'savedReports', reportId));
      } catch (error) {
        console.error('Erro ao deletar relatório:', error);
      }
    }
  };

  const handleViewReport = (report: SavedReport) => {
    setSelectedReport(report);
    setIsViewerOpen(true);
  };

  const handleEditReport = (report: SavedReport) => {
    setEditingReport(report);
    setIsBuilderOpen(true);
  };

  const getReportData = (type: 'tickets' | 'studies' | 'meetings') => {
    switch (type) {
      case 'tickets':
        return tickets;
      case 'studies':
        return studies;
      case 'meetings':
        return meetings;
      default:
        return [];
    }
  };
  const getFilteredData = (items: any[]) => {
    const now = new Date();
    const itemDate = (item: any) => new Date(item.createdAt || item.openDate);

    return items.filter((item) => {
      const date = itemDate(item);
      switch (filters.dateRange) {
        case 'week':
          return now.getTime() - date.getTime() <= 7 * 24 * 60 * 60 * 1000;
        case 'month':
          return now.getTime() - date.getTime() <= 30 * 24 * 60 * 60 * 1000;
        case 'quarter':
          return now.getTime() - date.getTime() <= 90 * 24 * 60 * 60 * 1000;
        case 'year':
          return now.getTime() - date.getTime() <= 365 * 24 * 60 * 60 * 1000;
        default:
          return true;
      }
    }).filter((item) => {
      if (filters.status !== 'all') {
        return item.status === filters.status;
      }
      return true;
    });
  };

  const filteredTickets = getFilteredData(tickets);
  const filteredStudies = getFilteredData(studies);

  // Calcula métricas
  const totalTickets = filteredTickets.length;
  const openTickets = filteredTickets.filter((t) => t.status === 'open').length;
  const closedTickets = filteredTickets.filter((t) => t.status === 'closed').length;
  const totalObservations = filteredTickets.reduce((sum, t) => sum + (t.observations?.length || 0), 0);
  const totalStudies = filteredStudies.length;
  const avgStudiesPerTicket = totalTickets > 0 ? (filteredTickets.reduce((sum, t) => sum + (t.studies?.length || 0), 0) / totalTickets).toFixed(1) : 0;

  // Dados para gráficos
  const ticketsByStatus = [
    { label: 'Abertos', value: openTickets, color: 'bg-sky-500' },
    { label: 'Fechados', value: closedTickets, color: 'bg-emerald-500' },
  ];

  const studiesByCategory = categories.map((cat) => ({
    label: cat,
    value: filteredStudies.filter((s) => s.category === cat).length,
    color: ['bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-cyan-500'][categories.indexOf(cat) % 4],
  }));

  const observationTrend = totalTickets > 0 ? ((totalObservations / totalTickets) * 100).toFixed(1) : 0;

  // Export para CSV
  const exportReport = () => {
    const data = [
      ['Relatório de Chamados e Estudos'],
      ['Data de Geração', new Date().toLocaleString('pt-BR')],
      ['Período', filters.dateRange],
      [],
      ['RESUMO GERAL'],
      ['Total de Chamados', totalTickets],
      ['Chamados Abertos', openTickets],
      ['Chamados Fechados', closedTickets],
      ['Total de Observações', totalObservations],
      ['Total de Estudos', totalStudies],
      ['Média de Estudos por Chamado', avgStudiesPerTicket],
      [],
      ['DETALHES DOS CHAMADOS'],
      ['Número', 'Cliente', 'Status', 'Data de Abertura', 'Observações', 'Estudos'],
      ...filteredTickets.map((t) => [
        t.ticketNumber,
        t.clientName,
        t.status,
        new Date(t.openDate).toLocaleDateString('pt-BR'),
        t.observations?.length || 0,
        t.studies?.length || 0,
      ]),
      [],
      ['DETALHES DOS ESTUDOS'],
      ['Título', 'Categoria', 'Chamados Vinculados', 'Data de Criação'],
      ...filteredStudies.map((s) => [
        s.title,
        s.category,
        s.ticketIds?.length || 0,
        new Date(s.createdAt).toLocaleDateString('pt-BR'),
      ]),
    ];

    const csv = data.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_${new Date().getTime()}.csv`);
    link.click();
  };

  return (
    <div className="w-full p-4 sm:p-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Relatórios</h1>
          <p className="text-zinc-400 mt-1">Analise suas chamados, estudos e reuniões em um só lugar</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={exportReport}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 rounded-lg text-white font-medium hover:bg-emerald-600 transition-colors"
          >
            <Download size={20} />
            Exportar CSV
          </button>
          <button
            onClick={() => {
              setEditingReport(undefined);
              setIsBuilderOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 rounded-lg text-white font-medium hover:bg-sky-600 transition-colors"
          >
            <Plus size={20} />
            Novo Relatório
          </button>
        </div>
      </div>

      {/* Relatórios Salvos */}
      {savedReports.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white mb-4">Relatórios Personalizados</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedReports.map(report => (
              <div
                key={report.id}
                className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 hover:border-sky-500/50 transition-colors group"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-sm">{report.name}</h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      {report.type === 'tickets' && '📋 Chamados'}
                      {report.type === 'studies' && '📚 Estudos'}
                      {report.type === 'meetings' && '📞 Reuniões'}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 bg-zinc-800 rounded text-zinc-400">
                    {report.columns.length} col.
                  </span>
                </div>
                {report.description && (
                  <p className="text-xs text-zinc-400 mb-3">{report.description}</p>
                )}
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleViewReport(report)}
                    className="flex-1 px-2 py-1 bg-sky-500 hover:bg-sky-600 rounded text-xs text-white transition-colors"
                  >
                    Visualizar
                  </button>
                  <button
                    onClick={() => handleEditReport(report)}
                    className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                    title="Editar"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    onClick={() => report.id && handleDeleteReport(report.id)}
                    className="p-1 text-zinc-400 hover:text-red-500 hover:bg-zinc-800 rounded transition-colors"
                    title="Deletar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <ReportsFilter
        filters={filters}
        onFilterChange={setFilters}
        categories={categories}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <ChartCard
          title="Total de Chamados"
          value={totalTickets}
          color="blue"
          subtitle={`${openTickets} abertos, ${closedTickets} fechados`}
        />
        <ChartCard
          title="Total de Observações"
          value={totalObservations}
          color="purple"
          subtitle={`${observationTrend} observações por chamado`}
          trend={Math.round(Number(observationTrend))}
        />
        <ChartCard
          title="Total de Estudos"
          value={totalStudies}
          color="green"
          subtitle={`${avgStudiesPerTicket} estudos por chamado em média`}
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {ticketsByStatus.length > 0 && (
          <BarChart
            title="Chamados por Status"
            data={ticketsByStatus}
            maxValue={Math.max(openTickets, closedTickets) || 1}
          />
        )}

        {studiesByCategory.length > 0 ? (
          <PieChart
            title="Estudos por Categoria"
            data={studiesByCategory}
          />
        ) : (
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 flex items-center justify-center min-h-96">
            <div className="text-center">
              <p className="text-zinc-400 text-lg">Sem dados de categorias</p>
              <p className="text-zinc-500 text-sm">Crie estudos com categorias para ver análises</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabela de Detalhes */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-bold text-white mb-4">Chamados Recentes</h3>
        {filteredTickets.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-2 px-3 text-sm font-semibold text-zinc-400">Número</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-zinc-400">Cliente</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-zinc-400">Status</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-zinc-400">Observações</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-zinc-400">Estudos</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.slice(0, 10).map((ticket) => (
                  <tr key={ticket.id} className="border-b border-zinc-800 hover:bg-zinc-800/50 transition-colors">
                    <td className="py-3 px-3 text-sm text-white font-medium">{ticket.ticketNumber}</td>
                    <td className="py-3 px-3 text-sm text-zinc-300">{ticket.clientName}</td>
                    <td className="py-3 px-3 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        ticket.status === 'open'
                          ? 'bg-sky-500/20 text-sky-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {ticket.status === 'open' ? 'Aberto' : 'Fechado'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-sm text-zinc-400">{ticket.observations?.length || 0}</td>
                    <td className="py-3 px-3 text-sm text-zinc-400">{ticket.studies?.length || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-zinc-400">Nenhum chamado encontrado no período selecionado</p>
          </div>
        )}
      </div>

      {/* Report Builder Modal */}
      <ReportBuilder
        isOpen={isBuilderOpen}
        onClose={() => {
          setIsBuilderOpen(false);
          setEditingReport(undefined);
        }}
        onSave={handleSaveReport}
        initialConfig={editingReport}
        isEditing={!!editingReport}
      />

      {/* Report Viewer Modal */}
      {selectedReport && (
        <ReportViewer
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          config={selectedReport}
          data={getReportData(selectedReport.type)}
          onEdit={() => handleEditReport(selectedReport)}
        />
      )}
    </div>
  );
};

export default ReportsPage;
