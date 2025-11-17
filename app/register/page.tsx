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

        if (!name.trim()) return toast.error("O nome não pode estar vazio.");
        if (!email.trim()) return toast.error("O email não pode estar vazio.");
        if (!password.trim() || !confirmPassword.trim())
            return toast.error("A senha não pode estar vazia ou conter espaços.");
        if (password !== confirmPassword)
            return toast.error("As senhas não coincidem.");
        if (!email.toLowerCase().endsWith("@solus.inf.br"))
            return toast.error("E-mail inválido.");

        setIsLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: name });
            toast.success(`Cadastro de ${name} realizado com sucesso!`);
            router.push('/login');
        } catch (error: any) {
            console.error("Erro no cadastro:", error);
            const errorMap: any = {
                'auth/email-already-in-use': 'Este email já está em uso.',
                'auth/invalid-email': 'O formato do email é inválido.',
                'auth/weak-password': 'Senha fraca. Use no mínimo 6 caracteres.'
            };
            toast.error(errorMap[error.code] || 'Erro ao tentar se cadastrar.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-black overflow-hidden p-4">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl shadow-xl p-6 sm:p-8 flex flex-col gap-4">
                
                <div className="text-center">
                    <h1 className="text-3xl font-extrabold tracking-tight text-sky-400">
                        Crie sua Conta
                    </h1>
                    <p className="text-zinc-400 mt-1">
                        Junte-se ao Núcleo PTU.
                    </p>
                </div>

                <form onSubmit={handleRegister} className="flex flex-col gap-4">

                    <div className="flex flex-col gap-1">
                        <label htmlFor="name" className="text-sm text-zinc-300">Nome Completo</label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-zinc-50 focus:ring-1 focus:ring-sky-500 outline-none"
                            placeholder="Seu nome completo"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="email" className="text-sm text-zinc-300">Email/Usuário</label>
                        <input
                            id="email"
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-zinc-50 focus:ring-1 focus:ring-sky-500 outline-none"
                            placeholder="exemplo@solus.inf.br"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="password" className="text-sm text-zinc-300">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-zinc-50 focus:ring-1 focus:ring-sky-500 outline-none"
                            placeholder="••••••••"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="confirmPassword" className="text-sm text-zinc-300">Confirmar Password</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-zinc-50 focus:ring-1 focus:ring-sky-500 outline-none"
                            placeholder="••••••••"
                            disabled={isLoading}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`h-12 w-full rounded-full text-white font-semibold transition-all ${
                            isLoading
                                ? 'bg-zinc-700 cursor-not-allowed'
                                : 'bg-sky-500 hover:bg-sky-400 active:scale-95 shadow-lg shadow-sky-500/30'
                        }`}
                    >
                        {isLoading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mx-auto"></div>
                        ) : (
                            "Cadastrar"
                        )}
                    </button>
                </form>

                <p className="text-sm text-zinc-500 text-center">
                    Já tem uma conta?{" "}
                    <Link href="/login" className="text-sky-500 hover:text-sky-400 font-medium">
                        Faça Login
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default RegisterScreen;
