import type { SupabaseClient } from '@supabase/supabase-js';
import { buildReport, type ReportParameters } from './reports';
import { sha256 } from './importPipeline';
import { readAllRows } from './surveyRepository';

export async function generateReport(client: SupabaseClient, params: ReportParameters) {
    // Se usa la sesión/RLS del solicitante. Nunca una clave de servicio.
    const [t, e] = await Promise.all([readAllRows(client,'encuesta_titulados'), readAllRows(client,'encuesta_empleadores')]);
    const report = buildReport(t, e, params);
    return { ...report, huella: await sha256(JSON.stringify(report)) };
}
