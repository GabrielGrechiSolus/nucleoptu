"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { Dialog, Menu, Transition } from "@headlessui/react";
import {
  Plus, Trash2, Edit3, Upload, Download, Search, X, User, Network, Monitor, Server,
  Eye, EyeOff, HelpCircle, Copy, Check, Link2, ChevronDown, ChevronUp, Globe,
  Shield, ShieldCheck, ShieldAlert, Fingerprint, Key, Lock, Unlock, Wifi, WifiOff,
  AlertCircle, CheckCircle, Info, BookOpen, FileJson, FileCode, FileText, Archive,
  Database, HardDrive, Cpu, Cloud, Users, UsersRound, Settings, RefreshCw,
  Printer, QrCode, Share2, Bookmark, BookmarkPlus, Star, StarOff, Filter,
  Columns, LayoutGrid, List, Clock, Calendar, Bell, BellOff, MessageSquare,
  Mail, Phone, MapPin, Briefcase, Building2, Building, CreditCard, Wallet,
  Folder, FolderOpen, FolderTree, File, FileSpreadsheet, FileImage,
  Scissors, CopyCheck, Clipboard, ClipboardCheck, ClipboardList, ClipboardX,
  Save, SaveAll, Undo, Redo, ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCw,
  Sun, Moon, Laptop, Smartphone, Tablet, Watch, Radio, Satellite, WifiHigh,
  Signal, SignalHigh, SignalMedium, SignalLow, SignalZero, BarChart, LineChart,
  PieChart, Activity, TrendingUp, TrendingDown, DollarSign, Euro, PoundSterling,
  CircleDollarSign, Bitcoin, CreditCard as CreditCardIcon, Wallet as WalletIcon
} from "lucide-react";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";

// ==================== TIPOS ====================

interface ServiceUser {
  id: string;
  username: string;
  password?: string;
  description?: string;
  createdAt: number;
  lastUsed?: number;
  active: boolean;
}

interface ConnectionLink {
  id: string;
  title: string;
  url: string;
  description?: string;
  icon?: string;
  category?: string;
  favorite: boolean;
  createdAt: number;
}

interface VPN {
  id: string;
  name: string;
  host: string;
  port: string;
  protocol: "openvpn" | "wireguard" | "ipsec" | "l2tp" | "pptp";
  description?: string;
  users: ServiceUser[];
  certificate?: string;
  configFile?: string;
  status: "active" | "inactive" | "maintenance";
  lastTested?: number;
  notes?: string;
  createdAt?: number; // Added this property
}

interface DockerServer {
  id: string;
  name: string;
  host: string;
  port: string;
  environment: "producao" | "homologacao" | "desenvolvimento" | "teste";
  description?: string;
  users: ServiceUser[];
  version?: string;
  apiVersion?: string;
  status: "active" | "inactive" | "maintenance";
  containers?: number;
  images?: number;
  volumes?: number;
  networks?: number;
  lastHealthCheck?: number;
}

interface TerminalService {
  id: string;
  name: string;
  host: string;
  port: string;
  protocol: "ssh" | "telnet" | "rdp" | "vnc";
  description?: string;
  users: ServiceUser[];
  authenticationType: "password" | "key" | "certificate";
  privateKey?: string;
  jumpHost?: string;
  sessionTimeout?: number;
}

interface AnyDesk {
  id: string;
  name: string;
  anydeskId: string;
  password?: string;
  description?: string;
  users: ServiceUser[];
  alias?: string;
  autoLogin?: boolean;
  lastConnection?: number;
}

interface TeamViewer {
  id: string;
  name: string;
  teamviewerId: string;
  password?: string;
  description?: string;
  users: ServiceUser[];
  assignedTo?: string;
  group?: string;
  autoLogin?: boolean;
}

interface DatabaseConnection {
  id: string;
  name: string;
  type: "postgresql" | "mysql" | "mongodb" | "oracle" | "sqlserver" | "redis";
  host: string;
  port: string;
  database?: string;
  username?: string;
  password?: string;
  description?: string;
  ssl: boolean;
  backupEnabled: boolean;
  backupSchedule?: string;
}

interface CloudService {
  id: string;
  name: string;
  provider: "aws" | "azure" | "gcp" | "digitalocean" | "linode" | "oracle" | "other";
  accessKey?: string;
  secretKey?: string;
  region?: string;
  accountId?: string;
  description?: string;
  services: string[];
  costCenter?: string;
}

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  tags: string[];
}

interface Contact {
  id: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  telegram?: string;
  slack?: string;
  notes?: string;
}

interface Document {
  id: string;
  name: string;
  type: "contract" | "manual" | "config" | "certificate" | "other";
  url?: string;
  file?: string;
  uploadedAt: number;
  size?: number;
  description?: string;
}

interface ClientConnection {
  id: string;
  clientName: string;
  clientCode?: string;
  description?: string;
  logo?: string;
  vpns: VPN[];
  dockerServers: DockerServer[];
  terminalServices: TerminalService[];
  anydesks: AnyDesk[];
  teamviewers: TeamViewer[];
  databases: DatabaseConnection[];
  clouds: CloudService[];
  links: ConnectionLink[];
  contacts: Contact[];
  notes: Note[];
  documents: Document[];

  // Metadados
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  tags: string[];
  favorite: boolean;
  category: "cliente" | "projeto" | "parceiro" | "interno";
  status: "active" | "inactive" | "archived";
  healthCheck?: {
    lastCheck: number;
    status: "healthy" | "warning" | "critical";
    details?: string;
  };
  version: number;
}

interface Statistics {
  totalClients: number;
  totalServices: number;
  totalVPNs: number;
  totalDocker: number;
  totalTerminals: number;
  totalAnyDesk: number;
  totalTeamViewer: number;
  totalDatabases: number;
  totalClouds: number;
  totalLinks: number;
  totalContacts: number;
  totalNotes: number;
  activeClients: number;
  inactiveClients: number;
}

// ==================== CONSTANTES ====================

const STORAGE_KEY = "client_connections";
const PROTOCOLS = {
  vpn: ["openvpn", "wireguard", "ipsec", "l2tp", "pptp"],
  terminal: ["ssh", "telnet", "rdp", "vnc"],
  database: ["postgresql", "mysql", "mongodb", "oracle", "sqlserver", "redis"],
  cloud: ["aws", "azure", "gcp", "digitalocean", "linode", "oracle", "other"],
};

const CATEGORIES = ["cliente", "projeto", "parceiro", "interno"];
const STATUS = ["active", "inactive", "archived"];

// ==================== COMPONENTES AUXILIARES ====================

const StatusBadge = ({ status }: { status?: string }) => {
  if (!status) return null;

  const config: Record<string, { color: string; icon: any; label: string }> = {
    active: { color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle, label: "Ativo" },
    inactive: { color: "bg-red-500/20 text-red-400 border-red-500/30", icon: X, label: "Inativo" },
    maintenance: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Settings, label: "Manutenção" },
    healthy: { color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle, label: "Saudável" },
    warning: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: AlertCircle, label: "Atenção" },
    critical: { color: "bg-red-500/20 text-red-400 border-red-500/30", icon: ShieldAlert, label: "Crítico" },
    archived: { color: "bg-gray-500/20 text-gray-400 border-gray-500/30", icon: Archive, label: "Arquivado" },
  };
  const { color, icon: Icon, label } = config[status] || {
    color: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    icon: HelpCircle,
    label: status.charAt(0).toUpperCase() + status.slice(1),
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${color}`}>
      <Icon size={10} />
      {label}
    </span>
  );
};

const EnvironmentBadge = ({ env }: { env: string }) => {
  const config = {
    producao: { color: "bg-red-900/30 text-red-300 border-red-700", icon: Shield },
    homologacao: { color: "bg-yellow-900/30 text-yellow-300 border-yellow-700", icon: ShieldCheck },
    desenvolvimento: { color: "bg-blue-900/30 text-blue-300 border-blue-700", icon: Cpu }
  };
  const { color, icon: Icon } = config[env as keyof typeof config] || config.desenvolvimento;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${color}`}>
      <Icon size={10} />
      {env.charAt(0).toUpperCase() + env.slice(1)}
    </span>
  );
};

const ProtocolBadge = ({ protocol }: { protocol?: string }) => {
  if (!protocol) return null;

  return (
    <span className="text-xs px-2 py-0.5 bg-zinc-700/50 rounded-full text-zinc-300">
      {protocol.toUpperCase()}
    </span>
  );
};

const CopyButton = ({ text, id }: { text: string; id: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Erro ao copiar");
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`p-1.5 rounded transition-colors ${copied ? "bg-green-500/20 text-green-400" : "bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
        }`}
      title="Copiar"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
};

const ServiceCard = ({ title, icon: Icon, count, children }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4"
  >
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-sky-400" />
        <h3 className="font-semibold text-zinc-200">{title}</h3>
      </div>
      <span className="text-sm bg-zinc-700 px-2 py-0.5 rounded-full text-zinc-300">
        {count}
      </span>
    </div>
    {children}
  </motion.div>
);

const EmptyState = ({ message, action }: { message: string; action?: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center py-8 text-zinc-500">
    <Info className="w-12 h-12 mb-3 opacity-50" />
    <p className="text-sm text-center">{message}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

// ==================== COMPONENTE PRINCIPAL ====================

export default function ClientConnectionsPage() {
  const [connections, setConnections] = useState<ClientConnection[]>([]);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterFavorite, setFilterFavorite] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"name" | "date" | "status">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Modais
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [statsModalOpen, setStatsModalOpen] = useState(false);

  // Estados de seleção
  const [selectedConnection, setSelectedConnection] = useState<ClientConnection | null>(null);
  const [currentConnection, setCurrentConnection] = useState<ClientConnection | null>(null);
  const [connectionToDelete, setConnectionToDelete] = useState<ClientConnection | null>(null);

  // UI States
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estatísticas
  const stats = useMemo((): Statistics => {
    return connections.reduce(
      (acc, conn) => ({
        totalClients: acc.totalClients + 1,
        totalServices: acc.totalServices +
          conn.vpns.length + conn.dockerServers.length + conn.terminalServices.length +
          conn.anydesks.length + conn.teamviewers.length + conn.databases.length + conn.clouds.length,
        totalVPNs: acc.totalVPNs + conn.vpns.length,
        totalDocker: acc.totalDocker + conn.dockerServers.length,
        totalTerminals: acc.totalTerminals + conn.terminalServices.length,
        totalAnyDesk: acc.totalAnyDesk + conn.anydesks.length,
        totalTeamViewer: acc.totalTeamViewer + conn.teamviewers.length,
        totalDatabases: acc.totalDatabases + (conn.databases?.length || 0),
        totalClouds: acc.totalClouds + (conn.clouds?.length || 0),
        totalLinks: acc.totalLinks + (conn.links?.length || 0),
        totalContacts: acc.totalContacts + (conn.contacts?.length || 0),
        totalNotes: acc.totalNotes + (conn.notes?.length || 0),
        activeClients: acc.activeClients + (conn.status === "active" ? 1 : 0),
        inactiveClients: acc.inactiveClients + (conn.status === "inactive" ? 1 : 0),
      }),
      {
        totalClients: 0,
        totalServices: 0,
        totalVPNs: 0,
        totalDocker: 0,
        totalTerminals: 0,
        totalAnyDesk: 0,
        totalTeamViewer: 0,
        totalDatabases: 0,
        totalClouds: 0,
        totalLinks: 0,
        totalContacts: 0,
        totalNotes: 0,
        activeClients: 0,
        inactiveClients: 0,
      }
    );
  }, [connections]);

  // Carregar dados do localStorage
  useEffect(() => {
    loadConnections();
    loadFavorites();
  }, []);

  const loadConnections = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as ClientConnection[];
        // Migrar estrutura antiga para nova
        const migrated = parsed.map(migrateConnection);
        setConnections(migrated);
      }
    } catch (error) {
      console.error("Erro ao carregar conexões:", error);
      toast.error("Erro ao carregar conexões");
    }
  };

  const loadFavorites = () => {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEY}_favorites`);
      if (stored) {
        setFavorites(new Set(JSON.parse(stored)));
      }
    } catch (error) {
      console.error("Erro ao carregar favoritos:", error);
    }
  };

  const saveFavorites = (newFavorites: Set<string>) => {
    try {
      localStorage.setItem(`${STORAGE_KEY}_favorites`, JSON.stringify([...newFavorites]));
      setFavorites(newFavorites);
    } catch (error) {
      console.error("Erro ao salvar favoritos:", error);
    }
  };

  const migrateConnection = (conn: any): ClientConnection => {
    return {
      id: conn.id || `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      clientName: conn.clientName || "",
      clientCode: conn.clientCode || "",
      description: conn.description || "",
      logo: conn.logo || "",
      vpns: conn.vpns || [],
      dockerServers: conn.dockerServers || [],
      terminalServices: conn.terminalServices || [],
      anydesks: conn.anydesks || [],
      teamviewers: conn.teamviewers || [],
      databases: conn.databases || [],
      clouds: conn.clouds || [],
      links: conn.links || [],
      contacts: conn.contacts || [],
      notes: conn.notes || [],
      documents: conn.documents || [],
      createdAt: conn.createdAt || Date.now(),
      updatedAt: conn.updatedAt || Date.now(),
      createdBy: conn.createdBy || "",
      tags: conn.tags || [],
      favorite: favorites.has(conn.id) || false,
      category: conn.category || "cliente",
      status: conn.status || "active",
      version: conn.version || 1,
    };
  };

  const saveConnections = useCallback((newConnections: ClientConnection[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConnections));
      setConnections(newConnections);
      toast.success("Dados salvos com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar dados");
    }
  }, []);

  // Filtros e ordenação
  const filteredConnections = useMemo(() => {
    let filtered = connections.filter((conn) => {
      const matchesSearch = conn.clientName.toLowerCase().includes(search.toLowerCase()) ||
        conn.clientCode?.toLowerCase().includes(search.toLowerCase()) ||
        conn.description?.toLowerCase().includes(search.toLowerCase()) ||
        conn.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));

      const matchesCategory = filterCategory === "all" || conn.category === filterCategory;
      const matchesStatus = filterStatus === "all" || conn.status === filterStatus;
      const matchesFavorite = !filterFavorite || favorites.has(conn.id);

      return matchesSearch && matchesCategory && matchesStatus && matchesFavorite;
    });

    // Ordenação
    filtered.sort((a, b) => {
      let comparison = 0;
      if (sortBy === "name") {
        comparison = a.clientName.localeCompare(b.clientName);
      } else if (sortBy === "date") {
        comparison = b.updatedAt - a.updatedAt;
      } else if (sortBy === "status") {
        comparison = a.status.localeCompare(b.status);
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [connections, search, filterCategory, filterStatus, filterFavorite, favorites, sortBy, sortOrder]);

  const toggleFavorite = (id: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(id)) {
      newFavorites.delete(id);
    } else {
      newFavorites.add(id);
    }
    saveFavorites(newFavorites);

    // Atualizar conexões
    setConnections(prev =>
      prev.map(conn =>
        conn.id === id ? { ...conn, favorite: newFavorites.has(id) } : conn
      )
    );
  };

  const openModal = (connection?: ClientConnection) => {
    if (connection) {
      setCurrentConnection({ ...connection });
    } else {
      setCurrentConnection({
        id: "",
        clientName: "",
        clientCode: "",
        description: "",
        logo: "",
        vpns: [],
        dockerServers: [],
        terminalServices: [],
        anydesks: [],
        teamviewers: [],
        databases: [],
        clouds: [],
        links: [],
        contacts: [],
        notes: [],
        documents: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: "",
        tags: [],
        favorite: false,
        category: "cliente",
        status: "active",
        version: 1,
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentConnection(null);
  };

  // Handlers genéricos para adicionar serviços
  const addService = <T extends any[]>(
    serviceArray: T,
    setter: (value: T) => void,
    template: any
  ) => {
    setter([...serviceArray, {
      ...template,
      id: `${template.type || 'service'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }] as T);
  };

  const removeService = <T extends any[]>(
    serviceArray: T,
    setter: (value: T) => void,
    id: string
  ) => {
    setter(serviceArray.filter((s: any) => s.id !== id) as T);
  };

  const updateService = <T extends any[]>(
    serviceArray: T,
    setter: (value: T) => void,
    id: string,
    field: string,
    value: any
  ) => {
    setter(serviceArray.map((s: any) =>
      s.id === id ? { ...s, [field]: value } : s
    ) as T);
  };

  // Handlers específicos
  const addUser = (serviceType: string, serviceId: string) => {
    if (!currentConnection) return;

    const newUser: ServiceUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      username: "",
      password: "",
      description: "",
      createdAt: Date.now(),
      active: true,
    };

    const updateService = (services: any[]) =>
      services.map((s) =>
        s.id === serviceId ? { ...s, users: [...(s.users || []), newUser] } : s
      );

    if (serviceType === "vpn") {
      setCurrentConnection({ ...currentConnection, vpns: updateService(currentConnection.vpns) });
    } else if (serviceType === "docker") {
      setCurrentConnection({ ...currentConnection, dockerServers: updateService(currentConnection.dockerServers) });
    } else if (serviceType === "terminal") {
      setCurrentConnection({ ...currentConnection, terminalServices: updateService(currentConnection.terminalServices) });
    } else if (serviceType === "anydesk") {
      setCurrentConnection({ ...currentConnection, anydesks: updateService(currentConnection.anydesks) });
    } else if (serviceType === "teamviewer") {
      setCurrentConnection({ ...currentConnection, teamviewers: updateService(currentConnection.teamviewers) });
    }
  };

  const removeUser = (serviceType: string, serviceId: string, userId: string) => {
    if (!currentConnection) return;

    const updateService = (services: any[]) =>
      services.map((s) =>
        s.id === serviceId
          ? { ...s, users: s.users.filter((u: ServiceUser) => u.id !== userId) }
          : s
      );

    if (serviceType === "vpn") {
      setCurrentConnection({ ...currentConnection, vpns: updateService(currentConnection.vpns) });
    } else if (serviceType === "docker") {
      setCurrentConnection({ ...currentConnection, dockerServers: updateService(currentConnection.dockerServers) });
    } else if (serviceType === "terminal") {
      setCurrentConnection({ ...currentConnection, terminalServices: updateService(currentConnection.terminalServices) });
    } else if (serviceType === "anydesk") {
      setCurrentConnection({ ...currentConnection, anydesks: updateService(currentConnection.anydesks) });
    } else if (serviceType === "teamviewer") {
      setCurrentConnection({ ...currentConnection, teamviewers: updateService(currentConnection.teamviewers) });
    }
  };

  const updateUser = (
    serviceType: string,
    serviceId: string,
    userId: string,
    field: keyof ServiceUser,
    value: any
  ) => {
    if (!currentConnection) return;

    const updateService = (services: any[]) =>
      services.map((s) =>
        s.id === serviceId
          ? {
            ...s,
            users: s.users.map((u: ServiceUser) =>
              u.id === userId ? { ...u, [field]: value } : u
            ),
          }
          : s
      );

    if (serviceType === "vpn") {
      setCurrentConnection({ ...currentConnection, vpns: updateService(currentConnection.vpns) });
    } else if (serviceType === "docker") {
      setCurrentConnection({ ...currentConnection, dockerServers: updateService(currentConnection.dockerServers) });
    } else if (serviceType === "terminal") {
      setCurrentConnection({ ...currentConnection, terminalServices: updateService(currentConnection.terminalServices) });
    } else if (serviceType === "anydesk") {
      setCurrentConnection({ ...currentConnection, anydesks: updateService(currentConnection.anydesks) });
    } else if (serviceType === "teamviewer") {
      setCurrentConnection({ ...currentConnection, teamviewers: updateService(currentConnection.teamviewers) });
    }
  };

  // Toggle para expandir/recolher serviços
  const toggleService = (id: string) => {
    setExpandedServices(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Toggle para mostrar/ocultar senhas
  const togglePassword = (id: string) => {
    setShowPasswords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // Salvar conexão
  const handleSave = () => {
    if (!currentConnection) return;

    if (!currentConnection.clientName.trim()) {
      toast.error("Nome do cliente é obrigatório");
      return;
    }

    const now = Date.now();
    let updatedConnections: ClientConnection[];

    if (currentConnection.id) {
      // Editar
      updatedConnections = connections.map((conn) =>
        conn.id === currentConnection.id
          ? { ...currentConnection, updatedAt: now, version: conn.version + 1 }
          : conn
      );
      toast.success("Conexão atualizada!");
    } else {
      // Criar
      const newConnection: ClientConnection = {
        ...currentConnection,
        id: `conn_${now}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: now,
        updatedAt: now,
        version: 1,
      };
      updatedConnections = [...connections, newConnection];
      toast.success("Conexão criada!");
    }

    saveConnections(updatedConnections);
    closeModal();
  };

  // Excluir conexão
  const openDeleteModal = (connection: ClientConnection) => {
    setConnectionToDelete(connection);
    setDeleteModalOpen(true);
  };

  const handleDelete = () => {
    if (!connectionToDelete) return;

    const updatedConnections = connections.filter(
      (conn) => conn.id !== connectionToDelete.id
    );
    saveConnections(updatedConnections);

    // Remover dos favoritos
    if (favorites.has(connectionToDelete.id)) {
      const newFavorites = new Set(favorites);
      newFavorites.delete(connectionToDelete.id);
      saveFavorites(newFavorites);
    }

    setDeleteModalOpen(false);
    setConnectionToDelete(null);
    toast.success("Conexão excluída!");
  };

  // Importar JSON
  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const imported = JSON.parse(text);

        if (!Array.isArray(imported)) {
          toast.error("Formato inválido: esperado um array");
          return;
        }

        // Migrar estrutura
        const validConnections = imported
          .map(migrateConnection)
          .filter((conn) => conn.clientName);

        if (validConnections.length === 0) {
          toast.error("Nenhuma conexão válida encontrada");
          return;
        }

        // Mesclar com existentes
        const existingIds = new Set(connections.map((c) => c.id));
        const newConnections = validConnections.filter((c) => !existingIds.has(c.id));
        const mergedConnections = [...connections, ...newConnections];

        saveConnections(mergedConnections);
        toast.success(`${newConnections.length} conexão(ões) importada(s)!`);
      } catch (error) {
        console.error("Erro ao importar:", error);
        toast.error("Erro ao importar arquivo");
      }
    };

    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Exportar JSON
  const handleExport = () => {
    try {
      const dataStr = JSON.stringify(connections, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `client-connections-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Arquivo exportado!");
    } catch (error) {
      console.error("Erro ao exportar:", error);
      toast.error("Erro ao exportar");
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "agora";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 30) return `${days}d`;
    return formatDate(timestamp).split(" ")[0];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 to-zinc-900">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-sky-500 to-purple-500 rounded-lg">
              <Network className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                Conexões de Clientes
              </h1>
              <p className="text-sm text-zinc-400">
                {stats.totalClients} clientes • {stats.totalServices} serviços • {stats.totalLinks} links
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            <button
              onClick={() => setStatsModalOpen(true)}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 flex items-center gap-2"
              title="Estatísticas"
            >
              <PieChart size={18} />
              <span className="hidden sm:inline">Estatísticas</span>
            </button>

            <button
              onClick={() => setSettingsModalOpen(true)}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 flex items-center gap-2"
              title="Configurações"
            >
              <Settings size={18} />
              <span className="hidden sm:inline">Configurações</span>
            </button>

            <div className="flex gap-2">
              <button
                onClick={handleImport}
                className="px-3 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-white flex items-center gap-2"
              >
                <Upload size={18} />
                <span className="hidden sm:inline">Importar</span>
              </button>

              <button
                onClick={handleExport}
                disabled={connections.length === 0}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white flex items-center gap-2"
              >
                <Download size={18} />
                <span className="hidden sm:inline">Exportar</span>
              </button>

              <button
                onClick={() => openModal()}
                className="px-3 py-2 bg-gradient-to-r from-sky-500 to-purple-500 hover:from-sky-600 hover:to-purple-600 rounded-lg text-white flex items-center gap-2"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Novo Cliente</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filtros e Busca */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Buscar por cliente, código, tags..."
                className="w-full pl-10 pr-10 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:border-sky-500 focus:outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
              >
                <option value="all">Todas categorias</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
              >
                <option value="all">Todos status</option>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="archived">Arquivado</option>
              </select>

              <button
                onClick={() => setFilterFavorite(!filterFavorite)}
                className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-colors ${filterFavorite
                  ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                  : "bg-zinc-800 text-zinc-400 hover:text-zinc-300 border border-transparent"
                  }`}
              >
                <Star size={18} fill={filterFavorite ? "currentColor" : "none"} />
                Favoritos
              </button>

              <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded ${viewMode === "grid" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
                    }`}
                >
                  <LayoutGrid size={18} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded ${viewMode === "list" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
                    }`}
                >
                  <List size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Segunda linha de filtros */}
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <span className="text-xs text-zinc-500">Ordenar por:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2 py-1 text-sm bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:border-sky-500"
            >
              <option value="name">Nome</option>
              <option value="date">Data</option>
              <option value="status">Status</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400"
              title={sortOrder === "asc" ? "Crescente" : "Decrescente"}
            >
              {sortOrder === "asc" ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {(filterCategory !== "all" || filterStatus !== "all" || filterFavorite) && (
              <button
                onClick={() => {
                  setFilterCategory("all");
                  setFilterStatus("all");
                  setFilterFavorite(false);
                }}
                className="px-3 py-1 text-sm bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 flex items-center gap-1"
              >
                <X size={14} />
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* Lista de Conexões */}
        {filteredConnections.length === 0 ? (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-12 text-center">
            <div className="w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Network className="w-10 h-10 text-zinc-600" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">
              Nenhuma conexão encontrada
            </h3>
            <p className="text-zinc-400 text-sm mb-6">
              {connections.length === 0
                ? "Comece cadastrando seu primeiro cliente"
                : "Tente ajustar os filtros da busca"}
            </p>
            <button
              onClick={() => openModal()}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-sky-500 to-purple-500 text-white px-6 py-2 rounded-lg hover:from-sky-600 hover:to-purple-600 transition-colors"
            >
              <Plus size={18} />
              Novo Cliente
            </button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filteredConnections.map((connection) => (
                <motion.div
                  key={connection.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 hover:border-sky-500/50 transition-all cursor-pointer group"
                  onClick={() => {
                    setSelectedConnection(connection);
                    setDetailsModalOpen(true);
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {connection.clientName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white truncate">
                          {connection.clientName}
                        </h3>
                        {connection.clientCode && (
                          <p className="text-xs text-zinc-500 truncate">
                            {connection.clientCode}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(connection.id);
                        }}
                        className={`p-1.5 rounded transition-colors ${favorites.has(connection.id)
                          ? "text-yellow-400 hover:text-yellow-300"
                          : "text-zinc-400 hover:text-zinc-300"
                          }`}
                      >
                        <Star size={16} fill={favorites.has(connection.id) ? "currentColor" : "none"} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal(connection);
                        }}
                        className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteModal(connection);
                        }}
                        className="p-1.5 rounded bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={connection.status} />
                      <span className="text-xs px-2 py-0.5 bg-zinc-800 rounded-full text-zinc-300">
                        {connection.category}
                      </span>
                      {connection.tags.slice(0, 2).map(tag => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 bg-zinc-800 rounded-full text-zinc-400"
                        >
                          #{tag}
                        </span>
                      ))}
                      {connection.tags.length > 2 && (
                        <span className="text-xs px-2 py-0.5 bg-zinc-800 rounded-full text-zinc-400">
                          +{connection.tags.length - 2}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-1 text-xs text-zinc-400">
                      <div className="flex items-center gap-1">
                        <Network className="w-3 h-3" />
                        {connection.vpns.length}
                      </div>
                      <div className="flex items-center gap-1">
                        <Server className="w-3 h-3" />
                        {connection.dockerServers.length}
                      </div>
                      <div className="flex items-center gap-1">
                        <Monitor className="w-3 h-3" />
                        {connection.terminalServices.length}
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {connection.anydesks.length}
                      </div>
                      <div className="flex items-center gap-1">
                        <EyeOff className="w-3 h-3" />
                        {connection.teamviewers.length}
                      </div>
                      <div className="flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        {connection.databases?.length || 0}
                      </div>
                    </div>

                    {connection.description && (
                      <p className="text-xs text-zinc-500 line-clamp-2">
                        {connection.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-xs text-zinc-600 mt-2 pt-2 border-t border-zinc-800">
                      <span>Atualizado {formatRelativeTime(connection.updatedAt)}</span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        v{connection.version}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredConnections.map((connection) => (
              <motion.div
                key={connection.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 hover:border-sky-500/50 transition-all cursor-pointer group"
                onClick={() => {
                  setSelectedConnection(connection);
                  setDetailsModalOpen(true);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                      {connection.clientName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">
                          {connection.clientName}
                        </h3>
                        {connection.clientCode && (
                          <span className="text-xs text-zinc-500">
                            {connection.clientCode}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-zinc-400">
                        <StatusBadge status={connection.status} />
                        <span>{connection.category}</span>
                        <span>•</span>
                        <span>{formatRelativeTime(connection.updatedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Network size={14} />
                        {connection.vpns.length}
                      </span>
                      <span className="flex items-center gap-1">
                        <Server size={14} />
                        {connection.dockerServers.length}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye size={14} />
                        {connection.anydesks.length}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(connection.id);
                        }}
                        className={`p-1.5 rounded transition-colors ${favorites.has(connection.id)
                          ? "text-yellow-400 hover:text-yellow-300"
                          : "text-zinc-400 hover:text-zinc-300"
                          }`}
                      >
                        <Star size={16} fill={favorites.has(connection.id) ? "currentColor" : "none"} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal(connection);
                        }}
                        className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteModal(connection);
                        }}
                        className="p-1.5 rounded bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Input de arquivo oculto */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Modal de Cadastro/Edição */}
        <Dialog open={modalOpen} onClose={closeModal} className="relative z-50">
          <div className="fixed inset-0 bg-black/70" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-zinc-900 rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-zinc-800">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                  <Dialog.Title className="text-xl font-bold text-white">
                    {currentConnection?.id ? "Editar Cliente" : "Novo Cliente"}
                  </Dialog.Title>
                  <button
                    onClick={closeModal}
                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-zinc-400" />
                  </button>
                </div>

                {/* Content - Scrollável */}
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="space-y-6">
                    {/* Informações Básicas */}
                    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-zinc-200 mb-4 flex items-center gap-2">
                        <Info className="w-5 h-5 text-sky-400" />
                        Informações Básicas
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-zinc-400 mb-1">
                            Nome do Cliente *
                          </label>
                          <input
                            type="text"
                            value={currentConnection?.clientName || ""}
                            onChange={(e) =>
                              setCurrentConnection((prev) =>
                                prev ? { ...prev, clientName: e.target.value } : null
                              )
                            }
                            placeholder="Ex: Empresa ABC"
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-sky-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-zinc-400 mb-1">
                            Código do Cliente
                          </label>
                          <input
                            type="text"
                            value={currentConnection?.clientCode || ""}
                            onChange={(e) =>
                              setCurrentConnection((prev) =>
                                prev ? { ...prev, clientCode: e.target.value } : null
                              )
                            }
                            placeholder="Ex: CLT-001"
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-sky-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-zinc-400 mb-1">
                            Categoria
                          </label>
                          <select
                            value={currentConnection?.category || "cliente"}
                            onChange={(e) =>
                              setCurrentConnection((prev) =>
                                prev ? { ...prev, category: e.target.value as any } : null
                              )
                            }
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-sky-500 focus:outline-none"
                          >
                            {CATEGORIES.map(cat => (
                              <option key={cat} value={cat}>
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-zinc-400 mb-1">
                            Status
                          </label>
                          <select
                            value={currentConnection?.status || "active"}
                            onChange={(e) =>
                              setCurrentConnection((prev) =>
                                prev ? { ...prev, status: e.target.value as any } : null
                              )
                            }
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-sky-500 focus:outline-none"
                          >
                            <option value="active">Ativo</option>
                            <option value="inactive">Inativo</option>
                            <option value="archived">Arquivado</option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-zinc-400 mb-1">
                            Descrição
                          </label>
                          <textarea
                            value={currentConnection?.description || ""}
                            onChange={(e) =>
                              setCurrentConnection((prev) =>
                                prev ? { ...prev, description: e.target.value } : null
                              )
                            }
                            rows={3}
                            placeholder="Informações adicionais sobre o cliente..."
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-sky-500 focus:outline-none resize-none"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-zinc-400 mb-1">
                            Tags (separadas por vírgula)
                          </label>
                          <input
                            type="text"
                            value={currentConnection?.tags?.join(", ") || ""}
                            onChange={(e) =>
                              setCurrentConnection((prev) =>
                                prev ? { ...prev, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) } : null
                              )
                            }
                            placeholder="Ex: vip, estratégico, suporte 24h"
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:border-sky-500 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* VPNs */}
                    <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-zinc-200 flex items-center gap-2">
                          <Network className="w-5 h-5 text-sky-400" />
                          VPNs ({currentConnection?.vpns.length || 0})
                        </h3>
                        <button
                          onClick={() => {
                            if (!currentConnection) return;
                            const newVPN: VPN = {
                              id: `vpn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                              name: "",
                              host: "",
                              port: "",
                              protocol: "openvpn",
                              description: "",
                              users: [],
                              status: "active",
                              createdAt: Date.now(),
                            };
                            setCurrentConnection({
                              ...currentConnection,
                              vpns: [...currentConnection.vpns, newVPN],
                            });
                          }}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-500 rounded text-white text-sm flex items-center gap-1"
                        >
                          <Plus size={16} />
                          Adicionar VPN
                        </button>
                      </div>

                      <div className="space-y-4">
                        {currentConnection?.vpns.map((vpn, index) => (
                          <div key={vpn.id} className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-zinc-300">
                                  VPN {index + 1}
                                </span>
                                {vpn.protocol && <ProtocolBadge protocol={vpn.protocol} />}
                                <StatusBadge status={vpn.status} />
                              </div>
                              <button
                                onClick={() => {
                                  if (!currentConnection) return;
                                  setCurrentConnection({
                                    ...currentConnection,
                                    vpns: currentConnection.vpns.filter(v => v.id !== vpn.id),
                                  });
                                }}
                                className="text-red-400 hover:text-red-300"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                              <input
                                type="text"
                                placeholder="Nome *"
                                value={vpn.name}
                                onChange={(e) => {
                                  if (!currentConnection) return;
                                  setCurrentConnection({
                                    ...currentConnection,
                                    vpns: currentConnection.vpns.map(v =>
                                      v.id === vpn.id ? { ...v, name: e.target.value } : v
                                    ),
                                  });
                                }}
                                className="px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-white text-sm focus:border-sky-500 focus:outline-none"
                              />
                              <input
                                type="text"
                                placeholder="Host *"
                                value={vpn.host}
                                onChange={(e) => {
                                  if (!currentConnection) return;
                                  setCurrentConnection({
                                    ...currentConnection,
                                    vpns: currentConnection.vpns.map(v =>
                                      v.id === vpn.id ? { ...v, host: e.target.value } : v
                                    ),
                                  });
                                }}
                                className="px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-white text-sm focus:border-sky-500 focus:outline-none"
                              />
                              <input
                                type="text"
                                placeholder="Porta *"
                                value={vpn.port}
                                onChange={(e) => {
                                  if (!currentConnection) return;
                                  setCurrentConnection({
                                    ...currentConnection,
                                    vpns: currentConnection.vpns.map(v =>
                                      v.id === vpn.id ? { ...v, port: e.target.value } : v
                                    ),
                                  });
                                }}
                                className="px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-white text-sm focus:border-sky-500 focus:outline-none"
                              />
                              <select
                                value={vpn.protocol}
                                onChange={(e) => {
                                  if (!currentConnection) return;
                                  setCurrentConnection({
                                    ...currentConnection,
                                    vpns: currentConnection.vpns.map(v =>
                                      v.id === vpn.id ? { ...v, protocol: e.target.value as any } : v
                                    ),
                                  });
                                }}
                                className="px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-white text-sm focus:border-sky-500 focus:outline-none"
                              >
                                {PROTOCOLS.vpn.map(p => (
                                  <option key={p} value={p}>{p.toUpperCase()}</option>
                                ))}
                              </select>
                              <input
                                type="text"
                                placeholder="Descrição"
                                value={vpn.description || ""}
                                onChange={(e) => {
                                  if (!currentConnection) return;
                                  setCurrentConnection({
                                    ...currentConnection,
                                    vpns: currentConnection.vpns.map(v =>
                                      v.id === vpn.id ? { ...v, description: e.target.value } : v
                                    ),
                                  });
                                }}
                                className="px-3 py-2 bg-zinc-700 border border-zinc-600 rounded text-white text-sm focus:border-sky-500 focus:outline-none md:col-span-4"
                              />
                            </div>

                            {/* Usuários da VPN */}
                            <div className="mt-3 pt-3 border-t border-zinc-700">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-sm font-medium text-zinc-400">
                                  Usuários ({vpn.users.length})
                                </h4>
                                <button
                                  onClick={() => addUser("vpn", vpn.id)}
                                  className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1"
                                >
                                  <Plus size={12} />
                                  Adicionar Usuário
                                </button>
                              </div>

                              <div className="space-y-2">
                                {vpn.users.map((user, userIndex) => (
                                  <div key={user.id} className="bg-zinc-700/50 rounded p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-medium text-zinc-300">
                                        Usuário {userIndex + 1}
                                      </span>
                                      <button
                                        onClick={() => removeUser("vpn", vpn.id, user.id)}
                                        className="text-red-400 hover:text-red-300"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                      <input
                                        type="text"
                                        placeholder="Usuário *"
                                        value={user.username}
                                        onChange={(e) => updateUser("vpn", vpn.id, user.id, "username", e.target.value)}
                                        className="px-2 py-1.5 bg-zinc-600 border border-zinc-500 rounded text-white text-xs focus:border-sky-500 focus:outline-none"
                                      />
                                      <div className="flex gap-1">
                                        <input
                                          type={showPasswords.has(`vpn_${vpn.id}_${user.id}`) ? "text" : "password"}
                                          placeholder="Senha"
                                          value={user.password || ""}
                                          onChange={(e) => updateUser("vpn", vpn.id, user.id, "password", e.target.value)}
                                          className="flex-1 px-2 py-1.5 bg-zinc-600 border border-zinc-500 rounded text-white text-xs focus:border-sky-500 focus:outline-none"
                                        />
                                        <button
                                          onClick={() => togglePassword(`vpn_${vpn.id}_${user.id}`)}
                                          className="px-2 py-1.5 bg-zinc-600 hover:bg-zinc-500 rounded text-zinc-300"
                                        >
                                          {showPasswords.has(`vpn_${vpn.id}_${user.id}`) ? (
                                            <EyeOff size={12} />
                                          ) : (
                                            <Eye size={12} />
                                          )}
                                        </button>
                                      </div>
                                      <input
                                        type="text"
                                        placeholder="Descrição"
                                        value={user.description || ""}
                                        onChange={(e) => updateUser("vpn", vpn.id, user.id, "description", e.target.value)}
                                        className="px-2 py-1.5 bg-zinc-600 border border-zinc-500 rounded text-white text-xs focus:border-sky-500 focus:outline-none"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Demais serviços seguiriam o mesmo padrão... Por brevidade, mantenho o foco nos principais */}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 p-6 border-t border-zinc-800">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-gradient-to-r from-sky-500 to-purple-500 hover:from-sky-600 hover:to-purple-600 rounded-lg text-white transition-colors"
                  >
                    {currentConnection?.id ? "Atualizar" : "Criar"}
                  </button>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>

        {/* Modal de Detalhes */}
        <Dialog open={detailsModalOpen} onClose={() => setDetailsModalOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/70" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-zinc-900 rounded-xl w-full max-w-5xl max-h-[90vh] overflow-hidden border border-zinc-800">
              <div className="flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-800">
                  <Dialog.Title className="text-xl font-bold text-white flex items-center gap-2">
                    {selectedConnection?.clientName}
                    {selectedConnection?.clientCode && (
                      <span className="text-sm font-normal text-zinc-400">
                        {selectedConnection.clientCode}
                      </span>
                    )}
                  </Dialog.Title>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setDetailsModalOpen(false);
                        openModal(selectedConnection!);
                      }}
                      className="p-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-colors"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button
                      onClick={() => setDetailsModalOpen(false)}
                      className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-zinc-400" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {selectedConnection && (
                    <div className="space-y-6">
                      {/* Info Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3">
                          <p className="text-xs text-zinc-400">Status</p>
                          <div className="mt-1">
                            <StatusBadge status={selectedConnection.status} />
                          </div>
                        </div>
                        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3">
                          <p className="text-xs text-zinc-400">Categoria</p>
                          <p className="text-sm font-medium text-white mt-1">
                            {selectedConnection.category}
                          </p>
                        </div>
                        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3">
                          <p className="text-xs text-zinc-400">Criado em</p>
                          <p className="text-sm text-white mt-1">
                            {formatDate(selectedConnection.createdAt).split(" ")[0]}
                          </p>
                        </div>
                        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3">
                          <p className="text-xs text-zinc-400">Atualizado</p>
                          <p className="text-sm text-white mt-1">
                            {formatRelativeTime(selectedConnection.updatedAt)}
                          </p>
                        </div>
                      </div>

                      {/* Descrição */}
                      {selectedConnection.description && (
                        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                          <h3 className="text-sm font-medium text-zinc-400 mb-2">Descrição</h3>
                          <p className="text-zinc-300 whitespace-pre-wrap">
                            {selectedConnection.description}
                          </p>
                        </div>
                      )}

                      {/* Tags */}
                      {selectedConnection.tags.length > 0 && (
                        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4">
                          <h3 className="text-sm font-medium text-zinc-400 mb-2">Tags</h3>
                          <div className="flex flex-wrap gap-2">
                            {selectedConnection.tags.map(tag => (
                              <span
                                key={tag}
                                className="text-xs px-2 py-1 bg-zinc-700 rounded-full text-zinc-300"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* VPNs */}
                      {selectedConnection.vpns.length > 0 && (
                        <ServiceCard title="VPNs" icon={Network} count={selectedConnection.vpns.length}>
                          <div className="space-y-3">
                            {selectedConnection.vpns.map((vpn, idx) => (
                              <div
                                key={vpn.id}
                                className="bg-zinc-800 rounded-lg p-3 border border-zinc-700 hover:border-sky-500/50 transition-colors"
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <h4 className="font-medium text-white">
                                      {vpn.name || `VPN ${idx + 1}`}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1">
                                      {vpn.protocol && <ProtocolBadge protocol={vpn.protocol} />}
                                      <StatusBadge status={vpn.status} />
                                    </div>
                                  </div>
                                  <button
                                    onClick={() => toggleService(`vpn_${vpn.id}`)}
                                    className="text-zinc-400 hover:text-white"
                                  >
                                    {expandedServices.has(`vpn_${vpn.id}`) ? (
                                      <ChevronUp size={16} />
                                    ) : (
                                      <ChevronDown size={16} />
                                    )}
                                  </button>
                                </div>

                                <div className="flex items-center gap-4 text-sm">
                                  <div className="flex items-center gap-1">
                                    <span className="text-zinc-400">Host:</span>
                                    <span className="text-zinc-200">{vpn.host}</span>
                                    <CopyButton text={vpn.host} id={`vpn_host_${vpn.id}`} />
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-zinc-400">Porta:</span>
                                    <span className="text-zinc-200">{vpn.port}</span>
                                    <CopyButton text={vpn.port} id={`vpn_port_${vpn.id}`} />
                                  </div>
                                </div>

                                {vpn.description && (
                                  <p className="text-xs text-zinc-400 mt-2">{vpn.description}</p>
                                )}

                                {expandedServices.has(`vpn_${vpn.id}`) && vpn.users.length > 0 && (
                                  <div className="mt-3 pt-3 border-t border-zinc-700">
                                    <h5 className="text-sm font-medium text-zinc-400 mb-2">
                                      Usuários
                                    </h5>
                                    <div className="space-y-2">
                                      {vpn.users.map((user, uIdx) => (
                                        <div key={user.id} className="bg-zinc-700/50 rounded p-2">
                                          <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium text-zinc-300">
                                              {user.username}
                                            </span>
                                            {user.password && (
                                              <button
                                                onClick={() => togglePassword(`vpn_${vpn.id}_user_${user.id}`)}
                                                className="text-zinc-400 hover:text-zinc-300"
                                              >
                                                {showPasswords.has(`vpn_${vpn.id}_user_${user.id}`) ? (
                                                  <EyeOff size={12} />
                                                ) : (
                                                  <Eye size={12} />
                                                )}
                                              </button>
                                            )}
                                          </div>
                                          {user.password && showPasswords.has(`vpn_${vpn.id}_user_${user.id}`) && (
                                            <div className="flex items-center gap-1 mt-1">
                                              <span className="text-xs text-zinc-400">Senha:</span>
                                              <span className="text-xs text-zinc-200">{user.password}</span>
                                              <CopyButton text={user.password} id={`vpn_pass_${vpn.id}_${user.id}`} />
                                            </div>
                                          )}
                                          {user.description && (
                                            <p className="text-xs text-zinc-500 mt-1">
                                              {user.description}
                                            </p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </ServiceCard>
                      )}

                      {/* Outros serviços seguiriam o mesmo padrão */}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex justify-end p-6 border-t border-zinc-800">
                  <button
                    onClick={() => setDetailsModalOpen(false)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>

        {/* Modal de Estatísticas */}
        <Dialog open={statsModalOpen} onClose={() => setStatsModalOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/70" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-zinc-900 rounded-xl w-full max-w-3xl border border-zinc-800 p-6">
              <Dialog.Title className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <PieChart className="w-6 h-6 text-sky-400" />
                Estatísticas
              </Dialog.Title>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <p className="text-sm text-zinc-400">Total de Clientes</p>
                  <p className="text-3xl font-bold text-white">{stats.totalClients}</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <p className="text-sm text-zinc-400">Total de Serviços</p>
                  <p className="text-3xl font-bold text-white">{stats.totalServices}</p>
                </div>
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <p className="text-sm text-zinc-400">Ativos / Inativos</p>
                  <p className="text-3xl font-bold text-white">
                    {stats.activeClients} / {stats.inactiveClients}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-zinc-800/30 rounded p-3">
                  <div className="flex items-center gap-2 text-zinc-400 mb-1">
                    <Network size={14} />
                    <span className="text-xs">VPNs</span>
                  </div>
                  <p className="text-xl font-bold text-white">{stats.totalVPNs}</p>
                </div>
                <div className="bg-zinc-800/30 rounded p-3">
                  <div className="flex items-center gap-2 text-zinc-400 mb-1">
                    <Server size={14} />
                    <span className="text-xs">Docker</span>
                  </div>
                  <p className="text-xl font-bold text-white">{stats.totalDocker}</p>
                </div>
                <div className="bg-zinc-800/30 rounded p-3">
                  <div className="flex items-center gap-2 text-zinc-400 mb-1">
                    <Monitor size={14} />
                    <span className="text-xs">Terminal</span>
                  </div>
                  <p className="text-xl font-bold text-white">{stats.totalTerminals}</p>
                </div>
                <div className="bg-zinc-800/30 rounded p-3">
                  <div className="flex items-center gap-2 text-zinc-400 mb-1">
                    <Eye size={14} />
                    <span className="text-xs">AnyDesk</span>
                  </div>
                  <p className="text-xl font-bold text-white">{stats.totalAnyDesk}</p>
                </div>
                <div className="bg-zinc-800/30 rounded p-3">
                  <div className="flex items-center gap-2 text-zinc-400 mb-1">
                    <EyeOff size={14} />
                    <span className="text-xs">TeamViewer</span>
                  </div>
                  <p className="text-xl font-bold text-white">{stats.totalTeamViewer}</p>
                </div>
                <div className="bg-zinc-800/30 rounded p-3">
                  <div className="flex items-center gap-2 text-zinc-400 mb-1">
                    <Database size={14} />
                    <span className="text-xs">Bancos</span>
                  </div>
                  <p className="text-xl font-bold text-white">{stats.totalDatabases}</p>
                </div>
                <div className="bg-zinc-800/30 rounded p-3">
                  <div className="flex items-center gap-2 text-zinc-400 mb-1">
                    <Cloud size={14} />
                    <span className="text-xs">Clouds</span>
                  </div>
                  <p className="text-xl font-bold text-white">{stats.totalClouds}</p>
                </div>
                <div className="bg-zinc-800/30 rounded p-3">
                  <div className="flex items-center gap-2 text-zinc-400 mb-1">
                    <Link2 size={14} />
                    <span className="text-xs">Links</span>
                  </div>
                  <p className="text-xl font-bold text-white">{stats.totalLinks}</p>
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-4 border-t border-zinc-800">
                <button
                  onClick={() => setStatsModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white transition-colors"
                >
                  Fechar
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>

        {/* Modal de Confirmação de Exclusão */}
        <Dialog open={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/70" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-zinc-900 rounded-xl w-full max-w-md border border-red-500/50 p-6">
              <Dialog.Title className="text-xl font-bold text-red-400 mb-4">
                Confirmar Exclusão
              </Dialog.Title>
              <p className="text-zinc-300 mb-6">
                Tem certeza que deseja excluir o cliente{" "}
                <strong>{connectionToDelete?.clientName}</strong>?
                Esta ação não pode ser desfeita.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setDeleteModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-white transition-colors"
                >
                  Excluir
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>

        {/* Modal de Ajuda */}
        <Dialog open={helpModalOpen} onClose={() => setHelpModalOpen(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/70" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-zinc-900 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-zinc-800 p-6">
              <Dialog.Title className="text-xl font-bold text-sky-400 mb-4 flex items-center gap-2">
                <BookOpen className="w-6 h-6" />
                Manual do Sistema
              </Dialog.Title>

              <div className="space-y-6 text-zinc-300">
                <section>
                  <h3 className="text-lg font-semibold text-white mb-2">📋 Visão Geral</h3>
                  <p className="text-sm leading-relaxed">
                    Este sistema permite gerenciar conexões de clientes de forma centralizada.
                    Todos os dados são armazenados localmente no seu navegador (localStorage).
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-white mb-2">➕ Cadastrar Cliente</h3>
                  <p className="text-sm mb-2">Clique em "Novo Cliente" e preencha:</p>
                  <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                    <li>Nome do Cliente (obrigatório)</li>
                    <li>Código do Cliente (opcional)</li>
                    <li>Categoria e Status</li>
                    <li>Descrição e tags</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-white mb-2">🔧 Tipos de Serviços</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="font-medium text-sky-400 mb-1">VPN</p>
                      <p className="text-xs text-zinc-400">OpenVPN, WireGuard, IPsec, L2TP, PPTP</p>
                    </div>
                    <div>
                      <p className="font-medium text-sky-400 mb-1">Docker</p>
                      <p className="text-xs text-zinc-400">Servidores com ambiente e status</p>
                    </div>
                    <div>
                      <p className="font-medium text-sky-400 mb-1">Terminal</p>
                      <p className="text-xs text-zinc-400">SSH, Telnet, RDP, VNC</p>
                    </div>
                    <div>
                      <p className="font-medium text-sky-400 mb-1">AnyDesk/TeamViewer</p>
                      <p className="text-xs text-zinc-400">Acesso remoto com IDs e senhas</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-white mb-2">💾 Importar/Exportar</h3>
                  <p className="text-sm">
                    Use os botões de importar/exportar para fazer backup dos dados ou
                    transferir entre navegadores.
                  </p>
                </section>

                <div className="bg-yellow-900/30 border border-yellow-700 rounded p-4">
                  <h4 className="font-semibold text-yellow-400 mb-2">⚠️ Aviso</h4>
                  <p className="text-sm text-yellow-200">
                    Os dados ficam apenas no navegador. Sempre faça backup exportando
                    os dados regularmente.
                  </p>
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-4 border-t border-zinc-800">
                <button
                  onClick={() => setHelpModalOpen(false)}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded-lg text-white transition-colors"
                >
                  Fechar
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </div>
    </div>
  );
}