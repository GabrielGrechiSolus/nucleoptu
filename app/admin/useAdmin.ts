'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { chamaApi } from './api';

export interface EstadoAdmin {
  admin: boolean;
  configurado: boolean;
  carregado: boolean;
}

// Pergunta ao servidor se quem está logado é administrador (mostra o menu de administração).
export function useAdmin(): EstadoAdmin {
  const { user } = useAuth();
  const [estado, setEstado] = useState<EstadoAdmin>({ admin: false, configurado: false, carregado: false });

  useEffect(() => {
    if (!user) return;
    let ativo = true;
    chamaApi<{ admin?: boolean; configurado?: boolean }>('/api/admin/eu')
      .then((r) => ativo && setEstado({ admin: !!r.dados.admin, configurado: !!r.dados.configurado, carregado: true }))
      .catch(() => ativo && setEstado({ admin: false, configurado: false, carregado: true }));
    return () => {
      ativo = false;
    };
  }, [user]);

  return estado;
}
