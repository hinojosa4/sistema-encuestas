import { calcularDistribucionFrecuencias, calcularEstadisticasUnivariadas } from './statistics';
import { normalizarPlazo, normalizarSector, normalizarSituacion, type Row } from './importPipeline';

export function resumirEmpleabilidad(rows: Row[], limiteExperiencia = 3, anioReferencia = new Date().getFullYear()) {
    const years = rows.map(r => r.anios_vida_profesional_normalizados)
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0);
    const unemployment = rows.map(r => r.tiempo_desempleado_meses)
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0);
    const situation = rows.map(r => normalizarSituacion(r.situacion_laboral_actual));
    const validStatus = situation.filter((v): v is string => v !== null);
    const employed = validStatus.filter(v => v !== 'Desempleado / En Búsqueda').length;
    const sectors = rows.filter(r => normalizarSituacion(r.situacion_laboral_actual) === 'Empleado en Organización')
        .map(r => normalizarSector(r.sector_empresa_trabajo)).filter((v): v is string => v !== null);
    const intervals = rows.map(r => normalizarPlazo(r.tiempo_conseguir_primer_empleo))
        .filter((v): v is string => v !== null);
    const early = intervals.filter(s => ['Ya trabajaba antes de titularse', 'Menos de 1 mes', 'Entre 1 - 4 meses'].includes(s)).length;
    const pct = (n: number, total: number) => total ? Number((n / total * 100).toFixed(1)) : null;
    const juniorCount = years.filter(v => v <= limiteExperiencia).length;
    const groups = [['0–3 años', (v: number) => v <= 3], ['Más de 3–10 años', (v: number) => v > 3 && v <= 10], ['Más de 10 años', (v: number) => v > 10]] as const;
    const cohortRows = rows.filter(r => typeof r.anio_egreso === 'number' && Number.isInteger(r.anio_egreso) && r.anio_egreso >= 1900 && r.anio_egreso <= anioReferencia);
    const cohorts = calcularDistribucionFrecuencias(cohortRows.map(r => String(r.anio_egreso)));
    const ocupacionPorCohorte = [...cohorts].sort((a,b)=>Number(a.nombre)-Number(b.nombre)).map(cohort => {
        const group = cohortRows.filter(r=>String(r.anio_egreso)===cohort.nombre);
        const valid = group.map(r=>normalizarSituacion(r.situacion_laboral_actual)).filter((v):v is string=>v!==null);
        const working = valid.filter(v=>v!=='Desempleado / En Búsqueda').length;
        return { anio: Number(cohort.nombre), respuestas: group.length, ocupados: working, base: valid.length, excluidos: group.length-valid.length, porcentaje: pct(working,valid.length) };
    });
    return {
        experiencia: calcularEstadisticasUnivariadas(years), desempleo: calcularEstadisticasUnivariadas(unemployment),
        experienciaExcluidos: rows.length - years.length, desempleoExcluidos: rows.length - unemployment.length,
        situaciones: calcularDistribucionFrecuencias(validStatus), sectores: calcularDistribucionFrecuencias(sectors),
        plazos: calcularDistribucionFrecuencias(intervals), experienciaGrupos: groups.map(([nombre, test]) => ({ nombre, cantidad: years.filter(test).length })),
        ocupacion: { cantidad: employed, validos: validStatus.length, excluidos: rows.length - validStatus.length, porcentaje: pct(employed, validStatus.length) },
        insercion: { cantidad: early, validos: intervals.length, excluidos: rows.length - intervals.length, porcentaje: pct(early, intervals.length) },
        segmentacion: { juniorCount, consolidadoCount: years.length - juniorCount, juniorPct: pct(juniorCount, years.length) ?? 0,
            consolidadoPct: pct(years.length - juniorCount, years.length) ?? 0 },
        cohortes: cohorts,
        egreso: { anioReferencia, estadisticas: calcularEstadisticasUnivariadas(cohortRows.map(r=>anioReferencia-Number(r.anio_egreso))), excluidos: rows.length-cohortRows.length },
        ocupacionPorCohorte,
    };
}
export type EmployabilitySummary = ReturnType<typeof resumirEmpleabilidad>;
