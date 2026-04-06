"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { Dialog } from "@headlessui/react";
import { 
  Plus, 
  Search, 
  X, 
  User, 
  Mail, 
  Briefcase, 
  Award, 
  ChevronRight,
  Users,
  Sparkles,
  TrendingUp,
  CheckCircle,
  Clock,
  Building2,
  AtSign,
  UserCircle,
  Filter,
  Tag
} from "lucide-react";
import { toast } from "react-toastify";

interface Skill {
  name: string;
  score: number;
  confirmedBy: string[];
  color: string;
}

interface UserData {
  uid: string;
  name: string;
  email: string;
  department?: string;
  bio?: string;
  skills?: Skill[];
  avatar?: string;
  createdAt?: Date;
  role?: string;
  noticeType?: "todos" | "analise" | "desenvolvimento" | "lideranca" | "sustentacao";
}

const DEPARTMENT_TYPES = [
  { value: "todos", label: "Todos", icon: "🌐", color: "bg-gray-500" },
  { value: "analise", label: "Análise", icon: "📊", color: "bg-pink-500" },
  { value: "desenvolvimento", label: "Desenvolvimento", icon: "💻", color: "bg-orange-500" },
  { value: "lideranca", label: "Liderança", icon: "👥", color: "bg-purple-500" },
  { value: "sustentacao", label: "Sustentação", icon: "🔧", color: "bg-green-500" },
] as const;

export default function UsersPage() {
  const currentUser = auth.currentUser;
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "skills">("name");
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const snap = await getDocs(collection(db, "profiles"));
        const allUsers: UserData[] = snap.docs
          .map((doc) => ({ uid: doc.id, ...doc.data() } as UserData))
          .filter((u) => u.uid !== currentUser?.uid);
        setUsers(allUsers);
      } catch (error) {
        console.error("Erro ao carregar usuários:", error);
        toast.error("Erro ao carregar usuários");
      } finally {
        setLoading(false);
      }
    };
    void loadUsers();
  }, [currentUser]);

  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users.filter((user) => {
      // Filtro por nome
      const nameMatch = user.name?.toLowerCase().includes(searchName.toLowerCase()) ?? true;
      
      // Filtro por email
      const emailMatch = user.email?.toLowerCase().includes(searchEmail.toLowerCase()) ?? true;
      
      // Filtro por setor/departamento
      let departmentMatch = true;
      if (selectedDepartment && selectedDepartment !== "todos") {
        // Verifica se o department do usuário corresponde ao selecionado
        // O campo pode ser department ou noticeType
        const userDept = user.department || user.noticeType;
        departmentMatch = userDept === selectedDepartment;
      } else if (selectedDepartment === "todos") {
        departmentMatch = true;
      }
      
      return nameMatch && emailMatch && departmentMatch;
    });

    // Sort users
    if (sortBy === "name") {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "skills") {
      filtered.sort((a, b) => (b.skills?.length || 0) - (a.skills?.length || 0));
    }

    return filtered;
  }, [users, searchName, searchEmail, selectedDepartment, sortBy]);

  const clearFilters = () => {
    setSearchName("");
    setSearchEmail("");
    setSelectedDepartment("");
    setSortBy("name");
  };

  const handleUserClick = (user: UserData) => {
    setSelectedUser(user);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedUser(null);
  };

  const totalUsers = filteredAndSortedUsers.length;
  const totalSkills = filteredAndSortedUsers.reduce(
    (acc, user) => acc + (user.skills?.length || 0), 
    0
  );

  // Contar usuários por departamento
  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    DEPARTMENT_TYPES.forEach(dept => {
      counts[dept.value] = users.filter(user => 
        (user.department || user.noticeType) === dept.value
      ).length;
    });
    return counts;
  }, [users]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 sm:p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4"></div>
            <p className="text-zinc-400">Carregando usuários...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500 mb-2 flex items-center gap-2">
                <Users size={28} className="text-sky-400" />
                Usuários
              </h1>
              <p className="text-zinc-400">
                Encontre e conecte-se com outros profissionais da sua equipe
              </p>
            </div>
            
            {/* Stats */}
            <div className="flex gap-3">
              <div className="bg-zinc-900/50 backdrop-blur-sm rounded-lg px-4 py-2 border border-zinc-800">
                <div className="text-2xl font-bold text-sky-400">{totalUsers}</div>
                <div className="text-xs text-zinc-500">Usuários</div>
              </div>
              <div className="bg-zinc-900/50 backdrop-blur-sm rounded-lg px-4 py-2 border border-zinc-800">
                <div className="text-2xl font-bold text-purple-400">{totalSkills}</div>
                <div className="text-xs text-zinc-500">Skills</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-6 mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 mb-4 text-zinc-300 hover:text-zinc-100 transition-colors"
          >
            <Filter size={18} />
            <span className="font-semibold">Filtros de Busca</span>
            <ChevronRight size={16} className={`transform transition-transform ${showFilters ? 'rotate-90' : ''}`} />
          </button>
          
          {showFilters && (
            <div className="space-y-4">
              {/* Search inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar por nome..."
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:border-sky-500 focus:outline-none transition-colors"
                  />
                </div>
                
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar por email..."
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:border-sky-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Department Filters */}
              <div>
                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2 mb-3">
                  <Building2 size={16} />
                  Filtrar por Setor
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedDepartment("")}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      !selectedDepartment
                        ? "bg-sky-500 text-white shadow-lg"
                        : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50"
                    }`}
                  >
                    Todos
                  </button>
                  {DEPARTMENT_TYPES.map((dept) => (
                    <button
                      key={dept.value}
                      onClick={() => setSelectedDepartment(dept.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                        selectedDepartment === dept.value
                          ? `${dept.color} text-white shadow-lg`
                          : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50"
                      }`}
                    >
                      <span>{dept.icon}</span>
                      <span>{dept.label}</span>
                      {departmentCounts[dept.value] > 0 && (
                        <span className={`ml-1 px-1.5 py-0.5 text-xs rounded-full ${
                          selectedDepartment === dept.value
                            ? "bg-white/20"
                            : "bg-zinc-700"
                        }`}>
                          {departmentCounts[dept.value]}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort and Clear */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-400">Ordenar por:</span>
                  <button
                    onClick={() => setSortBy("name")}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      sortBy === "name"
                        ? "bg-sky-500/20 text-sky-400 border border-sky-500/50"
                        : "bg-zinc-800/50 text-zinc-400 hover:text-zinc-300"
                    }`}
                  >
                    Nome
                  </button>
                  <button
                    onClick={() => setSortBy("skills")}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      sortBy === "skills"
                        ? "bg-sky-500/20 text-sky-400 border border-sky-500/50"
                        : "bg-zinc-800/50 text-zinc-400 hover:text-zinc-300"
                    }`}
                  >
                    Mais Skills
                  </button>
                </div>
                
                {(searchName || searchEmail || selectedDepartment) && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-2 px-3 py-1 text-sm text-red-400 hover:text-red-300 transition-colors"
                  >
                    <X size={16} />
                    Limpar todos os filtros
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Users Grid */}
        {filteredAndSortedUsers.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-zinc-900/50 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
              <Users size={48} className="text-zinc-600" />
            </div>
            <h3 className="text-xl font-semibold text-zinc-300 mb-2">
              Nenhum usuário encontrado
            </h3>
            <p className="text-zinc-500">
              {users.length === 0 
                ? "Não há outros usuários cadastrados no momento" 
                : "Nenhum usuário corresponde aos filtros aplicados"}
            </p>
            {(searchName || searchEmail || selectedDepartment) && (
              <button
                onClick={clearFilters}
                className="mt-4 text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-2 mx-auto"
              >
                Limpar filtros
                <X size={16} />
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAndSortedUsers.map((user) => (
              <UserCard
                key={user.uid}
                user={user}
                onClick={() => handleUserClick(user)}
              />
            ))}
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          isOpen={modalOpen}
          onClose={handleCloseModal}
          onSkillsUpdate={(updatedSkills) => {
            setUsers((prev) =>
              prev.map((u) =>
                u.uid === selectedUser.uid ? { ...u, skills: updatedSkills } : u
              )
            );
            setSelectedUser((prev) => prev ? {...prev, skills: updatedSkills} : null);
          }}
        />
      )}
    </div>
  );
}

interface UserCardProps {
  user: UserData;
  onClick: () => void;
}

function UserCard({ user, onClick }: UserCardProps) {
  const skillCount = user.skills?.length || 0;
  const department = user.department || user.noticeType;
  const departmentInfo = DEPARTMENT_TYPES.find(d => d.value === department);
  
  return (
    <div
      className="group bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-xl p-5 cursor-pointer hover:border-sky-500/50 hover:shadow-lg hover:shadow-sky-500/10 transition-all duration-300"
      onClick={onClick}
    >
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-14 h-14 rounded-full object-cover border-2 border-zinc-700 group-hover:border-sky-500 transition-colors"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
              <span className="text-white text-xl font-bold">
                {user.name?.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-zinc-100 group-hover:text-sky-400 transition-colors truncate">
                {user.name}
              </h2>
              {department && departmentInfo && (
                <span className={`inline-block text-xs ${departmentInfo.color} bg-opacity-20 px-2 py-0.5 rounded-full mt-1`}
                  style={{ backgroundColor: `${departmentInfo.color}20` }}
                >
                  {departmentInfo.icon} {departmentInfo.label}
                </span>
              )}
            </div>
            {skillCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-purple-400">
                <Award size={14} />
                <span>{skillCount}</span>
              </div>
            )}
          </div>
          
          <p className="text-zinc-400 text-sm mt-2 truncate">
            {user.email}
          </p>
          
          {user.bio && (
            <p className="text-zinc-500 text-xs mt-2 line-clamp-2">
              {user.bio}
            </p>
          )}

          {/* Skills Preview */}
          {user.skills && user.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {user.skills.slice(0, 2).map((skill) => (
                <span
                  key={skill.name}
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: `${skill.color}20`, color: skill.color }}
                >
                  {skill.name}
                </span>
              ))}
              {user.skills.length > 2 && (
                <span className="text-xs px-2 py-0.5 text-zinc-500">
                  +{user.skills.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface UserDetailModalProps {
  user: UserData;
  isOpen: boolean;
  onClose: () => void;
  onSkillsUpdate: (skills: Skill[]) => void;
}

function UserDetailModal({ user, isOpen, onClose, onSkillsUpdate }: UserDetailModalProps) {
  const currentUser = auth.currentUser;
  const [newSkillName, setNewSkillName] = useState("");
  const [addingSkill, setAddingSkill] = useState(false);

  const getRandomColor = () => {
    const colors = [
      "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
      "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1"
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const addSkill = async () => {
    if (!newSkillName.trim() || !currentUser) return;
    
    const skillExists = user.skills?.find(
      (s) => s.name.toLowerCase() === newSkillName.toLowerCase()
    );
    
    if (skillExists) {
      toast.error("Essa skill já foi adicionada!");
      return;
    }
    
    setAddingSkill(true);
    
    const newSkill: Skill = {
      name: newSkillName.trim(),
      score: 1,
      confirmedBy: [currentUser.uid],
      color: getRandomColor(),
    };
    
    const updatedSkills = [...(user.skills || []), newSkill];
    
    try {
      await updateDoc(doc(db, "profiles", user.uid), { skills: updatedSkills });
      onSkillsUpdate(updatedSkills);
      setNewSkillName("");
      toast.success(`Skill "${newSkill.name}" adicionada com sucesso!`);
    } catch (error) {
      console.error("Erro ao adicionar skill:", error);
      toast.error("Erro ao adicionar skill. Tente novamente.");
    } finally {
      setAddingSkill(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !addingSkill) {
      addSkill();
    }
  };

  const totalScore = user.skills?.reduce((acc, skill) => acc + skill.score, 0) || 0;
  const department = user.department || user.noticeType;
  const departmentInfo = DEPARTMENT_TYPES.find(d => d.value === department);

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-sky-600/20 to-blue-600/20 p-6 border-b border-zinc-800">
            <div className="flex justify-between items-start">
              <div className="flex gap-4">
                {/* Avatar */}
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-sky-500"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
                    <span className="text-white text-2xl font-bold">
                      {user.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                
                <div>
                  <Dialog.Title className="text-2xl font-bold text-zinc-100">
                    {user.name}
                  </Dialog.Title>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <div className="flex items-center gap-1 text-zinc-400">
                      <Mail size={14} />
                      <span className="text-sm">{user.email}</span>
                    </div>
                    {department && departmentInfo && (
                      <>
                        <span className="text-zinc-600">•</span>
                        <div className={`flex items-center gap-1 text-sm font-medium`}
                          style={{ color: departmentInfo.color.replace('bg-', 'text-') }}
                        >
                          <span>{departmentInfo.icon}</span>
                          <span>{departmentInfo.label}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X size={20} className="text-zinc-400" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {/* Bio */}
            {user.bio && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-zinc-100 mb-2 flex items-center gap-2">
                  <UserCircle size={20} className="text-sky-400" />
                  Sobre
                </h3>
                <p className="text-zinc-300 leading-relaxed bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                  {user.bio}
                </p>
              </div>
            )}

            {/* Skills Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                  <Award size={20} className="text-purple-400" />
                  Skills e Reconhecimentos
                </h3>
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-yellow-500" />
                  <span className="text-sm text-zinc-400">
                    {totalScore} pontos no total
                  </span>
                </div>
              </div>

              {/* Skills List */}
              {user.skills && user.skills.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {user.skills.map((skill) => (
                    <div
                      key={skill.name}
                      className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: skill.color }}
                          />
                          <span className="font-semibold text-zinc-100">{skill.name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp size={12} className="text-green-400" />
                          <span className="text-sm font-bold text-green-400">{skill.score}</span>
                        </div>
                      </div>
                      {skill.confirmedBy.length > 0 && (
                        <div className="flex items-center gap-1 text-xs text-zinc-500">
                          <CheckCircle size={10} />
                          <span>Confirmado por {skill.confirmedBy.length} pessoa(s)</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-zinc-800 rounded-lg mb-6">
                  <Award size={32} className="mx-auto text-zinc-600 mb-2" />
                  <p className="text-zinc-500">Nenhuma skill cadastrada ainda</p>
                </div>
              )}

              {/* Add Skill Form */}
              {currentUser && currentUser.uid !== user.uid && (
                <div className="bg-gradient-to-r from-sky-600/10 to-blue-600/10 rounded-lg p-4 border border-sky-500/20">
                  <h4 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                    <Plus size={14} className="text-sky-400" />
                    Reconhecer Skill
                  </h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Digite o nome da skill que deseja reconhecer..."
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={addingSkill}
                      className="flex-1 p-2 rounded-lg bg-zinc-800/50 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:border-sky-500 focus:outline-none transition-colors disabled:opacity-50"
                    />
                    <button
                      onClick={addSkill}
                      disabled={!newSkillName.trim() || addingSkill}
                      className="px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg"
                    >
                      {addingSkill ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Plus size={16} />
                      )}
                      Reconhecer
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">
                    Ao reconhecer uma skill, você está validando a expertise do colega
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end p-6 border-t border-zinc-800 bg-zinc-900/50">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-100"
            >
              Fechar
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}