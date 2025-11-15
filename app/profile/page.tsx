'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export default function ProfilePage() {
  const { user } = useAuth();

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [photo, setPhoto] = useState(''); // Base64
  const [preview, setPreview] = useState('/profile.jpg');
  const [ledColor, setLedColor] = useState('#00ff00'); // Cor LED aleatória

  useEffect(() => {
    if (user) {
      setName(user.displayName || '');
      setPhoto(user.photoURL || '');
      setPreview(user.photoURL || '/profile.jpg');
      fetchUserProfile();
    }
  }, [user]);

  // Busca perfil no Firestore
  const fetchUserProfile = async () => {
    if (!user) return;
    const userRef = doc(db, 'profiles', user.uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      setBio(data.bio || '');
      setLedColor(data.ledColor || getRandomColor());
      if (data.avatar) {
        setPreview(data.avatar);
      } else {
        setPreview(generateAvatar(name || ''));
      }
    } else {
      setLedColor(getRandomColor());
      setPreview(generateAvatar(name || ''));
    }
  };

  // Gera cor aleatória
  const getRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  // Gera avatar com inicial
  const generateAvatar = (username: string) => {
    const initial = username.charAt(0).toUpperCase() || '?';
    const bgColor = getRandomColor();
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128">
        <rect width="128" height="128" fill="${bgColor}" />
        <text x="50%" y="50%" font-size="64" dy=".35em" text-anchor="middle" fill="#fff" font-family="Arial, sans-serif">${initial}</text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  // Upload de foto
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
      // Atualiza Firebase Auth
      await updateProfile(auth.currentUser!, {
        displayName: name,
        photoURL: photo || preview,
      });

      // Atualiza Firestore
      await setDoc(
        doc(db, 'profiles', user.uid),
        {
          name,
          bio,
          avatar: photo || preview,
          ledColor,
          email: user.email,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      alert('Perfil atualizado com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao atualizar o perfil.');
    }
  };

  const removePhoto = async () => {
    try {
      setPhoto('');
      const avatar = generateAvatar(name || '');
      setPreview(avatar);

      await updateProfile(auth.currentUser!, { photoURL: avatar });

      if (user) {
        await setDoc(
          doc(db, 'profiles', user.uid),
          { avatar },
          { merge: true }
        );
      }

      alert('Foto removida!');
    } catch (error) {
      console.error(error);
      alert('Erro ao remover foto.');
    }
  };

  return (
    <div className="text-zinc-50">
      <h1 className="text-3xl font-bold mb-6">Meu Perfil</h1>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-w-xl">
        {/* Foto com LED */}
        <div className="flex items-center gap-6">
          <div
            className="w-24 h-24 rounded-full p-1"
            style={{ backgroundColor: ledColor }}
          >
            <img
              src={preview}
              alt="Foto de perfil"
              className="w-full h-full rounded-full object-cover border border-zinc-700 shadow"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-lg cursor-pointer text-sm">
              Alterar foto
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </label>

            <button
              onClick={removePhoto}
              className="text-red-400 hover:text-red-300 text-xs"
            >
              Remover foto
            </button>
          </div>
        </div>

        {/* Nome */}
        <div className="mt-6">
          <label className="text-sm text-zinc-400">Nome</label>
          <input
            type="text"
            className="w-full mt-1 p-3 bg-zinc-800 border border-zinc-700 rounded-lg outline-none focus:border-sky-500 transition"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Bio */}
        <div className="mt-4">
          <label className="text-sm text-zinc-400">Bio</label>
          <textarea
            className="w-full mt-1 p-3 bg-zinc-800 border border-zinc-700 rounded-lg outline-none focus:border-sky-500 transition"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
        </div>

        {/* Email */}
        <div className="mt-4">
          <label className="text-sm text-zinc-400">Email</label>
          <input
            type="text"
            value={user?.email || ''}
            disabled
            className="w-full mt-1 p-3 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-500"
          />
        </div>

        {/* Salvar */}
        <button
          onClick={saveProfile}
          className="w-full mt-6 py-3 bg-sky-600 hover:bg-sky-500 rounded-lg font-semibold transition"
        >
          Salvar alterações
        </button>
      </div>
    </div>
  );
}
