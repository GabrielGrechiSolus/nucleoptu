'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import TelaDetalhe from '../components/TelaDetalhe';
import { PERFIS_CONTATO, PROTOCOLOS_VPN, ROTULO_PERFIL, ROTULO_TIPO_CONEXAO, TIPOS_CONEXAO, novaConexao, novoContato, validaCliente, type ClienteConexao, type Conexao, type ContatoTeams, type PerfilContato, type TipoConexao } from './modelo';

function CampoSenha({ valor, onChange, rotulo, mantida }: { valor: string; onChange: (v: string) => void; rotulo: string; mantida?: boolean }) {
  const [vendo, setVendo] = useState(false);
  return (
    <div className="rel-field">
      <label className="rel-label">{rotulo}</label>
      <div className="relative">
        <input type={vendo ? 'text' : 'password'} autoComplete="new-password" value={valor} onChange={(e) => onChange(e.target.value)} placeholder={mantida ? 'Senha cadastrada: deixe em branco para manter' : ''} className="rel-input pr-9" />
        <button type="button" onClick={() => setVendo((v) => !v)} aria-label={vendo ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-2 top-2.5" style={{ color: 'var(--rel-muted)' }}>
          {vendo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function Campo({ rotulo, valor, onChange, placeholder, obrigatorio }: { rotulo: string; valor: string; onChange: (v: string) => void; placeholder?: string; obrigatorio?: boolean }) {
  return (
    <div className="rel-field">
      <label className="rel-label">{rotulo}{obrigatorio ? ' *' : ''}</label>
      <input value={valor} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="rel-input" />
    </div>
  );
}

function BlocoConexao({ c, onChange, onRemove }: { c: Conexao; onChange: (c: Conexao) => void; onRemove: () => void }) {
  const set = <K extends keyof Conexao>(k: K, v: Conexao[K]) => onChange({ ...c, [k]: v });
  const remoto = c.tipo === 'anydesk' || c.tipo === 'teamviewer';
  return (
    <div className="rel-item">
      <div className="mb-3 flex items-center justify-between">
        <span className="rel-tag rel-tag-info">{ROTULO_TIPO_CONEXAO[c.tipo]}</span>
        <button type="button" onClick={onRemove} className="rel-btn rel-btn-icon" aria-label="Remover conexão"><Trash2 className="h-4 w-4" /></button>
      </div>
      <div className="rel-grid rel-grid-s2">
        <Campo rotulo="Identificação (opcional)" valor={c.nome} onChange={(v) => set('nome', v)} placeholder="Ex.: Servidor de banco, máquina do suporte" />
        {remoto ? (
          <>
            <Campo rotulo="ID de acesso" valor={c.idRemoto} onChange={(v) => set('idRemoto', v)} obrigatorio />
            <CampoSenha rotulo="Senha" valor={c.senha} onChange={(v) => set('senha', v)} mantida={c.temSenha && !c.limparSenha} />
          </>
        ) : (
          <>
            <Campo rotulo="Servidor (host ou IP)" valor={c.host} onChange={(v) => set('host', v)} obrigatorio />
            <Campo rotulo="Porta" valor={c.porta} onChange={(v) => set('porta', v)} />
            {c.tipo === 'vpn' && (
              <div className="rel-field">
                <label className="rel-label">Protocolo</label>
                <select value={c.protocolo} onChange={(e) => set('protocolo', e.target.value)} className="rel-input">
                  {PROTOCOLOS_VPN.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}
            {c.tipo === 'terminal' && <Campo rotulo="Domínio (opcional)" valor={c.dominio} onChange={(v) => set('dominio', v)} />}
            <Campo rotulo="Usuário" valor={c.usuario} onChange={(v) => set('usuario', v)} />
            <CampoSenha rotulo="Senha" valor={c.senha} onChange={(v) => set('senha', v)} mantida={c.temSenha && !c.limparSenha} />
          </>
        )}
      </div>
      {c.temSenha && (
        <label className="rel-desc mt-3 flex items-center gap-2">
          <input type="checkbox" checked={c.limparSenha} onChange={(e) => set('limparSenha', e.target.checked)} /> Remover a senha cadastrada
        </label>
      )}
      <div className="rel-field mt-3">
        <label className="rel-label">Observação</label>
        <textarea value={c.observacao} onChange={(e) => set('observacao', e.target.value)} rows={2} className="rel-input" />
      </div>
    </div>
  );
}

function BlocoContato({ p, onChange, onRemove }: { p: ContatoTeams; onChange: (p: ContatoTeams) => void; onRemove: () => void }) {
  const set = <K extends keyof ContatoTeams>(k: K, v: ContatoTeams[K]) => onChange({ ...p, [k]: v });
  return (
    <div className="rel-item">
      <div className="mb-3 flex justify-end">
        <button type="button" onClick={onRemove} className="rel-btn rel-btn-icon" aria-label="Remover contato"><Trash2 className="h-4 w-4" /></button>
      </div>
      <div className="rel-grid rel-grid-s2">
        <Campo rotulo="Nome" valor={p.nome} onChange={(v) => set('nome', v)} obrigatorio />
        <Campo rotulo="E-mail do Teams" valor={p.teams} onChange={(v) => set('teams', v)} placeholder="nome@empresa.com.br" />
        <div className="rel-field">
          <label className="rel-label">Perfil (opcional)</label>
          <select value={p.perfil} onChange={(e) => set('perfil', e.target.value as PerfilContato)} className="rel-input">
            <option value="">Sem perfil</option>
            {PERFIS_CONTATO.map((x) => <option key={x} value={x}>{ROTULO_PERFIL[x]}</option>)}
          </select>
        </div>
        <Campo rotulo="Cargo (opcional)" valor={p.cargo} onChange={(v) => set('cargo', v)} />
        <Campo rotulo="Telefone (opcional)" valor={p.telefone} onChange={(v) => set('telefone', v)} />
        <Campo rotulo="Observação (opcional)" valor={p.observacao} onChange={(v) => set('observacao', v)} />
      </div>
    </div>
  );
}

export default function FormularioCliente({ inicial, salvando, onSalvar, onCancelar }: { inicial: ClienteConexao; salvando: boolean; onSalvar: (c: ClienteConexao) => void; onCancelar: () => void }) {
  const [c, setC] = useState<ClienteConexao>(inicial);
  const [erro, setErro] = useState('');
  const [novoTipo, setNovoTipo] = useState<TipoConexao>('anydesk');
  const set = <K extends keyof ClienteConexao>(k: K, v: ClienteConexao[K]) => setC((a) => ({ ...a, [k]: v }));

  const salvar = () => {
    const problema = validaCliente(c);
    if (problema) {
      setErro(problema);
      return;
    }
    setErro('');
    onSalvar(c);
  };

  return (
    <TelaDetalhe
      onVoltar={() => !salvando && onCancelar()}
      rotuloVoltar="Voltar"
      cabecalho={
        <div>
          <h1 className="rel-strong text-xl">{inicial.id ? 'Editar cliente' : 'Novo cliente'}</h1>
          <p className="rel-desc">Os dados ficam no banco e aparecem para todos os usuários.</p>
        </div>
      }
      rodape={
        <>
          <span className="rel-desc">As senhas são criptografadas no servidor e só aparecem quando alguém clica em mostrar ou copiar (cada consulta é registrada).</span>
          <div className="flex gap-2">
            <button type="button" onClick={onCancelar} disabled={salvando} className="rel-btn rel-btn-ghost">Cancelar</button>
            <button type="button" onClick={salvar} disabled={salvando} className="rel-btn rel-btn-primary">{salvando ? 'Salvando...' : 'Salvar cliente'}</button>
          </div>
        </>
      }
    >
      <>
          {erro && <p className="rel-notice rel-notice-error">{erro}</p>}

          <section className="rel-box">
            <h3 className="rel-subtitle">Dados do cliente</h3>
            <div className="rel-grid rel-grid-s2">
              <Campo rotulo="Nome do cliente" valor={c.nome} onChange={(v) => set('nome', v)} obrigatorio />
              <Campo rotulo="Código (opcional)" valor={c.codigo} onChange={(v) => set('codigo', v)} />
              <Campo rotulo="Cidade/UF (opcional)" valor={c.cidadeUf} onChange={(v) => set('cidadeUf', v)} />
              <div className="rel-field">
                <label className="rel-label">Situação</label>
                <select value={c.status} onChange={(e) => set('status', e.target.value as ClienteConexao['status'])} className="rel-input">
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </div>
            </div>
            <div className="rel-field mt-3">
              <label className="rel-label">Descrição / observações (opcional)</label>
              <textarea value={c.descricao} onChange={(e) => set('descricao', e.target.value)} rows={3} className="rel-input" />
            </div>
          </section>

          <section className="rel-box">
            <div className="rel-section-head">
              <h3 className="rel-subtitle">Conexões (opcional)</h3>
              <div className="flex items-center gap-2">
                <select value={novoTipo} onChange={(e) => setNovoTipo(e.target.value as TipoConexao)} className="rel-input" style={{ width: 'auto' }} aria-label="Tipo de conexão">
                  {TIPOS_CONEXAO.map((t) => <option key={t} value={t}>{ROTULO_TIPO_CONEXAO[t]}</option>)}
                </select>
                <button type="button" onClick={() => set('conexoes', [...c.conexoes, novaConexao(novoTipo)])} className="rel-btn rel-btn-outline rel-btn-sm"><Plus className="h-4 w-4" /> Adicionar</button>
              </div>
            </div>
            <div className="rel-list">
              {c.conexoes.map((x) => (
                <BlocoConexao key={x.id} c={x} onChange={(n) => set('conexoes', c.conexoes.map((y) => (y.id === x.id ? n : y)))} onRemove={() => set('conexoes', c.conexoes.filter((y) => y.id !== x.id))} />
              ))}
              {!c.conexoes.length && <p className="rel-desc">Nenhuma conexão cadastrada. Escolha o tipo (AnyDesk, TeamViewer, Terminal Service ou VPN) e clique em Adicionar.</p>}
            </div>
          </section>

          <section className="rel-box">
            <div className="rel-section-head">
              <h3 className="rel-subtitle">Contatos do Teams (opcional)</h3>
              <button type="button" onClick={() => set('contatos', [...c.contatos, novoContato()])} className="rel-btn rel-btn-outline rel-btn-sm"><Plus className="h-4 w-4" /> Adicionar contato</button>
            </div>
            <div className="rel-list">
              {c.contatos.map((p) => (
                <BlocoContato key={p.id} p={p} onChange={(n) => set('contatos', c.contatos.map((y) => (y.id === p.id ? n : y)))} onRemove={() => set('contatos', c.contatos.filter((y) => y.id !== p.id))} />
              ))}
              {!c.contatos.length && <p className="rel-desc">Nenhum contato cadastrado. O perfil (técnica, regra de negócio ou gerente) é opcional.</p>}
            </div>
          </section>
      </>
    </TelaDetalhe>
  );
}
