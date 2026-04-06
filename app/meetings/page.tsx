'use client';

import React, { useEffect, useState, useCallback, useMemo, useRef, Fragment } from "react";
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
  arrayRemove,
  serverTimestamp,
  getDoc,
  writeBatch,
  onSnapshot,
  limit,
  increment,
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { Dialog, Menu, Transition } from "@headlessui/react";
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
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Download,
  Upload,
  Copy,
  Link,
  Mail,
  MessageSquare,
  Bell,
  CheckCircle,
  Circle,
  Flag,
  Star,
  MoreVertical,
  Calendar as CalendarIcon,
  Clock as ClockIcon,
  UserPlus,
  UserMinus,
  Video,
  MapPin,
  Repeat,
  Archive,
  ArchiveRestore,
  RefreshCw,
  FileOutput,
  Sparkles,
  Zap,
  Brain,
  Target,
  BarChart,
  PieChart,
  TrendingUp,
  Share2,
  Printer,
  Bookmark,
  BookmarkPlus,
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  AtSign,
  Hash,
  Link2,
  Image,
  Paperclip,
  Mic,
  Send,
  Loader2,
  Lightbulb,
  Scale,
  Gavel,
  Vote,
  Fingerprint,
  Shield,
  Eye,
  EyeOff,
  Lock,
  Globe,
  Wifi,
  WifiOff,
  Battery,
  BatteryCharging,
  Thermometer,
  Wind,
  Cloud,
  Sun,
  Moon,
  Sunrise,
  Sunset,
  ChevronLeft,
  Compass,
  Navigation,
  Map as MapIcon,
  Layers,
  Grid,
  List,
  Menu as MenuIcon,
  Sidebar,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Headphones,
  MicOff,
  Camera,
  CameraOff,
  Monitor,
  MonitorOff,
  Smartphone,
  Tablet,
  Laptop,
  Cpu,
  HardDrive,
  Database,
  CloudOff,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  CloudFog,
  Umbrella,
  UmbrellaOff,
  Waves,
  Droplets,
  Flame,
  Snowflake,
  Tornado,
  Mountain,
  TreePine,
  Flower,
  Leaf,
  Wheat,
  Apple,
  Citrus,
  Banana,
  Cherry,
  Grape,
  Coffee,
  Beer,
  Wine,
  Martini,
  GlassWater,
  CupSoda,
  CookingPot,
  Pizza,
  Sandwich,
  Fish,
  Beef,
  Egg,
  Milk,
  Cookie,
  Candy,
  Cake,
  IceCream,
  User
} from "lucide-react";
import { format, formatDistance, isToday, isTomorrow, isThisWeek, isPast, addDays, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// ==================== TIPOS ====================

interface Participant {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
  present: boolean;
  joinedAt?: number;
  leftAt?: number;
}

interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  duration: number; // minutos
  presenter?: string;
  materials?: string[];
  status: "pending" | "in-progress" | "completed" | "skipped";
  notes?: string;
  decisions?: Decision[];
}

interface Decision {
  id: string;
  text: string;
  proposedBy: string;
  proposedAt: number;
  votedBy: string[];
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  status: "proposed" | "approved" | "rejected" | "deferred";
  approvedAt?: number;
  implemented?: boolean;
  implementedAt?: number;
  implementedBy?: string;
}

interface ActionItem {
  id: string;
  text: string;
  assignedTo: string[];
  dueDate?: number;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress" | "completed" | "blocked";
  createdAt: number;
  completedAt?: number;
  completedBy?: string;
  notes?: string;
  dependencies?: string[];
  tags?: string[];
}

interface Insight {
  id: string;
  text: string;
  type: "insight" | "question" | "risk" | "opportunity" | "blocker";
  raisedBy: string;
  raisedAt: number;
  resolved?: boolean;
  resolvedAt?: number;
  resolvedBy?: string;
  votes: string[];
  comments: Comment[];
}

interface Comment {
  id: string;
  text: string;
  userId: string;
  createdAt: number;
  edited?: boolean;
  editedAt?: number;
  replies?: Comment[];
  attachments?: string[];
}

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: number;
}

interface Poll {
  id: string;
  question: string;
  options: {
    id: string;
    text: string;
    votes: string[];
  }[];
  createdBy: string;
  createdAt: number;
  expiresAt?: number;
  multipleChoice: boolean;
  anonymous: boolean;
  status: "active" | "closed";
}

interface Metric {
  id: string;
  name: string;
  value: number;
  target?: number;
  unit?: string;
  trend?: "up" | "down" | "stable";
  updatedAt: number;
}

interface Meeting {
  id: string;
  title: string;
  description?: string;
  date: number;
  endDate?: number;
  duration?: number;
  timezone: string;
  location?: {
    type: "physical" | "virtual" | "hybrid";
    address?: string;
    room?: string;
    link?: string;
    password?: string;
  };
  organizer: string;
  organizerId: string;
  participants: Participant[];
  agenda: AgendaItem[];
  decisions: Decision[];
  actionItems: ActionItem[];
  insights: Insight[];
  attachments: Attachment[];
  polls: Poll[];
  metrics: Metric[];
  tags: string[];
  categories: string[];
  status: "scheduled" | "in-progress" | "completed" | "cancelled" | "postponed";
  visibility: "public" | "private" | "team";
  recurrence?: {
    frequency: "daily" | "weekly" | "monthly" | "yearly";
    interval: number;
    endDate?: number;
    exceptions?: number[];
  };
  minutes?: string;
  summary?: string;
  recording?: string;
  transcript?: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  lastModifiedBy?: string;
  version: number;
  template?: string;
  aiSummary?: string;
  aiKeyPoints?: string[];
  aiSentiment?: number;
  aiTopics?: string[];
}

// ==================== COMPONENTES AUXILIARES ====================

const StatusBadge = ({ status }: { status: Meeting["status"] }) => {
  const config = {
    scheduled: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Calendar, label: "Agendada" },
    "in-progress": { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", icon: Zap, label: "Em Andamento" },
    completed: { color: "bg-green-500/20 text-green-400 border-green-500/30", icon: CheckCircle, label: "Concluída" },
    cancelled: { color: "bg-red-500/20 text-red-400 border-red-500/30", icon: X, label: "Cancelada" },
    postponed: { color: "bg-purple-500/20 text-purple-400 border-purple-500/30", icon: Clock, label: "Adiada" },
  };
  const { color, icon: Icon, label } = config[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${color}`}>
      <Icon size={12} />
      {label}
    </span>
  );
};

const PriorityBadge = ({ priority }: { priority: ActionItem["priority"] }) => {
  const config = {
    low: { color: "bg-gray-500/20 text-gray-400", icon: Circle, label: "Baixa" },
    medium: { color: "bg-yellow-500/20 text-yellow-400", icon: Flag, label: "Média" },
    high: { color: "bg-red-500/20 text-red-400", icon: Star, label: "Alta" },
  };
  const { color, icon: Icon, label } = config[priority];
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${color}`}>
      <Icon size={12} />
      {label}
    </span>
  );
};

const DecisionBadge = ({ status }: { status: Decision["status"] }) => {
  const config = {
    proposed: { color: "bg-yellow-500/20 text-yellow-400", icon: Vote, label: "Proposta" },
    approved: { color: "bg-green-500/20 text-green-400", icon: CheckCircle, label: "Aprovada" },
    rejected: { color: "bg-red-500/20 text-red-400", icon: X, label: "Rejeitada" },
    deferred: { color: "bg-purple-500/20 text-purple-400", icon: Clock, label: "Adiada" },
  };
  const { color, icon: Icon, label } = config[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${color}`}>
      <Icon size={12} />
      {label}
    </span>
  );
};

const InsightBadge = ({ type }: { type: Insight["type"] }) => {
  const config = {
    insight: { color: "bg-blue-500/20 text-blue-400", icon: Lightbulb, label: "Insight" },
    question: { color: "bg-purple-500/20 text-purple-400", icon: MessageCircle, label: "Questão" },
    risk: { color: "bg-red-500/20 text-red-400", icon: AlertCircle, label: "Risco" },
    opportunity: { color: "bg-green-500/20 text-green-400", icon: Target, label: "Oportunidade" },
    blocker: { color: "bg-orange-500/20 text-orange-400", icon: Shield, label: "Bloqueio" },
  };
  const { color, icon: Icon, label } = config[type];
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${color}`}>
      <Icon size={12} />
      {label}
    </span>
  );
};

const ParticipantAvatar = ({ participant }: { participant: Participant }) => (
  <div className="relative group">
    <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-purple-500 flex items-center justify-center text-white text-sm font-medium overflow-hidden ${participant.present ? 'ring-2 ring-green-500' : 'opacity-50'}`}>
      {participant.avatar ? (
        <img src={participant.avatar} alt={participant.name} className="w-full h-full object-cover" />
      ) : (
        participant.name.charAt(0).toUpperCase()
      )}
    </div>
    {participant.present && (
      <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-zinc-900"></span>
    )}
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-800 text-xs text-white rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap pointer-events-none">
      {participant.name} • {participant.role}
      {participant.present ? ' • Presente' : ''}
    </div>
  </div>
);

const AgendaProgress = ({ items }: { items: AgendaItem[] }) => {
  const total = items.length;
  const completed = items.filter(i => i.status === "completed").length;
  const inProgress = items.filter(i => i.status === "in-progress").length;
  const percentage = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-zinc-400">
        <span>Progresso da Pauta</span>
        <span>{completed}/{total} itens • {inProgress} em andamento</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-sky-500 to-purple-500 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const VotingBar = ({ decision }: { decision: Decision }) => {
  const total = decision.votesFor + decision.votesAgainst + decision.votesAbstain;
  const forPercent = total > 0 ? (decision.votesFor / total) * 100 : 0;
  const againstPercent = total > 0 ? (decision.votesAgainst / total) * 100 : 0;
  const abstainPercent = total > 0 ? (decision.votesAbstain / total) * 100 : 0;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-green-400">{decision.votesFor} a favor</span>
        <span className="text-red-400">{decision.votesAgainst} contra</span>
        <span className="text-gray-400">{decision.votesAbstain} abstenções</span>
      </div>
      <div className="h-2 bg-zinc-800 rounded-full flex overflow-hidden">
        <div className="h-full bg-green-500" style={{ width: `${forPercent}%` }} />
        <div className="h-full bg-red-500" style={{ width: `${againstPercent}%` }} />
        <div className="h-full bg-gray-500" style={{ width: `${abstainPercent}%` }} />
      </div>
    </div>
  );
};

// ==================== COMPONENTE PRINCIPAL ====================

const MeetingsPage = () => {
  const user = auth.currentUser;

  // Estados principais
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  // UI States
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list" | "calendar">("grid");
  const [activeTab, setActiveTab] = useState<"overview" | "agenda" | "decisions" | "actions" | "insights" | "polls" | "attachments">("overview");

  // Filtros e busca
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<"all" | "today" | "week" | "month">("all");
  const [filterParticipant, setFilterParticipant] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Form states - Nova Reunião
  const [showNewMeeting, setShowNewMeeting] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newTime, setNewTime] = useState("10:00");
  const [newDuration, setNewDuration] = useState("60");
  const [newLocationType, setNewLocationType] = useState<"physical" | "virtual" | "hybrid">("virtual");
  const [newLocationAddress, setNewLocationAddress] = useState("");
  const [newLocationRoom, setNewLocationRoom] = useState("");
  const [newLocationLink, setNewLocationLink] = useState("");
  const [newLocationPassword, setNewLocationPassword] = useState("");
  const [newParticipants, setNewParticipants] = useState("");
  const [newTags, setNewTags] = useState("");
  const [newCategories, setNewCategories] = useState<string[]>([]);
  const [newVisibility, setNewVisibility] = useState<"public" | "private" | "team">("team");
  const [newRecurring, setNewRecurring] = useState(false);
  const [newRecurringFrequency, setNewRecurringFrequency] = useState<"daily" | "weekly" | "monthly" | "yearly">("weekly");
  const [newRecurringInterval, setNewRecurringInterval] = useState("1");
  const [newRecurringEndDate, setNewRecurringEndDate] = useState("");

  // Form states - Pauta
  const [showAgendaModal, setShowAgendaModal] = useState(false);
  const [agendaTitle, setAgendaTitle] = useState("");
  const [agendaDescription, setAgendaDescription] = useState("");
  const [agendaDuration, setAgendaDuration] = useState("15");
  const [agendaPresenter, setAgendaPresenter] = useState("");
  const [editingAgendaId, setEditingAgendaId] = useState<string | null>(null);

  // Form states - Decisão
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionText, setDecisionText] = useState("");
  const [editingDecisionId, setEditingDecisionId] = useState<string | null>(null);

  // Form states - Ação
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionText, setActionText] = useState("");
  const [actionAssignedTo, setActionAssignedTo] = useState("");
  const [actionDueDate, setActionDueDate] = useState("");
  const [actionPriority, setActionPriority] = useState<ActionItem["priority"]>("medium");
  const [editingActionId, setEditingActionId] = useState<string | null>(null);

  // Form states - Insight
  const [showInsightModal, setShowInsightModal] = useState(false);
  const [insightText, setInsightText] = useState("");
  const [insightType, setInsightType] = useState<Insight["type"]>("insight");
  const [editingInsightId, setEditingInsightId] = useState<string | null>(null);

  // Form states - Poll
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollMultipleChoice, setPollMultipleChoice] = useState(false);
  const [pollAnonymous, setPollAnonymous] = useState(false);
  const [pollExpires, setPollExpires] = useState(false);
  const [pollExpiryDate, setPollExpiryDate] = useState("");

  // View/Edit states
  const [showViewMeeting, setShowViewMeeting] = useState(false);
  const [showEditMeeting, setShowEditMeeting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState("");

  // AI Summary states
  const [generatingAISummary, setGeneratingAISummary] = useState(false);
  const [showAISummary, setShowAISummary] = useState(false);

  // Fetch meetings em tempo real
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, "meetings"),
        where("organizerId", "==", user.uid),
        orderBy("date", "desc")
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data: Meeting[] = [];
        snapshot.forEach((doc) => {
          data.push({ id: doc.id, ...doc.data() } as Meeting);
        });
        setMeetings(data);
        setLoading(false);
      }, (error) => {
        console.error("Erro no snapshot:", error);
        setError("Erro ao carregar reuniões");
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Erro ao configurar listener:", error);
      setError("Erro ao carregar reuniões");
      setLoading(false);
    }
  }, [user]);

  // Filtrar meetings
  const filteredMeetings = useMemo(() => {
    let filtered = [...meetings];

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(searchLower) ||
        m.description?.toLowerCase().includes(searchLower) ||
        m.participants.some(p => p.name.toLowerCase().includes(searchLower)) ||
        m.tags.some(t => t.toLowerCase().includes(searchLower))
      );
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter(m => m.status === filterStatus);
    }

    if (filterDate !== "all") {
      const now = new Date();
      const today = now.setHours(0, 0, 0, 0);
      const weekEnd = addDays(now, 7).setHours(23, 59, 59, 999);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).setHours(23, 59, 59, 999);

      filtered = filtered.filter(m => {
        const meetingDate = m.date;
        if (filterDate === "today") return meetingDate >= today && meetingDate < today + 86400000;
        if (filterDate === "week") return meetingDate >= today && meetingDate <= weekEnd;
        if (filterDate === "month") return meetingDate >= today && meetingDate <= monthEnd;
        return true;
      });
    }

    if (filterParticipant) {
      filtered = filtered.filter(m =>
        m.participants.some(p => p.id === filterParticipant)
      );
    }

    if (selectedTags.length > 0) {
      filtered = filtered.filter(m =>
        m.tags.some(t => selectedTags.includes(t))
      );
    }

    return filtered;
  }, [meetings, search, filterStatus, filterDate, filterParticipant, selectedTags]);

  // Paginação
  const paginatedMeetings = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredMeetings.slice(start, start + itemsPerPage);
  }, [filteredMeetings, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredMeetings.length / itemsPerPage);

  // Resetar página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, filterDate, filterParticipant, selectedTags]);

  // Create meeting
  const handleCreateMeeting = async () => {
    if (!user || !newTitle || !newDate) return;

    setLoading(true);
    try {
      const dateTime = new Date(`${newDate}T${newTime}`).getTime();
      const participantsList = newParticipants.split(",").map(p => p.trim()).filter(Boolean).map((email, index) => ({
        id: `temp-${index}`,
        name: email.split('@')[0],
        email,
        role: "Participante",
        present: false,
      }));
      const tagsList = newTags.split(",").map(t => t.trim()).filter(Boolean);

      const meetingData: Omit<Meeting, "id"> = {
        title: newTitle,
        description: newDescription || undefined,
        date: dateTime,
        endDate: dateTime + (parseInt(newDuration) * 60000),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        location: (newLocationLink || newLocationAddress) ? {
          type: newLocationType,
          ...(newLocationAddress && { address: newLocationAddress }),
          ...(newLocationRoom && { room: newLocationRoom }),
          ...(newLocationLink && { link: newLocationLink }),
          ...(newLocationPassword && { password: newLocationPassword }),
        } : undefined,
        organizer: user.displayName || user.email?.split('@')[0] || "Organizador",
        organizerId: user.uid,
        participants: participantsList,
        agenda: [],
        decisions: [],
        actionItems: [],
        insights: [],
        attachments: [],
        polls: [],
        metrics: [],
        tags: tagsList,
        categories: newCategories,
        status: "scheduled",
        visibility: newVisibility,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdBy: user.uid,
        version: 1,
      };

      if (newRecurring) {
        meetingData.recurrence = {
          frequency: newRecurringFrequency,
          interval: parseInt(newRecurringInterval),
          ...(newRecurringEndDate && { endDate: new Date(newRecurringEndDate).getTime() }),
        };
      }
      await addDoc(collection(db, "meetings"), meetingData);

      // Reset form
      setNewTitle("");
      setNewDescription("");
      setNewDate(new Date().toISOString().split("T")[0]);
      setNewTime("10:00");
      setNewDuration("60");
      setNewLocationType("virtual");
      setNewLocationAddress("");
      setNewLocationRoom("");
      setNewLocationLink("");
      setNewLocationPassword("");
      setNewParticipants("");
      setNewTags("");
      setNewCategories([]);
      setNewVisibility("team");
      setNewRecurring(false);
      setShowNewMeeting(false);
    } catch (error) {
      console.error("Erro ao criar reunião:", error);
      alert("Erro ao criar reunião");
    } finally {
      setLoading(false);
    }
  };

  // Add agenda item
  const handleAddAgendaItem = async () => {
    if (!selectedMeeting || !agendaTitle) return;

    try {
      const meetingRef = doc(db, "meetings", selectedMeeting.id);
      const newItem: AgendaItem = {
        id: Date.now().toString(),
        title: agendaTitle,
        description: agendaDescription || undefined,
        duration: parseInt(agendaDuration),
        presenter: agendaPresenter || undefined,
        status: "pending",
      };

      await updateDoc(meetingRef, {
        agenda: arrayUnion(newItem),
        updatedAt: Date.now(),
      });

      setAgendaTitle("");
      setAgendaDescription("");
      setAgendaDuration("15");
      setAgendaPresenter("");
      setShowAgendaModal(false);
    } catch (error) {
      console.error("Erro ao adicionar item de pauta:", error);
    }
  };

  // Add decision
  const handleAddDecision = async () => {
    if (!selectedMeeting || !decisionText) return;

    try {
      const meetingRef = doc(db, "meetings", selectedMeeting.id);
      const newDecision: Decision = {
        id: Date.now().toString(),
        text: decisionText,
        proposedBy: user?.uid || "",
        proposedAt: Date.now(),
        votedBy: [],
        votesFor: 0,
        votesAgainst: 0,
        votesAbstain: 0,
        status: "proposed",
      };

      await updateDoc(meetingRef, {
        decisions: arrayUnion(newDecision),
        updatedAt: Date.now(),
      });

      setDecisionText("");
      setShowDecisionModal(false);
    } catch (error) {
      console.error("Erro ao adicionar decisão:", error);
    }
  };

  // Add action item
  const handleAddActionItem = async () => {
    if (!selectedMeeting || !actionText) return;

    try {
      const meetingRef = doc(db, "meetings", selectedMeeting.id);
      const assignedToList = actionAssignedTo.split(",").map(a => a.trim()).filter(Boolean);
      const newAction: ActionItem = {
        id: Date.now().toString(),
        text: actionText,
        assignedTo: assignedToList,
        dueDate: actionDueDate ? new Date(actionDueDate).getTime() : undefined,
        priority: actionPriority,
        status: "pending",
        createdAt: Date.now(),
      };

      await updateDoc(meetingRef, {
        actionItems: arrayUnion(newAction),
        updatedAt: Date.now(),
      });

      setActionText("");
      setActionAssignedTo("");
      setActionDueDate("");
      setActionPriority("medium");
      setShowActionModal(false);
    } catch (error) {
      console.error("Erro ao adicionar ação:", error);
    }
  };

  // Add insight
  const handleAddInsight = async () => {
    if (!selectedMeeting || !insightText) return;

    try {
      const meetingRef = doc(db, "meetings", selectedMeeting.id);
      const newInsight: Insight = {
        id: Date.now().toString(),
        text: insightText,
        type: insightType,
        raisedBy: user?.uid || "",
        raisedAt: Date.now(),
        votes: [],
        comments: [],
      };

      await updateDoc(meetingRef, {
        insights: arrayUnion(newInsight),
        updatedAt: Date.now(),
      });

      setInsightText("");
      setInsightType("insight");
      setShowInsightModal(false);
    } catch (error) {
      console.error("Erro ao adicionar insight:", error);
    }
  };

  // Add poll
  const handleAddPoll = async () => {
    if (!selectedMeeting || !pollQuestion || pollOptions.some(o => !o.trim())) return;

    try {
      const meetingRef = doc(db, "meetings", selectedMeeting.id);
      const newPoll: Poll = {
        id: Date.now().toString(),
        question: pollQuestion,
        options: pollOptions.filter(o => o.trim()).map((text, index) => ({
          id: `opt-${index}-${Date.now()}`,
          text,
          votes: [],
        })),
        createdBy: user?.uid || "",
        createdAt: Date.now(),
        expiresAt: pollExpires && pollExpiryDate ? new Date(pollExpiryDate).getTime() : undefined,
        multipleChoice: pollMultipleChoice,
        anonymous: pollAnonymous,
        status: "active",
      };

      await updateDoc(meetingRef, {
        polls: arrayUnion(newPoll),
        updatedAt: Date.now(),
      });

      setPollQuestion("");
      setPollOptions(["", ""]);
      setPollMultipleChoice(false);
      setPollAnonymous(false);
      setPollExpires(false);
      setPollExpiryDate("");
      setShowPollModal(false);
    } catch (error) {
      console.error("Erro ao adicionar enquete:", error);
    }
  };

  // Vote on decision
  const handleVote = async (decisionId: string, vote: "for" | "against" | "abstain") => {
    if (!selectedMeeting || !user) return;

    try {
      const meetingRef = doc(db, "meetings", selectedMeeting.id);
      const decision = selectedMeeting.decisions.find(d => d.id === decisionId);
      if (!decision) return;

      const hasVoted = decision.votedBy.includes(user.uid);

      let updates: any = {
        updatedAt: Date.now(),
      };

      if (hasVoted) {
        // Usuário já votou, apenas atualiza o voto (mantém votedBy o mesmo)
        const newVotesFor = vote === "for" ? decision.votesFor : decision.votesFor;
        const newVotesAgainst = vote === "against" ? decision.votesAgainst : decision.votesAgainst;
        const newVotesAbstain = vote === "abstain" ? decision.votesAbstain : decision.votesAbstain;

        updates[`decisions.${selectedMeeting.decisions.findIndex(d => d.id === decisionId)}.votesFor`] = newVotesFor;
        updates[`decisions.${selectedMeeting.decisions.findIndex(d => d.id === decisionId)}.votesAgainst`] = newVotesAgainst;
        updates[`decisions.${selectedMeeting.decisions.findIndex(d => d.id === decisionId)}.votesAbstain`] = newVotesAbstain;
      } else {
        // Adiciona voto
        const newVotedBy = [...decision.votedBy, user.uid];
        const newVotesFor = vote === "for" ? decision.votesFor + 1 : decision.votesFor;
        const newVotesAgainst = vote === "against" ? decision.votesAgainst + 1 : decision.votesAgainst;
        const newVotesAbstain = vote === "abstain" ? decision.votesAbstain + 1 : decision.votesAbstain;

        updates[`decisions.${selectedMeeting.decisions.findIndex(d => d.id === decisionId)}.votedBy`] = newVotedBy;
        updates[`decisions.${selectedMeeting.decisions.findIndex(d => d.id === decisionId)}.votesFor`] = newVotesFor;
        updates[`decisions.${selectedMeeting.decisions.findIndex(d => d.id === decisionId)}.votesAgainst`] = newVotesAgainst;
        updates[`decisions.${selectedMeeting.decisions.findIndex(d => d.id === decisionId)}.votesAbstain`] = newVotesAbstain;
      }

      await updateDoc(meetingRef, updates);
    } catch (error) {
      console.error("Erro ao votar:", error);
    }
  };

  // Update decision status
  const handleUpdateDecisionStatus = async (decisionId: string, status: Decision["status"]) => {
    if (!selectedMeeting) return;

    try {
      const meetingRef = doc(db, "meetings", selectedMeeting.id);
      const decisionIndex = selectedMeeting.decisions.findIndex(d => d.id === decisionId);

      const updates: any = {
        [`decisions.${decisionIndex}.status`]: status,
        updatedAt: Date.now(),
      };

      if (status === "approved" || status === "rejected") {
        updates[`decisions.${decisionIndex}.approvedAt`] = Date.now();
      }

      await updateDoc(meetingRef, updates);
    } catch (error) {
      console.error("Erro ao atualizar status da decisão:", error);
    }
  };

  // Update action item status
  const handleUpdateActionStatus = async (actionId: string, status: ActionItem["status"]) => {
    if (!selectedMeeting || !user) return;

    try {
      const meetingRef = doc(db, "meetings", selectedMeeting.id);
      const actionIndex = selectedMeeting.actionItems.findIndex(a => a.id === actionId);

      const updates: any = {
        [`actionItems.${actionIndex}.status`]: status,
        updatedAt: Date.now(),
      };

      if (status === "completed") {
        updates[`actionItems.${actionIndex}.completedAt`] = Date.now();
        updates[`actionItems.${actionIndex}.completedBy`] = user.uid;
      }

      await updateDoc(meetingRef, updates);
    } catch (error) {
      console.error("Erro ao atualizar status da ação:", error);
    }
  };

  // Update insight resolved status
  const handleToggleInsightResolved = async (insightId: string) => {
    if (!selectedMeeting || !user) return;

    try {
      const meetingRef = doc(db, "meetings", selectedMeeting.id);
      const insightIndex = selectedMeeting.insights.findIndex(i => i.id === insightId);
      const insight = selectedMeeting.insights[insightIndex];

      const updates: any = {
        [`insights.${insightIndex}.resolved`]: !insight.resolved,
        updatedAt: Date.now(),
      };

      if (!insight.resolved) {
        updates[`insights.${insightIndex}.resolvedAt`] = Date.now();
        updates[`insights.${insightIndex}.resolvedBy`] = user.uid;
      } else {
        updates[`insights.${insightIndex}.resolvedAt`] = null;
        updates[`insights.${insightIndex}.resolvedBy`] = null;
      }

      await updateDoc(meetingRef, updates);
    } catch (error) {
      console.error("Erro ao atualizar insight:", error);
    }
  };

  // Vote on insight
  const handleVoteInsight = async (insightId: string) => {
    if (!selectedMeeting || !user) return;

    try {
      const meetingRef = doc(db, "meetings", selectedMeeting.id);
      const insightIndex = selectedMeeting.insights.findIndex(i => i.id === insightId);
      const insight = selectedMeeting.insights[insightIndex];

      const hasVoted = insight.votes.includes(user.uid);
      const newVotes = hasVoted
        ? insight.votes.filter(id => id !== user.uid)
        : [...insight.votes, user.uid];

      await updateDoc(meetingRef, {
        [`insights.${insightIndex}.votes`]: newVotes,
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error("Erro ao votar no insight:", error);
    }
  };

  // Vote on poll
  const handleVotePoll = async (pollId: string, optionId: string) => {
    if (!selectedMeeting || !user) return;

    try {
      const meetingRef = doc(db, "meetings", selectedMeeting.id);
      const pollIndex = selectedMeeting.polls.findIndex(p => p.id === pollId);
      const poll = selectedMeeting.polls[pollIndex];

      const optionIndex = poll.options.findIndex(o => o.id === optionId);
      const option = poll.options[optionIndex];

      const hasVoted = option.votes.includes(user.uid);

      if (poll.multipleChoice) {
        // Multiple choice - pode votar em várias opções
        const newVotes = hasVoted
          ? option.votes.filter(id => id !== user.uid)
          : [...option.votes, user.uid];

        await updateDoc(meetingRef, {
          [`polls.${pollIndex}.options.${optionIndex}.votes`]: newVotes,
          updatedAt: Date.now(),
        });
      } else {
        // Single choice - remove votos de outras opções
        const batch = writeBatch(db);

        poll.options.forEach((opt, idx) => {
          if (opt.id === optionId) {
            batch.update(meetingRef, {
              [`polls.${pollIndex}.options.${idx}.votes`]: [user.uid],
            });
          } else {
            batch.update(meetingRef, {
              [`polls.${pollIndex}.options.${idx}.votes`]: opt.votes.filter(id => id !== user.uid),
            });
          }
        });

        await batch.commit();
      }
    } catch (error) {
      console.error("Erro ao votar na enquete:", error);
    }
  };

  // Generate AI Summary
  const generateAISummary = async () => {
    if (!selectedMeeting) return;

    setGeneratingAISummary(true);
    try {
      // Simular chamada de IA (substituir por API real)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const meetingRef = doc(db, "meetings", selectedMeeting.id);

      const decisions = selectedMeeting.decisions
        .filter(d => d.status === "approved")
        .map(d => d.text)
        .join(", ");

      const actions = selectedMeeting.actionItems
        .filter(a => a.status !== "completed")
        .map(a => `${a.text} (${a.assignedTo.join(", ")})`)
        .join(", ");

      const insights = selectedMeeting.insights
        .filter(i => !i.resolved)
        .map(i => i.text)
        .join(", ");

      const aiSummary = `**Resumo da Reunião**\n\n` +
        `**Principais Decisões:** ${decisions || "Nenhuma decisão registrada"}\n\n` +
        `**Ações Pendentes:** ${actions || "Nenhuma ação pendente"}\n\n` +
        `**Insights em Aberto:** ${insights || "Nenhum insight pendente"}\n\n` +
        `**Participantes Presentes:** ${selectedMeeting.participants.filter(p => p.present).length} de ${selectedMeeting.participants.length}`;

      const keyPoints = [
        `${selectedMeeting.decisions.filter(d => d.status === "approved").length} decisões aprovadas`,
        `${selectedMeeting.actionItems.filter(a => a.status === "pending").length} ações pendentes`,
        `${selectedMeeting.insights.filter(i => !i.resolved).length} insights em aberto`,
        `${selectedMeeting.polls.filter(p => p.status === "active").length} enquetes ativas`,
      ];

      await updateDoc(meetingRef, {
        aiSummary,
        aiKeyPoints: keyPoints,
        aiSentiment: Math.random() * 100, // Simulado
        aiTopics: selectedMeeting.tags,
        updatedAt: Date.now(),
      });

      setShowAISummary(true);
    } catch (error) {
      console.error("Erro ao gerar resumo com IA:", error);
    } finally {
      setGeneratingAISummary(false);
    }
  };

  // Mark participant presence
  const handleTogglePresence = async (participantId: string) => {
    if (!selectedMeeting || !user) return;

    try {
      const meetingRef = doc(db, "meetings", selectedMeeting.id);
      const participantIndex = selectedMeeting.participants.findIndex(p => p.id === participantId);
      const participant = selectedMeeting.participants[participantIndex];

      const isPresent = !participant.present;

      await updateDoc(meetingRef, {
        [`participants.${participantIndex}.present`]: isPresent,
        [`participants.${participantIndex}.${isPresent ? 'joinedAt' : 'leftAt'}`]: Date.now(),
        updatedAt: Date.now(),
      });
    } catch (error) {
      console.error("Erro ao marcar presença:", error);
    }
  };

  // Delete meeting
  const handleDeleteMeeting = async () => {
    if (!deleteId) return;

    try {
      await deleteDoc(doc(db, "meetings", deleteId));
      setShowDeleteConfirm(false);
      setDeleteId("");
      if (selectedMeeting?.id === deleteId) {
        setSelectedMeeting(null);
        setShowViewMeeting(false);
      }
    } catch (error) {
      console.error("Erro ao deletar reunião:", error);
      alert("Erro ao deletar reunião");
    }
  };

  // Get all unique tags
  const allTags = useMemo(() => {
    const tags = meetings.flatMap(m => m.tags);
    return [...new Set(tags)];
  }, [meetings]);

  // Get all unique participants
  const allParticipants = useMemo(() => {
    const participants = meetings.flatMap(m => m.participants);
    const unique = new Map();
    participants.forEach(p => unique.set(p.id, p));
    return Array.from(unique.values());
  }, [meetings]);

  // Open edit modal (simplificado)
  const openEditModal = (meeting: Meeting) => {
    // Implementar conforme necessário
    console.log("Editar reunião:", meeting.id);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 to-zinc-900">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} w-64 bg-zinc-900/50 border-r border-zinc-800 backdrop-blur-xl transition-transform duration-200 ease-in-out z-30`}>
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-sky-400" />
              Reuniões
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {/* Quick Filters */}
            <div className="space-y-2 mb-6">
              <button
                onClick={() => {
                  setFilterStatus("all");
                  setFilterDate("today");
                }}
                className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2"
              >
                <Sun size={14} className="text-yellow-400" />
                Hoje
              </button>
              <button
                onClick={() => {
                  setFilterStatus("in-progress");
                }}
                className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2"
              >
                <Zap size={14} className="text-yellow-400" />
                Em Andamento
              </button>
              <button
                onClick={() => {
                  setFilterStatus("completed");
                }}
                className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2"
              >
                <CheckCircle size={14} className="text-green-400" />
                Concluídas
              </button>
            </div>

            {/* Tags */}
            <div className="mb-6">
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Tags</h3>
              <div className="space-y-1">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSelectedTags(prev =>
                        prev.includes(tag)
                          ? prev.filter(t => t !== tag)
                          : [...prev, tag]
                      );
                    }}
                    className={`w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-2 ${selectedTags.includes(tag)
                      ? 'bg-sky-500/20 text-sky-400'
                      : 'text-zinc-400 hover:bg-zinc-800'
                      }`}
                  >
                    <Hash size={12} />
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Participants */}
            <div>
              <h3 className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Participantes</h3>
              <div className="space-y-1">
                {allParticipants.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setFilterParticipant(filterParticipant === p.id ? "" : p.id)}
                    className={`w-full text-left px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-2 ${filterParticipant === p.id
                      ? 'bg-sky-500/20 text-sky-400'
                      : 'text-zinc-400 hover:bg-zinc-800'
                      }`}
                  >
                    <User size={12} />
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-zinc-800">
            <button
              onClick={() => setSidebarOpen(false)}
              className="w-full px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ChevronLeft size={14} />
              Recolher
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-200 ${sidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
              >
                <MenuIcon className="w-5 h-5 text-zinc-400" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-white">Reuniões Inteligentes</h1>
                <p className="text-sm text-zinc-400">
                  {filteredMeetings.length} {filteredMeetings.length === 1 ? 'reunião' : 'reuniões'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* View Mode */}
              <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded ${viewMode === "grid" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"}`}
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded ${viewMode === "list" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"}`}
                >
                  <List size={16} />
                </button>
                <button
                  onClick={() => setViewMode("calendar")}
                  className={`p-2 rounded ${viewMode === "calendar" ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"}`}
                >
                  <Calendar size={16} />
                </button>
              </div>

              <button
                onClick={() => setShowNewMeeting(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-sky-500 to-purple-500 hover:from-sky-600 hover:to-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Plus size={16} />
                Nova Reunião
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 mb-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por título, descrição, participantes ou tags..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
              >
                <option value="all">Todos os status</option>
                <option value="scheduled">Agendadas</option>
                <option value="in-progress">Em andamento</option>
                <option value="completed">Concluídas</option>
                <option value="cancelled">Canceladas</option>
                <option value="postponed">Adiadas</option>
              </select>

              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value as any)}
                className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
              >
                <option value="all">Qualquer data</option>
                <option value="today">Hoje</option>
                <option value="week">Esta semana</option>
                <option value="month">Este mês</option>
              </select>
            </div>
          </div>

          {/* Meetings Grid/List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-zinc-700 border-t-sky-500 animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-sky-400 animate-pulse" />
                </div>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400">{error}</p>
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="text-center py-12 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <Brain className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Nenhuma reunião encontrada</h3>
              <p className="text-zinc-400 text-sm mb-6">
                {search ? "Tente buscar por outros termos" : "Comece criando sua primeira reunião"}
              </p>
              <button
                onClick={() => setShowNewMeeting(true)}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-sky-500 to-purple-500 text-white px-6 py-2 rounded-lg hover:from-sky-600 hover:to-purple-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nova Reunião
              </button>
            </div>
          ) : (
            <>
              {viewMode === "grid" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {paginatedMeetings.map((meeting) => (
                    <div
                      key={meeting.id}
                      onClick={() => {
                        setSelectedMeeting(meeting);
                        setShowViewMeeting(true);
                      }}
                      className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 hover:border-sky-500/50 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">{meeting.title}</h3>
                          <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                            {meeting.description || "Sem descrição"}
                          </p>
                        </div>
                        <StatusBadge status={meeting.status} />
                      </div>

                      <div className="flex items-center gap-4 text-xs text-zinc-400 mb-3">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {format(new Date(meeting.date), "dd/MM HH:mm")}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {meeting.participants.length}
                        </span>
                        {(meeting as Meeting).duration && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {(meeting as Meeting).duration}min
                          </span>
                        )}
                      </div>

                      {/* Participants Avatars */}
                      <div className="flex -space-x-2 mb-3">
                        {meeting.participants.slice(0, 5).map((p) => (
                          <ParticipantAvatar key={p.id} participant={p} />
                        ))}
                        {meeting.participants.length > 5 && (
                          <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-white border-2 border-zinc-800">
                            +{meeting.participants.length - 5}
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      {meeting.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {meeting.tags.slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-0.5 bg-zinc-700 rounded-full text-zinc-300"
                            >
                              #{tag}
                            </span>
                          ))}
                          {meeting.tags.length > 3 && (
                            <span className="text-xs px-2 py-0.5 bg-zinc-700 rounded-full text-zinc-300">
                              +{meeting.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Progress for in-progress meetings */}
                      {meeting.status === "in-progress" && meeting.agenda.length > 0 && (
                        <div className="mt-3">
                          <AgendaProgress items={meeting.agenda} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 bg-zinc-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm text-zinc-400">
                    Página {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 bg-zinc-800 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* New Meeting Modal */}
      <Dialog
        open={showNewMeeting}
        onClose={() => setShowNewMeeting(false)}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="fixed inset-0 bg-black/50" />
        <Dialog.Panel className="relative bg-zinc-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-zinc-800">
          <div className="sticky top-0 bg-zinc-900 p-6 border-b border-zinc-800 flex items-center justify-between">
            <Dialog.Title className="text-xl font-bold text-white">
              Nova Reunião Inteligente
            </Dialog.Title>
            <button
              onClick={() => setShowNewMeeting(false)}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Informações Básicas */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Título da Reunião *
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Ex: Planejamento Sprint 15"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Descrição
              </label>
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Objetivos, contexto, pauta principal..."
                rows={3}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500 resize-none"
              />
            </div>

            {/* Data e Hora */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Data
                </label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Horário
                </label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            {/* Duração e Localização */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Duração (minutos)
                </label>
                <input
                  type="number"
                  value={newDuration}
                  onChange={(e) => setNewDuration(e.target.value)}
                  min="15"
                  step="15"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Tipo de Local
                </label>
                <select
                  value={newLocationType}
                  onChange={(e) => setNewLocationType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="virtual">Virtual</option>
                  <option value="physical">Presencial</option>
                  <option value="hybrid">Híbrido</option>
                </select>
              </div>
            </div>

            {/* Detalhes da Localização */}
            {newLocationType !== "virtual" && (
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Endereço / Sala
                </label>
                <input
                  type="text"
                  value={newLocationAddress}
                  onChange={(e) => setNewLocationAddress(e.target.value)}
                  placeholder="Ex: Sala 305, Edifício Central"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                />
              </div>
            )}

            {newLocationType !== "physical" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Link da Reunião
                  </label>
                  <input
                    type="url"
                    value={newLocationLink}
                    onChange={(e) => setNewLocationLink(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Senha (opcional)
                  </label>
                  <input
                    type="text"
                    value={newLocationPassword}
                    onChange={(e) => setNewLocationPassword(e.target.value)}
                    placeholder="Senha de acesso"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </>
            )}

            {/* Participantes */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Participantes (emails separados por vírgula)
              </label>
              <input
                type="text"
                value={newParticipants}
                onChange={(e) => setNewParticipants(e.target.value)}
                placeholder="joao@email.com, maria@email.com"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Tags e Categorias */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Tags (separadas por vírgula)
              </label>
              <input
                type="text"
                value={newTags}
                onChange={(e) => setNewTags(e.target.value)}
                placeholder="sprint, planejamento, produto"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Visibilidade */}
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Visibilidade
              </label>
              <select
                value={newVisibility}
                onChange={(e) => setNewVisibility(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
              >
                <option value="public">Público</option>
                <option value="team">Time</option>
                <option value="private">Privado</option>
              </select>
            </div>

            {/* Recorrência */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="recurring"
                checked={newRecurring}
                onChange={(e) => setNewRecurring(e.target.checked)}
                className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded focus:ring-sky-500"
              />
              <label htmlFor="recurring" className="text-sm text-zinc-300">
                Reunião recorrente
              </label>
            </div>

            {newRecurring && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Frequência
                  </label>
                  <select
                    value={newRecurringFrequency}
                    onChange={(e) => setNewRecurringFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="daily">Diária</option>
                    <option value="weekly">Semanal</option>
                    <option value="monthly">Mensal</option>
                    <option value="yearly">Anual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Intervalo
                  </label>
                  <input
                    type="number"
                    value={newRecurringInterval}
                    onChange={(e) => setNewRecurringInterval(e.target.value)}
                    min="1"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Data Final
                  </label>
                  <input
                    type="date"
                    value={newRecurringEndDate}
                    onChange={(e) => setNewRecurringEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="sticky bottom-0 bg-zinc-900 p-6 border-t border-zinc-800 flex justify-end gap-3">
            <button
              onClick={() => setShowNewMeeting(false)}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateMeeting}
              disabled={!newTitle || !newDate}
              className="px-4 py-2 bg-gradient-to-r from-sky-500 to-purple-500 hover:from-sky-600 hover:to-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Criar Reunião
            </button>
          </div>
        </Dialog.Panel>
      </Dialog>

      {/* View Meeting Modal */}
      <Dialog
        open={showViewMeeting && !!selectedMeeting}
        onClose={() => {
          setShowViewMeeting(false);
          setSelectedMeeting(null);
        }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="fixed inset-0 bg-black/50" />
        <Dialog.Panel className="relative bg-zinc-900 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-zinc-800">
          {selectedMeeting && (
            <>
              {/* Header */}
              <div className="sticky top-0 bg-zinc-900 p-6 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <StatusBadge status={selectedMeeting.status} />
                    <span className="text-sm text-zinc-400">
                      {format(new Date(selectedMeeting.date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                  <Dialog.Title className="text-2xl font-bold text-white">
                    {selectedMeeting.title}
                  </Dialog.Title>
                  {selectedMeeting.description && (
                    <p className="text-zinc-400 mt-1">{selectedMeeting.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={generateAISummary}
                    disabled={generatingAISummary}
                    className="p-2 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg transition-colors"
                    title="Gerar resumo com IA"
                  >
                    {generatingAISummary ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Brain className="w-5 h-5" />
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setShowViewMeeting(false);
                      openEditModal(selectedMeeting);
                    }}
                    className="p-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setDeleteId(selectedMeeting.id);
                      setShowDeleteConfirm(true);
                    }}
                    className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      setShowViewMeeting(false);
                      setSelectedMeeting(null);
                    }}
                    className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-zinc-400" />
                  </button>
                </div>
              </div>

              {/* AI Summary Banner */}
              {selectedMeeting.aiSummary && showAISummary && (
                <div className="mx-6 mt-4 p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Brain className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-purple-400 mb-2">Resumo Gerado por IA</h4>
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap">{selectedMeeting.aiSummary}</p>
                      {selectedMeeting.aiKeyPoints && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedMeeting.aiKeyPoints.map((point, idx) => (
                            <span
                              key={idx}
                              className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full"
                            >
                              {point}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setShowAISummary(false)}
                      className="text-zinc-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="px-6 mt-6 border-b border-zinc-800">
                <div className="flex gap-4 overflow-x-auto">
                  <button
                    onClick={() => setActiveTab("overview")}
                    className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === "overview"
                      ? "border-sky-500 text-white"
                      : "border-transparent text-zinc-400 hover:text-white"
                      }`}
                  >
                    Visão Geral
                  </button>
                  <button
                    onClick={() => setActiveTab("agenda")}
                    className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === "agenda"
                      ? "border-sky-500 text-white"
                      : "border-transparent text-zinc-400 hover:text-white"
                      }`}
                  >
                    Pauta
                  </button>
                  <button
                    onClick={() => setActiveTab("decisions")}
                    className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === "decisions"
                      ? "border-sky-500 text-white"
                      : "border-transparent text-zinc-400 hover:text-white"
                      }`}
                  >
                    Decisões
                  </button>
                  <button
                    onClick={() => setActiveTab("actions")}
                    className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === "actions"
                      ? "border-sky-500 text-white"
                      : "border-transparent text-zinc-400 hover:text-white"
                      }`}
                  >
                    Ações
                  </button>
                  <button
                    onClick={() => setActiveTab("insights")}
                    className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === "insights"
                      ? "border-sky-500 text-white"
                      : "border-transparent text-zinc-400 hover:text-white"
                      }`}
                  >
                    Insights
                  </button>
                  <button
                    onClick={() => setActiveTab("polls")}
                    className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 ${activeTab === "polls"
                      ? "border-sky-500 text-white"
                      : "border-transparent text-zinc-400 hover:text-white"
                      }`}
                  >
                    Enquetes
                  </button>
                </div>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {/* Overview Tab */}
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    {/* Participantes */}
                    <div>
                      <h3 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
                        <Users size={16} />
                        Participantes ({selectedMeeting.participants.length})
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {selectedMeeting.participants.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center gap-3 p-2 bg-zinc-800/50 rounded-lg"
                          >
                            <ParticipantAvatar participant={p} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{p.name}</p>
                              <p className="text-xs text-zinc-500">{p.role}</p>
                            </div>
                            {user?.uid === selectedMeeting.organizerId && (
                              <button
                                onClick={() => handleTogglePresence(p.id)}
                                className={`p-1 rounded transition-colors ${p.present
                                  ? 'text-green-400 hover:text-green-300'
                                  : 'text-zinc-600 hover:text-zinc-400'
                                  }`}
                                title={p.present ? 'Marcar como ausente' : 'Marcar como presente'}
                              >
                                {p.present ? <CheckCircle size={16} /> : <Circle size={16} />}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Localização */}
                    {selectedMeeting.location && (
                      <div>
                        <h3 className="text-sm font-medium text-zinc-400 mb-2">Localização</h3>
                        <div className="bg-zinc-800/50 rounded-lg p-3">
                          {selectedMeeting.location.type === "virtual" && (
                            <div className="space-y-1">
                              <a
                                href={selectedMeeting.location.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-400 hover:underline flex items-center gap-2"
                              >
                                <Video size={16} />
                                Link da reunião
                              </a>
                              {selectedMeeting.location.password && (
                                <p className="text-sm text-zinc-400 flex items-center gap-2">
                                  <Lock size={14} />
                                  Senha: {selectedMeeting.location.password}
                                </p>
                              )}
                            </div>
                          )}
                          {selectedMeeting.location.type === "physical" && (
                            <p className="text-zinc-300 flex items-center gap-2">
                              <MapPin size={16} />
                              {selectedMeeting.location.address}
                              {selectedMeeting.location.room && ` • Sala ${selectedMeeting.location.room}`}
                            </p>
                          )}
                          {selectedMeeting.location.type === "hybrid" && (
                            <div className="space-y-2">
                              <p className="text-zinc-300 flex items-center gap-2">
                                <MapPin size={16} />
                                {selectedMeeting.location.address}
                                {selectedMeeting.location.room && ` • Sala ${selectedMeeting.location.room}`}
                              </p>
                              <a
                                href={selectedMeeting.location.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sky-400 hover:underline flex items-center gap-2"
                              >
                                <Video size={16} />
                                Link virtual
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Métricas */}
                    {selectedMeeting.metrics.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-zinc-400 mb-2">Métricas</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {selectedMeeting.metrics.map((metric) => (
                            <div key={metric.id} className="bg-zinc-800/50 rounded-lg p-3">
                              <p className="text-xs text-zinc-400">{metric.name}</p>
                              <p className="text-lg font-bold text-white">
                                {metric.value}
                                {metric.unit && <span className="text-sm text-zinc-500 ml-1">{metric.unit}</span>}
                              </p>
                              {metric.target && (
                                <p className="text-xs text-zinc-500">
                                  Meta: {metric.target} {metric.unit}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tags */}
                    {selectedMeeting.tags.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-zinc-400 mb-2">Tags</h3>
                        <div className="flex flex-wrap gap-2">
                          {selectedMeeting.tags.map(tag => (
                            <span
                              key={tag}
                              className="text-xs px-2 py-1 bg-zinc-800 rounded-full text-zinc-300"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Agenda Tab */}
                {activeTab === "agenda" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium text-zinc-400">Itens da Pauta</h3>
                      <button
                        onClick={() => setShowAgendaModal(true)}
                        className="flex items-center gap-2 text-sm bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Plus size={16} />
                        Adicionar Item
                      </button>
                    </div>

                    {selectedMeeting.agenda.length === 0 ? (
                      <p className="text-center py-8 text-zinc-500">Nenhum item na pauta</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedMeeting.agenda.map((item) => (
                          <div
                            key={item.id}
                            className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h4 className="font-medium text-white">{item.title}</h4>
                                {item.description && (
                                  <p className="text-sm text-zinc-400 mt-1">{item.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-1 bg-zinc-700 rounded-full text-zinc-300">
                                  {item.duration}min
                                </span>
                                <span className={`text-xs px-2 py-1 rounded-full ${item.status === "completed" ? "bg-green-500/20 text-green-400" :
                                  item.status === "in-progress" ? "bg-yellow-500/20 text-yellow-400" :
                                    "bg-zinc-700 text-zinc-400"
                                  }`}>
                                  {item.status === "completed" ? "Concluído" :
                                    item.status === "in-progress" ? "Em andamento" :
                                      "Pendente"}
                                </span>
                              </div>
                            </div>
                            {item.presenter && (
                              <p className="text-xs text-zinc-500">Apresentador: {item.presenter}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Decisions Tab */}
                {activeTab === "decisions" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium text-zinc-400">Decisões</h3>
                      <button
                        onClick={() => setShowDecisionModal(true)}
                        className="flex items-center gap-2 text-sm bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Plus size={16} />
                        Nova Decisão
                      </button>
                    </div>

                    {selectedMeeting.decisions.length === 0 ? (
                      <p className="text-center py-8 text-zinc-500">Nenhuma decisão registrada</p>
                    ) : (
                      <div className="space-y-4">
                        {selectedMeeting.decisions.map((decision) => (
                          <div
                            key={decision.id}
                            className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <p className="text-white">{decision.text}</p>
                                <p className="text-xs text-zinc-500 mt-1">
                                  Proposto por {decision.proposedBy} em {format(decision.proposedAt, "dd/MM HH:mm")}
                                </p>
                              </div>
                              <DecisionBadge status={decision.status} />
                            </div>

                            <VotingBar decision={decision} />

                            {decision.status === "proposed" && (
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={() => handleVote(decision.id, "for")}
                                  className={`flex-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${decision.votedBy.includes(user?.uid || '')
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                                    }`}
                                >
                                  A Favor ({decision.votesFor})
                                </button>
                                <button
                                  onClick={() => handleVote(decision.id, "against")}
                                  className={`flex-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${decision.votedBy.includes(user?.uid || '')
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                    }`}
                                >
                                  Contra ({decision.votesAgainst})
                                </button>
                                <button
                                  onClick={() => handleVote(decision.id, "abstain")}
                                  className={`flex-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${decision.votedBy.includes(user?.uid || '')
                                    ? 'bg-gray-500/20 text-gray-400'
                                    : 'bg-gray-500/10 text-gray-400 hover:bg-gray-500/20'
                                    }`}
                                >
                                  Abstenção ({decision.votesAbstain})
                                </button>
                              </div>
                            )}

                            {decision.status === "proposed" && user?.uid === selectedMeeting.organizerId && (
                              <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-700">
                                <button
                                  onClick={() => handleUpdateDecisionStatus(decision.id, "approved")}
                                  className="flex-1 px-3 py-1.5 text-sm bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-colors"
                                >
                                  Aprovar
                                </button>
                                <button
                                  onClick={() => handleUpdateDecisionStatus(decision.id, "rejected")}
                                  className="flex-1 px-3 py-1.5 text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                                >
                                  Rejeitar
                                </button>
                                <button
                                  onClick={() => handleUpdateDecisionStatus(decision.id, "deferred")}
                                  className="flex-1 px-3 py-1.5 text-sm bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg transition-colors"
                                >
                                  Adiar
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions Tab */}
                {activeTab === "actions" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium text-zinc-400">Itens de Ação</h3>
                      <button
                        onClick={() => setShowActionModal(true)}
                        className="flex items-center gap-2 text-sm bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Plus size={16} />
                        Nova Ação
                      </button>
                    </div>

                    {selectedMeeting.actionItems.length === 0 ? (
                      <p className="text-center py-8 text-zinc-500">Nenhuma ação registrada</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedMeeting.actionItems.map((action) => (
                          <div
                            key={action.id}
                            className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <p className="text-white">{action.text}</p>
                                <div className="flex items-center gap-3 mt-2 text-xs">
                                  <span className="flex items-center gap-1 text-zinc-400">
                                    <Users size={12} />
                                    {action.assignedTo.join(", ")}
                                  </span>
                                  {action.dueDate && (
                                    <span className="flex items-center gap-1 text-zinc-400">
                                      <Calendar size={12} />
                                      {format(action.dueDate, "dd/MM/yyyy")}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <PriorityBadge priority={action.priority} />
                                <select
                                  value={action.status}
                                  onChange={(e) => handleUpdateActionStatus(action.id, e.target.value as any)}
                                  className="text-xs bg-zinc-700 border border-zinc-600 rounded px-2 py-1 text-white focus:outline-none focus:border-sky-500"
                                >
                                  <option value="pending">Pendente</option>
                                  <option value="in-progress">Em andamento</option>
                                  <option value="completed">Concluído</option>
                                  <option value="blocked">Bloqueado</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Insights Tab */}
                {activeTab === "insights" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium text-zinc-400">Insights</h3>
                      <button
                        onClick={() => setShowInsightModal(true)}
                        className="flex items-center gap-2 text-sm bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Plus size={16} />
                        Novo Insight
                      </button>
                    </div>

                    {selectedMeeting.insights.length === 0 ? (
                      <p className="text-center py-8 text-zinc-500">Nenhum insight registrado</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedMeeting.insights.map((insight) => (
                          <div
                            key={insight.id}
                            className={`bg-zinc-800/50 rounded-lg p-4 border ${insight.resolved ? 'border-green-500/20' : 'border-zinc-700'
                              }`}
                          >
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => handleVoteInsight(insight.id)}
                                className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${insight.votes.includes(user?.uid || '')
                                  ? 'bg-sky-500/20 text-sky-400'
                                  : 'bg-zinc-700 text-zinc-400 hover:bg-zinc-600'
                                  }`}
                              >
                                <ThumbsUp size={12} />
                                {insight.votes.length}
                              </button>
                              <div className="flex-1">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-2">
                                    <InsightBadge type={insight.type} />
                                    {insight.resolved && (
                                      <span className="text-xs px-2 py-0.5 bg-green-500/20 text-green-400 rounded-full">
                                        Resolvido
                                      </span>
                                    )}
                                  </div>
                                  {user?.uid === selectedMeeting.organizerId && (
                                    <button
                                      onClick={() => handleToggleInsightResolved(insight.id)}
                                      className="text-xs text-zinc-400 hover:text-white"
                                    >
                                      {insight.resolved ? 'Reabrir' : 'Resolver'}
                                    </button>
                                  )}
                                </div>
                                <p className="text-white mt-2">{insight.text}</p>
                                <p className="text-xs text-zinc-500 mt-2">
                                  Por {insight.raisedBy} • {format(insight.raisedAt, "dd/MM HH:mm")}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Polls Tab */}
                {activeTab === "polls" && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-sm font-medium text-zinc-400">Enquetes</h3>
                      <button
                        onClick={() => setShowPollModal(true)}
                        className="flex items-center gap-2 text-sm bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Plus size={16} />
                        Nova Enquete
                      </button>
                    </div>

                    {selectedMeeting.polls.length === 0 ? (
                      <p className="text-center py-8 text-zinc-500">Nenhuma enquete criada</p>
                    ) : (
                      <div className="space-y-4">
                        {selectedMeeting.polls.map((poll) => {
                          const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);

                          return (
                            <div key={poll.id} className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                              <h4 className="font-medium text-white mb-2">{poll.question}</h4>
                              <p className="text-xs text-zinc-500 mb-3">
                                {poll.multipleChoice ? "Múltipla escolha" : "Escolha única"} •
                                {poll.anonymous ? " Anônima" : " Votos públicos"} •
                                {totalVotes} voto{totalVotes !== 1 ? 's' : ''}
                              </p>

                              <div className="space-y-3">
                                {poll.options.map((option) => {
                                  const percentage = totalVotes > 0 ? (option.votes.length / totalVotes) * 100 : 0;
                                  const hasVoted = option.votes.includes(user?.uid || '');

                                  return (
                                    <div key={option.id}>
                                      <button
                                        onClick={() => handleVotePoll(poll.id, option.id)}
                                        disabled={poll.status !== "active"}
                                        className={`w-full text-left transition-colors ${poll.status !== "active" ? 'opacity-50 cursor-not-allowed' : ''
                                          }`}
                                      >
                                        <div className="flex justify-between text-sm mb-1">
                                          <span className={hasVoted ? 'text-sky-400' : 'text-zinc-300'}>
                                            {option.text}
                                            {hasVoted && ' ✓'}
                                          </span>
                                          <span className="text-zinc-400">{option.votes.length}</span>
                                        </div>
                                        <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full rounded-full ${hasVoted ? 'bg-sky-500' : 'bg-zinc-500'
                                              }`}
                                            style={{ width: `${percentage}%` }}
                                          />
                                        </div>
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </Dialog.Panel>
      </Dialog>

      {/* Agenda Modal */}
      <Dialog
        open={showAgendaModal}
        onClose={() => {
          setShowAgendaModal(false);
          setAgendaTitle("");
          setAgendaDescription("");
          setAgendaDuration("15");
          setAgendaPresenter("");
        }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      >
        <div className="fixed inset-0 bg-black/50" />
        <Dialog.Panel className="relative bg-zinc-900 rounded-xl max-w-md w-full border border-zinc-800">
          <div className="p-6">
            <Dialog.Title className="text-lg font-bold text-white mb-4">
              Novo Item de Pauta
            </Dialog.Title>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  value={agendaTitle}
                  onChange={(e) => setAgendaTitle(e.target.value)}
                  placeholder="Ex: Revisão do Roadmap"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Descrição
                </label>
                <textarea
                  value={agendaDescription}
                  onChange={(e) => setAgendaDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Duração (min)
                  </label>
                  <input
                    type="number"
                    value={agendaDuration}
                    onChange={(e) => setAgendaDuration(e.target.value)}
                    min="5"
                    step="5"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Apresentador
                  </label>
                  <input
                    type="text"
                    value={agendaPresenter}
                    onChange={(e) => setAgendaPresenter(e.target.value)}
                    placeholder="Nome"
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAgendaModal(false);
                  setAgendaTitle("");
                  setAgendaDescription("");
                  setAgendaDuration("15");
                  setAgendaPresenter("");
                }}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddAgendaItem}
                disabled={!agendaTitle}
                className="flex-1 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Adicionar
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </Dialog>

      {/* Decision Modal */}
      <Dialog
        open={showDecisionModal}
        onClose={() => {
          setShowDecisionModal(false);
          setDecisionText("");
        }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      >
        <div className="fixed inset-0 bg-black/50" />
        <Dialog.Panel className="relative bg-zinc-900 rounded-xl max-w-md w-full border border-zinc-800">
          <div className="p-6">
            <Dialog.Title className="text-lg font-bold text-white mb-4">
              Nova Decisão
            </Dialog.Title>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">
                Descrição da Decisão *
              </label>
              <textarea
                value={decisionText}
                onChange={(e) => setDecisionText(e.target.value)}
                rows={4}
                placeholder="Ex: Aprovar o uso da nova biblioteca de UI"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500 resize-none"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowDecisionModal(false);
                  setDecisionText("");
                }}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddDecision}
                disabled={!decisionText}
                className="flex-1 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Propor
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </Dialog>

      {/* Action Modal */}
      <Dialog
        open={showActionModal}
        onClose={() => {
          setShowActionModal(false);
          setActionText("");
          setActionAssignedTo("");
          setActionDueDate("");
          setActionPriority("medium");
        }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      >
        <div className="fixed inset-0 bg-black/50" />
        <Dialog.Panel className="relative bg-zinc-900 rounded-xl max-w-md w-full border border-zinc-800">
          <div className="p-6">
            <Dialog.Title className="text-lg font-bold text-white mb-4">
              Nova Ação
            </Dialog.Title>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Descrição *
                </label>
                <input
                  type="text"
                  value={actionText}
                  onChange={(e) => setActionText(e.target.value)}
                  placeholder="Ex: Atualizar documentação"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Responsáveis (separados por vírgula)
                </label>
                <input
                  type="text"
                  value={actionAssignedTo}
                  onChange={(e) => setActionAssignedTo(e.target.value)}
                  placeholder="joao, maria"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Data Limite
                  </label>
                  <input
                    type="date"
                    value={actionDueDate}
                    onChange={(e) => setActionDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">
                    Prioridade
                  </label>
                  <select
                    value={actionPriority}
                    onChange={(e) => setActionPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowActionModal(false);
                  setActionText("");
                  setActionAssignedTo("");
                  setActionDueDate("");
                  setActionPriority("medium");
                }}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddActionItem}
                disabled={!actionText}
                className="flex-1 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Criar Ação
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </Dialog>

      {/* Insight Modal */}
      <Dialog
        open={showInsightModal}
        onClose={() => {
          setShowInsightModal(false);
          setInsightText("");
          setInsightType("insight");
        }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      >
        <div className="fixed inset-0 bg-black/50" />
        <Dialog.Panel className="relative bg-zinc-900 rounded-xl max-w-md w-full border border-zinc-800">
          <div className="p-6">
            <Dialog.Title className="text-lg font-bold text-white mb-4">
              Novo Insight
            </Dialog.Title>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Tipo
                </label>
                <select
                  value={insightType}
                  onChange={(e) => setInsightType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="insight">💡 Insight</option>
                  <option value="question">❓ Questão</option>
                  <option value="risk">⚠️ Risco</option>
                  <option value="opportunity">🎯 Oportunidade</option>
                  <option value="blocker">🚫 Bloqueio</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Descrição *
                </label>
                <textarea
                  value={insightText}
                  onChange={(e) => setInsightText(e.target.value)}
                  rows={4}
                  placeholder="Compartilhe seu insight..."
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowInsightModal(false);
                  setInsightText("");
                  setInsightType("insight");
                }}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddInsight}
                disabled={!insightText}
                className="flex-1 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Compartilhar
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </Dialog>

      {/* Poll Modal */}
      <Dialog
        open={showPollModal}
        onClose={() => {
          setShowPollModal(false);
          setPollQuestion("");
          setPollOptions(["", ""]);
          setPollMultipleChoice(false);
          setPollAnonymous(false);
          setPollExpires(false);
          setPollExpiryDate("");
        }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      >
        <div className="fixed inset-0 bg-black/50" />
        <Dialog.Panel className="relative bg-zinc-900 rounded-xl max-w-md w-full border border-zinc-800">
          <div className="p-6">
            <Dialog.Title className="text-lg font-bold text-white mb-4">
              Nova Enquete
            </Dialog.Title>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Pergunta *
                </label>
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="Ex: Qual tecnologia devemos adotar?"
                  className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">
                  Opções
                </label>
                {pollOptions.map((option, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...pollOptions];
                        newOptions[index] = e.target.value;
                        setPollOptions(newOptions);
                      }}
                      placeholder={`Opção ${index + 1}`}
                      className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                    />
                    {pollOptions.length > 2 && (
                      <button
                        onClick={() => {
                          const newOptions = pollOptions.filter((_, i) => i !== index);
                          setPollOptions(newOptions);
                        }}
                        className="p-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setPollOptions([...pollOptions, ""])}
                  className="text-sm text-sky-400 hover:text-sky-300 flex items-center gap-1 mt-2"
                >
                  <Plus size={14} />
                  Adicionar opção
                </button>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={pollMultipleChoice}
                    onChange={(e) => setPollMultipleChoice(e.target.checked)}
                    className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded focus:ring-sky-500"
                  />
                  <span className="text-sm text-zinc-300">Permitir múltipla escolha</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={pollAnonymous}
                    onChange={(e) => setPollAnonymous(e.target.checked)}
                    className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded focus:ring-sky-500"
                  />
                  <span className="text-sm text-zinc-300">Votação anônima</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={pollExpires}
                    onChange={(e) => setPollExpires(e.target.checked)}
                    className="w-4 h-4 bg-zinc-800 border-zinc-700 rounded focus:ring-sky-500"
                  />
                  <span className="text-sm text-zinc-300">Definir data de expiração</span>
                </label>

                {pollExpires && (
                  <input
                    type="date"
                    value={pollExpiryDate}
                    onChange={(e) => setPollExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:border-sky-500"
                  />
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowPollModal(false);
                  setPollQuestion("");
                  setPollOptions(["", ""]);
                  setPollMultipleChoice(false);
                  setPollAnonymous(false);
                  setPollExpires(false);
                  setPollExpiryDate("");
                }}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddPoll}
                disabled={!pollQuestion || pollOptions.some(o => !o.trim())}
                className="flex-1 px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Criar Enquete
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog
        open={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteId("");
        }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      >
        <div className="fixed inset-0 bg-black/50" />
        <Dialog.Panel className="bg-zinc-900 rounded-lg max-w-sm w-full border border-red-500/50">
          <div className="p-6">
            <h3 className="text-lg font-bold text-white mb-4">Confirmar Exclusão</h3>
            <p className="text-zinc-300 mb-6">
              Tem certeza que deseja excluir esta reunião? Esta ação não pode ser desfeita e todos os dados associados serão perdidos.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteId("");
                }}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteMeeting}
                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </Dialog>
    </div>
  );
};

export default withAuth(MeetingsPage);