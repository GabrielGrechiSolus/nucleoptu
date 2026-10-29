'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import withAuth from '../../components/withAuth';
import { KeyRound, Search, ShieldCheck, ShieldOff, UserCheck, UserPlus, UserX, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { SortTh, sortRows, useSort } from '../../components/SortableTable';
import { chamaApi } from '../api';
import { useAdmin } from '../useAdmin';
import { ROTULO_PERFIL, TIPOS_PERFIL, SENHA_MINIMA, validaNovoUsuario, validaSenha, type TipoPerfil } from '../validacao';
import type { UsuarioAdmin } from '../../api/admin/usuarios/route';

type Modal = { tipo: 'novo' } | { tipo: 'senha'; usuario: UsuarioAdmin } | { tipo: 'confirma'; usuario: UsuarioAdmin; acao: 'inativar' | 'ativar' | 'admin-sim' | 'admin-nao' } | null;

const dataBr = (iso: string) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');

// Senha temporária legível, sem caracteres ambíguos.
const gerarSenha = () => {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  return Array.from(bytes, (b) => letras[b % letras.length]).join('') + '!';
};

function UsuariosAdminPage() {
  const eu = useAdmin();
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');
  const [fSituacao, setFSituacao] = useState<'' | 'ativo' | 'inativo'>('');
  const [fPerfil, setFPerfil] = useState('');
  const [fAdmin, setFAdmin] = useState<'' | 'sim' | 'nao'>('');
  const [modal, setModal] = useState<Modal>(null);
  const [salvando, setSalvando] = useState(false);
  const [problema, setProblema] = useState('');
  const { sort, toggleSort } = useSort({ key: 'nome', dir: 'asc' });

  // formulário
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [tipo, setTipo] = useState<TipoPerfil>('analise');
  const [admin, setAdmin] = useState(false);
  const [criado, setCriado] = useState<{ email: string; senha: string } | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    const r = await chamaApi<{ usuarios?: UsuarioAdmin[] }>('/api/admin/usuarios');
    if (r.ok) setUsuarios(r.dados.usuarios ?? []);
    else setErro(r.dados.erro ?? 'Não foi possível carregar os usuários.');
    setCarregando(false);
  }, []);

  useEffect(() => {
    if (eu.admin && eu.configurado) carregar();
  }, [eu.admin, eu.configurado, carregar]);

  const abrirNovo = () => {
    setNome('');
    setEmail('');
    setSenha(gerarSenha());
    setTipo('analise');
    setAdmin(false);
    setProblema('');
    setCriado(null);
    setModal({ tipo: 'novo' });
  };

  const abrirSenha = (u: UsuarioAdmin) => {
    setSenha('');
    setSenha2('');
    setProblema('');
    setModal({ tipo: 'senha', usuario: u });
  };

  const criar = async () => {
    const p = validaNovoUsuario({ nome, email, senha, tipo, admin });
    if (p) return setProblema(p);
    setSalvando(true);
    setProblema('');
    const r = await chamaApi('/api/admin/usuarios', { method: 'POST', body: JSON.stringify({ nome, email, senha, tipo, admin }) });
    setSalvando(false);
    if (!r.ok) return setProblema(r.dados.erro ?? 'Não foi possível cadastrar.');
    setCriado({ email, senha });
    toast.success('Usuário cadastrado.');
    carregar();
  };

  const trocarSenha = async (u: UsuarioAdmin) => {
    const p = validaSenha(senha) ?? (senha !== senha2 ? 'As senhas não conferem.' : null);
    if (p) return setProblema(p);
    setSalvando(true);
    setProblema('');
    const r = await chamaApi(`/api/admin/usuarios/${u.uid}`, { method: 'PATCH', body: JSON.stringify({ acao: 'senha', senha }) });
    setSalvando(false);
    if (!r.ok) return setProblema(r.dados.erro ?? 'Não foi possível trocar a senha.');
    toast.success(`Senha de ${u.nome} trocada. As sessões abertas foram encerradas.`);
    setModal(null);
  };

  const confirmar = async (u: UsuarioAdmin, acao: 'inativar' | 'ativar' | 'admin-sim' | 'admin-nao') => {
    setSalvando(true);
    setProblema('');
    const corpo = acao === 'admin-sim' ? { acao: 'admin', valor: true } : acao === 'admin-nao' ? { acao: 'admin', valor: false } : { acao };
    const r = await chamaApi(`/api/admin/usuarios/${u.uid}`, { method: 'PATCH', body: JSON.stringify(corpo) });
    setSalvando(false);
    if (!r.ok) return setProblema(r.dados.erro ?? 'Não foi possível concluir a ação.');
    toast.success('Feito.');
    setModal(null);
    carregar();
  };

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const lista = usuarios.filter((u) => {
      if (fSituacao === 'ativo' && u.inativo) return false;
      if (fSituacao === 'inativo' && !u.inativo) return false;
      if (fPerfil && u.tipo !== fPerfil) return false;
      if (fAdmin === 'sim' && !u.admin) return false;
      if (fAdmin === 'nao' && u.admin) return false;
      return !q || `${u.nome} ${u.email}`.toLowerCase().includes(q);
    });
    return sortRows(lista, sort, {
      nome: (u) => u.nome,
      email: (u) => u.email,
      perfil: (u) => ROTULO_PERFIL[u.tipo as TipoPerfil] ?? '',
      admin: (u) => u.admin,
      situacao: (u) => u.inativo,
      acesso: (u) => u.ultimoAcesso && new Date(u.ultimoAcesso).getTime(),
    });
  }, [usuarios, busca, fSituacao, fPerfil, fAdmin, sort]);

  if (!eu.carregado) return <p className="text-sm text-zinc-400">Carregando...</p>;
  if (!eu.admin) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-zinc-800 p-6 text-center">
        <ShieldOff className="mx-auto mb-2 h-8 w-8 text-zinc-500" />
        <h1 className="text-lg font-semibold">Acesso restrito</h1>
        <p className="mt-1 text-sm text-zinc-400">Esta página é só para administradores. Se você deveria ter acesso, peça a um administrador.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-sky-400" />
          <div>
            <h1 className="text-2xl font-bold">Administração de usuários</h1>
            <p className="text-sm text-zinc-400">Cadastrar usuários, trocar senhas, inativar e definir administradores. Não há cadastro antes do login.</p>
          </div>
        </div>
        <button onClick={abrirNovo} disabled={!eu.configurado} className="flex items-center gap-2 rounded-md bg-sky-600 px-3 py-2 text-sm font-medium hover:bg-sky-500 disabled:opacity-60">
          <UserPlus className="h-4 w-4" /> Novo usuário
        </button>
      </header>

      {!eu.configurado && (
        <div className="mb-4 rounded-md border border-amber-600/40 bg-amber-500/10 px-3 py-3 text-sm text-amber-700">
          <strong>Falta configurar a chave do Firebase Admin no servidor.</strong> No console do Firebase: Configurações do projeto &gt; Contas de serviço &gt; Gerar nova chave privada. Salve o arquivo fora do Git e informe o caminho em
          <code className="mx-1">FIREBASE_SERVICE_ACCOUNT_PATH</code> no <code>.env.local</code>; depois reinicie o servidor. Detalhes em <code>docs/ADMIN_USUARIOS.md</code>.
        </div>
      )}
      {erro && <div className="mb-4 rounded-md border border-rose-700/50 bg-rose-900/20 px-3 py-2 text-sm text-rose-200">{erro}</div>}

      <section className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <label className="flex min-w-[220px] flex-1 flex-col gap-1 text-xs text-zinc-400">
          Pesquisar
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome ou e-mail" className="w-full rounded-md border border-zinc-700 bg-zinc-900 py-2 pl-8 pr-3 text-sm text-zinc-100" />
          </div>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Situação
          <select value={fSituacao} onChange={(e) => setFSituacao(e.target.value as '' | 'ativo' | 'inativo')} className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100">
            <option value="">Todas</option><option value="ativo">Ativos</option><option value="inativo">Inativos</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Perfil
          <select value={fPerfil} onChange={(e) => setFPerfil(e.target.value)} className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100">
            <option value="">Todos</option>{TIPOS_PERFIL.map((t) => <option key={t} value={t}>{ROTULO_PERFIL[t]}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-zinc-400">
          Administrador
          <select value={fAdmin} onChange={(e) => setFAdmin(e.target.value as '' | 'sim' | 'nao')} className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100">
            <option value="">Todos</option><option value="sim">Sim</option><option value="nao">Não</option>
          </select>
        </label>
        <span className="ml-auto text-xs text-zinc-400">{filtrados.length} de {usuarios.length} usuário(s)</span>
      </section>

      <section className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-zinc-400">
            <tr>
              <SortTh label="Nome" k="nome" sort={sort} onSort={toggleSort} />
              <SortTh label="E-mail" k="email" sort={sort} onSort={toggleSort} className="hidden sm:table-cell" />
              <SortTh label="Perfil" k="perfil" sort={sort} onSort={toggleSort} className="hidden md:table-cell" />
              <SortTh label="Admin" k="admin" sort={sort} onSort={toggleSort} />
              <SortTh label="Situação" k="situacao" sort={sort} onSort={toggleSort} />
              <SortTh label="Último acesso" k="acesso" sort={sort} onSort={toggleSort} className="hidden lg:table-cell" />
              <th className="px-3 py-2 text-right text-xs uppercase">Ações</th>
            </tr>
          </thead>
          <tbody>
            {carregando && <tr><td colSpan={7} className="px-3 py-8 text-center text-zinc-500">Carregando...</td></tr>}
            {!carregando && !filtrados.length && <tr><td colSpan={7} className="px-3 py-8 text-center text-zinc-500">Nenhum usuário.</td></tr>}
            {filtrados.map((u) => (
              <tr key={u.uid} className={`border-t border-zinc-800 ${u.inativo ? 'opacity-60' : ''}`}>
                <td className="px-3 py-2 font-medium">{u.nome}<div className="text-xs text-zinc-500 sm:hidden">{u.email}</div></td>
                <td className="hidden px-3 py-2 text-zinc-300 sm:table-cell">{u.email}</td>
                <td className="hidden px-3 py-2 text-zinc-300 md:table-cell">{ROTULO_PERFIL[u.tipo as TipoPerfil] ?? '—'}</td>
                <td className="px-3 py-2">{u.admin ? <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-xs text-sky-600">Admin{u.adminBase ? ' (servidor)' : ''}</span> : <span className="text-zinc-600">—</span>}</td>
                <td className="px-3 py-2"><span className={`rounded px-1.5 py-0.5 text-xs ${u.inativo ? 'bg-zinc-800 text-zinc-500' : 'bg-emerald-500/15 text-emerald-600'}`}>{u.inativo ? 'Inativo' : 'Ativo'}</span></td>
                <td className="hidden whitespace-nowrap px-3 py-2 text-zinc-400 lg:table-cell">{dataBr(u.ultimoAcesso)}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <button title="Trocar senha" onClick={() => abrirSenha(u)} className="rounded bg-zinc-800 p-2 text-zinc-400 hover:text-sky-400"><KeyRound className="h-4 w-4" /></button>
                    {u.inativo ? (
                      <button title="Reativar" onClick={() => { setProblema(''); setModal({ tipo: 'confirma', usuario: u, acao: 'ativar' }); }} className="rounded bg-zinc-800 p-2 text-zinc-400 hover:text-emerald-400"><UserCheck className="h-4 w-4" /></button>
                    ) : (
                      <button title="Inativar" onClick={() => { setProblema(''); setModal({ tipo: 'confirma', usuario: u, acao: 'inativar' }); }} className="rounded bg-zinc-800 p-2 text-zinc-400 hover:text-red-400"><UserX className="h-4 w-4" /></button>
                    )}
                    <button title={u.admin ? 'Remover permissão de administrador' : 'Tornar administrador'} onClick={() => { setProblema(''); setModal({ tipo: 'confirma', usuario: u, acao: u.admin ? 'admin-nao' : 'admin-sim' }); }} className="rounded bg-zinc-800 p-2 text-zinc-400 hover:text-sky-400">
                      {u.admin ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => !salvando && setModal(null)}>
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-950 p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold">
                {modal.tipo === 'novo' ? 'Novo usuário' : modal.tipo === 'senha' ? `Trocar a senha de ${modal.usuario.nome}` : modal.acao === 'inativar' ? `Inativar ${modal.usuario.nome}?` : modal.acao === 'ativar' ? `Reativar ${modal.usuario.nome}?` : modal.acao === 'admin-sim' ? `Tornar ${modal.usuario.nome} administrador?` : `Retirar a permissão de administrador de ${modal.usuario.nome}?`}
              </h2>
              <button onClick={() => setModal(null)} className="rounded p-1 hover:bg-zinc-800"><X className="h-5 w-5" /></button>
            </div>

            {modal.tipo === 'novo' && !criado && (
              <div className="space-y-3">
                <label className="block text-xs text-zinc-400">Nome *<input value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100" /></label>
                <label className="block text-xs text-zinc-400">E-mail *<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100" /></label>
                <label className="block text-xs text-zinc-400">Senha temporária * (mínimo {SENHA_MINIMA})
                  <div className="mt-1 flex gap-2">
                    <input value={senha} onChange={(e) => setSenha(e.target.value)} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-sm text-zinc-100" />
                    <button type="button" onClick={() => setSenha(gerarSenha())} className="whitespace-nowrap rounded-md border border-zinc-700 px-2 text-xs hover:bg-zinc-900">Gerar</button>
                  </div>
                </label>
                <label className="block text-xs text-zinc-400">Tipo de perfil *
                  <select value={tipo} onChange={(e) => setTipo(e.target.value as TipoPerfil)} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm text-zinc-100">
                    {TIPOS_PERFIL.map((t) => <option key={t} value={t}>{ROTULO_PERFIL[t]}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={admin} onChange={(e) => setAdmin(e.target.checked)} /> Administrador</label>
                {problema && <p className="text-sm text-rose-600">{problema}</p>}
                <button onClick={criar} disabled={salvando} className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium hover:bg-sky-500 disabled:opacity-60">{salvando ? 'Cadastrando...' : 'Cadastrar'}</button>
              </div>
            )}
            {modal.tipo === 'novo' && criado && (
              <div className="space-y-3 text-sm">
                <p>Usuário cadastrado. Passe estes dados à pessoa (a senha não será mostrada de novo):</p>
                <div className="rounded border border-zinc-700 bg-zinc-900 p-3 font-mono text-xs"><div>E-mail: {criado.email}</div><div>Senha: {criado.senha}</div></div>
                <button onClick={() => setModal(null)} className="rounded-md border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-900">Fechar</button>
              </div>
            )}

            {modal.tipo === 'senha' && (
              <div className="space-y-3">
                <p className="text-sm text-zinc-400">As sessões abertas dessa pessoa serão encerradas.</p>
                <label className="block text-xs text-zinc-400">Nova senha (mínimo {SENHA_MINIMA})
                  <div className="mt-1 flex gap-2">
                    <input value={senha} onChange={(e) => setSenha(e.target.value)} className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-sm text-zinc-100" />
                    <button type="button" onClick={() => { const s = gerarSenha(); setSenha(s); setSenha2(s); }} className="whitespace-nowrap rounded-md border border-zinc-700 px-2 text-xs hover:bg-zinc-900">Gerar</button>
                  </div>
                </label>
                <label className="block text-xs text-zinc-400">Repita a senha<input value={senha2} onChange={(e) => setSenha2(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 font-mono text-sm text-zinc-100" /></label>
                {problema && <p className="text-sm text-rose-600">{problema}</p>}
                <button onClick={() => trocarSenha(modal.usuario)} disabled={salvando} className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium hover:bg-sky-500 disabled:opacity-60">{salvando ? 'Salvando...' : 'Trocar senha'}</button>
              </div>
            )}

            {modal.tipo === 'confirma' && (
              <div className="space-y-3 text-sm">
                <p className="text-zinc-400">
                  {modal.acao === 'inativar' ? 'A pessoa deixa de conseguir entrar e as sessões abertas são encerradas. Dá para reativar depois.' : modal.acao === 'ativar' ? 'A pessoa volta a conseguir entrar.' : modal.acao === 'admin-sim' ? 'Terá acesso a esta administração. A permissão vale no próximo login da pessoa.' : 'Perde o acesso a esta administração no próximo login.'}
                </p>
                {problema && <p className="text-rose-600">{problema}</p>}
                <div className="flex gap-2">
                  <button onClick={() => confirmar(modal.usuario, modal.acao)} disabled={salvando} className={`rounded-md px-3 py-2 font-medium text-white disabled:opacity-60 ${modal.acao === 'inativar' || modal.acao === 'admin-nao' ? 'bg-red-600 hover:bg-red-500' : 'bg-sky-600 hover:bg-sky-500'}`}>Confirmar</button>
                  <button onClick={() => setModal(null)} className="rounded-md border border-zinc-700 px-3 py-2 hover:bg-zinc-900">Cancelar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuth(UsuariosAdminPage);
