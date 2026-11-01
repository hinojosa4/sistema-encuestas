import type { SupabaseClient } from '@supabase/supabase-js';
import { canonicalResponse, sha256, sourceRecordKey, type Row, type SurveyType } from './importPipeline';
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
export async function savePreparedRows(client: SupabaseClient, table: SurveyType, payload: Row[]) {
    const stored = await readAllRows(client, table, 'id,raw_data,respuesta_origen_id,instrumento_origen,archivo_sha256,hoja_origen,fila_origen');
    const known = new Map<string, Row>();
    for (const row of stored) {
        const key = sourceRecordKey(row, table);
        if (key) known.set(key, row);
    }
    const fresh: Row[] = [];
    for (const row of payload) {
        const key = sourceRecordKey(row, table);
        const previous = key ? known.get(key) : undefined;
        if (previous) {
            if (!previous.raw_data || !row.raw_data ||
                canonicalResponse(previous.raw_data as Row) !== canonicalResponse(row.raw_data as Row)) {
                throw new UserFacingError('Hay un envío ya registrado con información diferente. Revisa el archivo con el docente. No se reemplazó ningún dato.');
            }
            continue;
        }
        // Sin origen identificable cada fila se conserva, aunque su contenido sea igual.
        fresh.push({ ...row, respuesta_hash: await sha256(key ?? `sin-identificador:${crypto.randomUUID()}`) });
        if (key) known.set(key, row);
    }
    if (!fresh.length) return { inserted: 0, skipped: payload.length };
    if (new TextEncoder().encode(JSON.stringify(fresh)).byteLength > 8 * 1024 * 1024) throw new UserFacingError('El archivo contiene demasiada información para guardarla de una vez. Divídelo en archivos más pequeños y vuelve a intentar.');
    const { error, count } = await client.from(table).upsert(fresh, {
        onConflict: 'respuesta_hash', ignoreDuplicates: true, count: 'exact', defaultToNull: false,
    });
    if (error) throw error;
    return { inserted: count, skipped: count == null ? null : payload.length - count };
}
export type ReplacementPreview = { version: string; empleadores: number; titulados: number };
export async function previewEmployerReplacement(client: SupabaseClient): Promise<ReplacementPreview> {
    const { data, error } = await client.rpc('previsualizar_reemplazo_empleadores');
    if (error) throw error;
    if (!data || typeof data.version !== 'string' || !Number.isSafeInteger(data.empleadores) || !Number.isSafeInteger(data.titulados)) throw new UserFacingError('No se pudo validar el resumen de reemplazo.');
    return data;
}
export async function replaceEmployerRows(client: SupabaseClient, payload: Row[], preview: ReplacementPreview) {
    if (!payload.length) throw new UserFacingError('No se puede reemplazar con un archivo vacío.');
    const rows = await Promise.all(payload.map(async row => {
        const key = sourceRecordKey(row, 'encuesta_empleadores');
        if (!key) throw new UserFacingError('Cada fila necesita procedencia verificable antes del reemplazo.');
        return { ...row, respuesta_hash: await sha256(key) };
    }));
    const { data, error } = await client.rpc('reemplazar_encuesta_empleadores', { p_filas: rows, p_version_esperada: preview.version });
    if (error) throw error;
    if (!data || data.inserted !== rows.length || typeof data.sin_cambios !== 'boolean' || (!data.sin_cambios && typeof data.respaldo_id !== 'string')) throw new UserFacingError('No se pudo confirmar el resultado. Revisa la base y el historial antes de repetir.');
    return data as { inserted: number; sin_cambios: boolean; respaldo_id: string | null };
}
export function databaseMessage(error: unknown): string {
    if (error instanceof UserFacingError) return error.message;
    const info = error as { code?: string; message?: string };
    if (['PGRST202', '42883'].includes(info?.code ?? '')) return 'La función solicitada no está instalada. El responsable debe aplicar scripts/reemplazo_seguro_empleadores.sql en Supabase y recargar esta página.';
    if (info?.code === '40001') return 'Los datos cambiaron desde la vista previa. Recarga y revisa el resumen antes de confirmar nuevamente.';
    if (info?.code === '23503') return 'Hay relaciones con otras tablas que impiden el reemplazo seguro. El responsable debe revisar esas relaciones. No se reemplazó ningún dato.';
    if (info?.code === '22023') return 'La operación contiene filas o una revisión inválidas. Revisa el archivo y vuelve a preparar la vista previa.';
    if (info?.code === '42703' || info?.code === 'PGRST204') return 'Faltan columnas necesarias para la carga. El responsable de Supabase debe ejecutar scripts/habilitar_carga_validada.sql. Referencia: CARGA-COLUMNAS.';
    if (info?.code === '42P10') return 'Falta el índice para evitar respuestas duplicadas. El responsable de Supabase debe ejecutar scripts/habilitar_carga_validada.sql. Referencia: CARGA-INDICE.';
    if (info?.code === 'PGRST205') return 'La tabla de encuestas no está disponible en la API. Revisa el proyecto conectado y el esquema en Supabase. Referencia: CARGA-TABLA.';
    if (info?.code === '42501') return 'Tu sesión no tiene autorización para completar esta acción. Solicita acceso a quien administra la aplicación. No se borró ningún registro.';
    if (/api key|jwt/i.test(info?.message ?? '')) return 'El sistema no pudo conectarse al almacenamiento. Si el problema continúa, comunícalo a quien administra la aplicación.';
    if (info?.code === '23505') return 'Se detectó una respuesta duplicada o una carga simultánea. Actualice la vista e intente nuevamente.';
    return 'No se pudo completar la operación. Comprueba tu conexión e inténtalo nuevamente. Los registros anteriores se conservan.';
}
