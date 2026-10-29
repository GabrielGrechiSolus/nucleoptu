'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../AuthContext';

export interface PessoaLogada {
  uid: string;
  email: string;
  nome: string;
  gitUser: string;
  carregado: boolean;
}

// Usuário logado com o usuário Git cadastrado no perfil (profiles/{uid}.gitUser).
export function usePessoa(): PessoaLogada {
  const { user } = useAuth();
  const [gitUser, setGitUser] = useState('');
  const [nomePerfil, setNomePerfil] = useState('');
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    if (!user) return;
    let ativo = true;
    getDoc(doc(db, 'profiles', user.uid))
      .then((snap) => {
        if (!ativo) return;
        const d = snap.exists() ? snap.data() : {};
        setGitUser(String(d?.gitUser ?? ''));
        setNomePerfil(String(d?.name ?? d?.displayName ?? ''));
      })
      .catch((e) => console.error('Erro ao carregar o perfil:', e))
      .finally(() => ativo && setCarregado(true));
    return () => {
      ativo = false;
    };
  }, [user]);

  return {
    uid: user?.uid ?? '',
    email: user?.email ?? '',
    nome: nomePerfil || user?.displayName || (user?.email ?? '').split('@')[0],
    gitUser,
    carregado,
  };
}
