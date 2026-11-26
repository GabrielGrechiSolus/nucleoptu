'use client';

import { RefreshCw } from 'lucide-react';

export default function BotaoAtualizarDados({ carregando, onAtualizar }: { carregando: boolean; onAtualizar: () => void }) {
  return (
    <button type="button" onClick={onAtualizar} disabled={carregando} className="rel-btn rel-btn-ghost rel-btn-sm" title="Os dados ficam salvos por alguns minutos entre as telas. Clique para ler de novo agora.">
      <RefreshCw size={13} className={carregando ? 'animate-spin' : ''} />Atualizar dados
    </button>
  );
}
