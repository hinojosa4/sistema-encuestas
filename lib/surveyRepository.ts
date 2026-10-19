import type { SupabaseClient } from '@supabase/supabase-js';
import { responseHash, type Row, type SurveyType } from './importPipeline';
import { normalizarTexto } from './dataMappers';
import { UserFacingError } from './userMessages';

export async function readAllRows(client: SupabaseClient, table: SurveyType, columns = '*'): Promise<Row[]> {
    const rows: Row[] = [];
    const size = 1000;
    for (let from = 0; ; from += size) {
        const { data, error } = await client.from(table).select(columns).order('id').range(from, from + size - 1);
        if (error) throw error;
        const page = (data ?? []) as unknown as Row[];
        rows.push(...page);
        if (page.length < size) return rows;
    }
}
export async function existingHashes(rows: Row[]): Promise<Set<string>> {
    return new Set(await Promise.all(rows.map(row => {
        if (typeof row.respuesta_hash === 'string') return row.respuesta_hash;
        if (row.raw_data && typeof row.raw_data === 'object' && !Array.isArray(row.raw_data)) return responseHash(row.raw_data as Row);
        return '';
    })));
}
export async function savePreparedRows(client: SupabaseClient, table: SurveyType, payload: (Row & { respuesta_hash: string })[]) {
    const stored = await readAllRows(client, table, 'id,raw_data,respuesta_hash,respuesta_origen_id,instrumento_origen');
    const hashes = await existingHashes(stored);
    const fresh = payload.filter(row => !hashes.has(row.respuesta_hash));
    if (table === 'encuesta_titulados') {
        const ids = new Set(stored.flatMap(row => {
            const raw = row.raw_data && typeof row.raw_data === 'object' ? row.raw_data as Row : {};
            const id = row.respuesta_origen_id ?? Object.entries(raw).find(([h]) => normalizarTexto(h) === 'id')?.[1];
            return id == null || String(id).trim() === '' ? [] : [`${String(row.instrumento_origen ?? 'legado')}:${String(id)}`];
        }));
        if (fresh.some(row => row.respuesta_origen_id != null &&
            (ids.has(`${String(row.instrumento_origen ?? 'legado')}:${String(row.respuesta_origen_id)}`) || ids.has(`legado:${String(row.respuesta_origen_id)}`)))) {
            throw new UserFacingError('Hay una respuesta ya registrada con información diferente. Revisa el archivo con el docente antes de volver a cargarlo. No se reemplazó ningún dato.');
        }
    }
    if (!fresh.length) return { inserted: 0, skipped: payload.length };
    if (new TextEncoder().encode(JSON.stringify(fresh)).byteLength > 8 * 1024 * 1024) throw new UserFacingError('El archivo contiene demasiada información para guardarla de una vez. Divídelo en archivos más pequeños y vuelve a intentar.');
    const { error, count } = await client.from(table).upsert(fresh, {
        onConflict: 'respuesta_hash', ignoreDuplicates: true, count: 'exact', defaultToNull: false,
    });
    if (error) throw error;
    return { inserted: count, skipped: count == null ? null : payload.length - count };
}
export function databaseMessage(error: unknown): string {
    if (error instanceof UserFacingError) return error.message;
    const info = error as { code?: string; message?: string };
    if (['42703', '42P10', 'PGRST204', 'PGRST205'].includes(info?.code ?? '')) return 'El sistema necesita una actualización antes de guardar. Comunícalo a quien administra la aplicación. Los datos anteriores se conservan.';
    if (info?.code === '42501') return 'Tu sesión no tiene autorización para completar esta acción. Solicita acceso a quien administra la aplicación. No se borró ningún registro.';
    if (/api key|jwt/i.test(info?.message ?? '')) return 'El sistema no pudo conectarse al almacenamiento. Si el problema continúa, comunícalo a quien administra la aplicación.';
    if (info?.code === '23505') return 'Se detectó una respuesta duplicada o una carga simultánea. Actualice la vista e intente nuevamente.';
    return 'No se pudo completar la operación. Comprueba tu conexión e inténtalo nuevamente. Los registros anteriores se conservan.';
}
