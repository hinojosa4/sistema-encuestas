import headers from './surveyHeaders.json';
import { graduateFieldLabels, employerFieldLabels } from './surveyFields';
import { employerScales, graduateScales, empty, type Row } from './importPipeline';
import { normalizarTexto } from './dataMappers';

const multiple = new Set(['aspectos_utilidad', 'aspectos_mejora', 'asignaturas_ventaja_competitiva', 'asignaturas_menos_utiles', 'cargos_desempenados']);
const binary = new Set(['ha_realizado_posgrado', 'interes_futuro_posgrado', 'ha_trabajado_antes', 'es_primer_empleo', 'interes_red_contactos', 'ha_contratado_sistemas']);
const quantitative = new Set(['anios_vida_profesional', 'tiempo_desempleado', 'cantidad_empleos_desempenados']);
const ordered = new Set(['edad', 'tamano_organizacion', 'tiempo_conseguir_primer_empleo', 'antiguedad_trabajo_actual', 'remuneracion_mensual']);
const open = new Set(['areas_emergentes_importantes', 'herramientas_tecnologicas_demandadas', 'habilidades_fundamentales', 'nombre_programa_cursado']);
const postgrad = new Set(['nivel_posgrado_cursado', 'institucion_posgrado_cursado', 'financiamiento_posgrado_cursado', 'nombre_programa_cursado']);
const work = new Set(['empresa_trabajo_actual', 'rubro_empresa_trabajo', 'sector_empresa_trabajo', 'departamento_trabajo', 'area_empresa_trabajo', 'cargo_actual', 'pertinencia_laboral_carrera', 'antiguedad_trabajo_actual', 'medio_obtencion_trabajo', 'remuneracion_mensual']);
export function applicable(row: Row, field: string): boolean | null {
    const route = postgrad.has(field) ? ['ha_realizado_posgrado', 'si'] : ['area_interes_posgrado', 'institucion_optaria_posgrado'].includes(field) ? ['interes_futuro_posgrado', 'si'] : work.has(field) ? ['situacion_laboral_actual', 'empleado en organizacion'] : field.startsWith('satisfaccion_negocio') || field === 'importancia_formacion_negocio' ? ['situacion_laboral_actual', 'emprendimiento propio'] : null;
    if (!route) return true;
    if (empty(row[route[0]])) return null;
    return normalizarTexto(row[route[0]]) === route[1];
}

export const dataDictionary = (['encuesta_titulados', 'encuesta_empleadores'] as const).flatMap(source => {
    const labels = source === 'encuesta_titulados' ? graduateFieldLabels : employerFieldLabels;
    return Object.entries(labels).map(([id, label]) => {
        const rating = source === 'encuesta_empleadores' ? employerScales.includes(id) : id in graduateScales;
        const exact = (headers[source] as Record<string, string[]>)[id] ?? [];
        return { id, encuesta: source, nombre: label, pregunta_original: exact[0] ?? label, encabezados_excel: exact,
            tipo: rating ? 'escala ordinal' : multiple.has(id) ? 'selección múltiple' : binary.has(id) ? 'binaria' : quantitative.has(id) ? 'cuantitativa' : open.has(id) || /otra_|otro_|nombre|contacto|correo|linkedin/.test(id) ? 'texto libre' : 'categórica',
            nivel: rating || ordered.has(id) ? 'ordinal' : quantitative.has(id) ? 'cuantitativo' : 'nominal',
            categorias: rating ? source === 'encuesta_empleadores' ? ['Totalmente desacuerdo', 'Parcialmente de acuerdo', 'Totalmente de acuerdo', 'No sabe'] : id === 'satisfaccion_negocio' ? ['Insatisfecho', 'Algo satisfecho', 'Satisfecho'] : id === 'importancia_formacion_negocio' ? ['No es importante', 'Poco importante', 'Importante', 'Muy importante'] : ['Totalmente en desacuerdo', 'En desacuerdo', 'De acuerdo', 'Totalmente de acuerdo'] : binary.has(id) ? ['Sí', 'No'] : id === 'nivel_posgrado_cursado' ? ['Diplomado', 'Especialidad', 'Maestría', 'Doctorado', 'Posdoctorado'] : ['Categorías declaradas en el instrumento; texto original conservado'],
            limpieza: quantitative.has(id) ? 'Solo números finitos; experiencia en años; desempleo sin unidad explícita no se interpreta. Sin imputación.' : 'Espacios y Unicode NFC en derivados; originales intactos. No inferir categorías nominales.',
            aplicabilidad: postgrad.has(id) ? 'Formación complementaria = Sí' : ['area_interes_posgrado', 'institucion_optaria_posgrado'].includes(id) ? 'Interés en posgrado = Sí' : work.has(id) ? 'Trabaja en una organización' : 'Según ruta y calidad registradas; consultar bases',
            faltantes: 'Vacío, No sabe, No aplica, no interpretable y ruta no confirmada se cuentan separados, nunca como cero.',
            estadisticas: quantitative.has(id) ? 'n, media, mediana, modas, mínimo, máximo, rango, varianza y desviación muestral, CV, cuartiles y percentiles (tipo 7)' : rating ? 'Frecuencias, porcentajes, moda, mediana; media y DE de códigos solo como índice descriptivo ordinal' : 'Frecuencias, porcentajes y moda; selección múltiple por persona; texto libre por temas revisables',
            cruces: postgrad.has(id) ? 'A: nivel cursado × financiamiento' : ['area_interes_posgrado', 'anios_vida_profesional', 'ha_realizado_posgrado'].includes(id) ? 'B: área × experiencia; C: experiencia × formación' : ['tipo_organizacion', 'ha_contratado_sistemas'].includes(id) ? 'D: tipo × contratación' : 'Descripción; sin media de códigos nominales',
        };
    });
});

export function variableCoverage(rows: Row[], field: string) {
    const result = { total: rows.length, aplicable: 0, validas: 0, sinRespuesta: 0, noAplica: 0, noSabe: 0, noInterpretable: 0, rutaNoConfirmada: 0 };
    for (const row of rows) {
        const route = applicable(row, field);
        const quality = (row.calidad_datos ?? {}) as Record<string, { estado?: string }>;
        const state = quality[field]?.estado;
        if (route === false || state === 'no_aplica') { result.noAplica++; continue; }
        if (route === null) { result.rutaNoConfirmada++; continue; }
        result.aplicable++;
        if (state === 'no_sabe' || normalizarTexto(row[field]) === 'no sabe') result.noSabe++;
        else if (state === 'invalida' || state === 'no_interpretable') result.noInterpretable++;
        else if (state === 'ruta_desconocida') result.rutaNoConfirmada++;
        else if (empty(row[field])) result.sinRespuesta++;
        else result.validas++;
    }
    return { ...result, denominador: result.validas };
}
