'use client';

import { FormEvent, useEffect, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import RelatusDetalhes from './RelatusDetalhes';
import { ConsultaSalva, consultaSalva, obtemRelatus } from './relatusCache';
import { CAMPOS_RELATUS, formataData } from './relatusDados';

export default function RelatusPanel({ chamadoInicial }: { chamadoInicial: string }) {
  const [numero, setNumero] = useState(chamadoInicial.replace(/\D/g, ''));
  const [consulta, setConsulta] = useState<ConsultaSalva | null>(null);
  const dados = consulta?.dados;
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const consultar = async (valor: string, atualizar = false) => {
    const chamado = valor.replace(/\D/g, '');
    if (!/^\d{5,12}$/.test(chamado)) {
      setErro('Digite um número de chamado válido, com 5 a 12 dígitos.');
      setConsulta(null);
      return;
    }
    setNumero(chamado);
    setErro('');
    setConsulta(consultaSalva(chamado));
    setCarregando(true);
    try {
      setConsulta(await obtemRelatus(chamado, atualizar));
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível consultar o Relatus.');
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    if (chamadoInicial) void consultar(chamadoInicial);
    // A consulta inicial acompanha o contexto aberto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chamadoInicial]);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    void consultar(numero);
  };

  return <section className="space-y-4">
    <div>
      <h3 className="rel-subtitle">Consulta de chamados no Web Relatus</h3>
      <p className="rel-desc">Busca o chamado pelo número no Web Relatus.</p>
    </div>
    <form onSubmit={enviar} className="flex flex-wrap items-end gap-2">
      <label className="rel-field min-w-[220px] flex-1"><span className="rel-label">Número do chamado</span><input value={numero} onChange={(e) => setNumero(e.target.value.replace(/[^\d.\-]/g, ''))} inputMode="numeric" placeholder="Ex.: 568036" className="rel-input" /></label>
      <button type="submit" disabled={carregando} className="rel-btn rel-btn-primary"><Search size={15}/>{carregando ? 'Consultando…' : 'Buscar no Relatus'}</button>
    </form>
    {erro && <div role="status" className="rel-notice rel-notice-alert">{erro}</div>}
    {carregando && <p className="rel-desc">Consultando o chamado…</p>}
    {consulta && dados && <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rel-desc">Consulta salva em {new Date(consulta.salvoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
        <button type="button" onClick={() => void consultar(dados.numero ?? numero, true)} disabled={carregando} className="rel-btn rel-btn-sm"><RefreshCw size={13} />Atualizar</button>
      </div>
      <div className="rel-box-flat"><span className="rel-label">Atendimento</span><p className="rel-value">{dados.numero} · {dados.titulo ?? '-'}</p></div>
      <div className="rel-grid rel-grid-2">
        {CAMPOS_RELATUS.map((campo) => {
          const valor = dados[campo.id];
          return valor ? <div key={campo.id} className="rel-box-flat"><span className="rel-label">{campo.rotulo}</span><p className="rel-value">{'data' in campo ? formataData(valor) : valor}</p></div> : null;
        })}
      </div>
      <RelatusDetalhes key={dados.numero} dados={dados} />
    </div>}
  </section>;
}
