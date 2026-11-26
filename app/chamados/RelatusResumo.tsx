import { CalendarClock, ClipboardList } from 'lucide-react';
import { classeDaEtiqueta, corDaPrioridade, corDoStatus } from './relatusCores';
import { AtendimentoRelatus, CAMPOS_RELATUS, formataData } from './relatusDados';

const EM_ETIQUETA = ['status', 'situacao', 'prioridade'];
const PRAZOS = ['dataAbertura', 'previsaoInicio', 'previsaoConclusao', 'dataConclusao', 'horasOrcadas', 'horasAprovadas', 'horasRealizadas'];

function Campos({ dados, prazos }: { dados: AtendimentoRelatus; prazos: boolean }) {
  const campos = CAMPOS_RELATUS.filter((c) => !EM_ETIQUETA.includes(c.id) && PRAZOS.includes(c.id) === prazos && dados[c.id]);
  if (!campos.length) return null;
  const Icone = prazos ? CalendarClock : ClipboardList;
  return (
    <section className="rel-box-flat">
      <h4 className="rel-secao-titulo mb-3"><Icone size={15} />{prazos ? 'Prazos e horas' : 'Atendimento'}</h4>
      <dl className="rel-grid rel-grid-s2">
        {campos.map((campo) => {
          const valor = dados[campo.id] as string;
          return (
            <div key={campo.id} className="rel-field">
              <dt className="rel-label">{campo.rotulo}</dt>
              <dd className="rel-value rel-strong">{'data' in campo ? formataData(valor) : valor}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

export default function RelatusResumo({ dados }: { dados: AtendimentoRelatus }) {
  return (
    <div className="space-y-3">
      <div className="rel-destaque">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rel-mono rel-strong">{dados.numero}</span>
          {dados.status && <span className={classeDaEtiqueta(corDoStatus(dados.status))}>{dados.status}</span>}
          {dados.situacao && dados.situacao !== dados.status && <span className={classeDaEtiqueta(corDoStatus(dados.situacao))}>{dados.situacao}</span>}
          {dados.prioridade && <span className={classeDaEtiqueta(corDaPrioridade(dados.prioridade))}>Prioridade: {dados.prioridade}</span>}
        </div>
        <p className="rel-strong mt-1 break-words">{dados.titulo ?? '-'}</p>
      </div>
      <div className="rel-grid rel-grid-2">
        <Campos dados={dados} prazos={false} />
        <Campos dados={dados} prazos />
      </div>
    </div>
  );
}
