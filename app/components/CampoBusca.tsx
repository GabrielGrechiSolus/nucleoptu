'use client';

import { Search, X } from 'lucide-react';

interface Props {
  valor: string;
  onChange: (valor: string) => void;
  placeholder: string;
  rotulo?: string;
}

export default function CampoBusca({ valor, onChange, placeholder, rotulo }: Props) {
  return (
    <div className="rel-busca">
      <Search className="rel-busca-icone" aria-hidden="true" />
      <input value={valor} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={rotulo} autoComplete="off" className="rel-input" />
      {valor && (
        <button type="button" onClick={() => onChange('')} aria-label="Apagar busca" className="rel-busca-limpar">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
