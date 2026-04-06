'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// Ícones
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Briefcase,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Heart,
  Home,
  LayoutDashboard,
  Link2,
  MessageSquare,
  Rocket,
  Sparkles,
  Star,
  Stethoscope,
  Target,
  TrendingUp,
  Users,
  Zap,
  Shield,
  ShieldCheck,
  Award,
  Brain,
  Smile
} from 'lucide-react';

export default function HomePage() {
  const [showAnimation, setShowAnimation] = useState(true);
  const [currentYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const timer = setTimeout(() => setShowAnimation(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const features = [
    {
      icon: Activity,
      title: 'Gestão de Contas',
      description: 'Controle e acompanhamento de contas médicas com eficiência',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10'
    },
    {
      icon: Heart,
      title: 'Saúde Integrada',
      description: 'Gerenciamento completo da saúde e bem-estar',
      color: 'from-red-500 to-pink-500',
      bgColor: 'bg-red-500/10'
    },
    {
      icon: BarChart3,
      title: 'Relatórios',
      description: 'Análises detalhadas e métricas em tempo real',
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-500/10'
    },
    {
      icon: Users,
      title: 'Equipe Colaborativa',
      description: 'Trabalhe em equipe com comunicação integrada',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10'
    },
    {
      icon: Shield,
      title: 'Segurança',
      description: 'Dados protegidos com alta segurança',
      color: 'from-indigo-500 to-purple-500',
      bgColor: 'bg-indigo-500/10'
    },
    {
      icon: Rocket,
      title: 'Produtividade',
      description: 'Ferramentas para otimizar seu dia a dia',
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-500/10'
    }
  ];

  const stats = [
    { label: 'Contas Gerenciadas', value: '2K+', icon: FileText },
    { label: 'Usuários Ativos', value: '500+', icon: Users },
    { label: 'Snacks Entregues', value: '10K+', icon: Star },
    { label: 'Satisfação', value: '98%', icon: Smile }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950">
      {/* Animação de Entrada */}
      <AnimatePresence>
        {showAnimation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1], rotate: [0, 360] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <Sparkles className="w-20 h-20 text-sky-400 mx-auto" />
              </motion.div>
              <motion.h2
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold text-white mt-4"
              >
                Solus Easy
              </motion.h2>
              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-slate-400 mt-2"
              >
                Gestão de Contas Médicas e Snacks
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-500/20 via-transparent to-transparent" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            {/* LED Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-6">
              <div className="relative">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <div className="absolute inset-0 w-2 h-2 bg-emerald-500 rounded-full animate-ping opacity-75" />
              </div>
              <span className="text-xs font-medium text-emerald-400">Sistema Ativo</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-sky-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                Solus Easy
              </span>
            </h1>

            <p className="mt-6 text-xl text-slate-400 max-w-2xl mx-auto">
              Facilitadores para o seu dia a dia no suporte
            </p>


          </motion.div>
        </div>
      </div>



      {/* CTA Section */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-sky-600/10 to-blue-600/10 backdrop-blur-sm border border-sky-500/20 rounded-2xl p-8 sm:p-12"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 mb-6">
              <Zap className="w-3 h-3 text-amber-400" />
              <span className="text-xs font-medium text-amber-400">Comece Agora</span>
            </div>

            <h2 className="text-3xl font-bold text-white mb-4">
              Pronto para transformar sua gestão?
            </h2>
            <p className="text-slate-400 mb-8 max-w-2xl mx-auto">
              Junte-se a centenas de usuários que já otimizaram seus processos com o Solus Easy
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-medium transition-all"
              >
                Acessar Agora
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-slate-600 text-white font-medium transition-all"
              >
                Criar Conta Gratuita
              </Link>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm text-slate-500">Solus Easy</span>
            </div>
            <p className="text-xs text-slate-600">
              © {currentYear} Solus Easy. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>

      {/* Floating LED Decoration */}
      <div className="fixed bottom-4 left-4 flex gap-1 opacity-50">
        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse delay-300" />
        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse delay-700" />
      </div>
    </div>
  );
}