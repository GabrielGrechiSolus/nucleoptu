'use client';

import { useState } from 'react';
import { Download, ExternalLink, Paperclip } from 'lucide-react';
import { baixaAnexoRelatus } from './relatusApi';
import { consultaSalva, obtemAnexosDaMensagem } from './relatusCache';
import { AnexoRelatus, DetalheRelatus, MensagemRelatus, TIPOS_MENSAGEM, formataData } from './relatusDados';

const MENSAGENS_INICIAIS = 5;

function ListaAnexos({ numero, mensagem, anexos }: { numero: string; mensagem?: string; anexos: AnexoRelatus[] }) {
  const [baixando, setBaixando] = useState('');
  const [erro, setErro] = useState('');

  const baixar = async (anexo: AnexoRelatus) => {
    setBaixando(anexo.id);
    setErro('');
    try {
      await baixaAnexoRelatus({ numero, ...(mensagem ? { mensagem } : {}), anexo: anexo.id }, anexo.nome);
    } catch (e) {
      setErro(`${anexo.nome}: ${(e as Error).message}`);
    } finally {
      setBaixando('');
    }
  };

  return <div className="space-y-2">
    <ul className="flex flex-wrap gap-2">
      {anexos.map((a) => <li key={a.id} className="max-w-full">
        <button type="button" onClick={() => void baixar(a)} disabled={baixando === a.id} className="rel-btn max-w-full">
          <Download size={14} className="shrink-0" />
          <span className="truncate">{a.nome}</span>
          <span className="rel-desc shrink-0">
            {[a.tamanhoKb === undefined ? '' : `${a.tamanhoKb} KB`, a.data ? formataData(a.data) : '', a.chamadoPai ? `chamado ${a.chamadoPai}` : ''].filter(Boolean).join(' · ')}
          </span>
        </button>
      </li>)}
    </ul>
    {erro && <p role="status" className="rel-notice rel-notice-error">{erro}</p>}
  </div>;
}

function Mensagem({ numero, mensagem }: { numero: string; mensagem: MensagemRelatus }) {
  const [anexos, setAnexos] = useState<AnexoRelatus[] | null>(() => consultaSalva(numero)?.anexosMensagem[mensagem.id] ?? null);
  const [aviso, setAviso] = useState('');

  const verAnexos = async () => {
    setAviso('Carregando anexos…');
    try {
      const lista = await obtemAnexosDaMensagem(numero, mensagem.id);
      setAnexos(lista);
      setAviso(lista.length ? '' : 'Nenhum anexo.');
    } catch (e) {
      setAviso((e as Error).message);
    }
  };

  return <li className="rel-box-flat space-y-2">
    <span className="rel-label">{[TIPOS_MENSAGEM[mensagem.tipo] ?? mensagem.tipo, mensagem.autor, formataData(mensagem.data)].filter(Boolean).join(' · ')}</span>
    {mensagem.titulo && <p className="rel-value">{mensagem.titulo}</p>}
    {mensagem.texto && <p className="whitespace-pre-wrap break-words text-sm">{mensagem.texto}</p>}
    {mensagem.temAnexo && !anexos && <button type="button" onClick={() => void verAnexos()} className="rel-btn"><Paperclip size={14} />Ver anexos</button>}
    {anexos && <ListaAnexos numero={numero} mensagem={mensagem.id} anexos={anexos} />}
    {aviso && <p role="status" className="rel-desc">{aviso}</p>}
  </li>;
}

export default function RelatusDetalhes({ dados }: { dados: DetalheRelatus }) {
  const [todas, setTodas] = useState(false);
  const numero = dados.numero ?? '';
  const visiveis = todas ? dados.mensagens : dados.mensagens.slice(0, MENSAGENS_INICIAIS);
  const ocultas = dados.mensagens.length - visiveis.length;

  return <div className="space-y-4">
    {dados.falhas.length > 0 && <p role="status" className="rel-notice rel-notice-alert">O Relatus não devolveu: {dados.falhas.join(', ')}.</p>}
    {dados.descricao && <div className="space-y-2">
      <h4 className="rel-subtitle">Descritivo</h4>
      <p className="rel-box-flat whitespace-pre-wrap break-words text-sm">{dados.descricao}</p>
    </div>}
    <div className="space-y-2">
      <h4 className="rel-subtitle">Anexos ({dados.anexos.length})</h4>
      {dados.anexos.length ? <ListaAnexos numero={numero} anexos={dados.anexos} /> : <p className="rel-desc">{dados.falhas.includes('anexos') ? 'Não carregados.' : 'Nenhum anexo.'}</p>}
    </div>
    {dados.documentos.length > 0 && <div className="space-y-2">
      <h4 className="rel-subtitle">Documentos Google ({dados.documentos.length})</h4>
      <ul className="flex flex-wrap gap-2">
        {dados.documentos.map((d) => <li key={d.url}><a href={d.url} target="_blank" rel="noopener noreferrer" className="rel-btn">{d.nome}<ExternalLink size={14} /></a></li>)}
      </ul>
    </div>}
    <div className="space-y-2">
      <h4 className="rel-subtitle">Mensagens ({dados.mensagens.length})</h4>
      <ul className="space-y-2">
        {visiveis.map((m, i) => <Mensagem key={`${numero}-${m.id || i}`} numero={numero} mensagem={m} />)}
      </ul>
      {ocultas > 0 && <button type="button" onClick={() => setTodas(true)} className="rel-btn">Ver mais {ocultas} mensagens</button>}
    </div>
  </div>;
}
