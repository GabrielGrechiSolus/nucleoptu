'use client';

import { useEffect, useMemo, useState } from 'react';
import { addDoc, arrayUnion, collection, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../AuthContext';
import withAuth from '../components/withAuth';
import { carregarUsuariosNucleo } from '../components/PersonalizacaoPresenca';
import { CalendarDays, Camera, Check, MessageSquare, PartyPopper, Plus, Star } from 'lucide-react';

type Pessoa = { uid: string; name: string; email?: string };
type Comentario = { uid: string; nome: string; texto: string; criadoEm: string };
type Evento = { id: string; tipo: 'ferias' | 'experiencia' | 'meta'; titulo: string; participanteUid?: string; participanteNome?: string; data?: string; mes?: string; metaChamados?: number; chamadosFechados?: number; reuniao?: string; salgadoPago?: boolean; fotos?: string[]; comentarios?: Comentario[]; avaliacoes?: Record<string, number>; criadoPor?: string; criadoPorNome?: string };

function CelebracoesPage() {
  const { user } = useAuth();
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [tipo, setTipo] = useState<Evento['tipo']>('ferias');
  const [participanteUid, setParticipanteUid] = useState('');
  const [data, setData] = useState('');
  const [titulo, setTitulo] = useState('');
  const [metaChamados, setMetaChamados] = useState('');
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [reuniao, setReuniao] = useState('');
  const [comentarios, setComentarios] = useState<Record<string, string>>({});
  const [fotos, setFotos] = useState<Record<string, string>>({});
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!user) return;
    void carregarUsuariosNucleo().then(setPessoas).catch(() => setErro('Não foi possível carregar os usuários cadastrados no Nucléo.'));
    return onSnapshot(collection(db, 'office_celebrations'), (snap) => setEventos(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Evento)).sort((a, b) => (b.data || b.mes || '').localeCompare(a.data || a.mes || ''))), (e) => setErro(`Não foi possível carregar a lousa (${e.code}).`));
  }, [user]);

  const pessoaSelecionada = pessoas.find((p) => p.uid === participanteUid);
  const criar = async () => {
    if (!user) return;
    if (tipo !== 'meta' && (!pessoaSelecionada || !data)) { setErro('Selecione a pessoa e a data do evento.'); return; }
    if (tipo === 'meta' && (!Number(metaChamados) || !mes)) { setErro('Informe a meta de chamados e o mês de referência.'); return; }
    setSalvando(true); setErro('');
    try {
      await addDoc(collection(db, 'office_celebrations'), {
        tipo,
        titulo: titulo.trim() || (tipo === 'ferias' ? 'Férias' : tipo === 'experiencia' ? 'Fim do período de experiência' : `Meta de chamados · ${mes}`),
        ...(tipo !== 'meta' ? { participanteUid, participanteNome: pessoaSelecionada?.name, data, salgadoPago: false, fotos: [], comentarios: [], avaliacoes: {} } : { mes, metaChamados: Number(metaChamados), chamadosFechados: 0, reuniao: reuniao.trim(), salgadoPago: false, fotos: [], comentarios: [], avaliacoes: {} }),
        criadoPor: user.uid, criadoPorNome: user.displayName || user.email || 'Usuário', criadoEm: serverTimestamp(),
      });
      setTitulo(''); setData(''); setMetaChamados(''); setReuniao('');
    } catch (e: any) { setErro(`Não foi possível criar o registro (${e.code || 'Firestore'}).`); }
    finally { setSalvando(false); }
  };

  const atualizar = async (evento: Evento, patch: Record<string, unknown>) => {
    try { await updateDoc(doc(db, 'office_celebrations', evento.id), patch); }
    catch (e: any) { setErro(`Não foi possível atualizar o registro (${e.code || 'Firestore'}).`); }
  };
  const comentar = async (evento: Evento) => {
    const texto = (comentarios[evento.id] || '').trim();
    if (!texto || !user) return;
    const comentario: Comentario = { uid: user.uid, nome: user.displayName || user.email || 'Usuário', texto, criadoEm: new Date().toISOString() };
    await atualizar(evento, { comentarios: arrayUnion(comentario) });
    setComentarios((a) => ({ ...a, [evento.id]: '' }));
  };
  const adicionarFoto = async (evento: Evento) => {
    const url = (fotos[evento.id] || '').trim();
    if (!/^https:\/\//i.test(url)) { setErro('Informe um link de foto iniciado por https://.'); return; }
    await atualizar(evento, { fotos: arrayUnion(url) });
    setFotos((a) => ({ ...a, [evento.id]: '' }));
  };
  const darNota = (evento: Evento, nota: number) => atualizar(evento, { [`avaliacoes.${user?.uid}`]: nota });

  const grupos = useMemo(() => [
    { tipo: 'ferias' as const, titulo: 'Férias e salgadinho', icon: CalendarDays },
    { tipo: 'experiencia' as const, titulo: 'Conquistas de experiência', icon: PartyPopper },
    { tipo: 'meta' as const, titulo: 'Metas da equipe', icon: Star },
  ], []);

  return <main className="rel-page mx-auto max-w-7xl space-y-5">
    <section className="rel-box"><h1 className="rel-title rel-title-line"><PartyPopper size={22}/> Lousa de celebrações e metas</h1><p className="rel-desc">Registre férias, conquistas de experiência e metas combinadas em reunião. A equipe acompanha o salgadinho, comenta e compartilha fotos da comemoração.</p></section>
    <section className="rel-box space-y-4">
      <h2 className="rel-title">Adicionar à lousa</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="rel-field rel-label">Tipo<select className="rel-input" value={tipo} onChange={(e) => setTipo(e.target.value as Evento['tipo'])}><option value="ferias">Férias</option><option value="experiencia">Fim da experiência</option><option value="meta">Meta de chamados</option></select></label>
        {tipo !== 'meta' ? <><label className="rel-field rel-label">Pessoa<select className="rel-input" value={participanteUid} onChange={(e) => setParticipanteUid(e.target.value)}><option value="">Selecione usuário</option>{pessoas.map((p) => <option key={p.uid} value={p.uid}>{p.name}</option>)}</select></label><label className="rel-field rel-label">Data<input className="rel-input" type="date" value={data} onChange={(e) => setData(e.target.value)}/></label></> : <><label className="rel-field rel-label">Mês<input className="rel-input" type="month" value={mes} onChange={(e) => setMes(e.target.value)}/></label><label className="rel-field rel-label">Meta de fechamentos<input className="rel-input" type="number" min="1" value={metaChamados} onChange={(e) => setMetaChamados(e.target.value)} placeholder="Ex.: 25 chamados"/></label><label className="rel-field rel-label">Reunião de origem<input className="rel-input" value={reuniao} onChange={(e) => setReuniao(e.target.value)} placeholder="Data ou link da reunião"/></label></>}
        <label className="rel-field rel-label">Título opcional<input className="rel-input" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: férias da Ana"/></label>
      </div>
      <button className="rel-btn rel-btn-primary" disabled={salvando} onClick={() => void criar()}><Plus size={16}/> Publicar na lousa</button>
      {erro && <p className="rel-notice rel-notice-error">{erro}</p>}
    </section>

    {grupos.map((grupo) => { const lista = eventos.filter((e) => e.tipo === grupo.tipo); const Icon = grupo.icon; return <section key={grupo.tipo} className="space-y-3"><h2 className="rel-title flex items-center gap-2"><Icon size={19}/>{grupo.titulo}<span className="rel-tag rel-tag-info">{lista.length}</span></h2>{!lista.length ? <p className="rel-empty">Ainda não há registros nesta seção.</p> : <div className="grid gap-4 lg:grid-cols-2">{lista.map((evento) => { const minhaNota = evento.avaliacoes?.[user?.uid || ''] || 0; const cumprida = evento.tipo === 'meta' && Number(evento.chamadosFechados || 0) >= Number(evento.metaChamados || Infinity); return <article key={evento.id} className="rel-box space-y-4 border-t-4" style={{ borderTopColor: evento.tipo === 'ferias' ? '#7c3aed' : evento.tipo === 'experiencia' ? '#059669' : '#d97706' }}>
      <header className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="rel-strong text-lg">{evento.titulo}</h3><p className="rel-desc">{evento.tipo === 'meta' ? `Meta para ${evento.mes}: ${evento.metaChamados} chamados fechados${evento.reuniao ? ` · Reunião: ${evento.reuniao}` : ''}` : `${evento.participanteNome} · ${evento.tipo === 'ferias' ? 'Sai de férias' : 'Conclui o período de experiência'} em ${evento.data}`}</p></div><span className={`rel-tag ${evento.salgadoPago ? 'rel-tag-ok' : cumprida ? 'rel-tag-alert' : 'rel-tag-alert'}`}>{evento.salgadoPago ? 'Salgadinho pago!' : cumprida ? 'Meta atingida · pagamento pendente' : evento.tipo === 'meta' ? 'Meta em andamento' : 'Salgadinho pendente'}</span></header>
      {evento.tipo === 'meta' && <div className="space-y-2"><div className="flex items-center justify-between text-sm"><span>Progresso de fechamentos</span><strong>{evento.chamadosFechados || 0} / {evento.metaChamados}</strong></div><div className="h-3 overflow-hidden rounded-full bg-[var(--rel-bg)]"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.min(100, 100 * Number(evento.chamadosFechados || 0) / Number(evento.metaChamados || 1))}%` }}/></div><label className="rel-field rel-label">Atualizar total fechado<input type="number" min="0" className="rel-input" defaultValue={evento.chamadosFechados || 0} onBlur={(e) => { const valor = Number(e.target.value); if (valor !== Number(evento.chamadosFechados || 0)) void atualizar(evento, { chamadosFechados: valor }); }}/></label></div>}
      {!evento.salgadoPago && (evento.tipo !== 'meta' || cumprida) && <button className="rel-btn rel-btn-primary" onClick={() => void atualizar(evento, { salgadoPago: true, pagoPor: user?.displayName || user?.email || 'Usuário', pagoEm: new Date().toISOString() })}><Check size={15}/> Marcar salgadinho como pago</button>}
      {evento.salgadoPago && <p className="rel-notice rel-notice-success">Pagamento confirmado{(evento as any).pagoPor ? ` por ${(evento as any).pagoPor}` : ''}.</p>}
      <div><p className="rel-label mb-2">Avalie a comemoração</p><div className="flex gap-1" aria-label="Avaliação da comemoração">{[1,2,3,4,5].map((n) => <button key={n} title={`${n} de 5`} onClick={() => void darNota(evento,n)} className={n <= minhaNota ? 'text-amber-500' : 'text-[var(--rel-muted)]'}><Star size={19} fill={n <= minhaNota ? 'currentColor' : 'none'}/></button>)}<span className="ml-2 text-xs text-[var(--rel-muted)]">{Object.keys(evento.avaliacoes || {}).length} avaliação(ões)</span></div></div>
      <div className="space-y-2"><p className="rel-label flex items-center gap-1"><Camera size={15}/> Fotos da comemoração (links)</p>{(evento.fotos || []).map((url) => <a key={url} href={url} target="_blank" rel="noreferrer" className="block truncate text-sm text-[var(--rel-primary)] underline">{url}</a>)}<div className="flex gap-2"><input className="rel-input" placeholder="https://link-da-foto" value={fotos[evento.id] || ''} onChange={(e) => setFotos((a) => ({ ...a, [evento.id]: e.target.value }))}/><button className="rel-btn rel-btn-outline" onClick={() => void adicionarFoto(evento)}>Adicionar</button></div></div>
      <div className="space-y-2"><p className="rel-label flex items-center gap-1"><MessageSquare size={15}/> Comentários</p>{(evento.comentarios || []).map((c,i) => <p key={`${c.uid}-${c.criadoEm}-${i}`} className="rounded-lg bg-[var(--rel-bg)] p-2 text-sm"><strong>{c.nome}:</strong> {c.texto}</p>)}<div className="flex gap-2"><input className="rel-input" placeholder="Deixe um comentário de parabéns" value={comentarios[evento.id] || ''} onChange={(e) => setComentarios((a) => ({ ...a, [evento.id]: e.target.value }))}/><button className="rel-btn rel-btn-outline" onClick={() => void comentar(evento)}>Comentar</button></div></div>
    </article>; })}</div>}</section>; })}
  </main>;
}

export default withAuth(CelebracoesPage);
