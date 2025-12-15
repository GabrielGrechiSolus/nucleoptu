'use client';

import React, { useEffect, useState, useCallback } from "react";
import withAuth from "../components/withAuth"; // Seu HOC de autenticação
import EmojiPicker from 'emoji-picker-react';
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  getDocs,
  query,
  orderBy,
  limit,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  onSnapshot, // Usando onSnapshot para tempo real (opcional, mas bom para feeds)
  increment
} from "firebase/firestore";
import { db, auth } from "../../firebase"; // Sua configuração do Firebase

import {
  Heart,
  MessageCircle,
  Repeat2,
  Share,
  MoreHorizontal,
  Image as ImageIcon,
  Smile,
  Trash2,
  Send,
  Loader2
} from "lucide-react";

// --- Tipos ---

interface UserData {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

interface Comment {
  id: string;
  content: string;
  createdAt: any; // Firestore Timestamp
  user: UserData;
}

interface Post {
  id: string;
  content: string;
  image?: string; // URL da imagem (opcional)
  createdAt: any;
  user: UserData;
  likes: string[]; // Array de UIDs que curtiram
  repostedBy: string[]; // Array de UIDs que repostaram
  commentsCount?: number; // Contador de comentários
}

// --- Sub-componente: Item do Post (Para isolar lógica de comentários/likes) ---
const PostItem = ({ post, currentUser, onDelete }: { post: Post, currentUser: any, onDelete: (id: string) => void }) => {
  const [isLiked, setIsLiked] = useState(post.likes.includes(currentUser?.uid));
  const [likesCount, setLikesCount] = useState(post.likes.length);
  const [isReposted, setIsReposted] = useState(post.repostedBy?.includes(currentUser?.uid));
  const [repostsCount, setRepostsCount] = useState(post.repostedBy?.length || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);

  // Formatar data simples
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "agora";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);
  };

  // Lógica de Like
  const toggleLike = async () => {
    if (!currentUser) return;
    
    // UI Otimista
    const prevIsLiked = isLiked;
    setIsLiked(!prevIsLiked);
    setLikesCount(prev => prevIsLiked ? prev - 1 : prev + 1);

    const postRef = doc(db, "posts", post.id);
    try {
      if (prevIsLiked) {
        await updateDoc(postRef, { likes: arrayRemove(currentUser.uid) });
      } else {
        await updateDoc(postRef, { likes: arrayUnion(currentUser.uid) });
      }
    } catch (error) {
      console.error("Erro ao curtir:", error);
      // Reverte em caso de erro
      setIsLiked(prevIsLiked);
      setLikesCount(post.likes.length);
    }
  };

  // Lógica de Repost
  const toggleRepost = async () => {
    if (!currentUser) return;

    // UI Otimista
    const prevIsReposted = isReposted;
    setIsReposted(!prevIsReposted);
    setRepostsCount(prev => prevIsReposted ? prev - 1 : prev + 1);

    const postRef = doc(db, "posts", post.id);
    try {
      if (prevIsReposted) {
        await updateDoc(postRef, { repostedBy: arrayRemove(currentUser.uid), repostsCount: increment(-1) });
      } else {
        await updateDoc(postRef, { repostedBy: arrayUnion(currentUser.uid), repostsCount: increment(1) });
      }
    } catch (error) {
      console.error("Erro ao repostar:", error);
      // Reverte em caso de erro
      setIsReposted(prevIsReposted);
    }
  };

  // Carregar Comentários (Sub-coleção)
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
      const loadedComments = snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment));
      setComments(loadedComments);
    } catch (error) {
      console.error("Erro ao carregar comentários", error);
    } finally {
      setLoadingComments(false);
    }
  };

  // Enviar Comentário
  const handleSendComment = async () => {
    if (!newComment.trim() || !currentUser) return;

    const commentData = {
      content: newComment,
      createdAt: serverTimestamp(),
      user: {
        uid: currentUser.uid,
        displayName: currentUser.displayName || currentUser.email.split('@')[0],
        email: currentUser.email,
        photoURL: currentUser.photoURL
      }
    };

    try {
      // Adiciona na sub-coleção
      const docRef = await addDoc(collection(db, "posts", post.id, "comments"), commentData);
      
      // Incrementa o contador de comentários no post pai
      const postRef = doc(db, "posts", post.id);
      await updateDoc(postRef, { commentsCount: increment(1) });

      // Atualiza estado local imediatamente
      setComments([...comments, { id: docRef.id, ...commentData, createdAt: new Date() } as Comment]);
      setNewComment("");
    } catch (error) {
      console.error("Erro ao comentar:", error);
    }
  };

  // Deletar Comentário
  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este comentário?")) return;

    try {
      // Referência para o comentário e para o post pai
      const commentRef = doc(db, "posts", post.id, "comments", commentId);
      const postRef = doc(db, "posts", post.id);

      // Deleta o comentário
      await deleteDoc(commentRef);

      // Decrementa o contador no post pai
      await updateDoc(postRef, { commentsCount: increment(-1) });

      // Atualiza o estado local para remover o comentário da UI
      setComments(comments.filter(c => c.id !== commentId));
    } catch (error) {
      console.error("Erro ao deletar comentário:", error);
    }
  };

  return (
    <div className="border-b border-zinc-800 p-4 hover:bg-zinc-900/30 transition-colors">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-zinc-700 overflow-hidden">
            {post.user.photoURL ? (
              <img src={post.user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-zinc-400 font-bold">
                {post.user.displayName?.[0]?.toUpperCase() || "U"}
              </div>
            )}
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-zinc-100 truncate">{post.user.displayName}</span>
              <span className="text-zinc-500 text-sm truncate">@{post.user.email.split('@')[0]}</span>
              <span className="text-zinc-600 text-xs">• {formatDate(post.createdAt)}</span>
            </div>
            {currentUser?.uid === post.user.uid && (
              <button onClick={() => onDelete(post.id)} className="text-zinc-500 hover:text-red-500 transition">
                <Trash2 size={16} />
              </button>
            )}
          </div>

          <p className="text-zinc-200 mt-1 whitespace-pre-wrap break-words text-sm md:text-base">
            {post.content}
          </p>

          {/* Imagem do Post (se houver) */}
          {post.image && (
            <div className="mt-3 rounded-xl overflow-hidden border border-zinc-800">
              <img src={post.image} alt="Post content" className="w-full h-auto max-h-96 object-cover" />
            </div>
          )}

          {/* Ações */}
          <div className="flex justify-between items-center mt-3 max-w-md text-zinc-500">
            <button 
              onClick={loadComments}
              className={`flex items-center gap-2 group transition ${showComments ? "text-sky-500" : "hover:text-sky-500"}`}
            >
              <div className="p-2 rounded-full group-hover:bg-sky-500/10">
                <MessageCircle size={18} />
              </div>
              <span className="text-sm">{post.commentsCount && post.commentsCount > 0 ? post.commentsCount : ""}</span>
            </button>

            <button 
              onClick={toggleRepost}
              className={`flex items-center gap-2 group transition ${isReposted ? "text-green-500" : "hover:text-green-500"}`}
            >
              <div className="p-2 rounded-full group-hover:bg-green-500/10">
                <Repeat2 size={18} />
              </div>
              <span className="text-sm">{repostsCount > 0 && repostsCount}</span>
            </button>

            <button 
              onClick={toggleLike}
              className={`flex items-center gap-2 group transition ${isLiked ? "text-pink-600" : "hover:text-pink-600"}`}
            >
              <div className="p-2 rounded-full group-hover:bg-pink-600/10">
                <Heart size={18} fill={isLiked ? "currentColor" : "none"} />
              </div>
              <span className="text-sm">{likesCount > 0 && likesCount}</span>
            </button>

            {/* botão de copiar link removido para evitar geração de URLs absolutas (localhost) */}
          </div>

          {/* Área de Comentários */}
          {showComments && (
            <div className="mt-4 pt-3 border-t border-zinc-800 animate-in fade-in slide-in-from-top-2">
              {loadingComments ? (
                <div className="flex justify-center py-2"><Loader2 className="animate-spin text-sky-500" size={20}/></div>
              ) : (
                <div className="space-y-3 mb-4">
                  {comments.length === 0 && <p className="text-zinc-600 text-sm text-center">Seja o primeiro a comentar.</p>}
                  {comments.map(comment => (
                    <div key={comment.id} className="flex gap-2 text-sm">
                      <div className="w-6 h-6 rounded-full bg-zinc-700 flex-shrink-0 overflow-hidden">
                         {/* Avatar simples para comentário */}
                         <div className="w-full h-full flex items-center justify-center text-xs">
                           {comment.user.displayName[0]}
                         </div>
                      </div>
                      <div className="bg-zinc-900 p-2 rounded-lg rounded-tl-none flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-zinc-300 text-xs">{comment.user.displayName}</span>
                          {/* Botão de deletar, visível apenas para o autor do comentário */}
                          {currentUser?.uid === comment.user.uid && (
                            <button onClick={() => handleDeleteComment(comment.id)} className="text-zinc-600 hover:text-red-500 transition p-1">
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                        <p className="text-zinc-300">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Input de Comentário */}
              <div className="flex gap-2 items-center">
                <input 
                  type="text" 
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-sky-500 transition"
                  placeholder="Postar sua resposta"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                />
                <button 
                  onClick={handleSendComment}
                  disabled={!newComment.trim()}
                  className="text-sky-500 disabled:opacity-50 hover:bg-sky-500/10 p-2 rounded-full transition"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Componente Principal da Página ---

const SocialFeed = () => {
  const user = auth.currentUser;
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  // Carregar Posts (Snapshot em tempo real)
  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(50));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Garante que commentsCount seja sempre um número, mesmo para posts antigos sem o campo
        // ou para posts novos que ainda não tiveram o contador atualizado pelo servidor.
        // Se for undefined/null, define como 0.
        commentsCount: doc.data().commentsCount || 0 
      } as Post));
      setPosts(loadedPosts);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar posts:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Criar Post
  const handleCreatePost = async () => {
    if (!newPostContent.trim() || !user) return;
    setIsPosting(true);

    try {
      await addDoc(collection(db, "posts"), {
        content: newPostContent,
        createdAt: serverTimestamp(),
        likes: [], // UIDs de quem curtiu
        repostedBy: [], // UIDs de quem repostou
        repostsCount: 0, // Contador de reposts
        commentsCount: 0,
        user: {
          uid: user.uid,
          displayName: user.displayName || "Usuário",
          email: user.email,
          photoURL: user.photoURL || null
        }
      });
      setNewPostContent("");
    } catch (error) {
      console.error("Erro ao criar post:", error);
    } finally {
      setIsPosting(false);
    }
  };

  // Deletar Post
  const handleDeletePost = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este post?")) return;
    try {
      await deleteDoc(doc(db, "posts", id));
    } catch (error) {
      console.error("Erro ao deletar:", error);
    }
  };

  return (
    <main className="flex flex-col w-full min-h-screen bg-zinc-950 text-zinc-100">
      
      {/* Header Fixo (Mobile/Desktop) */}
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md p-4 cursor-pointer" onClick={() => window.scrollTo({top:0, behavior:'smooth'})}>
        <h1 className="text-lg font-bold">Página Inicial</h1>
      </header>

      {/* Área de Criação */}
      <div className="border-b border-zinc-800 p-4 hidden md:flex gap-4">
        <div className="w-10 h-10 rounded-full bg-zinc-700 flex-shrink-0 overflow-hidden">
           {/* Avatar do Usuário Logado */}
           {user?.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center">User</div>}
        </div>
        <div className="flex-1 flex flex-col gap-3">
          <textarea
            className="w-full bg-transparent text-lg placeholder-zinc-500 resize-none focus:outline-none min-h-[60px] py-2"
            placeholder="O que está acontecendo?"
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
          />
          <div className="flex justify-between items-center border-t border-zinc-800 pt-3">
            <button 
              onClick={handleCreatePost}
              disabled={!newPostContent.trim() || isPosting}
              className="bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-5 rounded-full transition text-sm"
            >
              {isPosting ? "Postando..." : "Postar"}
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Posts */}
      <div className="flex flex-col pb-20">
        {loading ? (
          <div className="flex items-center justify-center p-10">
            <Loader2 className="animate-spin text-sky-500" size={32} />
          </div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-zinc-500">
            Nenhum post encontrado. Seja o primeiro!
          </div>
        ) : (
          posts.map((post) => (
            <PostItem 
              key={post.id} 
              post={post} 
              currentUser={user} 
              onDelete={handleDeletePost}
            />
          ))
        )}
      </div>

      {/* Floating Action Button (Mobile Only) */}
      <button 
        className="md:hidden fixed bottom-6 right-6 bg-sky-500 hover:bg-sky-600 text-white p-4 rounded-full shadow-lg z-30"
        onClick={() => {
           // Aqui você abriria um modal de criação no mobile
           // Para simplificar, foca no input se estiver visível ou scrolla pro topo
           window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      >
        <Send size={24} />
      </button>

    </main>
  );
};

export default withAuth(SocialFeed);