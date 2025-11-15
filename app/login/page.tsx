'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';

const LoginScreen = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            await signInWithEmailAndPassword(auth, email, password);
            toast.success(`Login bem-sucedido! Bem-vindo de volta.`);
            router.push('/home'); // Redireciona para o home
        } catch (error: any) {
            console.error("Erro de autenticação:", error);
            // Fornece feedback específico para erros comuns
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                toast.error('Email ou senha inválidos.');
            } else if (error.code === 'auth/invalid-email') {
                toast.error('O formato do email é inválido.');
            } else {
                toast.error('Ocorreu um erro ao tentar fazer login.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-black font-sans p-4">
            <div className="flex w-full max-w-md flex-col items-center gap-6 rounded-2xl p-8 shadow-xl bg-zinc-900 sm:p-10 transition-colors duration-300 border border-zinc-800">
                
                {/* Título e Subtítulo */}
                <div className="text-center">
                    <h1 className="text-3xl font-extrabold tracking-tight text-sky-400">
                        Acesse sua Conta
                    </h1>
                    <p className="mt-2 text-zinc-400">
                        Bem-vindo ao Núcleo PTU.
                    </p>
                </div>

                <form onSubmit={handleLogin} className="w-full flex flex-col gap-5">
                    
                    {/* Campo Email */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="email" className="text-sm font-medium text-zinc-300">Email/Usuário</label>
                        <input
                            id="email"
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-zinc-50 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-colors duration-200"
                            placeholder="seu@email.com"
                            disabled={isLoading}
                        />
                    </div>

                    {/* Campo Password */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="password" className="text-sm font-medium text-zinc-300">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-zinc-50 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-colors duration-200"
                            placeholder="••••••••"
                            disabled={isLoading}
                        />
                    </div>

                    <button type="submit" disabled={isLoading} className={`flex h-12 w-full items-center justify-center gap-2 rounded-full px-8 text-white font-semibold transition-all duration-200 ${ isLoading ? 'bg-zinc-700 cursor-not-allowed' : 'bg-sky-500 hover:bg-sky-400 active:scale-[0.98] shadow-lg shadow-sky-500/30' }`}>
                        {isLoading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div> : 'Entrar'}
                    </button>
                </form>

                {/* Link de Ajuda (Vermelho LED) */}
                <div className="text-sm text-center">
                    <button className="text-red-500 hover:text-red-400 font-medium transition-colors duration-200" onClick={() => toast.info("A funcionalidade 'Esqueci a Senha' está em desenvolvimento. Contacte o administrador.")}>
                        Esqueci a Password
                    </button>
                </div>

                <p className="text-sm text-zinc-500">
                    Ainda não tem conta?{' '}
                    <Link href="/register" className="text-sky-500 hover:text-sky-400 font-medium transition-colors duration-200">
                            Cadastrar Agora
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default LoginScreen;