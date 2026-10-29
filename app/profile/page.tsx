"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../AuthContext";
import Link from "next/link";
import GitTab from "./GitTab";
import BmTab from "./BmTab";
import { fotoDoGit } from "../components/fotoGit";
import { updateProfile } from "firebase/auth";
import { auth, db } from "../../firebase";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { Dialog } from "@headlessui/react";
import {
  Loader2,
  Save,
  Camera,
  Trash2,
  Award,
  Mail,
  User,
  FileText,
  Bell,
  ChevronRight,
  ExternalLink,
  X,
  Users,
  ThumbsUp,
  Calendar,
} from "lucide-react";
import Image from "next/image";
import { toast } from "react-toastify";

interface Skill {
  name: string;
  score: number;
  confirmedBy: string[];
  color: string;
}

interface UserProfile {
  name: string;
  bio: string;
  avatar: string;
  ledColor: string;
  email: string;
  gitUser: string; // usuário no GitHub; liga o usuário aos PRs (fila de aplicação)
  noticeType: "todos" | "analise" | "desenvolvimento" | "lideranca" | "sustentacao";
  skills: Skill[];
  updatedAt?: Date;
  createdAt?: Date;
}

const NOTICE_TYPES = [
  { value: "todos", label: "Todos", color: "bg-gray-500" },
  { value: "analise", label: "Análise", color: "bg-pink-500" },
  { value: "desenvolvimento", label: "Desenvolvimento", color: "bg-orange-500" },
  { value: "lideranca", label: "Liderança", color: "bg-purple-500" },
  { value: "sustentacao", label: "Sustentação", color: "bg-green-500" },
] as const;

export default function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    bio: "",
    avatar: "",
    ledColor: "#00ff00",
    email: "",
    gitUser: "",
    noticeType: "todos",
    skills: [],
  });
  const [preview, setPreview] = useState("/profile.jpg");
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "git" | "bm">("profile");

  // Generate random color
  const getRandomColor = useCallback(() => {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }, []);

  // Generate avatar from name
  const generateAvatar = useCallback((username: string) => {
    const initial = username.charAt(0).toUpperCase() || "?";
    const bgColor = getRandomColor();
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
        <rect width="128" height="128" fill="${bgColor}" />
        <text x="50%" y="50%" font-size="64" dy=".35em" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif">${initial}</text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }, [getRandomColor]);

  // Fetch user profile
  const fetchUserProfile = useCallback(async () => {
    if (!user) return;

    try {
      const userRef = doc(db, "profiles", user.uid);
      const docSnap = await getDoc(userRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProfile({
          name: data.name || user.displayName || "",
          bio: data.bio || "",
          avatar: data.gitUser ? fotoDoGit(data.gitUser, 200) : data.avatar || user.photoURL || "",
          ledColor: data.ledColor || getRandomColor(),
          email: user.email || "",
          gitUser: data.gitUser || "",
          noticeType: data.noticeType || "todos",
          skills: (data.skills || []).map((s: any) => ({
            name: s.name,
            score: s.score || 0,
            confirmedBy: s.confirmedBy || [],
            color: s.color || getRandomColor(),
          })),
        });
        
        const avatarUrl = data.gitUser ? fotoDoGit(data.gitUser, 200) : data.avatar || user.photoURL || generateAvatar(data.name || user.displayName || "");
        setPreview(avatarUrl);
      } else {
        const defaultAvatar = generateAvatar(user.displayName || "");
        setProfile(prev => ({
          ...prev,
          name: user.displayName || "",
          email: user.email || "",
          avatar: defaultAvatar,
        }));
        setPreview(defaultAvatar);
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Erro ao carregar perfil");
    } finally {
      setLoading(false);
    }
  }, [user, getRandomColor, generateAvatar]);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user, fetchUserProfile]);

  // Handle photo URL change
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setProfile(prev => ({ ...prev, avatar: url }));
    setPreview(url || generateAvatar(profile.name));
  };

  // Save profile
  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);

    try {
      // Update Firebase Auth
      if (profile.name !== user.displayName || profile.avatar !== user.photoURL) {
        await updateProfile(auth.currentUser!, {
          displayName: profile.name,
          photoURL: profile.avatar || preview,
        });
      }

      // Update Firestore
      const profileData = {
        name: profile.name,
        bio: profile.bio,
        avatar: profile.avatar || preview,
        ledColor: profile.ledColor,
        email: user.email,
        gitUser: profile.gitUser.trim().replace(/^@/, ""),
        noticeType: profile.noticeType,
        skills: profile.skills,
        updatedAt: new Date(),
      };

      await setDoc(doc(db, "profiles", user.uid), profileData, { merge: true });
      toast.success("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar o perfil.");
    } finally {
      setSaving(false);
    }
  };

  // Remove photo
  const removePhoto = async () => {
    try {
      const avatar = generateAvatar(profile.name);
      setProfile(prev => ({ ...prev, avatar: "" }));
      setPreview(avatar);
      
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: avatar });
      }
      
      if (user) {
        await setDoc(doc(db, "profiles", user.uid), { avatar }, { merge: true });
      }
      
      toast.success("Foto removida!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao remover foto.");
    }
  };

  // Perfil Sustentação não tem acesso ao Git: sem aba Git e sem vínculo (também enquanto o perfil carrega).
  const semGit = loading || profile.noticeType === "sustentacao";

  const totalElogios = useMemo(() => 
    profile.skills.reduce((acc, s) => acc + (s.score || 0), 0),
    [profile.skills]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-sky-500" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500 mb-2">
            Meu Perfil
          </h1>
          <p className="text-zinc-400">
            Gerencie suas informações pessoais e acompanhe sua atividade
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Photo */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900/50 backdrop-blur-sm rounded-xl border border-zinc-800 p-6 sticky top-6">
              <div className="flex flex-col items-center">
                <div 
                  className="w-40 h-40 rounded-full p-1 mb-4 transition-all duration-300 hover:scale-105"
                  style={{ backgroundColor: profile.ledColor }}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-zinc-800">
                    <img
                      src={preview || "/profile.jpg"}
                      alt="Foto de perfil"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>

                <div className="w-full space-y-3">
                  <div>
                    <label className="text-sm text-zinc-400 flex items-center gap-2 mb-2">
                      <ExternalLink size={14} />
                      URL da foto
                    </label>
                    <input
                      type="text"
                      placeholder="https://..."
                      className="w-full p-2 rounded-lg bg-zinc-800/50 border border-zinc-700 text-sm focus:border-sky-500 focus:outline-none transition-colors"
                      value={profile.avatar}
                      onChange={handlePhotoChange}
                    />
                  </div>
                  
                  <button
                    onClick={removePhoto}
                    className="w-full py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm flex items-center justify-center gap-2 transition-colors"
                  >
                    <Trash2 size={14} />
                    Remover foto
                  </button>

                  <div className="pt-4 border-t border-zinc-800">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-zinc-100">
                        {totalElogios}
                      </div>
                      <div className="text-sm text-zinc-400">Elogios recebidos</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Profile Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-zinc-800">
              <button
                onClick={() => setActiveTab("profile")}
                className={`px-4 py-2 font-medium transition-colors relative ${
                  activeTab === "profile"
                    ? "text-sky-400"
                    : "text-zinc-400 hover:text-zinc-300"
                }`}
              >
                Informações do Perfil
                {activeTab === "profile" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-400 to-blue-500 rounded-full" />
                )}
              </button>
              {!semGit && (
              <button
                onClick={() => setActiveTab("git")}
                className={`px-4 py-2 font-medium transition-colors relative ${
                  activeTab === "git"
                    ? "text-sky-400"
                    : "text-zinc-400 hover:text-zinc-300"
                }`}
              >
                Git
                {activeTab === "git" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-400 to-blue-500 rounded-full" />
                )}
              </button>
              )}
              <button
                onClick={() => setActiveTab("bm")}
                className={`px-4 py-2 font-medium transition-colors relative ${
                  activeTab === "bm"
                    ? "text-sky-400"
                    : "text-zinc-400 hover:text-zinc-300"
                }`}
              >
                Businessmap
                {activeTab === "bm" && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-sky-400 to-blue-500 rounded-full" />
                )}
              </button>
            </div>

            {activeTab === "bm" && <BmTab />}

            {activeTab === "profile" && (
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="text-sm font-medium text-zinc-300 flex items-center gap-2 mb-2">
                    <User size={16} />
                    Nome
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg focus:border-sky-500 focus:outline-none transition-colors"
                    value={profile.name}
                    onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Seu nome"
                  />
                </div>

                {/* Bio */}
                <div>
                  <label className="text-sm font-medium text-zinc-300 flex items-center gap-2 mb-2">
                    <FileText size={16} />
                    Bio
                  </label>
                  <textarea
                    rows={4}
                    className="w-full p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg focus:border-sky-500 focus:outline-none transition-colors resize-none"
                    value={profile.bio}
                    onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                    placeholder="Conte um pouco sobre você..."
                  />
                </div>

                {/* Usuário no Git */}
                {!semGit && (
                <div>
                  <label className="text-sm font-medium text-zinc-300 flex items-center gap-2 mb-2" htmlFor="git-user">
                    <FileText size={16} />
                    Usuário no Git (GitHub)
                  </label>
                  <input
                    id="git-user"
                    type="text"
                    className="w-full p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg focus:border-sky-500 focus:outline-none transition-colors"
                    value={profile.gitUser}
                    onChange={(e) => setProfile(prev => ({ ...prev, gitUser: e.target.value }))}
                    placeholder="Ex.: GabrielGrechiSolus"
                  />
                  <p className="mt-1 text-xs text-zinc-500">
                    Liga você aos PRs que você faz. É com ele que a fila de aplicação mostra o que está para você aplicar no cliente.
                  </p>
                </div>
                )}

                {/* LED Color */}
                <div>
                  <label className="text-sm font-medium text-zinc-300 flex items-center gap-2 mb-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: profile.ledColor }} />
                    Cor do LED
                  </label>
                  <input
                    type="color"
                    className="w-full h-10 p-1 bg-zinc-800/50 border border-zinc-700 rounded-lg cursor-pointer"
                    value={profile.ledColor}
                    onChange={(e) => setProfile(prev => ({ ...prev, ledColor: e.target.value }))}
                  />
                </div>

                {/* Notice Type */}
                <div>
                  <label className="text-sm font-medium text-zinc-300 flex items-center gap-2 mb-2">
                    <Bell size={16} />
                    Tipo de Aviso Padrão
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {NOTICE_TYPES.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setProfile(prev => ({ ...prev, noticeType: type.value }))}
                        className={`p-2 rounded-lg text-sm font-medium transition-all ${
                          profile.noticeType === type.value
                            ? `${type.color} text-white shadow-lg scale-105`
                            : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50"
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="text-sm font-medium text-zinc-300 flex items-center gap-2 mb-2">
                    <Mail size={16} />
                    Email
                  </label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full p-3 bg-zinc-800/30 border border-zinc-700 rounded-lg text-zinc-500 cursor-not-allowed"
                  />
                </div>

                {/* Save Button */}
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="w-full py-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 rounded-lg font-semibold transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Save size={20} />
                  )}
                  {saving ? "Salvando..." : "Salvar alterações"}
                </button>

                {/* Skills Button */}
                <button
                  onClick={() => setModalOpen(true)}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-lg font-semibold transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <Award size={20} />
                  Ver elogios recebidos ({totalElogios})
                </button>
              </div>
            )}

            {activeTab === "git" && user && !semGit && (
              <GitTab
                uid={user.uid}
                gitUser={profile.gitUser}
                onVinculado={(login) => {
                  setProfile((prev) => ({ ...prev, gitUser: login, avatar: fotoDoGit(login, 200) }));
                  setPreview(fotoDoGit(login, 200));
                }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Skills Modal */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl border border-zinc-800">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800">
              <Dialog.Title className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500 flex items-center gap-2">
                <Award size={24} />
                Elogios Recebidos
              </Dialog.Title>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X size={20} className="text-zinc-400" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {profile.skills.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-zinc-400">Nenhum elogio recebido ainda.</p>
                  <p className="text-zinc-500 text-sm mt-2">
                    Quando colegas reconhecerem suas habilidades, elas aparecerão aqui.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {profile.skills.map((skill) => (
                    <div
                      key={skill.name}
                      className="p-4 rounded-lg border border-zinc-800 bg-zinc-900/50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: skill.color }}
                          />
                          <span className="font-semibold text-zinc-100">{skill.name}</span>
                        </div>
                        <span className="text-2xl font-bold text-sky-400">{skill.score}</span>
                      </div>
                      {skill.confirmedBy.length > 0 && (
                        <div className="text-sm text-zinc-400">
                          Confirmado por: {skill.confirmedBy.join(", ")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end p-6 border-t border-zinc-800 bg-zinc-900/50">
              <button
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white transition-all shadow-lg"
                onClick={() => setModalOpen(false)}
              >
                Fechar
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}