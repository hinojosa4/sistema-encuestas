'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function AdminSessionGuard({ children }: { children: ReactNode }) {
    const [ended, setEnded] = useState(false);
    useEffect(() => {
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT' || (event === 'INITIAL_SESSION' && !session)) {
                setEnded(true);
                window.location.replace('/login?motivo=sesion');
            }
        });
        return () => data.subscription.unsubscribe();
    }, []);
    return ended ? <p role="status" className="p-8 text-center text-slate-600">La sesión ha finalizado. Abriendo el acceso…</p> : children;
}
