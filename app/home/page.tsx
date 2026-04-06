'use client';

import withAuth from '../components/withAuth';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '../AuthContext';
import { motion, AnimatePresence, Reorder } from 'framer-motion';

// Ícones
import {
  LayoutDashboard,
  Users,
  FileText,
  Link2,
  Star,
  TrendingUp,
  Award,
  MessageSquare,
  Calendar,
  Bell,
  ChevronRight,
  Sparkles,
  Rocket,
  Target,
  Brain,
  Zap,
  Clock,
  CheckCircle2,
  ArrowRight,
  PlusCircle,
  Activity,
  Smile,
  ThumbsUp,
  Eye,
  Ticket,
  BookOpen,
  PieChart,
  Network,
  HeadphonesIcon,
  Kanban,
  Home,
  User,
  Menu,
  X,
  Search,
  Copy,
  Check,
  Heart,
  Hospital,
  Stethoscope,
  Edit2,
  Trash2,
  GripVertical,
  Save,
  XCircle,
  RefreshCw,
  AlertTriangle,
  Shield,
  ShieldCheck,
  ArrowLeftRight
} from 'lucide-react';

interface Unimed {
  codigo: string;
  nome: string;
  status: 'homologada' | 'em_homologacao' | 'inativa';
  observacao?: string;
  dataAtualizacao?: string;
}

// Define a type for the QuickAction props
interface QuickActionProps {
  icon: React.ElementType;
  label: string;
  href: string;
  color: string;
}
// Dados das Unimeds
// Dados completos das Unimeds - Versão antiga migrada para nova estrutura
const initialUnimedsData = {
  homologadas: [
    { codigo: "001", nome: "Unimed Santos", status: "homologada" as const },
    { codigo: "002", nome: "Unimed Campinas", status: "homologada" as const },
    { codigo: "003", nome: "Unimed Piracicaba", status: "homologada" as const },
    { codigo: "004", nome: "Unimed São José dos Campos", status: "homologada" as const },
    { codigo: "005", nome: "Unimed Londrina", status: "homologada" as const },
    { codigo: "006", nome: "Unimed Belo Horizonte", status: "homologada" as const },
    { codigo: "008", nome: "Unimed Ribeirão Preto", status: "homologada" as const },
    { codigo: "009", nome: "Unimed Franca", status: "homologada" as const },
    { codigo: "012", nome: "Unimed Rio Claro", status: "homologada" as const },
    { codigo: "013", nome: "Unimed Araraquara", status: "homologada" as const },
    { codigo: "015", nome: "Unimed São Carlos", status: "homologada" as const },
    { codigo: "017", nome: "Unimed Leste Fluminense", status: "homologada" as const },
    { codigo: "018", nome: "Unimed Sorocaba", status: "homologada" as const },
    { codigo: "020", nome: "Unimed Guaratinguetá", status: "homologada" as const },
    { codigo: "021", nome: "Unimed Uberaba", status: "homologada" as const },
    { codigo: "022", nome: "Unimed Bauru", status: "homologada" as const },
    { codigo: "026", nome: "Unimed Blumenau", status: "homologada" as const },
    { codigo: "027", nome: "Unimed Joinville", status: "homologada" as const },
    { codigo: "028", nome: "Unimed Erechim", status: "homologada" as const },
    { codigo: "029", nome: "Unimed Vales do Taquari e Rio Pardo", status: "homologada" as const },
    { codigo: "030", nome: "Unimed São José do Rio Preto", status: "homologada" as const },
    { codigo: "031", nome: "Unimed Noroeste/RS", status: "homologada" as const },
    { codigo: "032", nome: "Unimed Curitiba", status: "homologada" as const },
    { codigo: "034", nome: "Unimed Recife", status: "homologada" as const },
    { codigo: "035", nome: "Unimed Campina Grande", status: "homologada" as const },
    { codigo: "036", nome: "Unimed Missões/RS", status: "homologada" as const },
    { codigo: "041", nome: "Unimed Nordeste-RS", status: "homologada" as const },
    { codigo: "042", nome: "Unimed Planalto Médio", status: "homologada" as const },
    { codigo: "043", nome: "Unimed Fronteira Noroeste/RS", status: "homologada" as const },
    { codigo: "044", nome: "Unimed Presidente Prudente", status: "homologada" as const },
    { codigo: "045", nome: "Unimed Santa Maria/RS", status: "homologada" as const },
    { codigo: "047", nome: "Unimed Vale do Caí", status: "homologada" as const },
    { codigo: "048", nome: "Unimed Porto Alegre", status: "homologada" as const },
    { codigo: "049", nome: "Unimed Juiz de Fora", status: "homologada" as const },
    { codigo: "050", nome: "Unimed Varginha", status: "homologada" as const },
    { codigo: "051", nome: "Unimed Campo Grande", status: "homologada" as const },
    { codigo: "052", nome: "Unimed Barra Mansa", status: "homologada" as const },
    { codigo: "054", nome: "Unimed Serrana RJ", status: "homologada" as const },
    { codigo: "055", nome: "Unimed Vale do Sinos", status: "homologada" as const },
    { codigo: "056", nome: "Unimed Cuiabá", status: "homologada" as const },
    { codigo: "058", nome: "Unimed Santa Bárbara D'oeste e Americana", status: "homologada" as const },
    { codigo: "061", nome: "Unimed Planalto Central - RS", status: "homologada" as const },
    { codigo: "068", nome: "Unimed Região da Campanha - RS", status: "homologada" as const },
    { codigo: "073", nome: "Unimed Avaré", status: "homologada" as const },
    { codigo: "080", nome: "Unimed Vitória", status: "homologada" as const },
    { codigo: "082", nome: "Unimed Vale do Aço", status: "homologada" as const },
    { codigo: "091", nome: "Unimed Caçapava", status: "homologada" as const },
    { codigo: "092", nome: "Unimed Regional da Baixa Mogiana", status: "homologada" as const },
    { codigo: "094", nome: "Unimed Ourinhos", status: "homologada" as const },
    { codigo: "100", nome: "Unimed Alto da Serra", status: "homologada" as const },
    { codigo: "104", nome: "Unimed Votuporanga", status: "homologada" as const },
    { codigo: "109", nome: "Unimed Batatais", status: "homologada" as const },
    { codigo: "111", nome: "Unimed Leste Paulista", status: "homologada" as const },
    { codigo: "115", nome: "Unimed Assis", status: "homologada" as const },
    { codigo: "116", nome: "Unimed Costa Oeste", status: "homologada" as const },
    { codigo: "120", nome: "Unimed Anhanguera", status: "homologada" as const },
    { codigo: "122", nome: "Unimed Araguari", status: "homologada" as const },
    { codigo: "127", nome: "Unimed Jundiaí", status: "homologada" as const },
    { codigo: "128", nome: "Unimed Tupã", status: "homologada" as const },
    { codigo: "132", nome: "Unimed Sul Paulista", status: "homologada" as const },
    { codigo: "137", nome: "Unimed Itajubá", status: "homologada" as const },
    { codigo: "139", nome: "Unimed Rondonópolis", status: "homologada" as const },
    { codigo: "141", nome: "Unimed Vale das Antas", status: "homologada" as const },
    { codigo: "142", nome: "Unimed Região da Fronteira - RS", status: "homologada" as const },
    { codigo: "145", nome: "Unimed Sete Lagoas", status: "homologada" as const },
    { codigo: "146", nome: "Unimed Sul Mineira", status: "homologada" as const },
    { codigo: "148", nome: "Unimed Extremo Oeste Catarinense", status: "homologada" as const },
    { codigo: "153", nome: "Unimed Capivari", status: "homologada" as const },
    { codigo: "155", nome: "Unimed Inconfidentes", status: "homologada" as const },
    { codigo: "156", nome: "Unimed Circuito das Águas", status: "homologada" as const },
    { codigo: "157", nome: "Unimed Ubá", status: "homologada" as const },
    { codigo: "158", nome: "Unimed Cascavel", status: "homologada" as const },
    { codigo: "163", nome: "Unimed do Sudoeste", status: "homologada" as const },
    { codigo: "164", nome: "Unimed Araxá", status: "homologada" as const },
    { codigo: "165", nome: "Unimed Bebedouro", status: "homologada" as const },
    { codigo: "166", nome: "Unimed Muriaé", status: "homologada" as const },
    { codigo: "171", nome: "Unimed Gerais de Minas", status: "homologada" as const },
    { codigo: "173", nome: "Unimed Caratinga", status: "homologada" as const },
    { codigo: "176", nome: "Unimed Sul Capixaba", status: "homologada" as const },
    { codigo: "177", nome: "Unimed Patos de Minas", status: "homologada" as const },
    { codigo: "178", nome: "Unimed Anápolis", status: "homologada" as const },
    { codigo: "180", nome: "Unimed Costa do Sol", status: "homologada" as const },
    { codigo: "181", nome: "Unimed Noroeste do Paraná", status: "homologada" as const },
    { codigo: "186", nome: "Unimed Norte Capixaba", status: "homologada" as const },
    { codigo: "187", nome: "Unimed Pato Branco", status: "homologada" as const },
    { codigo: "190", nome: "Unimed Três Pontas", status: "homologada" as const },
    { codigo: "192", nome: "Unimed Amparo", status: "homologada" as const },
    { codigo: "196", nome: "Unimed Oeste do Pará", status: "homologada" as const },
    { codigo: "197", nome: "Unimed Birigui", status: "homologada" as const },
    { codigo: "198", nome: "Unimed Criciúma", status: "homologada" as const },
    { codigo: "200", nome: "Unimed João Monlevade", status: "homologada" as const },
    { codigo: "201", nome: "Unimed Marília", status: "homologada" as const },
    { codigo: "203", nome: "Unimed Viçosa", status: "homologada" as const },
    { codigo: "207", nome: "Unimed Planalto Norte", status: "homologada" as const },
    { codigo: "210", nome: "Unimed Vale do São Francisco", status: "homologada" as const },
    { codigo: "222", nome: "Unimed Palmas", status: "homologada" as const },
    { codigo: "226", nome: "Unimed Noroeste de Minas", status: "homologada" as const },
    { codigo: "231", nome: "Unimed Costa Verde", status: "homologada" as const },
    { codigo: "234", nome: "Unimed Três Corações", status: "homologada" as const },
    { codigo: "235", nome: "Unimed Araguaia", status: "homologada" as const },
    { codigo: "239", nome: "Unimed Campo Belo", status: "homologada" as const },
    { codigo: "240", nome: "Unimed Alfenas", status: "homologada" as const },
    { codigo: "244", nome: "Unimed Norte Paulista", status: "homologada" as const },
    { codigo: "247", nome: "Unimed Resende", status: "homologada" as const },
    { codigo: "248", nome: "Unimed Centro Sul Fluminense", status: "homologada" as const },
    { codigo: "249", nome: "Unimed São Sebastião do Paraíso", status: "homologada" as const },
    { codigo: "250", nome: "Unimed São José do Rio Pardo", status: "homologada" as const },
    { codigo: "252", nome: "Unimed Lavras", status: "homologada" as const },
    { codigo: "254", nome: "Unimed Noroeste Capixaba", status: "homologada" as const },
    { codigo: "257", nome: "Unimed Itaúna", status: "homologada" as const },
    { codigo: "260", nome: "Unimed Alto Jacuí", status: "homologada" as const },
    { codigo: "264", nome: "Unimed Araguaína", status: "homologada" as const },
    { codigo: "271", nome: "Unimed Vale do Jaurú", status: "homologada" as const },
    { codigo: "272", nome: "Unimed Jaboticabal", status: "homologada" as const },
    { codigo: "277", nome: "Unimed Encosta da Serra/RS", status: "homologada" as const },
    { codigo: "282", nome: "Unimed Vertente do Caparaó", status: "homologada" as const },
    { codigo: "283", nome: "Unimed São Roque", status: "homologada" as const },
    { codigo: "284", nome: "Unimed Tatuí", status: "homologada" as const },
    { codigo: "287", nome: "Unimed Guarulhos", status: "homologada" as const },
    { codigo: "289", nome: "Unimed Vale do Carangola", status: "homologada" as const },
    { codigo: "291", nome: "Unimed Litoral Sul/RS", status: "homologada" as const },
    { codigo: "296", nome: "Unimed Marquês de Valença", status: "homologada" as const },
    { codigo: "303", nome: "Unimed Região da Produção/RS", status: "homologada" as const },
    { codigo: "305", nome: "Unimed Pontal do Triângulo", status: "homologada" as const },
    { codigo: "310", nome: "Unimed Alto Paranaíba", status: "homologada" as const },
    { codigo: "312", nome: "Unimed Três Rios", status: "homologada" as const },
    { codigo: "315", nome: "Unimed Ponte Nova", status: "homologada" as const },
    { codigo: "324", nome: "Unimed Vale do Urucuia", status: "homologada" as const },
    { codigo: "325", nome: "Unimed Sudoeste Paulista", status: "homologada" as const },
    { codigo: "326", nome: "Unimed Ibitinga", status: "homologada" as const },
    { codigo: "329", nome: "Unimed Adamantina", status: "homologada" as const },
    { codigo: "332", nome: "Unimed Caçador", status: "homologada" as const },
    { codigo: "335", nome: "Unimed Meio Oeste-SC", status: "homologada" as const },
    { codigo: "336", nome: "Unimed Vilhena", status: "homologada" as const },
    { codigo: "337", nome: "Unimed Morrinhos", status: "homologada" as const },
    { codigo: "340", nome: "Unimed Regional Jaú", status: "homologada" as const },
    { codigo: "489", nome: "Unimed Andradina", status: "homologada" as const },
    { codigo: "540", nome: "Unimed Os Bandeirantes", status: "homologada" as const },
    { codigo: "852", nome: "Unimed Centro Paulista", status: "homologada" as const },
    { codigo: "855", nome: "Unimed Centro-Oeste Paulista", status: "homologada" as const },
    { codigo: "860", nome: "Unimed Vale do Paraíba", status: "homologada" as const },
    { codigo: "865", nome: "Unimed Nacional", status: "homologada" as const },
    { codigo: "970", nome: "Unimed do Estado de São Paulo", status: "homologada" as const },
    { codigo: "971", nome: "Unimed Operadora/RS", status: "homologada" as const },
    { codigo: "975", nome: "Unimed Paraná", status: "homologada" as const },
    { codigo: "976", nome: "Unimed Santa Catarina", status: "homologada" as const },
    { codigo: "988", nome: "Unimed Cerrado", status: "homologada" as const }
  ],
  emHomologacao: [
    { codigo: "14", nome: "Unimed Uberlândia", status: "em_homologacao" as const },
    { codigo: "24", nome: "Unimed Botucatu", status: "em_homologacao" as const },
    { codigo: "40", nome: "Unimed Taubaté", status: "em_homologacao" as const },
    { codigo: "62", nome: "Unimed Natal", status: "em_homologacao" as const },
    { codigo: "63", nome: "Unimed Fortaleza", status: "em_homologacao" as const },
    { codigo: "65", nome: "Unimed Maceió", status: "em_homologacao" as const },
    { codigo: "081", nome: "Unimed Paranaguá", status: "em_homologacao" as const },
    { codigo: "093", nome: "Unimed Limeira", status: "em_homologacao" as const },
    { codigo: "105", nome: "Unimed Fernandópolis", status: "em_homologacao" as const },
    { codigo: "112", nome: "Unimed Sobral", status: "em_homologacao" as const },
    { codigo: "107", nome: "Unimed Cariri", status: "em_homologacao" as const },
    { codigo: "108", nome: "Unimed Sergipe", status: "em_homologacao" as const },
    { codigo: "114", nome: "Unimed Catalão", status: "em_homologacao" as const },
    { codigo: "117", nome: "Unimed Norte Pioneiro - PR", status: "em_homologacao" as const },
    { codigo: "130", nome: "Unimed Alta Mogiana", status: "em_homologacao" as const },
    { codigo: "140", nome: "Unimed Salto/Itu", status: "em_homologacao" as const },
    { codigo: "160", nome: "Unimed Barbacena", status: "em_homologacao" as const },
    { codigo: "167", nome: "Unimed Foz do Iguaçu", status: "em_homologacao" as const },
    { codigo: "168", nome: "Unimed Francisco Beltrão", status: "em_homologacao" as const },
    { codigo: "172", nome: "Unimed Guaxupé", status: "em_homologacao" as const },
    { codigo: "193", nome: "Unimed Itabira", status: "em_homologacao" as const },
    { codigo: "205", nome: "Unimed Campos", status: "em_homologacao" as const },
    { codigo: "217", nome: "Unimed Poços de Caldas", status: "em_homologacao" as const },
    { codigo: "219", nome: "Unimed Monte Alto", status: "em_homologacao" as const },
    { codigo: "224", nome: "Unimed Extremo Sul", status: "em_homologacao" as const },
    { codigo: "227", nome: "Unimed Chapecó", status: "em_homologacao" as const },
    { codigo: "228", nome: "Unimed Rio Verde", status: "em_homologacao" as const },
    { codigo: "238", nome: "Unimed Centro-Oeste", status: "em_homologacao" as const },
    { codigo: "256", nome: "Unimed Sudoeste de Minas", status: "em_homologacao" as const },
    { codigo: "262", nome: "Unimed Lins", status: "em_homologacao" as const },
    { codigo: "267", nome: "Unimed Barretos", status: "em_homologacao" as const },
    { codigo: "274", nome: "Unimed São João Nepomuceno", status: "em_homologacao" as const },
    { codigo: "279", nome: "Unimed Norte do Mato Grosso", status: "em_homologacao" as const },
    { codigo: "286", nome: "Unimed Costa do Descobrimento", status: "em_homologacao" as const },
    { codigo: "293", nome: "Unimed Machado", status: "em_homologacao" as const },
    { codigo: "300", nome: "Unimed Alto Vale", status: "em_homologacao" as const },
    { codigo: "339", nome: "Unimed Frutal", status: "em_homologacao" as const },
    { codigo: "531", nome: "Unimed Vale do Sepotuba", status: "em_homologacao" as const },
    { codigo: "311", nome: "Unimed Vale do Corumbá", status: "em_homologacao" as const },
    { codigo: "979", nome: "Unimed do Ceará", status: "em_homologacao" as const }
  ]
};

const HomePage = () => {
  const { user } = useAuth();
  const [showAnimation, setShowAnimation] = useState(true);
  const [greeting, setGreeting] = useState('');

  // Estado para o modal da Unimed
  const [unimedModalOpen, setUnimedModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'homologadas' | 'homologacao'>('homologadas');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Estado para edição
  const [editingItem, setEditingItem] = useState<Unimed | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editObservacao, setEditObservacao] = useState('');
  const [showInativas, setShowInativas] = useState(false);

  // Estado para inativas
  const [inativas, setInativas] = useState<Unimed[]>([]);

  // Estado para os dados
  const [homologadas, setHomologadas] = useState<Unimed[]>(initialUnimedsData.homologadas);
  const [emHomologacao, setEmHomologacao] = useState<Unimed[]>(initialUnimedsData.emHomologacao);
  const [draggedItem, setDraggedItem] = useState<Unimed | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setShowAnimation(false), 800);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bom dia');
    else if (hour < 18) setGreeting('Boa tarde');
    else setGreeting('Boa noite');
  }, []);

  // Função para copiar código
  const copyToClipboard = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    setCopiedCode(codigo);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Função para editar Unimed
  const handleEdit = (item: Unimed) => {
    setEditingItem(item);
    setEditNome(item.nome);
    setEditObservacao(item.observacao || '');
  };

  const saveEdit = () => {
    if (!editingItem) return;

    const updatedItem = { ...editingItem, nome: editNome, observacao: editObservacao, dataAtualizacao: new Date().toLocaleDateString('pt-BR') };

    if (editingItem.status === 'homologada') {
      setHomologadas(prev => prev.map(item => item.codigo === editingItem.codigo ? updatedItem : item));
    } else if (editingItem.status === 'em_homologacao') {
      setEmHomologacao(prev => prev.map(item => item.codigo === editingItem.codigo ? updatedItem : item));
    } else {
      setInativas(prev => prev.map(item => item.codigo === editingItem.codigo ? updatedItem : item));
    }

    setEditingItem(null);
  };

  // Função para mover entre status
  const moveToHomologada = (item: Unimed) => {
    if (item.status === 'homologada') return;
    const updatedItem = { ...item, status: 'homologada' as const, dataAtualizacao: new Date().toLocaleDateString('pt-BR') };

    if (item.status === 'em_homologacao') {
      setEmHomologacao(prev => prev.filter(i => i.codigo !== item.codigo));
      setHomologadas(prev => [...prev, updatedItem]);
    } else if (item.status === 'inativa') {
      setInativas(prev => prev.filter(i => i.codigo !== item.codigo));
      setHomologadas(prev => [...prev, updatedItem]);
    }
  };

  const moveToEmHomologacao = (item: Unimed) => {
    if (item.status === 'em_homologacao') return;
    const updatedItem = { ...item, status: 'em_homologacao' as const, dataAtualizacao: new Date().toLocaleDateString('pt-BR') };

    if (item.status === 'homologada') {
      setHomologadas(prev => prev.filter(i => i.codigo !== item.codigo));
      setEmHomologacao(prev => [...prev, updatedItem]);
    } else if (item.status === 'inativa') {
      setInativas(prev => prev.filter(i => i.codigo !== item.codigo));
      setEmHomologacao(prev => [...prev, updatedItem]);
    }
  };

  const moveToInativa = (item: Unimed) => {
    if (item.status === 'inativa') return;
    const updatedItem = { ...item, status: 'inativa' as const, dataAtualizacao: new Date().toLocaleDateString('pt-BR') };

    if (item.status === 'homologada') {
      setHomologadas(prev => prev.filter(i => i.codigo !== item.codigo));
      setInativas(prev => [...prev, updatedItem]);
    } else if (item.status === 'em_homologacao') {
      setEmHomologacao(prev => prev.filter(i => i.codigo !== item.codigo));
      setInativas(prev => [...prev, updatedItem]);
    }
  };

  const reactivateItem = (item: Unimed) => {
    moveToEmHomologacao(item);
  };

  // Filtrar Unimeds
  const filteredUnimeds = () => {
    let data: Unimed[] = [];
    if (activeTab === 'homologadas') data = [...homologadas];
    else if (activeTab === 'homologacao') data = [...emHomologacao];

    if (searchTerm) {
      data = data.filter(item =>
        item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return data;
  };

  // Componente de card arrastável
  const DraggableCard = ({ item, index, onDragEnd }: { item: Unimed; index: number; onDragEnd?: () => void }) => {
    const [isDragging, setIsDragging] = useState(false);

    const getStatusColor = () => {
      if (item.status === 'homologada') return 'border-emerald-500/50 bg-emerald-500/5';
      if (item.status === 'em_homologacao') return 'border-amber-500/50 bg-amber-500/5';
      return 'border-red-500/50 bg-red-500/5';
    };

    const getStatusBadge = () => {
      if (item.status === 'homologada') return { text: 'Homologada', color: 'bg-emerald-500/20 text-emerald-400', icon: ShieldCheck };
      if (item.status === 'em_homologacao') return { text: 'Em Homologação', color: 'bg-amber-500/20 text-amber-400', icon: Clock };
      return { text: 'Inativa', color: 'bg-red-500/20 text-red-400', icon: XCircle };
    };

    const statusBadge = getStatusBadge();
    const StatusIcon = statusBadge.icon;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ scale: 1.02 }}
        drag="x"
        dragConstraints={{ left: -100, right: 100 }}
        dragElastic={0.2}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={(e, info) => {
          setIsDragging(false);
          if (Math.abs(info.offset.x) > 80) {
            if (info.offset.x > 0 && item.status !== 'homologada') {
              moveToHomologada(item);
            } else if (info.offset.x < 0 && item.status !== 'inativa') {
              moveToInativa(item);
            }
          }
          onDragEnd?.();
        }}
        className={`relative bg-slate-800/30 border rounded-xl p-4 transition-all cursor-grab active:cursor-grabbing ${getStatusColor()}`}
      >
        {/* Indicador de arrastar */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical size={16} className="text-slate-500" />
        </div>

        {/* Conteúdo */}
        <div className="pl-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* LED Code Indicator */}
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-emerald-500/20 to-teal-500/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-emerald-400">{item.codigo}</span>
                </div>
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">{item.nome}</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${statusBadge.color}`}>
                    <StatusIcon size={10} />
                    <span>{statusBadge.text}</span>
                  </div>
                  {item.observacao && (
                    <span className="text-xs text-slate-500 truncate max-w-[150px]">{item.observacao}</span>
                  )}
                  {item.dataAtualizacao && (
                    <span className="text-xs text-slate-600">Atualizado: {item.dataAtualizacao}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleEdit(item)}
                className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors group/btn"
                title="Editar"
              >
                <Edit2 size={14} className="text-slate-400 group-hover/btn:text-emerald-400" />
              </button>

              {item.status === 'homologada' && (
                <button
                  onClick={() => moveToEmHomologacao(item)}
                  className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 transition-colors group/btn"
                  title="Mover para Homologação"
                >
                  <ArrowLeftRight size={14} className="text-amber-400" />
                </button>
              )}

              {item.status === 'em_homologacao' && (
                <>
                  <button
                    onClick={() => moveToHomologada(item)}
                    className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 transition-colors group/btn"
                    title="Aprovar e mover para Homologadas"
                  >
                    <ShieldCheck size={14} className="text-emerald-400" />
                  </button>
                  <button
                    onClick={() => moveToInativa(item)}
                    className="p-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors group/btn"
                    title="Inativar"
                  >
                    <XCircle size={14} className="text-red-400" />
                  </button>
                </>
              )}

              {item.status === 'inativa' && (
                <button
                  onClick={() => reactivateItem(item)}
                  className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 transition-colors group/btn"
                  title="Reativar"
                >
                  <RefreshCw size={14} className="text-emerald-400" />
                </button>
              )}

              <button
                onClick={() => copyToClipboard(item.codigo)}
                className="p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 transition-colors group/btn"
                title="Copiar código"
              >
                {copiedCode === item.codigo ? (
                  <Check size={14} className="text-green-400" />
                ) : (
                  <Copy size={14} className="text-slate-400 group-hover/btn:text-emerald-400" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Dica de arrastar */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1">
            <ArrowLeftRight size={12} />
            <span>Arraste para mover</span>
          </div>
        </div>
      </motion.div>
    );
  };

  // Módulos principais do sistema
  const mainModules = [
    {
      id: 'socialfield',
      title: 'Feed',
      description: 'Compartilhe ideias e interaja com a equipe',
      icon: MessageSquare,
      href: '/socialfield',
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-500/10'
    },
    {
      id: 'notice-board',
      title: 'Mural',
      description: 'Avisos e comunicados importantes',
      icon: Bell,
      href: '/notice-board',
      color: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-500/10'
    },
    {
      id: 'tickets',
      title: 'Chamados',
      description: 'Abra e acompanhe solicitações',
      icon: Ticket,
      href: '/tickets',
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      id: 'studies',
      title: 'Estudos',
      description: 'Materiais e aprendizado colaborativo',
      icon: BookOpen,
      href: '/studies',
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-500/10'
    },
    {
      id: 'links',
      title: 'Links Úteis',
      description: 'Recursos compartilhados pela equipe',
      icon: Link2,
      href: '/links',
      color: 'from-cyan-500 to-sky-500',
      bgColor: 'bg-cyan-500/10'
    },
    {
      id: 'meetings',
      title: 'Reuniões',
      description: 'Agendamento e participação',
      icon: Calendar,
      href: '/meetings',
      color: 'from-indigo-500 to-violet-500',
      bgColor: 'bg-indigo-500/10'
    },
    {
      id: 'pdi',
      title: 'Minhas Tarefas',
      description: 'Organize seus objetivos diários',
      icon: CheckCircle2,
      href: '/pdi',
      color: 'from-rose-500 to-pink-500',
      bgColor: 'bg-rose-500/10'
    },
    {
      id: 'profile',
      title: 'Meu Perfil',
      description: 'Suas informações e conquistas',
      icon: User,
      href: '/profile',
      color: 'from-slate-500 to-gray-500',
      bgColor: 'bg-slate-500/10'
    }
  ];

  const quickStats = [
    { label: 'Ativo desde', value: '2024', icon: Calendar },
    { label: 'Módulos', value: '8', icon: LayoutDashboard },
    { label: 'Conectado', value: '✓', icon: CheckCircle2 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950">
      {/* Animação de Boas-vindas */}
      <AnimatePresence>
        {showAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Sparkles className="w-20 h-20 text-sky-400 mx-auto" />
              </motion.div>
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold text-white mt-4"
              >
                Bem-vindo(a)!
              </motion.h2>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-slate-400 mt-2"
              >
                Seu hub de produtividade está pronto
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto p-6 lg:p-8">
        {/* Header com Saudação */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-2 text-sky-400 mb-2">
                <Rocket size={18} />
                <span className="text-sm font-medium">Dashboard</span>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-sky-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                {greeting}, {user?.displayName?.split(' ')[0] || 'Visitante'}! 👋
              </h1>
              <p className="text-slate-400 mt-2 max-w-2xl">
                Centralize suas atividades, acompanhe o que importa e mantenha-se conectado com sua equipe.
              </p>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-2">
              {quickStats.map((stat, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.05 }}
                  className="bg-slate-800/50 backdrop-blur-sm rounded-xl px-4 py-2 border border-slate-700"
                >
                  <div className="flex items-center gap-2">
                    <stat.icon size={14} className="text-sky-400" />
                    <span className="text-xs text-slate-500">{stat.label}</span>
                    <span className="text-sm font-bold text-white">{stat.value}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Botão Unimed - Destaque Principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-10"
        >
          <button
            onClick={() => setUnimedModalOpen(true)}
            className="group relative w-full overflow-hidden bg-gradient-to-r from-emerald-600/20 to-teal-600/20 backdrop-blur-sm border border-emerald-500/30 rounded-2xl p-6 hover:border-emerald-500/50 transition-all"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-emerald-500/0 group-hover:translate-x-full transition-transform duration-1000" />

            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-emerald-500 rounded-full blur-xl opacity-50 animate-pulse" />
                  <div className="relative w-14 h-14 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center">
                    <Heart size={28} className="text-white" />
                  </div>
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    Unimed - Rede Credenciada
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">Gerenciamento</span>
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">
                    Gerencie os códigos das Unimeds homologadas e em processo de homologação
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-emerald-400">
                <span className="text-sm font-medium">Acessar</span>
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </button>
        </motion.div>

        {/* Ações Rápidas */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-10"
        >
          <h2 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
            <Zap size={14} />
            AÇÕES RÁPIDAS
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <QuickAction icon={PlusCircle} label="Novo Post" href="/socialfield" color="text-orange-400" />
            <QuickAction icon={Bell} label="Ver Avisos" href="/notice-board" color="text-amber-400" />
            <QuickAction icon={Ticket} label="Abrir Chamado" href="/tickets" color="text-blue-400" />
            <QuickAction icon={Link2} label="Adicionar Link" href="/links" color="text-cyan-400" />
            <QuickAction icon={Calendar} label="Agendar" href="/meetings" color="text-indigo-400" />
            <QuickAction icon={CheckCircle2} label="Tarefas" href="/pdi" color="text-rose-400" />
          </div>
        </motion.div>

        {/* Seção de Boas Práticas */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5"
        >
          <div className="bg-gradient-to-r from-sky-600/10 to-blue-600/10 backdrop-blur-sm border border-sky-500/20 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center">
                <Brain size={20} className="text-sky-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-sky-400 mb-1">Dica do Dia</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Compartilhe um conhecimento hoje! Cada post ou link útil fortalece a cultura de aprendizado da equipe.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 backdrop-blur-sm border border-purple-500/20 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Users size={20} className="text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-purple-400 mb-1">Conecte-se</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Interaja com seus colegas no Feed e fortaleça o networking da equipe.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-600/10 to-teal-600/10 backdrop-blur-sm border border-emerald-500/20 rounded-xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp size={20} className="text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-emerald-400 mb-1">Organize-se</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Use o módulo de Tarefas para acompanhar seus objetivos diários e manter o foco.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 pt-6 text-center border-t border-slate-800"
        >
          <p className="text-xs text-slate-600 flex items-center justify-center gap-2">
            <Smile size={12} />
            Explore os módulos e comece a produzir! Sua jornada de produtividade começa aqui.
          </p>
        </motion.div>
      </div>

      {/* Modal Unimed */}
      <AnimatePresence>
        {unimedModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setUnimedModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-800 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header do Modal */}
              <div className="relative p-6 border-b border-slate-800 bg-gradient-to-r from-emerald-600/10 to-teal-600/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 bg-emerald-500 rounded-full blur-md opacity-50 animate-pulse" />
                      <div className="relative w-12 h-12 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center">
                        <Heart size={24} className="text-white" />
                      </div>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Unimed - Rede Credenciada</h2>
                      <p className="text-slate-400 text-sm">Gerencie os códigos e status das Unimeds</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setUnimedModalOpen(false)}
                    className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                {/* LED Indicators */}
                <div className="absolute top-6 right-20 flex gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse delay-300" />
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse delay-700" />
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-800">
                <button
                  onClick={() => setActiveTab('homologadas')}
                  className={`flex-1 py-3 text-sm font-medium transition-all relative ${activeTab === 'homologadas'
                    ? 'text-emerald-400'
                    : 'text-slate-500 hover:text-slate-300'
                    }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <ShieldCheck size={16} />
                    Homologadas
                    <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                      {homologadas.length}
                    </span>
                  </div>
                  {activeTab === 'homologadas' && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500 to-teal-500"
                    />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('homologacao')}
                  className={`flex-1 py-3 text-sm font-medium transition-all relative ${activeTab === 'homologacao'
                    ? 'text-amber-400'
                    : 'text-slate-500 hover:text-slate-300'
                    }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Clock size={16} />
                    Em Homologação
                    <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                      {emHomologacao.length}
                    </span>
                  </div>
                  {activeTab === 'homologacao' && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-orange-500"
                    />
                  )}
                </button>
                <button
                  onClick={() => setShowInativas(!showInativas)}
                  className={`flex-1 py-3 text-sm font-medium transition-all relative ${showInativas
                    ? 'text-red-400'
                    : 'text-slate-500 hover:text-slate-300'
                    }`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <XCircle size={16} />
                    Inativas
                    <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">
                      {inativas.length}
                    </span>
                  </div>
                  {showInativas && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-pink-500"
                    />
                  )}
                </button>
              </div>

              {/* Search */}
              <div className="p-4 border-b border-slate-800">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Buscar por código ou nome da Unimed..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Lista de Unimeds - Arrastável */}
              <div className="p-4 overflow-y-auto max-h-[50vh] space-y-2">
                <p className="text-xs text-slate-500 mb-3 flex items-center gap-2">
                  <ArrowLeftRight size={12} />
                  Arraste para os lados para mover entre status:
                  <span className="text-emerald-400">→ Homologada</span>
                  <span className="text-red-400">← Inativa</span>
                </p>

                <AnimatePresence>
                  {showInativas ? (
                    inativas.length === 0 ? (
                      <div className="text-center py-12">
                        <XCircle size={48} className="mx-auto text-slate-600 mb-3" />
                        <p className="text-slate-400">Nenhuma Unimed inativa</p>
                      </div>
                    ) : (
                      inativas.map((item, index) => (
                        <DraggableCard key={item.codigo} item={item} index={index} />
                      ))
                    )
                  ) : (
                    filteredUnimeds().length === 0 ? (
                      <div className="text-center py-12">
                        <Search size={48} className="mx-auto text-slate-600 mb-3" />
                        <p className="text-slate-400">Nenhuma Unimed encontrada</p>
                        <p className="text-slate-500 text-sm">Tente buscar por outro termo</p>
                      </div>
                    ) : (
                      filteredUnimeds().map((item, index) => (
                        <DraggableCard key={item.codigo} item={item} index={index} />
                      ))
                    )
                  )}
                </AnimatePresence>
              </div>

              {/* Footer do Modal */}
              <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span>Total Homologadas: {homologadas.length}</span>
                    <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse ml-2" />
                    <span>Em Homologação: {emHomologacao.length}</span>
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse ml-2" />
                    <span>Inativas: {inativas.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart size={12} className="text-emerald-400" />
                    <span>Arraste os cards para gerenciar</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Edição */}
      <AnimatePresence>
        {editingItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setEditingItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl w-full max-w-md overflow-hidden border border-slate-800 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-800 bg-gradient-to-r from-emerald-600/10 to-teal-600/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Edit2 size={20} className="text-emerald-400" />
                    <h2 className="text-xl font-bold text-white">Editar Unimed</h2>
                  </div>
                  <button
                    onClick={() => setEditingItem(null)}
                    className="p-1 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <X size={18} className="text-slate-400" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1 block">Código</label>
                  <input
                    type="text"
                    value={editingItem.codigo}
                    disabled
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1 block">Nome</label>
                  <input
                    type="text"
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1 block">Observação</label>
                  <textarea
                    value={editObservacao}
                    onChange={(e) => setEditObservacao(e.target.value)}
                    rows={3}
                    placeholder="Adicione uma observação (opcional)..."
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none transition-colors resize-none"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-slate-800 flex justify-end gap-3">
                <button
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveEdit}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 transition-all text-white flex items-center gap-2"
                >
                  <Save size={16} />
                  Salvar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Componente de Ação Rápida
const QuickAction = ({
  icon: Icon,
  label,
  href,
  color
}: {
  icon: React.ElementType;
  label: string;
  href: string;
  color: string;
}) => (
  <motion.div whileHover={{ scale: 1.02 }}>
    <Link
      href={href}
      className="group relative overflow-hidden bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-lg p-3 hover:border-slate-700 transition-all block"
    >
      <div className="flex items-center gap-2">
        <Icon size={18} className={`${color} group-hover:scale-110 transition-transform`} />
        <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
          {label}
        </span>
      </div>
    </Link>
  </motion.div>
);

export default withAuth(HomePage);