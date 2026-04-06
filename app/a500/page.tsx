// app/ptu/page.tsx
'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { 
  Plus, Search, Filter, X, ChevronDown, Clock, CheckCircle, 
  AlertCircle, Calendar, Tag, User, FileText, BookOpen, 
  Link as LinkIcon, CheckSquare, Target, ChevronRight, 
  Package, Activity, FileSearch, XCircle, AlertTriangle,
  Database, Download, Settings, BarChart3, TrendingUp, TrendingDown,
  Eye, EyeOff, RefreshCw, MessageSquare, Upload, Loader2
} from 'lucide-react';

// ==================== TIPOS ====================

interface PtuProcess {
  id: string;
  fileName: string;
  version: string;
  status: 'processing' | 'success' | 'error' | 'warning';
  createdAt: string;
  completedAt?: string;
  totalContas: number;
  totalValor: number;
  totalGlosado: number;
  errors: PtuError[];
  warnings: PtuWarning[];
  logs: PtuLog[];
  xmlContent?: string;
  originalXml?: string;
}

interface PtuError {
  code: string;
  message: string;
  package: string;
  function: string;
  line?: number;
  severity: 'error' | 'warning' | 'info';
  affectedFields?: string[];
  solution?: string;
}

interface PtuWarning {
  code: string;
  message: string;
  package: string;
  function: string;
  suggestion: string;
}

interface PtuLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  package: string;
  function: string;
}

interface PtuStats {
  totalProcessos: number;
  successCount: number;
  errorCount: number;
  warningCount: number;
  totalValorProcessado: number;
  totalValorGlosado: number;
  avgGlosaPercent: number;
  lastProcessDate: string;
}

interface ContaProcessada {
  id: number;
  tipoConta: string;
  guiaPrincipal: string;
  valorApresentado: number;
  valorGlosado: number;
  status: 'processed' | 'glosed' | 'error';
  errors: string[];
  procedimentos?: Array<{ codigo: string; valor: number; qtde: number; glosa?: number }>;
  taxas?: Array<{ codigo: string; valor: number; qtde: number }>;
  materiais?: Array<{ codigo: string; valor: number; qtde: number }>;
}

interface GuiaInfo {
  tipo: 'consulta' | 'sadt' | 'internacao' | 'honorarios';
  numeroGuia: string;
  beneficiario: {
    codigo: string;
    nome: string;
    unimed: string;
  };
  executante: {
    nome: string;
    cpf?: string;
    cnpj?: string;
    conselho?: string;
    numeroConselho?: string;
    uf?: string;
  };
  dataAtendimento: string;
  valorTotal: number;
  procedimentos: Array<{
    seq: number;
    codigo: string;
    descricao?: string;
    valor: number;
    taxaAdm?: number;
    quantidade: number;
  }>;
}

// ==================== FUNÇÕES DE PROCESSAMENTO (SIMULANDO PKG_PTU_BATCH_LEITURA) ====================

const processXML = async (xmlContent: string, fileName: string): Promise<PtuProcess> => {
  const startTime = Date.now();
  const logs: PtuLog[] = [];
  const errors: PtuError[] = [];
  const warnings: PtuWarning[] = [];
  
  let totalValor = 0;
  let totalGlosado = 0;
  let totalContas = 0;
  let status: 'processing' | 'success' | 'error' | 'warning' = 'processing';
  
  // Log de início
  logs.push({
    timestamp: new Date().toISOString(),
    level: 'info',
    message: 'Início do processamento do arquivo',
    package: 'PKG_PTU_BATCH_LEITURA',
    function: 'insereXMLA500X'
  });
  
  // 1. Validação do XML (simulando insereXMLA500X)
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
    const parseError = xmlDoc.getElementsByTagName('parsererror');
    
    if (parseError.length > 0) {
      throw new Error('XML mal formatado: ' + parseError[0].textContent);
    }
    
    logs.push({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'XML validado com sucesso',
      package: 'PKG_PTU_BATCH_LEITURA',
      function: 'insereXMLA500X'
    });
    
    // 2. Extrair informações do cabeçalho
    const nrVerTra = xmlDoc.querySelector('nrVerTra_PTU')?.textContent || '06';
    const cdUniDestino = xmlDoc.querySelector('cd_Uni_Destino')?.textContent || '';
    const cdUniOrigem = xmlDoc.querySelector('cd_Uni_Origem')?.textContent || '';
    const dtGeracao = xmlDoc.querySelector('dt_Geracao')?.textContent || '';
    
    logs.push({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Cabeçalho processado: Versão ${nrVerTra}, Origem ${cdUniOrigem}, Destino ${cdUniDestino}`,
      package: 'PKG_PTU_BATCH_LEITURA',
      function: 'stp_cabecalho'
    });
    
    // 3. Processar guias
    const guiasConsulta = xmlDoc.querySelectorAll('guiaConsulta');
    const guiasSADT = xmlDoc.querySelectorAll('guiaSADT');
    const guiasInternacao = xmlDoc.querySelectorAll('guiaInternacao');
    const guiasHonorarios = xmlDoc.querySelectorAll('guiaHonorarios');
    
    totalContas = guiasConsulta.length + guiasSADT.length + guiasInternacao.length + guiasHonorarios.length;
    
    logs.push({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Processamento de guias iniciado - ${totalContas} guias encontradas`,
      package: 'PKG_PTU_BATCH_LEITURA',
      function: 'leitura_A500'
    });
    
    // 4. Processar cada guia
    const contas: ContaProcessada[] = [];
    
    // Processar guias de consulta
    guiasConsulta.forEach((guia, idx) => {
      try {
        const idBenef = guia.querySelector('id_Benef')?.textContent || '';
        const nmBenef = guia.querySelector('nm_Benef')?.textContent || '';
        const cdUnimed = guia.querySelector('cd_Unimed')?.textContent || '';
        const nrGuia = guia.querySelector('nr_GuiaTissPrestador')?.textContent || '';
        const dtAtendimento = guia.querySelector('dt_Atendimento')?.textContent || '';
        
        // Validar beneficiário
        if (!idBenef || idBenef.length < 10) {
          errors.push({
            code: 'ERR-040',
            message: `Beneficiário não encontrado na base de dados - id_Benef: ${idBenef || 'não informado'}`,
            package: 'PKG_PTU_BATCH_LEITURA',
            function: 'leitura_A500',
            line: 456,
            severity: 'error',
            affectedFields: ['cd_Unimed', 'id_Benef'],
            solution: 'Verificar se o código do beneficiário está correto no XML. Cadastrar o beneficiário no sistema se necessário.'
          });
          status = 'error';
          return;
        }
        
        // Processar procedimentos da consulta
        const procedimentos = guia.querySelectorAll('procedimentos');
        let valorGuia = 0;
        let glosaGuia = 0;
        const procList: Array<{ codigo: string; valor: number; qtde: number; glosa?: number }> = [];
        
        procedimentos.forEach(proc => {
          const cdServico = proc.querySelector('cd_Servico')?.textContent || '';
          const vlServico = parseFloat(proc.querySelector('vl_ServCobrado')?.textContent?.replace(',', '.') || '0');
          const qtde = parseFloat(proc.querySelector('qt_Cobrada')?.textContent?.replace(',', '.') || '1');
          const txAdm = parseFloat(proc.querySelector('tx_AdmServico')?.textContent?.replace(',', '.') || '0');
          const valorTotal = vlServico + txAdm;
          
          valorGuia += valorTotal * qtde;
          
          // Validação de procedimento
          if (!cdServico || cdServico.length !== 8) {
            warnings.push({
              code: 'WARN-045',
              message: `Procedimento ${cdServico} - Código inválido ou não cadastrado`,
              package: 'PKG_PTU_BATCH_GLOSA',
              function: 'glosa_ProcedimentosA500',
              suggestion: 'Verificar se o código do procedimento existe na tabela TUSS e está no formato correto (8 dígitos)'
            });
            glosaGuia += valorTotal * qtde;
          }
          
          // Validação de valor
          if (vlServico > 200) {
            warnings.push({
              code: 'WARN-238',
              message: `Procedimento ${cdServico} - Valor de honorário divergente da tabela (R$ ${vlServico.toFixed(2)} > R$ 200.00)`,
              package: 'PKG_PTU_BATCH_GLOSA',
              function: 'glosa_ProcedimentosA500',
              suggestion: 'Verificar valor cobrado vs valor tabelado'
            });
            glosaGuia += (valorTotal - 200) * qtde;
          }
          
          procList.push({
            codigo: cdServico,
            valor: vlServico,
            qtde: qtde,
            glosa: (valorTotal - 200) * qtde > 0 ? (valorTotal - 200) * qtde : undefined
          });
        });
        
        totalValor += valorGuia;
        totalGlosado += glosaGuia;
        
        contas.push({
          id: parseInt(nrGuia) || Date.now() + idx,
          tipoConta: 'Consulta',
          guiaPrincipal: nrGuia,
          valorApresentado: valorGuia,
          valorGlosado: glosaGuia,
          status: glosaGuia > 0 ? (glosaGuia === valorGuia ? 'glosed' : 'processed') : 'processed',
          errors: glosaGuia > 0 ? ['Valor divergente da tabela'] : [],
          procedimentos: procList
        });
        
      } catch (err) {
        errors.push({
          code: 'ERR-500',
          message: `Erro ao processar guia de consulta: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
          package: 'PKG_PTU_BATCH_LEITURA',
          function: 'stpInsereConsultaTemp',
          severity: 'error',
          solution: 'Verificar a estrutura do XML na guiaConsulta'
        });
        status = 'error';
      }
    });
    
    // Processar guias SADT
    guiasSADT.forEach((guia, idx) => {
      try {
        const idBenef = guia.querySelector('id_Benef')?.textContent || '';
        const nmBenef = guia.querySelector('nm_Benef')?.textContent || '';
        const execNome = guia.querySelector('exec_nome')?.textContent || '';
        const nrGuia = guia.querySelector('nr_GuiaTissPrestador')?.textContent || '';
        
        if (!idBenef) {
          errors.push({
            code: 'ERR-040',
            message: `Beneficiário não encontrado na base de dados - id_Benef: ${idBenef}`,
            package: 'PKG_PTU_BATCH_LEITURA',
            function: 'leitura_A500',
            severity: 'error',
            affectedFields: ['id_Benef'],
            solution: 'Verificar se o código do beneficiário está correto'
          });
          status = 'error';
          return;
        }
        
        const procedimentos = guia.querySelectorAll('procedimentosExecutados procedimentos');
        let valorGuia = 0;
        let glosaGuia = 0;
        const procList: Array<{ codigo: string; valor: number; qtde: number; glosa?: number }> = [];
        
        procedimentos.forEach(proc => {
          const cdServico = proc.querySelector('cd_Servico')?.textContent || '';
          const vlServico = parseFloat(proc.querySelector('vl_ServCobrado')?.textContent?.replace(',', '.') || '0');
          const vlCO = parseFloat(proc.querySelector('vl_CO_Cobrado')?.textContent?.replace(',', '.') || '0');
          const vlFilme = parseFloat(proc.querySelector('vl_FilmeCobrado')?.textContent?.replace(',', '.') || '0');
          const qtde = parseFloat(proc.querySelector('qt_Cobrada')?.textContent?.replace(',', '.') || '1');
          const txAdm = parseFloat(proc.querySelector('tx_AdmServico')?.textContent?.replace(',', '.') || '0');
          const valorTotal = vlServico + vlCO + vlFilme + txAdm;
          
          valorGuia += valorTotal * qtde;
          
          if (!cdServico) {
            warnings.push({
              code: 'WARN-045',
              message: `Procedimento SADT sem código - ignorado`,
              package: 'PKG_PTU_BATCH_GLOSA',
              function: 'glosa_ProcedimentosA500',
              suggestion: 'Verificar se o código do procedimento está presente no XML'
            });
            glosaGuia += valorTotal * qtde;
          }
          
          procList.push({
            codigo: cdServico,
            valor: vlServico,
            qtde: qtde,
            glosa: glosaGuia > 0 ? glosaGuia : undefined
          });
        });
        
        totalValor += valorGuia;
        totalGlosado += glosaGuia;
        
        contas.push({
          id: parseInt(nrGuia) || Date.now() + idx,
          tipoConta: 'SADT',
          guiaPrincipal: nrGuia,
          valorApresentado: valorGuia,
          valorGlosado: glosaGuia,
          status: glosaGuia > 0 ? (glosaGuia === valorGuia ? 'glosed' : 'processed') : 'processed',
          errors: glosaGuia > 0 ? ['Procedimento não autorizado'] : [],
          procedimentos: procList
        });
        
      } catch (err) {
        errors.push({
          code: 'ERR-500',
          message: `Erro ao processar guia SADT: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
          package: 'PKG_PTU_BATCH_LEITURA',
          function: 'stpInsereSadtTemp',
          severity: 'error',
          solution: 'Verificar a estrutura do XML na guiaSADT'
        });
        status = 'error';
      }
    });
    
    // Validação de prazo
    const processDate = new Date();
    const xmlDate = new Date(dtGeracao.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'));
    const daysDiff = (processDate.getTime() - xmlDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysDiff > 180) {
      warnings.push({
        code: 'WARN-037',
        message: `Prazo de apresentação vencido - ${Math.floor(daysDiff)} dias após a data de geração`,
        package: 'PKG_PTU_BATCH_GLOSA',
        function: 'fun_glosaPrazoVencido',
        suggestion: 'Contas devem ser apresentadas em até 180 dias após o atendimento'
      });
      totalGlosado += totalValor * 0.05; // 5% de glosa por prazo
      if (status === 'processing') {
        status = 'warning';
      }
    }
    
    logs.push({
      timestamp: new Date().toISOString(),
      level: errors.length > 0 ? 'error' : 'info',
      message: `${contas.length} contas criadas, Valor total: R$ ${totalValor.toFixed(2)}, Glosas: R$ ${totalGlosado.toFixed(2)}`,
      package: 'PKG_PTU_BATCH_LEITURA',
      function: 'leitura_A500'
    });
    
    logs.push({
      timestamp: new Date().toISOString(),
      level: errors.length > 0 ? 'error' : 'info',
      message: errors.length > 0 ? 'Processamento abortado - Erro crítico' : 'Processamento concluído com sucesso',
      package: 'PKG_PTU_BATCH_LEITURA',
      function: 'leitura_A500'
    });
    
    status = errors.length > 0 ? 'error' : (warnings.length > 0 ? 'warning' : 'success');
    
    return {
      id: Date.now().toString(),
      fileName,
      version: nrVerTra,
      status,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      totalContas: contas.length,
      totalValor,
      totalGlosado,
      errors,
      warnings,
      logs,
      xmlContent: xmlContent.substring(0, 500) + '...',
      originalXml: xmlContent
    };
    
  } catch (err) {
    logs.push({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: `Erro crítico: ${err instanceof Error ? err.message : 'Erro desconhecido'}`,
      package: 'PKG_PTU_BATCH_LEITURA',
      function: 'insereXMLA500X'
    });
    
    errors.push({
      code: 'ERR-500',
      message: err instanceof Error ? err.message : 'Erro ao processar XML',
      package: 'PKG_PTU_BATCH_LEITURA',
      function: 'insereXMLA500X',
      severity: 'error',
      solution: 'Verificar se o XML está bem formado e segue o schema PTU'
    });
    
    return {
      id: Date.now().toString(),
      fileName,
      version: 'unknown',
      status: 'error',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      totalContas: 0,
      totalValor: 0,
      totalGlosado: 0,
      errors,
      warnings,
      logs,
      xmlContent: xmlContent.substring(0, 500)
    };
  }
};

// ==================== COMPONENTE PRINCIPAL ====================

const PTUDashboard = () => {
  const [processes, setProcesses] = useState<PtuProcess[]>([]);
  const [contas, setContas] = useState<ContaProcessada[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<PtuProcess | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'success' | 'warning' | 'error'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'processos' | 'contas' | 'analise' | 'regras'>('processos');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showXmlModal, setShowXmlModal] = useState(false);
  const [selectedXml, setSelectedXml] = useState<string | null>(null);
  const [xmlInput, setXmlInput] = useState('');

  // Carregar processos salvos no localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ptu_processes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProcesses(parsed);
        
        // Extrair contas dos processos
        const allContas: ContaProcessada[] = [];
        parsed.forEach((p: PtuProcess) => {
          // Simular extração de contas do processo
          for (let i = 0; i < p.totalContas; i++) {
            allContas.push({
              id: parseInt(p.id) + i,
              tipoConta: ['Consulta', 'SADT', 'Internação', 'Honorários'][i % 4],
              guiaPrincipal: `${p.id}${i}`,
              valorApresentado: p.totalValor / p.totalContas,
              valorGlosado: p.totalGlosado / p.totalContas,
              status: p.status === 'error' ? 'error' : (p.totalGlosado > 0 ? 'glosed' : 'processed'),
              errors: p.errors.length > 0 ? p.errors.map(e => e.message) : []
            });
          }
        });
        setContas(allContas);
      } catch (e) {
        console.error('Erro ao carregar dados salvos', e);
      }
    }
  }, []);

  // Salvar processos no localStorage
  useEffect(() => {
    if (processes.length > 0) {
      localStorage.setItem('ptu_processes', JSON.stringify(processes));
    }
  }, [processes]);

  const handleFileImport = async (file: File) => {
    setImporting(true);
    try {
      const content = await file.text();
      const result = await processXML(content, file.name);
      setProcesses(prev => [result, ...prev]);
      
      // Atualizar contas
      const newContas: ContaProcessada[] = [];
      for (let i = 0; i < result.totalContas; i++) {
        newContas.push({
          id: parseInt(result.id) + i,
          tipoConta: 'Consulta',
          guiaPrincipal: `${result.id}${i}`,
          valorApresentado: result.totalValor / result.totalContas,
          valorGlosado: result.totalGlosado / result.totalContas,
          status: result.status === 'error' ? 'error' : (result.totalGlosado > 0 ? 'glosed' : 'processed'),
          errors: result.errors.length > 0 ? result.errors.map(e => e.message) : []
        });
      }
      setContas(prev => [...newContas, ...prev]);
      
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      alert('Erro ao processar arquivo. Verifique se é um XML válido.');
    } finally {
      setImporting(false);
    }
  };

  const handleXmlImport = async () => {
    if (!xmlInput.trim()) {
      alert('Por favor, cole o conteúdo XML');
      return;
    }
    
    setImporting(true);
    try {
      const result = await processXML(xmlInput, `import_${Date.now()}.xml`);
      setProcesses(prev => [result, ...prev]);
      
      const newContas: ContaProcessada[] = [];
      for (let i = 0; i < result.totalContas; i++) {
        newContas.push({
          id: parseInt(result.id) + i,
          tipoConta: 'Consulta',
          guiaPrincipal: `${result.id}${i}`,
          valorApresentado: result.totalValor / result.totalContas,
          valorGlosado: result.totalGlosado / result.totalContas,
          status: result.status === 'error' ? 'error' : (result.totalGlosado > 0 ? 'glosed' : 'processed'),
          errors: result.errors.length > 0 ? result.errors.map(e => e.message) : []
        });
      }
      setContas(prev => [...newContas, ...prev]);
      
      setXmlInput('');
      alert('XML importado com sucesso!');
    } catch (error) {
      console.error('Erro ao processar XML:', error);
      alert('Erro ao processar XML. Verifique se é um XML PTU válido.');
    } finally {
      setImporting(false);
    }
  };

  const handleDeleteProcess = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este processo?')) {
      setProcesses(prev => prev.filter(p => p.id !== id));
      if (selectedProcess?.id === id) {
        setSelectedProcess(null);
      }
    }
  };

  const filteredProcesses = useMemo(() => {
    return processes.filter(process => {
      const matchesSearch = searchTerm === '' || 
        process.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        process.id.includes(searchTerm);
      const matchesStatus = filterStatus === 'all' || process.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [processes, searchTerm, filterStatus]);

  const stats = useMemo((): PtuStats | null => {
    if (processes.length === 0) return null;
    
    const total = processes.length;
    const success = processes.filter(p => p.status === 'success').length;
    const error = processes.filter(p => p.status === 'error').length;
    const warning = processes.filter(p => p.status === 'warning').length;
    const totalValor = processes.reduce((sum, p) => sum + p.totalValor, 0);
    const totalGlosado = processes.reduce((sum, p) => sum + p.totalGlosado, 0);
    const avgGlosa = totalValor > 0 ? (totalGlosado / totalValor) * 100 : 0;
    const lastProcess = processes[0]?.createdAt || new Date().toISOString();
    
    return {
      totalProcessos: total,
      successCount: success,
      errorCount: error,
      warningCount: warning,
      totalValorProcessado: totalValor,
      totalValorGlosado: totalGlosado,
      avgGlosaPercent: parseFloat(avgGlosa.toFixed(1)),
      lastProcessDate: lastProcess
    };
  }, [processes]);

  const activeFiltersCount = (searchTerm ? 1 : 0) + (filterStatus !== 'all' ? 1 : 0);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">Sucesso</span>;
      case 'warning':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">Aviso</span>;
      case 'error':
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">Erro</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">Processando</span>;
    }
  };

  const topGlosaMotivos = useMemo(() => {
    const motivos: Record<string, { count: number; value: number }> = {};
    processes.forEach(p => {
      p.warnings.forEach(w => {
        if (!motivos[w.code]) {
          motivos[w.code] = { count: 0, value: 0 };
        }
        motivos[w.code].count++;
        motivos[w.code].value += p.totalGlosado / p.warnings.length;
      });
      p.errors.forEach(e => {
        if (!motivos[e.code]) {
          motivos[e.code] = { count: 0, value: 0 };
        }
        motivos[e.code].count++;
        motivos[e.code].value += p.totalGlosado || 100;
      });
    });
    return Object.entries(motivos)
      .sort((a, b) => b[1].value - a[1].value)
      .slice(0, 5)
      .map(([code, data]) => ({ code, ...data }));
  }, [processes]);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-zinc-400">Carregando dados PTU...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-sky-500 to-purple-500 bg-clip-text text-transparent">
              PTU Package Analyzer
            </h1>
            <p className="text-zinc-400 mt-1">
              Monitoramento e análise dos pacotes PKG_PTU_A500, PKG_PTU_BATCH_LEITURA, PKG_PACOTE e PKG_PTU_BATCH_GLOSA
            </p>
          </div>

          <div className="flex gap-2">
            <label className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 rounded-lg text-white transition-all cursor-pointer">
              <Upload size={18} />
              {importing ? 'Importando...' : 'Importar XML'}
              <input
                type="file"
                accept=".xml"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileImport(file);
                }}
                disabled={importing}
              />
            </label>
            
            <button
              onClick={() => setShowXmlModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white transition-all"
            >
              <FileText size={18} />
              Colar XML
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white transition-all"
            >
              <RefreshCw size={18} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <p className="text-sm text-zinc-400">Processos</p>
              <p className="text-2xl font-bold text-white">{stats.totalProcessos}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <p className="text-sm text-zinc-400">Sucesso</p>
              <p className="text-2xl font-bold text-green-500">{stats.successCount}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <p className="text-sm text-zinc-400">Erros</p>
              <p className="text-2xl font-bold text-red-500">{stats.errorCount}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <p className="text-sm text-zinc-400">Avisos</p>
              <p className="text-2xl font-bold text-yellow-500">{stats.warningCount}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <p className="text-sm text-zinc-400">Valor Processado</p>
              <p className="text-lg font-bold text-white">R$ {stats.totalValorProcessado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <p className="text-sm text-zinc-400">Valor Glosado</p>
              <p className="text-lg font-bold text-red-400">R$ {stats.totalValorGlosado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
              <p className="text-sm text-zinc-400">% Glosa</p>
              <p className="text-2xl font-bold text-yellow-500">{stats.avgGlosaPercent}%</p>
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="border-b border-zinc-800 mb-6">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'processos', name: 'Processos', icon: FileText },
              { id: 'contas', name: 'Contas', icon: Database },
              { id: 'analise', name: 'Análise', icon: BarChart3 },
              { id: 'regras', name: 'Regras e Glosas', icon: AlertCircle },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center py-4 px-1 border-b-2 text-sm font-medium ${
                  activeTab === tab.id
                    ? 'border-sky-500 text-sky-500'
                    : 'border-transparent text-zinc-400 hover:text-zinc-300 hover:border-zinc-600'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab: Processos */}
        {activeTab === 'processos' && (
          <>
            {/* Search and Filters */}
            <div className="mb-6 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-2.5 text-zinc-500" size={20} />
                  <input
                    type="text"
                    placeholder="Buscar por nome do arquivo ou ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 transition-colors"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-2.5 text-zinc-500 hover:text-white"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                    showFilters || activeFiltersCount > 0
                      ? 'bg-sky-500/10 border-sky-500 text-sky-500'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  <Filter size={18} />
                  Filtros
                  {activeFiltersCount > 0 && (
                    <span className="ml-1 bg-sky-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>
              </div>

              {showFilters && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-wrap gap-4">
                  <div>
                    <label className="block text-sm text-zinc-400 mb-1">Status</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as any)}
                      className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="all">Todos</option>
                      <option value="success">Sucesso</option>
                      <option value="warning">Aviso</option>
                      <option value="error">Erro</option>
                    </select>
                  </div>

                  {activeFiltersCount > 0 && (
                    <div className="flex items-end">
                      <button
                        onClick={clearFilters}
                        className="text-sm text-zinc-400 hover:text-white flex items-center gap-1"
                      >
                        <X size={14} />
                        Limpar filtros
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Processes List */}
            <div className="space-y-3">
              {filteredProcesses.length === 0 ? (
                <div className="text-center py-16 bg-zinc-900/50 border border-zinc-800 rounded-lg">
                  <Upload size={48} className="mx-auto text-zinc-700 mb-4" />
                  <p className="text-zinc-400 text-lg mb-2">Nenhum processo encontrado</p>
                  <p className="text-zinc-500 text-sm">
                    {searchTerm || filterStatus !== 'all'
                      ? 'Tente ajustar seus filtros ou termos de busca'
                      : 'Clique em "Importar XML" para começar'}
                  </p>
                </div>
              ) : (
                filteredProcesses.map((process) => (
                  <div
                    key={process.id}
                    className={`bg-zinc-900/50 border rounded-xl overflow-hidden transition-all ${
                      selectedProcess?.id === process.id
                        ? 'border-sky-500'
                        : 'border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div
                      className="p-4 cursor-pointer"
                      onClick={() => setSelectedProcess(selectedProcess?.id === process.id ? null : process)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="font-mono text-sm text-sky-400">{process.fileName}</span>
                            {getStatusBadge(process.status)}
                            <span className="text-xs text-zinc-500">Versão: {process.version}</span>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-zinc-400">
                            <span className="flex items-center gap-1">
                              <Calendar size={14} />
                              {new Date(process.createdAt).toLocaleString('pt-BR')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Database size={14} />
                              {process.totalContas} contas
                            </span>
                            <span className="flex items-center gap-1">
                              <TrendingUp size={14} />
                              R$ {process.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            {process.totalGlosado > 0 && (
                              <span className="flex items-center gap-1 text-red-400">
                                <TrendingDown size={14} />
                                R$ {process.totalGlosado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                          {process.warnings.length > 0 && (
                            <div className="mt-2 flex items-center gap-1 text-yellow-400 text-xs">
                              <AlertTriangle size={12} />
                              <span>{process.warnings.length} aviso(s)</span>
                            </div>
                          )}
                          {process.errors.length > 0 && (
                            <div className="mt-2 flex items-center gap-1 text-red-400 text-xs">
                              <AlertCircle size={12} />
                              <span>{process.errors.length} erro(s)</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedXml(process.originalXml || process.xmlContent || null);
                            }}
                            className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                            title="Ver XML"
                          >
                            <FileSearch size={18} className="text-zinc-400" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProcess(process.id);
                            }}
                            className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                            title="Excluir"
                          >
                            <X size={18} className="text-red-400" />
                          </button>
                          <ChevronRight className={`h-5 w-5 text-zinc-500 transition-transform ${selectedProcess?.id === process.id ? 'rotate-90' : ''}`} />
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {selectedProcess?.id === process.id && (
                      <div className="border-t border-zinc-800 p-4 bg-zinc-900/30">
                        {/* Errors */}
                        {process.errors.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-2">
                              <AlertCircle size={14} />
                              Erros
                            </h4>
                            <div className="space-y-2">
                              {process.errors.map((error, idx) => (
                                <div key={idx} className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <span className="font-mono text-xs text-red-400">{error.code}</span>
                                      <p className="text-sm text-white mt-1">{error.message}</p>
                                      <p className="text-xs text-zinc-400 mt-1">
                                        {error.package}.{error.function}
                                        {error.line && `:${error.line}`}
                                      </p>
                                      {error.affectedFields && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                          {error.affectedFields.map(field => (
                                            <code key={field} className="text-xs bg-zinc-800 px-1.5 py-0.5 rounded">{field}</code>
                                          ))}
                                        </div>
                                      )}
                                      {error.solution && (
                                        <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                                          <CheckCircle size={12} />
                                          {error.solution}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Warnings */}
                        {process.warnings.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-yellow-400 flex items-center gap-2 mb-2">
                              <AlertTriangle size={14} />
                              Avisos
                            </h4>
                            <div className="space-y-2">
                              {process.warnings.map((warning, idx) => (
                                <div key={idx} className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <span className="font-mono text-xs text-yellow-400">{warning.code}</span>
                                      <p className="text-sm text-white mt-1">{warning.message}</p>
                                      <p className="text-xs text-zinc-400 mt-1">
                                        {warning.package}.{warning.function}
                                      </p>
                                      <p className="text-xs text-blue-400 mt-2 flex items-center gap-1">
                                        <MessageSquare size={12} />
                                        Sugestão: {warning.suggestion}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Logs */}
                        <div>
                          <h4 className="text-sm font-semibold text-zinc-400 flex items-center gap-2 mb-2">
                            <Clock size={14} />
                            Logs de Processamento
                          </h4>
                          <div className="space-y-1 max-h-64 overflow-y-auto font-mono text-xs">
                            {process.logs.map((log, idx) => (
                              <div key={idx} className="flex items-start gap-2">
                                <span className="text-zinc-500 whitespace-nowrap">
                                  {new Date(log.timestamp).toLocaleTimeString('pt-BR')}
                                </span>
                                <span className={`${
                                  log.level === 'error' ? 'text-red-400' :
                                  log.level === 'warning' ? 'text-yellow-400' :
                                  'text-green-400'
                                }`}>
                                  [{log.level.toUpperCase()}]
                                </span>
                                <span className="text-zinc-400">{log.package}.{log.function}</span>
                                <span className="text-white flex-1">{log.message}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {/* Tab: Contas */}
        {activeTab === 'contas' && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-zinc-800/50 border-b border-zinc-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Conta</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Guia Principal</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">Valor Apresentado</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase">Valor Glosado</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Erros</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {contas.slice(0, 20).map((conta) => (
                    <tr key={conta.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-sm text-sky-400">{conta.id}</td>
                      <td className="px-4 py-3 text-sm text-zinc-300">{conta.tipoConta}</td>
                      <td className="px-4 py-3 font-mono text-sm text-zinc-400">{conta.guiaPrincipal}</td>
                      <td className="px-4 py-3 text-right text-sm text-white">R$ {conta.valorApresentado.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-sm text-red-400">R$ {conta.valorGlosado.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          conta.status === 'processed' ? 'bg-green-500/20 text-green-400' :
                          conta.status === 'glosed' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {conta.status === 'processed' ? 'Processada' :
                           conta.status === 'glosed' ? 'Glosada' : 'Erro'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {conta.errors.length > 0 ? (
                          <div className="text-xs text-red-400">
                            {conta.errors.map((err, i) => (
                              <div key={i}>{err}</div>
                            ))}
                          </div>
                        ) : (
                          <CheckCircle size={16} className="text-green-500" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {contas.length > 20 && (
              <div className="p-4 text-center text-sm text-zinc-500 border-t border-zinc-800">
                Mostrando 20 de {contas.length} contas
              </div>
            )}
          </div>
        )}

        {/* Tab: Análise */}
        {activeTab === 'analise' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingUp size={20} className="text-green-400" />
                  Top Motivos de Glosa
                </h3>
                <div className="space-y-3">
                  {topGlosaMotivos.length > 0 ? topGlosaMotivos.map((item) => (
                    <div key={item.code}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-zinc-400">{item.code}</span>
                        <span className="text-white font-medium">R$ {item.value.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-2 mt-1">
                        <div className="bg-red-500 rounded-full h-2" style={{ width: `${Math.min(100, (item.value / (stats?.totalValorGlosado || 1)) * 100)}%` }} />
                      </div>
                      <div className="text-xs text-zinc-500 mt-1">{item.count} ocorrências</div>
                    </div>
                  )) : (
                    <p className="text-zinc-500 text-center py-8">Nenhuma glosa registrada</p>
                  )}
                </div>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Database size={20} className="text-sky-400" />
                  Estatísticas de Processamento
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Taxa de Sucesso</span>
                    <span className="text-white font-medium">{stats ? ((stats.successCount / stats.totalProcessos) * 100).toFixed(1) : 0}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div className="bg-green-500 rounded-full h-2" style={{ width: `${stats ? (stats.successCount / stats.totalProcessos) * 100 : 0}%` }} />
                  </div>
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-zinc-400">Taxa de Glosa</span>
                    <span className="text-white font-medium">{stats?.avgGlosaPercent || 0}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div className="bg-yellow-500 rounded-full h-2" style={{ width: `${stats?.avgGlosaPercent || 0}%` }} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-red-500/10 to-yellow-500/10 border border-red-500/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                <AlertCircle size={20} className="text-red-400" />
                Como diagnosticar um erro ou glosa?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-zinc-900/50 rounded-lg p-3">
                  <span className="font-medium text-sky-400">1. Identifique o código</span>
                  <p className="text-zinc-400 mt-1">Verifique o código de glosa ou erro na mensagem.</p>
                </div>
                <div className="bg-zinc-900/50 rounded-lg p-3">
                  <span className="font-medium text-sky-400">2. Consulte a regra</span>
                  <p className="text-zinc-400 mt-1">Use a aba "Regras e Glosas" para entender a condição.</p>
                </div>
                <div className="bg-zinc-900/50 rounded-lg p-3">
                  <span className="font-medium text-sky-400">3. Analise o XML</span>
                  <p className="text-zinc-400 mt-1">Clique no ícone de busca para ver o XML original.</p>
                </div>
                <div className="bg-zinc-900/50 rounded-lg p-3">
                  <span className="font-medium text-sky-400">4. Verifique os campos</span>
                  <p className="text-zinc-400 mt-1">Confira os campos afetados listados na regra.</p>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Package size={20} className="text-purple-400" />
                Dependências dos Pacotes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <p className="font-medium text-sky-400">PKG_PTU_A500</p>
                  <p className="text-xs text-zinc-500 mt-1">Geração de arquivos PTU A500</p>
                  <div className="mt-2 text-xs text-zinc-400">
                    Depende de: PKG_CONTA_MEDICA, PKG_PRODUTO, PKG_LOTE
                  </div>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <p className="font-medium text-green-400">PKG_PTU_BATCH_LEITURA</p>
                  <p className="text-xs text-zinc-500 mt-1">Leitura e processamento</p>
                  <div className="mt-2 text-xs text-zinc-400">
                    Depende de: PKG_LOTE, PKG_CONTA_MEDICA, PKG_PTU_BATCH_GLOSA
                  </div>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <p className="font-medium text-yellow-400">PKG_PACOTE</p>
                  <p className="text-xs text-zinc-500 mt-1">Gerenciamento de pacotes SISPAC</p>
                  <div className="mt-2 text-xs text-zinc-400">
                    Depende de: PKG_PRODUTO, PKG_TAXA, PKG_PROCEDIMENTO
                  </div>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-3">
                  <p className="font-medium text-red-400">PKG_PTU_BATCH_GLOSA</p>
                  <p className="text-xs text-zinc-500 mt-1">Aplicação de regras de glosa</p>
                  <div className="mt-2 text-xs text-zinc-400">
                    Depende de: PKG_GLOSAS, PKG_CONTA_MEDICA
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Regras e Glosas */}
        {activeTab === 'regras' && (
          <div className="space-y-6">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <XCircle size={20} className="text-red-400" />
                Principais Regras de Glosa
              </h3>
              <div className="space-y-4">
                {[
                  { code: '40', name: 'Usuário Não Localizado', severity: 'error', description: 'Beneficiário não encontrado na base' },
                  { code: '45', name: 'Procedimento Não Cadastrado', severity: 'error', description: 'Código de procedimento inválido' },
                  { code: '31', name: 'Procedimento Não Autorizado', severity: 'error', description: 'Procedimento não autorizado na guia' },
                  { code: '6', name: 'Sem Cobertura', severity: 'error', description: 'Procedimento sem cobertura no plano' },
                  { code: '37', name: 'Prazo de Apresentação Vencido', severity: 'warning', description: 'Conta fora do prazo estabelecido' },
                  { code: '139', name: 'Campo Obrigatório Não Preenchido', severity: 'warning', description: 'Campo obrigatório do XML vazio' },
                  { code: '236', name: 'Material Valor Divergente', severity: 'warning', description: 'Valor do material divergente' },
                  { code: '238', name: 'Procedimento Valor Divergente', severity: 'warning', description: 'Valor do procedimento divergente' },
                ].map((rule) => (
                  <div key={rule.code} className="flex items-start gap-3 p-3 bg-zinc-800/30 rounded-lg">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      rule.severity === 'error' ? 'bg-red-500/20' : 'bg-yellow-500/20'
                    }`}>
                      {rule.severity === 'error' ? (
                        <XCircle size={20} className="text-red-400" />
                      ) : (
                        <AlertTriangle size={20} className="text-yellow-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm text-sky-400">{rule.code}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          rule.severity === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {rule.severity === 'error' ? 'Erro' : 'Aviso'}
                        </span>
                      </div>
                      <p className="text-white font-medium mt-1">{rule.name}</p>
                      <p className="text-sm text-zinc-400 mt-1">{rule.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <CheckCircle size={20} className="text-green-400" />
                Regras de Validação
              </h3>
              <div className="space-y-4">
                {[
                  { name: 'ehContaSADT', description: 'Determina se conta deve ser processada como SADT ou Internação' },
                  { name: 'ehHonorario', description: 'Verifica se item deve ser processado como honorário' },
                  { name: 'valida_pacote_intercambio', description: 'Valida se pacote existe e tem vigência ativa' },
                  { name: 'fun_glosaPrazoVencido', description: 'Valida prazo de apresentação da conta' },
                  { name: 'glosaSemCobertura', description: 'Verifica cobertura do procedimento no plano' },
                ].map((rule, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-zinc-800/30 rounded-lg">
                    <CheckCircle size={20} className="text-green-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-mono text-sm text-sky-400">{rule.name}</p>
                      <p className="text-sm text-zinc-400 mt-1">{rule.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-r from-sky-500/10 to-purple-500/10 border border-sky-500/30 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
                <FileSearch size={20} className="text-sky-400" />
                Campos Afetados por Glosa
              </h3>
              <div className="flex flex-wrap gap-2">
                {['cd_Unimed', 'id_Benef', 'nr_Autorizacao', 'cd_Servico', 'tp_Tabela', 'vl_ServCobrado', 'qt_Cobrada', 'hssusua.ccodiusua', 'hsspcon.ccodipmed', 'hsspcon.nciruhono'].map((field) => (
                  <code key={field} className="px-2 py-1 bg-zinc-800 rounded text-xs font-mono text-zinc-300">
                    {field}
                  </code>
                ))}
              </div>
              <p className="text-xs text-zinc-500 mt-4">
                Dica: Utilize a análise de logs para identificar campos específicos que causaram glosa.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal para colar XML */}
      {showXmlModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-zinc-700">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Importar XML</h2>
              <button onClick={() => setShowXmlModal(false)} className="p-2 hover:bg-zinc-800 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <textarea
                value={xmlInput}
                onChange={(e) => setXmlInput(e.target.value)}
                placeholder="Cole o conteúdo do XML aqui..."
                className="w-full h-96 bg-zinc-800 border border-zinc-700 rounded-lg p-4 text-white font-mono text-sm focus:outline-none focus:border-sky-500"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setShowXmlModal(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleXmlImport}
                  disabled={importing}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 rounded-lg flex items-center gap-2"
                >
                  {importing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                  Importar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para visualizar XML */}
      {selectedXml && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-zinc-700">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Visualizar XML</h2>
              <button onClick={() => setSelectedXml(null)} className="p-2 hover:bg-zinc-800 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-auto max-h-[70vh]">
              <pre className="text-xs font-mono text-zinc-300 whitespace-pre-wrap break-all bg-zinc-800/50 p-4 rounded-lg">
                {selectedXml}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PTUDashboard;