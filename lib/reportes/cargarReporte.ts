import { REPORT_VERSION, type AnalysisReport } from '@/lib/reports';
import { UserFacingError } from '@/lib/userMessages';
import type { GraduateScope } from '@/lib/competencies';

/**
 * Obtiene el reporte estadístico y valida la respuesta del servidor.
 */
export async function cargarReporteEstadistico(
    alcance: GraduateScope,
    corte: number,
    senal?: AbortSignal,
): Promise<AnalysisReport> {
    const respuesta = await fetch(`/api/reports?scope=${alcance}&corte=${corte}`, {
        signal: senal,
        cache: 'no-store',
        credentials: 'same-origin',
    });

    const datos = await respuesta.json();
    if (!respuesta.ok) {
        throw new UserFacingError(
            typeof datos.error === 'string' ? datos.error : 'No se pudo generar el reporte.',
        );
    }

    if (
        datos.version !== REPORT_VERSION ||
        typeof datos.huella !== 'string' ||
        !Array.isArray(datos.tablas)
    ) {
        throw new UserFacingError(
            'El generador devolvió un reporte incompatible. Actualiza la página y vuelve a intentar.',
        );
    }

    return datos as AnalysisReport;
}
