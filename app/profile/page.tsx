"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../AuthContext";
import { updateProfile } from "firebase/auth";
import { auth, db } from "../../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { Dialog } from "@headlessui/react";

interface Skill {
  name: string;
  score: number;
  confirmedBy: string[];
  color: string;
}

export default function ProfilePage() {
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [photo, setPhoto] = useState("");
  const [preview, setPreview] = useState("/profile.jpg");
  const [ledColor, setLedColor] = useState("#00ff00");
  const [noticeType, setNoticeType] = useState<
    "todos" | "analise" | "desenvolvimento" | "lideranca" | "sustentacao"
  >("todos");

  const [skills, setSkills] = useState<Skill[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.displayName || "");
      const authPhoto = user.photoURL || "";
      setPhoto(authPhoto);
      setPreview(authPhoto || "/profile.jpg");
      fetchUserProfile(authPhoto);
    }
  }, [user]);

  const fetchUserProfile = async (authPhoto?: string) => {
    if (!user) return;
    const userRef = doc(db, "profiles", user.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      setBio(data.bio || "");
      setLedColor(data.ledColor || getRandomColor());
      setNoticeType(data.noticeType || "todos");
      setSkills(
        (data.skills || []).map((s: any) => ({
          name: s.name,
          score: s.score || 0,
          confirmedBy: s.confirmedBy || [],
          color: s.color || getRandomColor(),
        }))
      );
      if (data.avatar) {
        setPreview(data.avatar);
        if (!photo) setPhoto(data.avatar);
      } else if (authPhoto) {
        setPreview(authPhoto);
      } else {
        setPreview(generateAvatar(name || ""));
      }
    } else {
      setLedColor(getRandomColor());
      setPreview(authPhoto || generateAvatar(name || ""));
    }
  };

  const getRandomColor = () => {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  const generateAvatar = (username: string) => {
    const initial = username.charAt(0).toUpperCase() || "?";
    const bgColor = getRandomColor();
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
        <rect width="128" height="128" fill="${bgColor}" />
        <text x="50%" y="50%" font-size="64" dy=".35em" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif">${initial}</text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setPhoto(base64String);
      setPreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  const saveProfile = async () => {
    if (!user) return;
    try {
      await updateProfile(auth.currentUser!, {
        displayName: name,
        photoURL: photo || preview,
      });
      await setDoc(
        doc(db, "profiles", user.uid),
        {
          name,
          bio,
          avatar: photo || preview,
          ledColor,
          email: user.email,
          noticeType,
          skills,
          updatedAt: new Date(),
        },
        { merge: true }
      );
      alert("Perfil atualizado com sucesso!");
    } catch (error) {
      console.error(error);
      alert("Erro ao atualizar o perfil.");
    }
  };

  const removePhoto = async () => {
    try {
      setPhoto("");
      const avatar = generateAvatar(name || "");
      setPreview(avatar);
      await updateProfile(auth.currentUser!, { photoURL: avatar });
      if (user) {
        await setDoc(doc(db, "profiles", user.uid), { avatar }, { merge: true });
      }
      alert("Foto removida!");
    } catch (error) {
      console.error(error);
      alert("Erro ao remover foto.");
    }
  };

  const totalElogios = skills.reduce((acc, s) => acc + (s.score || 0), 0);

  return (
    <div className="flex flex-col md:flex-row w-full h-full gap-6 min-w-0">
      {/* Foto e controles */}
      <div className="flex flex-col items-center gap-4 md:w-1/3 flex-shrink-0 min-w-0">
        <div className="w-32 h-32 rounded-full p-1" style={{ backgroundColor: ledColor }}>
          <img
            src={preview}
            alt="Foto de perfil"
            className="w-full h-full rounded-full object-cover border border-zinc-700 shadow"
          />
        </div>
        <label className="text-sm text-zinc-400">
          Coloque o link da imagem a baixo para alterar a foto de perfil.
          Link da foto do linkedin ou github.
        </label>
        <input
          type="text"
          placeholder="Coloque o link da imagem"
          className="w-full p-2 rounded bg-zinc-800 text-sm mt-1 min-w-0"
          value={photo}
          onChange={(e) => {
            setPhoto(e.target.value);
            setPreview(e.target.value);
          }}
        />
        <button onClick={removePhoto} className="text-red-400 hover:text-red-300 text-xs mt-1">
          Remover foto
        </button>
      </div>

      {/* Formulário com scroll interno */}
      <div className="flex-1 flex flex-col gap-4 overflow-auto min-w-0 h-full">
        <div>
          <label className="text-sm text-zinc-400">Nome</label>
          <input
            type="text"
            className="w-full mt-1 p-3 bg-zinc-800 border border-zinc-700 rounded-lg outline-none focus:border-sky-500 transition min-w-0"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400">Bio</label>
          <textarea
            className="w-full mt-1 p-3 bg-zinc-800 border border-zinc-700 rounded-lg outline-none focus:border-sky-500 transition min-w-0"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-zinc-400">Tipo de aviso padrão</label>
          <select
            className="w-full mt-1 p-3 bg-zinc-800 border border-zinc-700 rounded-lg outline-none focus:border-sky-500 transition min-w-0"
            value={noticeType}
            onChange={(e) => setNoticeType(e.target.value as typeof noticeType)}
          >
            <option value="todos">Todos</option>
            <option value="analise">Análise</option>
            <option value="desenvolvimento">Desenvolvimento</option>
            <option value="lideranca">Liderança</option>
            <option value="sustentacao">Sustentação</option>
          </select>
        </div>

        <div>
          <label className="text-sm text-zinc-400">Email</label>
          <input
            type="text"
            value={user?.email || ""}
            disabled
            className="w-full mt-1 p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-500 min-w-0"
          />
        </div>

        <button
          onClick={saveProfile}
          className="w-full py-3 bg-sky-600 hover:bg-sky-500 rounded-lg font-semibold transition"
        >
          Salvar alterações
        </button>

        {/* Botão Elogios com contagem */}
        <button
          onClick={() => setModalOpen(true)}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold mt-2 transition"
        >
          Ver elogios recebidos ({totalElogios})
        </button>
      </div>

      {/* Modal de Skills / Elogios */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
        <div className="bg-zinc-900 p-6 rounded-xl w-full max-w-2xl z-50 overflow-y-auto max-h-[90vh]">
          <h2 className="text-2xl font-bold mb-4">Elogios recebidos</h2>
          {skills.length === 0 && <p>Nenhuma skill recebida ainda.</p>}
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <div
                key={s.name}
                className="px-3 py-1 rounded-full text-xs text-zinc-50 flex items-center gap-2"
                style={{ backgroundColor: s.color }}
              >
                {s.name} ({s.score}) - Confirmado por: {(s.confirmedBy || []).join(", ")}
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-4">
            <button
              className="px-4 py-2 bg-red-500 rounded hover:bg-red-600 transition"
              onClick={() => setModalOpen(false)}
            >
              Fechar
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
