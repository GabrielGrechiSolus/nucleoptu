'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { tokenDoLogin } from './atualizaGit';

interface LinhaRelatus {
  idChamadoPreSprint: number;
  idChamado: number;
  nomeAnalista: string;
  tituloChamado: string;
  origemChamado: string;
  razaoCliente: string;
  HoraEstimada?: number;
  observacao?: string;
  preSprint: string;
}

interface DadosRelatus {
  atendimento: { idAtendimento: number; titulo: string; idCliente: number; razaoCliente: string; tipo: string };
  vinculos: LinhaRelatus[];
}

export default function RelatusPanel({ chamadoInicial }: { chamadoInicial: string }) {
  const [numero, setNumero] = useState(chamadoInicial.replace(/\D/g, ''));
  const [dados, setDados] = useState<DadosRelatus | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const consultar = async (valor: string) => {
    const chamado = valor.replace(/\D/g, '');
    if (!/^\d{5,12}$/.test(chamado)) {
      setErro('Digite um número de chamado válido, com 5 a 12 dígitos.');
      setDados(null);
      return;
    }
    setNumero(chamado);
    setErro('');
    setDados(null);
    setCarregando(true);
    try {
      const token = await tokenDoLogin();
      const resposta = await fetch(`/api/relatus/chamado?numero=${encodeURIComponent(chamado)}`, { headers: { Authorization: `Bearer ${token}` } });
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro ?? 'Não foi possível consultar esse chamado.');
      setDados(resultado as DadosRelatus);
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
      <p className="rel-desc">Busca pelo número do chamado; a API só retorna vínculos associados ao nome do seu perfil no Nucléo PTU.</p>
    </div>
    <form onSubmit={enviar} className="flex flex-wrap items-end gap-2">
      <label className="rel-field min-w-[220px] flex-1"><span className="rel-label">Número do chamado</span><input value={numero} onChange={(e) => setNumero(e.target.value.replace(/[^\d.\-]/g, ''))} inputMode="numeric" placeholder="Ex.: 568036" className="rel-input" /></label>
      <button type="submit" disabled={carregando} className="rel-btn rel-btn-primary"><Search size={15}/>{carregando ? 'Consultando…' : 'Buscar no Relatus'}</button>
    </form>
    {erro && <div role="status" className="rel-notice rel-notice-alert">{erro}</div>}
    {carregando && <p className="rel-desc">Consultando o chamado e conferindo o vínculo do analista…</p>}
    {dados && <div className="space-y-3">
      <div className="rel-grid rel-grid-2">
        <div className="rel-box-flat"><span className="rel-label">Atendimento</span><p className="rel-value">{dados.atendimento.idAtendimento} · {dados.atendimento.titulo}</p></div>
        <div className="rel-box-flat"><span className="rel-label">Cliente</span><p className="rel-value">{dados.atendimento.razaoCliente || dados.vinculos[0]?.razaoCliente || '-'}</p></div>
        <div className="rel-box-flat"><span className="rel-label">Tipo</span><p className="rel-value">{dados.atendimento.tipo || '-'}</p></div>
      </div>
      <div className="overflow-x-auto rounded-lg border border-[var(--rel-line)]">
        <table className="w-full text-left text-sm"><thead><tr className="border-b border-[var(--rel-line)] text-[var(--rel-muted)]"><th className="px-3 py-2">Analista</th><th className="px-3 py-2">Pré-sprint</th><th className="px-3 py-2">Origem</th><th className="px-3 py-2">Horas</th><th className="px-3 py-2">Observação</th></tr></thead><tbody>
          {dados.vinculos.map((v) => <tr key={v.idChamadoPreSprint} className="border-b border-[var(--rel-line)] last:border-0"><td className="px-3 py-2 font-medium">{v.nomeAnalista}</td><td className="px-3 py-2">{v.preSprint}</td><td className="px-3 py-2">{v.origemChamado || '-'}</td><td className="px-3 py-2">{v.HoraEstimada ?? '-'}</td><td className="px-3 py-2">{v.observacao || '-'}</td></tr>)}
        </tbody></table>
      </div>
      <p className="rel-desc">{dados.vinculos.length} vínculo(s) encontrado(s) no Relatus.</p>
    </div>}
  </section>;
}
