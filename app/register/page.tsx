'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../../firebase';

const RegisterScreen = () => {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação de domínio de email permitido
    if (!email.toLowerCase().endsWith("@solus.inf.br")) {
        toast.error("E-mail inválido.");
        return;
    }

    // Validar senhas iguais
    if (password !== confirmPassword) {
        toast.error('As senhas não coincidem.');
        return;
    }

    setIsLoading(true);

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);

        await updateProfile(userCredential.user, {
            displayName: name,
        });

        toast.success(`Cadastro de ${name} realizado com sucesso!`);
        router.push('/login');
    } catch (error: any) {
        console.error("Erro no cadastro:", error);

        if (error.code === 'auth/email-already-in-use') {
            toast.error('Este email já está em uso.');
        } else if (error.code === 'auth/invalid-email') {
            toast.error('O formato do email é inválido.');
        } else if (error.code === 'auth/weak-password') {
            toast.error('A senha é muito fraca. Use pelo menos 6 caracteres.');
        } else {
            toast.error('Ocorreu um erro ao tentar se cadastrar.');
        }
    } finally {
        setIsLoading(false);
    }
};


    return (
        <div className="flex min-h-screen items-center justify-center bg-black font-sans p-4">
            <div className="flex w-full max-w-md flex-col items-center rounded-2xl p-8 shadow-xl bg-zinc-900 sm:p-10 transition-colors duration-300 border border-zinc-800">
                <div className="text-center my-4">
                    <h1 className="text-3xl font-extrabold tracking-tight text-sky-400">
                        Crie sua Conta
                    </h1>
                </div>
                <p className="text-center text-zinc-400">
                    Junte-se ao Núcleo para gerir o PTU e garantir o stock de Snacks.
                </p>

                <form onSubmit={handleRegister} className="w-full flex flex-col gap-4 my-4">
                    
                    {/* Campo Nome */}
                    <div className="flex flex-col gap-2">
                        <label htmlFor="name" className="text-sm font-medium text-zinc-300">Nome Completo</label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-zinc-50 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-colors duration-200"
                            placeholder="Seu nome completo"
                            disabled={isLoading}
                        />
                    </div>

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
                            placeholder="exemplo@solus.ptumed.com"
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

                     {/* Campo Confirmar Password */}
                     <div className="flex flex-col gap-2">
                        <label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-300">Confirmar Password</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-zinc-50 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-colors duration-200"
                            placeholder="••••••••"
                            disabled={isLoading}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`flex h-12 w-full items-center justify-center gap-2 rounded-full px-8 text-white font-semibold transition-all duration-200 ${
                            isLoading ? 'bg-zinc-700 cursor-not-allowed' : 'bg-sky-500 hover:bg-sky-400 active:scale-[0.98] shadow-lg shadow-sky-500/30'
                        }`}
                    >
                        {isLoading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                        ) : (
                            'Cadastrar'
                        )}
                    </button>
                </form>

                <p className="text-sm text-zinc-500">
                    Já tem uma conta?{' '}
                    <Link href="/login" className="text-sky-500 hover:text-sky-400 font-medium transition-colors duration-200">
                        Faça Login
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default RegisterScreen;