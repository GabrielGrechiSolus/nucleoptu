"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useDeferredValue,
} from "react";

import {
  Plus,
  Search,
  Filter,
  X,
  MoreVertical,
  BookOpen,
  MessageSquare,
  Trash2,
  Pencil,
  CheckCircle2,
  Clock3,
  Sparkles,
  LayoutGrid,
} from "lucide-react";

import { motion, AnimatePresence } from "framer-motion";

import { useAuth } from "../AuthContext";
import { db } from "../../firebase";

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  orderBy,
  writeBatch,
  arrayRemove,
} from "firebase/firestore";

import TicketModal, {
  Ticket,
  Observation,
} from "./components/TicketModal";

import ObservationModal from "./components/ObservationModal";

import AddStudyToTicketModal from "./components/AddStudyToTicketModal";

import { Study } from "../studies/components/StudyModal";

// ======================================================
// TYPES
// ======================================================

interface TicketStats {
  total: number;
  open: number;
  closed: number;
  withStudies: number;
}

interface FilterOptions {
  status: "all" | "open" | "closed";
  client: string;
  dateRange: "all" | "today" | "week" | "month";
  hasStudies: "all" | "yes" | "no";
}

// ======================================================
// HELPERS
// ======================================================

const cn = (...classes: (string | false | undefined)[]) =>
  classes.filter(Boolean).join(" ");

const formatDate = (date?: string) => {
  if (!date) return "-";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
};

// ======================================================
// MAIN COMPONENT
// ======================================================

const TicketsPage = () => {
  const { user } = useAuth();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [clients, setClients] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearch = useDeferredValue(searchTerm);

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    status: "all",
    client: "",
    dateRange: "all",
    hasStudies: "all",
  });

  const [showFilters, setShowFilters] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  const [editingTicket, setEditingTicket] = useState<Ticket | undefined>();

  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  const [isObservationModalOpen, setIsObservationModalOpen] =
    useState(false);

  const [isAddStudyModalOpen, setIsAddStudyModalOpen] =
    useState(false);

  const [stats, setStats] = useState<TicketStats>({
    total: 0,
    open: 0,
    closed: 0,
    withStudies: 0,
  });

  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // ======================================================
  // LOAD TICKETS
  // ======================================================

  useEffect(() => {
    if (!user) return;

    setLoading(true);

    const q = query(
      collection(db, "tickets"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const ticketsData: Ticket[] = [];

        const clientsSet = new Set<string>();

        querySnapshot.forEach((document) => {
          const data = document.data();

          const ticket = {
            id: document.id,
            ticketNumber: data.ticketNumber,
            clientName: data.clientName,
            openDate: data.openDate,
            closeDate: data.closeDate || undefined,
            status: data.status,
            observations: data.observations || [],
            studies: data.studies || [],
            githubLinks: data.githubLinks || [],
            priority: data.priority || "medium",
            category: data.category || "",
            description: data.description || "",
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as Ticket;

          ticketsData.push(ticket);

          if (data.clientName) {
            clientsSet.add(data.clientName);
          }
        });

        setTickets(ticketsData);

        setClients(Array.from(clientsSet).sort());

        setStats({
          total: ticketsData.length,
          open: ticketsData.filter((t) => t.status === "open")
            .length,
          closed: ticketsData.filter((t) => t.status === "closed")
            .length,
          withStudies: ticketsData.filter(
            (t) => t.studies && t.studies.length > 0
          ).length,
        });

        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // ======================================================
  // LOAD CATEGORIES
  // ======================================================

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "studies"),
      where("userId", "==", user.uid),
      orderBy("category")
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const categoriesSet = new Set<string>();

      querySnapshot.forEach((document) => {
        const data = document.data();

        if (data.category) {
          categoriesSet.add(data.category);
        }
      });

      setCategories(Array.from(categoriesSet).sort());
    });

    return () => unsubscribe();
  }, [user]);

  // ======================================================
  // FILTERS
  // ======================================================

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const searchLower = deferredSearch.toLowerCase();

      const matchesSearch =
        deferredSearch === "" ||
        ticket.ticketNumber
          .toLowerCase()
          .includes(searchLower) ||
        ticket.clientName
          .toLowerCase()
          .includes(searchLower) ||
        ticket.description
          ?.toLowerCase()
          .includes(searchLower) ||
        ticket.category?.toLowerCase().includes(searchLower);

      const matchesStatus =
        filterOptions.status === "all" ||
        ticket.status === filterOptions.status;

      const matchesClient =
        filterOptions.client === "" ||
        ticket.clientName === filterOptions.client;

      const matchesStudies =
        filterOptions.hasStudies === "all" ||
        (filterOptions.hasStudies === "yes" &&
          ticket.studies?.length > 0) ||
        (filterOptions.hasStudies === "no" &&
          ticket.studies?.length === 0);

      let matchesDate = true;

      if (
        filterOptions.dateRange !== "all" &&
        ticket.createdAt
      ) {
        const ticketDate = new Date(ticket.createdAt);

        const now = new Date();

        switch (filterOptions.dateRange) {
          case "today":
            matchesDate =
              ticketDate.toDateString() === now.toDateString();
            break;

          case "week": {
            const weekAgo = new Date();
            weekAgo.setDate(now.getDate() - 7);

            matchesDate = ticketDate >= weekAgo;
            break;
          }

          case "month": {
            const monthAgo = new Date();
            monthAgo.setMonth(now.getMonth() - 1);

            matchesDate = ticketDate >= monthAgo;
            break;
          }
        }
      }

      return (
        matchesSearch &&
        matchesStatus &&
        matchesClient &&
        matchesStudies &&
        matchesDate
      );
    });
  }, [tickets, deferredSearch, filterOptions]);

  // ======================================================
  // ACTIONS
  // ======================================================

  const clearFilters = () => {
    setSearchTerm("");

    setFilterOptions({
      status: "all",
      client: "",
      dateRange: "all",
      hasStudies: "all",
    });
  };

  const activeFiltersCount =
    Object.values(filterOptions).filter(
      (v) => v !== "all" && v !== ""
    ).length + (searchTerm ? 1 : 0);

  // ======================================================
  // CREATE / UPDATE
  // ======================================================

  const handleCreateTicket = async (
    data: Omit<
      Ticket,
      | "id"
      | "observations"
      | "studies"
      | "createdAt"
      | "updatedAt"
    >
  ) => {
    if (!user) return;

    try {
      const now = new Date().toISOString();

      if (editingTicket) {
        const ticketRef = doc(db, "tickets", editingTicket.id);

        await updateDoc(ticketRef, {
          ...data,
          updatedAt: now,
        });
      } else {
        await addDoc(collection(db, "tickets"), {
          ...data,
          userId: user.uid,
          observations: [],
          studies: [],
          githubLinks: data.githubLinks || [],
          createdAt: now,
          updatedAt: now,
        });
      }

      setIsTicketModalOpen(false);
      setEditingTicket(undefined);
    } catch (error) {
      console.error(error);
    }
  };

  // ======================================================
  // DELETE
  // ======================================================

  const handleDeleteTicket = async (id: string) => {
    const confirmed = window.confirm(
      "Tem certeza que deseja excluir este chamado?"
    );

    if (!confirmed) return;

    setIsDeleting(id);

    try {
      const ticket = tickets.find((t) => t.id === id);

      if (ticket?.studies?.length) {
        const batch = writeBatch(db);

        for (const studyId of ticket.studies) {
          const studyRef = doc(db, "studies", studyId);

          batch.update(studyRef, {
            tickets: arrayRemove(id),
          });
        }

        await batch.commit();
      }

      await deleteDoc(doc(db, "tickets", id));
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(null);
    }
  };

  // ======================================================
  // TOGGLE STATUS
  // ======================================================

  const handleToggleStatus = async (ticket: Ticket) => {
    try {
      const newStatus =
        ticket.status === "open" ? "closed" : "open";

      const ticketRef = doc(db, "tickets", ticket.id);

      await updateDoc(ticketRef, {
        status: newStatus,
        closeDate:
          newStatus === "closed"
            ? new Date().toISOString()
            : null,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(error);
    }
  };

  // ======================================================
  // OBSERVATION
  // ======================================================

  const handleAddObservation = async (text: string) => {
    if (!selectedTicket) return;

    try {
      const newObservation: Observation = {
        id: Date.now().toString(),
        text,
        createdAt: new Date().toISOString(),
        createdBy:
          user?.displayName ||
          user?.email ||
          "Usuário",
      };

      const updatedObservations = [
        newObservation,
        ...selectedTicket.observations,
      ];

      await updateDoc(
        doc(db, "tickets", selectedTicket.id),
        {
          observations: updatedObservations,
          updatedAt: new Date().toISOString(),
        }
      );

      setSelectedTicket({
        ...selectedTicket,
        observations: updatedObservations,
      });
    } catch (error) {
      console.error(error);
    }
  };

  // ======================================================
  // DELETE OBSERVATION
  // ======================================================

  const handleDeleteObservation = async (
    ticketId: string,
    observationId: string
  ) => {
    const ticket = tickets.find((t) => t.id === ticketId);

    if (!ticket) return;

    try {
      const updatedObservations =
        ticket.observations.filter(
          (obs) => obs.id !== observationId
        );

      await updateDoc(doc(db, "tickets", ticketId), {
        observations: updatedObservations,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error(error);
    }
  };

  // ======================================================
  // CREATE STUDY
  // ======================================================

  const handleCreateStudyFromTicket = async (
    data: Omit<Study, "id" | "createdAt" | "updatedAt">
  ) => {
    if (!user || !selectedTicket) return;

    try {
      const now = new Date().toISOString();

      const docRef = await addDoc(
        collection(db, "studies"),
        {
          ...data,
          userId: user.uid,
          tickets: [selectedTicket.id],
          createdAt: now,
          updatedAt: now,
        }
      );

      await updateDoc(
        doc(db, "tickets", selectedTicket.id),
        {
          studies: [
            ...(selectedTicket.studies || []),
            docRef.id,
          ],
          updatedAt: now,
        }
      );

      setIsAddStudyModalOpen(false);
      setSelectedTicket(null);
    } catch (error) {
      console.error(error);
    }
  };

  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white">
        <div className="mx-auto max-w-7xl p-6">
          <div className="mb-10 flex items-center justify-between">
            <div className="space-y-3">
              <div className="h-10 w-64 animate-pulse rounded-xl bg-white/5" />
              <div className="h-5 w-80 animate-pulse rounded-lg bg-white/5" />
            </div>

            <div className="h-12 w-44 animate-pulse rounded-2xl bg-white/5" />
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-3xl border border-white/5 bg-white/[0.03]"
              />
            ))}
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-72 animate-pulse rounded-3xl border border-white/5 bg-white/[0.03]"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      {/* BACKGROUND */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-0 top-0 h-[500px] w-[500px] rounded-full bg-sky-500/10 blur-3xl" />

        <div className="absolute bottom-0 right-0 h-[500px] w-[500px] rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl p-4 sm:p-6">
        {/* ====================================================== */}
        {/* HEADER */}
        {/* ====================================================== */}

        <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-sm text-zinc-300 backdrop-blur-xl">
              <Sparkles className="size-4 text-sky-400" />
              Workspace de Chamados
            </div>

            <div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                Central de Tickets
              </h1>

              <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-400">
                Gerencie chamados, observações e estudos com
                uma experiência moderna, rápida e organizada.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setEditingTicket(undefined);
              setIsTicketModalOpen(true);
            }}
            className="group inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-sky-400/20 bg-gradient-to-r from-sky-500 to-indigo-500 px-5 font-medium text-white shadow-2xl shadow-sky-500/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-sky-500/40 active:scale-[0.98]"
          >
            <Plus className="size-5 transition-transform group-hover:rotate-90" />
            Novo Chamado
          </button>
        </div>

        {/* ====================================================== */}
        {/* STATS */}
        {/* ====================================================== */}

        <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            {
              label: "Total",
              value: stats.total,
              icon: LayoutGrid,
              color:
                "from-white/10 to-white/[0.03]",
            },
            {
              label: "Abertos",
              value: stats.open,
              icon: Clock3,
              color:
                "from-emerald-500/20 to-emerald-500/5",
            },
            {
              label: "Fechados",
              value: stats.closed,
              icon: CheckCircle2,
              color:
                "from-zinc-500/20 to-zinc-500/5",
            },
            {
              label: "Com Estudos",
              value: stats.withStudies,
              icon: BookOpen,
              color:
                "from-fuchsia-500/20 to-fuchsia-500/5",
            },
          ].map((item) => (
            <motion.div
              key={item.label}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className={cn(
                "relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br p-5 backdrop-blur-2xl",
                item.color
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-zinc-400">
                    {item.label}
                  </p>

                  <p className="mt-2 text-3xl font-semibold tracking-tight">
                    {item.value}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <item.icon className="size-5 text-white" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ====================================================== */}
        {/* SEARCH */}
        {/* ====================================================== */}

        <div className="sticky top-4 z-20 mb-8">
          <div className="rounded-3xl border border-white/10 bg-black/40 p-4 shadow-2xl backdrop-blur-2xl">
            <div className="flex flex-col gap-3 lg:flex-row">
              {/* SEARCH */}
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-zinc-500" />

                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(e.target.value)
                  }
                  placeholder="Buscar ticket, cliente, categoria..."
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] pl-12 pr-12 text-sm text-white outline-none transition-all placeholder:text-zinc-500 focus:border-sky-500/50 focus:bg-white/[0.05]"
                />

                <AnimatePresence>
                  {searchTerm && (
                    <motion.button
                      initial={{
                        opacity: 0,
                        scale: 0.8,
                      }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                      }}
                      exit={{
                        opacity: 0,
                        scale: 0.8,
                      }}
                      onClick={() => setSearchTerm("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 transition hover:text-white"
                    >
                      <X className="size-4" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {/* FILTER BUTTON */}
              <button
                onClick={() =>
                  setShowFilters(!showFilters)
                }
                className={cn(
                  "inline-flex h-12 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-medium transition-all",
                  showFilters || activeFiltersCount > 0
                    ? "border-sky-500/40 bg-sky-500/10 text-sky-400"
                    : "border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]"
                )}
              >
                <Filter className="size-4" />
                Filtros

                {activeFiltersCount > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-sky-500 text-[11px] font-semibold text-white">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>

            {/* FILTERS */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{
                    opacity: 0,
                    height: 0,
                  }}
                  animate={{
                    opacity: 1,
                    height: "auto",
                  }}
                  exit={{
                    opacity: 0,
                    height: 0,
                  }}
                  transition={{
                    duration: 0.2,
                  }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 grid gap-4 border-t border-white/10 pt-4 md:grid-cols-2 xl:grid-cols-4">
                    <FilterSelect
                      label="Status"
                      value={filterOptions.status}
                      onChange={(value) =>
                        setFilterOptions((prev) => ({
                          ...prev,
                          status: value as any,
                        }))
                      }
                      options={[
                        {
                          label: "Todos",
                          value: "all",
                        },
                        {
                          label: "Abertos",
                          value: "open",
                        },
                        {
                          label: "Fechados",
                          value: "closed",
                        },
                      ]}
                    />

                    <FilterSelect
                      label="Cliente"
                      value={filterOptions.client}
                      onChange={(value) =>
                        setFilterOptions((prev) => ({
                          ...prev,
                          client: value,
                        }))
                      }
                      options={[
                        {
                          label: "Todos",
                          value: "",
                        },
                        ...clients.map((client) => ({
                          label: client,
                          value: client,
                        })),
                      ]}
                    />

                    <FilterSelect
                      label="Período"
                      value={filterOptions.dateRange}
                      onChange={(value) =>
                        setFilterOptions((prev) => ({
                          ...prev,
                          dateRange: value as any,
                        }))
                      }
                      options={[
                        {
                          label: "Todo período",
                          value: "all",
                        },
                        {
                          label: "Hoje",
                          value: "today",
                        },
                        {
                          label: "Últimos 7 dias",
                          value: "week",
                        },
                        {
                          label: "Últimos 30 dias",
                          value: "month",
                        },
                      ]}
                    />

                    <FilterSelect
                      label="Estudos"
                      value={filterOptions.hasStudies}
                      onChange={(value) =>
                        setFilterOptions((prev) => ({
                          ...prev,
                          hasStudies: value as any,
                        }))
                      }
                      options={[
                        {
                          label: "Todos",
                          value: "all",
                        },
                        {
                          label: "Com estudos",
                          value: "yes",
                        },
                        {
                          label: "Sem estudos",
                          value: "no",
                        },
                      ]}
                    />

                    {activeFiltersCount > 0 && (
                      <div className="md:col-span-2 xl:col-span-4">
                        <button
                          onClick={clearFilters}
                          className="text-sm text-zinc-400 transition hover:text-white"
                        >
                          Limpar filtros
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ====================================================== */}
        {/* EMPTY */}
        {/* ====================================================== */}

        {filteredTickets.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-[32px] border border-white/10 bg-white/[0.03] px-6 py-24 text-center backdrop-blur-2xl">
            <div className="mb-6 rounded-full border border-white/10 bg-white/[0.03] p-5">
              <Search className="size-10 text-zinc-500" />
            </div>

            <h2 className="text-2xl font-semibold">
              Nenhum chamado encontrado
            </h2>

            <p className="mt-3 max-w-md text-zinc-400">
              Tente ajustar os filtros ou criar um novo
              chamado para começar.
            </p>

            <button
              onClick={clearFilters}
              className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-medium transition hover:bg-white/[0.06]"
            >
              Limpar filtros
            </button>
          </div>
        )}

        {/* ====================================================== */}
        {/* GRID */}
        {/* ====================================================== */}

        {filteredTickets.length > 0 && (
          <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filteredTickets.map((ticket, index) => {
                const isOpen =
                  ticket.status === "open";

                return (
                  <motion.div
                    key={ticket.id}
                    layout
                    initial={{
                      opacity: 0,
                      y: 10,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.95,
                    }}
                    transition={{
                      delay: index * 0.02,
                    }}
                    className="group relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.02] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl hover:shadow-black/40"
                  >
                    {/* glow */}
                    <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400 to-transparent" />
                    </div>

                    {/* CONTENT */}
                    <div className="p-6">
                      {/* TOP */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-400">
                              #{ticket.ticketNumber}
                            </span>

                            <span
                              className={cn(
                                "rounded-full px-3 py-1 text-xs font-medium",
                                isOpen
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-zinc-500/10 text-zinc-400"
                              )}
                            >
                              {isOpen
                                ? "Aberto"
                                : "Fechado"}
                            </span>
                          </div>

                          <h2 className="mt-4 text-xl font-semibold tracking-tight">
                            {ticket.clientName}
                          </h2>

                          <p className="mt-1 text-sm text-zinc-500">
                            Criado em{" "}
                            {formatDate(
                              ticket.createdAt
                            )}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 transition-all duration-200 group-hover:opacity-100">
                          <button
                            onClick={() => {
                              setEditingTicket(ticket);
                              setIsTicketModalOpen(true);
                            }}
                            className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-zinc-400 transition hover:bg-white/[0.06] hover:text-white"
                          >
                            <Pencil className="size-4" />
                          </button>

                          <button
                            disabled={
                              isDeleting === ticket.id
                            }
                            onClick={() =>
                              handleDeleteTicket(
                                ticket.id
                              )
                            }
                            className="rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-red-400 transition hover:bg-red-500/20"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>

                      {/* DESCRIPTION */}
                      {ticket.description && (
                        <p className="mt-5 line-clamp-3 text-sm leading-relaxed text-zinc-400">
                          {ticket.description}
                        </p>
                      )}

                      {/* CATEGORY */}
                      {ticket.category && (
                        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-zinc-300">
                          <Sparkles className="size-3" />
                          {ticket.category}
                        </div>
                      )}

                      {/* FOOTER */}
                      <div className="mt-8 flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setIsObservationModalOpen(
                              true
                            );
                          }}
                          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm font-medium text-zinc-300 transition-all hover:bg-white/[0.06] hover:text-white"
                        >
                          <MessageSquare className="size-4" />

                          {
                            ticket.observations
                              .length
                          }{" "}
                          observações
                        </button>

                        <button
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setIsAddStudyModalOpen(
                              true
                            );
                          }}
                          className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm font-medium text-zinc-300 transition-all hover:bg-white/[0.06] hover:text-white"
                        >
                          <BookOpen className="size-4" />
                          Estudo
                        </button>

                        <button
                          onClick={() =>
                            handleToggleStatus(ticket)
                          }
                          className={cn(
                            "inline-flex h-11 items-center justify-center rounded-2xl px-4 text-sm font-medium transition-all",
                            isOpen
                              ? "bg-emerald-500 text-black hover:bg-emerald-400"
                              : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                          )}
                        >
                          {isOpen
                            ? "Fechar"
                            : "Reabrir"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* ====================================================== */}
        {/* MODALS */}
        {/* ====================================================== */}

        <TicketModal
          isOpen={isTicketModalOpen}
          onClose={() => {
            setIsTicketModalOpen(false);
            setEditingTicket(undefined);
          }}
          onSubmit={handleCreateTicket}
          ticket={editingTicket}
        />

        {selectedTicket && (
          <>
            <ObservationModal
              isOpen={isObservationModalOpen}
              onClose={() => {
                setIsObservationModalOpen(false);
                setSelectedTicket(null);
              }}
              onSubmit={handleAddObservation}
              observations={selectedTicket.observations}
              ticketId={selectedTicket.id}
              onDeleteObservation={(obsId: string) =>
                handleDeleteObservation(
                  selectedTicket.id,
                  obsId
                )
              }
            />

            <AddStudyToTicketModal
              isOpen={isAddStudyModalOpen}
              onClose={() => {
                setIsAddStudyModalOpen(false);
                setSelectedTicket(null);
              }}
              onSubmit={
                handleCreateStudyFromTicket
              }
              ticketId={selectedTicket.id}
              ticketNumber={
                selectedTicket.ticketNumber
              }
              ticketDescription={
                selectedTicket.description
              }
              categories={categories}
            />
          </>
        )}
      </div>
    </div>
  );
};

// ======================================================
// FILTER SELECT
// ======================================================

interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: {
    label: string;
    value: string;
  }[];
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: FilterSelectProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-zinc-400">
        {label}
      </label>

      <select
        value={value}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white outline-none transition-all focus:border-sky-500/40"
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-[#09090b]"
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export default TicketsPage;