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
  where,
  orderBy,
  Timestamp,
  arrayUnion,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { Dialog } from "@headlessui/react";
import {
  Plus,
  Trash2,
  Edit3,
  X,
  GripVertical,
  MoreVertical,
  AlertCircle,
  MessageSquare,
  CheckSquare2,
  Calendar,
  Tag,
  Users,
  Paperclip,
  FileText,
  Clock,
  Send,
  ChevronDown,
  Copy,
} from "./icons";

interface TrelloColumn {
  id: string;
  name: string;
  color: string;
}

interface Checklist {
  id: string;
  title: string;
  items: ChecklistItem[];
}

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface Label {
  id: string;
  text: string;
  color: string; // 'red', 'blue', 'green', 'yellow', 'purple', 'orange'
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
}

interface TrelloCard {
  id: string;
  title: string;
  description?: string;
  columnId: string;
  trelloId: string;
  priority?: "low" | "medium" | "high";
  order: number;
  checklists?: Checklist[];
  labels?: Label[];
  assignedTo?: string[];
  dueDate?: number; // timestamp
  comments?: Comment[];
  attachments?: string[];
  createdAt?: number;
  updatedAt?: number;
}

interface Trello {
  id: string;
  title: string;
  description?: string;
  columns: TrelloColumn[];
  labels?: Label[];
  createdBy: string;
  createdAt: number;
  updatedAt: number;
}

const TrelloPage = () => {
  const user = auth.currentUser;

  const [trellos, setTrellos] = useState<Trello[]>([]);
  const [trelloCards, setTrelloCards] = useState<TrelloCard[]>([]);
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<string | null>(null);
  const [filterLabel, setFilterLabel] = useState<string | null>(null);
  const [filterOverdue, setFilterOverdue] = useState(false);

  // Modal states
  const [showNewTrello, setShowNewTrello] = useState(false);
  const [showTrelloDetail, setShowTrelloDetail] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCardDetail, setShowCardDetail] = useState(false);
  const [showNewCard, setShowNewCard] = useState(false);

  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newColumnId, setNewColumnId] = useState("");

  const [deleteId, setDeleteId] = useState("");
  const [selectedTrello, setSelectedTrello] = useState<Trello | null>(null);
  const [selectedCard, setSelectedCard] = useState<TrelloCard | null>(null);

  // Drag and drop
  const [draggedCard, setDraggedCard] = useState<TrelloCard | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  // Card edit form
  const [cardTitle, setCardTitle] = useState("");
  const [cardDescription, setCardDescription] = useState("");
  const [cardPriority, setCardPriority] = useState<"low" | "medium" | "high">("medium");
  const [cardDueDate, setCardDueDate] = useState("");
  const [cardLabels, setCardLabels] = useState<Label[]>([]);
  const [cardAssignedTo, setCardAssignedTo] = useState<string[]>([]);
  const [cardChecklists, setCardChecklists] = useState<Checklist[]>([]);
  const [cardComments, setCardComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");

  // Available labels
  const defaultLabels: Label[] = [
    { id: "1", text: "Bug", color: "red" },
    { id: "2", text: "Feature", color: "blue" },
    { id: "3", text: "Documentation", color: "green" },
    { id: "4", text: "Urgent", color: "orange" },
    { id: "5", text: "Review", color: "purple" },
    { id: "6", text: "Testing", color: "yellow" },
  ];

  // Fetch trellos
  const fetchTrellos = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, "trellos"),
        where("createdBy", "==", user.uid),
        orderBy("updatedAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const data: Trello[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Trello);
      });
      setTrellos(data);
    } catch (error) {
      console.error("Erro ao buscar trellos:", error);
    }
  }, [user]);

  // Fetch trello cards
  const fetchTrelloCards = useCallback(async (trelloId?: string) => {
    if (!user) return;
    try {
      const q = query(
        collection(db, "trello_cards"),
        where("trelloId", "==", trelloId || selectedTrello?.id || ""),
        orderBy("order", "asc")
      );
      const querySnapshot = await getDocs(q);
      const data: TrelloCard[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as TrelloCard);
      });
      setTrelloCards(data);
    } catch (error) {
      console.error("Erro ao buscar cards:", error);
    }
  }, [user, selectedTrello?.id]);

  useEffect(() => {
    fetchTrellos();
  }, [fetchTrellos]);

  useEffect(() => {
    if (selectedTrello) {
      fetchTrelloCards(selectedTrello.id);
    }
  }, [selectedTrello, fetchTrelloCards]);

  // Create trello
  const handleCreateTrello = async () => {
    if (!user || !newTitle) return;

    try {
      const defaultColumns: TrelloColumn[] = [
        { id: "todo", name: "A Fazer", color: "bg-red-500" },
        { id: "in-progress", name: "Em Andamento", color: "bg-yellow-500" },
        { id: "review", name: "Revisão", color: "bg-blue-500" },
        { id: "done", name: "Concluído", color: "bg-green-500" },
      ];

      await addDoc(collection(db, "trellos"), {
        title: newTitle,
        description: newDescription,
        columns: defaultColumns,
        labels: defaultLabels,
        createdBy: user.uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      setNewTitle("");
      setNewDescription("");
      setShowNewTrello(false);
      fetchTrellos();
    } catch (error) {
      console.error("Erro ao criar trello:", error);
      alert("Erro ao criar trello");
    }
  };

  // Add card
  const handleAddCard = async (columnId: string) => {
    if (!selectedTrello || !cardTitle) return;

    const cardsInColumn = trelloCards.filter((c) => c.columnId === columnId);
    const order = Math.max(...cardsInColumn.map((c) => c.order), -1) + 1;

    try {
      await addDoc(collection(db, "trello_cards"), {
        title: cardTitle,
        description: cardDescription,
        columnId,
        trelloId: selectedTrello.id,
        priority: cardPriority,
        order,
        dueDate: cardDueDate ? new Date(cardDueDate).getTime() : undefined,
        labels: cardLabels,
        assignedTo: cardAssignedTo,
        checklists: cardChecklists,
        comments: [],
        attachments: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      setCardTitle("");
      setCardDescription("");
      setCardPriority("medium");
      setCardDueDate("");
      setCardLabels([]);
      setCardAssignedTo([]);
      setCardChecklists([]);
      setShowNewCard(false);
      fetchTrelloCards(selectedTrello.id);
    } catch (error) {
      console.error("Erro ao adicionar card:", error);
    }
  };

  // Update card
  const handleUpdateCard = async () => {
    if (!selectedCard) return;

    try {
      await updateDoc(doc(db, "trello_cards", selectedCard.id), {
        title: cardTitle,
        description: cardDescription,
        priority: cardPriority,
        dueDate: cardDueDate ? new Date(cardDueDate).getTime() : undefined,
        labels: cardLabels,
        assignedTo: cardAssignedTo,
        checklists: cardChecklists,
        comments: cardComments,
        updatedAt: Date.now(),
      });

      fetchTrelloCards(selectedTrello?.id);
      setShowCardDetail(false);
      setSelectedCard(null);
    } catch (error) {
      console.error("Erro ao atualizar card:", error);
    }
  };

  // Delete card
  const handleDeleteCard = async (cardId: string) => {
    try {
      await deleteDoc(doc(db, "trello_cards", cardId));
      fetchTrelloCards(selectedTrello?.id);
    } catch (error) {
      console.error("Erro ao deletar card:", error);
    }
  };

  // Delete trello
  const handleDeleteTrello = async () => {
    if (!deleteId) return;

    try {
      const cardsToDelete = trelloCards.filter((c) => c.trelloId === deleteId);
      for (const card of cardsToDelete) {
        await deleteDoc(doc(db, "trello_cards", card.id));
      }

      await deleteDoc(doc(db, "trellos", deleteId));
      setShowDeleteConfirm(false);
      setDeleteId("");
      setShowTrelloDetail(false);
      setSelectedTrello(null);
      fetchTrellos();
    } catch (error) {
      console.error("Erro ao deletar trello:", error);
      alert("Erro ao deletar trello");
    }
  };

  // Move card
  const handleMoveCard = async (card: TrelloCard, columnId: string) => {
    if (!selectedTrello) return;

    const cardsInColumn = trelloCards.filter((c) => c.columnId === columnId);
    const order = Math.max(...cardsInColumn.map((c) => c.order), -1) + 1;

    try {
      await updateDoc(doc(db, "trello_cards", card.id), {
        columnId,
        order,
        updatedAt: Date.now(),
      });
      fetchTrelloCards(selectedTrello.id);
    } catch (error) {
      console.error("Erro ao mover card:", error);
    }
  };

  // Add comment
  const handleAddComment = async () => {
    if (!commentText || !selectedCard) return;

    const newComment: Comment = {
      id: Math.random().toString(36).substr(2, 9),
      userId: user?.uid || "",
      userName: user?.displayName || "Anônimo",
      text: commentText,
      createdAt: Date.now(),
    };

    try {
      await updateDoc(doc(db, "trello_cards", selectedCard.id), {
        comments: arrayUnion(newComment),
      });

      setCardComments([...cardComments, newComment]);
      setCommentText("");
      fetchTrelloCards(selectedTrello?.id);
    } catch (error) {
      console.error("Erro ao adicionar comentário:", error);
    }
  };

  // Open card detail
  const openCardDetail = (card: TrelloCard) => {
    setSelectedCard(card);
    setCardTitle(card.title);
    setCardDescription(card.description || "");
    setCardPriority(card.priority || "medium");
    setCardDueDate(card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : "");
    setCardLabels(card.labels || []);
    setCardAssignedTo(card.assignedTo || []);
    setCardChecklists(card.checklists || []);
    setCardComments(card.comments || []);
    setShowCardDetail(true);
  };

  // Filter trellos
  const filteredTrellos = trellos.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  // Filter cards by criteria
  const getFilteredCards = (cards: TrelloCard[]) => {
    return cards.filter((card) => {
      if (filterPriority && card.priority !== filterPriority) return false;
      if (filterLabel && !card.labels?.some((l) => l.id === filterLabel)) return false;
      if (filterOverdue && !isOverdue(card.dueDate)) return false;
      return true;
    });
  };

  // Helper functions
  const getLabelColor = (color: string) => {
    const colors: { [key: string]: string } = {
      red: "bg-red-500/20 text-red-400 border-red-500/50",
      blue: "bg-blue-500/20 text-blue-400 border-blue-500/50",
      green: "bg-green-500/20 text-green-400 border-green-500/50",
      yellow: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
      purple: "bg-purple-500/20 text-purple-400 border-purple-500/50",
      orange: "bg-orange-500/20 text-orange-400 border-orange-500/50",
    };
    return colors[color] || colors.blue;
  };

  const getLabelBgColor = (color: string) => {
    const colors: { [key: string]: string } = {
      red: "bg-red-500",
      blue: "bg-blue-500",
      green: "bg-green-500",
      yellow: "bg-yellow-400",
      purple: "bg-purple-500",
      orange: "bg-orange-500",
    };
    return colors[color] || colors.blue;
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleDateString("pt-BR");
  };

  const isOverdue = (dueDate?: number) => {
    if (!dueDate) return false;
    return dueDate < Date.now();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 to-zinc-900 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white flex items-center gap-3">
              � Trello
            </h1>
            <p className="text-zinc-400 mt-2">Organize suas tarefas: arraste, etiquete, comente e colabore</p>
          </div>
          <button
            onClick={() => setShowNewTrello(true)}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-lg transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            Novo Quadro
          </button>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 space-y-4">
          <div>
            <input
              type="text"
              placeholder="Buscar quadros..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500"
            />
          </div>
          
          {/* Card Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-2 block">Filtrar por Prioridade</label>
              <select
                value={filterPriority || ""}
                onChange={(e) => setFilterPriority(e.target.value || null)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-sky-500"
              >
                <option value="">Todas as prioridades</option>
                <option value="low">🟢 Baixa</option>
                <option value="medium">🟡 Média</option>
                <option value="high">🔴 Alta</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-2 block">Filtrar por Etiqueta</label>
              <select
                value={filterLabel || ""}
                onChange={(e) => setFilterLabel(e.target.value || null)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm focus:outline-none focus:border-sky-500"
              >
                <option value="">Todas as etiquetas</option>
                {defaultLabels.map((label) => (
                  <option key={label.id} value={label.id}>
                    {label.text}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="text-xs font-medium text-zinc-400 mb-2 block">Vencimento</label>
              <button
                onClick={() => setFilterOverdue(!filterOverdue)}
                className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterOverdue
                    ? "bg-red-500/20 text-red-400 border border-red-500/50"
                    : "bg-zinc-800 border border-zinc-700 text-zinc-300 hover:border-sky-500"
                }`}
              >
                {filterOverdue ? "⏰ Vencidos" : "Todos"}
              </button>
            </div>
          </div>
        </div>

        {/* Trellos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTrellos.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <AlertCircle className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
              <p className="text-zinc-400">Nenhum quadro encontrado</p>
              <p className="text-sm text-zinc-500 mt-2">Crie seu primeiro quadro para começar</p>
            </div>
          ) : (
            filteredTrellos.map((trello) => (
              <div
                key={trello.id}
                className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6 hover:border-sky-500/50 transition-colors cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white truncate">
                      {trello.title}
                    </h3>
                    {trello.description && (
                      <p className="text-sm text-zinc-400 line-clamp-2 mt-2">
                        {trello.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId(trello.id);
                        setShowDeleteConfirm(true);
                      }}
                      className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {trello.columns.map((col) => (
                    <div
                      key={col.id}
                      className="flex items-center gap-2 text-sm text-zinc-300"
                    >
                      <div className={`w-2 h-2 rounded-full ${col.color}`}></div>
                      {col.name}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    setSelectedTrello(trello);
                    setShowTrelloDetail(true);
                  }}
                  className="w-full px-4 py-2 bg-sky-500/20 text-sky-400 rounded-lg hover:bg-sky-500/30 transition-colors text-sm font-medium"
                >
                  → Abrir Quadro
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* New Trello Modal */}
      <Dialog
        open={showNewTrello}
        onClose={() => setShowNewTrello(false)}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      >
        <Dialog.Panel className="bg-zinc-800 rounded-lg max-w-md w-full border border-zinc-700 shadow-2xl">
          <div className="flex items-center justify-between gap-4 p-6 border-b border-zinc-700">
            <Dialog.Title className="text-xl font-bold text-white">
              Novo Quadro Trello
            </Dialog.Title>
            <button
              onClick={() => setShowNewTrello(false)}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Título
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Sprint 25"
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Descrição (opcional)
              </label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Descreva o propósito deste quadro"
                rows={4}
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 p-6 border-t border-zinc-700">
            <button
              onClick={() => setShowNewTrello(false)}
              className="flex-1 px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateTrello}
              className="flex-1 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors disabled:opacity-50"
              disabled={!newTitle}
            >
              Criar Quadro
            </button>
          </div>
        </Dialog.Panel>
      </Dialog>

      {/* Trello Detail Modal */}
      <Dialog
        open={showTrelloDetail}
        onClose={() => setShowTrelloDetail(false)}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      >
        <Dialog.Panel className="bg-zinc-800 rounded-lg w-full max-w-7xl max-h-[90vh] border border-zinc-700 shadow-2xl flex flex-col">
          <div className="flex items-center justify-between gap-4 p-6 border-b border-zinc-700">
            <Dialog.Title className="text-2xl font-bold text-white">
              {selectedTrello?.title}
            </Dialog.Title>
            <button
              onClick={() => {
                setShowTrelloDetail(false);
                setSelectedTrello(null);
              }}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Trello Board */}
          <div className="flex-1 overflow-x-auto p-6">
            <div className="flex gap-6 min-w-max">
              {selectedTrello?.columns.map((column) => (
                <div
                  key={column.id}
                  className={`flex flex-col bg-zinc-900/50 rounded-lg border transition-all w-[260px] sm:w-72 md:w-80 lg:w-96 ${
                    dragOverColumnId === column.id
                      ? "border-sky-500 bg-sky-500/10 shadow-lg"
                      : "border-zinc-700"
                  }`}
                >
                  {/* Column Header */}
                  <div className="p-4 border-b border-zinc-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${column.color}`}></div>
                      <h4 className="font-semibold text-white">{column.name}</h4>
                    </div>
                    <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded">
                      {trelloCards.filter((c) => c.columnId === column.id).length}
                    </span>
                  </div>

                  {/* Cards Container */}
                  <div className="flex-1 p-4 space-y-3 overflow-y-auto max-h-[calc(90vh-12rem)]">
                    {trelloCards
                      .filter((c) => c.columnId === column.id)
                      .sort((a, b) => a.order - b.order)
                      .map((card) => (
                        <div
                          key={card.id}
                          draggable
                          onDragStart={() => setDraggedCard(card)}
                          onDragEnd={() => {
                            setDraggedCard(null);
                            setDragOverColumnId(null);
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setDragOverColumnId(column.id);
                          }}
                          onDragLeave={() => setDragOverColumnId(null)}
                          onDrop={() => {
                            if (draggedCard && draggedCard.id !== card.id) {
                              handleMoveCard(draggedCard, column.id);
                            }
                            setDragOverColumnId(null);
                          }}
                          onClick={() => openCardDetail(card)}
                          className={`bg-zinc-700 border transition-all cursor-grab active:cursor-grabbing group hover:shadow-lg rounded-lg p-4 ${
                            draggedCard?.id === card.id
                              ? "opacity-50 border-sky-500/50"
                              : isOverdue(card.dueDate)
                              ? "border-red-500/50 hover:border-sky-500"
                              : "border-zinc-600 hover:border-sky-500"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <GripVertical className="w-4 h-4 text-zinc-400 mt-1 flex-shrink-0 opacity-0 group-hover:opacity-100" />
                            <p className="text-white font-medium flex-1 break-words">
                              {card.title}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCard(card.id);
                              }}
                              className="text-red-400 hover:bg-red-500/20 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {card.description && (
                            <p className="text-xs text-zinc-400 mb-3 line-clamp-2">
                              {card.description}
                            </p>
                          )}

                          {/* Card Bottom Info */}
                          <div className="space-y-2">
                            {/* Labels */}
                            {card.labels && card.labels.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {card.labels.map((label) => (
                                  <span
                                    key={label.id}
                                    className={`text-xs px-2 py-1 rounded font-medium border ${getLabelColor(label.color)}`}
                                  >
                                    {label.text}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Due Date & Priority */}
                            <div className="flex items-center gap-2 flex-wrap">
                              {card.priority && (
                                <span
                                  className={`text-xs px-2 py-1 rounded font-medium ${
                                    card.priority === "high"
                                      ? "bg-red-500/20 text-red-400"
                                      : card.priority === "medium"
                                      ? "bg-yellow-500/20 text-yellow-400"
                                      : "bg-green-500/20 text-green-400"
                                  }`}
                                >
                                  {card.priority === "high"
                                    ? "🔴 Alta"
                                    : card.priority === "medium"
                                    ? "🟡 Média"
                                    : "🟢 Baixa"}
                                </span>
                              )}
                              {card.dueDate && (
                                <span
                                  className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                                    isOverdue(card.dueDate)
                                      ? "bg-red-500/20 text-red-400"
                                      : "bg-blue-500/20 text-blue-400"
                                  }`}
                                >
                                  🗓️ {formatDate(card.dueDate)}
                                </span>
                              )}
                            </div>

                            {/* Card Meta */}
                            <div className="flex items-center gap-2 text-xs text-zinc-400">
                              {card.comments && card.comments.length > 0 && (
                                <span className="flex items-center gap-1">
                                  💬 {card.comments.length}
                                </span>
                              )}
                              {card.checklists && card.checklists.length > 0 && (
                                <span className="flex items-center gap-1">
                                  ✓ {card.checklists.reduce((acc, cl) => acc + cl.items.filter(i => i.completed).length, 0)}/{card.checklists.reduce((acc, cl) => acc + cl.items.length, 0)}
                                </span>
                              )}
                              {card.attachments && card.attachments.length > 0 && (
                                <span className="flex items-center gap-1">
                                  📎 {card.attachments.length}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}

                    {/* Add Card Button */}
                    <button
                      onClick={() => {
                        setNewColumnId(column.id);
                        setShowNewCard(true);
                      }}
                      className="w-full px-4 py-2 text-zinc-400 hover:text-white hover:bg-zinc-600 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Card
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-zinc-700 flex gap-3 justify-end">
            <button
              onClick={() => {
                setShowTrelloDetail(false);
                setSelectedTrello(null);
              }}
              className="px-6 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
            >
              Fechar
            </button>
          </div>
        </Dialog.Panel>
      </Dialog>

      {/* New Card Modal */}
      <Dialog
        open={showNewCard}
        onClose={() => setShowNewCard(false)}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      >
        <Dialog.Panel className="bg-zinc-800 rounded-lg max-w-md w-full border border-zinc-700 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between gap-4 p-6 border-b border-zinc-700 sticky top-0 bg-zinc-800">
            <Dialog.Title className="text-xl font-bold text-white">
              Novo Cartão
            </Dialog.Title>
            <button
              onClick={() => setShowNewCard(false)}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Título *
              </label>
              <input
                type="text"
                value={cardTitle}
                onChange={(e) => setCardTitle(e.target.value)}
                placeholder="Título do cartão"
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Descrição
              </label>
              <textarea
                value={cardDescription}
                onChange={(e) => setCardDescription(e.target.value)}
                placeholder="Descreva detalhes..."
                rows={3}
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Prioridade
              </label>
              <select
                value={cardPriority}
                onChange={(e) => setCardPriority(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-sky-500"
              >
                <option value="low">🟢 Baixa</option>
                <option value="medium">🟡 Média</option>
                <option value="high">🔴 Alta</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Data de Vencimento
              </label>
              <input
                type="date"
                value={cardDueDate}
                onChange={(e) => setCardDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Etiquetas
              </label>
              <div className="space-y-2 bg-zinc-700/50 p-3 rounded-lg max-h-40 overflow-y-auto">
                {defaultLabels.map((label) => (
                  <button
                    key={label.id}
                    onClick={() => {
                      const isSelected = cardLabels.some(l => l.id === label.id);
                      if (isSelected) {
                        setCardLabels(cardLabels.filter(l => l.id !== label.id));
                      } else {
                        setCardLabels([...cardLabels, label]);
                      }
                    }}
                    className={`block w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      cardLabels.some(l => l.id === label.id)
                        ? getLabelColor(label.color)
                        : "text-zinc-300 hover:bg-zinc-600"
                    }`}
                  >
                    {cardLabels.some(l => l.id === label.id) && "✓ "}{label.text}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 p-6 border-t border-zinc-700 sticky bottom-0 bg-zinc-800">
            <button
              onClick={() => setShowNewCard(false)}
              className="flex-1 px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => handleAddCard(newColumnId)}
              className="flex-1 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors disabled:opacity-50"
              disabled={!cardTitle}
            >
              Criar Cartão
            </button>
          </div>
        </Dialog.Panel>
      </Dialog>

      {/* Card Detail Modal */}
      <Dialog
        open={showCardDetail}
        onClose={() => setShowCardDetail(false)}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      >
        <Dialog.Panel className="bg-zinc-800 rounded-lg w-full max-w-2xl border border-zinc-700 shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between gap-4 p-6 border-b border-zinc-700 sticky top-0 bg-zinc-800">
            <Dialog.Title className="text-xl font-bold text-white">
              Detalhes do Cartão
            </Dialog.Title>
            <button
              onClick={() => setShowCardDetail(false)}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Título
              </label>
              <input
                type="text"
                value={cardTitle}
                onChange={(e) => setCardTitle(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Descrição
              </label>
              <textarea
                value={cardDescription}
                onChange={(e) => setCardDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-sky-500 resize-none"
              />
            </div>

            {/* Priority & Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Prioridade
                </label>
                <select
                  value={cardPriority}
                  onChange={(e) => setCardPriority(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="low">🟢 Baixa</option>
                  <option value="medium">🟡 Média</option>
                  <option value="high">🔴 Alta</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Vencimento
                </label>
                <input
                  type="date"
                  value={cardDueDate}
                  onChange={(e) => setCardDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Labels */}
            <div>
              <label className="block text-sm font-medium text-white mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4" /> Etiquetas
              </label>
              <div className="flex flex-wrap gap-2">
                {cardLabels.map((label) => (
                  <button
                    key={label.id}
                    onClick={() => setCardLabels(cardLabels.filter(l => l.id !== label.id))}
                    className={`px-3 py-1 rounded text-sm font-medium border flex items-center gap-2 transition-colors ${getLabelColor(label.color)} hover:opacity-75`}
                  >
                    {label.text}
                    <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {defaultLabels
                  .filter(l => !cardLabels.some(cl => cl.id === l.id))
                  .map((label) => (
                    <button
                      key={label.id}
                      onClick={() => setCardLabels([...cardLabels, label])}
                      className="text-xs px-2 py-1 bg-zinc-700 rounded hover:bg-zinc-600 transition-colors text-zinc-300"
                    >
                      + {label.text}
                    </button>
                  ))}
              </div>
            </div>

            {/* Comments */}
            <div className="border-t border-zinc-700 pt-6">
              <label className="block text-sm font-medium text-white mb-4 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Comentários ({cardComments.length})
              </label>
              
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
                {cardComments.map((comment) => (
                  <div key={comment.id} className="bg-zinc-700/50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-sky-400">{comment.userName}</span>
                      <span className="text-xs text-zinc-400">
                        {new Date(comment.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-200">{comment.text}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Adicionar comentário..."
                  onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                  className="flex-1 px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 text-sm"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!commentText}
                  className="px-3 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3 p-6 border-t border-zinc-700 sticky bottom-0 bg-zinc-800">
            <button
              onClick={() => setShowCardDetail(false)}
              className="flex-1 px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleUpdateCard}
              className="flex-1 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
            >
              Salvar Alterações
            </button>
          </div>
        </Dialog.Panel>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      >
        <Dialog.Panel className="bg-zinc-800 rounded-lg max-w-sm w-full border border-red-500/50 shadow-2xl">
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Confirmar exclusão</h3>
            <p className="text-zinc-300">
              Tem certeza que deseja deletar este quadro? Esta ação não pode ser desfeita e apagará todos os cartões.
            </p>
          </div>
          <div className="flex gap-3 p-6 border-t border-zinc-700">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDeleteTrello}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Deletar
            </button>
          </div>
        </Dialog.Panel>
      </Dialog>
    </div>
  );
};

export default withAuth(TrelloPage);
