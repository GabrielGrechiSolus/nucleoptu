'use client';

import React, { useEffect, useState } from 'react';
import withAuth from '../../components/withAuth';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../../../firebase';
import { useRouter } from 'next/navigation';

const NoticeView = ({ params }: { params: { id: string } }) => {
  const { id } = params;
  const [notice, setNotice] = useState<any>(null);
  const user = auth.currentUser;

  useEffect(() => {
    const load = async () => {
      try {
        const ref = doc(db, 'notices', id);
        const snap = await getDoc(ref);
        if (snap.exists()) setNotice({ id: snap.id, ...snap.data() });
      } catch (err) {
        console.error('Erro ao carregar aviso:', err);
      }
    };
    void load();
  }, [id]);

  const handleMarkRead = async () => {
    if (!user || !notice) return;
    try {
      await updateDoc(doc(db, 'notices', id), { readBy: arrayUnion(user.email || 'Desconhecido') });
      alert('Marcado como lido');
    } catch (err) {
      console.error(err);
    }
  };

  if (!notice) return <div className="p-6">Aviso não encontrado.</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">{notice.title}</h1>
      <div className="text-sm text-zinc-400 mb-4">Criado por: {notice.creatorEmail} • {new Date(notice.createdAt).toLocaleString()}</div>
      <div className="mb-4 whitespace-pre-wrap">{notice.description}</div>
      {notice.link && (
        <a href={notice.link} target="_blank" rel="noreferrer" className="text-sky-400 underline">Abrir link</a>
      )}

      <div className="mt-4 flex gap-2">
        <button onClick={handleMarkRead} className="px-3 py-2 rounded bg-sky-600 hover:bg-sky-700">Marcar como lido</button>
        <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert('Link copiado'); }} className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700">Copiar link</button>
      </div>
    </div>
  );
};

export default withAuth(NoticeView);
