"use client";

import React, { useState } from "react";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "../../firebase";
import { Heart, MessageCircle, Repeat2, Share, Trash2, Send, Loader2 } from "lucide-react";

export interface UserData {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string | null;
}

export interface Comment {
  id: string;
  content: string;
  createdAt: any;
  user: UserData;
}

export interface Post {
  id: string;
  content: string;
  image?: string;
  createdAt: any;
  user: UserData;
  likes: string[];
  repostedBy?: string[];
  commentsCount?: number;
}

const PostItem: React.FC<{ post: Post; currentUser: any; onDelete: (id: string) => void }> = ({ post, currentUser, onDelete }) => {
  const [isLiked, setIsLiked] = useState(post.likes?.includes(currentUser?.uid));
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [isReposted, setIsReposted] = useState(post.repostedBy?.includes(currentUser?.uid));
  const [repostsCount, setRepostsCount] = useState(post.repostedBy?.length || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "agora";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date);
  };

  const toggleLike = async () => {
    if (!currentUser) return;
    const prev = isLiked;
    setIsLiked(!prev);
    setLikesCount((c) => (prev ? c - 1 : c + 1));
    const postRef = doc(db, "posts", post.id);
    try {
      if (prev) await updateDoc(postRef, { likes: arrayRemove(currentUser.uid) });
      else await updateDoc(postRef, { likes: arrayUnion(currentUser.uid) });
    } catch (err) {
      console.error(err);
      setIsLiked(prev);
      setLikesCount(post.likes?.length || 0);
    }
  };

  const toggleRepost = async () => {
    if (!currentUser) return;
    const prev = isReposted;
    setIsReposted(!prev);
    setRepostsCount((c) => (prev ? c - 1 : c + 1));
    const postRef = doc(db, "posts", post.id);
    try {
      if (prev) await updateDoc(postRef, { repostedBy: arrayRemove(currentUser.uid), repostsCount: increment(-1) });
      else await updateDoc(postRef, { repostedBy: arrayUnion(currentUser.uid), repostsCount: increment(1) });
    } catch (err) {
      console.error(err);
      setIsReposted(prev);
    }
  };

  const loadComments = async () => {
    if (showComments) {
      setShowComments(false);
      return;
    }
    setLoadingComments(true);
    setShowComments(true);
    try {
      const q = query(collection(db, "posts", post.id, "comments"), orderBy("createdAt", "asc"));
      const snap = await getDocs(q);
      const loaded = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Comment));
      setComments(loaded);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSendComment = async () => {
    if (!newComment.trim() || !currentUser) return;
    const commentData = {
      content: newComment,
      createdAt: serverTimestamp(),
      user: {
        uid: currentUser.uid,
        displayName: currentUser.displayName || currentUser.email?.split("@")[0],
        email: currentUser.email,
        photoURL: currentUser.photoURL || null,
      },
    };
    try {
      const docRef = await addDoc(collection(db, "posts", post.id, "comments"), commentData);
      await updateDoc(doc(db, "posts", post.id), { commentsCount: increment(1) });
      setComments([...comments, { id: docRef.id, ...commentData, createdAt: new Date() } as Comment]);
      setNewComment("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este comentário?")) return;
    try {
      await deleteDoc(doc(db, "posts", post.id, "comments", commentId));
      await updateDoc(doc(db, "posts", post.id), { commentsCount: increment(-1) });
      setComments(comments.filter((c) => c.id !== commentId));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="border-b border-zinc-800 p-4 hover:bg-zinc-900/30 transition-colors">
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-zinc-700 overflow-hidden">
            {post.user.photoURL ? (
              <img src={post.user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold">{post.user.displayName?.[0]?.toUpperCase() || 'U'}</div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-zinc-100 truncate">{post.user.displayName}</span>
              <span className="text-zinc-500 text-sm truncate">@{post.user.email.split("@")[0]}</span>
              <span className="text-zinc-600 text-xs">• {formatDate(post.createdAt)}</span>
            </div>
            {currentUser?.uid === post.user.uid && (
              <button onClick={() => onDelete(post.id)} className="text-zinc-500 hover:text-red-500 transition"><Trash2 size={16} /></button>
            )}
          </div>

          <p className="text-zinc-200 mt-1 whitespace-pre-wrap break-words text-sm md:text-base">{post.content}</p>

          {post.image && (
            <div className="mt-3 rounded-xl overflow-hidden border border-zinc-800">
              <img src={post.image} alt="Post content" className="w-full h-auto max-h-96 object-cover" />
            </div>
          )}

          <div className="flex justify-between items-center mt-3 max-w-md text-zinc-500">
            <button onClick={loadComments} className={`flex items-center gap-2 group transition ${showComments ? "text-sky-500" : "hover:text-sky-500"}`}>
              <div className="p-2 rounded-full group-hover:bg-sky-500/10"><MessageCircle size={18} /></div>
              <span className="text-sm">{post.commentsCount && post.commentsCount > 0 ? post.commentsCount : ""}</span>
            </button>

            <button onClick={toggleRepost} className={`flex items-center gap-2 group transition ${isReposted ? "text-green-500" : "hover:text-green-500"}`}>
              <div className="p-2 rounded-full group-hover:bg-green-500/10"><Repeat2 size={18} /></div>
              <span className="text-sm">{repostsCount > 0 && repostsCount}</span>
            </button>

            <button onClick={toggleLike} className={`flex items-center gap-2 group transition ${isLiked ? "text-pink-600" : "hover:text-pink-600"}`}>
              <div className="p-2 rounded-full group-hover:bg-pink-600/10"><Heart size={18} fill={isLiked ? "currentColor" : "none"} /></div>
              <span className="text-sm">{likesCount > 0 && likesCount}</span>
            </button>

            {/* botão de copiar link removido para evitar geração de URLs absolutas (localhost) */}
          </div>

          {showComments && (
            <div className="mt-4 pt-3 border-t border-zinc-800 animate-in fade-in slide-in-from-top-2">
              {loadingComments ? (
                <div className="flex justify-center py-2"><Loader2 className="animate-spin text-sky-500" size={20} /></div>
              ) : (
                <div className="space-y-3 mb-4">
                  {comments.length === 0 && <p className="text-zinc-600 text-sm text-center">Seja o primeiro a comentar.</p>}
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2 text-sm">
                      <div className="w-6 h-6 rounded-full bg-zinc-700 flex-shrink-0 overflow-hidden"><div className="w-full h-full flex items-center justify-center text-xs">{comment.user.displayName[0]}</div></div>
                      <div className="bg-zinc-900 p-2 rounded-lg rounded-tl-none flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-zinc-300 text-xs">{comment.user.displayName}</span>
                          {currentUser?.uid === comment.user.uid && (
                            <button onClick={() => handleDeleteComment(comment.id)} className="text-zinc-600 hover:text-red-500 transition p-1"><Trash2 size={12} /></button>
                          )}
                        </div>
                        <p className="text-zinc-300">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 items-center">
                <input type="text" className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-sky-500 transition" placeholder="Postar sua resposta" value={newComment} onChange={(e) => setNewComment(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendComment()} />
                <button onClick={handleSendComment} disabled={!newComment.trim()} className="text-sky-500 disabled:opacity-50 hover:bg-sky-500/10 p-2 rounded-full transition"><Send size={18} /></button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { PostItem };
