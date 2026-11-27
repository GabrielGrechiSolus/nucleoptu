'use client';

import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { useAuth } from '../AuthContext';
import { db } from '../../firebase';
import withAuth from '../components/withAuth';
import { carregarFontesChat, carregarUsuariosNucleo, salvarStatusLocal } from '../components/PersonalizacaoPresenca';
import { useRouter, useSearchParams } from 'next/navigation';
import { Award, Link2, LoaderCircle, MessageCircle, Paperclip, Send, Smile, Users, Sparkles, X, Trash2 } from 'lucide-react';
import { corresponde } from '../busca/motor';

type Status = 'online' | 'ocupado' | 'ausente' | 'nao-perturbe' | 'ferias' | 'folga' | 'pausa';
type Pessoa = { uid: string; name: string; email?: string; avatar?: string; homeOfficeDays?: number[]; status?: Status; lastSeenAt?: any };
type Referencia = { tipo: string; id: string; titulo: string; url: string };
type Mensagem = { id: string; uid: string; autor: string; texto: string; tipo: 'mensagem' | 'elogio' | 'reuniao' | 'aceno'; paraUid?: string; paraNome?: string; conversaId?: string; salaId?: string; refs: Referencia[]; createdAt?: any };
type TurnoGemini = { role: 'user' | 'assistant'; text: string };

const STATUS: { value: Status; label: string; cor: string }[] = [
  { value: 'online', label: 'Disponível', cor: '#16a34a' },
  { value: 'ocupado', label: 'Ocupado', cor: '#dc2626' },
  { value: 'ausente', label: 'Ausente', cor: '#d97706' },
  { value: 'nao-perturbe', label: 'Não perturbe', cor: '#7c3aed' },
  { value: 'ferias', label: 'Férias', cor: '#0891b2' },
  { value: 'folga', label: 'Folga', cor: '#64748b' },
  { value: 'pausa', label: 'Em pausa', cor: '#9ca3af' },
];
const presente = (p: Pessoa) => !!p.status && !!p.lastSeenAt?.toMillis && Date.now() - p.lastSeenAt.toMillis() < 90000;
const idConversa = (a: string, b: string) => `dm_${[a, b].sort().join('__')}`;

function ChatPage() {
  const { user } = useAuth();
  const router = useRouter();
  const parametros = useSearchParams();
  const [salaId, setSalaId] = useState<string | null>(null);
  const [destinoUid, setDestinoUid] = useState('');
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [perfis, setPerfis] = useState<Pessoa[]>([]);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [refs, setRefs] = useState<Referencia[]>([]);
  const [fontes, setFontes] = useState<Referencia[]>([]);
  const [busca, setBusca] = useState('');
  const [tipoFonte, setTipoFonte] = useState('');
  const [abrirRefs, setAbrirRefs] = useState(false);
  const [modoElogio, setModoElogio] = useState(false);
  const [paraUid, setParaUid] = useState('');
  const [status, setStatus] = useState<Status>('online');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [erroUsuarios, setErroUsuarios] = useState('');
  const [geminiAberto, setGeminiAberto] = useState(false);
  const [geminiInput, setGeminiInput] = useState('');
  const [geminiTurnos, setGeminiTurnos] = useState<TurnoGemini[]>([]);
  const [geminiCarregando, setGeminiCarregando] = useState(false);
  const [geminiErro, setGeminiErro] = useState('');

  useEffect(() => {
    setSalaId(parametros.get('sala'));
    setDestinoUid(parametros.get('para') || '');
  }, [parametros]);

  useEffect(() => {
    if (!user) return;
    const unsubPessoas = onSnapshot(collection(db, 'user_presence'), snap => setPessoas(snap.docs.map(d => ({ uid: d.id, ...d.data() } as Pessoa))));
    let perfisCancelado = false;
    void carregarUsuariosNucleo().then(lista => { if (!perfisCancelado) setPerfis(lista); }).catch((e: any) => setErroUsuarios('Não foi possível carregar os usuários cadastrados (' + (e.code || 'Firestore') + ').'));
    const unsubPerfis = () => { perfisCancelado = true; };
    let localStatus: Status = 'online';
    try { localStatus = (localStorage.getItem('nucleoptu.presenca.' + user.uid) as Status) || 'online'; } catch { /* opcional */ }
    if (STATUS.some(s => s.value === localStatus)) setStatus(localStatus);
    void carregarFontesChat().then(setFontes);
    return () => { unsubPessoas(); unsubPerfis(); };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const mensagens = collection(db, 'chat_messages');
    const q = salaId
      ? query(mensagens, where('salaId', '==', salaId), limit(150))
      : destinoUid
        ? query(mensagens, where('conversaId', '==', idConversa(user.uid, destinoUid)), limit(150))
        : query(mensagens, orderBy('createdAt', 'desc'), limit(150));
    return onSnapshot(q, snap => {
      const lista = snap.docs.map(d => ({ id: d.id, ...d.data() } as Mensagem));
      lista.sort((a, b) => (a.createdAt?.toMillis?.() || 0) - (b.createdAt?.toMillis?.() || 0));
      setMensagens(lista);
    }, e => setErro('Não foi possível carregar o chat: ' + (e.code || 'erro de acesso ao Firestore')));
  }, [user, salaId, destinoUid]);

  const usuarios = useMemo(() => { const mapa = new Map(perfis.map(p => [p.uid,p])); pessoas.forEach(p => mapa.set(p.uid,{...mapa.get(p.uid),...p})); return [...mapa.values()].sort((a,b)=>(a.name||a.email||'').localeCompare(b.name||b.email||'')); }, [perfis,pessoas]);
  const listaOnline = useMemo(() => usuarios.filter(presente), [usuarios]);
  const mensagensVisiveis = useMemo(() => salaId
    ? mensagens.filter(m => m.salaId === salaId)
    : destinoUid
      ? mensagens.filter(m => m.conversaId === (user ? idConversa(user.uid, destinoUid) : ''))
      : mensagens.filter(m => !m.salaId && !m.conversaId), [mensagens, salaId, destinoUid, user]);
  const fontesFiltradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase('pt-BR');
    return fontes
      .filter(f => !refs.some(r => r.tipo === f.tipo && r.id === f.id))
      .filter(f => !tipoFonte || f.tipo === tipoFonte)
      .filter(f => corresponde([f.tipo, f.id, f.titulo, f.url], termo))
      .slice(0, 60);
  }, [fontes, refs, busca, tipoFonte]);
  const meuNome = user?.displayName || user?.email || 'Usuário';
  const pessoaDestino = usuarios.find(p => p.uid === destinoUid);

  const mudarStatus = async (novo: Status) => {
    if (!user) return;
    setStatus(novo); salvarStatusLocal(user.uid, novo);
    try { await setDoc(doc(db, 'user_presence', user.uid), { uid: user.uid, name: meuNome, email: user.email || '', status: novo, lastSeenAt: serverTimestamp(), avatar: user.photoURL || '' }, { merge: true }); }
    catch (e: any) { setErro('Não foi possível atualizar seu status (' + (e.code || 'Firestore') + ').'); }
  };

  const enviar = async () => {
    if (!user || (!texto.trim() && !refs.length) || (modoElogio && !destinoUid && !paraUid)) return;
    setEnviando(true); setErro('');
    try {
      const destino = usuarios.find(p => p.uid === paraUid);
      const destinatario = destinoUid ? pessoaDestino : modoElogio ? destino : undefined;
      await addDoc(collection(db, 'chat_messages'), { uid: user.uid, autor: meuNome, texto: texto.trim(), tipo: modoElogio ? 'elogio' : 'mensagem', ...(destinatario ? { paraUid: destinatario.uid, paraNome: destinatario.name } : {}), ...(destinoUid && pessoaDestino && !salaId ? { conversaId: idConversa(user.uid, destinoUid) } : {}), ...(salaId ? { salaId } : {}), refs, createdAt: serverTimestamp() });
      setTexto(''); setRefs([]); setModoElogio(false); setParaUid(''); setAbrirRefs(false);
    } catch (e: any) { setErro('Não foi possível enviar a mensagem (' + (e.code || 'Firestore') + ').'); }
    finally { setEnviando(false); }
  };

  const excluirConvocacao = async (mensagem: Mensagem) => {
    try { await deleteDoc(doc(db, 'chat_messages', mensagem.id)); }
    catch (e: any) { setErro('Não foi possível remover a convocação (' + (e.code || 'Firestore') + ').'); }
  };

  const perguntarGemini = async () => {
    const pergunta = geminiInput.trim();
    if (!user || !pergunta || geminiCarregando) return;
    const turnos = [...geminiTurnos, { role: 'user' as const, text: pergunta }].slice(-12);
    setGeminiTurnos(turnos);
    setGeminiInput('');
    setGeminiCarregando(true);
    setGeminiErro('');
    try {
      const token = await (user as unknown as { getIdToken(): Promise<string> }).getIdToken();
      const response = await fetch('/api/assistente-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ turns: turnos }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.erro || 'Não foi possível consultar o Gemini.');
      setGeminiTurnos([...turnos, { role: 'assistant' as const, text: data.resposta }].slice(-12));
    } catch (e) {
      setGeminiTurnos(turnos.slice(0, -1));
      setGeminiInput(pergunta);
      setGeminiErro(e instanceof Error ? e.message : 'Não foi possível consultar o Gemini.');
    } finally {
      setGeminiCarregando(false);
    }
  };

  return <main className="min-h-full p-4 sm:p-6 lg:p-8" style={{ color: 'var(--rel-text)' }}>
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="rel-box flex flex-wrap items-center justify-between gap-4 border border-[var(--rel-line)]">
        <div><h1 className="rel-title text-2xl"><MessageCircle size={24}/> Chat da equipe</h1><p className="rel-desc">Converse, compartilhe referências e reconheça o trabalho do time.</p></div>
        <div className="flex flex-wrap items-center gap-3"><button className="rel-btn rel-btn-outline rel-btn-sm" onClick={() => setGeminiAberto(true)}><Sparkles size={15}/> Assistente Gemini</button><label className="flex items-center gap-2 text-sm"><span className="text-[var(--rel-muted)]">Meu status</span><select className="rel-input !w-auto" value={status} onChange={e => void mudarStatus(e.target.value as Status)}>{STATUS.map(s => <option value={s.value} key={s.value}>{s.label}</option>)}</select></label></div>
      </header>
      <div className="grid min-h-[65vh] gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rel-box border border-[var(--rel-line)] p-0">
          <div className="border-b border-[var(--rel-line)] px-3 py-3"><h2 className="mb-2 flex items-center justify-between gap-2 font-semibold"><span className="flex items-center gap-2"><Users size={17}/> Pessoas</span><span className="rel-tag rel-tag-ok">{listaOnline.length} presentes</span></h2><button className={'rel-btn rel-btn-sm w-full justify-start ' + (!destinoUid && !salaId ? 'rel-btn-primary' : 'rel-btn-ghost')} onClick={() => router.push('/chat')}><MessageCircle size={15}/> Conversa geral</button></div>
          <div className="max-h-[60vh] space-y-1 overflow-y-auto p-2">{usuarios.map(p => { const s = STATUS.find(x => x.value === p.status); const online = !!presente(p); const proprioUsuario = p.uid === user?.uid; return <button type="button" key={p.uid} disabled={proprioUsuario} onClick={() => router.push('/chat?para=' + encodeURIComponent(p.uid))} className={'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-[var(--rel-bg)] disabled:cursor-default disabled:opacity-70 ' + (destinoUid === p.uid ? 'bg-[var(--rel-bg)] ring-1 ring-[var(--rel-line)]' : '')}>
            <div className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--rel-primary-soft)] text-sm font-semibold text-[var(--rel-primary)]">{p.avatar ? <img src={p.avatar} alt="" className="h-full w-full object-cover"/> : (p.name || '?').slice(0,1).toUpperCase()}<i className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--rel-surface)]" style={{ background: online ? s?.cor || '#16a34a' : '#9ca3af' }}/></div>
            <div className="min-w-0"><p className="truncate text-sm font-medium">{p.name || p.email || 'Usuário'}{p.uid === user?.uid ? ' (você)' : ''}</p><p className="text-xs text-[var(--rel-muted)]">{online ? s?.label || 'Disponível' : 'Offline'}{p.homeOfficeDays?.includes(new Date().getDay()) ? ' · Home office hoje' : ' · Sem home office hoje'}</p></div>
          </button>; })}{!usuarios.length && <p className="rel-empty">{erroUsuarios || 'Ainda não há usuários cadastrados no NucleoPTU.'}</p>}</div>
        </aside>
        <section className="rel-box flex min-h-[65vh] flex-col border border-[var(--rel-line)] p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--rel-line)] px-5 py-3"><div><h2 className="font-semibold">{salaId ? 'Sala de ajuda' : pessoaDestino ? `Conversa individual com ${pessoaDestino.name || pessoaDestino.email}` : destinoUid ? 'Conversa individual' : 'Conversa geral'}</h2><p className="rel-desc">{salaId ? 'Conversa dos participantes desta sala' : destinoUid ? 'Conversa direta entre você e esta pessoa' : 'Últimas mensagens da equipe'}</p></div>{destinoUid && <button className="rel-btn rel-btn-ghost rel-btn-sm" onClick={() => router.push('/chat')}>Abrir conversa geral</button>}</div>
          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">{erro && <div className="rel-notice rel-notice-error">{erro}</div>}{mensagensVisiveis.map(m => <article key={m.id} className="flex gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--rel-primary-soft)] text-sm font-bold text-[var(--rel-primary)]">{m.autor.slice(0,1).toUpperCase()}</div>
            <div className="min-w-0 flex-1 rounded-xl border border-[var(--rel-line)] bg-[var(--rel-bg)] px-4 py-3"><div className="mb-1 flex flex-wrap items-center gap-2"><strong className="text-sm">{m.autor}</strong>{m.tipo === 'elogio' && <span className="rel-tag rel-tag-ok"><Award size={12}/> elogiou {m.paraNome}</span>}<time className="text-xs text-[var(--rel-muted)]">{m.createdAt?.toDate ? m.createdAt.toDate().toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'agora'}</time></div>
              {m.tipo === 'reuniao' && <span className="rel-tag rel-tag-alert"><Users size={12}/> Convocação para reunião</span>}{m.tipo === 'reuniao' && m.uid === user?.uid && <button className="rel-btn rel-btn-ghost rel-btn-sm ml-auto" aria-label="Excluir convocação" onClick={() => void excluirConvocacao(m)}><Trash2 size={14}/> Excluir convite</button>}{m.texto && <p className="whitespace-pre-wrap break-words text-sm">{m.texto}</p>}{m.refs?.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{m.refs.map((r,i) => <a key={i} href={r.url} target={r.url.startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="inline-flex max-w-full items-center gap-1 rounded-md border border-[var(--rel-line)] bg-[var(--rel-surface)] px-2.5 py-1.5 text-xs text-[var(--rel-primary)] hover:underline"><Link2 size={13}/><b>{r.tipo}</b><span className="truncate">{r.titulo}</span></a>)}</div>}
            </div>
          </article>)}{!mensagensVisiveis.length && <div className="rel-empty py-16"><MessageCircle className="mx-auto mb-2"/><p>Comece a conversa com a equipe.</p></div>}</div>
          <div className="border-t border-[var(--rel-line)] p-3 sm:p-4">
            {modoElogio && <div className="mb-3 flex flex-wrap items-center gap-2"><span className="rel-tag rel-tag-ok"><Award size={13}/> Elogio para</span>{destinoUid ? <strong>{pessoaDestino?.name || pessoaDestino?.email || 'Colega'}</strong> : <select className="rel-input !w-auto" value={paraUid} onChange={e => setParaUid(e.target.value)}><option value="">Escolha uma pessoa</option>{usuarios.filter(p => p.uid !== user?.uid).map(p => <option key={p.uid} value={p.uid}>{p.name || p.email}{p.homeOfficeDays?.includes(new Date().getDay()) ? ' · Home office hoje' : ' · Sem home office hoje'}</option>)}</select>}<button className="rel-btn rel-btn-ghost rel-btn-sm" onClick={() => { setModoElogio(false); setParaUid(''); }}>Cancelar</button></div>}
            {refs.length > 0 && <div className="mb-2 flex flex-wrap gap-2">{refs.map((r,i) => <span key={i} className="rel-tag rel-tag-info">{r.tipo}: {r.titulo}<button aria-label="Remover referência" className="ml-1" onClick={() => setRefs(refs.filter((_,n) => n !== i))}>×</button></span>)}</div>}
            {abrirRefs && <div className="mb-3 rounded-lg border border-[var(--rel-line)] bg-[var(--rel-surface)] p-3"><div className="mb-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px_auto]"><input autoFocus className="rel-input" placeholder="Buscar por número, título, cliente ou repositório..." value={busca} onChange={e => setBusca(e.target.value)}/><select className="rel-input" value={tipoFonte} onChange={e => setTipoFonte(e.target.value)}><option value="">Todos os tipos</option>{[...new Set(fontes.map(f => f.tipo))].sort().map(tipo => <option key={tipo} value={tipo}>{tipo}</option>)}</select><button className="rel-btn rel-btn-ghost rel-btn-sm" onClick={() => { setAbrirRefs(false); setTipoFonte(''); }}>Fechar</button></div><div className="max-h-56 space-y-1 overflow-auto">{fontesFiltradas.map((f,i) => <button key={f.tipo+f.id+i} onClick={() => { setRefs([...refs, f]); setBusca(''); }} className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left hover:bg-[var(--rel-bg)]"><span className={'rel-ref-tag '+(f.tipo==='PR'?'rel-ref-tag-pr':f.tipo==='Cartão BM'?'rel-ref-tag-bm':'rel-ref-tag-chamado')}>{f.tipo}</span><span className="min-w-0 flex-1 text-sm">{f.titulo}</span><span className="shrink-0 text-xs text-[var(--rel-muted)]">{f.id}</span></button>)}{!fontesFiltradas.length && <p className="rel-desc p-2">Nenhuma referência encontrada. Confira a permissão de leitura das coleções de origem.</p>}</div></div>}
            <textarea className="rel-input min-h-20" placeholder={modoElogio ? 'Escreva um elogio para a pessoa...' : pessoaDestino ? `Mensagem para ${pessoaDestino.name || pessoaDestino.email}...` : 'Escreva uma mensagem para a equipe...'} value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void enviar(); } }}/>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap gap-2"><button className="rel-btn rel-btn-ghost rel-btn-sm" onClick={() => { setAbrirRefs(!abrirRefs); setBusca(''); }}><Paperclip size={15}/> Mencionar item</button><button className={'rel-btn rel-btn-sm ' + (modoElogio ? 'rel-btn-primary' : 'rel-btn-ghost')} onClick={() => { setModoElogio(!modoElogio); setParaUid(''); }}><Smile size={15}/> Fazer elogio</button></div><button className="rel-btn rel-btn-primary" disabled={enviando || (!texto.trim() && !refs.length) || (modoElogio && !destinoUid && !paraUid) || (!!destinoUid && !pessoaDestino)} onClick={() => void enviar()}>{enviando ? <LoaderCircle className="animate-spin" size={16}/> : <Send size={16}/>} Enviar</button></div>
          </div>
        </section>
      </div>
    </div>
    {geminiAberto && <div className="rel-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setGeminiAberto(false); }}><section className="rel-modal rel-modal-sm gemini-dialog" role="dialog" aria-modal="true" aria-labelledby="gemini-titulo"><header className="rel-modal-head"><div><h2 id="gemini-titulo" className="rel-title"><Sparkles size={20}/> Assistente Gemini</h2><p className="rel-desc">Ajuda rápida para dúvidas e organização do trabalho.</p></div><button className="rel-btn rel-btn-icon" aria-label="Fechar assistente" onClick={() => setGeminiAberto(false)}><X size={18}/></button></header><div className="gemini-messages" aria-live="polite">{!geminiTurnos.length && <div className="rel-empty py-10"><Sparkles className="mx-auto mb-2"/><p>Olá! Como posso ajudar?</p><p className="mt-1 text-xs">Não envio o histórico do chat da equipe. Compartilhe apenas o contexto necessário.</p></div>}{geminiTurnos.map((turno,i)=><div key={i} className={'gemini-bubble ' + (turno.role === 'user' ? 'gemini-bubble-user' : 'gemini-bubble-ai')}><span>{turno.role === 'user' ? 'Você' : 'Gemini'}</span><p>{turno.text}</p></div>)}{geminiCarregando && <div className="gemini-bubble gemini-bubble-ai"><span>Gemini</span><p className="flex items-center gap-2"><LoaderCircle className="animate-spin" size={15}/> Preparando resposta…</p></div>}{geminiErro && <div className="rel-notice rel-notice-error">{geminiErro}</div>}</div><footer className="gemini-composer"><textarea className="rel-input min-h-20" placeholder="Digite sua pergunta…" value={geminiInput} onChange={e => setGeminiInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void perguntarGemini(); } }}/><button className="rel-btn rel-btn-primary" disabled={!geminiInput.trim() || geminiCarregando} onClick={() => void perguntarGemini()}>{geminiCarregando ? <LoaderCircle size={16} className="animate-spin"/> : <Send size={16}/>} Perguntar</button></footer></section></div>}
  </main>;
}

export default withAuth(ChatPage);

