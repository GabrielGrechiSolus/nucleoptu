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
import { Plus, X, Edit3, Trash2, Zap } from "lucide-react";

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
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Registro de Objetos Oracle</h1>
          <p className="text-zinc-400">Crie, edite e gerencie pacotes, funções, procedures e metadados.</p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={openNewModal} className="px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 flex items-center gap-2">
            <Plus size={14} /> Novo
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            placeholder="Pesquisar por nome"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="p-2 rounded-lg border border-zinc-600 bg-zinc-800 text-zinc-50 outline-none"
          />

          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="p-2 rounded-lg border border-zinc-600 bg-zinc-800 text-zinc-50 outline-none">
            <option value="">Todos os tipos</option>
            <option value="package">Package</option>
            <option value="function">Function</option>
            <option value="procedure">Procedure</option>
            <option value="trigger">Trigger</option>
            <option value="view">View</option>
            <option value="other">Other</option>
          </select>

          <label className="flex items-center gap-2 text-zinc-300">
            <input type="checkbox" checked={showOnlyActive} onChange={(e) => setShowOnlyActive(e.target.checked)} /> Apenas ativos
          </label>

          <div className="text-sm text-zinc-400">Total: {filtered.length} / {items.length}</div>
        </div>
      </div>

      {/* Horizontal List of Cards */}
      <div className="overflow-x-auto">
        <div className="flex gap-4 py-2">
          {loading ? (
            <div className="text-zinc-400 px-4">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-zinc-500 px-4">Nenhum registro encontrado</div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setViewItem(item);
                  setViewModalOpen(true);
                }}
                className={`flex-shrink-0 w-80 h-40 bg-zinc-900 border ${item.active === false ? 'border-zinc-700/50 opacity-80' : 'border-zinc-700'} rounded-xl p-4 cursor-pointer hover:shadow-lg transition-all`}
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="overflow-hidden">
                    <h3 className="text-lg font-bold text-zinc-50 truncate">{item.name}</h3>
                    <div className="text-sm text-zinc-400 truncate">{item.type}</div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); openEditModal(item); }} className="p-1 rounded hover:bg-zinc-800"><Edit3 size={16} className="text-zinc-300"/></button>
                    <button onClick={(e) => { e.stopPropagation(); toggleActive(item); }} className="p-1 rounded hover:bg-zinc-800" title={item.active ? 'Inativar' : 'Ativar'}><Zap size={16} className="text-zinc-300"/></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="p-1 rounded hover:bg-zinc-800"><Trash2 size={16} className="text-red-500"/></button>
                  </div>
                </div>

                <div className="mt-2 flex flex-col gap-1 h-[65%]">
                  <div className="text-xs text-zinc-300 truncate">
                    {item.modules && item.modules.length > 0 ? item.modules.join(', ') : 'Nenhum módulo'}
                  </div>
                  <div className="text-xs text-zinc-400 truncate">
                    {item.origins && item.origins.length > 0 ? `${item.origins[0]}${item.origins.length > 1 ? ` (+${item.origins.length - 1})` : ''}` : 'Sem origem'}
                  </div>
                  <div className="text-sm text-zinc-500 line-clamp-2 overflow-hidden">
                    {item.observations ? item.observations : 'Sem observações'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal (create / edit) */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/70" aria-hidden />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <Dialog.Title className="text-xl font-bold">{editing ? 'Editar registro' : 'Novo registro'}</Dialog.Title>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded hover:bg-zinc-800"><X className="text-zinc-400"/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div className="md:col-span-2">
                <label className="text-sm text-zinc-400">Nome</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-50" />
              </div>
              <div>
                <label className="text-sm text-zinc-400">Tipo</label>
                <select value={type} onChange={(e) => setType(e.target.value as ObjType)} className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-50">
                  <option value="package">Package</option>
                  <option value="function">Function</option>
                  <option value="procedure">Procedure</option>
                  <option value="trigger">Trigger</option>
                  <option value="view">View</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="mb-3">
              <label className="text-sm text-zinc-400">Módulos</label>
              <div className="flex gap-2 mt-2">
                <input value={moduleInput} onChange={(e) => setModuleInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addModule(); } }} className="flex-1 p-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-50" />
                <button onClick={addModule} className="px-3 py-2 bg-blue-500 rounded">Adicionar</button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {modules.map((m) => (
                  <span key={m} className="flex items-center gap-2 px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-sm">
                    <span className="text-zinc-200">{m}</span>
                    <button onClick={() => removeModule(m)} className="p-0.5 rounded hover:bg-zinc-700"><X size={14} className="text-zinc-400"/></button>
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <label className="text-sm text-zinc-400">Origens</label>
              <div className="flex gap-2 mt-2">
                <input value={originInput} onChange={(e) => setOriginInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addOrigin(); } }} className="flex-1 p-2 rounded bg-zinc-800 border border-zinc-700 text-zinc-50" />
                <button onClick={addOrigin} className="px-3 py-2 bg-blue-500 rounded">Adicionar</button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {origins.map((o) => (
                  <span key={o} className="flex items-center gap-2 px-3 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-sm">
                    <span className="text-zinc-200">{o}</span>
                    <button onClick={() => removeOrigin(o)} className="p-0.5 rounded hover:bg-zinc-700"><X size={14} className="text-zinc-400"/></button>
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <label className="text-sm text-zinc-400">Observações</label>
              <textarea rows={5} value={observations} onChange={(e) => setObservations(e.target.value)} className="w-full p-3 rounded bg-zinc-800 border border-zinc-700 text-zinc-50" />
            </div>

            <div className="flex justify-end gap-3 border-t border-zinc-700 pt-3">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 bg-zinc-700 rounded">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-500 rounded">{saving ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>

      {/* View Modal (read-only) */}
      <Dialog open={viewModalOpen} onClose={() => setViewModalOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/70" aria-hidden />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-zinc-900 border border-zinc-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <Dialog.Title className="text-xl font-bold">Detalhes do Registro</Dialog.Title>
              <button onClick={() => setViewModalOpen(false)} className="p-2 rounded hover:bg-zinc-800"><X className="text-zinc-400"/></button>
            </div>

            {viewItem ? (
              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-bold text-zinc-50">{viewItem.name}</h3>
                  <div className="text-sm text-zinc-400">{viewItem.type} • {viewItem.active === false ? 'Inativo' : 'Ativo'}</div>
                </div>

                <div>
                  <strong className="text-sm text-zinc-400">Módulos:</strong>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {viewItem.modules && viewItem.modules.length > 0 ? viewItem.modules.map(m => (
                      <span key={m} className="text-xs px-2 py-1 bg-zinc-800 border border-zinc-700 rounded-full text-zinc-200">{m}</span>
                    )) : <div className="text-sm text-zinc-400">Nenhum módulo</div>}
                  </div>
                </div>

                <div>
                  <strong className="text-sm text-zinc-400">Origens:</strong>
                  <div className="mt-2 text-sm text-zinc-300">{viewItem.origins && viewItem.origins.length > 0 ? viewItem.origins.join(', ') : 'Sem origens'}</div>
                </div>

                <div>
                  <strong className="text-sm text-zinc-400">Observações:</strong>
                  <div className="mt-2 text-sm text-zinc-300 whitespace-pre-wrap">{viewItem.observations || 'Sem observações'}</div>
                </div>
              </div>
            ) : (
              <div className="text-zinc-400">Nenhum registro selecionado</div>
            )}

            <div className="flex justify-end pt-4">
              <button onClick={() => setViewModalOpen(false)} className="px-4 py-2 bg-zinc-700 rounded">Fechar</button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
