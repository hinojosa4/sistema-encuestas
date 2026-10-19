import { codigoOrdinal, mapearFilaEmpleador, mapearFilaTitulado, normalizarTexto, parseLikertValue, type Escala } from './dataMappers';
import { graduateFieldLabels, employerFieldLabels, fieldLabel } from './surveyFields';
import { UserFacingError } from './userMessages';

export type SurveyType = 'encuesta_titulados' | 'encuesta_empleadores';
export type Row = Record<string, unknown>;
export type UnitPolicy = 'sin_definir' | 'meses' | 'anios';
export type Quality = { estado: string; detalle?: string };
export type PreparedRow = Row & { raw_data: Row; respuestas_originales: Row; calidad_datos: Record<string, Quality> };
export type Issue = { fila: number; campo: string; mensaje: string };
export const MAX_ROWS = 10000;
export const MAPPING_VERSION = 2;

export const employerScales = [
    'confianza_carrera_formadora', 'consistencia_titulo_competencias', 'consulta_regular_opinion',
    'conocimiento_perfil_egreso', 'coherencia_perfil_desempeno', 'formacion_desempeno_destacado',
    'incorporacion_necesidades_practicas', 'evidencia_competencias_laborales', 'valores_etica_responsabilidad',
    'participacion_evaluacion_desempeno', 'vinculos_oportunidades_laborales', 'participacion_vinculacion_entorno',
    'participacion_difusion_pasantias', 'participacion_intercambio_conocimiento', 'consulta_retroalimentacion_plan',
    'consulta_pertinencia_formacion', 'busqueda_talento_umss', 'consulta_procesos_autoevaluacion',
];
export const graduateScales: Record<string, Escala> = {
    opinion_posgrado_fcyt: 'acuerdo', pertinencia_laboral_carrera: 'acuerdo',
    satisfaccion_global_carrera: 'acuerdo', concordancia_formacion_requerimientos: 'acuerdo',
    satisfaccion_negocio: 'satisfaccion', importancia_formacion_negocio: 'importancia',
};
const multiFields = ['aspectos_utilidad', 'aspectos_mejora', 'asignaturas_ventaja_competitiva', 'asignaturas_menos_utiles', 'cargos_desempenados'];
const yesNoFields = ['ha_realizado_posgrado', 'interes_futuro_posgrado', 'ha_trabajado_antes', 'es_primer_empleo', 'interes_red_contactos', 'ha_contratado_sistemas'];
export const empty = (value: unknown) => value === null || value === undefined || String(value).trim() === '';
export const cleanString = (value: unknown) => String(value ?? '').normalize('NFC').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();

export function parseDuration(value: unknown, kind: 'experiencia' | 'desempleo', policy: UnitPolicy = 'sin_definir') {
    const text = normalizarTexto(cleanString(value).replace(',', '.'));
    if (empty(value)) return { valor: null, estado: 'sin_respuesta' };
    if (kind === 'desempleo' && ['nada', 'ninguno', 'ninguno siempre estuve con trabajo'].includes(text)) return { valor: 0, estado: 'respondida' };
    const match = cleanString(value).toLowerCase().match(/^(\d+(?:[.,]\d+)?)\s*(años?|anios?|mes(?:es)?)?$/);
    if (!match) return { valor: null, estado: 'invalida' };
    const n = Number(match[1].replace(',', '.'));
    if (!Number.isFinite(n) || n < 0) return { valor: null, estado: 'invalida' };
    const unit = match[2] ? (match[2].startsWith('mes') ? 'meses' : 'anios') : kind === 'experiencia' ? 'anios' : policy;
    if (n === 0) return { valor: 0, estado: 'respondida' };
    if (unit === 'sin_definir') return { valor: null, estado: 'invalida', detalle: 'Número sin unidad: seleccione meses o años solo si el docente lo confirma.' };
    const result = kind === 'experiencia' ? (unit === 'meses' ? n / 12 : n) : (unit === 'anios' ? n * 12 : n);
    if (kind === 'experiencia' && result > 100) return { valor: null, estado: 'invalida', detalle: 'Experiencia fuera del rango de revisión (0–100 años).' };
    return { valor: Number(result.toFixed(4)), estado: 'respondida' };
}

export function normalizarSituacion(value: unknown): string | null {
    const s = normalizarTexto(value);
    if (!s) return null;
    if (s.includes('no trabajo') || s.includes('desempleado')) return 'Desempleado / En Búsqueda';
    if (s.includes('emprendimiento')) return 'Emprendimiento Propio';
    if (s.includes('trabajando') || s === 'empleado en organizacion') return 'Empleado en Organización';
    return null;
}
export function normalizarSector(value: unknown): string | null {
    const s = normalizarTexto(value);
    if (s.includes('public') && s.includes('privad')) return 'Mixto';
    if (s.includes('public')) return 'Sector Público';
    if (s.includes('privad')) return 'Sector Privado';
    if (s === 'mixto') return 'Mixto';
    return null;
}

export const employmentIntervals = ['Ya trabajaba antes de titularse', 'Menos de 1 mes', 'Entre 1 - 4 meses', 'Entre 4 - 8 meses', 'Entre 8 - 12 meses', 'Más de 12 meses'];
export function normalizarPlazo(value: unknown): string | null {
    const n = normalizarTexto(value);
    return employmentIntervals.find(label => normalizarTexto(label) === n) ?? null;
}

// Comas dentro de los parentesis de una opcion de Google Forms no son separadores.
export function splitSelections(value: unknown): string[] {
    if (Array.isArray(value)) return [...new Set(value.map(cleanString).filter(Boolean))];
    const text = cleanString(value);
    let depth = 0, current = '';
    const result: string[] = [];
    for (const char of text) {
        if (char === '(') depth++;
        if (char === ')') depth = Math.max(0, depth - 1);
        if (char === ';' || (char === ',' && depth === 0 && !text.includes(';'))) {
            if (current.trim()) result.push(current.trim());
            current = '';
        } else current += char;
    }
    if (current.trim()) result.push(current.trim());
    return [...new Set(result)];
}

export function isAuxiliary(header: string) {
    return /^(puntos|comentarios|hora de|total de puntos)\b/.test(normalizarTexto(header)) ||
        ['id', 'nombre', 'correo electronico', 'marca temporal'].includes(normalizarTexto(header));
}

function map(row: Row, type: SurveyType) {
    return type === 'encuesta_titulados' ? mapearFilaTitulado(row) : mapearFilaEmpleador(row);
}
const headerCache: Record<SurveyType, Map<string, string | undefined>> = {
    encuesta_titulados: new Map(), encuesta_empleadores: new Map(),
};
function mappedField(header: string, type: SurveyType) {
    const cache = headerCache[type];
    if (!cache.has(header)) cache.set(header, Object.keys(map({ [header]: '' }, type)).find(k => k !== 'raw_data'));
    return cache.get(header);
}

export function prepareRow(raw: Row, type: SurveyType, unit: UnitPolicy = 'sin_definir'): PreparedRow {
    const row: Row = { raw_data: raw };
    const originals: Row = {};
    const quality: Record<string, Quality> = {};
    const ordinals: Row = {};
    const selections: Row = {};
    for (const [header, value] of Object.entries(raw)) {
        const field = mappedField(header, type);
        if (field) { originals[field] = value; row[field] = value; }
    }
    const scales = type === 'encuesta_empleadores'
        ? Object.fromEntries(employerScales.map(field => [field, 'empleador' as Escala])) : graduateScales;
    for (const [field, value] of Object.entries(row)) {
        if (field === 'raw_data') continue;
        const original = originals[field] ?? value;
        row[field] = empty(value) ? null : typeof value === 'string' ? cleanString(value) : value;
        quality[field] = { estado: empty(original) ? 'sin_respuesta' : 'respondida' };
        if (field in scales) {
            row[field] = parseLikertValue(original, scales[field]);
            ordinals[field] = codigoOrdinal(original, scales[field]);
            quality[field] = { estado: empty(original) ? 'sin_respuesta' : normalizarTexto(original) === 'no sabe' ? 'no_sabe' : row[field] === null ? 'invalida' : 'respondida' };
        }
        if (multiFields.includes(field)) {
            selections[field] = splitSelections(original);
            row[field] = (selections[field] as string[]).join('; ') || null;
        }
        if (yesNoFields.includes(field) && !empty(original)) {
            const v = normalizarTexto(original);
            row[field] = v === 'si' || v === 'no' ? v.toUpperCase() : null;
            if (row[field] === null) quality[field] = { estado: 'invalida', detalle: 'Se esperaba Sí o No.' };
        }
        if (/^(otra_|otro_)/.test(field) && ['na', 'n a', 'ninguno', 'ninguna', 'nada', 'no', ''].includes(normalizarTexto(original)) && !empty(original)) {
            row[field] = null;
            quality[field] = { estado: 'invalida', detalle: 'Texto de relleno; el original se conserva.' };
        }
    }
    if (type === 'encuesta_titulados') {
        for (const [field, normalize] of [['situacion_laboral_actual', normalizarSituacion], ['sector_empresa_trabajo', normalizarSector], ['tiempo_conseguir_primer_empleo', normalizarPlazo]] as const) {
            row[field] = normalize(originals[field]);
            quality[field] = { estado: empty(originals[field]) ? 'sin_respuesta' : row[field] === null ? 'invalida' : 'respondida' };
        }
        for (const [field, kind, normalized] of [
            ['anios_vida_profesional', 'experiencia', 'anios_vida_profesional_normalizados'],
            ['tiempo_desempleado', 'desempleo', 'tiempo_desempleado_meses'],
        ] as const) {
            const result = parseDuration(originals[field], kind, unit);
            row[`${field}_original`] = empty(originals[field]) ? null : String(originals[field]);
            row[normalized] = result.valor;
            row[field] = result.valor; // Desempleo nuevo siempre en meses; los registros anteriores no se reinterpretan.
            quality[field] = { estado: result.estado, detalle: result.detalle ??
                (kind === 'desempleo' && unit !== 'sin_definir' && /^\d+(?:[.,]\d+)?$/.test(cleanString(originals[field]))
                    ? `Unidad sin escribir confirmada durante la carga: ${unit}.` : undefined) };
        }
        if (row.anios_vida_profesional_normalizados != null && row.tiempo_desempleado_meses != null &&
            Number(row.tiempo_desempleado_meses) > Number(row.anios_vida_profesional_normalizados) * 12) {
            row.tiempo_desempleado_meses = row.tiempo_desempleado = null;
            quality.tiempo_desempleado = { estado: 'invalida', detalle: 'El desempleo declarado supera la vida profesional declarada.' };
        }
        // Ausencias justificadas por saltos conocidos. Nunca borrar respuestas historicas.
        const notApplicable = (fields: string[]) => fields.forEach(field => {
            if (empty(originals[field])) quality[field] = { estado: 'no_aplica' };
            else quality[field] = { estado: 'ruta_desconocida', detalle: 'Respuesta fuera de la ruta actual; se conserva por posibles cambios históricos.' };
        });
        if (row.ha_realizado_posgrado === 'NO') notApplicable(['nivel_posgrado_cursado', 'institucion_posgrado_cursado', 'financiamiento_posgrado_cursado', 'nombre_programa_cursado']);
        if (row.interes_futuro_posgrado === 'NO') notApplicable(['area_interes_posgrado', 'institucion_optaria_posgrado']);
        const work = ['empresa_trabajo_actual', 'rubro_empresa_trabajo', 'otro_rubro_trabajo', 'sector_empresa_trabajo', 'departamento_trabajo', 'area_empresa_trabajo', 'otra_area_trabajo', 'cargo_actual', 'otro_cargo_actual', 'pertinencia_laboral_carrera', 'antiguedad_trabajo_actual', 'medio_obtencion_trabajo', 'remuneracion_mensual'];
        const business = ['origen_emprendimiento', 'tipo_entregable_negocio', 'financiamiento_negocio', 'satisfaccion_negocio', 'importancia_formacion_negocio'];
        if (row.situacion_laboral_actual && row.situacion_laboral_actual !== 'Empleado en Organización') notApplicable(work);
        if (row.situacion_laboral_actual && row.situacion_laboral_actual !== 'Emprendimiento Propio') notApplicable(business);
        if (row.situacion_laboral_actual && row.situacion_laboral_actual !== 'Desempleado / En Búsqueda') notApplicable(['razon_desempleo', 'ha_trabajado_antes']);
        if (row.situacion_laboral_actual === 'Desempleado / En Búsqueda' && row.ha_trabajado_antes === 'NO') notApplicable(['tiempo_conseguir_primer_empleo', 'cantidad_empleos_desempenados']);
        if (['Empleado en Organización', 'Emprendimiento Propio'].includes(String(row.situacion_laboral_actual)) || row.ha_trabajado_antes === 'SI') {
            for (const field of ['tiempo_conseguir_primer_empleo', 'cantidad_empleos_desempenados']) {
                if (empty(originals[field])) quality[field] = { estado: 'ruta_desconocida', detalle: 'Falta una respuesta prevista por la ruta actual; puede corresponder a otra versión del formulario.' };
            }
        }
        if (row.interes_red_contactos === 'NO') notApplicable(['email_contacto', 'telefono_contacto', 'linkedin_url']);
        const source = Object.entries(raw).find(([h]) => normalizarTexto(h) === 'id');
        row.respuesta_origen_id = source && !empty(source[1]) ? String(source[1]) : null;
        for (const [header, value] of Object.entries(raw)) {
            const n = normalizarTexto(header);
            if (n === 'hora de inicio') row.hora_inicio_original = String(value);
            if (n === 'hora de finalizacion') row.hora_finalizacion_original = String(value);
            if (n === 'correo electronico') row.correo_microsoft = cleanString(value);
            if (n === 'nombre') row.nombre_microsoft = cleanString(value);
            if (['ano de egreso', 'anio de egreso', 'anio egreso'].includes(n)) {
                const year = Number(value);
                row.anio_egreso = Number.isInteger(year) && year >= 1900 && year <= new Date().getFullYear() ? year : null;
                quality.anio_egreso = { estado: empty(value) ? 'sin_respuesta' : row.anio_egreso === null ? 'invalida' : 'respondida' };
            }
        }
    } else {
        const temporal = Object.entries(raw).find(([h]) => normalizarTexto(h) === 'marca temporal');
        row.marca_temporal_original = temporal ? String(temporal[1]) : null;
    }
    return { ...row, raw_data: raw, respuestas_originales: originals, codigos_ordinales: ordinals,
        selecciones_multiples: selections, calidad_datos: quality, version_mapeo: MAPPING_VERSION };
}

export function inspectHeaders(headers: string[], type: SurveyType) {
    const detected = new Set(headers.map(h => mappedField(h, type)).filter(Boolean));
    const expected = Object.keys(type === 'encuesta_titulados' ? graduateFieldLabels : employerFieldLabels);
    const missing = expected.filter(field => !detected.has(field));
    const errors = missing.length ? [`El archivo está incompleto para la encuesta seleccionada. Faltan ${missing.length} columnas: ${missing.slice(0, 6).map(fieldLabel).join(', ')}${missing.length > 6 ? ' y otras más' : ''}. Usa la exportación completa del docente o comprueba el tipo de encuesta seleccionado.`] : [];
    const unknownHeaders = headers.filter(h => !isAuxiliary(h) && !/^(nombre|correo electronico|hora de|ano de egreso|anio de egreso|anio egreso)/.test(normalizarTexto(h)) && !mappedField(h, type));
    const destinations = new Set<string>();
    for (const header of headers) {
        const field = mappedField(header, type);
        if (field && destinations.has(field)) errors.push(`Hay dos columnas para «${fieldLabel(field)}». Revisa sus títulos para saber cuál corresponde a cada pregunta.`);
        if (field) destinations.add(field);
    }
    return { errors, missing, unknownHeaders, expected: expected.length, recognized: expected.filter(f => detected.has(f)).length };
}

export function inspectRows(rows: Row[], type: SurveyType, unit: UnitPolicy = 'sin_definir') {
    if (rows.length > MAX_ROWS) throw new UserFacingError(`Este archivo tiene demasiadas respuestas. Usa archivos con hasta ${MAX_ROWS} respuestas.`);
    const headerReview = inspectHeaders(Object.keys(rows[0] ?? {}), type);
    const errors = [...headerReview.errors];
    const required = type === 'encuesta_titulados'
        ? ['anios_vida_profesional', 'situacion_laboral_actual', 'sector_empresa_trabajo']
        : ['nombre_empresa', 'tipo_organizacion', 'confianza_carrera_formadora'];
    const prepared: PreparedRow[] = [], issues: Issue[] = [];
    let emptyRows = 0, duplicates = 0;
    const signatures = new Set<string>(), sourceIds = new Set<string>();
    rows.forEach((raw, index) => {
        const hasAnswers = Object.entries(raw).some(([header, value]) => {
            const field = mappedField(header, type);
            return field && field !== 'correo_electronico' && !empty(value);
        });
        if (!hasAnswers) { emptyRows++; return; }
        const signature = canonicalResponse(raw);
        if (signatures.has(signature)) { duplicates++; return; }
        signatures.add(signature);
        const row = prepareRow(raw, type, unit);
        const sourceRow = typeof raw.__rowNum__ === 'number' ? raw.__rowNum__ + 1 : index + 2;
        row.fila_origen = sourceRow;
        if (!empty(row.respuesta_origen_id)) {
            const id = String(row.respuesta_origen_id);
            if (sourceIds.has(id)) errors.push(`El identificador ${id} aparece con respuestas diferentes (fila ${sourceRow}).`);
            sourceIds.add(id);
        }
        prepared.push(row);
        for (const [field, status] of Object.entries(row.calidad_datos)) {
            if (['invalida', 'ruta_desconocida'].includes(status.estado) ||
                (status.estado === 'sin_respuesta' && required.includes(field))) {
                issues.push({ fila: sourceRow, campo: field, mensaje: status.detalle ??
                    (status.estado === 'sin_respuesta' ? 'Falta una respuesta para esta pregunta.' :
                        status.estado === 'ruta_desconocida' ? 'Esta respuesta necesita revisión porque el cuestionario pudo cambiar.' :
                            'No se pudo interpretar esta respuesta; el valor original se conserva.') });
            }
        }
    });
    if (!prepared.length && (!rows.length || !errors.length)) {
        errors.length = 0;
        errors.push('La hoja seleccionada no tiene respuestas. Elige otra hoja o carga un archivo que contenga respuestas debajo de los títulos.');
    }
    return { rows: prepared, issues, errors, unknownHeaders: headerReview.unknownHeaders, emptyRows, duplicates,
        expectedFields: headerReview.expected, recognizedFields: headerReview.recognized };
}

export async function sha256(text: string | ArrayBuffer) {
    if (!globalThis.crypto?.subtle) throw new Error('La carga requiere HTTPS o acceso desde localhost para identificar los archivos de forma segura.');
    const bytes = typeof text === 'string' ? new TextEncoder().encode(text) : text;
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
export function canonicalResponse(raw: Row) {
    const entries = Object.entries(raw).filter(([h]) => !/^(puntos|comentarios|total de puntos)\b/.test(normalizarTexto(h)))
        .map(([h, v]) => [cleanString(h), typeof v === 'object' && v !== null ? JSON.stringify(v) : cleanString(v)] as const)
        .sort(([a], [b]) => a.localeCompare(b, 'es'));
    return JSON.stringify(entries);
}
export const responseHash = (raw: Row) => sha256(canonicalResponse(raw));

export function normalizeStored(row: Row, type: SurveyType): Row {
    if (row.version_mapeo === MAPPING_VERSION) return row;
    if (row.raw_data && typeof row.raw_data === 'object' && !Array.isArray(row.raw_data)) {
        const prepared = prepareRow(row.raw_data as Row, type);
        return { ...row, ...prepared };
    }
    return row;
}

// Neutraliza texto interpretable como formula al exportar tablas para Excel/CSV.
export function safeSpreadsheetValue(value: unknown): string | number | boolean {
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    const text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value);
    return /^\s*[=+@-]/.test(text) ? `'${text}` : text;
}
