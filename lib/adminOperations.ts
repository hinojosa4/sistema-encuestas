// Mensajes controlados: nunca mostrar SQL, detalles de filas, tokens ni mensajes crudos.
export function resetErrorMessage(error: unknown): string {
    const info = error as { code?: unknown; message?: unknown } | null;
    const code = typeof info?.code === 'string' ? info.code : '';
    if (code === '21000' && typeof info?.message === 'string' && /DELETE requires a WHERE clause/i.test(info.message)) {
        return 'La función de borrado necesita una actualización en Supabase. Aplica scripts/corregir_borrado_administrador.sql. Referencia: BORRADO-FILTRO (21000).';
    }
    if (['PGRST202', 'PGRST203', '42883', '42P01', '42703'].includes(code)) return `La operación de borrado no está configurada correctamente en Supabase. Revisa los scripts de administración. Referencia: ${code}.`;
    if (code === '42501' || code === 'PGRST301' || code === 'PGRST303') return `No se pudo autorizar el borrado. Comprueba la cuenta administradora y sus permisos. Referencia: ${code}.`;
    if (code === '23503') return 'Existen registros relacionados que impiden el borrado. Se necesita revisar esas relaciones antes de continuar. Referencia: 23503.';
    if (['55P03', '57014', '40P01'].includes(code)) return `La operación se interrumpió por espera o concurrencia. Revisa el historial y los datos antes de volver a intentar. Referencia: ${code}.`;
    const reference = /^(?:[0-9A-Z]{5}|PGRST\d{3})$/.test(code) ? ` Referencia: ${code}.` : '';
    return `No se pudo confirmar el resultado. Revisa los datos y el historial antes de volver a intentar.${reference}`;
}

export function resetResult(value: unknown): { titulados: number; empleadores: number } | null {
    if (!value || typeof value !== 'object') return null;
    const v = value as Record<string, unknown>;
    if (typeof v.titulados !== 'number' || typeof v.empleadores !== 'number' || !Number.isSafeInteger(v.titulados) || !Number.isSafeInteger(v.empleadores) || v.titulados < 0 || v.empleadores < 0) return null;
    return { titulados: v.titulados, empleadores: v.empleadores };
}
