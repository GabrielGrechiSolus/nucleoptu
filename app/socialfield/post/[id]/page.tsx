'use client';

import React, { useEffect, useState, useRef } from 'react';
import withAuth from '../../../components/withAuth';
import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  updateDoc,
  increment,
  deleteDoc,
  query,
  orderBy,
  arrayUnion,
  arrayRemove,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../../../../firebase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import EmojiPicker, { Theme } from 'emoji-picker-react';

import {
  Heart,
  MessageCircle,
  Share2,
  Trash2,
  Send,
  Loader2,
  ArrowLeft,
  MoreHorizontal,
  Smile,
  Copy,
  Check,
  Globe,
  Lock,
  Edit3,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

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
  reposts: string[];
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

const formatDate = (timestamp: any) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

const formatRelativeDate = (timestamp: any) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'agora';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit'
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
    <div className="relative group my-4 rounded-lg overflow-hidden border border-zinc-800">
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
    return <div className="animate-pulse bg-zinc-800 h-16 rounded-lg my-2" />;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block my-2 p-3 bg-zinc-900 rounded-lg border border-zinc-800 hover:border-zinc-700 transition"
    >
      <div className="flex items-center gap-2 text-sm text-zinc-400 mb-1">
        <Globe size={14} />
        <span className="truncate">{preview?.domain || url}</span>
      </div>
      <div className="text-xs text-zinc-500 truncate">
        {url}
      </div>
    </a>
  );
};

const ImageCarousel = ({ images }: { images: string[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (images.length === 1) {
    return (
      <div className="my-4 rounded-xl overflow-hidden border border-zinc-800">
        <img
          src={images[0]}
          alt="Post content"
          className="w-full h-auto max-h-96 object-contain bg-zinc-900"
        />
      </div>
    );
  }

  return (
    <div className="relative my-4 rounded-xl overflow-hidden border border-zinc-800">
      <div className="relative aspect-square">
        <img
          src={images[currentIndex]}
          alt={`Post image ${currentIndex + 1}`}
          className="w-full h-full object-contain bg-zinc-900"
        />

        {images.length > 1 && (
          <>
            <button
              onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setCurrentIndex(prev => Math.min(images.length - 1, prev + 1))}
              disabled={currentIndex === images.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={20} />
            </button>

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2 h-2 rounded-full transition ${idx === currentIndex ? 'bg-sky-500' : 'bg-white/50 hover:bg-white/70'
                    }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="text-xs text-center text-zinc-500 py-1">
          {currentIndex + 1} de {images.length}
        </div>
      )}
    </div>
  );
};

// ==================== COMPONENTE PRINCIPAL ====================

const PostView = ({ params }: { params: { id: string } }) => {
  const { id } = params;
  const router = useRouter();
  const user = auth.currentUser;

  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingComment, setSendingComment] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [showOptions, setShowOptions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const commentInputRef = useRef<HTMLInputElement>(null);

  // Carregar post e comentários
  useEffect(() => {
    const loadPostAndComments = async () => {
      try {
        setLoading(true);

        // Carregar post
        const postRef = doc(db, 'posts', id);
        const postSnap = await getDoc(postRef);

        if (!postSnap.exists()) {
          setPost(null);
          setLoading(false);
          return;
        }

        const postData = {
          id: postSnap.id,
          ...postSnap.data(),
          likes: postSnap.data().likes || [],
          reposts: postSnap.data().reposts || [],
          repostsCount: postSnap.data().repostsCount || 0,
          commentsCount: postSnap.data().commentsCount || 0,
          mentions: postSnap.data().mentions || [],
          hashtags: postSnap.data().hashtags || []
        } as Post;

        setPost(postData);
        setLiked(user?.uid ? postData.likes?.includes(user.uid) || false : false);
        setLikesCount(postData.likes?.length || 0);

        // Incrementar visualização
        if (user?.uid !== postData.userId) {
          await updateDoc(postRef, { views: increment(1) });
        }

        // Carregar comentários ordenados
        const commentsQuery = query(
          collection(db, 'posts', id, 'comments'),
          orderBy('createdAt', 'asc')
        );
        const commentsSnap = await getDocs(commentsQuery);
        setComments(commentsSnap.docs.map(d => ({
          id: d.id,
          ...d.data()
        } as Comment)));

      } catch (err) {
        console.error('Erro ao carregar post:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadPostAndComments();
    }
  }, [id, user?.uid]);

  // Curtir/Descurtir
  const handleLike = async () => {
    if (!user || !post) return;

    const newLikedState = !liked;
    setLiked(newLikedState);
    setLikesCount(prev => newLikedState ? prev + 1 : prev - 1);

    const postRef = doc(db, 'posts', id);
    try {
      if (newLikedState) {
        await updateDoc(postRef, {
          likes: arrayUnion(user.uid)
        });
      } else {
        await updateDoc(postRef, {
          likes: arrayRemove(user.uid)
        });
      }
    } catch (error) {
      console.error('Erro ao curtir:', error);
      setLiked(!newLikedState);
      setLikesCount(prev => newLikedState ? prev - 1 : prev + 1);
    }
  };

  // Enviar comentário
  const handleSendComment = async () => {
    if (!newComment.trim() || !user || !post || sendingComment) return;

    setSendingComment(true);
    try {
      const commentData = {
        content: newComment,
        createdAt: serverTimestamp(),
        userId: user.uid,
        user: {
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'Usuário',
          email: user.email,
          photoURL: user.photoURL || null
        }
      };

      // Adicionar comentário
      const docRef = await addDoc(collection(db, 'posts', id, 'comments'), commentData);

      // Incrementar contador
      await updateDoc(doc(db, 'posts', id), {
        commentsCount: increment(1)
      });

      // Adicionar à lista local
      setComments([...comments, {
        id: docRef.id,
        ...commentData,
        createdAt: new Date()
      } as Comment]);

      setNewComment('');
      setShowEmojiPicker(false);

    } catch (err) {
      console.error('Erro ao comentar:', err);
      alert('Erro ao enviar comentário. Tente novamente.');
    } finally {
      setSendingComment(false);
    }
  };

  // Deletar comentário
  const handleDeleteComment = async (commentId: string, commentUserId: string) => {
    if (!post) return;

    if (commentUserId !== user?.uid && post.userId !== user?.uid) {
      alert('Você não tem permissão para deletar este comentário');
      return;
    }

    if (!confirm('Tem certeza que deseja excluir este comentário?')) return;

    try {
      await deleteDoc(doc(db, 'posts', id, 'comments', commentId));
      await updateDoc(doc(db, 'posts', id), {
        commentsCount: increment(-1)
      });

      setComments(comments.filter(c => c.id !== commentId));
    } catch (error) {
      console.error('Erro ao deletar comentário:', error);
    }
  };

  // Deletar post
  const handleDeletePost = async () => {
    if (!confirm('Tem certeza que deseja excluir este post?')) return;

    setDeleting(true);
    try {
      // Deletar todos os comentários primeiro
      const commentsRef = collection(db, 'posts', id, 'comments');
      const commentsSnap = await getDocs(commentsRef);

      const batch = writeBatch(db);
      commentsSnap.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      // Deletar o post
      batch.delete(doc(db, 'posts', id));

      await batch.commit();

      router.push('/feed');
    } catch (error) {
      console.error('Erro ao deletar post:', error);
      setDeleting(false);
    }
  };

  // Compartilhar
  const handleShare = () => {
    const url = window.location.href;

    if (navigator.share) {
      navigator.share({
        title: `Post de ${post?.user?.displayName || 'Usuário'}`,
        text: post?.content,
        url: url
      });
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-sky-500" size={40} />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 p-6">
        <p className="text-6xl mb-4">😕</p>
        <p className="text-xl mb-2">Post não encontrado</p>
        <p className="text-sm text-zinc-600 mb-6">O post que você está procurando pode ter sido removido.</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-2 bg-zinc-800 rounded-full hover:bg-zinc-700 transition"
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">

      {/* Header fixo */}
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="text-zinc-400 hover:text-white transition p-1"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold">Post</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Menu de opções */}
            <div className="relative">
              <button
                onClick={() => setShowOptions(!showOptions)}
                className="text-zinc-400 hover:text-white transition p-2"
              >
                <MoreHorizontal size={20} />
              </button>

              {showOptions && (
                <div className="absolute right-0 mt-1 w-48 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg overflow-hidden">
                  <button
                    onClick={handleShare}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-zinc-800 flex items-center gap-2"
                  >
                    <Share2 size={16} />
                    Compartilhar
                  </button>

                  {user?.uid === post.userId && (
                    <button
                      onClick={handleDeletePost}
                      disabled={deleting}
                      className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-zinc-800 flex items-center gap-2 disabled:opacity-50"
                    >
                      {deleting ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <Trash2 size={16} />
                      )}
                      {deleting ? 'Excluindo...' : 'Excluir post'}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <div className="max-w-3xl mx-auto p-4">

        {/* Card do Post */}
        <div className="border border-zinc-800 rounded-xl p-4 md:p-6 mb-6">
          {/* Cabeçalho do post */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <Link href={`/profile/${post.userId}`} className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-500 to-purple-500 overflow-hidden">
                  {post.user?.photoURL ? (
                    <img
                      src={post.user.photoURL}
                      alt={post.user.displayName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                      {post.user?.displayName?.[0]?.toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
              </Link>

              <div>
                <div className="flex items-center gap-2">
                  <Link href={`/profile/${post.userId}`} className="hover:underline">
                    <h2 className="font-bold text-lg">{post.user?.displayName || 'Usuário'}</h2>
                  </Link>
                  {post.isPublic === false && (
                    <Lock size={14} className="text-zinc-500" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-zinc-500">@{post.user?.email?.split('@')[0] || 'usuario'}</span>
                  <span className="text-zinc-600">•</span>
                  <span className="text-zinc-500">{formatDate(post.createdAt)}</span>
                  {post.edited && (
                    <>
                      <span className="text-zinc-600">•</span>
                      <span className="text-zinc-500 text-xs">(editado)</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Conteúdo do post */}
          <div className="mb-4 whitespace-pre-wrap text-lg">
            {formatContent(post.content)}
          </div>

          {/* Código */}
          {post.code && (
            <CodeBlock language={post.code.language} content={post.code.content} />
          )}

          {/* Link Preview */}
          {post.link && !post.code && (
            <LinkPreview url={post.link.url} />
          )}

          {/* Imagens */}
          {post.images && post.images.length > 0 && (
            <ImageCarousel images={post.images} />
          )}

          {/* Imagem única (compatibilidade) */}
          {post.image && !post.images && (
            <div className="my-4 rounded-xl overflow-hidden border border-zinc-800">
              <img
                src={post.image}
                alt="Post content"
                className="w-full h-auto max-h-96 object-contain bg-zinc-900"
              />
            </div>
          )}

          {/* GIF */}
          {post.gif && (
            <div className="my-4 rounded-xl overflow-hidden border border-zinc-800">
              <img
                src={post.gif}
                alt="GIF"
                className="w-full h-auto max-h-96 object-contain bg-zinc-900"
              />
            </div>
          )}

          {/* Estatísticas */}
          <div className="flex gap-4 mb-4 text-sm text-zinc-500 border-t border-zinc-800 pt-4">
            <span>{likesCount} {likesCount === 1 ? 'curtida' : 'curtidas'}</span>
            <span>{post.commentsCount || 0} {post.commentsCount === 1 ? 'comentário' : 'comentários'}</span>
            {post.views && post.views > 0 && (
              <span>{post.views} {post.views === 1 ? 'visualização' : 'visualizações'}</span>
            )}
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2 border-t border-zinc-800 pt-3">
            <button
              onClick={handleLike}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition ${liked ? 'text-pink-600' : 'text-zinc-500 hover:text-pink-600 hover:bg-zinc-900'
                }`}
            >
              <Heart size={20} fill={liked ? 'currentColor' : 'none'} />
              <span className="text-sm font-medium">Curtir</span>
            </button>

            <button
              onClick={() => commentInputRef.current?.focus()}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-zinc-500 hover:text-sky-500 hover:bg-zinc-900 transition"
            >
              <MessageCircle size={20} />
              <span className="text-sm font-medium">Comentar</span>
            </button>

            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-zinc-500 hover:text-sky-500 hover:bg-zinc-900 transition"
            >
              {copied ? <Check size={20} /> : <Share2 size={20} />}
              <span className="text-sm font-medium">{copied ? 'Copiado!' : 'Compartilhar'}</span>
            </button>
          </div>
        </div>

        {/* Seção de comentários */}
        <div className="border border-zinc-800 rounded-xl p-4 md:p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <MessageCircle size={18} />
            Comentários ({comments.length})
          </h3>

          {/* Lista de comentários */}
          <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
            {comments.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-zinc-600 mb-2">Nenhum comentário ainda.</p>
                <p className="text-sm text-zinc-700">Seja o primeiro a comentar!</p>
              </div>
            ) : (
              comments.map(comment => (
                <div key={comment.id} className="flex gap-3 group">
                  <Link href={`/profile/${comment.userId}`} className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-purple-500 overflow-hidden">
                      {comment.user?.photoURL ? (
                        <img
                          src={comment.user.photoURL}
                          alt={comment.user.displayName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-xs">
                          {comment.user?.displayName?.[0] || 'U'}
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="flex-1 bg-zinc-900 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <Link href={`/profile/${comment.userId}`} className="hover:underline">
                          <span className="font-medium text-sm">{comment.user?.displayName}</span>
                        </Link>
                        <span className="text-xs text-zinc-600 ml-2">
                          {formatRelativeDate(comment.createdAt)}
                        </span>
                      </div>

                      {(user?.uid === comment.userId || user?.uid === post.userId) && (
                        <button
                          onClick={() => handleDeleteComment(comment.id, comment.userId)}
                          className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-500 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <p className="text-sm mt-1">{formatContent(comment.content)}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Input de novo comentário */}
          {user && (
            <div className="flex gap-2 items-center">
              <Link href="/profile" className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-purple-500 overflow-hidden">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || ''}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-xs">
                      {user.displayName?.[0] || user.email?.[0] || 'U'}
                    </div>
                  )}
                </div>
              </Link>

              <div className="flex-1 relative">
                <input
                  ref={commentInputRef}
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                  placeholder="Adicione um comentário..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 pr-10 text-sm focus:outline-none focus:border-sky-500 transition"
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
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default withAuth(PostView);