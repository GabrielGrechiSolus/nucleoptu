'use client';

import React, { useEffect, useState, useCallback } from "react";
import withAuth from "../components/withAuth";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  limit,
  arrayUnion,
  arrayRemove,
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
} from "lucide-react";

import { Dialog } from "@headlessui/react";

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
  const [userType, setUserType] = useState<Notice["target"]>("todos"); // Tipo do usuário

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

  // <<< NOVO: controla quantos avisos aparecem na lista (3 -> 7 -> 10 -> 15 ...)
  const [visibleCount, setVisibleCount] = useState<number>(3);

  // Fetch limit para evitar carregar milhares de documentos inadvertidamente.
  // Ajuste conforme necessidade (por exemplo 500)
  const FETCH_LIMIT = 500;

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR");
  };

  const typeConfig: Record<NonNullable<Notice["type"]>, { icon: React.ReactNode; color: string }> = {
    texto: { icon: <FileCode className="w-4 h-4" />, color: "bg-gray-600" },
    pdf: { icon: <FileText className="w-4 h-4" />, color: "bg-red-600" },
    word: { icon: <File className="w-4 h-4" />, color: "bg-blue-600" },
    excel: { icon: <BarChart2 className="w-4 h-4" />, color: "bg-green-600" },
    site: { icon: <Globe className="w-4 h-4" />, color: "bg-sky-500" },
  };

  const importanceColor: Record<NonNullable<Notice["importance"]>, string> = {
    low: "bg-green-500",
    medium: "bg-yellow-500",
    high: "bg-red-500",
  };

  // Buscar tipo do usuário logado
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

  // Carregar notices do Firestore (até FETCH_LIMIT). Ordena por createdAt desc.
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

      // Mantemos a ordenação original (já by createdAt desc). Se quiser outro critério, altera aqui.
      setNotices(loaded);
    } catch (error) {
      console.error("Erro ao carregar avisos:", error);
    }
  }, []);

  useEffect(() => {
    void loadNotices();
  }, [loadNotices]);

  // Reset visibleCount quando filtros mudam para facilitar busca (comportamento desejado)
  useEffect(() => {
    setVisibleCount(3);
  }, [search, filterDate, statusFilter, importanceFilter, showInactive, userType]);

  // Funções de CRUD
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

  const copyToClipboard = (text: string) => {
    try {
      navigator.clipboard.writeText(text);
      // Use um toast no futuro; por hora alert simples
      alert("Copiado para a área de transferência!");
    } catch {
      // fallback
    }
  };

  // Filtro completo com todos os filtros + tipo do usuário
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

  // Função para avançar o visibleCount seguindo 3 -> 7 -> 10 -> 15 -> 20 -> ...
  const showMore = () => {
    const thresholds = [3, 7, 10, 15, 20, 30, 50]; // você pode ajustar sequencia
    const current = visibleCount;
    // encontra próximo threshold maior que o atual
    const next = thresholds.find((t) => t > current);
    if (next) {
      setVisibleCount(next);
    } else {
      // se passou todos thresholds, aumenta de 10 em 10
      setVisibleCount(current + 10);
    }
  };

  return (
    <div className="space-y-6 p-4">
      {/* FILTROS */}
      <div className="w-full space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Buscar aviso..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent outline-none w-full text-sm"
            />
          </div>
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
            <Calendar className="w-4 h-4 text-zinc-400" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-transparent outline-none w-full text-sm"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Status */}
          <button onClick={() => setStatusFilter("all")} className={`px-4 py-2 rounded-xl text-sm ${statusFilter === "all" ? "bg-sky-600 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-300"}`}>Todos</button>
          <button onClick={() => setStatusFilter("unread")} className={`px-4 py-2 rounded-xl text-sm ${statusFilter === "unread" ? "bg-yellow-600 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-300"}`}>Não lidos</button>
          <button onClick={() => setStatusFilter("read")} className={`px-4 py-2 rounded-xl text-sm ${statusFilter === "read" ? "bg-green-600 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-300"}`}>Lidos</button>

          {/* Importância */}
          <button onClick={() => setImportanceFilter("all")} className={`px-4 py-2 rounded-xl text-sm ${importanceFilter === "all" ? "bg-sky-600 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-300"}`}>Todas Importâncias</button>
          <button onClick={() => setImportanceFilter("low")} className={`px-4 py-2 rounded-xl text-sm ${importanceFilter === "low" ? "bg-green-600 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-300"}`}>Baixa</button>
          <button onClick={() => setImportanceFilter("medium")} className={`px-4 py-2 rounded-xl text-sm ${importanceFilter === "medium" ? "bg-yellow-600 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-300"}`}>Média</button>
          <button onClick={() => setImportanceFilter("high")} className={`px-4 py-2 rounded-xl text-sm ${importanceFilter === "high" ? "bg-red-600 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-300"}`}>Alta</button>

          {/* Ativo/Inativo */}
          {user && (
            <button onClick={() => setShowInactive(!showInactive)} className={`px-4 py-2 rounded-xl text-sm ${showInactive ? "bg-yellow-600 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-300"}`}>
              {showInactive ? "Avisos Inativos" : "Avisos Ativos"}
            </button>
          )}
        </div>

        <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 transition px-4 py-2 rounded-xl text-sm font-medium mt-2">
          <Plus className="w-4 h-4" /> Novo Aviso
        </button>
      </div>

      {/* LISTA DE AVISOS */}
      <div className="grid gap-4 mt-4">
        {filtered.slice(0, visibleCount).map((item) => (
          <div key={item.id} className={`border border-zinc-800 rounded-xl p-4 transition ${!item.active ? "opacity-50 bg-zinc-900/40" : "bg-zinc-900"}`}>
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span className={`${typeConfig[item.type || "texto"].color} w-5 h-5 flex items-center justify-center rounded`}>
                    {typeConfig[item.type || "texto"].icon}
                  </span>
                  <span className="cursor-pointer select-text" onClick={() => copyToClipboard(item.title)}>{item.title}</span>
                  <span className={`${importanceColor[item.importance || "medium"]} w-3 h-3 rounded-full`} title={`Importância: ${item.importance || "medium"}`} />
                </h2>
                <p className="text-sm text-zinc-300 cursor-pointer select-text" onClick={() => copyToClipboard(item.description || "")}>{item.description}</p>
                <div className="flex flex-wrap gap-2 mt-1 items-center">
                  {item.link && (
                    <button className="flex items-center gap-1 text-sky-400 underline text-xs" onClick={() => copyToClipboard(item.link || "")}>
                      {typeConfig[item.type || "site"].icon} Copiar link
                    </button>
                  )}
                  <span className="text-zinc-500 text-xs cursor-pointer select-text">Criado por: {item.creatorEmail}</span>
                  <span className="text-zinc-500 text-xs">{formatDate(item.createdAt)}</span>
                  {item.target && <span className="text-zinc-400 text-xs">[{item.target}]</span>}
                </div>
              </div>

              <div className="flex gap-2">
                {!item.readBy?.includes(user?.email || "") && item.active && (
                  <button onClick={() => handleMarkAsRead(item)} className="text-green-400 hover:text-green-300" title="Marcar como lido">
                    <CheckCircle className="w-5 h-5" />
                  </button>
                )}

                {item.readBy?.includes(user?.email || "") && item.active && (
                  <button onClick={() => handleMarkAsUnread(item)} className="text-yellow-400 hover:text-yellow-300" title="Marcar como não lido">
                    <CheckCircle className="w-5 h-5" />
                  </button>
                )}

                {item.creatorEmail === user?.email && (
                  <>
                    {item.active ? (
                      <>
                        <button onClick={() => {
                          setEditId(item.id);
                          setEditTitle(item.title);
                          setEditDescription(item.description || "");
                          setEditLink(item.link || "");
                          setEditType(item.type || "texto");
                          setEditImportance(item.importance || "medium");
                          setEditTarget(item.target || "todos");
                          setIsEditing(true);
                        }} className="text-sky-400 hover:text-sky-300" title="Editar aviso">
                          <Edit3 className="w-5 h-5" />
                        </button>
                        <button onClick={() => handleToggleActive(item)} className="text-yellow-400 hover:text-yellow-300" title="Inativar aviso">
                          <Slash className="w-5 h-5" />
                        </button>
                        <button onClick={() => confirmDelete(item.id)} className="text-red-400 hover:text-red-300" title="Deletar aviso">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </>
                    ) : (
                      <button onClick={() => handleToggleActive(item)} className="text-green-400 hover:text-green-300" title="Reativar aviso">
                        <RefreshCcw className="w-5 h-5" />
                      </button>
                    )}

                    <button onClick={() => handleOpenReadModal(item.readBy)} className="text-zinc-400 hover:text-zinc-300" title="Ver lidos">
                      <User className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* BOTÃO MOSTRAR MAIS (aparece só se houver mais itens filtrados) */}
      {visibleCount < filtered.length && (
        <div className="flex justify-center">
          <button
            onClick={showMore}
            className="mt-4 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-sm text-white"
          >
            Mostrar mais ({Math.min(filtered.length, (() => {
              // só para mostrar número que vai ficar visível ao clicar
              const thresholds = [3, 7, 10, 15, 20, 30, 50];
              const next = thresholds.find((t) => t > visibleCount);
              return next ?? visibleCount + 10;
            })())})
          </button>
        </div>
      )}

      {/* Se não houver resultados */}
      {filtered.length === 0 && (
        <div className="text-zinc-400 text-sm mt-4">Nenhum aviso encontrado com os filtros selecionados.</div>
      )}

      {/* MODAIS */}

      {/* Adicionar aviso */}
      <Dialog open={isAdding} onClose={() => setIsAdding(false)} className="fixed inset-0 z-50 flex items-center justify-center">
        <Dialog.Panel className="bg-zinc-900 p-6 rounded-xl w-full max-w-md space-y-4">
          <Dialog.Title className="text-lg font-semibold">Novo Aviso</Dialog.Title>
          <input type="text" placeholder="Título" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full p-2 rounded bg-zinc-800 text-white" />
          <textarea placeholder="Descrição" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className="w-full p-2 rounded bg-zinc-800 text-white" />
          <input type="text" placeholder="Link" value={newLink} onChange={(e) => setNewLink(e.target.value)} className="w-full p-2 rounded bg-zinc-800 text-white" />

          <div className="flex gap-2 flex-wrap">
            <select value={newType} onChange={(e) => setNewType(e.target.value as Notice["type"])} className="p-2 rounded bg-zinc-800 text-white">
              <option value="texto">Texto</option>
              <option value="pdf">PDF</option>
              <option value="word">Word</option>
              <option value="excel">Excel</option>
              <option value="site">Site</option>
            </select>
            <select value={newImportance} onChange={(e) => setNewImportance(e.target.value as Notice["importance"])} className="p-2 rounded bg-zinc-800 text-white">
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
            <select value={newTarget} onChange={(e) => setNewTarget(e.target.value as Notice["target"])} className="p-2 rounded bg-zinc-800 text-white">
              <option value="todos">Todos</option>
              <option value="analise">Análise</option>
              <option value="desenvolvimento">Desenvolvimento</option>
              <option value="lideranca">Liderança</option>
              <option value="sustentacao">Sustentação</option>
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setIsAdding(false)} className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600">Cancelar</button>
            <button onClick={handleAdd} className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-700">Salvar</button>
          </div>
        </Dialog.Panel>
      </Dialog>

      {/* Editar aviso */}
      <Dialog open={isEditing} onClose={() => setIsEditing(false)} className="fixed inset-0 z-50 flex items-center justify-center">
        <Dialog.Panel className="bg-zinc-900 p-6 rounded-xl w-full max-w-md space-y-4">
          <Dialog.Title className="text-lg font-semibold">Editar Aviso</Dialog.Title>
          <input type="text" placeholder="Título" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full p-2 rounded bg-zinc-800 text-white" />
          <textarea placeholder="Descrição" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="w-full p-2 rounded bg-zinc-800 text-white" />
          <input type="text" placeholder="Link" value={editLink} onChange={(e) => setEditLink(e.target.value)} className="w-full p-2 rounded bg-zinc-800 text-white" />

          <div className="flex gap-2 flex-wrap">
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
            <select value={editTarget} onChange={(e) => setEditTarget(e.target.value as Notice["target"])} className="p-2 rounded bg-zinc-800 text-white">
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
      </Dialog>

      {/* Deletar aviso */}
      <Dialog open={isDeleting} onClose={() => setIsDeleting(false)} className="fixed inset-0 z-50 flex items-center justify-center">
        <Dialog.Panel className="bg-zinc-900 p-6 rounded-xl w-full max-w-md space-y-4">
          <Dialog.Title className="text-lg font-semibold">Confirmação</Dialog.Title>
          <p>Tem certeza que deseja deletar este aviso?</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setIsDeleting(false)} className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600">Cancelar</button>
            <button onClick={handleDelete} className="px-4 py-2 rounded bg-red-600 hover:bg-red-700">Deletar</button>
          </div>
        </Dialog.Panel>
      </Dialog>

      {/* Modal lidos */}
      <Dialog open={readModalOpen} onClose={() => setReadModalOpen(false)} className="fixed inset-0 z-50 flex items-center justify-center">
        <Dialog.Panel className="bg-zinc-900 p-6 rounded-xl w-full max-w-md space-y-4">
          <Dialog.Title className="text-lg font-semibold">Usuários que leram</Dialog.Title>
          <div className="max-h-64 overflow-y-auto">
            {readList.map((email, idx) => (
              <p key={idx} className="text-sm text-zinc-300">{email}</p>
            ))}
          </div>
          <div className="flex justify-end">
            <button onClick={() => setReadModalOpen(false)} className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600">Fechar</button>
          </div>
        </Dialog.Panel>
      </Dialog>
    </div>
  );
};

export default withAuth(NoticesPage);
