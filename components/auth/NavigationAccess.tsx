'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { inspectAdminAccess } from '@/lib/auth/access';

type NavigationAccess = { status: 'pending' | 'admin' | 'guest' };
const Context = createContext<NavigationAccess>({ status: 'pending' });

// Controla la visibilidad, sin sustituir la autorización del servidor ni RLS.
export function NavigationAccessProvider({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const [snapshot, setSnapshot] = useState<{ path: string; status: NavigationAccess['status'] }>({ path: '', status: 'pending' });
    useEffect(() => {
        let active = true, generation = 0;
        let scheduled: ReturnType<typeof setTimeout>;
        const verify = () => {
            const request = ++generation;
            void inspectAdminAccess(supabase).then(access => {
                if (active && request === generation) setSnapshot({ path: pathname, status: access.status === 'admin' ? 'admin' : 'guest' });
            });
        };
        verify();
        const { data } = supabase.auth.onAuthStateChange(event => {
            clearTimeout(scheduled);
            if (event === 'SIGNED_OUT') {
                ++generation;
                setSnapshot({ path: pathname, status: 'guest' });
            } else {
                // Fuera del callback de Auth para evitar bloquear su mutex interno.
                scheduled = setTimeout(verify, 0);
            }
        });
        return () => { active = false; ++generation; clearTimeout(scheduled); data.subscription.unsubscribe(); };
    }, [pathname]);
    const status = snapshot.path === pathname ? snapshot.status : 'pending';
    return <Context.Provider value={{ status }}>{children}</Context.Provider>;
}

export const useNavigationAccess = () => useContext(Context);
