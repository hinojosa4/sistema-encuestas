import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Renueva la sesión. La autorización se repite en páginas, acciones, API y RLS.
export async function proxy(request: NextRequest) {
    let response = NextResponse.next({ request });
    const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) },
        cookies: {
            getAll: () => request.cookies.getAll(),
            setAll: (values, headers) => {
                values.forEach(({ name, value }) => request.cookies.set(name, value));
                response = NextResponse.next({ request });
                values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
                Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
            },
        },
    });
    try { await client.auth.getUser(); } catch { /* Las rutas comprueban acceso y fallan cerradas. */ }
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
}

export const config = { matcher: ['/', '/login', '/dashboard/:path*', '/upload/:path*', '/administracion/:path*', '/api/reports/:path*'] };
