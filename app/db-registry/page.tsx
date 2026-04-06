"use client";

import React, { useEffect, useMemo, useState } from "react";
import { db, auth } from "../../firebase";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { Dialog } from "@headlessui/react";
import { Plus, X, Edit3, Trash2, Zap, Search, Filter } from "lucide-react";

type ObjType = "package" | "function" | "procedure" | "trigger" | "view" | "other";

interface DBObject {
  id: string;
  name: string;
  type: ObjType;
  modules: string[];
  origins: string[];
  observations?: string;
  active?: boolean;
  createdAt?: any;
  createdBy?: string | null;
}

export default function DBRegistryPage() {
  const currentUser = auth.currentUser;

  const [items, setItems] = useState<DBObject[]>([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [showOnlyActive, setShowOnlyActive] = useState(true);

  // modal / form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DBObject | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewItem, setViewItem] = useState<DBObject | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<ObjType>("package");
  const [modules, setModules] = useState<string[]>([]);
  const [moduleInput, setModuleInput] = useState("");
  const [origins, setOrigins] = useState<string[]>([]);
  const [originInput, setOriginInput] = useState("");
  const [observations, setObservations] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "db_objects"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const docs: DBObject[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setItems(docs);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const openNewModal = () => {
    setEditing(null);
    setName("");
    setType("package");
    setModules([]);
    setOrigins([]);
    setObservations("");
    setModalOpen(true);
  };

  const openEditModal = (item: DBObject) => {
    setEditing(item);
    setName(item.name);
    setType(item.type);
    setModules(item.modules || []);
    setOrigins(item.origins || []);
    setObservations(item.observations || "");
    setModalOpen(true);
  };

  const addModule = () => {
    const v = moduleInput.trim();
    if (!v) return;
    if (!modules.includes(v)) setModules((s) => [...s, v]);
    setModuleInput("");
  };

  const removeModule = (m: string) => setModules((s) => s.filter((x) => x !== m));

  const addOrigin = () => {
    const v = originInput.trim();
    if (!v) return;
    if (!origins.includes(v)) setOrigins((s) => [...s, v]);
    setOriginInput("");
  };

  const removeOrigin = (o: string) => setOrigins((s) => s.filter((x) => x !== o));

  const handleSave = async () => {
    if (!name.trim()) return alert("Informe o nome do objeto");
    setSaving(true);
    try {
      if (editing) {
        const ref = doc(db, "db_objects", editing.id);
        await updateDoc(ref, {
          name: name.trim(),
          type,
          modules,
          origins,
          observations: observations.trim(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "db_objects"), {
          name: name.trim(),
          type,
          modules,
          origins,
          observations: observations.trim(),
          active: true,
          createdAt: serverTimestamp(),
          createdBy: currentUser?.uid ?? null,
        });
      }
      setModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar. Veja o console.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja excluir este registro? Esta ação é irreversível.")) return;
    try {
      await deleteDoc(doc(db, "db_objects", id));
    } catch (err) {
      console.error(err);
      alert("Erro ao deletar. Veja o console.");
    }
  };

  const toggleActive = async (item: DBObject) => {
    try {
      const ref = doc(db, "db_objects", item.id);
      await updateDoc(ref, { active: !item.active });
    } catch (err) {
      console.error(err);
      alert("Erro ao alterar status.");
    }
  };

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (showOnlyActive && it.active === false) return false;
      if (filterType && it.type !== filterType) return false;
      if (search && !it.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [items, search, filterType, showOnlyActive]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Registro de Objetos Oracle</h1>
          <p className="text-zinc-400">Crie, edite e gerencie pacotes, funções, procedures e metadados.</p>
        </div>

        <button 
          onClick={openNewModal} 
          className="px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 flex items-center gap-2 transition-colors w-full sm:w-auto justify-center"
        >
          <Plus size={18} /> Novo Objeto
        </button>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4 text-zinc-300">
          <Filter size={18} />
          <h2 className="font-medium">Filtros</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500" size={18} />
            <input
              placeholder="Pesquisar por nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-600 bg-zinc-800 text-zinc-50 outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Type filter */}
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)} 
            className="w-full p-2.5 rounded-lg border border-zinc-600 bg-zinc-800 text-zinc-50 outline-none focus:border-blue-500 transition-colors"
          >
            <option value="">Todos os tipos</option>
            <option value="package">Package</option>
            <option value="function">Function</option>
            <option value="procedure">Procedure</option>
            <option value="trigger">Trigger</option>
            <option value="view">View</option>
            <option value="other">Other</option>
          </select>

          {/* Active filter */}
          <label className="flex items-center gap-3 text-zinc-300 bg-zinc-800 border border-zinc-600 rounded-lg p-2.5 cursor-pointer hover:bg-zinc-750 transition-colors">
            <input 
              type="checkbox" 
              checked={showOnlyActive} 
              onChange={(e) => setShowOnlyActive(e.target.checked)} 
              className="w-4 h-4 accent-blue-500"
            /> 
            <span>Apenas objetos ativos</span>
          </label>

          {/* Results count */}
          <div className="flex items-center justify-center bg-zinc-800 border border-zinc-600 rounded-lg p-2.5">
            <span className="text-zinc-300">
              <span className="font-bold text-blue-400">{filtered.length}</span> de <span className="font-bold">{items.length}</span> objetos
            </span>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-zinc-400 flex items-center gap-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            Carregando...
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-12 text-center">
          <p className="text-zinc-500 text-lg mb-2">Nenhum registro encontrado</p>
          <p className="text-zinc-600">Tente ajustar os filtros ou criar um novo objeto</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                setViewItem(item);
                setViewModalOpen(true);
              }}
              className={`bg-zinc-900 border ${
                item.active === false 
                  ? 'border-zinc-700/50 opacity-80 bg-zinc-900/50' 
                  : 'border-zinc-700 hover:border-blue-500/50'
              } rounded-xl p-5 cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02]`}
            >
              {/* Header with actions */}
              <div className="flex justify-between items-start gap-2 mb-3">
                <div className="overflow-hidden flex-1">
                  <h3 className="text-lg font-bold text-zinc-50 truncate" title={item.name}>
                    {item.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-1 bg-zinc-800 border border-zinc-600 rounded-full text-zinc-300">
                      {item.type}
                    </span>
                    {item.active === false && (
                      <span className="text-xs px-2 py-1 bg-red-900/30 border border-red-800 rounded-full text-red-400">
                        Inativo
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); openEditModal(item); }} 
                    className="p-1.5 rounded hover:bg-zinc-700 transition-colors"
                    title="Editar"
                  >
                    <Edit3 size={16} className="text-zinc-300"/>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleActive(item); }} 
                    className="p-1.5 rounded hover:bg-zinc-700 transition-colors"
                    title={item.active ? 'Inativar' : 'Ativar'}
                  >
                    <Zap size={16} className={item.active ? 'text-yellow-500' : 'text-zinc-500'}/>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} 
                    className="p-1.5 rounded hover:bg-zinc-700 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={16} className="text-red-400"/>
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="space-y-2">
                <div className="text-sm">
                  <span className="text-zinc-500">Módulos:</span>{' '}
                  <span className="text-zinc-300 truncate block" title={item.modules?.join(', ') || 'Nenhum'}>
                    {item.modules && item.modules.length > 0 
                      ? item.modules.slice(0, 2).join(', ') + (item.modules.length > 2 ? ` +${item.modules.length - 2}` : '')
                      : 'Nenhum módulo'}
                  </span>
                </div>

                <div className="text-sm">
                  <span className="text-zinc-500">Origens:</span>{' '}
                  <span className="text-zinc-300 truncate block" title={item.origins?.join(', ') || 'Nenhuma'}>
                    {item.origins && item.origins.length > 0 
                      ? item.origins.slice(0, 2).join(', ') + (item.origins.length > 2 ? ` +${item.origins.length - 2}` : '')
                      : 'Sem origem'}
                  </span>
                </div>

                {item.observations && (
                  <div className="text-sm">
                    <span className="text-zinc-500">Obs:</span>{' '}
                    <span className="text-zinc-400 line-clamp-2 text-xs">
                      {item.observations}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal (create / edit) */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/80" aria-hidden />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-auto p-6">
            <div className="flex justify-between items-start mb-6">
              <Dialog.Title className="text-xl font-bold text-zinc-50">
                {editing ? 'Editar registro' : 'Novo registro'}
              </Dialog.Title>
              <button 
                onClick={() => setModalOpen(false)} 
                className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="text-zinc-400" size={20}/>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="text-sm text-zinc-400 block mb-1">Nome *</label>
                  <input 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="w-full p-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-50 focus:border-blue-500 outline-none transition-colors"
                    placeholder="Nome do objeto"
                  />
                </div>
                <div>
                  <label className="text-sm text-zinc-400 block mb-1">Tipo</label>
                  <select 
                    value={type} 
                    onChange={(e) => setType(e.target.value as ObjType)} 
                    className="w-full p-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-50 focus:border-blue-500 outline-none transition-colors"
                  >
                    <option value="package">Package</option>
                    <option value="function">Function</option>
                    <option value="procedure">Procedure</option>
                    <option value="trigger">Trigger</option>
                    <option value="view">View</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm text-zinc-400 block mb-1">Módulos</label>
                <div className="flex gap-2">
                  <input 
                    value={moduleInput} 
                    onChange={(e) => setModuleInput(e.target.value)} 
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addModule(); } }} 
                    className="flex-1 p-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-50 focus:border-blue-500 outline-none transition-colors"
                    placeholder="Digite um módulo e pressione Enter"
                  />
                  <button 
                    onClick={addModule} 
                    className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {modules.map((m) => (
                    <span key={m} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-full text-sm group">
                      <span className="text-zinc-200">{m}</span>
                      <button 
                        onClick={() => removeModule(m)} 
                        className="p-0.5 rounded-full hover:bg-zinc-700 transition-colors"
                      >
                        <X size={14} className="text-zinc-400"/>
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-zinc-400 block mb-1">Origens</label>
                <div className="flex gap-2">
                  <input 
                    value={originInput} 
                    onChange={(e) => setOriginInput(e.target.value)} 
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOrigin(); } }} 
                    className="flex-1 p-2.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-50 focus:border-blue-500 outline-none transition-colors"
                    placeholder="Digite uma origem e pressione Enter"
                  />
                  <button 
                    onClick={addOrigin} 
                    className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {origins.map((o) => (
                    <span key={o} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-full text-sm group">
                      <span className="text-zinc-200">{o}</span>
                      <button 
                        onClick={() => removeOrigin(o)} 
                        className="p-0.5 rounded-full hover:bg-zinc-700 transition-colors"
                      >
                        <X size={14} className="text-zinc-400"/>
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-zinc-400 block mb-1">Observações</label>
                <textarea 
                  rows={5} 
                  value={observations} 
                  onChange={(e) => setObservations(e.target.value)} 
                  className="w-full p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-50 focus:border-blue-500 outline-none transition-colors resize-none"
                  placeholder="Observações adicionais..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-zinc-700 pt-4 mt-6">
              <button 
                onClick={() => setModalOpen(false)} 
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSave} 
                disabled={saving} 
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* View Modal (read-only) */}
      <Dialog open={viewModalOpen} onClose={() => setViewModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/80" aria-hidden />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-auto p-6">
            <div className="flex justify-between items-start mb-6">
              <Dialog.Title className="text-xl font-bold text-zinc-50">Detalhes do Registro</Dialog.Title>
              <button 
                onClick={() => setViewModalOpen(false)} 
                className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="text-zinc-400" size={20}/>
              </button>
            </div>

            {viewItem ? (
              <div className="space-y-4">
                <div className="border-b border-zinc-700 pb-4">
                  <h3 className="text-2xl font-bold text-zinc-50 mb-2">{viewItem.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-blue-400 text-sm">
                      {viewItem.type}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      viewItem.active === false 
                        ? 'bg-red-900/30 border border-red-800 text-red-400' 
                        : 'bg-green-900/30 border border-green-800 text-green-400'
                    }`}>
                      {viewItem.active === false ? 'Inativo' : 'Ativo'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Módulos</h4>
                    <div className="flex flex-wrap gap-2">
                      {viewItem.modules && viewItem.modules.length > 0 ? (
                        viewItem.modules.map(m => (
                          <span key={m} className="text-xs px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-full text-zinc-200">
                            {m}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-zinc-500">Nenhum módulo</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Origens</h4>
                    <div className="flex flex-wrap gap-2">
                      {viewItem.origins && viewItem.origins.length > 0 ? (
                        viewItem.origins.map(o => (
                          <span key={o} className="text-xs px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-full text-zinc-200">
                            {o}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-zinc-500">Sem origens</span>
                      )}
                    </div>
                  </div>
                </div>

                {viewItem.observations && (
                  <div>
                    <h4 className="text-sm font-medium text-zinc-400 mb-2">Observações</h4>
                    <div className="p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                      <p className="text-zinc-300 whitespace-pre-wrap">{viewItem.observations}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-zinc-400 text-center py-8">Nenhum registro selecionado</div>
            )}

            <div className="flex justify-end pt-4 mt-4 border-t border-zinc-700">
              <button 
                onClick={() => setViewModalOpen(false)} 
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg transition-colors"
              >
                Fechar
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}