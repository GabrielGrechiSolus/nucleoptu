"use client";

import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { db, auth } from "../../firebase";
import { Dialog } from "@headlessui/react";

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
  const [searchName, setSearchName] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchDept, setSearchDept] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [newSkillName, setNewSkillName] = useState("");

  const ledColor = "#00bfff";

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const snap = await getDocs(collection(db, "profiles")); // <-- aqui
        const allUsers: UserData[] = snap.docs
          .map((doc) => ({ uid: doc.id, ...doc.data() } as UserData))
          .filter((u) => u.uid !== currentUser?.uid);
        setUsers(allUsers);
      } catch (error) {
        console.error("Erro ao carregar usuários:", error);
      }
    };
    void loadUsers();
  }, [currentUser]);

  const filteredUsers = users.filter((u) => {
    return (
      (u.name?.toLowerCase().includes(searchName.toLowerCase()) ?? true) &&
      (u.email?.toLowerCase().includes(searchEmail.toLowerCase()) ?? true) &&
      (u.department?.toLowerCase().includes(searchDept.toLowerCase()) ?? true)
    );
  });

  const addSkill = async (user: UserData) => {
    if (!newSkillName.trim()) return;
    const skillExists = user.skills?.find(
      (s) => s.name.toLowerCase() === newSkillName.toLowerCase()
    );
    if (skillExists) return alert("Essa skill já existe!");
    const newSkill: Skill = {
      name: newSkillName,
      score: 1,
      confirmedBy: [currentUser!.uid],
      color: getRandomColor(),
    };
    const updatedSkills = [...(user.skills || []), newSkill];
    await updateDoc(doc(db, "profiles", user.uid), { skills: updatedSkills });
    setUsers((prev) =>
      prev.map((u) => (u.uid === user.uid ? { ...u, skills: updatedSkills } : u))
    );
    setNewSkillName("");
  };

  const confirmSkill = async (user: UserData, skill: Skill) => {
    if (skill.confirmedBy.includes(currentUser!.uid))
      return alert("Você já confirmou esta skill!");
    const updatedSkills = user.skills!.map((s) =>
      s.name === skill.name
        ? { ...s, score: s.score + 1, confirmedBy: [...s.confirmedBy, currentUser!.uid] }
        : s
    );
    await updateDoc(doc(db, "profiles", user.uid), { skills: updatedSkills });
    setUsers((prev) =>
      prev.map((u) => (u.uid === user.uid ? { ...u, skills: updatedSkills } : u))
    );
  };

  const getRandomColor = () => {
    const letters = "0123456789ABCDEF";
    let color = "#";
    for (let i = 0; i < 6; i++) color += letters[Math.floor(Math.random() * 16)];
    return color;
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      {/* Filtros LED */}
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="Buscar nome"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          className="p-2 rounded border border-blue-500 bg-zinc-900 text-zinc-50 outline-none"
        />
        <input
          type="text"
          placeholder="Buscar email"
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
          className="p-2 rounded border border-blue-500 bg-zinc-900 text-zinc-50 outline-none"
        />
        <input
          type="text"
          placeholder="Buscar setor"
          value={searchDept}
          onChange={(e) => setSearchDept(e.target.value)}
          className="p-2 rounded border border-blue-500 bg-zinc-900 text-zinc-50 outline-none"
        />
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-4">
        {filteredUsers.length === 0 && <p>Nenhum usuário encontrado.</p>}
        {filteredUsers.map((user) => (
          <div
            key={user.uid}
            className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 w-full cursor-pointer hover:border-blue-400 transition"
            onClick={() => {
              setSelectedUser(user);
              setModalOpen(true);
            }}
          >
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">{user.name}</h2>
              <span className="text-sm text-zinc-400">{user.department}</span>
            </div>
            <p className="text-zinc-300 text-sm">{user.email}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {(user.skills || []).map((s) => (
                <span
                  key={s.name}
                  className="text-xs px-2 py-1 rounded-full"
                  style={{ backgroundColor: s.color }}
                >
                  {s.name} ({s.score})
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedUser && (
        <Dialog open={modalOpen} onClose={() => setModalOpen(false)} className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/70" aria-hidden="true"></div>
          <div className="bg-zinc-900 p-6 rounded-xl w-full max-w-2xl z-50 overflow-y-auto max-h-[90vh]">
            <h2 className="text-2xl font-bold mb-2">{selectedUser.name}</h2>
            <p className="text-zinc-400 mb-2">Email: {selectedUser.email}</p>
            <p className="text-zinc-400 mb-2">Setor: {selectedUser.department}</p>
            <p className="text-zinc-300 mb-4">{selectedUser.bio}</p>

            {/* Skills */}
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {(selectedUser.skills || []).map((s) => (
                  <button
                    key={s.name}
                    className="text-xs px-2 py-1 rounded-full text-zinc-50 hover:opacity-80 transition"
                    style={{ backgroundColor: s.color }}
                    onClick={() => confirmSkill(selectedUser, s)}
                  >
                    {s.name} ({s.score})
                  </button>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  placeholder="Adicionar skill"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  className="p-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-50 outline-none flex-1"
                />
                <button
                  onClick={() => addSkill(selectedUser)}
                  className="px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 transition"
                >
                  Adicionar
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                className="px-4 py-2 bg-red-500 rounded hover:bg-red-600 transition"
                onClick={() => setModalOpen(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
