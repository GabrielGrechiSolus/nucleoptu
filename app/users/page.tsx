"use client";

import React, { useEffect, useState, useMemo } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { Dialog } from "@headlessui/react";
import { Plus, Search, X } from "lucide-react";

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
}

export default function UsersPage() {
  const currentUser = auth.currentUser;
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchDept, setSearchDept] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

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
      } finally {
        setLoading(false);
      }
    };
    void loadUsers();
  }, [currentUser]);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const nameMatch = user.name?.toLowerCase().includes(searchName.toLowerCase()) ?? true;
      const emailMatch = user.email?.toLowerCase().includes(searchEmail.toLowerCase()) ?? true;
      const deptMatch = user.department?.toLowerCase().includes(searchDept.toLowerCase()) ?? true;
      
      return nameMatch && emailMatch && deptMatch;
    });
  }, [users, searchName, searchEmail, searchDept]);

  const clearFilters = () => {
    setSearchName("");
    setSearchEmail("");
    setSearchDept("");
  };

  const handleUserClick = (user: UserData) => {
    setSelectedUser(user);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedUser(null);
  };

  if (loading) {
    return (
      <div className="p-4 flex justify-center items-center min-h-64">
        <div className="text-zinc-400">Carregando usuários...</div>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-zinc-50">Usuários</h1>
        <p className="text-zinc-400">Encontre e conecte-se com outros profissionais</p>
      </div>

      {/* Search Filters */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Search size={20} className="text-blue-400" />
            <h3 className="text-lg font-semibold text-zinc-50">Filtros de Busca</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-zinc-400">Nome</label>
              <input
                type="text"
                placeholder="Buscar por nome"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className="p-2 rounded-lg border border-blue-500/50 bg-zinc-800 text-zinc-50 outline-none focus:border-blue-400 transition-colors"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-sm text-zinc-400">Email</label>
              <input
                type="text"
                placeholder="Buscar por email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="p-2 rounded-lg border border-blue-500/50 bg-zinc-800 text-zinc-50 outline-none focus:border-blue-400 transition-colors"
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label className="text-sm text-zinc-400">Setor</label>
              <input
                type="text"
                placeholder="Buscar por setor"
                value={searchDept}
                onChange={(e) => setSearchDept(e.target.value)}
                className="p-2 rounded-lg border border-blue-500/50 bg-zinc-800 text-zinc-50 outline-none focus:border-blue-400 transition-colors"
              />
            </div>
          </div>
          
          {(searchName || searchEmail || searchDept) && (
            <button
              onClick={clearFilters}
              className="self-start flex items-center gap-2 px-3 py-1 text-sm text-zinc-400 hover:text-zinc-300 transition-colors"
            >
              <X size={16} />
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="text-zinc-500 text-lg">
              {users.length === 0 ? "Nenhum usuário encontrado" : "Nenhum usuário corresponde aos filtros"}
            </div>
            {(searchName || searchEmail || searchDept) && (
              <button
                onClick={clearFilters}
                className="mt-2 text-blue-400 hover:text-blue-300 transition-colors"
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          filteredUsers.map((user) => (
            <UserCard
              key={user.uid}
              user={user}
              onClick={() => handleUserClick(user)}
            />
          ))
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
  return (
    <div
      className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 cursor-pointer hover:border-blue-400 hover:shadow-lg hover:shadow-blue-400/10 transition-all duration-300 group"
      onClick={onClick}
    >
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-bold text-zinc-50 group-hover:text-blue-400 transition-colors">
              {user.name}
            </h2>
            {user.department && (
              <span className="text-sm text-blue-400 font-medium">
                {user.department}
              </span>
            )}
          </div>
        </div>
        
        <p className="text-zinc-300 text-sm leading-relaxed">
          {user.email}
        </p>
        
        {user.bio && (
          <p className="text-zinc-400 text-sm line-clamp-2">
            {user.bio}
          </p>
        )}

        {/* Skills Preview */}
        {user.skills && user.skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {user.skills.slice(0, 3).map((skill) => (
              <span
                key={skill.name}
                className="text-xs px-2 py-1 rounded-full font-medium text-zinc-900"
                style={{ backgroundColor: skill.color }}
              >
                {skill.name}
              </span>
            ))}
            {user.skills.length > 3 && (
              <span className="text-xs px-2 py-1 text-zinc-400">
                +{user.skills.length - 3} mais
              </span>
            )}
          </div>
        )}
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
      alert("Essa skill já existe!");
      return;
    }
    
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
    } catch (error) {
      console.error("Erro ao adicionar skill:", error);
      alert("Erro ao adicionar skill. Tente novamente.");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      addSkill();
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex justify-between items-start p-6 border-b border-zinc-700">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="text-2xl font-bold text-zinc-50">
                {user.name}
              </Dialog.Title>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-zinc-400">
                <span>{user.email}</span>
                {user.department && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="text-blue-400 font-medium">{user.department}</span>
                  </>
                )}
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X size={20} className="text-zinc-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            {/* Bio */}
            {user.bio && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-zinc-50 mb-2">Sobre</h3>
                <p className="text-zinc-300 leading-relaxed">{user.bio}</p>
              </div>
            )}

            {/* Skills Section */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-zinc-50">Skills</h3>
                <span className="text-sm text-zinc-400">
                  {user.skills?.length || 0} skills
                </span>
              </div>

              {/* Skills List */}
              {user.skills && user.skills.length > 0 ? (
                <div className="flex flex-wrap gap-2 mb-6">
                  {user.skills.map((skill) => (
                    <div
                      key={skill.name}
                      className="flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium text-zinc-900"
                      style={{ backgroundColor: skill.color }}
                    >
                      <span>{skill.name}</span>
                      <span className="text-xs bg-black/20 px-1.5 py-0.5 rounded-full">
                        {skill.score}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500 border-2 border-dashed border-zinc-700 rounded-lg mb-6">
                  Nenhuma skill cadastrada ainda
                </div>
              )}

              {/* Add Skill Form */}
              {currentUser && (
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-zinc-300 mb-3">
                    Adicionar Nova Skill
                  </h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Digite o nome da skill..."
                      value={newSkillName}
                      onChange={(e) => setNewSkillName(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1 p-2 rounded-lg bg-zinc-700 border border-zinc-600 text-zinc-50 outline-none focus:border-blue-400 transition-colors"
                    />
                    <button
                      onClick={addSkill}
                      disabled={!newSkillName.trim()}
                      className="px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 disabled:bg-zinc-600 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                      <Plus size={16} />
                      Adicionar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end p-6 border-t border-zinc-700">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-zinc-700 rounded-lg hover:bg-zinc-600 transition-colors text-zinc-50"
            >
              Fechar
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}