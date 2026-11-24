'use client';

import { useEffect, useMemo, useState } from 'react';
import { addDoc, arrayUnion, collection, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../AuthContext';
import { db } from '../../firebase';
import withAuth from '../components/withAuth';
import { carregarFontesChat, salvarStatusLocal } from '../components/PersonalizacaoPresenca';
import { useRouter } from 'next/navigation';
import { Award, BellRing, Building2, Coffee, ExternalLink, HelpCircle, LoaderCircle, MessageCircle, Send, Users } from 'lucide-react';
import { FaChair, FaCoffee, FaDesktop, FaUserAstronaut, FaUserCircle, FaUserGraduate, FaUserNinja, FaUserTie } from 'react-icons/fa';

type Status = 'online' | 'ocupado' | 'ausente' | 'nao-perturbe' | 'ferias' | 'folga';
type Pessoa = { uid: string; name: string; email?: string; avatar?: string; status?: Status; lastSeenAt?: any; workingOn?: { titulo: string; tipo: string; url: string }; };
type Fonte = { tipo: string; id: string; titulo: string; url: string };
type PedidoAjuda = { id: string; ownerUid: string; ownerName: string; texto: string; trabalho?: Fonte; members?: string[]; status: 'aberta' | 'fechada'; createdAt?: any };
const STATUS: { value: Status; label: string; color: string }[] = [
  { value:'online', label:'Disponível', color:'#16a34a' }, { value:'ocupado', label:'Ocupado', color:'#dc2626' },
  { value:'ausente', label:'Ausente', color:'#d97706' }, { value:'nao-perturbe', label:'Não perturbe', color:'#7c3aed' },
  { value:'ferias', label:'Férias', color:'#0891b2' }, { value:'folga', label:'Folga', color:'#64748b' },
];
const ativo = (p: Pessoa) => !!p.status && !!p.lastSeenAt?.toMillis && Date.now() - p.lastSeenAt.toMillis() < 90000;
const AVATARES = [FaUserAstronaut, FaUserTie, FaUserGraduate, FaUserNinja, FaUserCircle];
const avatarDa = (p: Pessoa) => {
  if (p.avatar) return <img src={p.avatar} alt="" className="h-full w-full object-cover"/>;
  const chave = p.uid || p.name || '?';
  const indice = [...chave].reduce((total, letra) => total + letra.charCodeAt(0), 0) % AVATARES.length;
  const Avatar = AVATARES[indice];
  return <Avatar aria-label="Avatar ilustrado" className="h-8 w-8"/>;
};

function EscritorioPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [fontes, setFontes] = useState<Fonte[]>([]);
  const [pedido, setPedido] = useState<PedidoAjuda[]>([]);
  const [trabalhoId, setTrabalhoId] = useState('');
  const [status, setStatus] = useState<Status>('online');
  const [textoAjuda, setTextoAjuda] = useState('');
  const [filtro, setFiltro] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [reunindo, setReunindo] = useState(false);

  useEffect(() => {
    if (!user) return;
    const p = onSnapshot(collection(db,'user_presence'), s => setPessoas(s.docs.map(d => ({uid:d.id,...d.data()} as Pessoa))), e => setErro('Presença indisponível: ' + (e as any).code));
    const h = onSnapshot(collection(db,'office_help'), s => setPedido(s.docs.map(d => ({id:d.id,...d.data()} as PedidoAjuda)).filter(d => d.status === 'aberta')), e => setErro('Salas de ajuda indisponíveis: ' + (e as any).code));
    void carregarFontesChat().then(setFontes);
    let saved: Status = 'online'; try { saved = (localStorage.getItem('nucleoptu.presenca.' + user.uid) as Status) || 'online'; } catch {}
    if (STATUS.some(s => s.value === saved)) setStatus(saved);
    return () => { p(); h(); };
  }, [user]);

  const self = pessoas.find(p => p.uid === user?.uid);
  const desks = useMemo(() => [...pessoas].sort((a,b) => {
    const aActive = ativo(a) ? 0 : 1, bActive = ativo(b) ? 0 : 1;
    return aActive - bActive || (a.name || '').localeCompare(b.name || '');
  }), [pessoas]);
  const filtraFontes = fontes.filter(f => (f.tipo === 'PR' || f.tipo === 'Cartão BM' || f.tipo === 'Contexto') && f.titulo.toLowerCase().includes(filtro.toLowerCase())).slice(0,40);
  const meuNome = user?.displayName || user?.email || 'Usuário';

  const atualizar = async (novoStatus: Status, novoWork?: Fonte | null) => {
    if (!user) return;
    setStatus(novoStatus); salvarStatusLocal(user.uid, novoStatus);
    const item = novoWork === undefined ? self?.workingOn : novoWork ? { titulo: novoWork.titulo, tipo: novoWork.tipo, url: novoWork.url } : null;
    try { await setDoc(doc(db,'user_presence',user.uid), {uid:user.uid,name:meuNome,email:user.email || '',avatar:user.photoURL || '',status:novoStatus,lastSeenAt:serverTimestamp(),workingOn:item || null}, {merge:true}); }
    catch(e:any) { setErro('Não foi possível salvar seu status ou trabalho (' + (e.code || 'Firestore') + ').'); }
  };

  const salvarTrabalho = async () => {
    if (!user) return;
    const selected = fontes.find(f => f.tipo + ':' + f.id === trabalhoId);
    if (!selected) return;
    await atualizar(status, selected);
  };

  const pedirAjuda = async () => {
    if (!user || !textoAjuda.trim()) return;
    setSalvando(true);
    try {
      const selected = fontes.find(f => f.tipo + ':' + f.id === trabalhoId);
      const sala = await addDoc(collection(db,'office_help'), {ownerUid:user.uid,ownerName:meuNome,texto:textoAjuda.trim(),...(selected ? {trabalho:selected} : {}),members:[user.uid],status:'aberta',createdAt:serverTimestamp()});
      setTextoAjuda(''); router.push('/chat?sala=' + sala.id);
    } catch(e:any) { setErro('Não foi possível abrir a sala de ajuda (' + (e.code || 'Firestore') + ').'); }
    finally { setSalvando(false); }
  };

  const entrarSala = async (sala: PedidoAjuda) => {
    if (!user) return;
    try { await updateDoc(doc(db,'office_help',sala.id), {members:arrayUnion(user.uid)}); router.push('/chat?sala=' + sala.id); }
    catch(e:any) { setErro('Não foi possível entrar na sala (' + (e.code || 'Firestore') + ').'); }
  };

  const convocar = async () => {
    if (!user) return;
    setReunindo(true); setErro('');
    try {
      await addDoc(collection(db,'chat_messages'), {uid:user.uid,autor:meuNome,texto:'Convocação para reunião geral. Quem puder participar, responda nesta conversa para combinar horário e ferramenta.',tipo:'reuniao',refs:[],createdAt:serverTimestamp()});
      router.push('/chat');
    } catch(e:any) { setErro('Não foi possível convocar o time (' + (e.code || 'Firestore') + ').'); }
    finally { setReunindo(false); }
  };

  const emAtividade = desks.filter(ativo).length;
  return <main className="min-h-full p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl space-y-5">
    <header className="rel-box flex flex-wrap items-center justify-between gap-4 border border-[var(--rel-line)]">
      <div><h1 className="rel-title text-2xl"><Building2 size={25}/> Escritório virtual</h1><p className="rel-desc">Um espaço leve para ver no que o time está trabalhando e pedir ajuda.</p></div>
      <button className="rel-btn rel-btn-primary" disabled={reunindo} onClick={() => void convocar()}>{reunindo ? <LoaderCircle className="animate-spin" size={17}/> : <BellRing size={17}/>} Chamar todos para reunião</button>
    </header>
    {erro && <div className="rel-notice rel-notice-error">{erro}</div>}
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]">
      <section className="rel-box border border-[var(--rel-line)]">
        <div className="rel-section-head"><div><h2 className="font-semibold">Área de trabalho</h2><p className="rel-desc">{emAtividade} pessoa(s) com presença recente</p></div><Coffee className="text-[var(--rel-primary)]"/></div>
        <div className="office-floor mt-4 grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
          {desks.map((p,i) => { const isOnline=ativo(p); const statusInfo=STATUS.find(s=>s.value===p.status); return <article key={p.uid} className={'office-desk ' + (p.uid===user?.uid ? 'office-desk-me' : '')}>
            <div className="office-avatar-wrap"><div className="office-avatar" style={{opacity:isOnline?1:0.55,borderColor:isOnline?statusInfo?.color:'#9ca3af'}}>{avatarDa(p)}</div><i className="office-presence" style={{background:isOnline?statusInfo?.color:'#9ca3af'}}/></div>
            <div className="mt-2 min-w-0 text-center"><strong className="block truncate text-sm">{p.name || p.email || 'Usuário'}{p.uid===user?.uid?' (você)':''}</strong><span className="text-xs text-[var(--rel-muted)]">{isOnline?statusInfo?.label:'Offline'}</span></div>
            <div className="office-monitor mt-3"><FaDesktop className="office-monitor-icon"/><span className="office-monitor-stand"/></div>
            <div className="office-chair"><FaChair size={22}/><FaCoffee className="office-coffee" size={12}/></div>
            <div className="mt-2 min-h-9 text-center">{p.workingOn?.titulo ? <a className="inline-flex max-w-full items-center gap-1 text-xs text-[var(--rel-primary)] hover:underline" href={p.workingOn.url}><span className="rel-tag rel-tag-info">{p.workingOn.tipo}</span><span className="truncate">{p.workingOn.titulo}</span></a> : <span className="text-xs text-[var(--rel-muted)]">Sem trabalho informado</span>}</div>
          </article>; })}
          {!desks.length && <p className="rel-empty col-span-full">Os avatares da equipe aparecem quando as pessoas acessarem o NucleoPTU.</p>}
        </div>
      </section>
      <section className="rel-box border border-[var(--rel-line)]">
        <div className="rel-section-head"><h2 className="font-semibold">Minha mesa</h2><span className="rel-tag rel-tag-info">{meuNome}</span></div>
        <label className="rel-field mt-4"><span className="rel-label">Meu status</span><select className="rel-input" value={status} onChange={e=>void atualizar(e.target.value as Status)}>{STATUS.map(s=><option value={s.value} key={s.value}>{s.label}</option>)}</select></label>
        <label className="rel-field mt-3"><span className="rel-label">Estou trabalhando em</span><input className="rel-input" placeholder="Buscar PR, cartão BM ou contexto..." value={filtro} onChange={e=>setFiltro(e.target.value)}/><select className="rel-input" value={trabalhoId} onChange={e=>setTrabalhoId(e.target.value)}><option value="">Selecione uma referência</option>{filtraFontes.map((f,i)=><option key={f.tipo+f.id+i} value={f.tipo+':'+f.id}>{f.tipo} · {f.titulo}</option>)}</select></label>
        <button className="rel-btn rel-btn-outline mt-2 w-full" disabled={!trabalhoId} onClick={()=>void salvarTrabalho()}>Atualizar meu trabalho</button>
        <div className="mt-5 border-t border-[var(--rel-line)] pt-4"><h3 className="flex items-center gap-2 font-semibold"><HelpCircle size={17}/> Pedir ajuda</h3><p className="rel-desc mt-1">Abre uma sala de conversa que outras pessoas podem acessar.</p><textarea className="rel-input mt-3 min-h-20" placeholder="No que você precisa de ajuda?" value={textoAjuda} onChange={e=>setTextoAjuda(e.target.value)}/><button className="rel-btn rel-btn-primary mt-2 w-full" disabled={salvando || !textoAjuda.trim()} onClick={()=>void pedirAjuda()}>{salvando?<LoaderCircle className="animate-spin" size={16}/>:<Send size={16}/>} Abrir sala de ajuda</button></div>
        <p className="mt-3 text-xs text-[var(--rel-muted)]"><ExternalLink className="mr-1 inline" size={12}/> O botão de reunião publica uma convocação no chat; para áudio/vídeo, será necessária integração com uma plataforma de reuniões.</p>
      </section>
    </div>
    <section className="rel-box border border-[var(--rel-line)]">
      <div className="rel-section-head"><div><h2 className="flex items-center gap-2 font-semibold"><Users size={18}/> Salas pedindo ajuda</h2><p className="rel-desc">Entre na conversa para colaborar com quem pediu apoio.</p></div><span className="rel-tag rel-tag-alert">{pedido.length} aberta(s)</span></div>
      {!pedido.length?<p className="rel-empty">Nenhuma sala de ajuda aberta agora.</p>:<div className="mt-3 grid gap-3 md:grid-cols-2">{pedido.map(s=><article key={s.id} className="rounded-lg border border-[var(--rel-line)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{s.ownerName} precisa de ajuda</strong><span className="rel-tag rel-tag-info">{(s.members||[]).length} na sala</span></div><p className="mt-2 text-sm">{s.texto}</p>{s.trabalho&&<a href={s.trabalho.url} className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--rel-primary)]"><span className="rel-tag rel-tag-info">{s.trabalho.tipo}</span>{s.trabalho.titulo}<ExternalLink size={12}/></a>}<button className="rel-btn rel-btn-outline rel-btn-sm mt-3 w-full" onClick={()=>void entrarSala(s)}><MessageCircle size={15}/>{(s.members||[]).includes(user?.uid||'')?'Voltar à sala':'Entrar para ajudar'}</button></article>)}</div>}
    </section>
  </div></main>;
}

export default withAuth(EscritorioPage);

