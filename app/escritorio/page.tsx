'use client';

import { useEffect, useMemo, useState } from 'react';
import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { useAuth } from '../AuthContext';
import { db } from '../../firebase';
import withAuth from '../components/withAuth';
import { carregarFontesChat, salvarStatusLocal } from '../components/PersonalizacaoPresenca';
import { useRouter } from 'next/navigation';
import { Award, BellRing, Building2, Coffee, ExternalLink, HelpCircle, LoaderCircle, MessageCircle, Send, Users, X, Hand } from 'lucide-react';
import { FaCoffee, FaDesktop, FaUserAstronaut, FaUserCircle, FaUserGraduate, FaUserNinja, FaUserTie } from 'react-icons/fa';

type Status = 'online' | 'ocupado' | 'ausente' | 'nao-perturbe' | 'ferias' | 'folga' | 'pausa';
type Pessoa = { uid: string; name: string; email?: string; avatar?: string; homeOfficeDays?: number[]; status?: Status; lastSeenAt?: any; workingOn?: { titulo: string; tipo: string; url: string }; };
type Fonte = { tipo: string; id: string; titulo: string; url: string };
type PedidoAjuda = { id: string; ownerUid: string; ownerName: string; texto: string; trabalho?: Fonte; members?: string[]; status: 'aberta' | 'resolvida' | 'arquivada' | 'fechada'; createdAt?: any };
type ConviteCafe = { id: string; anfitriaoUid: string; anfitriaoNome: string; convidados: string[]; mensagem?: string; aceitaram?: string[]; recusaram?: string[]; criadoEm?: any };
const STATUS: { value: Status; label: string; color: string }[] = [
  { value:'online', label:'Disponível', color:'#16a34a' }, { value:'ocupado', label:'Ocupado', color:'#d97706' },
  { value:'ausente', label:'Ausente', color:'#64748b' }, { value:'nao-perturbe', label:'Modo foco', color:'#dc2626' },
  { value:'ferias', label:'Férias', color:'#0891b2' }, { value:'folga', label:'Folga', color:'#64748b' },
  { value:'pausa', label:'Em pausa', color:'#9ca3af' },
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
  const [presencas, setPresencas] = useState<Pessoa[]>([]);
  const [fontes, setFontes] = useState<Fonte[]>([]);
  const [pedido, setPedido] = useState<PedidoAjuda[]>([]);
  const [trabalhoId, setTrabalhoId] = useState('');
  const [status, setStatus] = useState<Status>('online');
  const [textoAjuda, setTextoAjuda] = useState('');
  const [tipoVinculoAjuda, setTipoVinculoAjuda] = useState<'PR' | 'Cartão BM' | 'Chamado'>('Chamado');
  const [vinculoAjudaId, setVinculoAjudaId] = useState('');
  const [vinculoAjudaManual, setVinculoAjudaManual] = useState(false);
  const [vinculoAjudaTexto, setVinculoAjudaTexto] = useState('');
  const [editandoPedido, setEditandoPedido] = useState<string | null>(null);
  const [textoEditado, setTextoEditado] = useState('');
  const [vinculoEditado, setVinculoEditado] = useState('');
  const [filtro, setFiltro] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [reunindo, setReunindo] = useState(false);
  const [convitesCafe, setConvitesCafe] = useState<ConviteCafe[]>([]);
  const [modalCafe, setModalCafe] = useState(false);
  const [selecionadosCafe, setSelecionadosCafe] = useState<string[]>([]);
  const [mensagemCafe, setMensagemCafe] = useState('');
  const [enviandoCafe, setEnviandoCafe] = useState(false);

  useEffect(() => {
    if (!user) return;
    const p = onSnapshot(collection(db,'user_presence'), s => setPresencas(s.docs.map(d => ({uid:d.id,...d.data()} as Pessoa))), e => setErro('Presença indisponível: ' + (e as any).code));
    let perfisCancelado = false;
    void (async () => { try { const token=await (user as unknown as {getIdToken():Promise<string>}).getIdToken(); const response=await fetch('/api/presenca/usuarios',{headers:{Authorization:'Bearer '+token},cache:'no-store'}); if(!response.ok) throw new Error('lista indisponível'); const data=await response.json(); if(!perfisCancelado) setPessoas(data.usuarios || []); } catch { /* As presenças ao vivo seguem visíveis quando o endpoint de usuários estiver indisponível. */ } })();
    const perfis = () => { perfisCancelado = true; };
    let abertos: PedidoAjuda[] = []; let proprios: PedidoAjuda[] = [];
    const atualizaPedidos = () => setPedido([...new Map([...abertos,...proprios].map(x => [x.id,x])).values()]);
    const h1 = onSnapshot(query(collection(db,'office_help'), where('status','==','aberta')), s => { abertos=s.docs.map(d => ({id:d.id,...d.data()} as PedidoAjuda)); atualizaPedidos(); }, e => setErro('Salas de ajuda indisponíveis: ' + (e as any).code));
    const h2 = onSnapshot(query(collection(db,'office_help'), where('ownerUid','==',user.uid)), s => { proprios=s.docs.map(d => ({id:d.id,...d.data()} as PedidoAjuda)); atualizaPedidos(); }, e => setErro('Seus pedidos de ajuda indisponíveis: ' + (e as any).code));
    let enviados: ConviteCafe[] = [];
    let recebidos: ConviteCafe[] = [];
    const atualizaConvites = () => setConvitesCafe([...new Map([...enviados,...recebidos].map(c => [c.id,c])).values()]);
    const c1 = onSnapshot(query(collection(db,'office_coffee_invites'), where('anfitriaoUid','==',user.uid)), s => { enviados=s.docs.map(d => ({id:d.id,...d.data()} as ConviteCafe)); atualizaConvites(); }, e => setErro('Convites para café indisponíveis: ' + (e as any).code));
    const c2 = onSnapshot(query(collection(db,'office_coffee_invites'), where('convidados','array-contains',user.uid)), s => { recebidos=s.docs.map(d => ({id:d.id,...d.data()} as ConviteCafe)); atualizaConvites(); }, e => setErro('Convites para café indisponíveis: ' + (e as any).code));
    void carregarFontesChat().then(setFontes);
    let saved: Status = 'online'; try { saved = (localStorage.getItem('nucleoptu.presenca.' + user.uid) as Status) || 'online'; } catch {}
    if (STATUS.some(s => s.value === saved)) setStatus(saved);
    return () => { p(); perfis(); h1(); h2(); c1(); c2(); };
  }, [user]);

  const pessoasComPresenca = useMemo(() => { const mapa = new Map(pessoas.map(p => [p.uid,p])); presencas.forEach(p => mapa.set(p.uid,{...mapa.get(p.uid),...p})); return [...mapa.values()]; }, [pessoas,presencas]);
  const self = pessoasComPresenca.find(p => p.uid === user?.uid);
  const desks = useMemo(() => [...pessoasComPresenca].sort((a,b) => {
    const aActive = ativo(a) ? 0 : 1, bActive = ativo(b) ? 0 : 1;
    return aActive - bActive || (a.name || '').localeCompare(b.name || '');
  }), [pessoasComPresenca]);
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

  const montarVinculoAjuda = (): Fonte | undefined => {
    if (!vinculoAjudaManual) return fontes.find(f => f.tipo === (tipoVinculoAjuda === 'Chamado' ? 'Contexto' : tipoVinculoAjuda) && f.id === vinculoAjudaId);
    const valor = vinculoAjudaTexto.trim();
    if (!valor) return undefined;
    if (tipoVinculoAjuda === 'Chamado') {
      const numero = valor.replace(/^#/, '');
      return { tipo:'Chamado', id:numero, titulo:`Chamado #${numero}`, url:'/chamados' };
    }
    if (tipoVinculoAjuda === 'PR') return { tipo:'PR', id:valor, titulo:`PR ${valor}`, url:/^https?:\/\//i.test(valor) ? valor : '/fila' };
    return { tipo:'Cartão BM', id:valor, titulo:`Cartão BM ${valor}`, url:/^https?:\/\//i.test(valor) ? valor : `/chamados-bm?cartao=${encodeURIComponent(valor)}` };
  };

  const pedirAjuda = async () => {
    if (!user || !textoAjuda.trim()) return;
    setSalvando(true);
    try {
      const trabalho = montarVinculoAjuda();
      const sala = await addDoc(collection(db,'office_help'), {ownerUid:user.uid,ownerName:meuNome,texto:textoAjuda.trim(),...(trabalho ? {trabalho} : {}),members:[user.uid],status:'aberta',createdAt:serverTimestamp()});
      setTextoAjuda(''); setVinculoAjudaId(''); setVinculoAjudaTexto(''); router.push('/chat?sala=' + sala.id);
    } catch(e:any) { setErro('Não foi possível abrir a sala de ajuda (' + (e.code || 'Firestore') + ').'); }
    finally { setSalvando(false); }
  };

  const alterarPedido = async (sala: PedidoAjuda, patch: Record<string, unknown>) => {
    try { await updateDoc(doc(db,'office_help',sala.id), patch); setEditandoPedido(null); }
    catch(e:any) { setErro('Não foi possível atualizar o pedido (' + (e.code || 'Firestore') + ').'); }
  };

  const salvarEdicaoPedido = async (sala: PedidoAjuda) => {
    if (!textoEditado.trim()) return;
    const trabalho = fontes.find(f => `${f.tipo}:${f.id}` === vinculoEditado);
    await alterarPedido(sala,{texto:textoEditado.trim(), ...(trabalho ? {trabalho} : {})});
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
  const diaHoje = new Date().getDay();
  const homeHoje = (p: Pessoa) => p.homeOfficeDays?.includes(diaHoje) === true;
  const naCopa = desks.filter(p => ativo(p) && p.status === 'pausa');
  const naAreaTrabalho = desks.filter(p => p.status !== 'pausa');
  const meusConvites = convitesCafe.filter(c => c.anfitriaoUid === user?.uid || c.convidados.includes(user?.uid || ''));

  const enviarConviteCafe = async () => {
    if (!user || !selecionadosCafe.length) return;
    setEnviandoCafe(true); setErro('');
    try {
      await addDoc(collection(db, 'office_coffee_invites'), { anfitriaoUid: user.uid, anfitriaoNome: meuNome, convidados: selecionadosCafe, mensagem: mensagemCafe.trim(), aceitaram: [], recusaram: [], criadoEm: serverTimestamp() });
      setSelecionadosCafe([]); setMensagemCafe(''); setModalCafe(false);
    } catch (e: any) { setErro('Não foi possível enviar o convite (' + (e.code || 'Firestore') + ').'); }
    finally { setEnviandoCafe(false); }
  };

  const responderCafe = async (convite: ConviteCafe, aceitou: boolean) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'office_coffee_invites', convite.id), { aceitaram: aceitou ? arrayUnion(user.uid) : arrayRemove(user.uid), recusaram: aceitou ? arrayRemove(user.uid) : arrayUnion(user.uid) });
      if (aceitou) await atualizar('pausa');
    } catch (e: any) { setErro('Não foi possível registrar sua resposta (' + (e.code || 'Firestore') + ').'); }
  };

  const acenar = async (pessoa: Pessoa) => {
    if (!user) return;
    try { await addDoc(collection(db, 'chat_messages'), { uid:user.uid, autor:meuNome, paraUid:pessoa.uid, paraNome:pessoa.name || pessoa.email || 'colega', texto:'👋 acenou para ' + (pessoa.name || 'você'), tipo:'aceno', refs:[], createdAt:serverTimestamp() }); }
    catch (e:any) { setErro('Não foi possível enviar o aceno (' + (e.code || 'Firestore') + ').'); }
  };

  const renderMesa = (p: Pessoa) => {
    const isOnline = ativo(p);
    const info = STATUS.find(s => s.value === p.status);
    return <article key={p.uid} className={'office-desk ' + (p.uid === user?.uid ? 'office-desk-me' : '')}>
      <div className="office-avatar-wrap"><div className="office-avatar" style={{ opacity: isOnline ? 1 : 0.6, borderColor: isOnline ? info?.color : '#9ca3af' }}>{avatarDa(p)}</div><i className="office-presence" style={{ background: isOnline ? info?.color : '#9ca3af' }}/></div>
      <strong className="office-person-name">{p.name || p.email || 'Usuário'}{p.uid === user?.uid ? ' (você)' : ''}</strong>
      <span className="office-person-status" style={{ color: isOnline ? info?.color : '#64748b' }}>{isOnline ? info?.label : 'Offline'}{homeHoje(p) ? ' · Home office hoje' : ' · Sem home office hoje'}</span>
      <div className="office-monitor"><FaDesktop className="office-monitor-icon"/><span className="office-monitor-stand"/></div>
      <div className="office-task">{p.workingOn?.titulo ? <a title={p.workingOn.titulo} href={p.workingOn.url}><span className="rel-tag rel-tag-info">{p.workingOn.tipo}</span><span className="truncate">{p.workingOn.titulo}</span></a> : <span>Sem tarefa informada</span>}</div>
      {p.uid !== user?.uid && <div className="office-quick-actions"><button className="rel-btn rel-btn-ghost rel-btn-sm" onClick={() => void acenar(p)}><Hand size={14}/> Acenar</button>{p.workingOn?.url && <a className="rel-btn rel-btn-outline rel-btn-sm" href={p.workingOn.url}>Ver tarefa</a>}<a className="rel-btn rel-btn-ghost rel-btn-sm" href="/chat">Abrir chat</a></div>}
    </article>;
  };
  return <main className="min-h-full p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl space-y-5">
    <header className="rel-box flex flex-wrap items-center justify-between gap-4 border border-[var(--rel-line)]">
      <div><h1 className="rel-title text-2xl"><Building2 size={25}/> Escritório virtual</h1><p className="rel-desc">Um espaço leve para ver no que o time está trabalhando e pedir ajuda.</p></div>
      <div className="flex flex-wrap gap-2"><button className="rel-btn rel-btn-outline" onClick={() => setModalCafe(true)}><Coffee size={17}/> Chamar para café</button><button className={'rel-btn ' + (status === 'pausa' ? 'rel-btn-ghost' : 'rel-btn-outline')} onClick={() => void atualizar(status === 'pausa' ? 'online' : 'pausa')}><Coffee size={17}/>{status === 'pausa' ? 'Voltar à mesa' : 'Ir para a copa'}</button><button className="rel-btn rel-btn-primary" disabled={reunindo} onClick={() => void convocar()}>{reunindo ? <LoaderCircle className="animate-spin" size={17}/> : <BellRing size={17}/>} Chamar todos para reunião</button></div>
    </header>
    {erro && <div className="rel-notice rel-notice-error">{erro}</div>}
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]">
      <section className="rel-box border border-[var(--rel-line)]">
        <div className="rel-section-head"><div><h2 className="font-semibold">Escritório da equipe</h2><p className="rel-desc">{emAtividade} pessoa(s) com presença recente</p></div></div>
        <div className="office-floor mt-4">
      <section className="office-zone office-zone-work"><div className="office-zone-heading"><Building2 size={18}/><div><h3>Estações de trabalho</h3><p>Avatares mostram a presença e a tarefa atual.</p></div></div><div className="office-desks">{naAreaTrabalho.map(renderMesa)}{!desks.length && <p className="rel-empty col-span-full">As mesas vão ganhar vida quando a equipe acessar o NucleoPTU.</p>}</div></section>
          <section className="office-zone office-zone-meeting"><div className="office-zone-heading"><Users size={18}/><div><h3>Sala de reunião</h3><p>Convide a equipe pelo botão no topo.</p></div></div><div className="office-meeting-table"><span/><span/><span/><span/></div></section>
          <section className="office-zone office-zone-coffee"><div className="office-zone-heading"><Coffee size={18}/><div><h3>Copa</h3><p>Quem está em pausa aparece por aqui.</p></div></div><div className="office-desks">{naCopa.map(renderMesa)}{!naCopa.length && <p className="office-zone-empty">A copa está tranquila. Convide alguém para um café ☕</p>}</div></section>
        </div>
      </section>
      <section className="rel-box border border-[var(--rel-line)]">
        <div className="rel-section-head"><div><h2 className="font-semibold">Minha mesa</h2><p className="rel-desc">Atualize seu status e o que está fazendo agora.</p></div></div>
        <label className="rel-field mt-4"><span className="rel-label">Meu status</span><select className="rel-input" value={status} onChange={e=>void atualizar(e.target.value as Status)}>{STATUS.map(s=><option value={s.value} key={s.value}>{s.label}</option>)}</select></label>
        <label className="rel-field mt-3"><span className="rel-label">Estou trabalhando em</span><input className="rel-input" placeholder="Buscar PR, cartão BM ou contexto..." value={filtro} onChange={e=>setFiltro(e.target.value)}/><select className="rel-input" value={trabalhoId} onChange={e=>setTrabalhoId(e.target.value)}><option value="">Selecione uma referência</option>{filtraFontes.map((f,i)=><option key={f.tipo+f.id+i} value={f.tipo+':'+f.id}>{f.tipo} · {f.titulo}</option>)}</select></label>
        <button className="rel-btn rel-btn-outline mt-2 w-full" disabled={!trabalhoId} onClick={()=>void salvarTrabalho()}>Atualizar meu trabalho</button>
        <div className="mt-5 border-t border-[var(--rel-line)] pt-4"><h3 className="flex items-center gap-2 font-semibold"><HelpCircle size={17}/> Pedir ajuda</h3><p className="rel-desc mt-1">Descreva o que precisa e vincule um PR, cartão BM ou número de chamado.</p><textarea className="rel-input mt-3 min-h-20" placeholder="No que você precisa de ajuda?" value={textoAjuda} onChange={e=>setTextoAjuda(e.target.value)}/><select className="rel-input mt-2" value={tipoVinculoAjuda} onChange={e=>{setTipoVinculoAjuda(e.target.value as typeof tipoVinculoAjuda);setVinculoAjudaId('');setVinculoAjudaTexto('');}}><option value="Chamado">Chamado</option><option value="PR">PR do Git</option><option value="Cartão BM">Cartão do BM</option></select><label className="rel-check mt-2"><input type="checkbox" checked={vinculoAjudaManual} onChange={e=>{setVinculoAjudaManual(e.target.checked);setVinculoAjudaId('');setVinculoAjudaTexto('');}}/><span className="rel-check-body"><strong>Informar vínculo manualmente</strong><span className="rel-check-note">Também pode enviar somente o número do chamado.</span></span></label>{vinculoAjudaManual ? <input className="rel-input mt-2" placeholder={tipoVinculoAjuda === 'Chamado' ? 'Número do chamado' : tipoVinculoAjuda === 'PR' ? 'URL da PR ou repositório#número' : 'ID ou URL do cartão BM'} value={vinculoAjudaTexto} onChange={e=>setVinculoAjudaTexto(e.target.value)}/> : <select className="rel-input mt-2" value={vinculoAjudaId} onChange={e=>setVinculoAjudaId(e.target.value)}><option value="">Vincular item cadastrado (opcional)</option>{fontes.filter(f=>f.tipo===(tipoVinculoAjuda==='Chamado'?'Contexto':tipoVinculoAjuda)).map(f=><option key={f.tipo+f.id} value={f.id}>{f.titulo}</option>)}</select>}<button className="rel-btn rel-btn-primary mt-2 w-full" disabled={salvando || !textoAjuda.trim()} onClick={()=>void pedirAjuda()}>{salvando?<LoaderCircle className="animate-spin" size={16}/>:<Send size={16}/>} Abrir sala de ajuda</button></div>
        <p className="mt-3 text-xs text-[var(--rel-muted)]"><ExternalLink className="mr-1 inline" size={12}/> A convocação aparece no chat da equipe para vocês combinarem o horário.</p>
      </section>
    </div>
    <section className="rel-box border border-[var(--rel-line)]"><div className="rel-section-head"><div><h2 className="flex items-center gap-2 font-semibold"><Users size={18}/> Salas pedindo ajuda</h2><p className="rel-desc">Pedidos ativos da equipe. Seu próprio pedido também fica disponível para gerenciamento abaixo.</p></div><span className="rel-tag rel-tag-alert">{pedido.filter(s=>s.status==='aberta' && s.ownerUid!==user?.uid).length} aberta(s)</span></div>{!pedido.some(s=>s.status==='aberta' && s.ownerUid!==user?.uid)?<p className="rel-empty">Ninguém precisa de ajuda no momento — tudo fluindo por aqui!</p>:<div className="mt-3 grid gap-3 md:grid-cols-2">{pedido.filter(s=>s.status==='aberta' && s.ownerUid!==user?.uid).map(s=><article key={s.id} className="rounded-lg border border-[var(--rel-line)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{s.ownerName} precisa de ajuda</strong><span className="rel-tag rel-tag-info">{(s.members||[]).length} na sala</span></div><p className="mt-2 text-sm">{s.texto}</p>{s.trabalho&&<a href={s.trabalho.url} className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--rel-primary)]"><span className="rel-tag rel-tag-info">{s.trabalho.tipo}</span>{s.trabalho.titulo}<ExternalLink size={12}/></a>}<button className="rel-btn rel-btn-outline rel-btn-sm mt-3 w-full" onClick={()=>void entrarSala(s)}><MessageCircle size={15}/>{(s.members||[]).includes(user?.uid||'')?'Voltar à sala':'Entrar para ajudar'}</button></article>)}</div>}</section>
    <section className="rel-box border border-[var(--rel-line)]"><div className="rel-section-head"><div><h2 className="flex items-center gap-2 font-semibold"><HelpCircle size={18}/> Meus pedidos de ajuda</h2><p className="rel-desc">Aqui você acompanha e administra os pedidos que enviou.</p></div><span className="rel-tag rel-tag-info">{pedido.filter(s=>s.ownerUid===user?.uid).length} pedido(s)</span></div>{!pedido.some(s=>s.ownerUid===user?.uid)?<p className="rel-empty">Você ainda não enviou pedidos de ajuda.</p>:<div className="mt-3 grid gap-3 md:grid-cols-2">{pedido.filter(s=>s.ownerUid===user?.uid).map(s=><article key={s.id} className="rounded-lg border border-[var(--rel-line)] p-4"><div className="flex items-center justify-between gap-2"><strong>Seu pedido</strong><span className={'rel-tag '+(s.status==='aberta'?'rel-tag-alert':s.status==='resolvida'?'rel-tag-ok':'rel-tag-info')}>{s.status}</span></div>{editandoPedido===s.id?<><textarea className="rel-input mt-3 min-h-20" value={textoEditado} onChange={e=>setTextoEditado(e.target.value)}/><select className="rel-input mt-2" value={vinculoEditado} onChange={e=>setVinculoEditado(e.target.value)}><option value="">Manter vínculo atual</option>{fontes.map(f=><option key={f.tipo+f.id} value={`${f.tipo}:${f.id}`}>{f.tipo} · {f.titulo}</option>)}</select><div className="mt-2 flex gap-2"><button className="rel-btn rel-btn-primary rel-btn-sm" onClick={()=>void salvarEdicaoPedido(s)}>Salvar</button><button className="rel-btn rel-btn-ghost rel-btn-sm" onClick={()=>setEditandoPedido(null)}>Cancelar</button></div></>:<><p className="mt-2 text-sm">{s.texto}</p>{s.trabalho&&<a href={s.trabalho.url} className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--rel-primary)]"><span className="rel-tag rel-tag-info">{s.trabalho.tipo}</span>{s.trabalho.titulo}<ExternalLink size={12}/></a>}<div className="mt-3 flex flex-wrap gap-2">{s.status==='aberta'&&<><button className="rel-btn rel-btn-outline rel-btn-sm" onClick={()=>{setEditandoPedido(s.id);setTextoEditado(s.texto);setVinculoEditado('');}}>Editar</button><button className="rel-btn rel-btn-outline rel-btn-sm" onClick={()=>void alterarPedido(s,{status:'resolvida'})}>Marcar resolvido</button><button className="rel-btn rel-btn-ghost rel-btn-sm" onClick={()=>void alterarPedido(s,{status:'arquivada'})}>Arquivar</button><button className="rel-btn rel-btn-ghost rel-btn-sm" onClick={()=>void deleteDoc(doc(db,'office_help',s.id)).catch(e=>setErro('Não foi possível excluir o pedido ('+(e.code||'Firestore')+').'))}>Excluir</button></>}<button className="rel-btn rel-btn-outline rel-btn-sm" onClick={()=>void entrarSala(s)}>Abrir conversa</button></div></>}</article>)}</div>}</section>
    <section className="rel-box border border-[var(--rel-line)]"><div className="rel-section-head"><div><h2 className="flex items-center gap-2 font-semibold"><Coffee size={18}/> Convites para café</h2><p className="rel-desc">Convide colegas específicos e acompanhe quem topou.</p></div></div>
      {!meusConvites.length ? <p className="rel-empty">Seus convites para café aparecerão aqui.</p> : <div className="mt-3 grid gap-3 md:grid-cols-2">{meusConvites.map(c => { const recebido = c.anfitriaoUid !== user?.uid; const minhaResposta = c.aceitaram?.includes(user?.uid || '') ? 'Você topou' : c.recusaram?.includes(user?.uid || '') ? 'Você não vai' : ''; const nomesAceitos = (c.aceitaram || []).map(uid => { const p=pessoasComPresenca.find(x=>x.uid===uid); return p ? `${p.name || p.email}${homeHoje(p) ? ' (home office hoje)' : ' (sem home office hoje)'}` : ''; }).filter(Boolean); return <article key={c.id} className="rounded-lg border border-[var(--rel-line)] p-4"><div className="flex items-start justify-between gap-3"><div><strong>{recebido ? `${c.anfitriaoNome}${homeHoje(pessoasComPresenca.find(p=>p.uid===c.anfitriaoUid) || {uid:c.anfitriaoUid,name:c.anfitriaoNome}) ? ' · home office hoje' : ' · sem home office hoje'} chamou você para um café` : 'Seu convite para o café'}</strong><p className="rel-desc mt-1">{c.mensagem || 'Pausa rápida para conversar.'}</p></div><Coffee className="shrink-0 text-[var(--rel-primary)]"/></div><p className="mt-2 text-xs text-[var(--rel-muted)]">Toparam: {nomesAceitos.length ? nomesAceitos.join(', ') : 'aguardando respostas'}</p>{recebido && <div className="mt-3 flex flex-wrap items-center gap-2">{minhaResposta && <span className="rel-tag rel-tag-ok">{minhaResposta}</span>}<button className="rel-btn rel-btn-primary rel-btn-sm" onClick={() => void responderCafe(c, true)}>Topar</button><button className="rel-btn rel-btn-ghost rel-btn-sm" onClick={() => void responderCafe(c, false)}>Não vou</button></div>}</article>; })}</div>}
    </section>
    {modalCafe && <div className="rel-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setModalCafe(false); }}><section className="rel-modal rel-modal-sm" role="dialog" aria-modal="true" aria-labelledby="convite-cafe-titulo"><header className="rel-modal-head"><div><h2 id="convite-cafe-titulo" className="rel-title"><Coffee size={20}/> Chamar para um café</h2><p className="rel-desc">Escolha quem você quer convidar.</p></div><button className="rel-btn rel-btn-icon" aria-label="Fechar" onClick={() => setModalCafe(false)}><X size={18}/></button></header><div className="rel-modal-body"><div className="max-h-64 overflow-y-auto">{pessoasComPresenca.filter(p => p.uid !== user?.uid).map(p => <label key={p.uid} className="rel-check"><input type="checkbox" checked={selecionadosCafe.includes(p.uid)} onChange={e => setSelecionadosCafe(e.target.checked ? [...selecionadosCafe,p.uid] : selecionadosCafe.filter(uid => uid !== p.uid))}/><span className="rel-check-body"><strong>{p.name || p.email}</strong><span className="rel-check-note">{ativo(p) ? STATUS.find(s => s.value === p.status)?.label : 'Offline'}{homeHoje(p) ? ' · Home office hoje' : ' · Sem home office hoje'}</span></span></label>)}{pessoasComPresenca.filter(p => p.uid !== user?.uid).length === 0 && <p className="rel-empty">Ainda não há outros usuários na lista de presença.</p>}</div><label className="rel-field"><span className="rel-label">Mensagem (opcional)</span><input className="rel-input" value={mensagemCafe} onChange={e => setMensagemCafe(e.target.value)} placeholder="Ex.: pausa às 15h?"/></label></div><footer className="rel-modal-foot"><span className="rel-desc">{selecionadosCafe.length} pessoa(s) selecionada(s)</span><button className="rel-btn rel-btn-primary" disabled={!selecionadosCafe.length || enviandoCafe} onClick={() => void enviarConviteCafe()}>{enviandoCafe ? <LoaderCircle size={16} className="animate-spin"/> : <Send size={16}/>} Enviar convite</button></footer></section></div>}
  </div></main>;
}

export default withAuth(EscritorioPage);

