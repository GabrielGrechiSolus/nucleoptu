'use client';

import React, { useEffect, useState } from 'react';
import { auth } from '../../firebase';
import { gravaChaveBm, lerChaveBm } from '../chamados/bmChave';

// Os tipos do Firebase neste projeto são simplificados (types/firebase.d.ts): getIdToken existe em tempo de execução.
const idToken = async () => (await (auth.currentUser as unknown as { getIdToken(): Promise<string> } | null)?.getIdToken()) ?? '';

// Chave pessoal do Businessmap: fica só neste navegador; o servidor a usa em cada consulta e não a grava.
export default function BmTab() {
  const [salva, setSalva] = useState(false);
  const [nova, setNova] = useState('');
  const [quem, setQuem] = useState('');
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');
  const [validando, setValidando] = useState(false);

  useEffect(() => {
    setSalva(!!lerChaveBm());
  }, []);

  const salvar = async () => {
    const chave = nova.trim();
    if (!chave) return;
    setValidando(true);
    setErro('');
    setMsg('');
    try {
      const r = await fetch('/api/bm/validar', { method: 'POST', headers: { Authorization: `Bearer ${await idToken()}`, 'x-bm-key': chave } });
      const j = await r.json();
      if (!r.ok) {
        setErro(j.erro ?? 'Chave não aceita pelo Businessmap.');
        return;
      }
      gravaChaveBm(chave);
      setSalva(true);
      setNova('');
      setQuem(`${j.usuario.nome}${j.usuario.email ? ` (${j.usuario.email})` : ''}`);
      setMsg('Chave validada e guardada neste navegador.');
    } catch {
      setErro('Não foi possível validar a chave agora.');
    } finally {
      setValidando(false);
    }
  };

  const remover = () => {
    gravaChaveBm('');
    setSalva(false);
    setQuem('');
    setMsg('Chave removida deste navegador.');
    setErro('');
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Businessmap</h3>
        <p className="text-sm text-zinc-400">
          Informe a sua chave de API do Businessmap (no BM: seu perfil → Chave de API). Ela mostra os cartões dos chamados conforme a sua permissão. A chave fica somente neste navegador: o sistema não a grava no servidor nem no banco. Em outro navegador ou computador, informe de novo.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className={`rounded px-2 py-0.5 text-xs ${salva ? 'bg-emerald-500/15 text-emerald-300' : 'bg-zinc-700/40 text-zinc-300'}`}>{salva ? 'Chave guardada neste navegador' : 'Sem chave neste navegador'}</span>
        {quem && <span className="text-zinc-400">{quem}</span>}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="password"
          autoComplete="off"
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          placeholder={salva ? 'Nova chave (substitui a atual)' : 'Cole a sua chave de API'}
          className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
        />
        <button onClick={salvar} disabled={!nova.trim() || validando} className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {validando ? 'Validando...' : 'Validar e guardar'}
        </button>
        {salva && <button onClick={remover} className="rounded border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800">Remover</button>}
      </div>
      {msg && <p className="text-sm text-emerald-300">{msg}</p>}
      {erro && <p className="text-sm text-red-300">{erro}</p>}
    </div>
  );
}
