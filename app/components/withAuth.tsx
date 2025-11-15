'use client';

import { useAuth } from '../AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const withAuth = <P extends object>(WrappedComponent: React.ComponentType<P>) => {
    const AuthComponent = (props: P) => {
        const { user, loading } = useAuth();
        const router = useRouter();

        useEffect(() => {
            if (!loading && !user) {
                router.push('/login');
            }
        }, [user, loading, router]);

        if (loading || !user) {
            return (
                <div className="flex min-h-screen items-center justify-center bg-black">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-sky-500"></div>
                </div>
            );
        }

        return <WrappedComponent {...props} />;
    };
    return AuthComponent;
};

export default withAuth;