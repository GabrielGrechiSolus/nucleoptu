'use client';

import React, { useState } from 'react';
import { Copy, Eye, EyeOff, MessageSquare, Pencil, Trash2 } from 'lucide-react';
import TelaDetalhe from '../components/TelaDetalhe';
import { revelaSenha } from './api';
import { toast } from 'react-toastify';
import { ROTULO_PERFIL, ROTULO_TIPO_CONEXAO, linkTeams, type ClienteConexao, type Conexao, type ContatoTeams } from './modelo';

const copia = async (texto: string, rotulo: string) => {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success(`${rotulo} copiado.`);
  } catch {
    toast.error('Não foi possível copiar. Selecione o texto e copie manualmente.');
  }
};

function Linha({ rotulo, valor, copiavel }: { rotulo: string; valor: string; copiavel?: boolean }) {
  if (!valor) return null;
  return (
    <div className="rel-field">
      <span className="rel-label">{rotulo}</span>
      <span className="rel-value flex items-center gap-2">
        <span className="rel-mono" style={{ color: 'var(--rel-text)' }}>{valor}</span>
        {copiavel && (
          <button type="button" onClick={() => copia(valor, rotulo)} aria-label={`Copiar ${rotulo}`} className="rel-btn rel-btn-icon" style={{ width: 24, height: 24 }}><Copy className="h-4 w-4" /></button>
        )}
      </span>
    </div>
  );
}

function LinhaSenha({ clienteId, conexaoId }: { clienteId: string; conexaoId: string }) {
  const [senha, setSenha] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const busca = async () => {
    setOcupado(true);
    try {
      return await revelaSenha(clienteId, conexaoId);
    } catch (e) {
      toast.error((e as Error).message);
      return '';
    } finally {
      setOcupado(false);
    }
  };

  const mostrar = async () => {
    if (senha) {
      setSenha('');
      return;
    }
    const s = await busca();
    if (!s) return;
    setSenha(s);
    setTimeout(() => setSenha(''), 30_000);
  };

  const copiar = async () => {
    const s = senha || (await busca());
    if (s) await copia(s, 'Senha');
  };

  return (
    <div className="rel-field">
      <span className="rel-label">Senha</span>
      <span className="rel-value flex items-center gap-2">
        <span className="rel-mono" style={{ color: 'var(--rel-text)' }}>{senha || '••••••••'}</span>
        <button type="button" onClick={mostrar} disabled={ocupado} aria-label={senha ? 'Ocultar senha' : 'Mostrar senha'} className="rel-btn rel-btn-icon" style={{ width: 24, height: 24 }}>
          {senha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <button type="button" onClick={copiar} disabled={ocupado} aria-label="Copiar senha" className="rel-btn rel-btn-icon" style={{ width: 24, height: 24 }}><Copy className="h-4 w-4" /></button>
      </span>
    </div>
  );
}

function CartaoConexao({ c, clienteId }: { c: Conexao; clienteId: string }) {
  const remoto = c.tipo === 'anydesk' || c.tipo === 'teamviewer';
  return (
    <div className="rel-item">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rel-tag rel-tag-info">{ROTULO_TIPO_CONEXAO[c.tipo]}</span>
        {c.nome && <span className="rel-strong">{c.nome}</span>}
        {c.tipo === 'vpn' && c.protocolo && <span className="rel-tag">{c.protocolo}</span>}
      </div>
      <div className="rel-grid rel-grid-s3">
        {remoto ? (
          <>
            <Linha rotulo="ID de acesso" valor={c.idRemoto} copiavel />
            {c.temSenha && <LinhaSenha clienteId={clienteId} conexaoId={c.id} />}
          </>
        ) : (
          <>
            <Linha rotulo="Servidor" valor={c.host} copiavel />
            <Linha rotulo="Porta" valor={c.porta} copiavel />
            <Linha rotulo="Domínio" valor={c.dominio} copiavel />
            <Linha rotulo="Usuário" valor={c.usuario} copiavel />
            {c.temSenha && <LinhaSenha clienteId={clienteId} conexaoId={c.id} />}
          </>
        )}
      </div>
      {c.observacao && <p className="rel-desc mt-3" style={{ whiteSpace: 'pre-wrap' }}>{c.observacao}</p>}
    </div>
  );
}

function CartaoContato({ p }: { p: ContatoTeams }) {
  return (
    <div className="rel-item">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rel-strong">{p.nome}</span>
        {p.perfil && <span className="rel-tag rel-tag-ok">{ROTULO_PERFIL[p.perfil]}</span>}
        {p.cargo && <span className="rel-desc">{p.cargo}</span>}
      </div>
      <div className="rel-grid rel-grid-s2">
        <Linha rotulo="E-mail do Teams" valor={p.teams} copiavel />
        <Linha rotulo="Telefone" valor={p.telefone} copiavel />
      </div>
      {p.observacao && <p className="rel-desc mt-3" style={{ whiteSpace: 'pre-wrap' }}>{p.observacao}</p>}
      {p.teams && (
        <div className="mt-3">
          <a href={linkTeams(p.teams)} target="_blank" rel="noreferrer" className="rel-btn rel-btn-outline rel-btn-sm"><MessageSquare className="h-4 w-4" /> Abrir conversa no Teams</a>
        </div>
      )}
    </div>
  );
}

export default function DetalheCliente({ c, onEditar, onExcluir, onVoltar }: { c: ClienteConexao; onEditar: () => void; onExcluir: () => void; onVoltar: () => void }) {
  return (
    <TelaDetalhe
      onVoltar={onVoltar}
      rotuloVoltar="Voltar aos clientes"
      cabecalho={
        <>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {c.codigo && <span className="rel-mono">{c.codigo}</span>}
              <span className={`rel-tag ${c.status === 'ativo' ? 'rel-tag-ok' : ''}`}>{c.status === 'ativo' ? 'Ativo' : 'Inativo'}</span>
              {c.cidadeUf && <span className="rel-desc">{c.cidadeUf}</span>}
            </div>
            <h1 className="rel-strong mt-1 text-xl">{c.nome}</h1>
            {c.descricao && <p className="rel-desc" style={{ whiteSpace: 'pre-wrap' }}>{c.descricao}</p>}
          </div>
        </>
      }
      rodape={
        <>
          <button type="button" onClick={onExcluir} className="rel-btn rel-btn-ghost"><Trash2 className="h-4 w-4" /> Excluir</button>
          <button type="button" onClick={onEditar} className="rel-btn rel-btn-primary"><Pencil className="h-4 w-4" /> Editar</button>
        </>
      }
    >
      <section className="rel-box">
        <h3 className="rel-subtitle">Conexões ({c.conexoes.length})</h3>
        <div className="rel-list">
          {c.conexoes.map((x) => <CartaoConexao key={x.id} c={x} clienteId={c.id} />)}
          {!c.conexoes.length && <p className="rel-desc">Nenhuma conexão cadastrada.</p>}
        </div>
      </section>

      <section className="rel-box">
        <h3 className="rel-subtitle">Contatos do Teams ({c.contatos.length})</h3>
        <div className="rel-list">
          {c.contatos.map((p) => <CartaoContato key={p.id} p={p} />)}
          {!c.contatos.length && <p className="rel-desc">Nenhum contato cadastrado.</p>}
        </div>
      </section>

      {(c.atualizadoEm || c.criadoEm) && (
        <p className="rel-desc">
          {c.criadoEm && `Cadastrado em ${new Date(c.criadoEm).toLocaleDateString('pt-BR')}${c.criadoPor ? ` por ${c.criadoPor}` : ''}. `}
          {c.atualizadoEm && `Última alteração em ${new Date(c.atualizadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}${c.atualizadoPor ? ` por ${c.atualizadoPor}` : ''}.`}
        </p>
      )}
    </TelaDetalhe>
  );
}
