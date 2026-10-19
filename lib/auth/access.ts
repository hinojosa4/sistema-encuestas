import type { SupabaseClient } from '@supabase/supabase-js';
import { adminNavigation, DEFAULT_ADMIN_PATH } from '../adminNavigation';

export type AdminAccess =
    | { status: 'admin'; user: { id: string; email?: string } }
    | { status: 'anonymous' | 'forbidden' | 'unavailable' };

// No confiar en user_metadata, correo del cliente o getSession para autorizar.
export async function inspectAdminAccess(client: SupabaseClient): Promise<AdminAccess> {
    try {
        const { data, error } = await client.auth.getUser();
        if (error) {
            if (error.name === 'AuthSessionMissingError' || [400, 401, 403].includes(error.status ?? 0)) return { status: 'anonymous' };
            return { status: 'unavailable' };
        }
        if (!data.user) return { status: 'anonymous' };
        const permission = await client.rpc('es_administrador');
        if (permission.error) return { status: 'unavailable' };
        return permission.data === true ? { status: 'admin', user: data.user } : { status: 'forbidden' };
    } catch {
        return { status: 'unavailable' };
    }
}

// Solo destinos locales conocidos. Evita redirecciones abiertas después del login.
export function loginDestination(value: unknown) {
    return typeof value === 'string' && adminNavigation.some(link => link.href === value) ? value : DEFAULT_ADMIN_PATH;
}
