'use client';

import withAuth from '../components/withAuth';

const HomePage = () => {
  return (
    <div>
      <h1 className="text-4xl font-bold tracking-tight text-sky-400 mb-4">
        Dashboard Principal
      </h1>
      <p className="text-zinc-400">
        Bem-vindo ao seu núcleo de operações. Aqui você poderá visualizar e gerenciar todas as atividades.
      </p>
    </div>
  );
};

export default withAuth(HomePage);