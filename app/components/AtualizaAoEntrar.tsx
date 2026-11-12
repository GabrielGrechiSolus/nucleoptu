'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { Loader2, X } from 'lucide-react';
import { auth, db } from '../../firebase';
import { useAuth } from '../AuthContext';
import { usePessoa } from './usePessoa';
import { buscaPerfilGit, geraContextosDoGit, textoDoResumo } from '../chamados/atualizaGit';
import { lerChaveBm } from '../chamados/bmChave';
import { chamadosDaPessoa } from '../chamados/bmRegistro';
import { lerRegistrosBm, sincronizaBm } from '../chamados/bmSync';
import { lerQuadroBm, sincronizaQuadroBm } from '../chamados/bmQuadroSync';
import type { Chamado } from '../chamados/parse';
import { exigeVerificacaoEmail } from '../verificacao-email';

const CHAVE_MARCA = 'nucleoptu.atualizou';
export const EVENTO_DADOS_ATUALIZADOS = 'nucleoptu-dados-atualizados';

interface Estado {
  texto: string;
  tipo: 'info' | 'ok' | 'erro';
}

export default function AtualizaAoEntrar() {
  const { user } = useAuth();
  const pessoa = usePessoa();
  const [estado, setEstado] = useState<Estado | null>(null);
  const rodou = useRef('');

  const executa = useCallback(async (gitUser: string) => {
    const partes: string[] = [];
    let erro = false;
    setEstado({ texto: 'Atualizando os seus chamados a partir do Git...', tipo: 'info' });
    try {
      const g = await buscaPerfilGit(gitUser, 60);
      if (!g.dados) {
        partes.push(g.erro ?? 'Git indisponível.');
        erro = true;
      } else {
        const r = await geraContextosDoGit(g.dados, (texto) => setEstado({ texto, tipo: 'info' }));
        partes.push(textoDoResumo(r));
      }
    } catch (e) {
      partes.push(`Não foi possível atualizar os contextos (${(e as { code?: string })?.code ?? 'erro'}).`);
      erro = true;
    }

    if (lerChaveBm()) {
      try {
        setEstado({ texto: 'Atualizando os cartões do Businessmap...', tipo: 'info' });
        const snap = await getDocs(collection(db, 'chamados'));
        const meus = chamadosDaPessoa(
          snap.docs.map((d) => d.data() as Chamado),
          gitUser,
        );
        const rb = await sincronizaBm({
          chamados: meus,
          registros: await lerRegistrosBm(),
          por: auth.currentUser?.email ?? '',
          onProgresso: (feito, total) => setEstado({ texto: `Businessmap: ${feito} de ${total} cartão(ões)...`, tipo: 'info' }),
          deveParar: () => false,
        });
        partes.push(`BM: ${rb.atualizados} atualizado(s), ${rb.iguais} sem mudança${rb.erros ? `, ${rb.erros} com erro` : ''}.${rb.aviso ? ` ${rb.aviso}` : ''}`);
        if (rb.erros) erro = true;
        setEstado({ texto: 'Atualizando o quadro do Businessmap...', tipo: 'info' });
        const quadro = await lerQuadroBm();
        const rq = await sincronizaQuadroBm(auth.currentUser?.email ?? '', quadro.cartoes);
        partes.push(rq.aviso ? rq.aviso : `Quadro do BM: ${rq.total} cartão(ões), ${rq.gravados} atualizado(s).`);
        if (rq.aviso) erro = true;
      } catch {
        partes.push('Não foi possível atualizar o Businessmap agora.');
        erro = true;
      }
    }

    window.dispatchEvent(new Event(EVENTO_DADOS_ATUALIZADOS));
    setEstado({ texto: partes.join(' '), tipo: erro ? 'erro' : 'ok' });
  }, []);

  useEffect(() => {
    if (!user || !pessoa.carregado || pessoa.semGit || !pessoa.gitUser) return;
    if (exigeVerificacaoEmail({ emailVerificado: user.emailVerified, criadoEm: user.metadata?.creationTime })) return;
    const marca = `${user.uid}|${user.metadata?.lastSignInTime ?? ''}`;
    if (rodou.current === marca) return;
    let guardada = '';
    try {
      guardada = localStorage.getItem(CHAVE_MARCA) ?? '';
    } catch {
      guardada = '';
    }
    if (guardada === marca) return;
    rodou.current = marca;
    try {
      localStorage.setItem(CHAVE_MARCA, marca);
    } catch {
      rodou.current = marca;
    }
    Promise.resolve().then(() => executa(pessoa.gitUser));
  }, [user, pessoa.carregado, pessoa.semGit, pessoa.gitUser, executa]);

  useEffect(() => {
    if (!estado || estado.tipo === 'info') return;
    const t = setTimeout(() => setEstado(null), estado.tipo === 'erro' ? 15000 : 8000);
    return () => clearTimeout(t);
  }, [estado]);

  if (!estado) return null;
  return (
    <div className="rel-box-flat" role="status" style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 60, maxWidth: 380, boxShadow: 'var(--rel-shadow)' }}>
      <div className="flex items-start gap-3">
        {estado.tipo === 'info' ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" style={{ color: 'var(--rel-primary)' }} /> : null}
        <p className={estado.tipo === 'erro' ? 'rel-value' : 'rel-desc'} style={estado.tipo === 'erro' ? { color: 'var(--rel-error)' } : undefined}>{estado.texto}</p>
        <button type="button" onClick={() => setEstado(null)} aria-label="Fechar" className="rel-btn rel-btn-icon" style={{ width: 24, height: 24 }}><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
