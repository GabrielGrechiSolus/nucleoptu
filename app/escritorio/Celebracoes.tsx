'use client';

import { useEffect, useMemo, useState } from 'react';
import { addDoc, arrayUnion, collection, doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../AuthContext';
import { carregarUsuariosNucleo } from '../components/PersonalizacaoPresenca';
import { CalendarDays, Camera, Check, MessageSquare, PartyPopper, Plus, Star } from 'lucide-react';

type Pessoa = { uid: string; name: string; email?: string };
type Comentario = { uid: string; nome: string; texto: string; criadoEm: string };
type Evento = { id: string; tipo: 'ferias' | 'experiencia' | 'meta'; titulo: string; participanteUid?: string; participanteNome?: string; data?: string; mes?: string; metaChamados?: number; chamadosFechados?: number; reuniao?: string; salgadoPago?: boolean; fotos?: string[]; comentarios?: Comentario[]; avaliacoes?: Record<string, number>; criadoPor?: string; criadoPorNome?: string };

export default function Celebracoes() {
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

  return <section className="office-chalkboard-frame" aria-label="Lousa digital de celebrações da equipe">
    <div className="office-chalkboard">
      <header className="office-chalkboard-head"><div><h2><PartyPopper size={21}/> Lousa da equipe</h2><p>Férias, conquistas e metas combinadas aqui no escritório.</p></div><details className="office-chalkboard-add"><summary><Plus size={15}/> Escrever na lousa</summary><div className="office-chalkboard-form">
        <label>Tipo<select value={tipo} onChange={(e) => setTipo(e.target.value as Evento['tipo'])}><option value="ferias">Férias e salgadinho</option><option value="experiencia">Fim da experiência</option><option value="meta">Meta da equipe</option></select></label>
        {tipo !== 'meta' ? <><label>Pessoa<select value={participanteUid} onChange={(e) => setParticipanteUid(e.target.value)}><option value="">Selecione usuário</option>{pessoas.map((p) => <option key={p.uid} value={p.uid}>{p.name}</option>)}</select></label><label>Data<input type="date" value={data} onChange={(e) => setData(e.target.value)}/></label></> : <><label>Mês<input type="month" value={mes} onChange={(e) => setMes(e.target.value)}/></label><label>Meta de chamados<input type="number" min="1" value={metaChamados} onChange={(e) => setMetaChamados(e.target.value)} placeholder="Ex.: 25"/></label><label>Reunião de origem<input value={reuniao} onChange={(e) => setReuniao(e.target.value)} placeholder="Data ou link"/></label></>}
        <label>Título (opcional)<input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: férias da Ana"/></label><button type="button" disabled={salvando} onClick={() => void criar()}><Plus size={15}/> Publicar</button>
      </div></details></header>
      {erro && <p className="office-chalk-error" role="alert">{erro}</p>}
      <div className="office-chalk-columns">{grupos.map((grupo) => { const lista = eventos.filter((e) => e.tipo === grupo.tipo); const Icon = grupo.icon; return <section key={grupo.tipo} className="office-chalk-group"><h3><Icon size={16}/>{grupo.titulo}<span>{lista.length}</span></h3>{!lista.length ? <p className="office-chalk-empty">Ainda sem registros</p> : lista.map((evento) => { const minhaNota = evento.avaliacoes?.[user?.uid || ''] || 0; const cumprida = evento.tipo === 'meta' && Number(evento.chamadosFechados || 0) >= Number(evento.metaChamados || Infinity); return <article key={evento.id} className="office-chalk-record">
        <h4>{evento.titulo}</h4><p>{evento.tipo === 'meta' ? `${evento.mes} · ${evento.metaChamados} chamados${evento.reuniao ? ` · ${evento.reuniao}` : ''}` : `${evento.participanteNome} · ${evento.tipo === 'ferias' ? 'férias' : 'fim da experiência'} · ${evento.data}`}</p>
        <strong className={evento.salgadoPago ? 'is-paid' : 'is-pending'}>{evento.salgadoPago ? '✓ Salgadinho pago' : cumprida ? 'Meta batida · falta o salgadinho' : evento.tipo === 'meta' ? 'Meta em andamento' : 'Salgadinho pendente'}</strong>
        {evento.tipo === 'meta' && <div className="office-chalk-progress"><label>Fechados <input aria-label="Chamados fechados" type="number" min="0" defaultValue={evento.chamadosFechados || 0} onBlur={(e) => { const valor = Number(e.target.value); if (valor !== Number(evento.chamadosFechados || 0)) void atualizar(evento, { chamadosFechados: valor }); }}/></label><span>{evento.chamadosFechados || 0} / {evento.metaChamados}</span><i><b style={{ width: `${Math.min(100, 100 * Number(evento.chamadosFechados || 0) / Number(evento.metaChamados || 1))}%` }}/></i></div>}
        {!evento.salgadoPago && (evento.tipo !== 'meta' || cumprida) && <button className="office-chalk-action" onClick={() => void atualizar(evento, { salgadoPago: true, pagoPor: user?.displayName || user?.email || 'Usuário', pagoEm: new Date().toISOString() })}><Check size={14}/> Marcar pago</button>}
        <details className="office-chalk-social"><summary><MessageSquare size={14}/> Comentários, fotos e avaliação</summary><div className="office-chalk-tools"><div className="office-chalk-rating">{[1,2,3,4,5].map((n) => <button key={n} title={`${n} de 5`} onClick={() => void darNota(evento,n)} className={n <= minhaNota ? 'is-rated' : ''}><Star size={16} fill={n <= minhaNota ? 'currentColor' : 'none'}/></button>)}<small>{Object.keys(evento.avaliacoes || {}).length} avaliação(ões)</small></div><div className="office-chalk-input-row"><input placeholder="Link da foto https://..." value={fotos[evento.id] || ''} onChange={(e) => setFotos((a) => ({ ...a, [evento.id]: e.target.value }))}/><button onClick={() => void adicionarFoto(evento)}><Camera size={14}/> Foto</button></div>{(evento.fotos || []).map((url) => <a key={url} href={url} target="_blank" rel="noreferrer">Ver foto da comemoração</a>)}{(evento.comentarios || []).map((c,i) => <p key={`${c.uid}-${c.criadoEm}-${i}`}><b>{c.nome}:</b> {c.texto}</p>)}<div className="office-chalk-input-row"><input placeholder="Escreva um comentário" value={comentarios[evento.id] || ''} onChange={(e) => setComentarios((a) => ({ ...a, [evento.id]: e.target.value }))}/><button onClick={() => void comentar(evento)}>Enviar</button></div></div></details>
      </article>; })}</section>; })}</div>
      <footer className="office-chalkboard-foot">Lousa digital do escritório <span>✦ Atualizada em tempo real</span></footer>
    </div>
  </section>;
}
