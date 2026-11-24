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
const INTERVALO_SINCRONIZACAO = 15 * 60_000;
const INTERVALO_TENTATIVA = 5 * 60_000;
const TEMPO_LOCK = 20 * 60_000;
export const EVENTO_DADOS_ATUALIZADOS = 'nucleoptu-dados-atualizados';

interface Estado {
  texto: string;
  tipo: 'info' | 'ok' | 'erro';
}

interface MarcaSync {
  login: string;
  tentativaEm: number;
  sucessoEm: number;
}

const lerMarca = (uid: string): MarcaSync => {
  try {
    return JSON.parse(localStorage.getItem(`${CHAVE_MARCA}.${uid}`) ?? '{}') as MarcaSync;
  } catch {
    return { login: '', tentativaEm: 0, sucessoEm: 0 };
  }
};

export default function AtualizaAoEntrar() {
  const { user } = useAuth();
  const pessoa = usePessoa();
  const [estado, setEstado] = useState<Estado | null>(null);
  const rodando = useRef(false);

  const executa = useCallback(async (gitUser: string): Promise<boolean> => {
    const partes: string[] = [];
    let erro = false;
    setEstado({ texto: 'Atualizando seus PRs, contextos e dados do Businessmap...', tipo: 'info' });
    try {
      const g = await buscaPerfilGit(gitUser, 60);
      if (!g.dados) {
        partes.push(g.erro ?? 'Git indisponível.');
        erro = true;
      } else {
        const r = await geraContextosDoGit(g.dados, (texto) => setEstado({ texto, tipo: 'info' }));
        partes.push(`Git: ${textoDoResumo(r)}`);
        if (r.aviso) erro = true;
      }
    } catch (e) {
      partes.push(`Não foi possível atualizar os contextos (${(e as { code?: string })?.code ?? 'erro'}).`);
      erro = true;
    }

    if (lerChaveBm()) {
      try {
        setEstado({ texto: 'Verificando atualizações do Businessmap...', tipo: 'info' });
        const snap = await getDocs(collection(db, 'chamados'));
        const meus = chamadosDaPessoa(snap.docs.map((d) => d.data() as Chamado), gitUser);
        const rb = await sincronizaBm({
          chamados: meus,
          registros: await lerRegistrosBm(),
          por: auth.currentUser?.email ?? '',
          onProgresso: (feito, total) => setEstado({ texto: `Businessmap: ${feito} de ${total} chamados verificados...`, tipo: 'info' }),
          deveParar: () => false,
        });
        partes.push(`BM: ${rb.atualizados} atualizado(s), ${rb.iguais} sem mudança, ${rb.ignoradosConcluidos} concluído(s) ignorado(s)${rb.erros ? `, ${rb.erros} com erro` : ''}.${rb.aviso ? ` ${rb.aviso}` : ''}`);
        if (rb.erros || rb.aviso) erro = true;

        setEstado({ texto: 'Verificando o quadro do Businessmap...', tipo: 'info' });
        const quadro = await lerQuadroBm();
        const rq = await sincronizaQuadroBm(auth.currentUser?.email ?? '', quadro.cartoes);
        partes.push(rq.aviso ? rq.aviso : `Quadro do BM: ${rq.total} cartões, ${rq.gravados} atualização(ões).`);
        if (rq.aviso) erro = true;
      } catch (e) {
        partes.push(`Não foi possível atualizar o Businessmap (${(e as { code?: string })?.code ?? 'erro'}).`);
        erro = true;
      }
    }

    window.dispatchEvent(new Event(EVENTO_DADOS_ATUALIZADOS));
    setEstado({ texto: partes.join(' '), tipo: erro ? 'erro' : 'ok' });
    return !erro;
  }, []);

  useEffect(() => {
    if (!user || !pessoa.carregado || pessoa.semGit || !pessoa.gitUser) return;
    if (exigeVerificacaoEmail({ emailVerificado: user.emailVerified, criadoEm: user.metadata?.creationTime })) return;

    const login = `${user.uid}|${user.metadata?.lastSignInTime ?? ''}|${pessoa.gitUser.toLowerCase()}`;
    const marcaKey = `${CHAVE_MARCA}.${user.uid}`;
    const lockKey = `${CHAVE_MARCA}.lock.${user.uid}`;
    let cancelado = false;

    const sincronizarSeNecessario = async () => {
      if (cancelado || rodando.current || document.visibilityState !== 'visible' || !navigator.onLine) return;
      const marca = lerMarca(user.uid);
      const agora = Date.now();
      const loginNovo = marca.login !== login;
      const intervalo = agora - (marca.sucessoEm || 0) >= INTERVALO_SINCRONIZACAO;
      const tentativaRecente = agora - (marca.tentativaEm || 0) < INTERVALO_TENTATIVA;
      if (!loginNovo && !intervalo || tentativaRecente) return;

      try {
        const lockAtual = Number(localStorage.getItem(lockKey) || 0);
        if (lockAtual && agora - lockAtual < TEMPO_LOCK) return;
        localStorage.setItem(lockKey, String(agora));
        localStorage.setItem(marcaKey, JSON.stringify({ ...marca, tentativaEm: agora } satisfies MarcaSync));
      } catch {
        // A sessão ainda sincroniza se o navegador bloquear o armazenamento local.
      }

      rodando.current = true;
      try {
        const sucesso = await executa(pessoa.gitUser);
        if (sucesso) {
          const atual = lerMarca(user.uid);
          localStorage.setItem(marcaKey, JSON.stringify({ ...atual, login, tentativaEm: agora, sucessoEm: Date.now() } satisfies MarcaSync));
        }
      } catch (e) {
        console.error('Falha na sincronização automática:', e);
      } finally {
        rodando.current = false;
        try { localStorage.removeItem(lockKey); } catch { /* opcional */ }
      }
    };

    const timer = window.setInterval(() => void sincronizarSeNecessario(), 60_000);
    const aoVoltar = () => void sincronizarSeNecessario();
    const aoFicarOnline = () => void sincronizarSeNecessario();
    document.addEventListener('visibilitychange', aoVoltar);
    window.addEventListener('focus', aoVoltar);
    window.addEventListener('online', aoFicarOnline);
    void sincronizarSeNecessario();
    return () => {
      cancelado = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', aoVoltar);
      window.removeEventListener('focus', aoVoltar);
      window.removeEventListener('online', aoFicarOnline);
    };
  }, [user, pessoa.carregado, pessoa.semGit, pessoa.gitUser, executa]);

  useEffect(() => {
    if (!estado || estado.tipo === 'info') return;
    const t = setTimeout(() => setEstado(null), estado.tipo === 'erro' ? 15000 : 8000);
    return () => clearTimeout(t);
  }, [estado]);

  if (!estado) return null;
  return (
    <div className="rel-box-flat" role="status" style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 60, maxWidth: 420, boxShadow: 'var(--rel-shadow)' }}>
      <div className="flex items-start gap-3">
        {estado.tipo === 'info' ? <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" style={{ color: 'var(--rel-primary)' }} /> : null}
        <p className={estado.tipo === 'erro' ? 'rel-value' : 'rel-desc'} style={estado.tipo === 'erro' ? { color: 'var(--rel-error)' } : undefined}>{estado.texto}</p>
        <button type="button" onClick={() => setEstado(null)} aria-label="Fechar" className="rel-btn rel-btn-icon" style={{ width: 24, height: 24 }}><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
