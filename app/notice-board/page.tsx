"use client";

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
  startAfter,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "../../firebase";

import {
  Search,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  CheckCircle,
  FileText,
  Globe,
  FileCode,
  File,
} from "lucide-react";

import { Dialog } from "@headlessui/react";

// Tipagem de aviso
interface Notice {
  id: string;
  title: string;
  description?: string;
  link?: string;
  read: boolean;
  createdAt: number;
  readAt?: number;
}

const NoticesPage = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [search, setSearch] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read">("all");

  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newLink, setNewLink] = useState("");

  const [editId, setEditId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editLink, setEditLink] = useState("");

  const [lastVisible, setLastVisible] = useState<any>(null);
  const [isLastPage, setIsLastPage] = useState(false);

  const PAGE_SIZE = 10;

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR");
  };

  const getIconByLink = (url?: string) => {
    if (!url) return null;
    const lower = url.toLowerCase();
    if (lower.endsWith(".pdf")) return <FileText className="w-4 h-4" />;
    if (lower.endsWith(".doc") || lower.endsWith(".docx")) return <File className="w-4 h-4" />;
    if (lower.endsWith(".txt")) return <FileCode className="w-4 h-4" />;
    if (lower.startsWith("http")) return <Globe className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const loadPage = useCallback(
    async (mode: "first" | "next" = "first") => {
      const constraints: QueryConstraint[] = [orderBy("createdAt", "desc")];
      if (mode === "next" && lastVisible) {
        constraints.push(startAfter(lastVisible));
      }

      const q = query(collection(db, "notices"), limit(PAGE_SIZE), ...constraints);
      const snap = await getDocs(q);

      if (snap.empty) {
        if (mode === "first") setNotices([]);
        setIsLastPage(true);
        return;
      }

      const loaded: Notice[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title,
          description: data.description || "",
          link: data.link || "",
          read: data.read || false,
          createdAt: data.createdAt || Date.now(),
          readAt: data.readAt,
        };
      });

      // Ordena: não lidos primeiro
      const sorted = [...loaded.filter((n) => !n.read), ...loaded.filter((n) => n.read)];

      if (mode === "first") setNotices(sorted);
      else setNotices((prev) => [...prev, ...sorted]);

      setLastVisible(snap.docs[snap.docs.length - 1]);
      setIsLastPage(snap.docs.length < PAGE_SIZE);
    },
    [lastVisible]
  );

  useEffect(() => {
    void loadPage("first");
  }, [loadPage]);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;

    await addDoc(collection(db, "notices"), {
      title: newTitle,
      description: newDescription,
      link: newLink,
      read: false,
      createdAt: Date.now(),
    });

    setNewTitle("");
    setNewDescription("");
    setNewLink("");
    setIsAdding(false);
    void loadPage("first");
  };

  const handleEdit = async () => {
    await updateDoc(doc(db, "notices", editId), {
      title: editTitle,
      description: editDescription,
      link: editLink,
    });

    setIsEditing(false);
    void loadPage("first");
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "notices", id));
    void loadPage("first");
  };

  const handleMarkAsRead = async (id: string) => {
    await updateDoc(doc(db, "notices", id), {
      read: true,
      readAt: Date.now(),
    });

    void loadPage("first");
  };

  const filtered = notices.filter((n) => {
    const s = search.toLowerCase();
    const matchesSearch = n.title.toLowerCase().includes(s) || n.description?.toLowerCase().includes(s);

    const matchesDate = filterDate ? new Date(n.createdAt).toISOString().split("T")[0] === filterDate : true;

    const matchesStatus =
      statusFilter === "all" ? true : statusFilter === "unread" ? !n.read : n.read;

    return matchesSearch && matchesDate && matchesStatus;
  });

  return (
    <div className="space-y-6">
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

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-4 py-2 rounded-xl text-sm ${
                statusFilter === "all" ? "bg-sky-600 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-300"
              }`}
            >
              Todos
            </button>

            <button
              onClick={() => setStatusFilter("unread")}
              className={`px-4 py-2 rounded-xl text-sm ${
                statusFilter === "unread" ? "bg-yellow-600 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-300"
              }`}
            >
              Não lidos
            </button>

            <button
              onClick={() => setStatusFilter("read")}
              className={`px-4 py-2 rounded-xl text-sm ${
                statusFilter === "read" ? "bg-green-600 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-300"
              }`}
            >
              Lidos
            </button>
          </div>

          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 transition px-4 py-2 rounded-xl text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Novo Aviso
          </button>
        </div>
      </div>

      {/* LISTA DE AVISOS */}
      <div className="grid gap-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className={`border border-zinc-800 rounded-xl p-4 transition ${
              item.read ? "opacity-50 bg-zinc-900/40" : "bg-zinc-900"
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">{item.title}</h2>
                <p className="text-sm text-zinc-300">{item.description}</p>
              </div>

              <div className="flex gap-2">
                {!item.read && (
                  <button onClick={() => handleMarkAsRead(item.id)} className="text-green-400 hover:text-green-300">
                    <CheckCircle className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setEditId(item.id);
                    setEditTitle(item.title);
                    setEditDescription(item.description || "");
                    setEditLink(item.link || "");
                    setIsEditing(true);
                  }}
                  className="text-sky-400 hover:text-sky-300"
                >
                  <Edit3 className="w-5 h-5" />
                </button>
                <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-300">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-3">
              {item.link && (
                <a className="flex items-center gap-1 text-sky-400 underline text-sm" href={item.link} target="_blank">
                  {getIconByLink(item.link)}
                  Abrir link
                </a>
              )}

              <span className="text-zinc-500 text-xs">Criado: {formatDate(item.createdAt)}</span>

              {item.read && item.readAt && (
                <span className="text-green-400 text-xs flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Lido em: {formatDate(item.readAt)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {!isLastPage && (
        <div className="text-center">
          <button onClick={() => loadPage("next")} className="px-4 py-2 bg-zinc-800 rounded-xl hover:bg-zinc-700">
            Carregar mais
          </button>
        </div>
      )}

      {/* MODAL ADICIONAR */}
      <Dialog open={isAdding} onClose={() => setIsAdding(false)}>
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-zinc-900 p-6 rounded-xl w-full max-w-md space-y-3">
            <h2 className="text-xl font-semibold">Novo Aviso</h2>
            <input
              className="w-full p-2 rounded bg-zinc-800"
              placeholder="Título"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <textarea
              className="w-full p-2 rounded bg-zinc-800"
              placeholder="Descrição"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
            />
            <input
              className="w-full p-2 rounded bg-zinc-800"
              placeholder="Link (opcional)"
              value={newLink}
              onChange={(e) => setNewLink(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 bg-zinc-700 rounded" onClick={() => setIsAdding(false)}>
                Cancelar
              </button>
              <button className="px-4 py-2 bg-sky-600 rounded" onClick={handleAdd}>
                Criar
              </button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* MODAL EDITAR */}
      <Dialog open={isEditing} onClose={() => setIsEditing(false)}>
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-zinc-900 p-6 rounded-xl w-full max-w-md space-y-3">
            <h2 className="text-xl font-semibold">Editar Aviso</h2>
            <input
              className="w-full p-2 rounded bg-zinc-800"
              placeholder="Título"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />
            <textarea
              className="w-full p-2 rounded bg-zinc-800"
              placeholder="Descrição"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />
            <input
              className="w-full p-2 rounded bg-zinc-800"
              placeholder="Link"
              value={editLink}
              onChange={(e) => setEditLink(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button className="px-4 py-2 bg-zinc-700 rounded" onClick={() => setIsEditing(false)}>
                Cancelar
              </button>
              <button className="px-4 py-2 bg-sky-600 rounded" onClick={handleEdit}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default withAuth(NoticesPage);
