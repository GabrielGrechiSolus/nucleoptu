"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "../AuthContext";
import { db } from "../../firebase";
import { collection, query, where, getDocs, getDoc, doc, updateDoc, deleteDoc, setDoc } from "firebase/firestore";
import { Dialog } from "@headlessui/react";
import { Users, Star, Plus, ThumbsUp, ThumbsDown, ExternalLink, X, Edit2, Trash2, Search, Filter } from "lucide-react";
import { toast } from "react-toastify";

type LinkType = "todos" | "lideranca" | "sustentacao" | "desenvolvimento" | "analise";

type LinkData = {
  id: string;
  title: string;
  url: string;
  creatorUid: string;
  creatorName: string;
  type: LinkType;
  favoritedBy: string[];
  likedBy: string[];
  dislikedBy: string[];
  createdAt?: Date;
};

type UserProfile = {
  uid: string;
  displayName: string;
  email: string;
};

const LINK_TYPES: { value: LinkType; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "lideranca", label: "Liderança" },
  { value: "sustentacao", label: "Sustentação" },
  { value: "desenvolvimento", label: "Desenvolvimento" },
  { value: "analise", label: "Análise" },
];

const typeColors: Record<LinkType, string> = {
  todos: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  lideranca: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  sustentacao: "bg-green-500/10 text-green-400 border-green-500/20",
  desenvolvimento: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  analise: "bg-pink-500/10 text-pink-400 border-pink-500/20",
};

export default function UsefulLinksPage() {
  const { user } = useAuth();
  const [links, setLinks] = useState<LinkData[]>([]);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState<LinkType | "all">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [currentLink, setCurrentLink] = useState<Partial<LinkData> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Buscar usuários
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, "profiles"));
        const allUsers = snapshot.docs.map((d) => ({
          uid: d.id,
          displayName: d.data().name || d.data().displayName,
          email: d.data().email,
        }));
        setUsersList(allUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Erro ao carregar usuários");
      }
    };
    fetchUsers();
  }, []);

  // Buscar links relevantes ao usuário
  useEffect(() => {
    const fetchLinks = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        // Buscar perfil do usuário
        const userDoc = await getDoc(doc(db, "profiles", user.uid));
        const noticeType = userDoc.exists() ? userDoc.data().noticeType || "todos" : "todos";

        // Buscar links relevantes
        const q = query(
          collection(db, "usefulLinks"),
          where("type", "in", ["todos", noticeType])
        );
        const snapshot = await getDocs(q);

        const allLinks = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            title: data.title,
            url: data.url,
            creatorUid: data.creatorUid,
            creatorName: data.creatorName || data.creatorEmail || "Usuário",
            type: data.type as LinkType,
            favoritedBy: data.favoritedBy || [],
            likedBy: data.likedBy || [],
            dislikedBy: data.dislikedBy || [],
            createdAt: data.createdAt?.toDate(),
          } as LinkData;
        });

        setLinks(allLinks);
      } catch (error) {
        console.error("Error fetching links:", error);
        toast.error("Erro ao carregar links");
      } finally {
        setIsLoading(false);
      }
    };

    fetchLinks();
  }, [user]);

  const getUserName = useCallback(
    (uid: string) =>
      usersList.find((u) => u.uid === uid)?.displayName ||
      usersList.find((u) => u.uid === uid)?.email ||
      uid,
    [usersList]
  );

  const filteredLinks = useMemo(() => {
    let filtered = links;

    // Filter by search
    if (search) {
      filtered = filtered.filter((l) =>
        l.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    // Filter by type
    if (selectedType !== "all") {
      filtered = filtered.filter((l) => l.type === selectedType);
    }

    // Filter favorites only
    if (showFavoritesOnly && user) {
      filtered = filtered.filter((l) => l.favoritedBy.includes(user.uid));
    }

    // Sort: favorites first, then by likes
    return filtered.sort((a, b) => {
      if (showFavoritesOnly) {
        return b.likedBy.length - a.likedBy.length;
      }
      const aIsFav = user && a.favoritedBy.includes(user.uid);
      const bIsFav = user && b.favoritedBy.includes(user.uid);
      if (aIsFav && !bIsFav) return -1;
      if (!aIsFav && bIsFav) return 1;
      return b.likedBy.length - a.likedBy.length;
    });
  }, [links, search, selectedType, showFavoritesOnly, user]);

  const toggleFavorite = async (link: LinkData) => {
    if (!user) return;

    try {
      const docRef = doc(db, "usefulLinks", link.id);
      const alreadyFav = link.favoritedBy.includes(user.uid);
      const updated = alreadyFav
        ? link.favoritedBy.filter((uid) => uid !== user.uid)
        : [...link.favoritedBy, user.uid];

      await updateDoc(docRef, { favoritedBy: updated });
      setLinks((prev) =>
        prev.map((l) => (l.id === link.id ? { ...l, favoritedBy: updated } : l))
      );

      toast.success(alreadyFav ? "Removido dos favoritos" : "Adicionado aos favoritos");
    } catch (error) {
      console.error("Error toggling favorite:", error);
      toast.error("Erro ao atualizar favorito");
    }
  };

  const handleLikeDislike = async (
    link: LinkData,
    type: "like" | "dislike"
  ) => {
    if (!user) return;

    try {
      const docRef = doc(db, "usefulLinks", link.id);
      let likedBy = [...(link.likedBy || [])];
      let dislikedBy = [...(link.dislikedBy || [])];

      if (type === "like") {
        if (!likedBy.includes(user.uid)) likedBy.push(user.uid);
        dislikedBy = dislikedBy.filter((uid) => uid !== user.uid);
      } else {
        if (!dislikedBy.includes(user.uid)) dislikedBy.push(user.uid);
        likedBy = likedBy.filter((uid) => uid !== user.uid);
      }

      await updateDoc(docRef, { likedBy, dislikedBy });
      setLinks((prev) =>
        prev.map((l) =>
          l.id === link.id ? { ...l, likedBy, dislikedBy } : l
        )
      );
    } catch (error) {
      console.error("Error updating reaction:", error);
      toast.error("Erro ao atualizar reação");
    }
  };

  const handleDelete = async (link: LinkData) => {
    if (!confirm(`Deseja realmente deletar o link "${link.title}"?`)) return;

    try {
      await deleteDoc(doc(db, "usefulLinks", link.id));
      setLinks((prev) => prev.filter((l) => l.id !== link.id));
      toast.success("Link deletado com sucesso!");
    } catch (error) {
      console.error("Error deleting link:", error);
      toast.error("Erro ao deletar link");
    }
  };

  const openModal = (link?: LinkData) => {
    if (link) {
      setCurrentLink(link);
    } else {
      // Ensure all fields have proper values
      const creatorName = user?.displayName || user?.email || "Usuário";

      setCurrentLink({
        title: "",
        url: "",
        type: "todos",
        creatorUid: user?.uid || "",
        creatorName: creatorName,
        favoritedBy: [],
        likedBy: [],
        dislikedBy: [],
      });
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentLink(null);
  };

  const saveLink = async () => {
    if (!currentLink || !user) return;

    if (!currentLink.title?.trim()) {
      toast.error("Por favor, insira um título");
      return;
    }

    if (!currentLink.url?.trim()) {
      toast.error("Por favor, insira uma URL");
      return;
    }

    // Ensure type is defined
    const linkType = currentLink.type || "todos";

    // Ensure creatorName is always a string
    const creatorName = user.displayName || user.email || "Usuário";

    try {
      const data = {
        title: currentLink.title.trim(),
        url: currentLink.url.trim(),
        creatorUid: user.uid,
        creatorName: creatorName,
        type: linkType,
        favoritedBy: currentLink.favoritedBy || [],
        likedBy: currentLink.likedBy || [],
        dislikedBy: currentLink.dislikedBy || [],
        updatedAt: new Date(),
      };

      if (currentLink.id) {
        await updateDoc(doc(db, "usefulLinks", currentLink.id), data);
        setLinks((prev) =>
          prev.map((l) =>
            l.id === currentLink.id
              ? {
                ...l,
                ...data,
                id: currentLink.id!,
                type: data.type as LinkType
              }
              : l
          )
        );
        toast.success("Link atualizado com sucesso!");
      } else {
        const docRef = doc(collection(db, "usefulLinks"));
        await setDoc(docRef, { ...data, createdAt: new Date() });
        const newLink: LinkData = {
          ...data,
          id: docRef.id,
          createdAt: new Date(),
          type: data.type as LinkType,
        };
        setLinks((prev) => [...prev, newLink]);
        toast.success("Link criado com sucesso!");
      }
      closeModal();
    } catch (error) {
      console.error("Error saving link:", error);
      toast.error("Erro ao salvar link");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500 mb-2">
            Links Úteis
          </h1>
          <p className="text-zinc-400">
            Gerencie e descubra links compartilhados pela equipe
          </p>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400" size={18} />
            <input
              type="text"
              placeholder="Buscar links por título..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700 text-zinc-50 focus:border-sky-500 focus:outline-none transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2">
            <select
              className="px-4 py-2 rounded-lg bg-zinc-800/50 border border-zinc-700 text-zinc-50 focus:border-sky-500 focus:outline-none"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as LinkType | "all")}
            >
              <option value="all">Todos os tipos</option>
              {LINK_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${showFavoritesOnly
                  ? "bg-yellow-500 text-zinc-900"
                  : "bg-zinc-800/50 text-zinc-400 hover:text-zinc-200"
                }`}
            >
              <Star size={18} />
              Favoritos
            </button>

            <button
              className="bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 px-4 py-2 rounded-lg text-white flex items-center gap-2 transition-all shadow-lg hover:shadow-xl"
              onClick={() => openModal()}
            >
              <Plus size={18} /> Novo Link
            </button>
          </div>
        </div>

        {/* Links Grid */}
        {filteredLinks.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-zinc-500 mb-4">
              <ExternalLink size={48} className="mx-auto opacity-50" />
            </div>
            <p className="text-zinc-400 text-lg">
              {search || selectedType !== "all" || showFavoritesOnly
                ? "Nenhum link encontrado com os filtros atuais"
                : "Nenhum link disponível ainda"}
            </p>
            {!search && selectedType === "all" && !showFavoritesOnly && (
              <button
                onClick={() => openModal()}
                className="mt-4 text-sky-400 hover:text-sky-300 flex items-center gap-2 mx-auto"
              >
                <Plus size={16} /> Criar o primeiro link
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredLinks.map((link) => (
              <div
                key={link.id}
                className="group bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 hover:border-sky-500/50 rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-sky-500/10"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-2 group-hover:underline"
                    >
                      <ExternalLink size={18} className="flex-shrink-0" />
                      <span className="truncate">{link.title}</span>
                    </a>
                  </div>

                  <div className="flex gap-1 ml-2">
                    <button
                      title={link.favoritedBy.includes(user?.uid || "") ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                      onClick={() => toggleFavorite(link)}
                      className={`p-2 rounded-lg transition-all ${link.favoritedBy.includes(user?.uid || "")
                          ? "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
                          : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-200"
                        }`}
                    >
                      <Star size={16} fill={link.favoritedBy.includes(user?.uid || "") ? "currentColor" : "none"} />
                    </button>

                    {link.creatorUid === user?.uid && (
                      <>
                        <button
                          onClick={() => openModal(link)}
                          className="p-2 rounded-lg bg-zinc-800/50 text-zinc-400 hover:bg-blue-500/20 hover:text-blue-400 transition-all"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(link)}
                          className="p-2 rounded-lg bg-zinc-800/50 text-zinc-400 hover:bg-red-500/20 hover:text-red-400 transition-all"
                          title="Deletar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs px-2 py-1 rounded-full border ${typeColors[link.type]}`}>
                    {LINK_TYPES.find(t => t.value === link.type)?.label || link.type}
                  </span>
                  <span className="text-xs text-zinc-500">
                    por {link.creatorName}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    title={`Curtido por: ${link.likedBy.map(getUserName).join(", ") || "ninguém"}`}
                    onClick={() => handleLikeDislike(link, "like")}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all ${link.likedBy.includes(user?.uid || "")
                        ? "bg-green-500/20 text-green-400"
                        : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50"
                      }`}
                  >
                    <ThumbsUp size={14} />
                    <span className="text-sm font-medium">{link.likedBy.length}</span>
                  </button>

                  <button
                    title={`Não curtido por: ${link.dislikedBy.map(getUserName).join(", ") || "ninguém"}`}
                    onClick={() => handleLikeDislike(link, "dislike")}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all ${link.dislikedBy.includes(user?.uid || "")
                        ? "bg-red-500/20 text-red-400"
                        : "bg-zinc-800/50 text-zinc-400 hover:bg-zinc-700/50"
                      }`}
                  >
                    <ThumbsDown size={14} />
                    <span className="text-sm font-medium">{link.dislikedBy.length}</span>
                  </button>

                  <div className="flex-1" />

                  <span className="text-xs text-zinc-600">
                    {link.favoritedBy.length} favoritos
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onClose={closeModal} className="relative z-50">
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-xl w-full max-w-md overflow-hidden shadow-2xl border border-zinc-800">
            <div className="flex justify-between items-center p-6 border-b border-zinc-800">
              <Dialog.Title className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">
                {currentLink?.id ? "Editar Link" : "Novo Link"}
              </Dialog.Title>
              <button
                onClick={closeModal}
                className="p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X size={20} className="text-zinc-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Título *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Documentação React"
                  className="w-full p-2 rounded-lg bg-zinc-800/50 border border-zinc-700 text-zinc-50 focus:border-sky-500 focus:outline-none transition-colors"
                  value={currentLink?.title || ""}
                  onChange={(e) =>
                    setCurrentLink((prev) =>
                      prev ? { ...prev, title: e.target.value } : prev
                    )
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  URL *
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  className="w-full p-2 rounded-lg bg-zinc-800/50 border border-zinc-700 text-zinc-50 focus:border-sky-500 focus:outline-none transition-colors"
                  value={currentLink?.url || ""}
                  onChange={(e) =>
                    setCurrentLink((prev) =>
                      prev ? { ...prev, url: e.target.value } : prev
                    )
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Tipo
                </label>
                <select
                  className="w-full p-2 rounded-lg bg-zinc-800/50 border border-zinc-700 text-zinc-50 focus:border-sky-500 focus:outline-none"
                  value={currentLink?.type || "todos"}
                  onChange={(e) =>
                    setCurrentLink((prev) =>
                      prev ? { ...prev, type: e.target.value as LinkType } : prev
                    )
                  }
                >
                  {LINK_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-zinc-800 bg-zinc-900/50">
              <button
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
                onClick={closeModal}
              >
                Cancelar
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white transition-all shadow-lg"
                onClick={saveLink}
              >
                {currentLink?.id ? "Atualizar" : "Criar"}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}