"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { db, auth } from "../../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  where,
} from "firebase/firestore";
import { Dialog, Transition } from "@headlessui/react";
import { 
  Plus, 
  X, 
  Edit3, 
  Trash2, 
  Zap, 
  Search, 
  Filter, 
  SlidersHorizontal,
  Database,
  Package,
  Code2,
  Play,
  Eye,
  GitBranch,
  Layers,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  RotateCcw,
  Download,
  Upload,
  Info,
  Bookmark,
  BookmarkCheck,
  Sparkles,
  GripVertical,
  Hash,
  Link2,
  MessageSquare,
  Calendar,
  MoreHorizontal,
  RefreshCw,
  FileCode,
  FolderTree,
  Workflow,
  Share2,
  Star,
  History,
  ExternalLink,
  Command,
  Tag,
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

// ===== Tipos =====
type ObjType = "package" | "function" | "procedure" | "trigger" | "view" | "other";

interface DBObject {
  id: string;
  name: string;
  type: ObjType;
  modules: string[];
  origins: string[];
  observations?: string;
  active?: boolean;
  favorite?: boolean;
  tags?: string[];
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string | null;
}

interface FormData {
  name: string;
  type: ObjType;
  modules: string[];
  origins: string[];
  observations: string;
  tags: string[];
}

// ===== Constantes =====
const TYPE_CONFIG: Record<ObjType, { label: string; icon: React.ElementType; color: string; gradient: string }> = {
  package: { 
    label: "Package", 
    icon: Package, 
    color: "text-violet-400", 
    gradient: "from-violet-500/20 to-violet-600/10" 
  },
  function: { 
    label: "Function", 
    icon: Code2, 
    color: "text-blue-400", 
    gradient: "from-blue-500/20 to-blue-600/10" 
  },
  procedure: { 
    label: "Procedure", 
    icon: Play, 
    color: "text-emerald-400", 
    gradient: "from-emerald-500/20 to-emerald-600/10" 
  },
  trigger: { 
    label: "Trigger", 
    icon: Zap, 
    color: "text-amber-400", 
    gradient: "from-amber-500/20 to-amber-600/10" 
  },
  view: { 
    label: "View", 
    icon: Eye, 
    color: "text-cyan-400", 
    gradient: "from-cyan-500/20 to-cyan-600/10" 
  },
  other: { 
    label: "Other", 
    icon: FileCode, 
    color: "text-gray-400", 
    gradient: "from-gray-500/20 to-gray-600/10" 
  },
};

const SORT_OPTIONS = [
  { label: "Mais recentes", value: "newest" },
  { label: "Mais antigos", value: "oldest" },
  { label: "Nome (A-Z)", value: "name_asc" },
  { label: "Nome (Z-A)", value: "name_desc" },
  { label: "Tipo", value: "type" },
] as const;

// ===== Componentes Auxiliares =====

// Badge de Tipo
const TypeBadge: React.FC<{ type: ObjType; size?: "sm" | "md" }> = ({ type, size = "sm" }) => {
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;
  
  return (
    <span className={`
      inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border
      ${config.color} bg-gradient-to-r ${config.gradient} border-current/20
      ${size === "sm" ? "text-xs" : "text-sm"}
      font-medium whitespace-nowrap
    `}>
      <Icon size={size === "sm" ? 12 : 14} />
      {config.label}
    </span>
  );
};

// Badge de Status
const StatusBadge: React.FC<{ active: boolean }> = ({ active }) => (
  <span className={`
    inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
    ${active 
      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
      : "bg-red-500/10 text-red-400 border border-red-500/20"
    }
  `}>
    {active ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
    {active ? "Ativo" : "Inativo"}
  </span>
);

// Chip removível
const Chip: React.FC<{
  label: string;
  onRemove?: () => void;
  color?: string;
  size?: "sm" | "md";
}> = ({ label, onRemove, color = "zinc", size = "md" }) => (
  <span className={`
    inline-flex items-center gap-1.5 rounded-full border transition-all duration-200
    ${size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"}
    bg-${color}-800/30 border-${color}-700/30 text-${color}-200
    hover:bg-${color}-800/50
  `}>
    {label}
    {onRemove && (
      <button
        onClick={onRemove}
        className={`
          p-0.5 rounded-full hover:bg-${color}-700/50 transition-colors
          opacity-60 hover:opacity-100
        `}
      >
        <X size={size === "sm" ? 10 : 12} />
      </button>
    )}
  </span>
);

// Input com animação
const AnimatedInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  icon?: React.ElementType;
  type?: string;
}> = ({ label, value, onChange, placeholder, required, icon: Icon, type = "text" }) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      <div className={`
        relative flex items-center rounded-xl border transition-all duration-300
        ${isFocused 
          ? "border-blue-500/50 shadow-lg shadow-blue-500/10 bg-zinc-800/80" 
          : "border-zinc-700/50 bg-zinc-800/50 hover:border-zinc-600/50"
        }
      `}>
        {Icon && (
          <div className="absolute left-3 text-zinc-500">
            <Icon size={18} />
          </div>
        )}
        <input
          ref={inputRef}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className={`
            w-full py-2.5 rounded-xl bg-transparent text-zinc-100 placeholder-zinc-500
            outline-none transition-all duration-300
            ${Icon ? "pl-10 pr-4" : "px-4"}
          `}
        />
      </div>
    </div>
  );
};

// Card Skeleton
const CardSkeleton: React.FC = () => (
  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 animate-pulse">
    <div className="flex justify-between mb-4">
      <div className="space-y-2 flex-1">
        <div className="h-5 bg-zinc-800 rounded w-3/4" />
        <div className="h-4 bg-zinc-800 rounded w-1/3" />
      </div>
      <div className="flex gap-1">
        <div className="w-8 h-8 bg-zinc-800 rounded-lg" />
        <div className="w-8 h-8 bg-zinc-800 rounded-lg" />
        <div className="w-8 h-8 bg-zinc-800 rounded-lg" />
      </div>
    </div>
    <div className="space-y-2">
      <div className="h-3 bg-zinc-800 rounded w-1/2" />
      <div className="h-3 bg-zinc-800 rounded w-2/3" />
    </div>
  </div>
);

// ===== Componente Principal =====
export default function DBRegistryPage() {
  const currentUser = auth.currentUser;

  // ===== Estados =====
  const [items, setItems] = useState<DBObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [sortBy, setSortBy] = useState<string>("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DBObject | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewItem, setViewItem] = useState<DBObject | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState<FormData>({
    name: "",
    type: "package",
    modules: [],
    origins: [],
    observations: "",
    tags: [],
  });
  const [moduleInput, setModuleInput] = useState("");
  const [originInput, setOriginInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);

  // UI states
  const [showFilters, setShowFilters] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ===== Efeitos =====
  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, "db_objects"),
      orderBy("createdAt", "desc")
    );
    
    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs: DBObject[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setItems(docs);
        setLoading(false);
      },
      (error) => {
        console.error("Erro ao carregar dados:", error);
        toast.error("Erro ao carregar registros");
        setLoading(false);
      }
    );
    
    return () => unsub();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        openNewModal();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        document.getElementById("search-input")?.focus();
      }
      if (e.key === "Escape") {
        setIsSelectionMode(false);
        setSelectedItems(new Set());
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ===== Handlers =====
  const openNewModal = useCallback(() => {
    setEditing(null);
    setFormData({
      name: "",
      type: "package",
      modules: [],
      origins: [],
      observations: "",
      tags: [],
    });
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((item: DBObject) => {
    setEditing(item);
    setFormData({
      name: item.name,
      type: item.type,
      modules: item.modules || [],
      origins: item.origins || [],
      observations: item.observations || "",
      tags: item.tags || [],
    });
    setModalOpen(true);
  }, []);

  const openViewModal = useCallback((item: DBObject) => {
    setViewItem(item);
    setViewModalOpen(true);
  }, []);

  const addToList = useCallback(
    (field: "modules" | "origins" | "tags", value: string, setInput: (v: string) => void) => {
      const trimmed = value.trim();
      if (!trimmed) return;
      if (!formData[field].includes(trimmed)) {
        setFormData((prev) => ({
          ...prev,
          [field]: [...prev[field], trimmed],
        }));
      }
      setInput("");
    },
    [formData]
  );

  const removeFromList = useCallback(
    (field: "modules" | "origins" | "tags", item: string) => {
      setFormData((prev) => ({
        ...prev,
        [field]: prev[field].filter((i) => i !== item),
      }));
    },
    []
  );

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error("Informe o nome do objeto");
      return;
    }

    setSaving(true);
    const savePromise = (async () => {
      try {
        const data = {
          name: formData.name.trim(),
          type: formData.type,
          modules: formData.modules,
          origins: formData.origins,
          observations: formData.observations.trim(),
          tags: formData.tags,
          active: editing ? editing.active : true,
        };

        if (editing) {
          const ref = doc(db, "db_objects", editing.id);
          await updateDoc(ref, {
            ...data,
            updatedAt: serverTimestamp(),
          });
        } else {
          await addDoc(collection(db, "db_objects"), {
            ...data,
            favorite: false,
            createdAt: serverTimestamp(),
            createdBy: currentUser?.uid ?? null,
          });
        }
        setModalOpen(false);
      } catch (err) {
        console.error(err);
        throw new Error("Erro ao salvar");
      }
    })();

    toast.promise(savePromise, {
      loading: "Salvando...",
      success: editing ? "Registro atualizado!" : "Registro criado!",
      error: "Erro ao salvar. Tente novamente.",
    });

    try {
      await savePromise;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "db_objects", id));
      toast.success("Registro excluído com sucesso!");
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir registro");
    }
  };

  const toggleActive = async (item: DBObject) => {
    try {
      const ref = doc(db, "db_objects", item.id);
      await updateDoc(ref, { active: !item.active });
      toast.success(item.active ? "Objeto inativado" : "Objeto ativado");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao alterar status");
    }
  };

  const toggleFavorite = async (item: DBObject) => {
    try {
      const ref = doc(db, "db_objects", item.id);
      await updateDoc(ref, { favorite: !item.favorite });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao favoritar");
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      toast.success("Copiado!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const bulkDelete = async () => {
    if (selectedItems.size === 0) return;
    if (!confirm(`Deseja excluir ${selectedItems.size} registros? Esta ação é irreversível.`)) return;

    const promises = Array.from(selectedItems).map((id) =>
      deleteDoc(doc(db, "db_objects", id))
    );

    toast.promise(Promise.all(promises), {
      loading: "Excluindo...",
      success: `${selectedItems.size} registros excluídos!`,
      error: "Erro ao excluir",
    });

    setSelectedItems(new Set());
    setIsSelectionMode(false);
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // ===== Dados Filtrados e Ordenados =====
  const filteredAndSorted = useMemo(() => {
    let result = items.filter((item) => {
      if (showOnlyActive && item.active === false) return false;
      if (filterType && item.type !== filterType) return false;
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(searchLower);
        const matchesModules = item.modules?.some((m) =>
          m.toLowerCase().includes(searchLower)
        );
        const matchesOrigins = item.origins?.some((o) =>
          o.toLowerCase().includes(searchLower)
        );
        const matchesTags = item.tags?.some((t) =>
          t.toLowerCase().includes(searchLower)
        );
        if (!matchesName && !matchesModules && !matchesOrigins && !matchesTags) return false;
      }
      return true;
    });

    // Ordenação
    result.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        case "type":
          return a.type.localeCompare(b.type);
        case "newest":
        default:
          return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      }
    });

    return result;
  }, [items, search, filterType, showOnlyActive, sortBy]);

  // ===== Estatísticas =====
  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter((i) => i.active !== false).length;
    const inactive = total - active;
    const types = items.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, active, inactive, types };
  }, [items]);

  return (
    <div className="min-h-screen bg-zinc-950">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#27272a",
            color: "#e4e4e7",
            border: "1px solid #3f3f46",
          },
        }}
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
        {/* ===== Header ===== */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-violet-500/20 border border-blue-500/20">
                <Database size={28} className="text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-zinc-50 flex items-center gap-3">
                  DB Registry
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-medium">
                    Oracle
                  </span>
                </h1>
                <p className="text-zinc-400 mt-1">
                  Gerencie objetos, metadados e documentação do banco de dados
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={openNewModal}
                className="flex-1 sm:flex-none px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-95 font-medium"
              >
                <Plus size={20} />
                Novo Objeto
                <kbd className="hidden sm:inline-flex ml-2 px-1.5 py-0.5 text-[10px] bg-white/20 rounded text-white/80">
                  ⌘N
                </kbd>
              </button>

              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-3 rounded-xl border transition-all duration-200 ${
                  showFilters
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                    : "bg-zinc-900 border-zinc-700/50 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <SlidersHorizontal size={20} />
              </button>
            </div>
          </div>

          {/* ===== Quick Stats ===== */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total", value: stats.total, icon: Database, color: "text-blue-400" },
              { label: "Ativos", value: stats.active, icon: CheckCircle2, color: "text-emerald-400" },
              { label: "Inativos", value: stats.inactive, icon: XCircle, color: "text-red-400" },
              { label: "Tipos", value: Object.keys(stats.types).length, icon: Layers, color: "text-violet-400" },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-4 hover:bg-zinc-900/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Icon size={20} className={stat.color} />
                    <div>
                      <p className="text-2xl font-bold text-zinc-100">{stat.value}</p>
                      <p className="text-xs text-zinc-500">{stat.label}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ===== Filters ===== */}
          <Transition
            show={showFilters}
            enter="transition-all duration-300"
            enterFrom="opacity-0 max-h-0"
            enterTo="opacity-100 max-h-[500px]"
            leave="transition-all duration-300"
            leaveFrom="opacity-100 max-h-[500px]"
            leaveTo="opacity-0 max-h-0"
          >
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-5 mb-6 overflow-hidden">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    id="search-input"
                    placeholder="Buscar por nome, módulo, origem..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-700/50 bg-zinc-800/50 text-zinc-100 placeholder-zinc-500 outline-none focus:border-blue-500/50 focus:bg-zinc-800/80 transition-all duration-300"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Type Filter */}
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-zinc-700/50 bg-zinc-800/50 text-zinc-100 outline-none focus:border-blue-500/50 transition-all duration-300"
                >
                  <option value="">Todos os tipos</option>
                  {Object.entries(TYPE_CONFIG).map(([value, config]) => (
                    <option key={value} value={value}>
                      {config.label} ({stats.types[value] || 0})
                    </option>
                  ))}
                </select>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-zinc-700/50 bg-zinc-800/50 text-zinc-100 outline-none focus:border-blue-500/50 transition-all duration-300"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                {/* Active Toggle + View Mode */}
                <div className="flex gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 p-2.5 rounded-xl border border-zinc-700/50 bg-zinc-800/50 cursor-pointer hover:bg-zinc-800/80 transition-all duration-300">
                    <input
                      type="checkbox"
                      checked={showOnlyActive}
                      onChange={(e) => setShowOnlyActive(e.target.checked)}
                      className="w-4 h-4 rounded accent-blue-500"
                    />
                    <span className="text-sm text-zinc-300">Apenas ativos</span>
                  </label>

                  <button
                    onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                    className="p-2.5 rounded-xl border border-zinc-700/50 bg-zinc-800/50 text-zinc-400 hover:text-zinc-200 transition-all duration-300"
                    title={viewMode === "grid" ? "Visualização em lista" : "Visualização em grade"}
                  >
                    <Layers size={20} />
                  </button>
                </div>
              </div>

              {/* Results count & actions */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-800/50">
                <p className="text-sm text-zinc-500">
                  Mostrando{" "}
                  <span className="text-zinc-200 font-bold">{filteredAndSorted.length}</span>{" "}
                  de <span className="text-zinc-200 font-bold">{items.length}</span> objetos
                </p>

                <div className="flex items-center gap-2">
                  {isSelectionMode && (
                    <>
                      <span className="text-sm text-zinc-400">
                        {selectedItems.size} selecionado{selectedItems.size !== 1 ? "s" : ""}
                      </span>
                      <button
                        onClick={bulkDelete}
                        disabled={selectedItems.size === 0}
                        className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={14} className="inline mr-1" />
                        Excluir
                      </button>
                      <button
                        onClick={() => {
                          setIsSelectionMode(false);
                          setSelectedItems(new Set());
                        }}
                        className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
                      >
                        Cancelar
                      </button>
                    </>
                  )}
                  {!isSelectionMode && (
                    <button
                      onClick={() => setIsSelectionMode(true)}
                      className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      Selecionar múltiplos
                    </button>
                  )}
                </div>
              </div>
            </div>
          </Transition>
        </div>

        {/* ===== Content ===== */}
        {loading ? (
          <div className={viewMode === "grid" 
            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            : "flex flex-col gap-3"
          }>
            {Array.from({ length: 8 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : filteredAndSorted.length === 0 ? (
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-16 text-center">
            <div className="inline-flex p-4 rounded-full bg-zinc-800/50 mb-4">
              <Search size={32} className="text-zinc-600" />
            </div>
            <h3 className="text-xl font-semibold text-zinc-300 mb-2">
              Nenhum registro encontrado
            </h3>
            <p className="text-zinc-500 mb-6 max-w-md mx-auto">
              {search || filterType
                ? "Tente ajustar os filtros ou limpar a busca para ver mais resultados."
                : "Comece criando seu primeiro objeto de banco de dados."}
            </p>
            <button
              onClick={openNewModal}
              className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-xl inline-flex items-center gap-2 transition-colors"
            >
              <Plus size={18} />
              Criar Primeiro Objeto
            </button>
          </div>
        ) : viewMode === "grid" ? (
          /* ===== Grid View ===== */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredAndSorted.map((item) => (
              <div
                key={item.id}
                className={`
                  group relative bg-zinc-900/50 border rounded-xl p-5 cursor-pointer
                  transition-all duration-300 hover:shadow-xl
                  ${item.active === false
                    ? "border-zinc-800/50 opacity-75 hover:opacity-90"
                    : "border-zinc-800/50 hover:border-blue-500/30 hover:bg-zinc-900/80"
                  }
                  ${selectedItems.has(item.id) ? "ring-2 ring-blue-500 border-blue-500/50" : ""}
                `}
                onClick={() => {
                  if (isSelectionMode) {
                    toggleItemSelection(item.id);
                  } else {
                    openViewModal(item);
                  }
                }}
              >
                {/* Selection Checkbox */}
                {isSelectionMode && (
                  <div className="absolute top-3 left-3 z-10">
                    <div className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                      ${selectedItems.has(item.id)
                        ? "bg-blue-500 border-blue-500"
                        : "border-zinc-600 bg-zinc-800/50"
                      }
                    `}>
                      {selectedItems.has(item.id) && <Check size={12} className="text-white" />}
                    </div>
                  </div>
                )}

                {/* Favorite */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(item);
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-zinc-800 transition-colors z-10"
                >
                  {item.favorite ? (
                    <Star size={16} className="text-amber-400 fill-amber-400" />
                  ) : (
                    <Star size={16} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                  )}
                </button>

                {/* Content */}
                <div className="mb-4 pt-4">
                  <h3
                    className="text-lg font-bold text-zinc-100 mb-2 truncate group-hover:text-blue-400 transition-colors"
                    title={item.name}
                  >
                    {item.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <TypeBadge type={item.type} />
                    <StatusBadge active={item.active !== false} />
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <FolderTree size={14} className="text-zinc-600 shrink-0" />
                    <span className="text-zinc-500">
                      {item.modules?.length || 0} módulo{(item.modules?.length || 0) !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <GitBranch size={14} className="text-zinc-600 shrink-0" />
                    <span className="text-zinc-500">
                      {item.origins?.length || 0} origem{(item.origins?.length || 0) !== 1 ? "ns" : ""}
                    </span>
                  </div>
                  {item.observations && (
                    <p className="text-xs text-zinc-600 line-clamp-2 mt-2 pl-6">
                      {item.observations}
                    </p>
                  )}
                </div>

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700/50"
                      >
                        {tag}
                      </span>
                    ))}
                    {item.tags.length > 3 && (
                      <span className="text-[10px] px-2 py-0.5 text-zinc-500">
                        +{item.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1 pt-3 border-t border-zinc-800/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(item);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-blue-400 transition-all duration-200 text-xs font-medium"
                  >
                    <Edit3 size={14} />
                    Editar
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleActive(item);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 transition-all duration-200 text-xs font-medium"
                  >
                    <Zap size={14} />
                    {item.active ? "Inativar" : "Ativar"}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setItemToDelete(item.id);
                      setDeleteConfirmOpen(true);
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-all duration-200 text-xs font-medium"
                  >
                    <Trash2 size={14} />
                    Excluir
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* ===== List View ===== */
          <div className="flex flex-col gap-2">
            {filteredAndSorted.map((item) => (
              <div
                key={item.id}
                className={`
                  group flex items-center gap-4 bg-zinc-900/50 border rounded-xl p-4 cursor-pointer
                  transition-all duration-200 hover:bg-zinc-900/80
                  ${item.active === false
                    ? "border-zinc-800/50 opacity-75"
                    : "border-zinc-800/50 hover:border-blue-500/30"
                  }
                  ${selectedItems.has(item.id) ? "ring-2 ring-blue-500 border-blue-500/50" : ""}
                `}
                onClick={() => {
                  if (isSelectionMode) {
                    toggleItemSelection(item.id);
                  } else {
                    openViewModal(item);
                  }
                }}
              >
                {isSelectionMode && (
                  <div className={`
                    w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                    ${selectedItems.has(item.id)
                      ? "bg-blue-500 border-blue-500"
                      : "border-zinc-600 bg-zinc-800/50"
                    }
                  `}>
                    {selectedItems.has(item.id) && <Check size={12} className="text-white" />}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-zinc-100 truncate group-hover:text-blue-400 transition-colors">
                      {item.name}
                    </h3>
                    <TypeBadge type={item.type} />
                    <StatusBadge active={item.active !== false} />
                    {item.favorite && <Star size={14} className="text-amber-400 fill-amber-400 shrink-0" />}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-500">
                    <span className="flex items-center gap-1">
                      <FolderTree size={12} />
                      {item.modules?.length || 0} módulo{(item.modules?.length || 0) !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <GitBranch size={12} />
                      {item.origins?.length || 0} origem{(item.origins?.length || 0) !== 1 ? "ns" : ""}
                    </span>
                    {item.observations && (
                      <span className="truncate max-w-[200px]">
                        {item.observations}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditModal(item);
                    }}
                    className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-blue-400 transition-colors"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleActive(item);
                    }}
                    className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-amber-400 transition-colors"
                  >
                    <Zap size={16} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setItemToDelete(item.id);
                      setDeleteConfirmOpen(true);
                    }}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== Create/Edit Modal ===== */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-800/50 bg-gradient-to-r from-blue-500/5 to-transparent">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10">
                  {editing ? (
                    <Edit3 size={20} className="text-blue-400" />
                  ) : (
                    <Plus size={20} className="text-blue-400" />
                  )}
                </div>
                <Dialog.Title className="text-xl font-bold text-zinc-50">
                  {editing ? "Editar Objeto" : "Novo Objeto"}
                </Dialog.Title>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl hover:bg-zinc-800 transition-colors"
              >
                <X size={20} className="text-zinc-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <AnimatedInput
                  label="Nome"
                  value={formData.name}
                  onChange={(v) => setFormData((prev) => ({ ...prev, name: v }))}
                  placeholder="Nome do objeto"
                  required
                  icon={FileCode}
                />

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-300">Tipo</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(TYPE_CONFIG).map(([value, config]) => {
                      const Icon = config.icon;
                      const isSelected = formData.type === value;
                      return (
                        <button
                          key={value}
                          onClick={() => setFormData((prev) => ({ ...prev, type: value as ObjType }))}
                          className={`
                            flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all duration-200
                            ${isSelected
                              ? `${config.color} bg-gradient-to-r ${config.gradient} border-current/30`
                              : "text-zinc-500 border-zinc-700/50 hover:border-zinc-600/50 hover:text-zinc-300"
                            }
                          `}
                        >
                          <Icon size={16} />
                          {config.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modules */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Módulos</label>
                <div className="flex gap-2">
                  <input
                    value={moduleInput}
                    onChange={(e) => setModuleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addToList("modules", moduleInput, setModuleInput);
                      }
                    }}
                    placeholder="Adicionar módulo..."
                    className="flex-1 py-2.5 px-4 rounded-xl border border-zinc-700/50 bg-zinc-800/50 text-zinc-100 placeholder-zinc-500 outline-none focus:border-blue-500/50 transition-all"
                  />
                  <button
                    onClick={() => addToList("modules", moduleInput, setModuleInput)}
                    className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors font-medium text-sm"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {formData.modules.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.modules.map((m) => (
                      <Chip key={m} label={m} onRemove={() => removeFromList("modules", m)} />
                    ))}
                  </div>
                )}
              </div>

              {/* Origins */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Origens</label>
                <div className="flex gap-2">
                  <input
                    value={originInput}
                    onChange={(e) => setOriginInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addToList("origins", originInput, setOriginInput);
                      }
                    }}
                    placeholder="Adicionar origem..."
                    className="flex-1 py-2.5 px-4 rounded-xl border border-zinc-700/50 bg-zinc-800/50 text-zinc-100 placeholder-zinc-500 outline-none focus:border-blue-500/50 transition-all"
                  />
                  <button
                    onClick={() => addToList("origins", originInput, setOriginInput)}
                    className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors font-medium text-sm"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {formData.origins.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.origins.map((o) => (
                      <Chip key={o} label={o} onRemove={() => removeFromList("origins", o)} color="emerald" />
                    ))}
                  </div>
                )}
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-300">Tags</label>
                <div className="flex gap-2">
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addToList("tags", tagInput, setTagInput);
                      }
                    }}
                    placeholder="Adicionar tag..."
                    className="flex-1 py-2.5 px-4 rounded-xl border border-zinc-700/50 bg-zinc-800/50 text-zinc-100 placeholder-zinc-500 outline-none focus:border-blue-500/50 transition-all"
                  />
                  <button
                    onClick={() => addToList("tags", tagInput, setTagInput)}
                    className="px-4 py-2.5 bg-violet-500 hover:bg-violet-600 rounded-xl transition-colors font-medium text-sm"
                  >
                    <Tag size={16} />
                  </button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((t) => (
                      <Chip key={t} label={t} onRemove={() => removeFromList("tags", t)} color="violet" />
                    ))}
                  </div>
                )}
              </div>

              {/* Observations */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-300">Observações</label>
                <textarea
                  rows={4}
                  value={formData.observations}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, observations: e.target.value }))
                  }
                  placeholder="Observações adicionais, notas, descrições..."
                  className="w-full p-4 rounded-xl border border-zinc-700/50 bg-zinc-800/50 text-zinc-100 placeholder-zinc-500 outline-none focus:border-blue-500/50 focus:bg-zinc-800/80 transition-all resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-zinc-800/50 bg-zinc-900/50">
              <button
                onClick={() => setModalOpen(false)}
                className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl transition-colors font-medium text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.name.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl transition-all duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Check size={18} />
                    {editing ? "Atualizar" : "Criar"}
                  </>
                )}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* ===== View Modal ===== */}
      <Dialog open={viewModalOpen} onClose={() => setViewModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            {viewItem && (
              <>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-zinc-800/50 bg-gradient-to-r from-blue-500/5 to-transparent">
                  <div className="flex items-center gap-3">
                    {React.createElement(TYPE_CONFIG[viewItem.type].icon, { size: 24, className: TYPE_CONFIG[viewItem.type].color })}
                    <div>
                      <Dialog.Title className="text-xl font-bold text-zinc-50">
                        {viewItem.name}
                      </Dialog.Title>
                      <div className="flex items-center gap-2 mt-1">
                        <TypeBadge type={viewItem.type} size="md" />
                        <StatusBadge active={viewItem.active !== false} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setViewModalOpen(false);
                        openEditModal(viewItem);
                      }}
                      className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-blue-400 transition-colors"
                      title="Editar"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button
                      onClick={() => copyToClipboard(viewItem.name, viewItem.id)}
                      className="p-2 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition-colors"
                      title="Copiar nome"
                    >
                      {copiedId === viewItem.id ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                    </button>
                    <button
                      onClick={() => setViewModalOpen(false)}
                      className="p-2 rounded-xl hover:bg-zinc-800 transition-colors"
                    >
                      <X size={18} className="text-zinc-400" />
                    </button>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Modules & Origins */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-800/50">
                      <h4 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                        <FolderTree size={16} className="text-blue-400" />
                        Módulos ({viewItem.modules?.length || 0})
                      </h4>
                      {viewItem.modules?.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {viewItem.modules.map((m) => (
                            <Chip key={m} label={m} size="sm" />
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-600">Nenhum módulo cadastrado</p>
                      )}
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-800/50">
                      <h4 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                        <GitBranch size={16} className="text-emerald-400" />
                        Origens ({viewItem.origins?.length || 0})
                      </h4>
                      {viewItem.origins?.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {viewItem.origins.map((o) => (
                            <Chip key={o} label={o} size="sm" color="emerald" />
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-600">Nenhuma origem cadastrada</p>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  {viewItem.tags && viewItem.tags.length > 0 && (
                    <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-800/50">
                      <h4 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                        <Tag size={16} className="text-violet-400" />
                        Tags
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {viewItem.tags.map((t) => (
                          <Chip key={t} label={t} size="sm" color="violet" />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Observations */}
                  {viewItem.observations && (
                    <div className="p-4 rounded-xl bg-zinc-800/30 border border-zinc-800/50">
                      <h4 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                        <MessageSquare size={16} className="text-amber-400" />
                        Observações
                      </h4>
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                        {viewItem.observations}
                      </p>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="p-4 rounded-xl bg-zinc-800/20 border border-zinc-800/30">
                    <h4 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                      <Info size={16} className="text-zinc-400" />
                      Metadados
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-zinc-500" />
                        <span className="text-zinc-500">Criado em:</span>
                        <span className="text-zinc-300">
                          {viewItem.createdAt?.toDate().toLocaleDateString("pt-BR") || "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-zinc-500" />
                        <span className="text-zinc-500">Atualizado em:</span>
                        <span className="text-zinc-300">
                          {viewItem.updatedAt
                            ? viewItem.updatedAt.toDate().toLocaleDateString("pt-BR")
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Hash size={14} className="text-zinc-500" />
                        <span className="text-zinc-500">ID:</span>
                        <span className="text-zinc-300 font-mono text-xs">{viewItem.id.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-6 border-t border-zinc-800/50 bg-zinc-900/50">
                  <button
                    onClick={() => toggleActive(viewItem)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      viewItem.active
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                    }`}
                  >
                    {viewItem.active ? "Inativar" : "Ativar"}
                  </button>
                  <button
                    onClick={() => setViewModalOpen(false)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-medium transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* ===== Delete Confirmation Modal ===== */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" aria-hidden />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-full bg-red-500/10">
                <AlertTriangle size={24} className="text-red-400" />
              </div>
              <div>
                <Dialog.Title className="text-lg font-bold text-zinc-50">
                  Confirmar exclusão
                </Dialog.Title>
                <p className="text-sm text-zinc-400 mt-1">
                  Esta ação é irreversível e não pode ser desfeita.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setItemToDelete(null);
                }}
                className="flex-1 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => itemToDelete && handleDelete(itemToDelete)}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 rounded-xl text-sm font-medium transition-colors"
              >
                Excluir permanentemente
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}