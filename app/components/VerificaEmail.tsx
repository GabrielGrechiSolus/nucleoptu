'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { MailCheck } from 'lucide-react';
import { auth } from '../../firebase';
import { useAuth } from '../AuthContext';

const ESPERA_REENVIO_SEGUNDOS = 60;

export default function VerificaEmail() {
  const { user } = useAuth();
  const router = useRouter();
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [espera, setEspera] = useState(0);
  const [verificando, setVerificando] = useState(false);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((e) => e - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const conferir = useCallback(async (silencioso: boolean) => {
    const atual = auth.currentUser;
    if (!atual) return;
    setVerificando(true);
    try {
      await atual.reload();
      if (atual.emailVerified) {
        window.location.reload();
        return;
      }
      if (!silencioso) setErro('Ainda não encontramos a confirmação. Abra o e-mail que enviamos e clique no link de confirmação.');
    } catch {
      if (!silencioso) setErro('Não foi possível conferir agora. Tente novamente.');
    } finally {
      setVerificando(false);
    }
  }, []);

  useEffect(() => {
    const aoVoltar = () => conferir(true);
    window.addEventListener('focus', aoVoltar);
    return () => window.removeEventListener('focus', aoVoltar);
  }, [conferir]);

  const reenviar = async () => {
    const atual = auth.currentUser;
    if (!atual) return;
    setErro('');
    setMensagem('');
    try {
      auth.languageCode = 'pt';
      await sendEmailVerification(atual);
      setMensagem('E-mail enviado. Confira a caixa de entrada e o spam.');
      setEspera(ESPERA_REENVIO_SEGUNDOS);
    } catch (e) {
      const codigo = (e as { code?: string }).code ?? '';
      setErro(codigo === 'auth/too-many-requests' ? 'Muitas tentativas. Aguarde alguns minutos para pedir outro e-mail.' : 'Não foi possível enviar o e-mail agora.');
    }
  };

  const sair = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <div className="flex min-h-[60dvh] items-center justify-center p-4">
      <section className="rel-box w-full max-w-md">
        <h1 className="rel-title rel-title-line"><MailCheck size={20} /> Confirme o seu e-mail</h1>
        <p className="rel-value mb-2">
          Enviamos um e-mail de confirmação para <span className="rel-strong">{user?.email}</span>. Abra a mensagem e clique no link de confirmação para liberar o acesso.
        </p>
        <p className="rel-desc mb-4">Depois de confirmar, volte a esta página. Se não chegou, confira o spam ou peça outro e-mail.</p>
        {mensagem && <p className="rel-notice rel-notice-ok mb-3">{mensagem}</p>}
        {erro && <p className="rel-notice rel-notice-error mb-3">{erro}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => conferir(false)} disabled={verificando} className="rel-btn rel-btn-primary">{verificando ? 'Conferindo...' : 'Já confirmei'}</button>
          <button type="button" onClick={reenviar} disabled={espera > 0} className="rel-btn rel-btn-outline">{espera > 0 ? `Reenviar em ${espera}s` : 'Reenviar e-mail'}</button>
          <button type="button" onClick={sair} className="rel-btn rel-btn-ghost">Sair</button>
        </div>
      </section>
    </div>
  );
}
