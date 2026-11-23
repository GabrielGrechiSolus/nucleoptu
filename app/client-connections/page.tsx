'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Network, Plus, Search, Upload } from 'lucide-react';
import { toast } from 'react-toastify';
import withAuth from '../components/withAuth';
import Link from 'next/link';
import { useDetalheNaUrl, useParametrosUrl } from '../components/TelaDetalhe';
import { SortTh, sortRows, useSort } from '../components/SortableTable';
import { excluiCliente, listaClientes, salvaCliente } from './api';
import DetalheCliente from './DetalheCliente';
import FormularioCliente from './FormularioCliente';
import { FILTROS_CLIENTES_INICIAIS, PERFIS_CONTATO, ROTULO_PERFIL, ROTULO_TIPO_CONEXAO, TIPOS_CONEXAO, filtraClientes, migraDadosLocais, novoCliente, previaImportacao, resumoConexoes, type ClienteConexao, type FiltrosClientes, type PerfilContato, type TipoConexao } from './modelo';

const CHAVE_LOCAL = 'client_connections';

const dataBr = (iso: string) => {
  const d = new Date(iso);
  return iso && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR') : '—';
};

function ConexoesClientesPage() {
  const [clientes, setClientes] = useState<ClienteConexao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [filtros, setFiltros] = useState<FiltrosClientes>(FILTROS_CLIENTES_INICIAIS);
  const urlCliente = useDetalheNaUrl('cliente');
  const urlEditar = useDetalheNaUrl('editar');
  const nav = useParametrosUrl();
  const [salvando, setSalvando] = useState(false);
  const [locais, setLocais] = useState(0);
  const [importando, setImportando] = useState(false);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const { sort, toggleSort } = useSort({ key: 'nome', dir: 'asc' });

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      setClientes(await listaClientes());
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
    try {
      const bruto = localStorage.getItem(CHAVE_LOCAL);
      setLocais(bruto ? migraDadosLocais(JSON.parse(bruto)).length : 0);
    } catch {
      setLocais(0);
    }
  }, [carregar]);

  const aberto = useMemo(() => clientes.find((c) => c.id === urlCliente.valor) ?? null, [clientes, urlCliente.valor]);
  const editando = useMemo(() => (urlEditar.valor === 'novo' ? novoCliente() : urlEditar.valor ? clientes.find((c) => c.id === urlEditar.valor) ?? null : null), [clientes, urlEditar.valor]);

  const lista = useMemo(
    () =>
      sortRows(filtraClientes(clientes, filtros), sort, {
        nome: (c) => c.nome,
        codigo: (c) => c.codigo,
        conexoes: (c) => c.conexoes.length,
        contatos: (c) => c.contatos.length,
        status: (c) => c.status,
        atualizado: (c) => Date.parse(c.atualizadoEm || c.criadoEm || ''),
      }),
    [clientes, filtros, sort],
  );

  const salvar = async (c: ClienteConexao) => {
    setSalvando(true);
    try {
      const salvo = await salvaCliente({ ...c, nome: c.nome.trim() });
      toast.success('Cliente salvo.');
      await carregar();
      nav.vaiPara({ editar: null, cliente: salvo.id }, true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async (c: ClienteConexao) => {
    if (!window.confirm(`Excluir o cliente "${c.nome}" e todas as suas conexões e contatos? Esta ação não pode ser desfeita.`)) return;
    try {
      await excluiCliente(c.id);
      toast.success('Cliente excluído.');
      await carregar();
      nav.vaiPara({ cliente: null, editar: null }, true);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const importarLocais = async () => {
    try {
      const migrados = migraDadosLocais(JSON.parse(localStorage.getItem(CHAVE_LOCAL) ?? '[]'));
      const existentes = new Set(clientes.map((c) => c.nome.trim().toLowerCase()));
      const novos = migrados.filter((m) => !existentes.has(m.nome.toLowerCase()));
      for (const m of novos) await salvaCliente({ ...m, id: '' });
      toast.success(`${novos.length} cliente(s) importado(s); ${migrados.length - novos.length} já existiam.`);
      await carregar();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const importarArquivo = async (arquivo: File) => {
    let bruto: unknown;
    try {
      bruto = JSON.parse(await arquivo.text());
    } catch {
      toast.error('O arquivo não é um JSON válido.');
      return;
    }
    const previa = previaImportacao(bruto, clientes);
    if (!previa.novos.length) {
      toast.info(`Nada a importar: ${previa.repetidos.length} já cadastrado(s)${previa.invalidos ? `, ${previa.invalidos} inválido(s)` : ''}.`);
      return;
    }
    const resumo = `Importar ${previa.novos.length} cliente(s) novo(s), com ${previa.conexoes} conexão(ões) (${previa.comSenha} com senha)?

${previa.repetidos.length} já cadastrado(s) serão mantidos sem alteração${previa.invalidos ? ` e ${previa.invalidos} inválido(s) serão ignorados` : ''}. As senhas são criptografadas no servidor.`;
    if (!window.confirm(resumo)) return;
    setImportando(true);
    let gravados = 0;
    const falhas: string[] = [];
    for (const c of previa.novos) {
      try {
        await salvaCliente(c);
        gravados++;
      } catch (e) {
        falhas.push(`${c.nome}: ${(e as Error).message}`);
      }
    }
    setImportando(false);
    await carregar();
    if (gravados) toast.success(`${gravados} cliente(s) importado(s).`);
    if (falhas.length) toast.error(`${falhas.length} falha(s): ${falhas.slice(0, 3).join(' | ')}`);
  };

  const altera = <K extends keyof FiltrosClientes>(k: K, v: FiltrosClientes[K]) => setFiltros((a) => ({ ...a, [k]: v }));

  if ((urlCliente.valor || urlEditar.valor) && carregando) return <p className="rel-desc">Carregando...</p>;

  if (editando) {
    return <FormularioCliente key={editando.id || 'novo'} inicial={editando} salvando={salvando} onSalvar={salvar} onCancelar={urlEditar.voltar} />;
  }

  if (aberto) {
    return <DetalheCliente c={aberto} onVoltar={urlCliente.voltar} onEditar={() => urlEditar.abrir(aberto.id)} onExcluir={() => excluir(aberto)} />;
  }

  return (
    <div className="rel-page mx-auto max-w-7xl">
      <header className="rel-box flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="rel-title"><Network className="h-5 w-5" /> Conexões de clientes</h1>
          <p className="rel-desc">Clientes, acessos remotos (AnyDesk, TeamViewer, Terminal Service e VPN) e contatos do Teams. Os dados ficam no banco e valem para todos os usuários.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={arquivoRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              e.target.value = '';
              if (arquivo) importarArquivo(arquivo);
            }}
          />
          <button type="button" onClick={() => arquivoRef.current?.click()} disabled={importando} className="rel-btn rel-btn-outline"><Upload className="h-4 w-4" /> {importando ? 'Importando...' : 'Importar arquivo'}</button>
          <Link href={urlEditar.hrefDe('novo')} className="rel-btn rel-btn-primary"><Plus className="h-4 w-4" /> Novo cliente</Link>
        </div>
      </header>

      {erro && <div className="rel-notice rel-notice-error">{erro}</div>}

      {locais > 0 && (
        <div className="rel-notice rel-notice-alert flex flex-wrap items-center justify-between gap-3">
          <span>Há {locais} cliente(s) salvos só neste navegador, da versão anterior da tela. Importe para o banco para que todos os usuários vejam.</span>
          <button type="button" onClick={importarLocais} className="rel-btn rel-btn-outline rel-btn-sm">Importar para o banco</button>
        </div>
      )}

      <section className="rel-box">
        <div className="rel-filters">
          <label className="rel-field rel-label rel-filter-wide">
            Pesquisar
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4" style={{ color: 'var(--rel-muted)' }} />
              <input value={filtros.busca} onChange={(e) => altera('busca', e.target.value)} placeholder="Cliente, código, ID de acesso, servidor ou contato" className="rel-input pl-8" />
            </div>
          </label>
          <label className="rel-field rel-label">
            Situação
            <select value={filtros.status} onChange={(e) => altera('status', e.target.value as FiltrosClientes['status'])} className="rel-input">
              <option value="">Todas</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>
          </label>
          <label className="rel-field rel-label">
            Tipo de conexão
            <select value={filtros.tipo} onChange={(e) => altera('tipo', e.target.value as '' | TipoConexao)} className="rel-input">
              <option value="">Todos</option>
              {TIPOS_CONEXAO.map((t) => <option key={t} value={t}>{ROTULO_TIPO_CONEXAO[t]}</option>)}
            </select>
          </label>
          <label className="rel-field rel-label">
            Perfil de contato
            <select value={filtros.perfil} onChange={(e) => altera('perfil', e.target.value as '' | PerfilContato)} className="rel-input">
              <option value="">Todos</option>
              {PERFIS_CONTATO.map((p) => <option key={p} value={p}>{ROTULO_PERFIL[p]}</option>)}
            </select>
          </label>
          <div className="rel-filter-actions">
            <button type="button" onClick={() => setFiltros(FILTROS_CLIENTES_INICIAIS)} className="rel-btn rel-btn-ghost">Limpar</button>
          </div>
        </div>
        <p className="rel-desc mt-3">{lista.length} de {clientes.length} cliente(s)</p>
      </section>

      <section className="rel-table-wrap">
        <table className="w-full text-left text-sm">
          <thead className="text-xs">
            <tr>
              <SortTh label="Cliente" k="nome" sort={sort} onSort={toggleSort} />
              <SortTh label="Código" k="codigo" sort={sort} onSort={toggleSort} className="hidden sm:table-cell" />
              <SortTh label="Conexões" k="conexoes" sort={sort} onSort={toggleSort} />
              <SortTh label="Contatos" k="contatos" sort={sort} onSort={toggleSort} className="hidden md:table-cell" />
              <SortTh label="Situação" k="status" sort={sort} onSort={toggleSort} className="hidden md:table-cell" />
              <SortTh label="Atualizado" k="atualizado" sort={sort} onSort={toggleSort} className="hidden lg:table-cell" />
            </tr>
          </thead>
          <tbody>
            {carregando && <tr><td colSpan={6} className="rel-empty">Carregando...</td></tr>}
            {!carregando && !lista.length && <tr><td colSpan={6} className="rel-empty">{clientes.length ? 'Nenhum cliente com esses filtros.' : 'Nenhum cliente cadastrado. Use “Novo cliente”.'}</td></tr>}
            {lista.map((c) => {
              const r = resumoConexoes(c);
              return (
                <tr key={c.id} onClick={() => urlCliente.abrir(c.id)} className="rel-row">
                  <td className="px-3 py-2"><div className="rel-strong"><Link href={urlCliente.hrefDe(c.id)} onClick={(e) => e.stopPropagation()}>{c.nome}</Link></div>{c.cidadeUf && <div className="rel-desc">{c.cidadeUf}</div>}</td>
                  <td className="rel-mono hidden px-3 py-2 sm:table-cell">{c.codigo || '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {TIPOS_CONEXAO.filter((t) => r[t] > 0).map((t) => <span key={t} className="rel-tag rel-tag-info">{ROTULO_TIPO_CONEXAO[t]}{r[t] > 1 ? ` (${r[t]})` : ''}</span>)}
                      {!c.conexoes.length && <span className="rel-desc">—</span>}
                    </div>
                  </td>
                  <td className="hidden px-3 py-2 md:table-cell">
                    <div className="flex flex-wrap gap-1">
                      {c.contatos.length ? <span className="rel-tag">{c.contatos.length} no Teams</span> : <span className="rel-desc">—</span>}
                      {PERFIS_CONTATO.filter((p) => c.contatos.some((x) => x.perfil === p)).map((p) => <span key={p} className="rel-tag rel-tag-ok">{ROTULO_PERFIL[p]}</span>)}
                    </div>
                  </td>
                  <td className="hidden px-3 py-2 md:table-cell"><span className={`rel-tag ${c.status === 'ativo' ? 'rel-tag-ok' : ''}`}>{c.status === 'ativo' ? 'Ativo' : 'Inativo'}</span></td>
                  <td className="hidden whitespace-nowrap px-3 py-2 lg:table-cell">{dataBr(c.atualizadoEm || c.criadoEm)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default withAuth(ConexoesClientesPage);
