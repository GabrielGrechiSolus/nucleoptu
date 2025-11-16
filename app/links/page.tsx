"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../AuthContext";
import { db } from "../../firebase";
import { collection, query, where, getDocs, getDoc, doc,updateDoc,deleteDoc,setDoc } from "firebase/firestore";
import { Dialog } from "@headlessui/react";
import { Users, Star, Plus, ThumbsUp, ThumbsDown, ExternalLink } from "lucide-react";
import { toast } from "react-toastify";

type LinkData = {
  id: string;
  title: string;
  url: string;
  creatorUid: string;
  creatorName: string;
  type: "todos" | "lideranca" | "sustentacao" | "desenvolvimento" | "analise";
  favoritedBy: string[];
  likedBy: string[];
  dislikedBy: string[];
};

export default function UsefulLinksPage() {
  const { user } = useAuth();
  const [links, setLinks] = useState<LinkData[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [currentLink, setCurrentLink] = useState<LinkData | null>(null);

  // Buscar usuários
  useEffect(() => {
    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(db, "profiles"));
      const allUsers = snapshot.docs.map((d) => ({
        uid: d.id,
        displayName: d.data().name,
        email: d.data().email,
      }));
      setUsersList(allUsers);
    };
    fetchUsers();
  }, []);

  // Buscar links relevantes ao usuário
  // Dentro do useEffect que busca os links
useEffect(() => {
  const fetchLinks = async () => {
    if (!user) return;

    // 1. Buscar perfil do usuário para pegar noticeType
    const userDoc = await getDoc(doc(db, "profiles", user.uid));
    const noticeType = userDoc.exists() ? userDoc.data().noticeType || "todos" : "todos";

    // 2. Buscar links relevantes
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
        creatorName: data.creatorName || data.creatorEmail,
        type: data.type,
        favoritedBy: data.favoritedBy || [],
        likedBy: data.likedBy || [],
        dislikedBy: data.dislikedBy || [],
      } as LinkData;
    });

    setLinks(allLinks);
  };

  fetchLinks();
}, [user]);


  const getUserName = (uid: string) =>
    usersList.find((u) => u.uid === uid)?.displayName ||
    usersList.find((u) => u.uid === uid)?.email ||
    uid;

  const filteredLinks = links.filter((l) =>
    l.title.toLowerCase().includes(search.toLowerCase())
  );

  const toggleFavorite = async (link: LinkData) => {
    if (!user) return;
    const docRef = doc(db, "usefulLinks", link.id);
    const alreadyFav = link.favoritedBy.includes(user.uid);
    const updated = alreadyFav
      ? link.favoritedBy.filter((uid) => uid !== user.uid)
      : [...link.favoritedBy, user.uid];
    await updateDoc(docRef, { favoritedBy: updated });
    setLinks((prev) =>
      prev.map((l) => (l.id === link.id ? { ...l, favoritedBy: updated } : l))
    );
  };

  const handleLikeDislike = async (
    link: LinkData,
    type: "like" | "dislike"
  ) => {
    if (!user) return;
    const docRef = doc(db, "usefulLinks", link.id);
    let likedBy = link.likedBy || [];
    let dislikedBy = link.dislikedBy || [];

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
  };

  const handleDelete = async (link: LinkData) => {
    if (!confirm("Deseja realmente deletar este link?")) return;
    await deleteDoc(doc(db, "usefulLinks", link.id));
    setLinks((prev) => prev.filter((l) => l.id !== link.id));
  };

  const openModal = (link: LinkData) => {
    setCurrentLink(link);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setCurrentLink(null);
  };

  return (
    <div className="p-4 sm:p-8 flex flex-col gap-4">
      <div className="flex gap-2 items-center">
        <input
          type="text"
          placeholder="Buscar link..."
          className="flex-1 p-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-50 focus:border-sky-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className="bg-sky-600 hover:bg-sky-500 px-4 py-2 rounded text-white flex items-center gap-1"
          onClick={() => openModal({ id: "", title: "", url: "", creatorUid: user!.uid, creatorName: user!.displayName || user!.email!, type: "todos", favoritedBy: [], likedBy: [], dislikedBy: [] })}
        >
          <Plus size={16} /> Novo
        </button>
      </div>

      <div className="flex flex-col gap-4">
        {filteredLinks
          .sort((a, b) => b.favoritedBy.length - a.favoritedBy.length)
          .map((link) => (
            <div
              key={link.id}
              className="bg-zinc-900 border border-sky-600 rounded-lg p-4 flex flex-col sm:flex-row justify-between gap-2 shadow hover:shadow-lg transition"
            >
              <div className="flex-1 min-w-0">
                <a
                  href={link.url}
                  target="_blank"
                  className="text-lg font-semibold text-sky-400 hover:underline flex items-center gap-1"
                >
                  <ExternalLink size={16} /> {link.title}
                </a>
                <p className="text-zinc-400 text-sm">
                  Criado por: {link.creatorName} | Tipo: {link.type}
                </p>
              </div>

              <div className="flex gap-2 items-center">
                <button
                  title="Favoritar"
                  onClick={() => toggleFavorite(link)}
                  className={`p-1 rounded ${
                    link.favoritedBy.includes(user!.uid)
                      ? "bg-yellow-400"
                      : "bg-zinc-700 hover:bg-zinc-600"
                  }`}
                >
                  <Star size={16} />
                </button>
                <button
                  title={`Curtiu por: ${link.likedBy
                    .map(getUserName)
                    .join(", ")}`}
                  onClick={() => handleLikeDislike(link, "like")}
                  className={`p-1 rounded ${
                    link.likedBy.includes(user!.uid)
                      ? "bg-green-400"
                      : "bg-zinc-700 hover:bg-zinc-600"
                  }`}
                >
                  <ThumbsUp size={16} />
                </button>
                <button
                  title={`Não curtiu por: ${link.dislikedBy
                    .map(getUserName)
                    .join(", ")}`}
                  onClick={() => handleLikeDislike(link, "dislike")}
                  className={`p-1 rounded ${
                    link.dislikedBy.includes(user!.uid)
                      ? "bg-red-400"
                      : "bg-zinc-700 hover:bg-zinc-600"
                  }`}
                >
                  <ThumbsDown size={16} />
                </button>

                {/* Editar/Deletar apenas para criador */}
                {link.creatorUid === user?.uid && (
                  <>
                    <button
                      onClick={() => openModal(link)}
                      className="p-1 rounded bg-blue-500 hover:bg-blue-400 text-white"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(link)}
                      className="p-1 rounded bg-red-500 hover:bg-red-400 text-white"
                    >
                      Deletar
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
      </div>

      {/* Modal */}
      <Dialog open={modalOpen} onClose={closeModal} className="relative z-50">
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-zinc-900 p-6 rounded-lg w-full max-w-md flex flex-col gap-4">
            <Dialog.Title className="text-xl font-bold text-sky-400">
              {currentLink?.id ? "Editar Link" : "Novo Link"}
            </Dialog.Title>
            <input
              type="text"
              placeholder="Título"
              className="p-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-50"
              value={currentLink?.title || ""}
              onChange={(e) =>
                setCurrentLink((prev) =>
                  prev ? { ...prev, title: e.target.value } : prev
                )
              }
            />
            <input
              type="text"
              placeholder="URL"
              className="p-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-50"
              value={currentLink?.url || ""}
              onChange={(e) =>
                setCurrentLink((prev) =>
                  prev ? { ...prev, url: e.target.value } : prev
                )
              }
            />
            <select
              className="p-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-50"
              value={currentLink?.type || "todos"}
              onChange={(e) =>
                setCurrentLink((prev) =>
                  prev ? { ...prev, type: e.target.value as LinkData["type"] } : prev
                )
              }
            >
              <option value="todos">Todos</option>
              <option value="lideranca">Liderança</option>
              <option value="sustentacao">Sustentação</option>
              <option value="desenvolvimento">Desenvolvimento</option>
              <option value="analise">Análise</option>
            </select>
            <div className="flex justify-end gap-2">
              <button
                className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded text-white"
                onClick={closeModal}
              >
                Cancelar
              </button>
              <button
                className="bg-sky-600 hover:bg-sky-500 px-4 py-2 rounded text-white"
                onClick={async () => {
                  if (!currentLink) return;
                  const data = {
                    title: currentLink.title,
                    url: currentLink.url,
                    creatorUid: user!.uid,
                    creatorName: user!.displayName || user!.email!,
                    type: currentLink.type,
                    favoritedBy: currentLink.favoritedBy || [],
                    likedBy: currentLink.likedBy || [],
                    dislikedBy: currentLink.dislikedBy || [],
                  };
                  if (currentLink.id) {
                    await updateDoc(doc(db, "usefulLinks", currentLink.id), data);
                    setLinks((prev) =>
                      prev.map((l) =>
                        l.id === currentLink.id ? { ...l, ...data } : l
                      )
                    );
                  } else {
                    const docRef = doc(collection(db, "usefulLinks"));
                    await setDoc(docRef, data);
                    setLinks((prev) => [...prev, { ...data, id: docRef.id }]);
                  }
                  closeModal();
                  toast.success("Link salvo com sucesso!");
                }}
              >
                Salvar
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
