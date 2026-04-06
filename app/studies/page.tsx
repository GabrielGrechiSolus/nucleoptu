"use client";

import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  Search, X, Plus, Trash2, Edit3, Users, Globe, Lock, Eye, ExternalLink,
  Bold, Italic, Underline, List, ListOrdered, Code, Type, AlignLeft,
  AlignCenter, AlignRight, Link as LinkIcon, Image, Save, FileText, ChevronDown,
  Heading1, Heading2, Heading3
} from "lucide-react";
import { collection, addDoc, query, orderBy, doc, getDoc, onSnapshot, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { Dialog, Tab, Menu, Transition } from "@headlessui/react";
import { useAuth } from "../AuthContext";
import { Fragment } from 'react';
import TextareaAutosize from 'react-textarea-autosize';

// Componente de código highlight
const CodeBlock = ({ language, code, onChange }: { language: string; code: string; onChange: (value: string) => void }) => {
  const languages = [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'python', label: 'Python' },
    { value: 'java', label: 'Java' },
    { value: 'csharp', label: 'C#' },
    { value: 'php', label: 'PHP' },
    { value: 'html', label: 'HTML' },
    { value: 'css', label: 'CSS' },
    { value: 'sql', label: 'SQL' },
    { value: 'bash', label: 'Bash' },
    { value: 'json', label: 'JSON' },
    { value: 'markdown', label: 'Markdown' },
    { value: 'text', label: 'Texto Plano' }
  ];

  return (
    <div className="border border-zinc-700 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between bg-zinc-800 px-3 py-2 border-b border-zinc-700">
        <select
          value={language}
          onChange={(e) => onChange(e.target.value)}
          className="bg-zinc-700 text-zinc-200 text-sm rounded px-2 py-1 border border-zinc-600 focus:outline-none focus:border-sky-500"
        >
          {languages.map(lang => (
            <option key={lang.value} value={lang.value}>{lang.label}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <Code size={16} className="text-zinc-400" />
          <span className="text-xs text-zinc-500">Bloco de Código</span>
        </div>
      </div>
      <textarea
        value={code}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-3 bg-zinc-900 text-zinc-100 font-mono text-sm outline-none resize-y"
        rows={6}
        placeholder={`Digite seu código ${languages.find(l => l.value === language)?.label} aqui...`}
      />
    </div>
  );
};

// Componente de editor de texto simples com formatação
const SimpleTextEditor = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [codeContent, setCodeContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertAtCursor = (text: string) => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const currentValue = textareaRef.current.value;

    const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);
    onChange(newValue);

    // Restaurar cursor após a inserção
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + text.length, start + text.length);
      }
    }, 0);
  };

  const wrapWith = (before: string, after: string) => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = textareaRef.current.value.substring(start, end);

    const newText = before + selectedText + after;
    insertAtCursor(newText);
  };

  const handleFormat = (type: string) => {
    switch (type) {
      case 'bold':
        wrapWith('**', '**');
        break;
      case 'italic':
        wrapWith('*', '*');
        break;
      case 'underline':
        wrapWith('<u>', '</u>');
        break;
      case 'h1':
        insertAtCursor('# ');
        break;
      case 'h2':
        insertAtCursor('## ');
        break;
      case 'h3':
        insertAtCursor('### ');
        break;
      case 'ul':
        insertAtCursor('- ');
        break;
      case 'ol':
        insertAtCursor('1. ');
        break;
      case 'code':
        wrapWith('`', '`');
        break;
      case 'codeblock':
        setShowCodeModal(true);
        break;
      case 'link':
        {
          const url = prompt('Digite a URL:');
          if (url) {
            const text = textareaRef.current?.value.substring(
              textareaRef.current.selectionStart,
              textareaRef.current.selectionEnd
            ) || 'link';
            insertAtCursor(`[${text}](${url})`);
          }
        }
        break;
    }
  };

  const handleAddCode = () => {
    if (codeContent.trim()) {
      insertAtCursor(`\n\`\`\`${codeLanguage}\n${codeContent}\n\`\`\`\n`);
      setShowCodeModal(false);
      setCodeContent('');
    }
  };

  return (
    <div className="border border-zinc-700 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-zinc-800 border-b border-zinc-700">
        <button
          onClick={() => handleFormat('bold')}
          className="p-2 rounded hover:bg-zinc-700 transition-colors"
          title="Negrito"
          type="button"
        >
          <Bold size={16} className="text-zinc-300" />
        </button>
        <button
          onClick={() => handleFormat('italic')}
          className="p-2 rounded hover:bg-zinc-700 transition-colors"
          title="Itálico"
          type="button"
        >
          <Italic size={16} className="text-zinc-300" />
        </button>
        <button
          onClick={() => handleFormat('underline')}
          className="p-2 rounded hover:bg-zinc-700 transition-colors"
          title="Sublinhado"
          type="button"
        >
          <Underline size={16} className="text-zinc-300" />
        </button>

        <div className="w-px h-6 bg-zinc-700 mx-1" />

        <button
          onClick={() => handleFormat('h1')}
          className="p-2 rounded hover:bg-zinc-700 transition-colors"
          title="Título 1"
          type="button"
        >
          <Heading1 size={16} className="text-zinc-300" />
        </button>
        <button
          onClick={() => handleFormat('h2')}
          className="p-2 rounded hover:bg-zinc-700 transition-colors"
          title="Título 2"
          type="button"
        >
          <Heading2 size={16} className="text-zinc-300" />
        </button>
        <button
          onClick={() => handleFormat('h3')}
          className="p-2 rounded hover:bg-zinc-700 transition-colors"
          title="Título 3"
          type="button"
        >
          <Heading3 size={16} className="text-zinc-300" />
        </button>

        <div className="w-px h-6 bg-zinc-700 mx-1" />

        <button
          onClick={() => handleFormat('ul')}
          className="p-2 rounded hover:bg-zinc-700 transition-colors"
          title="Lista não ordenada"
          type="button"
        >
          <List size={16} className="text-zinc-300" />
        </button>
        <button
          onClick={() => handleFormat('ol')}
          className="p-2 rounded hover:bg-zinc-700 transition-colors"
          title="Lista ordenada"
          type="button"
        >
          <ListOrdered size={16} className="text-zinc-300" />
        </button>

        <div className="w-px h-6 bg-zinc-700 mx-1" />

        <button
          onClick={() => handleFormat('code')}
          className="p-2 rounded hover:bg-zinc-700 transition-colors"
          title="Código inline"
          type="button"
        >
          <Code size={16} className="text-zinc-300" />
        </button>
        <button
          onClick={() => handleFormat('codeblock')}
          className="p-2 rounded hover:bg-zinc-700 transition-colors bg-zinc-700/50"
          title="Bloco de código"
          type="button"
        >
          <FileText size={16} className="text-sky-400" />
        </button>

        <div className="w-px h-6 bg-zinc-700 mx-1" />

        <button
          onClick={() => handleFormat('link')}
          className="p-2 rounded hover:bg-zinc-700 transition-colors"
          title="Inserir link"
          type="button"
        >
          <LinkIcon size={16} className="text-zinc-300" />
        </button>
      </div>

      {/* Editor area - Textarea simples */}
      <TextareaAutosize
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[300px] p-4 bg-zinc-900 text-zinc-100 outline-none font-mono text-sm resize-y"
        placeholder="Digite seu conteúdo aqui... Use os botões acima para formatar."
        minRows={10}
      />

      {/* Modal para inserir código */}
      <Dialog open={showCodeModal} onClose={() => setShowCodeModal(false)} className="relative z-[60]">
        <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-2xl p-6">
            <Dialog.Title className="text-lg font-semibold text-white mb-4">
              Inserir Bloco de Código
            </Dialog.Title>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400 block mb-1">Linguagem</label>
                <select
                  value={codeLanguage}
                  onChange={(e) => setCodeLanguage(e.target.value)}
                  className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 text-white focus:border-sky-500 outline-none"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="csharp">C#</option>
                  <option value="php">PHP</option>
                  <option value="html">HTML</option>
                  <option value="css">CSS</option>
                  <option value="sql">SQL</option>
                  <option value="bash">Bash</option>
                  <option value="json">JSON</option>
                  <option value="markdown">Markdown</option>
                  <option value="text">Texto Plano</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-zinc-400 block mb-1">Código</label>
                <textarea
                  value={codeContent}
                  onChange={(e) => setCodeContent(e.target.value)}
                  className="w-full p-3 rounded bg-zinc-800 border border-zinc-700 text-white font-mono text-sm focus:border-sky-500 outline-none"
                  rows={8}
                  placeholder="Digite seu código aqui..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCodeModal(false)}
                className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddCode}
                className="px-4 py-2 rounded bg-sky-600 hover:bg-sky-700 text-white transition-colors"
              >
                Inserir
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
};

// Função para converter Markdown para HTML (simples)
const markdownToHtml = (markdown: string): string => {
  let html = markdown;

  // Cabeçalhos
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Negrito
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');

  // Itálico
  html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');

  // Sublinhado
  html = html.replace(/<u>(.*?)<\/u>/gim, '<u>$1</u>');

  // Listas
  html = html.replace(/^\d\. (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>');

  // Agrupar listas
  html = html.replace(/(<li>.*<\/li>\n?)+/gim, (match) => {
    if (match.match(/^\d\./)) {
      return `<ol>${match}</ol>`;
    }
    return `<ul>${match}</ul>`;
  });

  // Links
  html = html.replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:text-sky-300">$1</a>');

  // Código inline
  html = html.replace(/`(.*?)`/gim, '<code class="bg-zinc-800 px-1 py-0.5 rounded text-sm font-mono">$1</code>');

  // Blocos de código
  html = html.replace(/```(\w+)?\n([\s\S]*?)```/gim, (match, lang, code) => {
    return `<pre class="bg-zinc-800 p-4 rounded-lg overflow-x-auto"><code class="language-${lang || 'text'} text-sm font-mono">${code}</code></pre>`;
  });

  // Quebras de linha
  html = html.replace(/\n/g, '<br />');

  return html;
};

type Study = {
  id: string;
  title: string;
  content: string; // Markdown content
  link?: string;
  target: string;
  allowedUsers?: string[];
  creatorEmail: string;
  createdAt: number;
  updatedAt?: number;
};

export default function StudyPage() {
  const { user } = useAuth();

  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [userType, setUserType] = useState("todos");
  const [isAdding, setIsAdding] = useState(false);
  const [editingStudy, setEditingStudy] = useState<Study | null>(null);
  const [viewingStudy, setViewingStudy] = useState<Study | null>(null);
  const [activeTab, setActiveTab] = useState(0); // 0 = editor, 1 = preview

  // Form state
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState(""); // Markdown content
  const [newLink, setNewLink] = useState("");
  const [newTarget, setNewTarget] = useState("todos");
  const [newAllowedUsers, setNewAllowedUsers] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Cache para pesquisas
  const searchCache = useMemo(() => new Map<string, Study[]>(), []);

  // Fetch user type for permissions
  useEffect(() => {
    const fetchUserType = async () => {
      if (!user) return;
      try {
        const userRef = doc(db, "profiles", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setUserType(data.noticeType || "todos");
        }
      } catch (err) {
        console.error("Erro ao buscar tipo de usuário:", err);
      }
    };
    fetchUserType();
  }, [user]);

  // Load dynamic studies com snapshot em tempo real
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "studies"), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Study[];

      setStudies(studiesData);
      setLoading(false);

      // Limpar cache quando houver atualizações
      searchCache.clear();
    }, (error) => {
      console.error("Error fetching studies:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [searchCache]);

  // Filtrar estudos com cache
  const visibleStudies = useMemo(() => {
    if (!user) return [];

    const cacheKey = `${searchTerm}_${userType}_${user.email}`;

    if (searchCache.has(cacheKey)) {
      return searchCache.get(cacheKey)!;
    }

    const filtered = studies.filter(study => {
      const isCreator = study.creatorEmail === user?.email;
      const isTarget = study.target === 'todos' || study.target === userType;
      const isAllowed = study.allowedUsers?.includes(user?.email || '');
      const hasAccess = isCreator || isTarget || isAllowed;

      if (!hasAccess) return false;

      if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        const matchesTitle = study.title.toLowerCase().includes(lowerSearch);
        const matchesContent = study.content?.toLowerCase().includes(lowerSearch);
        return matchesTitle || matchesContent;
      }

      return true;
    });

    searchCache.set(cacheKey, filtered);
    return filtered;
  }, [studies, searchTerm, user, userType, searchCache]);

  const totalPages = Math.ceil(visibleStudies.length / itemsPerPage);
  const paginatedStudies = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return visibleStudies.slice(start, start + itemsPerPage);
  }, [visibleStudies, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleAddStudy = async () => {
    if (!newTitle.trim() || !user) return;

    try {
      const studyData = {
        title: newTitle.trim(),
        content: newContent || null,
        link: newLink.trim() || null,
        target: newTarget,
        allowedUsers: newAllowedUsers.split(',').map(e => e.trim()).filter(Boolean),
        creatorEmail: user.email,
        createdAt: Date.now()
      };

      await addDoc(collection(db, "studies"), studyData);

      setNewTitle("");
      setNewContent("");
      setNewLink("");
      setNewAllowedUsers("");
      setIsAdding(false);

    } catch (e) {
      console.error("Erro ao adicionar estudo:", e);
      alert("Erro ao salvar. Tente novamente.");
    }
  };

  const handleEditStudy = async () => {
    if (!editingStudy || !newTitle.trim() || !user) return;

    try {
      const studyRef = doc(db, "studies", editingStudy.id);
      await updateDoc(studyRef, {
        title: newTitle.trim(),
        content: newContent || null,
        link: newLink.trim() || null,
        target: newTarget,
        allowedUsers: newAllowedUsers.split(',').map(e => e.trim()).filter(Boolean),
        updatedAt: Date.now()
      });

      setEditingStudy(null);
      setNewTitle("");
      setNewContent("");
      setNewLink("");
      setNewAllowedUsers("");

    } catch (e) {
      console.error("Erro ao editar estudo:", e);
      alert("Erro ao salvar. Tente novamente.");
    }
  };

  const handleDeleteStudy = async (studyId: string) => {
    if (!confirm("Tem certeza que deseja excluir este estudo?")) return;

    try {
      await deleteDoc(doc(db, "studies", studyId));
    } catch (e) {
      console.error("Erro ao deletar estudo:", e);
      alert("Erro ao deletar. Tente novamente.");
    }
  };

  const openEditModal = (study: Study) => {
    setEditingStudy(study);
    setNewTitle(study.title);
    setNewContent(study.content || "");
    setNewLink(study.link || "");
    setNewTarget(study.target);
    setNewAllowedUsers(study.allowedUsers?.join(', ') || "");
  };

  const openViewModal = (study: Study) => {
    setViewingStudy(study);
  };

  const getAccessIcon = (study: Study) => {
    if (study.creatorEmail === user?.email)
      return (
        <Lock className="w-4 h-4 text-yellow-500" role="img">
          <title>Você é o criador</title>
        </Lock>
      );
    if (study.target === 'todos')
      return (
        <Globe className="w-4 h-4 text-green-500" role="img">
          <title>Público</title>
        </Globe>
      );
    if (study.allowedUsers?.includes(user?.email || ''))
      return (
        <Users className="w-4 h-4 text-blue-500" role="img">
          <title>Compartilhado com você</title>
        </Users>
      );
    return (
      <Users className="w-4 h-4 text-purple-500" role="img">
        <title>{`Setor: ${study.target}`}</title>
      </Users>
    );
  };

  const getAccessText = (study: Study) => {
    if (study.creatorEmail === user?.email) return "Seu estudo";
    if (study.target === 'todos') return "Público";
    if (study.allowedUsers?.includes(user?.email || '')) return "Compartilhado com você";
    return `Setor: ${study.target}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Extrair texto puro do Markdown para preview
  const getPlainTextPreview = (markdown: string, maxLength: number = 150) => {
    // Remove markdown syntax
    const text = markdown
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`{3}.*?\n/g, '') // Remove code block markers
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\n/g, ' ') // Replace newlines with spaces
      .trim();

    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Área de Estudos</h1>
          <p className="text-sm text-zinc-400">
            {visibleStudies.length} {visibleStudies.length === 1 ? 'estudo disponível' : 'estudos disponíveis'}
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-sky-600 hover:bg-sky-700 transition px-4 py-2 rounded-xl text-sm font-medium w-full sm:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          Novo Estudo
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Buscar por título ou conteúdo..."
          className="w-full pl-10 pr-10 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-50 focus:border-sky-500 focus:outline-none transition-colors"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-zinc-400 hover:text-zinc-200 p-1 rounded-full hover:bg-zinc-800"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="text-zinc-400 flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-sky-500"></div>
            Carregando estudos...
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && visibleStudies.length === 0 && (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-12 text-center">
          <p className="text-zinc-500 text-lg mb-2">Nenhum estudo encontrado</p>
          <p className="text-zinc-600">
            {searchTerm
              ? "Tente buscar por outro termo"
              : "Clique em 'Novo Estudo' para começar"}
          </p>
        </div>
      )}

      {/* Studies Grid */}
      {!loading && visibleStudies.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedStudies.map((study) => (
              <div
                key={study.id}
                className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 hover:border-sky-500/50 transition-all duration-200 hover:scale-[1.02] group"
              >
                <div className="flex flex-col h-full">
                  {/* Header with access info */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      {getAccessIcon(study)}
                      <span className="text-xs px-2 py-1 bg-zinc-800 border border-zinc-600 rounded-full text-zinc-300">
                        {study.target === 'todos' ? 'Público' : study.target}
                      </span>
                    </div>

                    {/* Ações (visíveis apenas para o criador) */}
                    {study.creatorEmail === user?.email && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(study);
                          }}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                          title="Editar"
                        >
                          <Edit3 size={14} className="text-zinc-400" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteStudy(study.id);
                          }}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-900/30 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={14} className="text-red-400" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-zinc-50 line-clamp-2 group-hover:text-sky-400 transition-colors" title={study.title}>
                      {study.title}
                    </h3>

                    {study.content && (
                      <div className="text-sm text-zinc-400 line-clamp-3 mt-2">
                        {getPlainTextPreview(study.content)}
                      </div>
                    )}
                  </div>

                  {/* Footer with metadata and actions */}
                  <div className="mt-4 pt-3 border-t border-zinc-800">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-zinc-500">
                        <div>Por {study.creatorEmail.split('@')[0]}</div>
                        <div>{formatDate(study.createdAt).split(' ')[0]}</div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => openViewModal(study)}
                          className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                          title="Visualizar"
                        >
                          <Eye size={16} className="text-zinc-400" />
                        </button>

                        {study.link && (
                          <a
                            href={study.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 rounded-lg bg-zinc-800 hover:bg-sky-900/30 transition-colors"
                            title="Abrir link externo"
                          >
                            <ExternalLink size={16} className="text-sky-400" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Anterior
              </button>
              <span className="text-sm text-zinc-400">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Próxima
              </button>
            </div>
          )}
        </>
      )}

      {/* Modal de Visualização */}
      <Dialog
        open={!!viewingStudy}
        onClose={() => setViewingStudy(null)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/70" aria-hidden="true" />

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="relative bg-zinc-900 p-6 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-auto border border-zinc-800">
            {viewingStudy && (
              <>
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-6 sticky top-0 bg-zinc-900 pb-4 border-b border-zinc-800">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {getAccessIcon(viewingStudy)}
                      <span className="text-xs px-2 py-1 bg-zinc-800 border border-zinc-600 rounded-full text-zinc-300">
                        {getAccessText(viewingStudy)}
                      </span>
                    </div>

                    <Dialog.Title className="text-2xl font-bold text-white">
                      {viewingStudy.title}
                    </Dialog.Title>

                    <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500">
                      <span>Criado por {viewingStudy.creatorEmail}</span>
                      <span>•</span>
                      <span>{formatDate(viewingStudy.createdAt)}</span>
                      {viewingStudy.updatedAt && (
                        <>
                          <span>•</span>
                          <span>Atualizado {formatDate(viewingStudy.updatedAt).split(' ')[0]}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => setViewingStudy(null)}
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors"
                  >
                    <X size={20} className="text-zinc-400" />
                  </button>
                </div>

                {/* Content */}
                <div className="space-y-6">
                  {/* Conteúdo formatado */}
                  {viewingStudy.content && (
                    <div className="prose prose-invert max-w-none">
                      <div
                        dangerouslySetInnerHTML={{ __html: markdownToHtml(viewingStudy.content) }}
                        className="text-zinc-300"
                      />
                    </div>
                  )}

                  {/* Link */}
                  {viewingStudy.link && (
                    <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6">
                      <h3 className="text-sm font-medium text-zinc-400 mb-3">Link do Material</h3>
                      <a
                        href={viewingStudy.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sky-400 hover:text-sky-300 transition-colors break-all"
                      >
                        <ExternalLink size={16} />
                        {viewingStudy.link}
                      </a>
                    </div>
                  )}

                  {/* Info adicional */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                      <h4 className="text-xs font-medium text-zinc-500 mb-2">Compartilhamento</h4>
                      <p className="text-sm text-zinc-300">
                        {viewingStudy.target === 'todos'
                          ? 'Disponível para todos os usuários'
                          : `Disponível apenas para o setor: ${viewingStudy.target}`}
                      </p>
                    </div>

                    {viewingStudy.allowedUsers && viewingStudy.allowedUsers.length > 0 && (
                      <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4">
                        <h4 className="text-xs font-medium text-zinc-500 mb-2">Compartilhado individualmente com</h4>
                        <div className="flex flex-wrap gap-2">
                          {viewingStudy.allowedUsers.map(email => (
                            <span
                              key={email}
                              className="text-xs px-2 py-1 bg-zinc-700 rounded-full text-zinc-300"
                            >
                              {email}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer actions */}
                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-zinc-800">
                  {viewingStudy.link && (
                    <a
                      href={viewingStudy.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 rounded-lg text-white transition-colors flex items-center gap-2"
                    >
                      <ExternalLink size={16} />
                      Abrir Material
                    </a>
                  )}
                  <button
                    onClick={() => setViewingStudy(null)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* Modal de Cadastro/Edição */}
      <Dialog
        open={isAdding || !!editingStudy}
        onClose={() => {
          setIsAdding(false);
          setEditingStudy(null);
          setNewTitle("");
          setNewContent("");
          setNewLink("");
          setNewAllowedUsers("");
        }}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/70" aria-hidden="true" />

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="relative bg-zinc-900 p-6 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-auto border border-zinc-800">
            <Dialog.Title className="text-lg font-semibold text-white mb-4">
              {editingStudy ? 'Editar Estudo' : 'Novo Material de Estudo'}
            </Dialog.Title>

            {/* Tabs */}
            <Tab.Group onChange={setActiveTab}>
              <Tab.List className="flex gap-2 mb-4 border-b border-zinc-800 pb-2">
                <Tab className={({ selected }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-colors outline-none ${selected
                    ? 'bg-sky-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                  }`
                }>
                  Editor
                </Tab>
                <Tab className={({ selected }) =>
                  `px-4 py-2 rounded-lg text-sm font-medium transition-colors outline-none ${selected
                    ? 'bg-sky-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white'
                  }`
                }>
                  Preview
                </Tab>
              </Tab.List>

              <Tab.Panels>
                {/* Editor Tab */}
                <Tab.Panel>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Título *</label>
                      <input
                        type="text"
                        placeholder="Ex: Docker - Guia Completo"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full p-2.5 rounded-lg bg-zinc-800 text-white border border-zinc-700 focus:border-sky-500 outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Conteúdo (Markdown)</label>
                      <SimpleTextEditor value={newContent} onChange={setNewContent} />
                      <p className="text-xs text-zinc-500 mt-1">
                        Use **negrito**, *itálico*, # Título, [link](url), `código`, ```código em bloco```
                      </p>
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Link (URL) - opcional</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={newLink}
                        onChange={(e) => setNewLink(e.target.value)}
                        className="w-full p-2.5 rounded-lg bg-zinc-800 text-white border border-zinc-700 focus:border-sky-500 outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Compartilhar com Setor</label>
                      <select
                        value={newTarget}
                        onChange={(e) => setNewTarget(e.target.value)}
                        className="w-full p-2.5 rounded-lg bg-zinc-800 text-white border border-zinc-700 focus:border-sky-500 outline-none transition-colors"
                      >
                        <option value="todos">Todos</option>
                        <option value="analise">Análise</option>
                        <option value="desenvolvimento">Desenvolvimento</option>
                        <option value="lideranca">Liderança</option>
                        <option value="sustentacao">Sustentação</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">
                        Compartilhar com Usuários (emails separados por vírgula)
                      </label>
                      <textarea
                        placeholder="joao@exemplo.com, maria@exemplo.com"
                        value={newAllowedUsers}
                        onChange={(e) => setNewAllowedUsers(e.target.value)}
                        className="w-full p-2.5 rounded-lg bg-zinc-800 text-white border border-zinc-700 focus:border-sky-500 outline-none transition-colors"
                        rows={2}
                      />
                      <p className="text-xs text-zinc-500 mt-1">
                        Apenas estes usuários terão acesso, além do seu setor
                      </p>
                    </div>
                  </div>
                </Tab.Panel>

                {/* Preview Tab */}
                <Tab.Panel>
                  <div className="space-y-4">
                    <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6">
                      <h2 className="text-xl font-bold text-white mb-4">{newTitle || 'Título do Estudo'}</h2>

                      {newContent ? (
                        <div className="prose prose-invert max-w-none">
                          <div
                            dangerouslySetInnerHTML={{ __html: markdownToHtml(newContent) }}
                            className="text-zinc-300"
                          />
                        </div>
                      ) : (
                        <p className="text-zinc-500 italic">Nenhum conteúdo adicionado ainda.</p>
                      )}

                      {newLink && (
                        <div className="mt-4 pt-4 border-t border-zinc-700">
                          <a
                            href={newLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-400 hover:text-sky-300 flex items-center gap-2"
                          >
                            <ExternalLink size={16} />
                            {newLink}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                </Tab.Panel>
              </Tab.Panels>
            </Tab.Group>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-zinc-800">
              <button
                onClick={() => {
                  setIsAdding(false);
                  setEditingStudy(null);
                  setNewTitle("");
                  setNewContent("");
                  setNewLink("");
                  setNewAllowedUsers("");
                }}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={editingStudy ? handleEditStudy : handleAddStudy}
                disabled={!newTitle.trim()}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Save size={16} />
                {editingStudy ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}