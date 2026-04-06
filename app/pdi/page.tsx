"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, addDoc, query, orderBy, onSnapshot, updateDoc, deleteDoc, doc, where, Timestamp, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../AuthContext";
import {
  Plus, Trash2, CheckCircle, Circle, Calendar, Filter, TrendingUp, Target,
  ChevronLeft, ChevronRight, Clock, Repeat, AlertCircle, Edit2, Save, X,
  ChevronDown, ChevronUp, Calendar as CalendarIcon, List, LayoutGrid, Ticket
} from "lucide-react";
import { Dialog } from "@headlessui/react";

// Tipos
type TaskType = "importante" | "urgente" | "circunstancial";
type RepeatType = "nenhum" | "diario" | "semanal" | "mensal";
type ViewMode = "lista" | "calendario";

type Task = {
  id: string;
  title: string;
  type: TaskType;
  status: "pendente" | "feito";
  createdAt: number;
  date: string;
  userEmail: string;
  time?: string;
  description?: string;
  repeat?: RepeatType;
  reminder?: boolean;
  completedAt?: number;
  ticketId?: string;
  ticketNumber?: string;
};

type Ticket = {
  id: string;
  ticketNumber: string;
  clientName: string;
  description: string;
  status: "open" | "closed";
};

export default function ProductivityPage() {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState("");
  const [newType, setNewType] = useState<TaskType>("importante");
  const [filterType, setFilterType] = useState<TaskType | "todas">("todas");
  const [viewMode, setViewMode] = useState<ViewMode>("lista");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTaskForTicket, setSelectedTaskForTicket] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: "",
    type: "importante" as TaskType,
    time: "",
    description: "",
    repeat: "nenhum" as RepeatType,
    reminder: false
  });

  const today = new Date().toISOString().split("T")[0];
  const selectedDateStr = selectedDate.toISOString().split("T")[0];

  // Load tasks with user filter
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "tasks"),
      where("userEmail", "==", user.email),
      orderBy("date", "desc"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Task[];

      setTasks(data);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao carregar tarefas:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [user]);

  // Load tickets
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "tickets"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Ticket[];
      setTickets(data);
    });

    return () => unsub();
  }, [user]);

  // Filtrar tarefas por data e tipo
  const filteredTasks = useMemo(() => {
    let filtered = tasks.filter(t => t.date === selectedDateStr);

    if (filterType !== "todas") {
      filtered = filtered.filter(t => t.type === filterType);
    }

    return filtered.sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return 0;
    });
  }, [tasks, selectedDateStr, filterType]);

  // Métricas do dia selecionado
  const stats = useMemo(() => {
    const total = filteredTasks.length;
    const done = filteredTasks.filter(t => t.status === "feito").length;
    const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

    return { total, done, pending: total - done, percentage };
  }, [filteredTasks]);

  // Gerar dias do mês para calendário
  const calendarDays = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay();

    const days = [];
    const prevMonthDays = startWeekday === 0 ? 6 : startWeekday - 1;
    for (let i = prevMonthDays; i > 0; i--) {
      const date = new Date(year, month, -i + 1);
      days.push({ date, isCurrentMonth: false, tasksCount: 0, completedCount: 0 });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const tasksCount = tasks.filter(t => t.date === date.toISOString().split("T")[0]).length;
      const completedCount = tasks.filter(t => t.date === date.toISOString().split("T")[0] && t.status === "feito").length;
      days.push({ date, isCurrentMonth: true, tasksCount, completedCount });
    }
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push({ date, isCurrentMonth: false, tasksCount: 0, completedCount: 0 });
    }

    return days;
  }, [selectedDate, tasks]);

  const handleAddTask = async () => {
    if (!newTask.trim() || !user) {
      alert("Digite uma tarefa válida");
      return;
    }

    try {
      await addDoc(collection(db, "tasks"), {
        title: newTask.trim(),
        type: newType,
        status: "pendente",
        createdAt: Date.now(),
        date: selectedDateStr,
        userEmail: user.email,
        time: "",
        description: "",
        repeat: "nenhum",
        reminder: false
      });

      setNewTask("");
    } catch (error) {
      console.error("Erro ao adicionar tarefa:", error);
      alert("Erro ao adicionar tarefa");
    }
  };

  const handleEditTask = async () => {
    if (!editingTask || !taskForm.title.trim()) return;

    try {
      await updateDoc(doc(db, "tasks", editingTask.id), {
        title: taskForm.title.trim(),
        type: taskForm.type,
        time: taskForm.time,
        description: taskForm.description,
        repeat: taskForm.repeat,
        reminder: taskForm.reminder
      });

      setShowTaskModal(false);
      setEditingTask(null);
    } catch (error) {
      console.error("Erro ao editar tarefa:", error);
      alert("Erro ao editar tarefa");
    }
  };

  const toggleStatus = async (task: Task) => {
    try {
      await updateDoc(doc(db, "tasks", task.id), {
        status: task.status === "feito" ? "pendente" : "feito",
        completedAt: task.status === "pendente" ? Date.now() : null
      });
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
      alert("Erro ao atualizar status");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta tarefa?")) return;

    try {
      await deleteDoc(doc(db, "tasks", id));
    } catch (error) {
      console.error("Erro ao excluir tarefa:", error);
      alert("Erro ao excluir tarefa");
    }
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      type: task.type,
      time: task.time || "",
      description: task.description || "",
      repeat: task.repeat || "nenhum",
      reminder: task.reminder || false
    });
    setShowTaskModal(true);
  };

  const openTicketModal = (task: Task) => {
    setSelectedTaskForTicket(task);
    setShowTicketModal(true);
  };

  const linkTicketToTask = async (ticketId: string, ticketNumber: string) => {
    if (!selectedTaskForTicket) return;

    try {
      await updateDoc(doc(db, "tasks", selectedTaskForTicket.id), {
        ticketId: ticketId,
        ticketNumber: ticketNumber
      });

      setShowTicketModal(false);
      setSelectedTaskForTicket(null);
      alert(`Tarefa vinculada ao chamado #${ticketNumber} com sucesso!`);
    } catch (error) {
      console.error("Erro ao vincular chamado:", error);
      alert("Erro ao vincular chamado");
    }
  };

  const unlinkTicket = async (task: Task) => {
    if (!confirm(`Remover vínculo com o chamado #${task.ticketNumber}?`)) return;

    try {
      await updateDoc(doc(db, "tasks", task.id), {
        ticketId: null,
        ticketNumber: null
      });
      alert("Chamado desvinculado com sucesso!");
    } catch (error) {
      console.error("Erro ao desvincular chamado:", error);
      alert("Erro ao desvincular chamado");
    }
  };

  const changeMonth = (delta: number) => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + delta, 1));
  };

  const getColor = (type: TaskType) => {
    const colors = {
      importante: "border-blue-500 bg-blue-500/5",
      urgente: "border-red-500 bg-red-500/5",
      circunstancial: "border-zinc-600 bg-zinc-600/5"
    };
    return colors[type];
  };

  const getTypeLabel = (type: TaskType) => {
    const labels = { importante: "Importante", urgente: "Urgente", circunstancial: "Circunstancial" };
    return labels[type];
  };

  const getTypeIcon = (type: TaskType) => {
    const icons = { importante: "📌", urgente: "⚠️", circunstancial: "📝" };
    return icons[type];
  };

  const getRepeatLabel = (repeat: RepeatType) => {
    const labels = { nenhum: "Não repete", diario: "Diário", semanal: "Semanal", mensal: "Mensal" };
    return labels[repeat];
  };

  const formattedDate = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const monthName = selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Filtrar tickets disponíveis (apenas abertos e não vinculados a outras tarefas)
  const availableTickets = useMemo(() => {
    const linkedTicketIds = tasks.filter(t => t.ticketId).map(t => t.ticketId);
    return tickets.filter(t =>
      t.status === "open" &&
      !linkedTicketIds.includes(t.id)
    );
  }, [tickets, tasks]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 to-zinc-800">
      <div className="p-6 max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Target size={28} className="text-sky-400" />
              Agenda e Tarefas
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Calendar size={14} className="text-zinc-500" />
              <p className="text-zinc-400 text-sm capitalize">{formattedDate}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode("lista")}
              className={`p-2 rounded-lg transition-all ${viewMode === "lista" ? "bg-sky-500/20 text-sky-400" : "text-zinc-400 hover:text-zinc-300"}`}
              title="Modo Lista"
            >
              <List size={20} />
            </button>
            <button
              onClick={() => setViewMode("calendario")}
              className={`p-2 rounded-lg transition-all ${viewMode === "calendario" ? "bg-sky-500/20 text-sky-400" : "text-zinc-400 hover:text-zinc-300"}`}
              title="Modo Calendário"
            >
              <LayoutGrid size={20} />
            </button>
          </div>
        </div>

        {/* Modo Calendário */}
        {viewMode === "calendario" && (
          <div className="bg-zinc-900/50 rounded-xl border border-zinc-800 p-4">
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => changeMonth(-1)} className="p-2 rounded-lg hover:bg-zinc-800 transition-colors">
                <ChevronLeft size={20} className="text-zinc-400" />
              </button>
              <h2 className="text-lg font-semibold text-white capitalize">{monthName}</h2>
              <button onClick={() => changeMonth(1)} className="p-2 rounded-lg hover:bg-zinc-800 transition-colors">
                <ChevronRight size={20} className="text-zinc-400" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => (
                <div key={day} className="text-center text-xs text-zinc-500 py-2">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                const isToday = day.date.toDateString() === new Date().toDateString();
                const isSelected = day.date.toDateString() === selectedDate.toDateString();
                const hasTasks = day.tasksCount > 0;
                const completedPercent = day.completedCount && day.tasksCount > 0
                  ? (day.completedCount / day.tasksCount) * 100 : 0;

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(day.date)}
                    className={`aspect-square p-2 rounded-lg transition-all relative
                      ${!day.isCurrentMonth && "opacity-40"}
                      ${isSelected ? "bg-sky-500/20 border border-sky-500/50" : "hover:bg-zinc-800"}
                      ${isToday && !isSelected && "border border-sky-500/30"}`}
                  >
                    <div className="flex flex-col items-center h-full">
                      <span className={`text-sm ${isToday ? "text-sky-400 font-bold" : "text-white"}`}>
                        {day.date.getDate()}
                      </span>
                      {hasTasks && (
                        <div className="mt-1 w-full">
                          <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
                            <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${completedPercent}%` }} />
                          </div>
                          <span className="text-[10px] text-zinc-500 mt-0.5">{day.completedCount}/{day.tasksCount}</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-zinc-900/50 backdrop-blur p-4 rounded-xl border border-zinc-800">
            <p className="text-xs text-zinc-500 mb-1">Total</p>
            <p className="text-2xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-zinc-900/50 backdrop-blur p-4 rounded-xl border border-zinc-800">
            <p className="text-xs text-zinc-500 mb-1">Concluídas</p>
            <p className="text-2xl font-bold text-green-400">{stats.done}</p>
          </div>
          <div className="bg-zinc-900/50 backdrop-blur p-4 rounded-xl border border-zinc-800">
            <p className="text-xs text-zinc-500 mb-1">Pendentes</p>
            <p className="text-2xl font-bold text-red-400">{stats.pending}</p>
          </div>
        </div>

        {/* Barra de Progresso */}
        {stats.total > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Progresso do dia</span>
              <span>{stats.done}/{stats.total} concluídas</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-sky-500 to-sky-400 rounded-full transition-all duration-500" style={{ width: `${stats.percentage}%` }} />
            </div>
          </div>
        )}

        {/* Data Selecionada */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon size={18} className="text-sky-400" />
            <h2 className="text-white font-medium">
              {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
          </div>
          {viewMode === "lista" && (
            <div className="flex gap-1">
              <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() - 1)))} className="p-1 rounded hover:bg-zinc-800">
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => setSelectedDate(new Date())} className="px-2 py-1 text-xs bg-zinc-800 rounded hover:bg-zinc-700">
                Hoje
              </button>
              <button onClick={() => setSelectedDate(new Date(selectedDate.setDate(selectedDate.getDate() + 1)))} className="p-1 rounded hover:bg-zinc-800">
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Add Task Form */}
        <div className="bg-zinc-900/30 rounded-xl p-4 border border-zinc-800">
          <div className="flex gap-3">
            <input
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
              placeholder="Digite sua tarefa..."
              className="flex-1 p-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder:text-zinc-500 focus:border-sky-500 focus:outline-none transition-colors"
            />

            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as TaskType)}
              className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 text-white focus:border-sky-500 focus:outline-none"
            >
              <option value="importante">📌 Importante</option>
              <option value="urgente">⚠️ Urgente</option>
              <option value="circunstancial">📝 Circunstancial</option>
            </select>

            <button
              onClick={handleAddTask}
              disabled={!newTask.trim()}
              className="bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 rounded-lg flex items-center gap-2 transition-all"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Adicionar</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 flex-wrap">
          <Filter size={14} className="text-zinc-500" />
          <span className="text-xs text-zinc-500">Filtrar por:</span>
          <button onClick={() => setFilterType("todas")} className={`px-3 py-1 rounded-full text-xs transition-all ${filterType === "todas" ? "bg-sky-500/20 text-sky-400 border border-sky-500/30" : "text-zinc-400 hover:text-zinc-300"}`}>Todas</button>
          <button onClick={() => setFilterType("importante")} className={`px-3 py-1 rounded-full text-xs transition-all ${filterType === "importante" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" : "text-zinc-400 hover:text-zinc-300"}`}>📌 Importante</button>
          <button onClick={() => setFilterType("urgente")} className={`px-3 py-1 rounded-full text-xs transition-all ${filterType === "urgente" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "text-zinc-400 hover:text-zinc-300"}`}>⚠️ Urgente</button>
          <button onClick={() => setFilterType("circunstancial")} className={`px-3 py-1 rounded-full text-xs transition-all ${filterType === "circunstancial" ? "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30" : "text-zinc-400 hover:text-zinc-300"}`}>📝 Circunstancial</button>
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-500"></div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="text-center py-12 bg-zinc-900/30 rounded-xl border border-zinc-800">
              <Target size={48} className="mx-auto text-zinc-600 mb-3" />
              <p className="text-zinc-500">Nenhuma tarefa para este dia</p>
              <p className="text-zinc-600 text-sm">Adicione suas tarefas acima!</p>
            </div>
          ) : (
            filteredTasks.map(task => (
              <div key={task.id} className={`p-4 rounded-xl border ${getColor(task.type)} hover:border-opacity-100 transition-all group`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-lg">{getTypeIcon(task.type)}</span>
                      <p className={`font-medium ${task.status === "feito" ? "line-through text-zinc-500" : "text-white"}`}>
                        {task.title}
                      </p>
                      {task.time && (
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <Clock size={12} />
                          {task.time}
                        </span>
                      )}
                      {task.repeat && task.repeat !== "nenhum" && (
                        <span className="flex items-center gap-1 text-xs text-zinc-500">
                          <Repeat size={12} />
                          {getRepeatLabel(task.repeat)}
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-sm text-zinc-400 mt-1">{task.description}</p>
                    )}

                    {/* Ticket vinculado */}
                    {task.ticketId && task.ticketNumber && (
                      <div className="mt-2 flex items-center gap-2">
                        <Ticket size={14} className="text-purple-400" />
                        <span className="text-xs text-purple-400">Chamado #{task.ticketNumber}</span>
                        <button
                          onClick={() => unlinkTicket(task)}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          [Desvincular]
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${task.type === "importante" ? "bg-blue-500/20 text-blue-400" :
                        task.type === "urgente" ? "bg-red-500/20 text-red-400" : "bg-zinc-500/20 text-zinc-400"
                        }`}>
                        {getTypeLabel(task.type)}
                      </span>
                      <span className={`text-xs ${task.status === "feito" ? "text-green-400" : "text-yellow-400"}`}>
                        {task.status === "feito" ? "✓ Concluída" : "○ Pendente"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!task.ticketId && task.status !== "feito" && (
                      <button
                        onClick={() => openTicketModal(task)}
                        className="p-2 rounded-lg hover:bg-purple-500/10 transition-colors"
                        title="Vincular chamado"
                      >
                        <Ticket size={16} className="text-purple-400" />
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(task)}
                      className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                      title="Editar tarefa"
                    >
                      <Edit2 size={16} className="text-zinc-400 hover:text-sky-400" />
                    </button>
                    <button
                      onClick={() => toggleStatus(task)}
                      className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
                      title={task.status === "feito" ? "Marcar como pendente" : "Marcar como concluída"}
                    >
                      {task.status === "feito"
                        ? <CheckCircle size={20} className="text-green-400" />
                        : <Circle size={20} className="text-zinc-400 hover:text-green-400" />}
                    </button>
                    <button
                      onClick={() => remove(task.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                      title="Excluir tarefa"
                    >
                      <Trash2 size={18} className="text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Dica Motivacional */}
        {stats.done > 0 && stats.done === stats.total && stats.total > 0 && (
          <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
            <p className="text-emerald-400 font-medium">🎉 Parabéns! Você concluiu todas as tarefas do dia!</p>
            <p className="text-xs text-emerald-400/70 mt-1">Continue assim, um dia de cada vez!</p>
          </div>
        )}

        {/* Modal de Edição */}
        <Dialog open={showTaskModal} onClose={() => setShowTaskModal(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-zinc-900 rounded-xl w-full max-w-md border border-zinc-700">
              <div className="p-6 border-b border-zinc-800">
                <Dialog.Title className="text-lg font-bold text-white">Editar Tarefa</Dialog.Title>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Título</label>
                  <input type="text" value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} className="w-full p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-sky-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Tipo</label>
                  <select value={taskForm.type} onChange={(e) => setTaskForm({ ...taskForm, type: e.target.value as TaskType })} className="w-full p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-sky-500 outline-none">
                    <option value="importante">📌 Importante</option>
                    <option value="urgente">⚠️ Urgente</option>
                    <option value="circunstancial">📝 Circunstancial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Horário (opcional)</label>
                  <input type="time" value={taskForm.time} onChange={(e) => setTaskForm({ ...taskForm, time: e.target.value })} className="w-full p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-sky-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Descrição (opcional)</label>
                  <textarea value={taskForm.description} onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })} rows={3} className="w-full p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-sky-500 outline-none resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Repetir</label>
                  <select value={taskForm.repeat} onChange={(e) => setTaskForm({ ...taskForm, repeat: e.target.value as RepeatType })} className="w-full p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:border-sky-500 outline-none">
                    <option value="nenhum">Não repetir</option>
                    <option value="diario">Diário</option>
                    <option value="semanal">Semanal</option>
                    <option value="mensal">Mensal</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={taskForm.reminder} onChange={(e) => setTaskForm({ ...taskForm, reminder: e.target.checked })} className="rounded bg-zinc-800 border-zinc-700 text-sky-500 focus:ring-sky-500" />
                  <span className="text-sm text-zinc-300">Lembrar-me desta tarefa</span>
                </label>
              </div>
              <div className="p-6 border-t border-zinc-800 flex justify-end gap-3">
                <button onClick={() => setShowTaskModal(false)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white">Cancelar</button>
                <button onClick={handleEditTask} disabled={!taskForm.title.trim()} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 rounded-lg text-white disabled:opacity-50">Salvar</button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>

        {/* Modal para Vincular Chamado */}
        <Dialog open={showTicketModal} onClose={() => setShowTicketModal(false)} className="relative z-50">
          <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="bg-zinc-900 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto border border-zinc-700">
              <div className="p-6 border-b border-zinc-800">
                <Dialog.Title className="text-xl font-bold text-white flex items-center gap-2">
                  <Ticket size={20} className="text-purple-400" />
                  Vincular Chamado à Tarefa
                </Dialog.Title>
                <p className="text-sm text-zinc-400 mt-1">
                  Tarefa: {selectedTaskForTicket?.title}
                </p>
              </div>

              <div className="p-6">
                {availableTickets.length === 0 ? (
                  <div className="text-center py-8">
                    <Ticket size={48} className="mx-auto text-zinc-600 mb-3" />
                    <p className="text-zinc-500">Nenhum chamado disponível para vincular</p>
                    <p className="text-zinc-600 text-sm mt-1">
                      Todos os chamados abertos já estão vinculados a alguma tarefa
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {availableTickets.map(ticket => (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg hover:bg-zinc-800 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-purple-400">#{ticket.ticketNumber}</span>
                            <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">Aberto</span>
                          </div>
                          <p className="text-white text-sm mt-1">{ticket.clientName}</p>
                          {ticket.description && (
                            <p className="text-zinc-400 text-xs mt-1 line-clamp-2">{ticket.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => linkTicketToTask(ticket.id, ticket.ticketNumber)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm transition-colors"
                        >
                          Vincular
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-zinc-800 flex justify-end">
                <button onClick={() => setShowTicketModal(false)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white">
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