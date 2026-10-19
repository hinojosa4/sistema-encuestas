import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { inspectAdminAccess, loginDestination } from './access';

export async function serverSupabase() {
    const store = await cookies();
    return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store', signal: AbortSignal.timeout(30000) }) },
        cookies: {
            getAll: () => store.getAll(),
            setAll: values => {
                // El proxy renueva cookies antes de los Server Components, que solo pueden leerlas.
                try { values.forEach(({ name, value, options }) => store.set(name, value, options)); } catch { /* Read-only render. */ }
            },
        },
    });
}

export async function requireAdministrator(destination = '/dashboard') {
    const client = await serverSupabase();
    const access = await inspectAdminAccess(client);
    if (access.status !== 'admin') {
        const reason = access.status === 'forbidden' ? 'sin-permiso' : access.status === 'unavailable' ? 'verificacion' : 'sesion';
        redirect(`/login?next=${encodeURIComponent(loginDestination(destination))}&motivo=${reason}`);
    }
    return { client, user: access.user };
}
