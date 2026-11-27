'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { useAuth } from '../AuthContext';
import { db } from '../../firebase';
import withAuth from '../components/withAuth';
import { carregarFontesChat, carregarUsuariosNucleo, salvarStatusLocal } from '../components/PersonalizacaoPresenca';
import { useRouter } from 'next/navigation';
import { Award, BellRing, Building2, Coffee, ExternalLink, HelpCircle, LoaderCircle, MessageCircle, Send, Users, X, Hand, Plus, Settings2 } from 'lucide-react';
import { FaCoffee, FaDesktop, FaUserAstronaut, FaUserCircle, FaUserGraduate, FaUserNinja, FaUserTie } from 'react-icons/fa';
import Celebracoes from './Celebracoes';
import LousaEquipe from './LousaEquipe';
import { corresponde } from '../busca/motor';

type Status = 'online' | 'ocupado' | 'ausente' | 'nao-perturbe' | 'ferias' | 'folga' | 'pausa';
type Pessoa = { uid: string; name: string; email?: string; avatar?: string; homeOfficeDays?: number[]; mesaId?: string; assentoId?: string; status?: Status; lastSeenAt?: any; workingOn?: { titulo: string; tipo: string; url: string }; };
type Fonte = { tipo: string; id: string; titulo: string; url: string };
type PedidoAjuda = { id: string; ownerUid: string; ownerName: string; texto: string; trabalho?: Fonte; members?: string[]; status: 'aberta' | 'resolvida' | 'arquivada' | 'fechada'; createdAt?: any };
type ConviteCafe = { id: string; anfitriaoUid: string; anfitriaoNome: string; convidados: string[]; mensagem?: string; aceitaram?: string[]; recusaram?: string[]; criadoEm?: any };
type MesaPlanta = { id: string; nome: string; norte: number; sul: number };
type ReuniaoEquipe = { id: string; anfitriaoUid: string; anfitriaoNome: string; membros: string[]; status: 'aberta' | 'encerrada'; criadaEm?: any };
const STATUS: { value: Status; label: string; color: string }[] = [
  { value:'online', label:'Disponível', color:'#16a34a' }, { value:'ocupado', label:'Ocupado', color:'#d97706' },
  { value:'ausente', label:'Ausente', color:'#64748b' }, { value:'nao-perturbe', label:'Modo foco', color:'#dc2626' },
  { value:'ferias', label:'Férias', color:'#0891b2' }, { value:'folga', label:'Folga', color:'#64748b' },
  { value:'pausa', label:'Em pausa', color:'#9ca3af' },
];
const ativo = (p: Pessoa) => !!p.status && !!p.lastSeenAt?.toMillis && Date.now() - p.lastSeenAt.toMillis() < 90000;
const AVATARES = [FaUserAstronaut, FaUserTie, FaUserGraduate, FaUserNinja, FaUserCircle];
const MESAS_PADRAO: MesaPlanta[] = [1, 2, 3].map((n) => ({ id: `mesa-${n}`, nome: `Mesa ${n}`, norte: 4, sul: 4 }));
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
  const [buscaVinculoAjuda, setBuscaVinculoAjuda] = useState('');
  const [editandoPedido, setEditandoPedido] = useState<string | null>(null);
  const [textoEditado, setTextoEditado] = useState('');
  const [vinculoEditado, setVinculoEditado] = useState('');
  const [filtro, setFiltro] = useState('');
  const [tipoTrabalho, setTipoTrabalho] = useState('');
  const [erro, setErro] = useState('');
  const [erroUsuarios, setErroUsuarios] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [reunindo, setReunindo] = useState(false);
  const [convitesCafe, setConvitesCafe] = useState<ConviteCafe[]>([]);
  const [reunioes, setReunioes] = useState<ReuniaoEquipe[]>([]);
  const [mesas, setMesas] = useState<MesaPlanta[]>(MESAS_PADRAO);
  const [configurandoPlanta, setConfigurandoPlanta] = useState(false);
  const [salvandoLayout, setSalvandoLayout] = useState(false);
  const [modalCafe, setModalCafe] = useState(false);
  const [selecionadosCafe, setSelecionadosCafe] = useState<string[]>([]);
  const [mensagemCafe, setMensagemCafe] = useState('');
  const [enviandoCafe, setEnviandoCafe] = useState(false);
  const [salvandoAssento, setSalvandoAssento] = useState(false);
  const [mensagemAssento, setMensagemAssento] = useState('');
  const [avisoMesa, setAvisoMesa] = useState('');
  const primeiraMudancaMesa = useRef(true);
  const idsMudancasMesaVistos = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    const p = onSnapshot(collection(db,'user_presence'), s => setPresencas(s.docs.map(d => ({uid:d.id,...d.data()} as Pessoa))), e => setErro('Presença indisponível: ' + (e as any).code));
    const mudancasMesa = onSnapshot(collection(db, 'office_seat_changes'), (snap) => {
      if (primeiraMudancaMesa.current) { primeiraMudancaMesa.current = false; return; }
      const novas = snap.docs.filter((d) => !idsMudancasMesaVistos.current.has(d.id)).map((d) => d.data()).filter((d) => d.uid !== user.uid);
      idsMudancasMesaVistos.current = new Set(snap.docs.map((d) => d.id));
      const recente = novas[0];
      if (recente) { setAvisoMesa(`${recente.nome || 'Um colega'} mudou de lugar para ${recente.mesaNome}, assento ${recente.assentoNome}.`); window.setTimeout(() => setAvisoMesa(''), 9000); }
    });
    let perfisCancelado = false;
    void carregarUsuariosNucleo().then(lista => { if (!perfisCancelado) setPessoas(lista); }).catch((e: any) => setErroUsuarios('Não foi possível carregar os usuários cadastrados (' + (e.code || 'Firestore') + ').'));
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
    const r = onSnapshot(query(collection(db,'office_meetings'), where('status','==','aberta')), s => setReunioes(s.docs.map(d => ({id:d.id,...d.data()} as ReuniaoEquipe)).sort((a,b) => (b.criadaEm?.toMillis?.() ?? 0) - (a.criadaEm?.toMillis?.() ?? 0))), e => setErro('Sala de reunião indisponível: ' + (e as any).code));
    const planta = onSnapshot(collection(db,'office_layout'), s => {
      const config = s.docs.find(d => d.id === 'planta');
      const lista = config?.data().mesas ?? null;
      if (Array.isArray(lista) && lista.length) setMesas(lista.filter((m): m is MesaPlanta => !!m?.id && !!m?.nome).map(m => ({ id:String(m.id), nome:String(m.nome), norte:Math.max(1,Math.min(12,Number(m.norte)||4)), sul:Math.max(1,Math.min(12,Number(m.sul)||4)) })));
      else setMesas(MESAS_PADRAO);
    }, e => { setMesas(MESAS_PADRAO); setErro('Não foi possível carregar a configuração da planta (' + (e as any).code + ').'); });
    void carregarFontesChat().then(setFontes);
    let saved: Status = 'online'; try { saved = (localStorage.getItem('nucleoptu.presenca.' + user.uid) as Status) || 'online'; } catch {}
    if (STATUS.some(s => s.value === saved)) setStatus(saved);
    return () => { p(); mudancasMesa(); perfis(); h1(); h2(); c1(); c2(); r(); planta(); };
  }, [user]);

  const pessoasComPresenca = useMemo(() => { const mapa = new Map(pessoas.map(p => [p.uid,p])); presencas.forEach(p => mapa.set(p.uid,{...mapa.get(p.uid),...p})); return [...mapa.values()]; }, [pessoas,presencas]);
  const self = pessoasComPresenca.find(p => p.uid === user?.uid);
  const desks = useMemo(() => [...pessoasComPresenca].sort((a,b) => {
    const aActive = ativo(a) ? 0 : 1, bActive = ativo(b) ? 0 : 1;
    return aActive - bActive || (a.name || '').localeCompare(b.name || '');
  }), [pessoasComPresenca]);
  const filtraFontes = fontes.filter(f => {
    const q = filtro.trim().toLocaleLowerCase('pt-BR');
    return (f.tipo === 'PR' || f.tipo === 'Cartão BM' || f.tipo === 'Contexto')
      && (!tipoTrabalho || f.tipo === tipoTrabalho)
      && corresponde([f.id, f.tipo, f.titulo, f.url], q);
  }).slice(0, 60);
  const fontesAjuda = fontes.filter(f => {
    const tipo = tipoVinculoAjuda === 'Chamado' ? 'Contexto' : tipoVinculoAjuda;
    const q = buscaVinculoAjuda.trim().toLocaleLowerCase('pt-BR');
    return f.tipo === tipo && corresponde([f.id, f.titulo, f.url], q);
  }).slice(0, 100);
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
      const contexto = fontes.find(f => f.tipo === 'Contexto' && (f.id === numero || f.titulo.includes(numero)));
      return contexto ? { ...contexto, tipo: 'Chamado' } : { tipo:'Chamado', id:numero, titulo:`Chamado #${numero}`, url:`/chamados?busca=${encodeURIComponent(numero)}` };
    }
    if (tipoVinculoAjuda === 'PR') return { tipo:'PR', id:valor, titulo:`PR ${valor}`, url:/^https?:\/\//i.test(valor) ? valor : '/fila' };
    const bm = fontes.find(f => f.tipo === 'Cartão BM' && f.id === valor.replace(/^#/, ''));
    return bm || { tipo:'Cartão BM', id:valor, titulo:`Cartão BM ${valor}`, url:/^https?:\/\//i.test(valor) ? valor : `/chamados?aba=regras&cartao=${encodeURIComponent(valor.replace(/^#/, ''))}` };
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
      const sala = await addDoc(collection(db,'office_meetings'), { anfitriaoUid:user.uid, anfitriaoNome:meuNome, membros:[user.uid], status:'aberta', criadaEm:serverTimestamp() });
      await addDoc(collection(db,'chat_messages'), {uid:user.uid,autor:meuNome,texto:'Convocação para reunião da equipe. Entre na sala pelo link abaixo.',tipo:'reuniao',refs:[{tipo:'Sala de reunião',id:sala.id,titulo:'Entrar na reunião',url:`/chat?sala=${encodeURIComponent(sala.id)}`}],createdAt:serverTimestamp()});
      router.push(`/chat?sala=${encodeURIComponent(sala.id)}`);
    } catch(e:any) { setErro('Não foi possível convocar o time (' + (e.code || 'Firestore') + ').'); }
    finally { setReunindo(false); }
  };

  const entrarReuniao = async (reuniao: ReuniaoEquipe) => {
    if (!user) return;
    try {
      await updateDoc(doc(db,'office_meetings',reuniao.id), { membros: arrayUnion(user.uid) });
      router.push(`/chat?sala=${encodeURIComponent(reuniao.id)}`);
    } catch(e:any) { setErro('Não foi possível entrar na reunião (' + (e.code || 'Firestore') + ').'); }
  };

  const emAtividade = desks.filter(ativo).length;
  const diaHoje = new Date().getDay();
  const homeHoje = (p: Pessoa) => p.homeOfficeDays?.includes(diaHoje) === true;
  const naCopa = desks.filter(p => ativo(p) && p.status === 'pausa');
  const meusConvites = convitesCafe.filter(c => c.anfitriaoUid === user?.uid || c.convidados.includes(user?.uid || ''));
  const pessoaNoAssento = (mesaId: string, assentoId: string) => pessoasComPresenca.find(p => p.mesaId === mesaId && p.assentoId === assentoId);

  const salvarPlanta = async (novasMesas: MesaPlanta[]) => {
    if (!user || salvandoLayout) return;
    setSalvandoLayout(true);
    try {
      await setDoc(doc(db,'office_layout','planta'), { mesas: novasMesas, atualizadoEm: serverTimestamp(), atualizadoPor: user.uid });
      setMesas(novasMesas);
    } catch (e: any) {
      setErro('Não foi possível salvar a configuração da planta (' + (e.code || 'Firestore') + ').');
    } finally { setSalvandoLayout(false); }
  };

  const adicionarMesa = () => {
    const proxima: MesaPlanta = { id: `mesa-${Date.now()}`, nome: `Mesa ${mesas.length + 1}`, norte: 4, sul: 4 };
    void salvarPlanta([...mesas, proxima]);
  };

  const adicionarCadeira = (mesaId: string, lado: 'norte' | 'sul') => {
    void salvarPlanta(mesas.map(m => m.id === mesaId ? { ...m, [lado]: Math.min(12, m[lado] + 1) } : m));
  };

  const escolherAssento = async (mesaId: string, assentoId: string) => {
    if (!user || salvandoAssento) return;
    const ocupante = pessoaNoAssento(mesaId, assentoId);
    if (ocupante && ocupante.uid !== user.uid) {
      setMensagemAssento(`${ocupante.name || ocupante.email || 'Outra pessoa'} já está nesse lugar.`);
      return;
    }
    setSalvandoAssento(true);
    setMensagemAssento('');
    try {
      await setDoc(doc(db, 'profiles', user.uid), { mesaId, assentoId }, { merge: true });
      if (self?.mesaId !== mesaId || self?.assentoId !== assentoId) await addDoc(collection(db, 'office_seat_changes'), { uid: user.uid, nome: meuNome, mesaId, mesaNome: mesas.find(m => m.id === mesaId)?.nome || mesaId, assentoId, assentoNome: assentoId.split('-').at(-1) || assentoId, criadoEm: serverTimestamp() });
      setPessoas(atual => atual.map(p => p.uid === user.uid ? { ...p, mesaId, assentoId } : p));
      setMensagemAssento(`Seu lugar agora é ${mesas.find(m => m.id === mesaId)?.nome}, assento ${assentoId.split('-').at(-1)}.`);
    } catch (e: any) {
      setMensagemAssento(`Não foi possível salvar seu lugar (${e.code || 'Firestore'}).`);
    } finally {
      setSalvandoAssento(false);
    }
  };

  const renderAssento = (mesa: MesaPlanta, assento: { id: string; nome: string }) => {
    const ocupante = pessoaNoAssento(mesa.id, assento.id);
    if (!ocupante) return (
      <button key={assento.id} type="button" className="office-plan-seat office-plan-seat-empty" disabled={salvandoAssento} onClick={() => void escolherAssento(mesa.id, assento.id)} title={`Escolher ${mesa.nome}, lugar ${assento.nome}`}>
        <span className="office-plan-avatar office-plan-avatar-empty"><span>+</span></span>
        <small>{assento.nome}</small>
      </button>
    );
    const online = ativo(ocupante);
    const info = STATUS.find(s => s.value === ocupante.status);
    const conteudo = <>
      <span className="office-plan-avatar" style={{ borderColor: online ? info?.color || '#16a34a' : '#9ca3af', opacity: online ? 1 : .56 }}>
        {avatarDa(ocupante)}<i style={{ background: online ? info?.color || '#16a34a' : '#9ca3af' }}/>
      </span>
      <strong title={ocupante.name || ocupante.email}>{ocupante.name || ocupante.email || 'Usuário'}</strong>
      <small>{online ? info?.label || 'Disponível' : 'Offline'}</small>
    </>;
    return ocupante.uid === user?.uid
      ? <div key={assento.id} className="office-plan-seat office-plan-seat-occupied" title={`Você · ${mesa.nome}, lugar ${assento.nome}`}>{conteudo}<button type="button" className="office-plan-change" onClick={() => setMensagemAssento('Clique em um lugar vazio para mudar sua posição.')}>Trocar lugar</button></div>
      : <a key={assento.id} className="office-plan-seat office-plan-seat-occupied" href={`/chat?para=${encodeURIComponent(ocupante.uid)}`} title={`Abrir conversa com ${ocupante.name || ocupante.email}`}>
          {conteudo}
        </a>;
  };

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
  return <main className="min-h-full p-4 sm:p-6 lg:p-8">{avisoMesa && <div role="status" className="rel-notice rel-notice-alert fixed right-4 top-20 z-50 shadow-lg">{avisoMesa}</div>}<div className="mx-auto max-w-7xl space-y-5">
    <header className="rel-box flex flex-wrap items-center justify-between gap-4 border border-[var(--rel-line)]">
      <div><h1 className="rel-title text-2xl"><Building2 size={25}/> Escritório virtual</h1><p className="rel-desc">Um espaço leve para ver no que o time está trabalhando e pedir ajuda.</p></div>
      <div className="flex flex-wrap gap-2"><button className="rel-btn rel-btn-outline" onClick={() => setModalCafe(true)}><Coffee size={17}/> Chamar para café</button><button className={'rel-btn ' + (status === 'pausa' ? 'rel-btn-ghost' : 'rel-btn-outline')} onClick={() => void atualizar(status === 'pausa' ? 'online' : 'pausa')}><Coffee size={17}/>{status === 'pausa' ? 'Voltar à mesa' : 'Ir para a copa'}</button><button className="rel-btn rel-btn-primary" disabled={reunindo} onClick={() => void convocar()}>{reunindo ? <LoaderCircle className="animate-spin" size={17}/> : <BellRing size={17}/>} Chamar todos para reunião</button></div>
    </header>
    {erro && <div className="rel-notice rel-notice-error">{erro}</div>}
    <LousaEquipe />
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.8fr)]">
      <section className="rel-box border border-[var(--rel-line)] xl:col-span-2">
        <div className="rel-section-head"><div><h2 className="font-semibold">Escritório da equipe</h2><p className="rel-desc">{emAtividade} pessoa(s) com presença recente</p></div></div>
        <div className="office-floor mt-4">
      <section className="office-zone office-zone-work"><div className="office-zone-heading"><Building2 size={18}/><div><h3>Planta do escritório</h3><p>Escolha um lugar vazio. Clique no avatar de um colega para abrir uma conversa individual.</p></div></div>
        <div className="office-plan" aria-label="Planta baixa com três mesas compartilhadas">
          <div className="office-plan-wall"><span>JANELAS</span><span className="office-plan-plant">🌿</span><span className="office-plan-plant">🌿</span></div>
          <Celebracoes />
          <div className="office-plan-tables">{mesas.map(mesa => <section key={mesa.id} className="office-plan-table-group" aria-label={mesa.nome}>
            <div className="office-plan-seats">{Array.from({ length: mesa.norte }, (_, i) => ({ id:`${mesa.id}-n${i+1}`, nome:`N${i+1}` })).map(assento => renderAssento(mesa, assento))}</div>
            <div className="office-plan-tabletop"><span>{mesa.nome.toUpperCase()}</span><small>Estação compartilhada</small></div>
            <div className="office-plan-seats">{Array.from({ length: mesa.sul }, (_, i) => ({ id:`${mesa.id}-s${i+1}`, nome:`S${i+1}` })).map(assento => renderAssento(mesa, assento))}</div>
            {configurandoPlanta && <div className="office-plan-config"><button type="button" className="rel-btn rel-btn-outline rel-btn-sm" disabled={salvandoLayout || mesa.norte >= 12} onClick={() => adicionarCadeira(mesa.id,'norte')}><Plus size={14}/> Cadeira lado N ({mesa.norte})</button><button type="button" className="rel-btn rel-btn-outline rel-btn-sm" disabled={salvandoLayout || mesa.sul >= 12} onClick={() => adicionarCadeira(mesa.id,'sul')}><Plus size={14}/> Cadeira lado S ({mesa.sul})</button></div>}
          </section>)}</div>
          <div className="office-plan-legend"><span><i className="office-legend-dot is-online"/> Presença recente</span><span><i className="office-legend-dot is-offline"/> Offline</span><span>{salvandoAssento ? 'Salvando seu lugar...' : mensagemAssento || (self?.mesaId && self?.assentoId ? `Seu lugar: ${mesas.find(m => m.id === self.mesaId)?.nome || self.mesaId}, ${self.assentoId.split('-').pop()}` : 'Você ainda não escolheu um lugar')}</span></div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="rel-desc">{mesas.length} mesas · {mesas.reduce((t,m) => t + m.norte + m.sul, 0)} lugares</span><div className="flex gap-2"><button type="button" className="rel-btn rel-btn-ghost rel-btn-sm" onClick={() => setConfigurandoPlanta(v => !v)}><Settings2 size={15}/>{configurandoPlanta ? 'Concluir configuração' : 'Configurar lugares'}</button>{configurandoPlanta && <button type="button" className="rel-btn rel-btn-primary rel-btn-sm" disabled={salvandoLayout} onClick={adicionarMesa}><Plus size={15}/> Adicionar mesa</button>}</div></div>
        {!desks.some(p => p.mesaId && p.assentoId) && <p className="office-plan-empty">Ainda ninguém escolheu um lugar. Selecione um assento vazio para marcar o seu.</p>}
      </section>
          <section className="office-zone office-zone-meeting">
            <div className="office-zone-heading"><Users size={20}/><div><h3>Sala de reunião</h3><p>Salas ativas da equipe; entre no chat compartilhado para participar.</p></div><span className="rel-tag rel-tag-info">{reunioes.length} ativa(s)</span></div>
            {!reunioes.length ? <div className="office-meeting-empty"><Users size={34}/><p>Nenhuma reunião em andamento.</p><span>Use “Chamar todos para reunião” para abrir uma sala e convocar a equipe.</span></div> : <div className="office-meeting-list">{reunioes.map(r => { const membros = (r.membros || []).map(uid => pessoasComPresenca.find(p => p.uid === uid)).filter((p): p is Pessoa => !!p); return <article key={r.id} className="office-meeting-card"><div className="office-meeting-visual"><div className="office-meeting-table"><span/><span/><span/><span/></div><div className="office-meeting-avatars">{membros.slice(0,8).map(p => <span key={p.uid} title={`${p.name || p.email || 'Pessoa'}${ativo(p) ? ' · online' : ' · offline'}`} className="office-meeting-avatar" style={{borderColor:ativo(p) ? STATUS.find(s=>s.value===p.status)?.color || '#16a34a' : '#9ca3af',opacity:ativo(p)?1:.58}}>{avatarDa(p)}</span>)}{membros.length > 8 && <span className="office-meeting-overflow">+{membros.length - 8}</span>}</div></div><div className="office-meeting-info"><strong>{r.anfitriaoNome} iniciou uma reunião</strong><span>{membros.length} pessoa(s) na sala · {r.criadaEm?.toDate ? r.criadaEm.toDate().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}) : 'agora'}</span><div className="office-meeting-members">{membros.map(p => <span key={p.uid}>{p.name || p.email}{homeHoje(p) ? ' · home office' : ''}</span>)}</div></div><button type="button" className="rel-btn rel-btn-primary" onClick={() => void entrarReuniao(r)}><MessageCircle size={16}/>{r.membros?.includes(user?.uid || '') ? 'Voltar à sala' : 'Entrar na reunião'}</button></article>; })}</div>}
          </section>
          <section className="office-zone office-zone-coffee"><div className="office-zone-heading"><Coffee size={18}/><div><h3>Copa</h3><p>Quem está em pausa aparece por aqui.</p></div></div><div className="office-desks">{naCopa.map(renderMesa)}{!naCopa.length && <p className="office-zone-empty">A copa está tranquila. Convide alguém para um café ☕</p>}</div></section>
        </div>
      </section>
      <section className="rel-box border border-[var(--rel-line)]">
        <div className="rel-section-head"><div><h2 className="font-semibold">Minha mesa</h2><p className="rel-desc">Atualize seu status e o que está fazendo agora.</p></div></div>
        <label className="rel-field mt-4"><span className="rel-label">Meu status</span><select className="rel-input" value={status} onChange={e=>void atualizar(e.target.value as Status)}>{STATUS.map(s=><option value={s.value} key={s.value}>{s.label}</option>)}</select></label>
        <div className="rel-field mt-3"><label className="rel-label" htmlFor="busca-trabalho">Estou trabalhando em</label><div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px]"><input id="busca-trabalho" className="rel-input" placeholder="Buscar por número, título, cliente ou repo..." value={filtro} onChange={e=>setFiltro(e.target.value)}/><select className="rel-input" value={tipoTrabalho} onChange={e=>setTipoTrabalho(e.target.value)}><option value="">Todos os tipos</option><option value="Contexto">Contextos</option><option value="PR">PRs</option><option value="Cartão BM">Cartões BM</option></select></div>{(filtro.trim() || tipoTrabalho) && <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-[var(--rel-line)] bg-[var(--rel-surface)] p-1" role="listbox" aria-label="Referências encontradas">{filtraFontes.length ? filtraFontes.map(f=>{const classe=f.tipo==='PR'?'rel-ref-tag-pr':f.tipo==='Cartão BM'?'rel-ref-tag-bm':'rel-ref-tag-chamado';return <button key={f.tipo+f.id} type="button" role="option" aria-selected={trabalhoId===f.tipo+':'+f.id} onClick={()=>setTrabalhoId(f.tipo+':'+f.id)} className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left hover:bg-[var(--rel-bg)]"><span className={'rel-ref-tag '+classe}>{f.tipo}</span><span className="min-w-0 flex-1 truncate text-sm">{f.titulo}</span><span className="shrink-0 text-xs text-[var(--rel-muted)]">{f.id}</span>{trabalhoId===f.tipo+':'+f.id&&<span className="text-xs text-[var(--rel-primary)]">Selecionado</span>}</button>}) : <p className="px-3 py-2 text-sm text-[var(--rel-muted)]">{fontes.length ? 'Nenhuma referência corresponde aos filtros.' : 'Nenhuma referência foi carregada. Verifique o acesso às coleções de chamados e BM.'}</p>}</div>}{trabalhoId && <p className="mt-1 text-xs text-[var(--rel-muted)]">{(() => {const f=fontes.find(x=>x.tipo+':'+x.id===trabalhoId);return f?`Selecionado: ${f.tipo} · ${f.titulo}`:'Referência selecionada';})()}</p>}</div>
        <button className="rel-btn rel-btn-outline mt-2 w-full" disabled={!trabalhoId} onClick={()=>void salvarTrabalho()}>Atualizar meu trabalho</button>
        <div className="mt-5 border-t border-[var(--rel-line)] pt-4"><h3 className="flex items-center gap-2 font-semibold"><HelpCircle size={17}/> Pedir ajuda</h3><p className="rel-desc mt-1">Descreva o que precisa e vincule um PR, cartão BM ou número de chamado.</p><textarea className="rel-input mt-3 min-h-20" placeholder="No que você precisa de ajuda?" value={textoAjuda} onChange={e=>setTextoAjuda(e.target.value)}/><select className="rel-input mt-2" value={tipoVinculoAjuda} onChange={e=>{setTipoVinculoAjuda(e.target.value as typeof tipoVinculoAjuda);setVinculoAjudaId('');setVinculoAjudaTexto('');setBuscaVinculoAjuda('');}}><option value="Chamado">Chamado</option><option value="PR">PR do Git</option><option value="Cartão BM">Cartão do BM</option></select><label className="rel-check mt-2"><input type="checkbox" checked={vinculoAjudaManual} onChange={e=>{setVinculoAjudaManual(e.target.checked);setVinculoAjudaId('');setVinculoAjudaTexto('');setBuscaVinculoAjuda('');}}/><span className="rel-check-body"><strong>Informar vínculo manualmente</strong><span className="rel-check-note">Também pode enviar somente o número do chamado.</span></span></label>{vinculoAjudaManual ? <input className="rel-input mt-2" placeholder={tipoVinculoAjuda === 'Chamado' ? 'Número do chamado' : tipoVinculoAjuda === 'PR' ? 'URL da PR ou repositório#número' : 'ID ou URL do cartão BM'} value={vinculoAjudaTexto} onChange={e=>setVinculoAjudaTexto(e.target.value)}/> : <><input className="rel-input mt-2" placeholder="Filtrar por número, título, cliente ou repositório..." value={buscaVinculoAjuda} onChange={e=>setBuscaVinculoAjuda(e.target.value)}/><select className="rel-input mt-2" value={vinculoAjudaId} onChange={e=>setVinculoAjudaId(e.target.value)}><option value="">Vincular item cadastrado (opcional)</option>{fontesAjuda.map(f=><option key={f.tipo+f.id} value={f.id}>{f.titulo}</option>)}</select>{buscaVinculoAjuda && !fontesAjuda.length && <p className="rel-desc mt-1">Nenhum item corresponde à busca. Você pode informar o vínculo manualmente.</p>}</>}<button className="rel-btn rel-btn-primary mt-2 w-full" disabled={salvando || !textoAjuda.trim()} onClick={()=>void pedirAjuda()}>{salvando?<LoaderCircle className="animate-spin" size={16}/>:<Send size={16}/>} Abrir sala de ajuda</button></div>
        <p className="mt-3 text-xs text-[var(--rel-muted)]"><ExternalLink className="mr-1 inline" size={12}/> A convocação aparece no chat da equipe para vocês combinarem o horário.</p>
      </section>
    </div>
    <section className="rel-box border border-[var(--rel-line)]"><div className="rel-section-head"><div><h2 className="flex items-center gap-2 font-semibold"><Users size={18}/> Salas pedindo ajuda</h2><p className="rel-desc">Pedidos ativos da equipe. Seu próprio pedido também fica disponível para gerenciamento abaixo.</p></div><span className="rel-tag rel-tag-alert">{pedido.filter(s=>s.status==='aberta' && s.ownerUid!==user?.uid).length} aberta(s)</span></div>{!pedido.some(s=>s.status==='aberta' && s.ownerUid!==user?.uid)?<p className="rel-empty">Ninguém precisa de ajuda no momento — tudo fluindo por aqui!</p>:<div className="mt-3 grid gap-3 md:grid-cols-2">{pedido.filter(s=>s.status==='aberta' && s.ownerUid!==user?.uid).map(s=><article key={s.id} className="rounded-lg border border-[var(--rel-line)] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><strong>{s.ownerName} precisa de ajuda</strong><span className="rel-tag rel-tag-info">{(s.members||[]).length} na sala</span></div><p className="mt-2 text-sm">{s.texto}</p>{s.trabalho&&<a href={s.trabalho.url} className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--rel-primary)]"><span className="rel-tag rel-tag-info">{s.trabalho.tipo}</span>{s.trabalho.titulo}<ExternalLink size={12}/></a>}<button className="rel-btn rel-btn-outline rel-btn-sm mt-3 w-full" onClick={()=>void entrarSala(s)}><MessageCircle size={15}/>{(s.members||[]).includes(user?.uid||'')?'Voltar à sala':'Entrar para ajudar'}</button></article>)}</div>}</section>
    <section className="rel-box border border-[var(--rel-line)]"><div className="rel-section-head"><div><h2 className="flex items-center gap-2 font-semibold"><HelpCircle size={18}/> Meus pedidos de ajuda</h2><p className="rel-desc">Aqui você acompanha e administra os pedidos que enviou.</p></div><span className="rel-tag rel-tag-info">{pedido.filter(s=>s.ownerUid===user?.uid).length} pedido(s)</span></div>{!pedido.some(s=>s.ownerUid===user?.uid)?<p className="rel-empty">Você ainda não enviou pedidos de ajuda.</p>:<div className="mt-3 grid gap-3 md:grid-cols-2">{pedido.filter(s=>s.ownerUid===user?.uid).map(s=><article key={s.id} className="rounded-lg border border-[var(--rel-line)] p-4"><div className="flex items-center justify-between gap-2"><strong>Seu pedido</strong><span className={'rel-tag '+(s.status==='aberta'?'rel-tag-alert':s.status==='resolvida'?'rel-tag-ok':'rel-tag-info')}>{s.status}</span></div>{editandoPedido===s.id?<><textarea className="rel-input mt-3 min-h-20" value={textoEditado} onChange={e=>setTextoEditado(e.target.value)}/><select className="rel-input mt-2" value={vinculoEditado} onChange={e=>setVinculoEditado(e.target.value)}><option value="">Manter vínculo atual</option>{fontes.map(f=><option key={f.tipo+f.id} value={`${f.tipo}:${f.id}`}>{f.tipo} · {f.titulo}</option>)}</select><div className="mt-2 flex gap-2"><button className="rel-btn rel-btn-primary rel-btn-sm" onClick={()=>void salvarEdicaoPedido(s)}>Salvar</button><button className="rel-btn rel-btn-ghost rel-btn-sm" onClick={()=>setEditandoPedido(null)}>Cancelar</button></div></>:<><p className="mt-2 text-sm">{s.texto}</p>{s.trabalho&&<a href={s.trabalho.url} className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--rel-primary)]"><span className="rel-tag rel-tag-info">{s.trabalho.tipo}</span>{s.trabalho.titulo}<ExternalLink size={12}/></a>}<div className="mt-3 flex flex-wrap gap-2">{s.status==='aberta'&&<><button className="rel-btn rel-btn-outline rel-btn-sm" onClick={()=>{setEditandoPedido(s.id);setTextoEditado(s.texto);setVinculoEditado('');}}>Editar</button><button className="rel-btn rel-btn-outline rel-btn-sm" onClick={()=>void alterarPedido(s,{status:'resolvida'})}>Marcar resolvido</button><button className="rel-btn rel-btn-ghost rel-btn-sm" onClick={()=>void alterarPedido(s,{status:'arquivada'})}>Arquivar</button><button className="rel-btn rel-btn-ghost rel-btn-sm" onClick={()=>void deleteDoc(doc(db,'office_help',s.id)).catch(e=>setErro('Não foi possível excluir o pedido ('+(e.code||'Firestore')+').'))}>Excluir</button></>}<button className="rel-btn rel-btn-outline rel-btn-sm" onClick={()=>void entrarSala(s)}>Abrir conversa</button></div></>}</article>)}</div>}</section>
    <section className="rel-box border border-[var(--rel-line)]"><div className="rel-section-head"><div><h2 className="flex items-center gap-2 font-semibold"><Coffee size={18}/> Convites para café</h2><p className="rel-desc">Convide colegas específicos e acompanhe quem topou.</p></div></div>
      {!meusConvites.length ? <p className="rel-empty">Seus convites para café aparecerão aqui.</p> : <div className="mt-3 grid gap-3 md:grid-cols-2">{meusConvites.map(c => { const recebido = c.anfitriaoUid !== user?.uid; const minhaResposta = c.aceitaram?.includes(user?.uid || '') ? 'Você topou' : c.recusaram?.includes(user?.uid || '') ? 'Você não vai' : ''; const nomesAceitos = (c.aceitaram || []).map(uid => { const p=pessoasComPresenca.find(x=>x.uid===uid); return p ? `${p.name || p.email}${homeHoje(p) ? ' (home office hoje)' : ' (sem home office hoje)'}` : ''; }).filter(Boolean); return <article key={c.id} className="rounded-lg border border-[var(--rel-line)] p-4"><div className="flex items-start justify-between gap-3"><div><strong>{recebido ? `${c.anfitriaoNome}${homeHoje(pessoasComPresenca.find(p=>p.uid===c.anfitriaoUid) || {uid:c.anfitriaoUid,name:c.anfitriaoNome}) ? ' · home office hoje' : ' · sem home office hoje'} chamou você para um café` : 'Seu convite para o café'}</strong><p className="rel-desc mt-1">{c.mensagem || 'Pausa rápida para conversar.'}</p></div><Coffee className="shrink-0 text-[var(--rel-primary)]"/></div><p className="mt-2 text-xs text-[var(--rel-muted)]">Toparam: {nomesAceitos.length ? nomesAceitos.join(', ') : 'aguardando respostas'}</p>{recebido && <div className="mt-3 flex flex-wrap items-center gap-2">{minhaResposta && <span className="rel-tag rel-tag-ok">{minhaResposta}</span>}<button className="rel-btn rel-btn-primary rel-btn-sm" onClick={() => void responderCafe(c, true)}>Topar</button><button className="rel-btn rel-btn-ghost rel-btn-sm" onClick={() => void responderCafe(c, false)}>Não vou</button></div>}</article>; })}</div>}
    </section>
    {modalCafe && <div className="rel-backdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setModalCafe(false); }}><section className="rel-modal rel-modal-sm" role="dialog" aria-modal="true" aria-labelledby="convite-cafe-titulo"><header className="rel-modal-head"><div><h2 id="convite-cafe-titulo" className="rel-title"><Coffee size={20}/> Chamar para um café</h2><p className="rel-desc">Escolha quem você quer convidar.</p></div><button className="rel-btn rel-btn-icon" aria-label="Fechar" onClick={() => setModalCafe(false)}><X size={18}/></button></header><div className="rel-modal-body"><div className="max-h-64 overflow-y-auto">{pessoasComPresenca.filter(p => p.uid !== user?.uid).map(p => <label key={p.uid} className="rel-check"><input type="checkbox" checked={selecionadosCafe.includes(p.uid)} onChange={e => setSelecionadosCafe(e.target.checked ? [...selecionadosCafe,p.uid] : selecionadosCafe.filter(uid => uid !== p.uid))}/><span className="rel-check-body"><strong>{p.name || p.email}</strong><span className="rel-check-note">{ativo(p) ? STATUS.find(s => s.value === p.status)?.label : 'Offline'}{homeHoje(p) ? ' · Home office hoje' : ' · Sem home office hoje'}</span></span></label>)}{pessoasComPresenca.filter(p => p.uid !== user?.uid).length === 0 && <p className="rel-empty">{erroUsuarios || 'Ainda não há outros usuários cadastrados no NucleoPTU.'}</p>}</div><label className="rel-field"><span className="rel-label">Mensagem (opcional)</span><input className="rel-input" value={mensagemCafe} onChange={e => setMensagemCafe(e.target.value)} placeholder="Ex.: pausa às 15h?"/></label></div><footer className="rel-modal-foot"><span className="rel-desc">{selecionadosCafe.length} pessoa(s) selecionada(s)</span><button className="rel-btn rel-btn-primary" disabled={!selecionadosCafe.length || enviandoCafe} onClick={() => void enviarConviteCafe()}>{enviandoCafe ? <LoaderCircle size={16} className="animate-spin"/> : <Send size={16}/>} Enviar convite</button></footer></section></div>}
  </div></main>;
}

export default withAuth(EscritorioPage);

