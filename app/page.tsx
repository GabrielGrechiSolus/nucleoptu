'use client';
import React from 'react';
import Link from 'next/link';
import { FeatureCard } from './components/FeatureCard';

// --- Componente da Tela Inicial (Home) ---
const HomeScreen = () => {
  return (
    // Ocupa a tela inteira com fundo preto e padding responsivo
    <div className="flex min-h-screen flex-col items-center bg-black font-sans text-zinc-50">
        
        {/* Seção Principal - Banner */}
        <main className="flex w-full max-w-5xl flex-col items-center justify-center p-4 py-20 sm:py-32">
            
            {/* Banner de Novidade */}
            <div className="mb-8">
                <span className="inline-flex items-center rounded-full bg-red-900/40 px-3 py-1 text-xs font-medium text-red-400 border border-red-500/50">
                    Novidade
                </span>
                <span className="ml-3 text-sm text-zinc-300 hover:text-sky-400 cursor-pointer transition-colors">
                    Finalmente a versão 1 🚀
                </span>
            </div>

            {/* Título Principal */}
            <div className="text-center mb-10">
                <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tighter text-sky-400">
                    Nucleo PTU e
                </h1>
                <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tighter text-zinc-50 mt-2">
                    Contas Médicas
                </h1>
            </div>

            {/* Subtítulo e CTA */}
            <div className="max-w-3xl text-center mb-16">
                <p className="text-xl text-zinc-400 leading-relaxed">
                    Depois de entrar nesse site, sua unica dor de cabeça vai ser pagar salgadinho.
                </p>
                <code className="block mt-6 text-sky-500 text-lg font-mono">
                    Salgadinho é tão estratégico que deveria ter cadeira na reunião de diretoria.
                </code>
            </div>

            {/* Botões de Ação */}
            <div className="flex flex-col gap-4 w-full sm:flex-row sm:justify-center sm:w-auto">
                <Link href="/login" passHref>
                    <button
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-sky-500 px-8 text-white font-semibold transition-transform duration-150 hover:bg-sky-400 active:scale-[0.98] shadow-lg shadow-sky-500/30 dark:bg-sky-600 dark:hover:bg-sky-500 sm:w-48"
                        aria-label="Acessar sua conta"
                    >
                        Entrar (Login)
                    </button>
                </Link>
                <Link href="/register" passHref>
                    <button
                        className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-zinc-700 px-8 text-zinc-50 font-semibold transition-colors duration-150 hover:bg-red-900/20 dark:hover:border-red-500 sm:w-48"
                        aria-label="Criar um novo cadastro"
                    >
                        Cadastrar
                    </button>
                </Link>
            </div>
        </main>

        {/* Divisor Visual */}
        <div className="w-full max-w-5xl border-t border-zinc-800 my-10"></div>

        {/* Seção de Recursos (Features) */}
        <section className="w-full max-w-5xl p-4 pb-20">
            <h2 className="text-3xl font-bold text-center mb-12 text-zinc-50">
                O que está no Núcleo?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FeatureCard
                    icon="⚡️"
                    title="Otimizações Integradas"
                    description="Processamento Ultra Rápido de PTU, priorização automática de Contas Médicas e Alocação Inteligente de Snacks para melhorar o UX e os Core Web Vitals do núcleo."
                />
                <FeatureCard
                    icon="💾"
                    title="Busca de Dados em Lote"
                    description="Torne seus componentes React assíncronos e busque dados de PTU. O Núcleo suporta busca de dados tanto do servidor quanto do lado do cliente (dashboards)."
                />
                <FeatureCard
                    icon="⚙️"
                    title="Ações do Servidor Seguras"
                    description="Execute código no servidor chamando uma função. Ignore a necessidade de APIs extras para revalidar dados em cache e atualizar a UI em uma única requisição."
                />
                <FeatureCard
                    icon="🗺️"
                    title="Rotas e Fluxos Avançados"
                    description="Crie rotas usando o sistema de arquivos, incluindo suporte para padrões de roteamento avançados e layouts aninhados para navegação entre módulos críticos."
                />
            </div>
        </section>
    </div>
  );
};

export default HomeScreen;