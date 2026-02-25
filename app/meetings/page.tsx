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
  serverTimestamp,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { Dialog } from "@headlessui/react";
import {
  Plus,
  Trash2,
  Edit3,
  Calendar,
  FileText,
  CheckSquare,
  X,
  Users,
  Clock,
  AlertCircle,
} from "lucide-react";

interface Meeting {
  id: string;
  title: string;
  date: number;
  observations: string;
  attendees: string[];
  createdBy: string;
  createdAt: number;
  todos?: string[];
}

interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: number;
  meetingId?: string;
  priority?: "low" | "medium" | "high";
}

const MeetingsPage = () => {
  const user = auth.currentUser;

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "recent">("date");

  // Modal states
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [showEditMeeting, setShowEditMeeting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showGenerateTodos, setShowGenerateTodos] = useState(false);

  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newTime, setNewTime] = useState("10:00");
  const [newObservations, setNewObservations] = useState("");
  const [newAttendees, setNewAttendees] = useState("");

  // Edit states
  const [editId, setEditId] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editObservations, setEditObservations] = useState("");
  const [editAttendees, setEditAttendees] = useState("");

  const [deleteId, setDeleteId] = useState("");
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  // Fetch meetings
  const fetchMeetings = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, "meetings"),
        where("createdBy", "==", user.uid),
        orderBy("date", "desc")
      );
      const querySnapshot = await getDocs(q);
      const data: Meeting[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Meeting);
      });
      setMeetings(data);
    } catch (error) {
      console.error("Erro ao buscar reuniões:", error);
    }
  }, [user]);

  // Fetch todos
  const fetchTodos = useCallback(async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, "todos"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const data: Todo[] = [];
      querySnapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Todo);
      });
      setTodos(data);
    } catch (error) {
      console.error("Erro ao buscar TODOs:", error);
    }
  }, [user]);

  useEffect(() => {
    fetchMeetings();
    fetchTodos();
  }, [fetchMeetings, fetchTodos]);

  // Create meeting
  const handleCreateMeeting = async () => {
    if (!user || !newTitle || !newDate) return;

    try {
      const dateTime = new Date(`${newDate}T${newTime}`).getTime();
      await addDoc(collection(db, "meetings"), {
        title: newTitle,
        date: dateTime,
        observations: newObservations,
        attendees: newAttendees.split(",").map((a) => a.trim()).filter(Boolean),
        createdBy: user.uid,
        createdAt: Date.now(),
        todos: [],
      });

      setNewTitle("");
      setNewDate(new Date().toISOString().split("T")[0]);
      setNewTime("10:00");
      setNewObservations("");
      setNewAttendees("");
      setShowNewMeeting(false);
      fetchMeetings();
    } catch (error) {
      console.error("Erro ao criar reunião:", error);
      alert("Erro ao criar reunião");
    }
  };

  // Update meeting
  const handleUpdateMeeting = async () => {
    if (!editId || !editTitle || !editDate) return;

    try {
      const dateTime = new Date(`${editDate}T${editTime}`).getTime();
      const meetingRef = doc(db, "meetings", editId);
      await updateDoc(meetingRef, {
        title: editTitle,
        date: dateTime,
        observations: editObservations,
        attendees: editAttendees.split(",").map((a) => a.trim()).filter(Boolean),
      });

      setShowEditMeeting(false);
      setEditId("");
      fetchMeetings();
    } catch (error) {
      console.error("Erro ao atualizar reunião:", error);
      alert("Erro ao atualizar reunião");
    }
  };

  // Delete meeting
  const handleDeleteMeeting = async () => {
    if (!deleteId) return;

    try {
      await deleteDoc(doc(db, "meetings", deleteId));
      setShowDeleteConfirm(false);
      setDeleteId("");
      fetchMeetings();
    } catch (error) {
      console.error("Erro ao deletar reunião:", error);
      alert("Erro ao deletar reunião");
    }
  };

  // Generate Trello from observations
  const generateTrelloFromMeeting = async (meeting: Meeting) => {
    if (!user) return;

    // Simples parser de ações (procura por padrões como "- ação", "TODO:", etc)
    const patterns = [
      /[-*•]\s+([^,\n]+)/g,
      /(?:ação|tarefa|fazer|resolver|implementar|verificar|confirmar|contatar):\s*([^\n,]+)/gi,
    ];

    const tarefas: { title: string; priority: string }[] = [];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(meeting.observations)) !== null) {
        const title = match[1].trim().slice(0, 100);
        if (title && title.length > 3) {
          tarefas.push({ title, priority: "medium" });
        }
      }
    }

    if (tarefas.length === 0) {
      alert("Nenhuma ação encontrada nas observações. Use formatos como:\n- Ação\n• Tarefa\nVerificar: algo importante");
      return;
    }

    try {
      // Create Trello board
      const defaultColumns = [
        { id: "todo", name: "A Fazer", color: "bg-red-500" },
        { id: "in-progress", name: "Em Andamento", color: "bg-yellow-500" },
        { id: "review", name: "Revisão", color: "bg-blue-500" },
        { id: "done", name: "Concluído", color: "bg-green-500" },
      ];

      const trelloRef = await addDoc(collection(db, "trellos"), {
        title: `📅 ${meeting.title} - Tarefas`,
        description: `Tarefas geradas a partir da reunião de ${new Date(meeting.date).toLocaleDateString('pt-BR')}`,
        columns: defaultColumns,
        labels: [
          { id: "1", text: "Urgente", color: "red" },
          { id: "2", text: "Importante", color: "orange" },
          { id: "3", text: "Normal", color: "blue" },
        ],
        createdBy: user.uid,
        meetingId: meeting.id,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Create cards for each task
      const batch = writeBatch(db);
      let order = 0;

      for (const tarefa of tarefas) {
        const cardRef = doc(collection(db, "trello_cards"));
        batch.set(cardRef, {
          title: tarefa.title,
          description: `Tarefa gerada da reunião: ${meeting.title}`,
          columnId: "todo",
          trelloId: trelloRef.id,
          priority: tarefa.priority,
          order: order++,
          labels: [],
          comments: [],
          attachments: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      await batch.commit();
      alert(`Trello criado com ${tarefas.length} tarefa(s)!\n\nVocê pode acessá-lo em Trello > Abrir Quadro`);
      setShowGenerateTodos(false);
      setSelectedMeeting(null);
    } catch (error) {
      console.error("Erro ao gerar Trello:", error);
      alert("Erro ao gerar Trello");
    }
  };

  // Open edit modal
  const openEditModal = (meeting: Meeting) => {
    setEditId(meeting.id);
    setEditTitle(meeting.title);
    const date = new Date(meeting.date);
    setEditDate(date.toISOString().split("T")[0]);
    setEditTime(date.toTimeString().slice(0, 5));
    setEditObservations(meeting.observations);
    setEditAttendees(meeting.attendees.join(", "));
    setShowEditMeeting(true);
  };

  // Filter and sort meetings
  const filteredMeetings = meetings
    .filter((m) => m.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "date") return a.date - b.date;
      return b.createdAt - a.createdAt;
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 to-zinc-900 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white flex items-center gap-3">
              <Users className="w-8 h-8 text-sky-400" />
              Reuniões
            </h1>
            <p className="text-zinc-400 mt-2">Organize e acompanhe suas reuniões</p>
          </div>
          <button
            onClick={() => setShowNewMeeting(true)}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white px-6 py-3 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nova Reunião
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4 mb-6 flex-wrap">
          <input
            type="text"
            placeholder="Buscar reuniões..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-48 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "date" | "recent")}
            className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
          >
            <option value="date">Próximas datas</option>
            <option value="recent">Mais recentes</option>
          </select>
        </div>

        {/* Meetings List */}
        <div className="grid gap-4">
          {filteredMeetings.length === 0 ? (
            <div className="text-center py-12 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <AlertCircle className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
              <p className="text-zinc-400">Nenhuma reunião encontrada</p>
            </div>
          ) : (
            filteredMeetings.map((meeting) => (
              <div
                key={meeting.id}
                className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6 hover:border-sky-500/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-48">
                    <h3 className="text-xl font-semibold text-white">{meeting.title}</h3>
                    <div className="flex items-center gap-6 mt-3 text-sm text-zinc-400 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(meeting.date).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      {meeting.attendees.length > 0 && (
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          {meeting.attendees.length} participante(s)
                        </div>
                      )}
                    </div>
                    {meeting.observations && (
                      <p className="mt-3 text-zinc-300 line-clamp-2">{meeting.observations}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        setSelectedMeeting(meeting);
                        setShowGenerateTodos(true);
                      }}
                      className="flex items-center gap-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-4 py-2 rounded-lg transition-colors"
                      title="Criar Trello com tarefas da reuniao"
                    >
                      <CheckSquare className="w-4 h-4" />
                      Criar Trello
                    </button>
                    <button
                      onClick={() => openEditModal(meeting)}
                      className="flex items-center gap-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-4 py-2 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteId(meeting.id);
                        setShowDeleteConfirm(true);
                      }}
                      className="flex items-center gap-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 px-4 py-2 rounded-lg transition-colors"
                      title="Deletar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* New Meeting Modal */}
      <Dialog
        open={showNewMeeting}
        onClose={() => setShowNewMeeting(false)}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      >
        <Dialog.Panel className="bg-zinc-800 rounded-lg max-w-md w-full border border-zinc-700 shadow-2xl">
          <div className="flex items-center justify-between gap-4 p-6 border-b border-zinc-700">
            <Dialog.Title className="text-xl font-bold text-white">
              Nova Reunião
            </Dialog.Title>
            <button
              onClick={() => setShowNewMeeting(false)}
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
                placeholder="Ex: Planejamento Sprint"
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Data
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Horário
                </label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Participantes (separados por vírgula)
              </label>
              <input
                type="text"
                value={newAttendees}
                onChange={(e) => setNewAttendees(e.target.value)}
                placeholder="Ex: João, Maria, Pedro"
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Observações
              </label>
              <textarea
                value={newObservations}
                onChange={(e) => setNewObservations(e.target.value)}
                placeholder="Use - ou • para listar ações que serão convertidas em TODOs"
                rows={5}
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 p-6 border-t border-zinc-700">
            <button
              onClick={() => setShowNewMeeting(false)}
              className="flex-1 px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateMeeting}
              className="flex-1 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors disabled:opacity-50"
              disabled={!newTitle || !newDate}
            >
              Criar Reunião
            </button>
          </div>
        </Dialog.Panel>
      </Dialog>

      {/* Edit Meeting Modal */}
      <Dialog
        open={showEditMeeting}
        onClose={() => setShowEditMeeting(false)}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      >
        <Dialog.Panel className="bg-zinc-800 rounded-lg max-w-md w-full border border-zinc-700 shadow-2xl">
          <div className="flex items-center justify-between gap-4 p-6 border-b border-zinc-700">
            <Dialog.Title className="text-xl font-bold text-white">
              Editar Reunião
            </Dialog.Title>
            <button
              onClick={() => setShowEditMeeting(false)}
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
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Data
                </label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Horário
                </label>
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Participantes (separados por vírgula)
              </label>
              <input
                type="text"
                value={editAttendees}
                onChange={(e) => setEditAttendees(e.target.value)}
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Observações
              </label>
              <textarea
                value={editObservations}
                onChange={(e) => setEditObservations(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white focus:outline-none focus:border-sky-500 resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 p-6 border-t border-zinc-700">
            <button
              onClick={() => setShowEditMeeting(false)}
              className="flex-1 px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleUpdateMeeting}
              className="flex-1 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
            >
              Guardar Alterações
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
              Tem certeza que deseja deletar esta reunião? Esta ação não pode ser desfeita.
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
              onClick={handleDeleteMeeting}
              className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Deletar
            </button>
          </div>
        </Dialog.Panel>
      </Dialog>

      {/* Generate Trello Confirmation */}
      <Dialog
        open={showGenerateTodos}
        onClose={() => setShowGenerateTodos(false)}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      >
        <Dialog.Panel className="bg-zinc-800 rounded-lg max-w-md w-full border border-zinc-700 shadow-2xl">
          <div className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">📋 Criar Trello com Tarefas</h3>
            <p className="text-zinc-300 mb-6">
              Vou analisar as observações da reunião e criar um novo Trello com cartões para cada tarefa.
              Use formatos como:
            </p>
            <div className="bg-zinc-900/50 border border-zinc-700 rounded-lg p-4 mb-6 text-sm text-zinc-300 space-y-2">
              <div>• Item com traço</div>
              <div>- Item com hífen</div>
              <div>Verificar: algo importante</div>
            </div>
            <p className="text-xs text-zinc-400">✓ Cada tarefa será um cartão na coluna "A Fazer"</p>
          </div>
          <div className="flex gap-3 p-6 border-t border-zinc-700">
            <button
              onClick={() => {
                setShowGenerateTodos(false);
                setSelectedMeeting(null);
              }}
              className="flex-1 px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => selectedMeeting && generateTrelloFromMeeting(selectedMeeting)}
              className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Criar Trello
            </button>
          </div>
        </Dialog.Panel>
      </Dialog>
    </div>
  );
};

export default withAuth(MeetingsPage);

