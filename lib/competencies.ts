import { codigoOrdinal, normalizarTexto } from './dataMappers';
import { cleanString, employerScales, normalizarSituacion, splitSelections, type Row } from './importPipeline';
import { calcularEstadisticasUnivariadas } from './statistics';
import { fieldLabel } from './surveyFields';

export type GraduateScope = 'experiencia' | 'todos';
const object = (value: unknown): Row => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
const graduateCategories = ['Totalmente en desacuerdo', 'En desacuerdo', 'De acuerdo', 'Totalmente de acuerdo'];
const employerCategories = ['Totalmente en desacuerdo', 'Parcialmente de acuerdo', 'Totalmente de acuerdo'];
export const hasWorkExperience = (row: Row) => {
    const status = normalizarSituacion(row.situacion_laboral_actual);
    return status === 'Empleado en Organización' || status === 'Emprendimiento Propio' ||
        normalizarTexto(row.ha_trabajado_antes) === 'si' ||
        (typeof row.anios_vida_profesional_normalizados === 'number' && Number.isFinite(row.anios_vida_profesional_normalizados) && row.anios_vida_profesional_normalizados > 0);
};

export function summarizeRating(rows: Row[], campo: string, fuente: 'Titulados' | 'Empleadores') {
    const isEmployer = fuente === 'Empleadores';
    const labels = isEmployer ? employerCategories : graduateCategories;
    const counts = labels.map(() => 0);
    const excluded = { sinRespuesta: 0, noSabe: 0, noAplica: 0, invalida: 0, rutaDesconocida: 0 };
    for (const row of rows) {
        const state = object(object(row.calidad_datos)[campo]).estado;
        if (campo === 'pertinencia_laboral_carrera' && normalizarSituacion(row.situacion_laboral_actual) !== 'Empleado en Organización') { excluded.noAplica++; continue; }
        if (state === 'no_aplica') { excluded.noAplica++; continue; }
        if (state === 'ruta_desconocida') { excluded.rutaDesconocida++; continue; }
        const originals = object(row.respuestas_originales);
        const original = Object.hasOwn(originals, campo) ? originals[campo] : row[campo];
        if (normalizarTexto(original) === 'no sabe' || state === 'no_sabe') { excluded.noSabe++; continue; }
        if (state === 'invalida') { excluded.invalida++; continue; }
        const nativeCode = object(row.codigos_ordinales)[campo];
        let code = codigoOrdinal(original, isEmployer ? 'empleador' : 'acuerdo');
        // El instrumento empleador escribe "Totalmente desacuerdo"; se acepta
        // también la variante gramatical, conservando su significado de código 1.
        if (code === null && isEmployer && normalizarTexto(original) === 'totalmente en desacuerdo') code = 1;
        if (code === null && typeof nativeCode === 'number' && Number.isInteger(nativeCode) && nativeCode >= 1 && nativeCode <= labels.length) code = nativeCode;
        if (code === null) {
            if (original == null || cleanString(original) === '') excluded.sinRespuesta++;
            else excluded.invalida++;
            continue;
        }
        counts[code - 1]++;
    }
    const values = counts.flatMap((count, i) => Array<number>(count).fill(i + 1));
    const stats = calcularEstadisticasUnivariadas(values);
    const disagree = counts.slice(0, isEmployer ? 1 : 2).reduce((a, b) => a + b, 0);
    return {
        campo, titulo: fieldLabel(campo), fuente, base: rows.length, maximo: labels.length,
        validas: stats.total, media: stats.total ? stats.media : null,
        mediana: stats.total ? stats.mediana : null,
        desviacion: stats.total > 1 ? stats.desviacionEstandar : null,
        desacuerdo: disagree, porcentajeDesacuerdo: stats.total ? disagree / stats.total * 100 : null,
        ...excluded,
        categorias: labels.map((nombre, i) => ({ nombre, codigo: i + 1, cantidad: counts[i], porcentaje: stats.total ? counts[i] / stats.total * 100 : 0 })),
    };
}
export type RatingSummary = ReturnType<typeof summarizeRating>;

export type MultipleSummary = {
    campo: string; titulo: string; fuente: string; base: number; respondieron: number;
    sinRespuesta: number; noAplica: number; sinClasificar: number;
    opciones: { nombre: string; cantidad: number; porcentaje: number }[];
};

export function summarizeSelections(rows: Row[], campo: string): MultipleSummary {
    const counts = new Map<string, { nombre: string; cantidad: number }>();
    let respondieron = 0, noAplica = 0;
    for (const row of rows) {
        if (['no_aplica', 'ruta_desconocida'].includes(String(object(object(row.calidad_datos)[campo]).estado))) { noAplica++; continue; }
        const structured = object(row.selecciones_multiples)[campo];
        const value = Array.isArray(structured) ? structured : object(row.respuestas_originales)[campo] ?? row[campo];
        const options = splitSelections(value);
        if (!options.length) continue;
        respondieron++;
        // Una persona solo cuenta una vez por opción, aunque cambien acentos o espacios.
        const seen = new Set<string>();
        for (const option of options) {
            const key = normalizarTexto(option);
            if (!key || seen.has(key)) continue;
            seen.add(key);
            const entry = counts.get(key) ?? { nombre: cleanString(option), cantidad: 0 };
            entry.cantidad++; counts.set(key, entry);
        }
    }
    return {
        campo, titulo: fieldLabel(campo), fuente: 'Titulados', base: rows.length,
        respondieron, noAplica, sinRespuesta: rows.length - respondieron - noAplica, sinClasificar: 0,
        opciones: [...counts.values()].sort((a, b) => b.cantidad - a.cantidad).map(r => ({ ...r, porcentaje: r.cantidad / respondieron * 100 })),
    };
}

// Clasificación reproducible de menciones, no de suficiencia ni de brechas.
// Una respuesta puede pertenecer a varios temas. No se publican textos individuales.
export const themeRules = [
    { nombre: 'Inteligencia artificial', pattern: /\b(ia|inteligencia artificial|machine learning|deep learning|aprendizaje automatico)\b/ },
    { nombre: 'Desarrollo de software', pattern: /\b(software|programacion|desarrollo web|desarrollo movil|python|java|javascript|typescript|react|angular|flutter|spring|net)\b/ },
    { nombre: 'Datos y bases de datos', pattern: /\b(datos|data|sql|bases de datos|base de datos|power bi|tableau)\b/ },
    { nombre: 'Seguridad informática', pattern: /\b(seguridad|ciberseguridad|cybersecurity)\b/ },
    { nombre: 'Redes e infraestructura', pattern: /\b(redes|infraestructura|servidores|linux|telecomunicaciones)\b/ },
    { nombre: 'Nube y DevOps', pattern: /\b(nube|cloud|aws|azure|gcp|devops|docker|kubernetes|ci cd)\b/ },
    { nombre: 'Gestión de proyectos', pattern: /\b(gestion de proyectos|scrum|agil|agiles|kanban|planificacion)\b/ },
    { nombre: 'Comunicación', pattern: /\b(comunicacion|comunicativas|comunicarse|communication)\b/ },
    { nombre: 'Trabajo en equipo', pattern: /\b(trabajo en equipo|trabajar en equipo|colaboracion|colaborativo|colaborativa)\b/ },
    { nombre: 'Análisis y resolución de problemas', pattern: /\b(analisis|analitico|analitica|resolucion de problemas|resolver problemas|solucion de problemas|pensamiento critico)\b/ },
    { nombre: 'Aprendizaje y adaptación', pattern: /\b(aprendizaje|aprender|adaptacion|adaptabilidad|autodidacta|actualizacion continua)\b/ },
    { nombre: 'Ética y responsabilidad', pattern: /\b(etica|etico|responsabilidad|responsable|honestidad)\b/ },
    { nombre: 'Liderazgo', pattern: /\b(liderazgo|liderar|lider)\b/ },
];

export function summarizeThemes(rows: Row[], campo: string): MultipleSummary {
    let respondieron = 0, sinClasificar = 0;
    const counts = themeRules.map(() => 0);
    for (const row of rows) {
        const value = cleanString(object(row.respuestas_originales)[campo] ?? row[campo]);
        if (!value) continue;
        respondieron++;
        const text = normalizarTexto(value);
        let matched = false;
        themeRules.forEach((rule, i) => { if (rule.pattern.test(text)) { counts[i]++; matched = true; } });
        if (!matched) sinClasificar++;
    }
    return {
        campo, titulo: fieldLabel(campo), fuente: 'Empleadores', base: rows.length,
        respondieron, sinRespuesta: rows.length - respondieron, noAplica: 0, sinClasificar,
        opciones: themeRules.map((r, i) => ({ nombre: r.nombre, cantidad: counts[i], porcentaje: respondieron ? counts[i] / respondieron * 100 : 0 }))
            .filter(r => r.cantidad > 0).sort((a, b) => b.cantidad - a.cantidad),
    };
}

const graduateItems = ['satisfaccion_global_carrera', 'concordancia_formacion_requerimientos', 'pertinencia_laboral_carrera'];
const selectionItems = ['aspectos_mejora', 'aspectos_utilidad', 'asignaturas_ventaja_competitiva', 'asignaturas_menos_utiles'];
const employerProfileItems = new Set(['confianza_carrera_formadora', 'consistencia_titulo_competencias', 'conocimiento_perfil_egreso', 'coherencia_perfil_desempeno', 'formacion_desempeno_destacado', 'incorporacion_necesidades_practicas', 'evidencia_competencias_laborales', 'valores_etica_responsabilidad']);

export function resumirCompetencias(titulados: Row[], empleadores: Row[], scope: GraduateScope = 'experiencia') {
    const experienced = titulados.filter(hasWorkExperience);
    const graduates = scope === 'experiencia' ? experienced : titulados;
    const employerRatings = employerScales.map(field => summarizeRating(empleadores, field, 'Empleadores'));
    return {
        scope, totalTitulados: titulados.length, conExperiencia: experienced.length,
        tituladosAnalizados: graduates.length, totalEmpleadores: empleadores.length,
        titulados: graduateItems.map(field => summarizeRating(graduates, field, 'Titulados')),
        mejoras: selectionItems.map(field => summarizeSelections(graduates, field)),
        perfilEmpleadores: employerRatings.filter(r => employerProfileItems.has(r.campo)),
        vinculacion: employerRatings.filter(r => !employerProfileItems.has(r.campo)),
        demanda: ['areas_emergentes_importantes', 'herramientas_tecnologicas_demandadas', 'habilidades_fundamentales'].map(field => summarizeThemes(empleadores, field)),
    };
}
export type CompetencySummary = ReturnType<typeof resumirCompetencias>;

export function exportCompetencies(s: CompetencySummary) {
    const items = [...s.titulados, ...s.perfilEmpleadores, ...s.vinculacion];
    return {
        estadisticas: items.map(r => ({
            campo: r.campo, pregunta: r.titulo, fuente: r.fuente,
            base: r.base, validas: r.validas, escala_maxima: r.maximo,
            media: r.media, mediana: r.mediana, desviacion_muestral: r.desviacion,
            desacuerdo: r.desacuerdo, porcentaje_desacuerdo: r.porcentajeDesacuerdo,
            sin_respuesta: r.sinRespuesta, no_sabe: r.noSabe, no_aplica: r.noAplica,
            invalida: r.invalida, ruta_desconocida: r.rutaDesconocida,
            poblacion: r.fuente === 'Titulados' ? s.scope : 'Todas las respuestas de empleadores',
        })),
        categorias: items.flatMap(r => r.categorias.map(c => ({ fuente: r.fuente, pregunta: r.titulo, campo: r.campo, ...c, base_valida: r.validas, escala_maxima: r.maximo }))),
        selecciones: s.mejoras.flatMap(r => r.opciones.map(o => ({ pregunta: r.titulo, ...o, base_respondieron: r.respondieron, sin_respuesta: r.sinRespuesta, fuera_ruta: r.noAplica }))),
        temas: s.demanda.flatMap(r => r.opciones.map(o => ({ pregunta: r.titulo, ...o, base_respondieron: r.respondieron, sin_clasificar: r.sinClasificar, metodo: 'Menciones por palabras clave; no mide suficiencia.' }))),
        metodologia: [
            { indicador: 'Población titulados', valor: s.scope === 'experiencia' ? 'Experiencia laboral declarada' : 'Todos, como contexto' },
            { indicador: 'Titulados analizados', valor: s.tituladosAnalizados },
            { indicador: 'Respuestas de empleadores', valor: s.totalEmpleadores },
            { indicador: 'Escalas', valor: 'Titulados: acuerdo 1-4. Empleadores: acuerdo 1-3. No sabe sin puntaje.' },
            { indicador: 'Estadísticos', valor: 'Índices ordinales descriptivos; desviación muestral; vacía si n < 2. No son niveles de dominio.' },
            { indicador: 'Selección múltiple y temas', valor: 'Porcentajes sobre personas que respondieron la pregunta; pueden sumar más de 100%.' },
            { indicador: 'Alcance', valor: 'No hay evaluación individual de suficiencia por hard/soft skill ni mediciones pareadas requerido/recibido; no se calcula una brecha numérica.' },
            ...s.demanda.map(r => ({ indicador: `Base temática: ${r.titulo}`, valor: `${r.respondieron} respondieron; ${r.sinRespuesta} sin respuesta; ${r.sinClasificar} sin coincidencia en el catálogo.` })),
            ...themeRules.map(r => ({ indicador: `Regla temática: ${r.nombre}`, valor: r.pattern.source })),
        ],
    };
}
