import { normalizeStored, safeSpreadsheetValue, type Row } from './importPipeline';
import { exportCompetencies, resumirCompetencias, type GraduateScope } from './competencies';
import { resumirEmpleabilidad } from './employability';
import { filasCruceFinanciamiento, resumirFinanciamiento, resumirFormacion } from './postgraduate';
import { calcularDistribucionFrecuencias } from './statistics';

export const REPORT_VERSION = '2026-10-19.3';
export type ReportCell = string | number | null;
export type ReportTable = { nombre: string; descripcion: string; columnas: string[]; filas: ReportCell[][] };
export type ReportParameters = { scope: GraduateScope; corte: number };

export function parseReportParameters(params: URLSearchParams): ReportParameters {
    const scope = params.get('scope') ?? 'experiencia';
    const value = params.get('corte') ?? '3';
    if (!['experiencia', 'todos'].includes(scope) || !/^\d{1,2}$/.test(value) || Number(value) > 30) throw new Error('INVALID_REPORT_PARAMETERS');
    return { scope: scope as GraduateScope, corte: Number(value) };
}

const cell = (value: unknown): ReportCell => value == null ? null : typeof value === 'number' ? Number.isFinite(value) ? value : null : String(value);
const table = (nombre: string, descripcion: string, rows: Row[], fallback: string[] = []): ReportTable => {
    const columnas = [...new Set(rows.flatMap(r => Object.keys(r)))];
    return { nombre, descripcion, columnas: columnas.length ? columnas : fallback, filas: rows.map(r => columnas.map(k => cell(r[k]))) };
};

function sources(rows: Row[], tipo: string) {
    const groups = new Map<string, Row>();
    for (const r of rows) {
        const data = {
            tipo, archivo: cell(r.archivo_nombre) ?? 'Sin nombre registrado',
            sha256_archivo: cell(r.archivo_sha256), hoja: cell(r.hoja_origen),
            instrumento: cell(r.instrumento_origen), version_instrumento: cell(r.version_instrumento),
            version_mapeo: cell(r.version_mapeo), importacion_id: cell(r.importacion_id),
        };
        const key = JSON.stringify(data);
        const entry = groups.get(key) ?? { ...data, respuestas: 0 };
        entry.respuestas = Number(entry.respuestas) + 1; groups.set(key, entry);
    }
    return [...groups.values()];
}

export function buildReport(rawGraduates: Row[], rawEmployers: Row[], params: ReportParameters, generatedAt = new Date().toISOString()) {
    const g = rawGraduates.map(r => normalizeStored(r, 'encuesta_titulados'));
    const e = rawEmployers.map(r => normalizeStored(r, 'encuesta_empleadores'));
    const hu1 = resumirEmpleabilidad(g, params.corte, new Date(generatedAt).getUTCFullYear());
    const hu2 = resumirFormacion(g);
    const hu3 = resumirFinanciamiento(g);
    const hu4 = resumirCompetencias(g, e, params.scope);
    const exported = exportCompetencies(hu4);
    const c = hu3.chi;
    const tables: ReportTable[] = [
        table('Resumen', 'Indicadores y sus bases. Los ceros reales se conservan; ausencias numéricas quedan vacías.', [
            { indicador: 'Experiencia profesional: media (años)', valor: hu1.experiencia.total ? hu1.experiencia.media : null, base_valida: hu1.experiencia.total, excluidas: hu1.experienciaExcluidos },
            { indicador: 'Experiencia: mediana (años)', valor: hu1.experiencia.total ? hu1.experiencia.mediana : null, base_valida: hu1.experiencia.total },
            { indicador: 'Experiencia: desviación muestral', valor: hu1.experiencia.total > 1 ? hu1.experiencia.desviacionEstandar : null, base_valida: hu1.experiencia.total },
            { indicador: 'Ocupación actual (%)', valor: hu1.ocupacion.porcentaje, base_valida: hu1.ocupacion.validos, excluidas: hu1.ocupacion.excluidos },
            { indicador: 'Primer empleo temprano (%)', valor: hu1.insercion.porcentaje, base_valida: hu1.insercion.validos, excluidas: hu1.insercion.excluidos },
            { indicador: 'Interesados en posgrado', valor: hu2.interesados, base_valida: hu2.interesados + hu2.sinInteres, excluidas: hu2.interesNoUtilizable },
            { indicador: 'Concentración de dos áreas (%)', valor: hu2.concentracion.total ? hu2.concentracion.porcentaje : null, base_valida: hu2.concentracion.total },
            { indicador: 'Financiamiento con beca total/parcial (%)', valor: hu3.porcentajeBeca, base_valida: hu3.fuentesValidas },
        ]),
        table('HU1_Ocupacion', 'Situaciones laborales reconocidas.', hu1.situaciones, ['nombre','cantidad','porcentaje']),
        table('HU1_Plazos', 'Plazos declarados hasta el primer empleo; no seguimiento de cohortes.', hu1.plazos, ['nombre','cantidad','porcentaje']),
        table('HU1_Sectores', 'Solo quienes trabajan en organización y declaran sector reconocido.', hu1.sectores, ['nombre','cantidad','porcentaje']),
        table('HU1_Experiencia', 'Grupos fijos; el corte exploratorio se exporta aparte.', hu1.experienciaGrupos, ['nombre','cantidad']),
        table('Egreso_Distribucion', 'Años explícitos válidos; no se infieren desde la experiencia laboral.', hu1.cohortes, ['nombre','cantidad','porcentaje']),
        table('Egreso_Ocupacion', 'Ocupación actual por cohorte entre quienes respondieron. No es seguimiento longitudinal.', hu1.ocupacionPorCohorte, ['anio','respuestas','ocupados','base','excluidos','porcentaje']),
        table('Egreso_Estadisticos', 'Diferencias entre años calendario; no antigüedad exacta desde una fecha de titulación.', [{
            anio_referencia: hu1.egreso.anioReferencia, base: hu1.egreso.estadisticas.total, excluidos: hu1.egreso.excluidos,
            media: hu1.egreso.estadisticas.total ? hu1.egreso.estadisticas.media : null,
            mediana: hu1.egreso.estadisticas.total ? hu1.egreso.estadisticas.mediana : null,
            desviacion_muestral: hu1.egreso.estadisticas.total>1 ? hu1.egreso.estadisticas.desviacionEstandar : null,
        }]),
        table('HU1_Corte', `Segmentación descriptiva con corte de ${params.corte} años. No identifica cargos.`, [
            { grupo: `Hasta ${params.corte} años`, cantidad: hu1.segmentacion.juniorCount, porcentaje: hu1.experiencia.total ? hu1.segmentacion.juniorPct : null },
            { grupo: `Más de ${params.corte} años`, cantidad: hu1.segmentacion.consolidadoCount, porcentaje: hu1.experiencia.total ? hu1.segmentacion.consolidadoPct : null },
        ]),
        table('HU2_Areas', 'Áreas declaradas solo entre interesados; porcentajes sobre quienes respondieron área.', hu2.areas, ['nombre','cantidad','porcentaje']),
        table('HU2_Niveles_Cursados', 'Antecedentes: no niveles deseados.', hu2.niveles, ['nombre','cantidad','porcentaje']),
        table('HU3_Fuentes', 'Fuentes utilizadas; no financiamiento futuro.', hu3.distribucion, ['nombre','cantidad','porcentaje']),
        table('HU3_Celdas', 'Tabla larga: observadas, porcentajes por nivel, esperadas y bases.', filasCruceFinanciamiento(hu3), ['nivel_cursado','financiamiento_utilizado','cantidad','porcentaje_del_nivel','frecuencia_esperada','base_cruce']),
    ];
    for (const view of ['observadas', 'porcentajes', 'esperadas'] as const) {
        tables.push({
            nombre: `HU3_Matriz_${view}`, descripcion: view === 'observadas' ? 'Matriz de doble entrada. Totales en personas.' : view === 'porcentajes' ? 'Porcentajes por fila; los totales del borde siguen siendo cantidades de personas.' : 'Valores teóricos bajo independencia. No son personas adicionales.',
            columnas: ['Nivel cursado', ...c.columnas, 'Total (personas)'],
            filas: [...c.filas.map((nivel, i) => [nivel, ...c.columnas.map((_, j) => view === 'observadas' ? c.matriz[i][j] : view === 'porcentajes' ? c.matriz[i][j] / c.totalesFila[i] * 100 : c.esperadas[i][j]), c.totalesFila[i]]),
                ['Total (personas)', ...c.totalesColumna, c.total]],
        });
    }
    tables.push(table('HU3_Contraste', 'Pearson sin Yates. No se publica p asintótico si hay esperadas bajas.', [
        { indicador: 'Estado', valor: c.estado }, { indicador: 'Base', valor: c.total },
        { indicador: 'Chi-cuadrada', valor: c.chi2 }, { indicador: 'Grados de libertad', valor: c.gradosLibertad },
        { indicador: 'p-valor asintótico', valor: c.pValor }, { indicador: 'Alfa', valor: c.alfa },
        { indicador: 'Esperadas menores de 5', valor: c.celdasMenor5 }, { indicador: 'Mínima esperada', valor: c.minimaEsperada },
        ...Object.entries(hu3.exclusiones).map(([k,v])=>({ indicador: `Exclusión: ${k}`, valor: v })),
    ]));
    for (const [key, name] of [['estadisticas','HU4_Estadisticos'],['categorias','HU4_Categorias'],['selecciones','HU4_Mejoras'],['temas','HU4_Demanda'],['metodologia','HU4_Metodologia']] as const) {
        tables.push(table(name, 'HU4 conserva escalas nativas y población seleccionada; consultar metodología.', exported[key], ['Sin filas disponibles']));
    }
    tables.push(table('Procedencia', 'Procedencia registrada por respuesta. No prueba una auditoría independiente del archivo.', [...sources(rawGraduates,'titulados'), ...sources(rawEmployers,'empleadores')], ['tipo','archivo','respuestas']));
    tables.push(table('Metodologia', 'Parámetros, bases y limitaciones de esta generación.', [
        { indicador: 'Versión del reporte', valor: REPORT_VERSION }, { indicador: 'Generado (UTC)', valor: generatedAt },
        { indicador: 'Titulados leídos', valor: g.length }, { indicador: 'Empleadores leídos', valor: e.length },
        { indicador: 'Corte de experiencia (años)', valor: params.corte }, { indicador: 'Población HU4', valor: params.scope },
        { indicador: 'Interesados sin área', valor: hu2.sinArea }, { indicador: 'Áreas fuera de ruta', valor: hu2.areasFueraRuta },
        { indicador: 'Alcance', valor: 'Análisis descriptivo de quienes respondieron; no prueba causalidad ni representatividad.' },
        { indicador: 'Años de egreso válidos', valor: hu1.egreso.estadisticas.total },
        { indicador: 'Respuestas sin año de egreso válido', valor: hu1.egreso.excluidos },
        { indicador: 'Datos no recogidos por el instrumento original', valor: 'Nivel deseado, financiamiento futuro y suficiencia por competencia.' },
        { indicador: 'Concurrencia', valor: 'Lectura paginada de dos tablas; no es una instantánea transaccional. Evitar cambios durante la generación.' },
    ]));
    for (const [rows, field, name] of [
        [g,'edad','Perfil_Edad'], [g,'genero','Perfil_Genero'],
        [e,'tipo_organizacion','Sector_Tipo_Organizacion'], [e,'tamano_organizacion','Sector_Tamano'],
        [e,'rubro_sector','Sector_Rubro'], [e,'nivel_formacion_demandado','Sector_Formacion'],
        [e,'probabilidad_incorporacion_futura','Sector_Contratacion'],
    ] as const) {
        tables.push(table(name, 'Distribución de respuestas declaradas no vacías; no representa estimaciones de toda la población.', calcularDistribucionFrecuencias(rows.map(r=>String(r[field] ?? '').trim()).filter(Boolean)), ['nombre','cantidad','porcentaje']));
    }
    const radarGroups = [
        { titulo: 'Perfil y competencias laborales', items: hu4.perfilEmpleadores.filter(r => ['confianza_carrera_formadora','consistencia_titulo_competencias','coherencia_perfil_desempeno','evidencia_competencias_laborales','valores_etica_responsabilidad'].includes(r.campo)) },
        { titulo: 'Vinculación institucional', items: hu4.vinculacion.filter(r => ['busqueda_talento_umss','vinculos_oportunidades_laborales','participacion_difusion_pasantias','consulta_retroalimentacion_plan','consulta_procesos_autoevaluacion'].includes(r.campo)) },
    ];
    return {
        version: REPORT_VERSION, generadoUTC: generatedAt, parametros: params,
        titulados: g.length, empleadores: e.length, tablas: tables,
        cruce: { filas: c.filas, columnas: c.columnas, observadas: c.matriz, esperadas: c.esperadas, totalesFila: c.totalesFila, total: c.total, estado: c.estado },
        radares: radarGroups.map(group => ({ titulo: group.titulo, ejes: group.items.map(r => ({ nombre: r.titulo, media: r.media, validas: r.validas })), maximo: 3 })),
    };
}
export type AnalysisReport = ReturnType<typeof buildReport> & { huella: string };

export function tableToCsv(t: ReportTable) {
    const escape = (value: ReportCell) => `"${String(safeSpreadsheetValue(value) ?? '').replace(/"/g, '""')}"`;
    return '\ufeff' + [t.columnas, ...t.filas].map(row => row.map(escape).join(',')).join('\r\n');
}
