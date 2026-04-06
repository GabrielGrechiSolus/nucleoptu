'use client';

import React, { useEffect, useState, useCallback } from "react";
import withAuth from "../components/withAuth";
import {
  collection,
  addDoc,
  setDoc,
  deleteDoc,
  doc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  limit,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  getDoc
} from "firebase/firestore";
import { db, auth } from "../../firebase";

import {
  Search,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  CheckCircle,
  FileText,
  File,
  FileCode,
  Globe,
  BarChart2,
  User,
  Slash,
  RefreshCcw,
  Eye,
  EyeOff,
  Users,
  Zap,
  Circle,
  Bell,
  BellRing,
  Star,
  StarOff,
  Clock,
  Filter,
  Download,
  Upload,
  Info,
  Sparkles,
  AlertTriangle,
  Shield,
  ShieldCheck,
} from "lucide-react";

import { Dialog } from "@headlessui/react";
import { motion, AnimatePresence } from "framer-motion";

interface Notice {
  id: string;
  title: string;
  description?: string;
  link?: string;
  type?: "texto" | "pdf" | "word" | "excel" | "site";
  createdAt: number;
  creatorEmail: string;
  readBy?: string[];
  importance?: "low" | "medium" | "high";
  active?: boolean;
  target?: "todos" | "analise" | "desenvolvimento" | "lideranca" | "sustentacao";
}

const NoticesPage = () => {
  const user = auth.currentUser;

  const [notices, setNotices] = useState<Notice[]>([]);
  const [userType, setUserType] = useState<Notice["target"]>("todos");

  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read">("all");
  const [importanceFilter, setImportanceFilter] = useState<"all" | "low" | "medium" | "high">("all");
  const [showInactive, setShowInactive] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteId, setDeleteId] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newLink, setNewLink] = useState("");
  const [newType, setNewType] = useState<Notice["type"]>("texto");
  const [newImportance, setNewImportance] = useState<Notice["importance"]>("medium");
  const [newTarget, setNewTarget] = useState<Notice["target"]>("todos");

  const [editId, setEditId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editType, setEditType] = useState<Notice["type"]>("texto");
  const [editImportance, setEditImportance] = useState<Notice["importance"]>("medium");
  const [editTarget, setEditTarget] = useState<Notice["target"]>("todos");

  const [readModalOpen, setReadModalOpen] = useState(false);
  const [readList, setReadList] = useState<string[]>([]);

  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(6);
  const [showFilters, setShowFilters] = useState(false);
  const [hoveredNotice, setHoveredNotice] = useState<string | null>(null);

  const FETCH_LIMIT = 500;

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR");
  };

  const getRelativeTime = (ts: number) => {
    const now = Date.now();
    const diff = now - ts;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "agora";
    if (minutes < 60) return `${minutes} min`;
    if (hours < 24) return `${hours} h`;
    if (days < 30) return `${days} dias`;
    return formatDate(ts).split(" ")[0];
  };

  const typeConfig: Record<NonNullable<Notice["type"]>, { icon: React.ReactNode; color: string; bgGradient: string }> = {
    texto: { icon: <FileCode className="w-4 h-4" />, color: "bg-gray-600", bgGradient: "from-gray-600 to-gray-700" },
    pdf: { icon: <FileText className="w-4 h-4" />, color: "bg-red-600", bgGradient: "from-red-600 to-red-700" },
    word: { icon: <File className="w-4 h-4" />, color: "bg-blue-600", bgGradient: "from-blue-600 to-blue-700" },
    excel: { icon: <BarChart2 className="w-4 h-4" />, color: "bg-green-600", bgGradient: "from-green-600 to-green-700" },
    site: { icon: <Globe className="w-4 h-4" />, color: "bg-sky-500", bgGradient: "from-sky-500 to-sky-600" },
  };

  const importanceConfig: Record<NonNullable<Notice["importance"]>, { color: string; bgColor: string; borderColor: string; icon: React.ReactNode; label: string }> = {
    low: { 
      color: "text-green-400", 
      bgColor: "bg-green-500/20", 
      borderColor: "border-green-500/30",
      icon: <Circle className="w-3 h-3" />,
      label: "Baixa"
    },
    medium: { 
      color: "text-yellow-400", 
      bgColor: "bg-yellow-500/20", 
      borderColor: "border-yellow-500/30",
      icon: <Zap className="w-3 h-3" />,
      label: "Média"
    },
    high: { 
      color: "text-red-400", 
      bgColor: "bg-red-500/20", 
      borderColor: "border-red-500/30",
      icon: <AlertTriangle className="w-3 h-3" />,
      label: "Alta"
    },
  };

const targetConfig: Record<NonNullable<Notice["target"]>, { icon: React.ReactNode; label: string; color: string }> = {
    todos: { icon: <Users className="w-3 h-3" />, label: "Todos", color: "text-gray-400" },
    analise: { icon: <Eye className="w-3 h-3" />, label: "Análise", color: "text-blue-400" },
    desenvolvimento: { icon: <FileCode className="w-3 h-3" />, label: "Dev", color: "text-emerald-400" },
    lideranca: { icon: <Shield className="w-3 h-3" />, label: "Liderança", color: "text-purple-400" },
    sustentacao: { icon: <ShieldCheck className="w-3 h-3" />, label: "Sustentação", color: "text-amber-400" },
  };

  useEffect(() => {
    const fetchUserType = async () => {
      if (!user) return;
      try {
        const userRef = doc(db, "profiles", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserType(data.noticeType || "todos");
        }
      } catch (err) {
        console.error("Erro ao buscar tipo de usuário:", err);
      }
    };
    void fetchUserType();
  }, [user]);

  const loadNotices = useCallback(async () => {
    try {
      const q = query(collection(db, "notices"), orderBy("createdAt", "desc"), limit(FETCH_LIMIT));
      const snap = await getDocs(q);

      const loaded: Notice[] = snap.docs.map((d) => ({
        id: d.id,
        title: d.data().title,
        description: d.data().description || "",
        link: d.data().link || "",
        type: d.data().type || "texto",
        importance: d.data().importance || "medium",
        createdAt: d.data().createdAt || Date.now(),
        creatorEmail: d.data().creatorEmail,
        readBy: d.data().readBy || [],
        active: d.data().active !== false,
        target: d.data().target || "todos",
      }));

      setNotices(loaded);
    } catch (error) {
      console.error("Erro ao carregar avisos:", error);
    }
  }, []);

  useEffect(() => {
    void loadNotices();
  }, [loadNotices]);

  useEffect(() => {
    setVisibleCount(6);
  }, [search, filterDate, statusFilter, importanceFilter, showInactive, userType]);

  const handleAdd = async () => {
    if (!newTitle.trim() || !user) return;

    try {
      await addDoc(collection(db, "notices"), {
        title: newTitle,
        description: newDescription,
        link: newLink,
        type: newType,
        importance: newImportance,
        target: newTarget,
        active: true,
        createdAt: Date.now(),
        creatorEmail: user.email || "Desconhecido",
        readBy: [],
      });

      setNewTitle("");
      setNewDescription("");
      setNewLink("");
      setNewType("texto");
      setNewImportance("medium");
      setNewTarget("todos");
      setIsAdding(false);
      void loadNotices();
    } catch (err) {
      console.error("Erro ao adicionar aviso:", err);
    }
  };

  const handleEdit = async () => {
    try {
      await updateDoc(doc(db, "notices", editId), {
        title: editTitle,
        description: editDescription,
        link: editLink,
        type: editType,
        importance: editImportance,
        target: editTarget,
      });
      setIsEditing(false);
      void loadNotices();
    } catch (err) {
      console.error("Erro ao editar aviso:", err);
    }
  };

  const confirmDelete = (id: string) => {
    setDeleteId(id);
    setIsDeleting(true);
  };

  const handleDelete = async () => {
    try {
      await deleteDoc(doc(db, "notices", deleteId));
      setIsDeleting(false);
      setDeleteId("");
      void loadNotices();
    } catch (err) {
      console.error("Erro ao deletar aviso:", err);
    }
  };

  const handleToggleActive = async (notice: Notice) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "notices", notice.id), { active: !notice.active });
      void loadNotices();
    } catch (err) {
      console.error("Erro ao alternar ativo:", err);
    }
  };

  const handleMarkAsRead = async (notice: Notice) => {
    if (!user) return;
    try {
      const noticeRef = doc(db, "notices", notice.id);
      await updateDoc(noticeRef, { readBy: arrayUnion(user.email || "Desconhecido") });
      void loadNotices();
    } catch (err) {
      console.error("Erro ao marcar como lido:", err);
    }
  };

  const handleMarkAsUnread = async (notice: Notice) => {
    if (!user) return;
    try {
      const noticeRef = doc(db, "notices", notice.id);
      await updateDoc(noticeRef, { readBy: arrayRemove(user.email || "Desconhecido") });
      void loadNotices();
    } catch (err) {
      console.error("Erro ao marcar como não lido:", err);
    }
  };

  const handleOpenReadModal = (readBy: string[] | undefined) => {
    setReadList(readBy || []);
    setReadModalOpen(true);
  };

  const handleExportJSON = (items: Notice[]) => {
    try {
      const data = JSON.stringify(items, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `notices-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Erro ao exportar JSON:", err);
      alert("Erro ao exportar JSON");
    }
  };

  const fileInputRef = React.createRef<HTMLInputElement>();
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      let text = await file.text();
      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch (err) {
        const sanitized = text.replace(/:\s*NaN/g, ': null');
        try {
          parsed = JSON.parse(sanitized);
        } catch (err2) {
          console.error('Erro ao parsear JSON', err, err2);
          alert('Erro ao importar JSON. Verifique o formato do arquivo.');
          return;
        }
      }

      if (!Array.isArray(parsed)) {
        alert('Arquivo inválido: espere um array de avisos');
        return;
      }

      let created = 0;
      for (const item of parsed) {
        if (!item || !item.title) continue;

        const data = {
          title: item.title,
          description: item.description || '',
          link: item.link || '',
          type: item.type || 'texto',
          importance: item.importance || 'medium',
          target: item.target || 'todos',
          active: item.active !== false,
          createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
          creatorEmail: item.creatorEmail || (user?.email || 'Importado'),
          readBy: Array.isArray(item.readBy) ? item.readBy : [],
        };

        try {
          if (item.id && typeof item.id === 'string') {
            await setDoc(doc(db, 'notices', item.id), data);
          } else {
            await addDoc(collection(db, 'notices'), data);
          }
          created++;
        } catch (innerErr) {
          console.error('Erro ao gravar aviso importado', innerErr, item);
        }
      }

      alert(`Importação concluída: ${created} avisos criados`);
      void loadNotices();
    } catch (err) {
      console.error("Erro ao importar JSON:", err);
      alert("Erro ao importar JSON. Verifique o formato do arquivo.");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openNoticeDetails = (notice: Notice) => {
    setSelectedNotice(notice);
  };

  const closeNoticeDetails = () => {
    setSelectedNotice(null);
  };

  const filtered = notices.filter((n) => {
    const s = search.toLowerCase();
    const matchesSearch =
      n.title.toLowerCase().includes(s) ||
      n.description?.toLowerCase().includes(s);

    const matchesDate = filterDate
      ? new Date(n.createdAt).toISOString().split("T")[0] === filterDate
      : true;

    const readStatus = n.readBy?.includes(user?.email || "");
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "unread"
        ? !readStatus
        : readStatus;

    const matchesImportance =
      importanceFilter === "all" ? true : n.importance === importanceFilter;

    const matchesActive = showInactive
      ? n.creatorEmail === user?.email && !n.active
      : n.active;

    const matchesTarget = n.target === "todos" || n.target === userType;

    return (
      matchesSearch &&
      matchesDate &&
      matchesStatus &&
      matchesImportance &&
      matchesActive &&
      matchesTarget
    );
  });

  const showMore = () => {
    const thresholds = [6, 12, 18, 24, 36, 48];
    const current = visibleCount;
    const next = thresholds.find((t) => t > current);
    if (next) {
      setVisibleCount(next);
    } else {
      setVisibleCount(current + 12);
    }
  };

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header com LEDs */}
      <div className="relative">
        <div className="flex items-center gap-3 mb-2">
          <div className="relative">
            <BellRing className="w-8 h-8 text-sky-400" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-sky-400 to-purple-400 bg-clip-text text-transparent">
            Mural de Avisos
          </h1>
        </div>
        <p className="text-zinc-400 text-sm">
          {filtered.length} aviso(s) • {notices.filter(n => !n.readBy?.includes(user?.email || "") && n.active).length} não lidos
        </p>
        
        {/* LED Decorativo */}
        <div className="absolute top-0 right-0 flex gap-1">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse delay-300" />
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse delay-700" />
        </div>
      </div>

      {/* Filtros com LED toggle */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 focus-within:border-sky-500 transition-all">
              <Search className="w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar aviso..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent outline-none w-full text-sm text-white placeholder-zinc-500"
              />
            </div>
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              showFilters || filterDate || statusFilter !== "all" || importanceFilter !== "all" || showInactive
                ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-300"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
          </button>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2">
                    <Calendar className="w-4 h-4 text-zinc-400" />
                    <input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="bg-transparent outline-none w-full text-sm text-white"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="all">Todos os status</option>
                    <option value="unread">Não lidos</option>
                    <option value="read">Lidos</option>
                  </select>

                  <select
                    value={importanceFilter}
                    onChange={(e) => setImportanceFilter(e.target.value as any)}
                    className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="all">Todas importâncias</option>
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>

                  {user && (
                    <button
                      onClick={() => setShowInactive(!showInactive)}
                      className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
                        showInactive
                          ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                          : "bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-300"
                      }`}
                    >
                      {showInactive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {showInactive ? "Inativos" : "Ativos"}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600 transition-all px-4 py-2 rounded-xl text-sm font-medium shadow-lg hover:shadow-xl"
          >
            <Plus className="w-4 h-4" /> Novo Aviso
          </button>

          <button
            onClick={() => handleExportJSON(notices)}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 transition px-3 py-2 rounded-xl text-sm font-medium border border-zinc-700"
          >
            <Download className="w-4 h-4" /> Exportar
          </button>

          <button
            onClick={handleImportClick}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 transition px-3 py-2 rounded-xl text-sm font-medium border border-zinc-700"
          >
            <Upload className="w-4 h-4" /> Importar
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImportFile} className="hidden" />
      </div>

      {/* Lista de Avisos com Animação */}
      <div className="grid gap-4">
        <AnimatePresence>
          {filtered.slice(0, visibleCount).map((item, index) => {
            const isRead = item.readBy?.includes(user?.email || "");
            const importance = importanceConfig[item.importance || "medium"];
            const isHovered = hoveredNotice === item.id;
            
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => openNoticeDetails(item)}
                onMouseEnter={() => setHoveredNotice(item.id)}
                onMouseLeave={() => setHoveredNotice(null)}
                className={`
                  relative border rounded-xl p-4 transition-all cursor-pointer overflow-hidden
                  ${!item.active ? "opacity-50 bg-zinc-900/40 border-zinc-800" : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"}
                  ${!isRead && item.active ? "border-l-4 border-l-sky-500" : ""}
                `}
                role="button"
              >
                {/* LED Indicator for unread */}
                {!isRead && item.active && (
                  <div className="absolute top-4 right-4">
                    <div className="relative">
                      <div className="w-2 h-2 bg-sky-500 rounded-full animate-pulse" />
                      <div className="absolute inset-0 w-2 h-2 bg-sky-500 rounded-full animate-ping opacity-75" />
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Type Badge com LED */}
                      <div className={`bg-gradient-to-r ${typeConfig[item.type || "texto"].bgGradient} px-2 py-1 rounded-lg flex items-center gap-1`}>
                        {typeConfig[item.type || "texto"].icon}
                        <span className="text-xs text-white uppercase">{item.type}</span>
                      </div>
                      
                      {/* Importance Badge com LED */}
                      <div className={`${importance.bgColor} ${importance.borderColor} border px-2 py-1 rounded-lg flex items-center gap-1`}>
                        {importance.icon}
                        <span className={`text-xs ${importance.color}`}>{importance.label}</span>
                      </div>
                      
                      {/* Target Badge */}
                      <div className="bg-zinc-800 px-2 py-1 rounded-lg flex items-center gap-1">
                        {targetConfig[item.target || "todos"].icon}
                        <span className={`text-xs ${targetConfig[item.target || "todos"].color}`}>
                          {targetConfig[item.target || "todos"].label}
                        </span>
                      </div>
                      
                      {!item.active && (
                        <div className="bg-gray-500/20 px-2 py-1 rounded-lg flex items-center gap-1">
                          <Slash className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-400">Inativo</span>
                        </div>
                      )}
                    </div>

                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      {item.title}
                    </h2>
                    
                    {item.description && (
                      <p className="text-sm text-zinc-300 line-clamp-2">{item.description}</p>
                    )}
                    
                    <div className="flex flex-wrap gap-3 items-center text-xs text-zinc-500">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{item.creatorEmail.split('@')[0]}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span title={formatDate(item.createdAt)}>{getRelativeTime(item.createdAt)}</span>
                      </div>
                      {item.link && (
                        <button
                          onClick={(e) => { e.stopPropagation(); window.open(item.link, '_blank'); }}
                          className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition"
                        >
                          <Globe className="w-3 h-3" />
                          <span>Abrir link</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-1">
                    {!isRead && item.active && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkAsRead(item); }}
                        className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all"
                        title="Marcar como lido"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}

                    {isRead && item.active && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkAsUnread(item); }}
                        className="p-2 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-all"
                        title="Marcar como não lido"
                      >
                        <Bell className="w-4 h-4" />
                      </button>
                    )}

                    {item.creatorEmail === user?.email && (
                      <>
                        {item.active ? (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation();
                                setEditId(item.id);
                                setEditTitle(item.title);
                                setEditDescription(item.description || "");
                                setEditLink(item.link || "");
                                setEditType(item.type || "texto");
                                setEditImportance(item.importance || "medium");
                                setEditTarget(item.target || "todos");
                                setIsEditing(true);
                              }}
                              className="p-2 rounded-lg bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 transition-all"
                              title="Editar"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleToggleActive(item); }}
                              className="p-2 rounded-lg bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-all"
                              title="Inativar"
                            >
                              <Slash className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleActive(item); }}
                            className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-all"
                            title="Reativar"
                          >
                            <RefreshCcw className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); confirmDelete(item.id); }}
                          className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleOpenReadModal(item.readBy); }}
                          className="p-2 rounded-lg bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700 transition-all"
                          title="Ver quem leu"
                        >
                          <Users className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Botão Mostrar Mais */}
      {visibleCount < filtered.length && (
        <div className="flex justify-center">
          <button
            onClick={showMore}
            className="mt-2 px-6 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600 text-white text-sm font-medium transition-all shadow-lg hover:shadow-xl"
          >
            Mostrar mais ({Math.min(filtered.length, visibleCount + 6)} de {filtered.length})
          </button>
        </div>
      )}

      {/* Estado Vazio */}
      {filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12 bg-zinc-900/50 border border-zinc-800 rounded-xl"
        >
          <Bell className="w-12 h-12 mx-auto text-zinc-600 mb-3" />
          <p className="text-zinc-400">Nenhum aviso encontrado</p>
          <p className="text-zinc-500 text-sm mt-1">Tente ajustar os filtros ou criar um novo aviso</p>
        </motion.div>
      )}

      {/* Modais (mantidos os existentes com pequenas melhorias) */}
      <Dialog open={isAdding} onClose={() => setIsAdding(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/70" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 space-y-4">
            <Dialog.Title className="text-xl font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-sky-400" />
              Novo Aviso
            </Dialog.Title>
            
            <input
              type="text"
              placeholder="Título *"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-sky-500 focus:outline-none"
            />
            <textarea
              placeholder="Descrição"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={3}
              className="w-full p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-sky-500 focus:outline-none resize-none"
            />
            <input
              type="text"
              placeholder="Link"
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
              className="w-full p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-sky-500 focus:outline-none"
            />
            
            <div className="grid grid-cols-2 gap-2">
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as Notice["type"])}
                className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-sky-500 focus:outline-none"
              >
                <option value="texto">Texto</option>
                <option value="pdf">PDF</option>
                <option value="word">Word</option>
                <option value="excel">Excel</option>
                <option value="site">Site</option>
              </select>
              <select
                value={newImportance}
                onChange={(e) => setNewImportance(e.target.value as Notice["importance"])}
                className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-sky-500 focus:outline-none"
              >
                <option value="low">Baixa importância</option>
                <option value="medium">Média importância</option>
                <option value="high">Alta importância</option>
              </select>
              <select
                value={newTarget}
                onChange={(e) => setNewTarget(e.target.value as Notice["target"])}
                className="col-span-2 p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-sky-500 focus:outline-none"
              >
                <option value="todos">Todos</option>
                <option value="analise">Análise</option>
                <option value="desenvolvimento">Desenvolvimento</option>
                <option value="lideranca">Liderança</option>
                <option value="sustentacao">Sustentação</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsAdding(false)} className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition">
                Cancelar
              </button>
              <button onClick={handleAdd} className="px-4 py-2 rounded-lg bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-500 hover:to-sky-600 text-white transition">
                Salvar
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Modal de Detalhes */}
      <Dialog open={!!selectedNotice} onClose={closeNoticeDetails} className="relative z-50">
        <div className="fixed inset-0 bg-black/70" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            {selectedNotice && (
              <>
                <div className="flex justify-between items-start">
                  <Dialog.Title className="text-2xl font-bold text-white">{selectedNotice.title}</Dialog.Title>
                  <button onClick={closeNoticeDetails} className="text-zinc-400 hover:text-white text-2xl">&times;</button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <div className={`bg-gradient-to-r ${typeConfig[selectedNotice.type || "texto"].bgGradient} px-2 py-1 rounded-lg flex items-center gap-1`}>
                    {typeConfig[selectedNotice.type || "texto"].icon}
                    <span className="text-xs text-white uppercase">{selectedNotice.type}</span>
                  </div>
                  <div className={`${importanceConfig[selectedNotice.importance || "medium"].bgColor} px-2 py-1 rounded-lg flex items-center gap-1`}>
                    {importanceConfig[selectedNotice.importance || "medium"].icon}
                    <span className={`text-xs ${importanceConfig[selectedNotice.importance || "medium"].color}`}>
                      {importanceConfig[selectedNotice.importance || "medium"].label} importância
                    </span>
                  </div>
                  <div className="bg-zinc-800 px-2 py-1 rounded-lg flex items-center gap-1">
                    {targetConfig[selectedNotice.target || "todos"].icon}
                    <span className={`text-xs ${targetConfig[selectedNotice.target || "todos"].color}`}>
                      Para: {targetConfig[selectedNotice.target || "todos"].label}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <p className="text-zinc-400"><strong>Autor:</strong> {selectedNotice.creatorEmail}</p>
                  <p className="text-zinc-400"><strong>Data:</strong> {formatDate(selectedNotice.createdAt)}</p>
                  {selectedNotice.link && (
                    <p>
                      <strong>Link:</strong>{' '}
                      <a href={selectedNotice.link} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-300 underline">
                        {selectedNotice.link}
                      </a>
                    </p>
                  )}
                </div>
                
                {selectedNotice.description && (
                  <div className="mt-4 p-4 bg-zinc-800/50 rounded-lg">
                    <p className="text-zinc-300 whitespace-pre-wrap break-words">{selectedNotice.description}</p>
                  </div>
                )}
              </>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Demais modais mantidos */}
      <Dialog open={isEditing} onClose={() => setIsEditing(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/70" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 space-y-4">
            <Dialog.Title className="text-xl font-bold text-white">Editar Aviso</Dialog.Title>
            <input type="text" placeholder="Título" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full p-2 rounded bg-zinc-800 text-white" />
            <textarea placeholder="Descrição" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full p-2 rounded bg-zinc-800 text-white" rows={3} />
            <input type="text" placeholder="Link" value={editLink} onChange={(e) => setEditLink(e.target.value)} className="w-full p-2 rounded bg-zinc-800 text-white" />
            <div className="grid grid-cols-2 gap-2">
              <select value={editType} onChange={(e) => setEditType(e.target.value as Notice["type"])} className="p-2 rounded bg-zinc-800 text-white">
                <option value="texto">Texto</option>
                <option value="pdf">PDF</option>
                <option value="word">Word</option>
                <option value="excel">Excel</option>
                <option value="site">Site</option>
              </select>
              <select value={editImportance} onChange={(e) => setEditImportance(e.target.value as Notice["importance"])} className="p-2 rounded bg-zinc-800 text-white">
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
              </select>
              <select value={editTarget} onChange={(e) => setEditTarget(e.target.value as Notice["target"])} className="col-span-2 p-2 rounded bg-zinc-800 text-white">
                <option value="todos">Todos</option>
                <option value="analise">Análise</option>
                <option value="desenvolvimento">Desenvolvimento</option>
                <option value="lideranca">Liderança</option>
                <option value="sustentacao">Sustentação</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600">Cancelar</button>
              <button onClick={handleEdit} className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-700">Salvar</button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      <Dialog open={isDeleting} onClose={() => setIsDeleting(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/70" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 space-y-4">
            <Dialog.Title className="text-xl font-bold text-red-400">Confirmar Exclusão</Dialog.Title>
            <p className="text-zinc-300">Tem certeza que deseja deletar este aviso? Esta ação não pode ser desfeita.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setIsDeleting(false)} className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600">Cancelar</button>
              <button onClick={handleDelete} className="px-4 py-2 rounded bg-red-600 hover:bg-red-700">Deletar</button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      <Dialog open={readModalOpen} onClose={() => setReadModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/70" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 space-y-4">
            <Dialog.Title className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-400" />
              Usuários que leram
            </Dialog.Title>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {readList.length === 0 ? (
                <p className="text-zinc-500 text-center py-4">Ninguém leu este aviso ainda</p>
              ) : (
                readList.map((email, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 bg-zinc-800 rounded-lg">
                    <div className="w-6 h-6 rounded-full bg-sky-500/20 flex items-center justify-center">
                      <User className="w-3 h-3 text-sky-400" />
                    </div>
                    <span className="text-sm text-zinc-300">{email}</span>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end">
              <button onClick={() => setReadModalOpen(false)} className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-white">Fechar</button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

export default withAuth(NoticesPage);