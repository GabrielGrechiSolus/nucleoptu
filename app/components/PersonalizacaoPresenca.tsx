'use client';

import { useEffect } from 'react';
import { collection, doc, getDoc, getDocs, setDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../AuthContext';
import { db } from '../../firebase';
import { auth } from '../../firebase';

const STATUS_KEY = (uid: string) => `nucleoptu.presenca.${uid}`;

export function salvarStatusLocal(uid: string, status: string) {
  try { localStorage.setItem(STATUS_KEY(uid), status); } catch { /* armazenamento opcional */ }
}

export default function PersonalizacaoPresenca() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) { document.documentElement.removeAttribute('data-user-accent'); return; }
    let ativo = true;
    const atualizarTema = async () => {
      try {
        const perfil = await getDoc(doc(db, 'profiles', user.uid));
        const cor = perfil.data()?.accentColor;
        if (ativo && typeof cor === 'string' && /^#[0-9a-f]{6}$/i.test(cor)) {
          document.documentElement.style.setProperty('--user-accent', cor);
          document.documentElement.dataset.userAccent = 'true';
        }
      } catch (e) { console.warn('Não foi possível carregar a personalização visual.', e); }
    };
    const ping = async () => {
      try {
        const ref = doc(db, 'user_presence', user.uid);
        const atual = await getDoc(ref);
        let status = 'online';
        try { status = localStorage.getItem(STATUS_KEY(user.uid)) || 'online'; } catch { /* opcional */ }
        if (!['online', 'ocupado', 'ausente', 'nao-perturbe', 'ferias', 'folga'].includes(status)) status = 'online';
        await setDoc(ref, { uid: user.uid, name: user.displayName || user.email || 'Usuário', email: user.email || '', status, lastSeenAt: serverTimestamp(), avatar: user.photoURL || atual.data()?.avatar || '' }, { merge: true });
      } catch (e) { console.warn('Presença indisponível; verifique as regras do Firestore.', e); }
    };
    void atualizarTema(); void ping();
    const timer = window.setInterval(() => { void ping(); }, 30000);
    const aoVoltar = () => { if (document.visibilityState === 'visible') void ping(); };
    document.addEventListener('visibilitychange', aoVoltar);
    const perfilListener = () => void atualizarTema();
    window.addEventListener('nucleoptu-perfil-salvo', perfilListener);
    return () => { ativo = false; window.clearInterval(timer); document.removeEventListener('visibilitychange', aoVoltar); window.removeEventListener('nucleoptu-perfil-salvo', perfilListener); };
  }, [user]);
  return null;
}

export async function carregarFontesChat() {
  const fontes: { tipo: string; id: string; titulo: string; url: string }[] = [];
  const carregar = async (colecao: string, tipo: string, mapear: (id: string, data: Record<string, any>) => { titulo: string; url: string } | null) => {
    try {
      const snap = await getDocs(collection(db, colecao));
      snap.docs.forEach(d => { const item = mapear(d.id, d.data()); if (item?.titulo) fontes.push({ tipo, id: d.id, ...item }); });
    } catch { /* sem permissão, os demais tipos seguem disponíveis */ }
  };
  await Promise.all([
    carregar('chamados', 'Contexto', (id, d) => ({ titulo: `#${d.numero || id} · ${d.cliente || ''} · ${d.assunto || ''}`, url: '/chamados' })),
    carregar('chamados', 'PR', (id, d) => { const pr = Array.isArray(d.prs) ? d.prs[0] : null; return pr ? { titulo: `PR #${pr.numero} · chamado ${d.numero || id}`, url: pr.url || '/fila' } : null; }),
    carregar('chamados_bm', 'Cartão BM', (id, d) => d.encontrado ? { titulo: `BM #${d.cardId || id} · ${d.resumo?.titulo || d.cartao?.titulo || d.chamado || ''}`, url: `/chamados-bm?cartao=${d.cardId || ''}` } : null),
    carregar('bm_quadro', 'Cartão BM', (id, d) => ({ titulo: `BM #${d.cardId || id} · ${d.titulo || d.title || ''}`, url: `/chamados-bm?cartao=${d.cardId || id}` })),
    carregar('notices', 'Aviso', (id, d) => d.active === false ? null : ({ titulo: d.title || 'Aviso', url: `/notice-board/${id}` })),
    carregar('usefulLinks', 'Link', (id, d) => ({ titulo: d.title || d.name || 'Link útil', url: d.url || '/links' })),
  ]);
  try {
    const token = await (auth.currentUser as unknown as { getIdToken(): Promise<string> } | null)?.getIdToken();
    if (token) {
      const response = await fetch('/api/conexoes', { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' });
      if (response.ok) {
        const payload = await response.json();
        (payload.clientes || []).forEach((c: Record<string, any>) => { if (c.id && c.nome) fontes.push({ tipo: 'Conexão', id: String(c.id), titulo: String(c.nome), url: '/client-connections' }); });
      }
    }
  } catch { /* conexões indisponíveis não bloqueiam as demais menções */ }
  return [...new Map(fontes.map(f => [`${f.tipo}:${f.id}`, f])).values()].slice(0, 500);
}

