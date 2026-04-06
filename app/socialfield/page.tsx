'use client';

import React, { useEffect, useState, useCallback, useRef } from "react";
import withAuth from "../components/withAuth";
import EmojiPicker, { Theme } from 'emoji-picker-react';
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
  onSnapshot,
  increment,
  getDoc,
  where,
  writeBatch
} from "firebase/firestore";
import { db, auth } from "../../firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";

import {
  Heart,
  MessageCircle,
  Repeat2,
  Share2,
  MoreHorizontal,
  Image as ImageIcon,
  Smile,
  Trash2,
  Send,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Copy,
  Check,
  Home,
  Search,
  Bell,
  User,
  PlusCircle,
  LogOut,
  Globe,
  Lock,
  Hash,
  AtSign,
  Link2,
  Code,
  FileImage
} from "lucide-react";

// ==================== TIPOS ====================

interface UserData {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  username?: string;
}

interface Comment {
  id: string;
  content: string;
  createdAt: any;
  user: UserData;
  userId: string;
  likes?: string[];
  replies?: number;
}

interface Post {
  id: string;
  content: string;
  image?: string;
  images?: string[];
  gif?: string;
  code?: {
    language: string;
    content: string;
  };
  link?: {
    url: string;
    title?: string;
    description?: string;
    image?: string;
  };
  createdAt: any;
  user: UserData;
  userId: string;
  likes: string[];
  repostedBy: string[];
  repostsCount: number;
  commentsCount: number;
  views?: number;
  mentions?: string[];
  hashtags?: string[];
  isPublic?: boolean;
  edited?: boolean;
  editedAt?: any;
}

// ==================== UTILS ====================

const extractHashtags = (text: string): string[] => {
  const regex = /#(\w+)/g;
  const matches = text.match(regex);
  return matches ? matches.map(tag => tag.slice(1)) : [];
};

const extractMentions = (text: string): string[] => {
  const regex = /@(\w+)/g;
  const matches = text.match(regex);
  return matches ? matches.map(mention => mention.slice(1)) : [];
};

const extractLinks = (text: string): string | null => {
  const regex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(regex);
  return matches ? matches[0] : null;
};

const formatDate = (timestamp: any) => {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: days > 365 ? 'numeric' : undefined
  }).format(date);
};

const formatContent = (text: string) => {
  if (!text) return null;

  const parts = text.split(/((?:https?:\/\/[^\s]+)|#\w+|@\w+)/g);

  return parts.map((part, index) => {
    if (part.match(/https?:\/\/[^\s]+/)) {
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sky-500 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    } else if (part.match(/#\w+/)) {
      return (
        <Link
          key={index}
          href={`/explore?tag=${part.slice(1)}`}
          className="text-sky-500 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </Link>
      );
    } else if (part.match(/@\w+/)) {
      return (
        <Link
          key={index}
          href={`/profile/${part.slice(1)}`}
          className="text-sky-500 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </Link>
      );
    }
    return part;
  });
};

// ==================== COMPONENTES AUXILIARES ====================

const CodeBlock = ({ language, content }: { language: string; content: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group my-2 rounded-lg overflow-hidden border border-zinc-800">
      <div className="flex justify-between items-center bg-zinc-900 px-3 py-1 border-b border-zinc-800">
        <span className="text-xs text-zinc-400">{language || 'código'}</span>
        <button
          onClick={handleCopy}
          className="text-zinc-400 hover:text-white transition p-1"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
        </button>
      </div>
      <pre className="bg-zinc-950 p-3 overflow-x-auto text-sm font-mono">
        <code>{content}</code>
      </pre>
    </div>
  );
};

const LinkPreview = ({ url }: { url: string }) => {
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Aqui você faria uma chamada à sua API de preview
    // Por enquanto, apenas extraímos o domínio
    try {
      const domain = new URL(url).hostname;
      setPreview({ domain });
    } catch (e) {
      console.error("URL inválida", e);
    } finally {
      setLoading(false);
    }
  }, [url]);

  if (loading) {
    return <div className="animate-pulse bg-zinc-800 h-16 rounded-lg mt-2" />;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-2 p-3 bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 transition"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 text-sm text-zinc-400 mb-1">
        <Link2 size={14} />
        <span className="truncate">{preview?.domain || url}</span>
      </div>
      <div className="text-xs text-zinc-500 truncate">
        {url}
      </div>
    </a>
  );
};

const GIFPicker = ({ onSelect, onClose }: { onSelect: (gifUrl: string) => void; onClose: () => void }) => {
  const [search, setSearch] = useState('');
  const [gifs, setGifs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [trending, setTrending] = useState<any[]>([]);

  // Carregar GIFs em alta ao abrir
  useEffect(() => {
    loadTrending();
  }, []);

  const loadTrending = async () => {
    setLoading(true);
    try {
      // Usando a API pública do GIPHY (rate limited)
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/trending?api_key=GlVGYHkr3WSBnllca54iNt0yFbjz7L65&limit=20`
      );
      const data = await response.json();
      setTrending(data.data);
    } catch (error) {
      console.error('Erro ao buscar GIFs em alta:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchGifs = async (query: string) => {
    if (!query) {
      setGifs([]);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=GlVGYHkr3WSBnllca54iNt0yFbjz7L65&q=${query}&limit=20`
      );
      const data = await response.json();
      setGifs(data.data);
    } catch (error) {
      console.error('Erro ao buscar GIFs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (search) {
      const debounce = setTimeout(() => searchGifs(search), 500);
      return () => clearTimeout(debounce);
    } else {
      setGifs([]);
    }
  }, [search]);

  const displayGifs = gifs.length > 0 ? gifs : trending;

  return (
    <div className="absolute bottom-full mb-2 w-80 bg-zinc-900 rounded-lg border border-zinc-800 shadow-xl z-50">
      <div className="p-2 border-b border-zinc-800 flex justify-between items-center">
        <h3 className="text-sm font-semibold">Escolha um GIF</h3>
        <button onClick={onClose} className="text-zinc-400 hover:text-white">
          <X size={16} />
        </button>
      </div>
      <div className="p-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pesquisar GIFs..."
          className="w-full bg-zinc-800 text-sm rounded px-3 py-2 outline-none focus:ring-1 focus:ring-sky-500"
        />
      </div>
      <div className="max-h-64 overflow-y-auto p-2 grid grid-cols-2 gap-1">
        {loading ? (
          <div className="col-span-2 flex justify-center py-4">
            <Loader2 className="animate-spin text-sky-500" size={24} />
          </div>
        ) : displayGifs.length === 0 ? (
          <div className="col-span-2 text-center py-4 text-zinc-500 text-sm">
            Nenhum GIF encontrado
          </div>
        ) : (
          displayGifs.map((gif) => (
            <button
              key={gif.id}
              onClick={() => onSelect(gif.images.fixed_height.url)}
              className="rounded overflow-hidden hover:opacity-80 transition"
            >
              <img
                src={gif.images.fixed_height.url}
                alt="GIF"
                className="w-full h-24 object-cover"
                loading="lazy"
              />
            </button>
          ))
        )}
      </div>
    </div>
  );
};

// ==================== POST ITEM ====================

const PostItem = ({ post, currentUser, onDelete, onUpdate }: {
  post: Post;
  currentUser: any;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, data: any) => void;
}) => {
  const router = useRouter();
  const [isLiked, setIsLiked] = useState(currentUser?.uid ? post.likes?.includes(currentUser.uid) || false : false);
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [isReposted, setIsReposted] = useState(currentUser?.uid ? post.repostedBy?.includes(currentUser.uid) || false : false);
  const [repostsCount, setRepostsCount] = useState(post.repostsCount || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [copied, setCopied] = useState(false);

  const commentInputRef = useRef<HTMLInputElement>(null);

  // Curtir
  const toggleLike = async () => {
    if (!currentUser) return;

    const prevIsLiked = isLiked;
    setIsLiked(!prevIsLiked);
    setLikesCount(prev => prevIsLiked ? prev - 1 : prev + 1);

    const postRef = doc(db, "posts", post.id);
    try {
      if (prevIsLiked) {
        await updateDoc(postRef, {
          likes: arrayRemove(currentUser.uid),
          likesCount: increment(-1)
        });
      } else {
        await updateDoc(postRef, {
          likes: arrayUnion(currentUser.uid),
          likesCount: increment(1),
          views: increment(1)
        });
      }
    } catch (error) {
      console.error("Erro ao curtir:", error);
      setIsLiked(prevIsLiked);
      setLikesCount(post.likes?.length || 0);
    }
  };

  // Repost
  const toggleRepost = async () => {
    if (!currentUser) return;

    const prevIsReposted = isReposted;
    setIsReposted(!prevIsReposted);
    setRepostsCount(prev => prevIsReposted ? prev - 1 : prev + 1);

    const postRef = doc(db, "posts", post.id);
    try {
      if (prevIsReposted) {
        await updateDoc(postRef, {
          repostedBy: arrayRemove(currentUser.uid),
          repostsCount: increment(-1)
        });
      } else {
        await updateDoc(postRef, {
          repostedBy: arrayUnion(currentUser.uid),
          repostsCount: increment(1)
        });
      }
    } catch (error) {
      console.error("Erro ao repostar:", error);
      setIsReposted(prevIsReposted);
      setRepostsCount(post.repostsCount || 0);
    }
  };

  // Carregar comentários
  const loadComments = async () => {
    if (showComments) {
      setShowComments(false);
      return;
    }

    setLoadingComments(true);
    setShowComments(true);
    try {
      const q = query(
        collection(db, "posts", post.id, "comments"),
        orderBy("createdAt", "asc")
      );
      const snap = await getDocs(q);
      const loadedComments = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as Comment));
      setComments(loadedComments);
    } catch (error) {
      console.error("Erro ao carregar comentários", error);
    } finally {
      setLoadingComments(false);
    }
  };

  // Enviar comentário
  const handleSendComment = async () => {
    if (!newComment.trim() || !currentUser || sendingComment) return;

    setSendingComment(true);
    const commentData = {
      content: newComment,
      createdAt: serverTimestamp(),
      userId: currentUser.uid,
      user: {
        uid: currentUser.uid,
        displayName: currentUser.displayName || currentUser.email?.split('@')[0] || "Usuário",
        email: currentUser.email,
        photoURL: currentUser.photoURL
      }
    };

    try {
      const docRef = await addDoc(collection(db, "posts", post.id, "comments"), commentData);
      await updateDoc(doc(db, "posts", post.id), { commentsCount: increment(1) });

      setComments([...comments, {
        id: docRef.id,
        ...commentData,
        createdAt: new Date()
      } as Comment]);

      setNewComment("");
      setShowEmojiPicker(false);
    } catch (error) {
      console.error("Erro ao comentar:", error);
    } finally {
      setSendingComment(false);
    }
  };

  // Deletar comentário
  const handleDeleteComment = async (commentId: string, commentUserId: string) => {
    if (commentUserId !== currentUser?.uid && post.userId !== currentUser?.uid) {
      alert("Você não tem permissão para deletar este comentário");
      return;
    }

    if (!window.confirm("Excluir comentário?")) return;

    try {
      await deleteDoc(doc(db, "posts", post.id, "comments", commentId));
      await updateDoc(doc(db, "posts", post.id), { commentsCount: increment(-1) });
      setComments(comments.filter(c => c.id !== commentId));
    } catch (error) {
      console.error("Erro ao deletar comentário:", error);
    }
  };

  // Compartilhar
  const handleShare = () => {
    const url = `${window.location.origin}/post/${post.id}`;

    if (navigator.share) {
      navigator.share({
        title: `Post de ${post.user?.displayName || 'Usuário'}`,
        text: post.content,
        url: url
      });
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Navegar para o post
  const goToPost = () => {
    router.push(`/post/${post.id}`);
  };

  return (
    <article className="border-b border-zinc-800 p-4 hover:bg-zinc-900/30 transition-colors">
      <div className="flex gap-3">
        {/* Avatar */}
        <Link href={`/profile/${post.userId}`} className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-purple-500 overflow-hidden">
            {post.user?.photoURL ? (
              <img src={post.user.photoURL} alt={post.user.displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold">
                {post.user?.displayName?.[0]?.toUpperCase() || "U"}
              </div>
            )}
          </div>
        </Link>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          {/* Cabeçalho */}
          <div className="flex justify-between items-start">
            <div className="flex items-baseline gap-2 flex-wrap">
              <Link href={`/profile/${post.userId}`} className="hover:underline">
                <span className="font-bold text-zinc-100">{post.user?.displayName || "Usuário"}</span>
              </Link>
              <span className="text-zinc-500 text-sm">@{post.user?.email?.split('@')[0] || "usuario"}</span>
              <span className="text-zinc-600 text-xs">• {formatDate(post.createdAt)}</span>
              {post.edited && <span className="text-zinc-600 text-xs">(editado)</span>}
              {post.isPublic === false && (
                <span className="text-zinc-600 text-xs flex items-center gap-1">
                  <Lock size={12} /> Privado
                </span>
              )}
            </div>

            {/* Menu de opções */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowOptions(!showOptions);
                }}
                className="text-zinc-500 hover:text-white transition p-1"
              >
                <MoreHorizontal size={16} />
              </button>

              {showOptions && (
                <div className="absolute right-0 mt-1 w-40 bg-zinc-900 rounded-lg border border-zinc-800 shadow-lg z-10">
                  {currentUser?.uid === post.userId && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(post.id);
                        setShowOptions(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-zinc-800 flex items-center gap-2"
                    >
                      <Trash2 size={14} /> Excluir
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare();
                      setShowOptions(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <Share2 size={14} /> Compartilhar
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Conteúdo do post */}
          <div
            onClick={goToPost}
            className="mt-1 text-zinc-200 whitespace-pre-wrap break-words text-sm md:text-base cursor-pointer"
          >
            {formatContent(post.content)}
          </div>

          {/* Código */}
          {post.code && (
            <div onClick={(e) => e.stopPropagation()}>
              <CodeBlock language={post.code.language} content={post.code.content} />
            </div>
          )}

          {/* Link Preview */}
          {post.link && !post.code && (
            <div onClick={(e) => e.stopPropagation()}>
              <LinkPreview url={post.link.url} />
            </div>
          )}

          {/* Imagem */}
          {post.image && (
            <div
              onClick={goToPost}
              className="mt-3 rounded-xl overflow-hidden border border-zinc-800 cursor-pointer"
            >
              <img
                src={post.image}
                alt="Post content"
                className="w-full h-auto max-h-96 object-cover hover:opacity-90 transition"
                loading="lazy"
              />
            </div>
          )}

          {/* GIF */}
          {post.gif && (
            <div
              onClick={goToPost}
              className="mt-3 rounded-xl overflow-hidden border border-zinc-800 cursor-pointer"
            >
              <img
                src={post.gif}
                alt="GIF"
                className="w-full h-auto max-h-96 object-cover"
                loading="lazy"
              />
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
              <span className="text-sm">{post.commentsCount > 0 && post.commentsCount}</span>
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

            <button
              onClick={handleShare}
              className="flex items-center gap-2 group hover:text-sky-500 transition"
            >
              <div className="p-2 rounded-full group-hover:bg-sky-500/10">
                {copied ? <Check size={18} /> : <Share2 size={18} />}
              </div>
            </button>
          </div>

          {/* Área de Comentários */}
          {showComments && (
            <div className="mt-4 pt-3 border-t border-zinc-800">
              {loadingComments ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="animate-spin text-sky-500" size={20} />
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
                    {comments.length === 0 && (
                      <p className="text-zinc-600 text-sm text-center py-2">
                        Seja o primeiro a comentar.
                      </p>
                    )}

                    {comments.map(comment => (
                      <div key={comment.id} className="flex gap-2 text-sm group">
                        <Link href={`/profile/${comment.userId}`} className="flex-shrink-0">
                          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-500 to-purple-500 overflow-hidden">
                            {comment.user?.photoURL ? (
                              <img src={comment.user.photoURL} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white text-xs">
                                {comment.user?.displayName?.[0] || "U"}
                              </div>
                            )}
                          </div>
                        </Link>

                        <div className="bg-zinc-900 p-2 rounded-lg rounded-tl-none flex-1">
                          <div className="flex justify-between items-start">
                            <div className="flex items-baseline gap-2">
                              <Link href={`/profile/${comment.userId}`} className="hover:underline">
                                <span className="font-bold text-zinc-300 text-xs">
                                  {comment.user?.displayName}
                                </span>
                              </Link>
                              <span className="text-zinc-600 text-[10px]">
                                {formatDate(comment.createdAt)}
                              </span>
                            </div>

                            {(currentUser?.uid === comment.userId || currentUser?.uid === post.userId) && (
                              <button
                                onClick={() => handleDeleteComment(comment.id, comment.userId)}
                                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500 transition"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                          <p className="text-zinc-300 text-xs mt-1">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input de comentário */}
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <input
                        ref={commentInputRef}
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                        placeholder="Adicionar comentário..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 text-sm text-white focus:outline-none focus:border-sky-500 transition pr-10"
                        disabled={sendingComment}
                      />

                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <div className="relative">
                          <button
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="text-zinc-400 hover:text-white transition"
                          >
                            <Smile size={16} />
                          </button>

                          {showEmojiPicker && (
                            <div className="absolute bottom-full right-0 mb-2 z-50">
                              <EmojiPicker
                                onEmojiClick={(emoji) => {
                                  setNewComment(prev => prev + emoji.emoji);
                                  setShowEmojiPicker(false);
                                }}
                                theme={Theme.DARK}
                                width={280}
                                height={350}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleSendComment}
                      disabled={!newComment.trim() || sendingComment}
                      className="text-sky-500 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-sky-500/10 p-2 rounded-full transition"
                    >
                      {sendingComment ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <Send size={18} />
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};

// ==================== COMPONENTE PRINCIPAL ====================

const SocialFeed = () => {
  const router = useRouter();
  const user = auth.currentUser;
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedGif, setSelectedGif] = useState<string | null>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState("javascript");
  const [codeContent, setCodeContent] = useState("");
  const [selectedCode, setSelectedCode] = useState<{ language: string; content: string } | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Carregar posts em tempo real
  useEffect(() => {
    const q = query(
      collection(db, "posts"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        likes: doc.data().likes || [],
        repostedBy: doc.data().repostedBy || [],
        repostsCount: doc.data().repostsCount || 0,
        commentsCount: doc.data().commentsCount || 0,
        mentions: doc.data().mentions || [],
        hashtags: doc.data().hashtags || []
      } as Post));
      setPosts(loadedPosts);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao buscar posts:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Upload de imagem (simulado - você precisa implementar no Firebase Storage)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      // Aqui você faria o upload para o Firebase Storage
      // Por enquanto, vamos criar uma URL local
      const url = URL.createObjectURL(file);
      setSelectedImage(url);
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
    } finally {
      setUploadingImage(false);
    }
  };

  // Criar post
  const handleCreatePost = async () => {
    if ((!newPostContent.trim() && !selectedImage && !selectedGif && !selectedCode) || !user || isPosting) return;

    setIsPosting(true);

    const link = extractLinks(newPostContent);
    const mentions = extractMentions(newPostContent);
    const hashtags = extractHashtags(newPostContent);

    const postData: any = {
      content: newPostContent,
      createdAt: serverTimestamp(),
      likes: [],
      repostedBy: [],
      repostsCount: 0,
      commentsCount: 0,
      views: 0,
      mentions,
      hashtags,
      isPublic,
      userId: user.uid,
      user: {
        uid: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || "Usuário",
        email: user.email,
        photoURL: user.photoURL || null
      }
    };

    if (selectedImage) {
      postData.image = selectedImage;
    }

    if (selectedGif) {
      postData.gif = selectedGif;
    }

    if (link && !selectedCode) {
      postData.link = { url: link };
    }

    if (selectedCode) {
      postData.code = selectedCode;
    }

    try {
      await addDoc(collection(db, "posts"), postData);

      // Reset form
      setNewPostContent("");
      setSelectedImage(null);
      setSelectedGif(null);
      setSelectedCode(null);
      setShowCodeInput(false);
      setIsPublic(true);

    } catch (error) {
      console.error("Erro ao criar post:", error);
    } finally {
      setIsPosting(false);
    }
  };

  // Deletar post
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
      <div className="max-w-3xl mx-auto w-full">
        {/* Área de Criação - Desktop */}
        <div className="border-b border-zinc-800 p-4 hidden md:block">
          <div className="flex gap-4">
            {/* Avatar do usuário */}
            <Link href="/profile" className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-500 to-purple-500 overflow-hidden">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold">
                    {user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
              </div>
            </Link>

            <div className="flex-1 flex flex-col gap-3">
              <textarea
                className="w-full bg-transparent text-lg placeholder-zinc-500 resize-none focus:outline-none min-h-[60px] py-2"
                placeholder="O que está acontecendo?"
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
              />

              {/* Preview de imagem */}
              {selectedImage && (
                <div className="relative rounded-lg overflow-hidden border border-zinc-800">
                  <img src={selectedImage} alt="Preview" className="w-full h-48 object-cover" />
                  <button
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Preview de GIF */}
              {selectedGif && (
                <div className="relative rounded-lg overflow-hidden border border-zinc-800">
                  <img src={selectedGif} alt="GIF" className="w-full h-48 object-cover" />
                  <button
                    onClick={() => setSelectedGif(null)}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Input de código */}
              {showCodeInput && !selectedCode && (
                <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-3">
                  <select
                    value={codeLanguage}
                    onChange={(e) => setCodeLanguage(e.target.value)}
                    className="bg-zinc-800 text-sm rounded px-2 py-1 mb-2 outline-none"
                  >
                    <option value="javascript">JavaScript</option>
                    <option value="typescript">TypeScript</option>
                    <option value="python">Python</option>
                    <option value="java">Java</option>
                    <option value="html">HTML</option>
                    <option value="css">CSS</option>
                    <option value="json">JSON</option>
                    <option value="bash">Bash</option>
                  </select>
                  <textarea
                    value={codeContent}
                    onChange={(e) => setCodeContent(e.target.value)}
                    placeholder="Cole seu código aqui..."
                    className="w-full bg-zinc-800 text-sm rounded p-2 font-mono outline-none min-h-[100px]"
                  />
                  <div className="flex gap-2 mt-2 justify-end">
                    <button
                      onClick={() => {
                        setShowCodeInput(false);
                        setCodeContent("");
                      }}
                      className="px-3 py-1 text-sm bg-zinc-800 rounded-full hover:bg-zinc-700"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        if (codeContent.trim()) {
                          setSelectedCode({ language: codeLanguage, content: codeContent });
                          setShowCodeInput(false);
                          setCodeContent("");
                        }
                      }}
                      className="px-3 py-1 text-sm bg-sky-500 rounded-full hover:bg-sky-600"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              )}

              {/* Preview de código */}
              {selectedCode && (
                <div className="relative rounded-lg overflow-hidden border border-zinc-800">
                  <CodeBlock language={selectedCode.language} content={selectedCode.content} />
                  <button
                    onClick={() => setSelectedCode(null)}
                    className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {/* Barra de ferramentas */}
              <div className="flex justify-between items-center border-t border-zinc-800 pt-3">
                <div className="flex gap-2">
                  {/* Upload de imagem */}
                  <label className="cursor-pointer text-zinc-400 hover:text-sky-500 transition p-2 hover:bg-zinc-900 rounded-full">
                    {uploadingImage ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      <ImageIcon size={20} />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>

                  {/* GIF picker */}
                  {/* GIF picker */}
                  <div className="relative">
                    <button
                      onClick={() => setShowGifPicker(!showGifPicker)}
                      className="text-zinc-400 hover:text-sky-500 transition p-2 hover:bg-zinc-900 rounded-full"
                    >
                      <FileImage size={20} /> {/* 👈 Use FileImage aqui também */}
                    </button>

                    {showGifPicker && (
                      <GIFPicker
                        onSelect={(gifUrl) => {
                          setSelectedGif(gifUrl);
                          setShowGifPicker(false);
                        }}
                        onClose={() => setShowGifPicker(false)}
                      />
                    )}
                  </div>
                  {/* Código */}
                  <button
                    onClick={() => setShowCodeInput(true)}
                    disabled={!!selectedCode}
                    className="text-zinc-400 hover:text-sky-500 transition p-2 hover:bg-zinc-900 rounded-full disabled:opacity-50"
                  >
                    <Code size={20} />
                  </button>

                  {/* Emoji picker */}
                  <div className="relative">
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="text-zinc-400 hover:text-sky-500 transition p-2 hover:bg-zinc-900 rounded-full"
                    >
                      <Smile size={20} />
                    </button>

                    {showEmojiPicker && (
                      <div className="absolute bottom-full left-0 mb-2 z-50">
                        <EmojiPicker
                          onEmojiClick={(emoji) => {
                            setNewPostContent(prev => prev + emoji.emoji);
                            setShowEmojiPicker(false);
                          }}
                          theme={Theme.DARK}
                          width={300}
                          height={400}
                        />
                      </div>
                    )}
                  </div>

                  {/* Privacidade */}
                  <button
                    onClick={() => setIsPublic(!isPublic)}
                    className={`flex items-center gap-1 text-xs px-2 rounded-full transition ${isPublic
                      ? 'text-zinc-400 hover:text-sky-500'
                      : 'text-sky-500 bg-zinc-900'
                      }`}
                  >
                    {isPublic ? <Globe size={16} /> : <Lock size={16} />}
                    <span className="hidden sm:inline">
                      {isPublic ? 'Público' : 'Privado'}
                    </span>
                  </button>
                </div>

                <button
                  onClick={handleCreatePost}
                  disabled={(!newPostContent.trim() && !selectedImage && !selectedGif && !selectedCode) || isPosting}
                  className="bg-gradient-to-r from-sky-500 to-purple-500 hover:from-sky-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2 px-5 rounded-full transition text-sm"
                >
                  {isPosting ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    "Postar"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Área de Criação - Mobile (simplificada) */}
        <div className="md:hidden border-b border-zinc-800 p-4">
          <div className="flex gap-3">
            <Link href="/profile" className="flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-purple-500 overflow-hidden">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                    {user?.displayName?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
              </div>
            </Link>
            <input
              type="text"
              placeholder="O que está acontecendo?"
              className="flex-1 bg-transparent text-sm placeholder-zinc-500 focus:outline-none"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              onFocus={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            />
            <button
              onClick={handleCreatePost}
              disabled={!newPostContent.trim() || isPosting}
              className="text-sky-500 disabled:opacity-50 font-medium text-sm"
            >
              {isPosting ? "..." : "Postar"}
            </button>
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
              <p className="mb-2">Nenhum post encontrado.</p>
              <p className="text-sm">Seja o primeiro a postar!</p>
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
      </div>

      {/* Floating Action Button (Mobile) */}
      <button
        className="md:hidden fixed bottom-6 right-6 bg-gradient-to-r from-sky-500 to-purple-500 text-white p-4 rounded-full shadow-lg z-30"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <PlusCircle size={24} />
      </button>

    </main>
  );
};

export default withAuth(SocialFeed);