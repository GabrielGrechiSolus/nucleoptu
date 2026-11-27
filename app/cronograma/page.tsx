'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { podeVerCronograma } from '../chamados/relatusAcesso';
import withAuth from '../components/withAuth';
import CronogramaAno from './CronogramaAno';

const diaDeHoje = () => new Date().toLocaleDateString('sv-SE');

function CronogramaPage() {
  const router = useRouter();
  const { user } = useAuth();
  const liberado = podeVerCronograma(user?.email);

  useEffect(() => {
    if (!liberado) router.replace('/home');
  }, [liberado, router]);

  if (!liberado) return null;
  const hoje = diaDeHoje();

  return (
    <div className="rel-page mx-auto max-w-[1600px]">
      <header className="rel-box">
        <h1 className="rel-title"><CalendarDays className="h-5 w-5" /> Cronograma</h1>
        <p className="rel-desc">Seus compromissos, visitas e férias no Web Relatus. Somente leitura.</p>
      </header>
      <CronogramaAno anoInicial={Number(hoje.slice(0, 4))} hoje={hoje} />
    </div>
  );
}

export default withAuth(CronogramaPage);
