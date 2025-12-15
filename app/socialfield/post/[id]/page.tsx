'use client';

import React, { useEffect, useState } from 'react';
import withAuth from '../../../components/withAuth';
import { doc, getDoc, collection, getDocs, addDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from '../../../../firebase';

const PostView = ({ params }: { params: { id: string } }) => {
  const { id } = params;
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const user = auth.currentUser;

  useEffect(() => {
    const load = async () => {
      try {
        const ref = doc(db, 'posts', id);
        const snap = await getDoc(ref);
        if (snap.exists()) setPost({ id: snap.id, ...snap.data() });

        const q = collection(db, 'posts', id, 'comments');
        const snapComments = await getDocs(q);
        setComments(snapComments.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Erro ao carregar post:', err);
      }
    };
    void load();
  }, [id]);

  const handleSendComment = async () => {
    if (!newComment.trim() || !user) return;
    try {
      const commentData = {
        content: newComment,
        createdAt: serverTimestamp(),
        user: {
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0],
          email: user.email,
          photoURL: user.photoURL || null
        }
      };
      const docRef = await addDoc(collection(db, 'posts', id, 'comments'), commentData);
      await updateDoc(doc(db, 'posts', id), { commentsCount: increment(1) });
      setComments([...comments, { id: docRef.id, ...commentData, createdAt: new Date() }]);
      setNewComment('');
    } catch (err) {
      console.error('Erro ao comentar:', err);
    }
  };

  if (!post) return <div className="p-6">Post não encontrado.</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">{post.user?.displayName || 'Usuário'}</h1>
      <div className="text-sm text-zinc-400 mb-4">{new Date(post.createdAt?.toDate ? post.createdAt.toDate() : post.createdAt).toLocaleString()}</div>
      <div className="mb-4 whitespace-pre-wrap">{post.content}</div>

      <div className="mt-6">
        <h2 className="font-semibold mb-2">Comentários</h2>
        {comments.map(c => (
          <div key={c.id} className="border-b border-zinc-800 py-2">
            <div className="text-sm font-bold">{c.user?.displayName}</div>
            <div className="text-sm">{c.content}</div>
          </div>
        ))}

        <div className="mt-4 flex gap-2">
          <input value={newComment} onChange={(e) => setNewComment(e.target.value)} className="flex-1 p-2 rounded bg-zinc-900 border border-zinc-800" placeholder="Adicionar comentário" />
          <button onClick={handleSendComment} className="px-3 py-2 rounded bg-sky-600 hover:bg-sky-700">Enviar</button>
        </div>
      </div>
    </div>
  );
};

export default withAuth(PostView);
