'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { serverSupabase } from '@/lib/auth/server';
import { inspectAdminAccess, loginDestination } from '@/lib/auth/access';

export type LoginState = { error: string };

export async function signIn(_previous: LoginState, form: FormData): Promise<LoginState> {
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');
    if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length > 256) return { error: 'Introduce un correo válido y tu contraseña.' };
    const client = await serverSupabase();
    try {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) return { error: error.status === 429 ? 'Se realizaron demasiados intentos. Espera unos minutos antes de volver a intentar.' : 'No se pudo iniciar sesión. Revisa tus credenciales o consulta al responsable del sistema.' };
        const access = await inspectAdminAccess(client);
        if (access.status !== 'admin') {
            await client.auth.signOut({ scope: 'local' });
            return { error: access.status === 'unavailable' ? 'No se pudo verificar el permiso de administración. Revisa la configuración de acceso en Supabase.' : 'Esta cuenta no está habilitada para administrar el sistema.' };
        }
    } catch { return { error: 'No se pudo conectar con el servicio de acceso. Inténtalo nuevamente.' }; }
    revalidatePath('/', 'layout');
    redirect(loginDestination(form.get('next')));
}

export async function signOut() {
    const client = await serverSupabase();
    // Scope local termina esta sesión; no cierra las de otros administradores.
    await client.auth.signOut({ scope: 'local' });
    revalidatePath('/', 'layout');
    redirect('/login');
}
