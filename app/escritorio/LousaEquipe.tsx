'use client';

import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { Check, ListOrdered, Pencil, Plus, RotateCcw, Shuffle, Trash2, X } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { db } from '../../firebase';
import styles from './LousaEquipe.module.css';

type PerfilEquipe = { uid: string; nome: string; textoBase: string };
type RegistroLousa = {
  id: string;
  kind: 'profile' | 'manual';
  sourceId?: string;
  text?: string;
  hidden?: boolean;
  createdBy?: string;
};
type CartaoLousa = { id: string; docId: string; kind: 'profile' | 'manual'; sourceId?: string; nome: string; texto: string; createdBy?: string };

const texto = (valor: unknown) => typeof valor === 'string' ? valor.trim() : '';

function hash(valor: string) {
  let resultado = 2166136261;
  for (let i = 0; i < valor.length; i++) resultado = Math.imul(resultado ^ valor.charCodeAt(i), 16777619);
  return resultado >>> 0;
}

export default function LousaEquipe() {
  const { user } = useAuth();
  const [perfis, setPerfis] = useState<PerfilEquipe[]>([]);
  const [registros, setRegistros] = useState<RegistroLousa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [modo, setModo] = useState<'baguncado' | 'ordenado'>('baguncado');
  const [ordem, setOrdem] = useState<string[]>([]);
  const [semente, setSemente] = useState(1);
  const [novoTexto, setNovoTexto] = useState('');
  const [editando, setEditando] = useState<{ id: string; texto: string } | null>(null);
  const [mostrandoOcultos, setMostrandoOcultos] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!user) return;
    const pararPerfis = onSnapshot(collection(db, 'profiles'), (snap) => {
      const lista = snap.docs.map((d) => {
        const dados = d.data();
        const nome = texto(dados.name) || texto(dados.displayName) || texto(dados.email) || 'Usuário';
        const cargo = texto(dados.role) || texto(dados.cargo) || texto(dados.title) || 'Cargo não informado';
        const setor = texto(dados.department) || texto(dados.setor) || texto(dados.noticeType) || 'Setor não informado';
        return { uid: d.id, nome, textoBase: `${nome} \u2014 ${cargo} \u2014 ${setor}` };
      }).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      setPerfis(lista);
      setCarregando(false);
    }, (e) => {
      setErro(`Não foi possível carregar os perfis (${e.code || 'Firestore'}).`);
      setCarregando(false);
    });
    const pararLousa = onSnapshot(collection(db, 'office_board_entries'), (snap) => {
      setRegistros(snap.docs.map((d) => ({ id: d.id, ...d.data() } as RegistroLousa)));
    }, (e) => setErro(`Não foi possível carregar os registros da lousa (${e.code || 'Firestore'}).`));
    return () => { pararPerfis(); pararLousa(); };
  }, [user]);

  const registrosPorId = useMemo(() => new Map(registros.map((r) => [r.id, r])), [registros]);
  const cartoes = useMemo<CartaoLousa[]>(() => {
    const perfisNaLousa = perfis.flatMap((p) => {
      const docId = `perfil_${p.uid}`;
      const registro = registrosPorId.get(docId);
      if (registro?.hidden) return [];
      return [{ id: `perfil:${p.uid}`, docId, kind: 'profile' as const, sourceId: p.uid, nome: p.nome, texto: texto(registro?.text) || p.textoBase }];
    });
    const manuais = registros.flatMap((r) => r.kind === 'manual' && !r.hidden && texto(r.text)
      ? [{ id: `manual:${r.id}`, docId: r.id, kind: 'manual' as const, nome: texto(r.text).split(/\s[\u2013\u2014-]\s/, 1)[0].trim() || 'Cadastro manual', texto: texto(r.text), createdBy: r.createdBy }]
      : []);
    return [...perfisNaLousa, ...manuais];
  }, [perfis, registros, registrosPorId]);

  const visiveis = useMemo(() => {
    if (modo === 'ordenado') return [...cartoes].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    const posicao = new Map(ordem.map((id, i) => [id, i]));
    return [...cartoes].sort((a, b) => (posicao.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (posicao.get(b.id) ?? Number.MAX_SAFE_INTEGER) || a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [cartoes, modo, ordem]);

  const ocultos = useMemo(() => perfis.filter((p) => registrosPorId.get(`perfil_${p.uid}`)?.hidden), [perfis, registrosPorId]);

  const embaralhar = () => {
    const ids = cartoes.map((c) => c.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    setOrdem(ids);
    setSemente((valor) => valor + 1);
    setModo('baguncado');
  };

  const organizar = () => {
    setModo('ordenado');
    setOrdem([...cartoes].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')).map((c) => c.id));
  };

  const gravarEdicao = async (cartao: CartaoLousa) => {
    if (!user || !editando?.texto.trim()) return;
    setSalvando(true);
    setErro('');
    try {
      await setDoc(doc(db, 'office_board_entries', cartao.docId), {
        kind: cartao.kind,
        ...(cartao.sourceId ? { sourceId: cartao.sourceId } : {}),
        text: editando.texto.trim(),
        hidden: false,
        createdBy: user.uid,
        updatedBy: user.uid,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setEditando(null);
    } catch (e) {
      setErro(`Não foi possível salvar a edição (${(e as { code?: string })?.code || 'Firestore'}).`);
    } finally { setSalvando(false); }
  };

  const adicionar = async () => {
    if (!user || !novoTexto.trim()) return;
    setSalvando(true);
    setErro('');
    try {
      await addDoc(collection(db, 'office_board_entries'), {
        kind: 'manual', text: novoTexto.trim(), hidden: false,
        createdBy: user.uid, createdAt: serverTimestamp(), updatedBy: user.uid, updatedAt: serverTimestamp(),
      });
      setNovoTexto('');
      setEditando(null);
    } catch (e) {
      setErro(`Não foi possível adicionar o cadastro (${(e as { code?: string })?.code || 'Firestore'}).`);
    } finally { setSalvando(false); }
  };

  const excluir = async (cartao: CartaoLousa) => {
    if (!user) return;
    setSalvando(true);
    setErro('');
    try {
      if (cartao.kind === 'manual') await deleteDoc(doc(db, 'office_board_entries', cartao.docId));
      else await setDoc(doc(db, 'office_board_entries', cartao.docId), {
        kind: 'profile', sourceId: cartao.sourceId, text: cartao.text, hidden: true,
        createdBy: user.uid, updatedBy: user.uid, updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      setErro(`Não foi possível excluir o cadastro (${(e as { code?: string })?.code || 'Firestore'}).`);
    } finally { setSalvando(false); }
  };

  const restaurar = async (perfil: PerfilEquipe) => {
    if (!user) return;
    setSalvando(true);
    setErro('');
    try {
      await setDoc(doc(db, 'office_board_entries', `perfil_${perfil.uid}`), {
        kind: 'profile', sourceId: perfil.uid, text: perfil.textoBase, hidden: false,
        createdBy: user.uid, updatedBy: user.uid, updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch (e) {
      setErro(`Não foi possível restaurar o perfil (${(e as { code?: string })?.code || 'Firestore'}).`);
    } finally { setSalvando(false); }
  };

  const estiloDo = (id: string): CSSProperties => {
    const valor = hash(`${id}:${semente}`);
    return {
      '--chalk-rotation': modo === 'ordenado' ? '0deg' : `${((valor % 71) - 35) / 10}deg`,
      '--chalk-opacity': modo === 'ordenado' ? 1 : 0.88 + ((valor >>> 8) % 13) / 100,
      '--chalk-scale': modo === 'ordenado' ? 1 : 0.98 + ((valor >>> 16) % 5) / 100,
    } as CSSProperties;
  };

  return (
    <section className="rel-box border border-[var(--rel-line)]" aria-labelledby="lousa-equipe-titulo">
      <div className={styles.header}>
        <div>
          <h2 id="lousa-equipe-titulo" className="font-semibold">Lousa da equipe</h2>
          <p className="rel-desc">Cadastros do time em texto. Edite a lousa sem alterar os perfis originais.</p>
        </div>
        <div className={styles.actions}>
          <button type="button" className="rel-btn rel-btn-outline rel-btn-sm" onClick={() => setEditando({ id: 'novo', texto: novoTexto })}>
            <Plus size={15}/> Adicionar
          </button>
          <button type="button" className="rel-btn rel-btn-outline rel-btn-sm" onClick={embaralhar} disabled={!cartoes.length}>
            <Shuffle size={15}/> Embaralhar
          </button>
          <button type="button" className="rel-btn rel-btn-outline rel-btn-sm" onClick={organizar} disabled={!cartoes.length}>
            <ListOrdered size={15}/> Organizar
          </button>
        </div>
      </div>

      {erro && <p role="alert" className="rel-notice rel-notice-error mt-3">{erro}</p>}

      {editando?.id === 'novo' && (
        <div className={styles.form}>
          <label htmlFor="lousa-novo" className="rel-label">Novo cadastro</label>
          <textarea id="lousa-novo" className="rel-input min-h-20" maxLength={1000} placeholder={'Nome \u2014 Cargo \u2014 Setor'} value={novoTexto} onChange={(e) => setNovoTexto(e.target.value)} />
          <div className={styles.formActions}>
            <button type="button" className="rel-btn rel-btn-primary rel-btn-sm" onClick={() => void adicionar()} disabled={salvando || !novoTexto.trim()}><Check size={14}/> Salvar cadastro</button>
            <button type="button" className="rel-btn rel-btn-ghost rel-btn-sm" onClick={() => { setEditando(null); setNovoTexto(''); }}><X size={14}/> Cancelar</button>
          </div>
        </div>
      )}

      {carregando ? <p className="rel-empty mt-4">Carregando perfis e registros da lousa…</p> : !visiveis.length ? <p className="rel-empty mt-4">A lousa está vazia. Adicione um cadastro ou confira os perfis disponíveis.</p> : (
        <div className={`${styles.board} ${modo === 'ordenado' ? styles.ordered : ''}`}>
          {visiveis.map((cartao) => (
            <article key={cartao.id} className={styles.card} style={estiloDo(cartao.id)}>
              {editando?.id === cartao.id ? (
                <div className={styles.editor}>
                  <textarea aria-label={`Editar ${cartao.nome}`} className={styles.textarea} maxLength={1000} value={editando.texto} onChange={(e) => setEditando({ ...editando, texto: e.target.value })} />
                  <div className={styles.formActions}>
                    <button type="button" className="rel-btn rel-btn-primary rel-btn-sm" onClick={() => void gravarEdicao(cartao)} disabled={salvando || !editando.texto.trim()}><Check size={14}/> Salvar</button>
                    <button type="button" className="rel-btn rel-btn-ghost rel-btn-sm" onClick={() => setEditando(null)}><X size={14}/> Cancelar</button>
                  </div>
                </div>
              ) : (
                <>
                  <p className={styles.chalk}>{cartao.texto}</p>
                  <div className={styles.cardActions}>
                    <span className={styles.source}>{cartao.kind === 'profile' ? 'Perfil' : 'Manual'}</span>
                    <button type="button" title="Editar texto" aria-label={`Editar ${cartao.nome}`} onClick={() => setEditando({ id: cartao.id, texto: cartao.texto })}><Pencil size={14}/></button>
                    <button type="button" title={cartao.kind === 'profile' ? 'Ocultar da lousa' : 'Excluir cadastro'} aria-label={`${cartao.kind === 'profile' ? 'Ocultar' : 'Excluir'} ${cartao.nome}`} onClick={() => void excluir(cartao)} disabled={salvando}><Trash2 size={14}/></button>
                  </div>
                </>
              )}
            </article>
          ))}
        </div>
      )}

      {ocultos.length > 0 && <div className={styles.hidden}>
        <button type="button" className="rel-btn rel-btn-ghost rel-btn-sm" onClick={() => setMostrandoOcultos((v) => !v)}>
          {mostrandoOcultos ? 'Ocultar cadastros removidos' : `Mostrar ${ocultos.length} perfil(is) oculto(s)`}
        </button>
        {mostrandoOcultos && <ul>{ocultos.map((perfil) => <li key={perfil.uid}><span>{perfil.nome}</span><button type="button" className="rel-btn rel-btn-outline rel-btn-sm" onClick={() => void restaurar(perfil)} disabled={salvando}><RotateCcw size={14}/> Restaurar</button></li>)}</ul>}
      </div>}
    </section>
  );
}
