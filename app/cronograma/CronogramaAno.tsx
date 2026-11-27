'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { consultaRelatus } from '../chamados/relatusApi';
import { criaConsultaSalva } from '../chamados/dadosSalvos';
import { formataData } from '../chamados/relatusDados';
import { Cronograma, EventoCronograma, MARCAS, montaMeses } from './dados';

const VALIDADE_MS = 30 * 60_000;
const SEMANA = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];

const consulta = criaConsultaSalva<Cronograma>({
  nome: 'cronograma',
  validade: (c) => (c.ano < new Date().getFullYear() ? Infinity : VALIDADE_MS),
  persiste: true,
  maximo: 4,
});

const situacaoDe = (e: EventoCronograma) => (e.situacao === 'C' ? 'Confirmado' : e.situacao === 'R' ? 'Reservado' : '');
const periodoDe = (e: EventoCronograma) => (e.inicio === e.fim ? formataData(e.inicio) : `${formataData(e.inicio)} a ${formataData(e.fim)}`);

export default function CronogramaAno({ anoInicial, hoje }: { anoInicial: number; hoje: string }) {
  const [ano, setAno] = useState(anoInicial);
  const [dados, setDados] = useState<Cronograma | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [comFeriados, setComFeriados] = useState(true);
  const [comProjetos, setComProjetos] = useState(true);
  const [escolhido, setEscolhido] = useState('');

  const carrega = useCallback(async (alvo: number, atualizar = false) => {
    setCarregando(true);
    setErro('');
    try {
      setDados(await consulta.obtem(String(alvo), () => consultaRelatus<Cronograma>('cronograma', { ano: String(alvo) }), atualizar));
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carrega(ano);
  }, [ano, carrega]);

  const atual = dados?.ano === ano ? dados : null;
  const meses = useMemo(() => montaMeses(ano), [ano]);
  const eventos = useMemo(() => (atual?.eventos ?? []).filter((e) => comProjetos || !e.projeto), [atual, comProjetos]);
  const feriadoDe = (data: string) => (comFeriados ? atual?.feriados[data] : undefined);
  const eventosDe = (data: string) => eventos.filter((e) => e.inicio <= data && data <= e.fim).sort((a, b) => Number(a.projeto) - Number(b.projeto));
  const detalhes = escolhido ? eventosDe(escolhido) : [];
  const salvoEm = atual ? consulta.salvoEm(String(ano)) : undefined;

  const muda = (alvo: number) => {
    setEscolhido('');
    setAno(alvo);
  };

  return (
    <section className="rel-box space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => muda(Number(hoje.slice(0, 4)))} className="rel-btn rel-btn-sm rel-btn-outline">Hoje</button>
        <button type="button" onClick={() => muda(ano - 1)} aria-label="Ano anterior" className="rel-btn rel-btn-sm rel-btn-ghost"><ChevronLeft size={15} /></button>
        <button type="button" onClick={() => muda(ano + 1)} aria-label="Próximo ano" className="rel-btn rel-btn-sm rel-btn-ghost"><ChevronRight size={15} /></button>
        <strong className="rel-strong text-lg">{ano}</strong>
        <span className="rel-tag rel-tag-info">Somente leitura</span>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <label className="rel-value flex items-center gap-1"><input type="checkbox" checked={comFeriados} onChange={(e) => setComFeriados(e.target.checked)} />Feriados</label>
          <label className="rel-value flex items-center gap-1"><input type="checkbox" checked={comProjetos} onChange={(e) => setComProjetos(e.target.checked)} />Projetos</label>
          <button type="button" onClick={() => void carrega(ano, true)} disabled={carregando} className="rel-btn rel-btn-sm rel-btn-outline"><RefreshCw size={13} className={carregando ? 'animate-spin' : ''} />Atualizar</button>
        </div>
      </div>

      {atual && (
        <div className="rel-destaque flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="rel-strong">{atual.colaborador.nome}</span>
          {atual.colaborador.equipe && <span className="rel-tag rel-tag-info">{atual.colaborador.equipe}</span>}
          {salvoEm && <span className="rel-desc">Consulta salva em {new Date(salvoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>}
        </div>
      )}
      {erro && <p role="status" className="rel-notice rel-notice-alert">{erro}</p>}
      {carregando && !atual && <p className="rel-desc">Consultando o cronograma…</p>}

      {atual && (
        <>
          <div className="cron-meses">
            {meses.map((mes) => (
              <div key={mes.nome} className="rel-box-flat cron-mes">
                <h3 className="rel-secao-titulo">{mes.nome}</h3>
                <div className="cron-grade">
                  {SEMANA.map((s) => <span key={s} className="cron-semana">{s}</span>)}
                  {Array.from({ length: mes.vazios }, (_, i) => <span key={`v${i}`} />)}
                  {mes.dias.map((d) => {
                    const doDia = eventosDe(d.data);
                    const principal = doDia[0];
                    const feriado = feriadoDe(d.data);
                    const descricao = [feriado ? `Feriado: ${feriado}` : '', ...doDia.map((e) => [e.descricao, e.horario, situacaoDe(e)].filter(Boolean).join(' · '))].filter(Boolean).join('; ');
                    const classes = [
                      'cron-dia',
                      d.fimDeSemana ? 'cron-dia-fds' : '',
                      d.data < hoje && !principal ? 'cron-dia-passado' : '',
                      feriado ? 'cron-dia-feriado' : '',
                      principal?.projeto ? 'cron-dia-projeto' : '',
                      principal?.situacao === 'C' ? 'cron-dia-confirmado' : '',
                      principal?.situacao === 'R' ? 'cron-dia-reservado' : '',
                      d.data === hoje ? 'cron-dia-hoje' : '',
                      d.data === escolhido ? 'cron-dia-escolhido' : '',
                    ].filter(Boolean).join(' ');
                    const estilo = principal?.fundo ? { background: principal.fundo, color: principal.texto } : undefined;
                    return descricao ? (
                      <button key={d.data} type="button" onClick={() => setEscolhido(d.data)} className={classes} style={estilo} title={descricao} aria-label={`${formataData(d.data)}: ${descricao}`}>{d.numero}</button>
                    ) : <span key={d.data} className={classes}>{d.numero}</span>;
                  })}
                </div>
              </div>
            ))}
          </div>

          {escolhido && (
            <div className="space-y-2" aria-live="polite">
              <h3 className="rel-secao-titulo">{formataData(escolhido)}</h3>
              {feriadoDe(escolhido) && <p className="rel-notice rel-notice-error">Feriado: {feriadoDe(escolhido)}</p>}
              {detalhes.map((e) => (
                <div key={e.id} className="rel-box-flat space-y-1" style={e.fundo ? { borderLeft: `4px solid ${e.fundo}` } : undefined}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rel-strong">{e.descricao || '-'}</span>
                    {e.projeto && <span className="rel-tag">Fase de projeto</span>}
                    {situacaoDe(e) && <span className={`rel-tag ${e.situacao === 'C' ? 'rel-tag-ok' : 'rel-tag-alert'}`}>{situacaoDe(e)}</span>}
                    {e.marcas.map((m) => <span key={m} className="rel-tag">{MARCAS[m].simbolo} {MARCAS[m].rotulo}</span>)}
                  </div>
                  <p className="rel-desc">{[periodoDe(e), e.horario].filter(Boolean).join(' · ')}</p>
                  {e.observacao && <p className="rel-value whitespace-pre-wrap break-words">{e.observacao}</p>}
                </div>
              ))}
            </div>
          )}

          <div className="rel-desc flex flex-wrap gap-x-4 gap-y-1">
            <span>Dia sublinhado: confirmado</span>
            <span><em>Itálico</em>: reservado</span>
            <span>Tracejado: fase de projeto</span>
            <span className="cron-dia-feriado">Vermelho: feriado</span>
            {Object.values(MARCAS).map((m) => <span key={m.rotulo}>{m.simbolo} {m.rotulo}</span>)}
          </div>
        </>
      )}
    </section>
  );
}
