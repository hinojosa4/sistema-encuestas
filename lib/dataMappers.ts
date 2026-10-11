// lib/dataMappers.ts

/**
 * Convierte respuestas en escala Likert textual de Google Forms a valor numérico (1 - 5).
 * - "Totalmente de acuerdo" -> 5
 * - "Parcialmente de acuerdo" -> 3
 * - "Totalmente desacuerdo" / "En desacuerdo" -> 1
 * - "No sabe" -> null (se excluye de promedios para no sesgar la métrica)
 */
export function parseLikertValue(val: any): number | null {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') {
        return isNaN(val) ? null : val;
    }

    const str = String(val).trim().toLowerCase();
    
    // Si viene directamente como número en string ("5", "4", "3", etc.)
    const parsedNum = parseFloat(str);
    if (!isNaN(parsedNum)) {
        return parsedNum;
    }

    if (str.includes('totalmente de acuerdo')) return 5;
    if (str.includes('parcialmente de acuerdo') || str.includes('de acuerdo')) return 3;
    if (str.includes('totalmente desacuerdo') || str.includes('en desacuerdo') || str.includes('desacuerdo')) return 1;
    if (str.includes('no sabe') || str.includes('desconoce')) return null;

    return null;
}

/**
 * Normaliza una cadena para comparación flexible (sin tildes, minúsculas, sin signos de puntuación).
 */
function cleanText(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
        .replace(/[¿?()1234567890\.\-_]/g, ' ') // Quitar signos y números
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Mapea una fila cruda (de Excel o CSV de Google Forms) a las columnas estructuradas de `encuesta_empleadores`.
 */
export function mapearFilaEmpleador(row: Record<string, any>): Record<string, any> {
    const item: Record<string, any> = {};

    for (const [key, rawVal] of Object.entries(row)) {
        const val = typeof rawVal === 'string' ? rawVal.trim() : rawVal;
        const normKey = cleanText(key);

        // 0. Datos Generales
        if (normKey.includes('correo') || normKey.includes('email')) {
            item.correo_electronico = val;
        } else if (normKey.includes('nombre de la empresa') || normKey.includes('institucion')) {
            item.nombre_empresa = val;
        } else if (normKey.includes('tipo de organizacion')) {
            item.tipo_organizacion = val;
        } else if (normKey.includes('tamano de la organizacion')) {
            item.tamano_organizacion = val;
        } else if (normKey.includes('rubro') || normKey.includes('sector principal')) {
            item.rubro_sector = val;

        // 1. Empleabilidad
        } else if (normKey.includes('contratado ingenieros') || normKey.includes('ultimos anos')) {
            item.ha_contratado_sistemas = val;
        } else if (normKey.includes('posibilidad de incorporar') || normKey.includes('incorporar ingenieros') || normKey.includes('proximos anos')) {
            item.probabilidad_incorporacion_futura = val;
        } else if (normKey.includes('nivel de formacion academica') || normKey.includes('demanda su organizacion')) {
            item.nivel_formacion_demandado = val;
        } else if (normKey.includes('medio convoca') || normKey.includes('convoca a profesionales')) {
            item.medio_convocatoria = val;
        } else if (normKey.includes('tipo de cargos') || normKey.includes('cargos desempenan')) {
            item.cargos_desempenados = val;
        } else if (normKey.includes('nuevas areas de conocimiento') || normKey.includes('tendencias emergentes')) {
            item.areas_emergentes_importantes = val;
        } else if (normKey.includes('nuevas herramientas tecnologicas') || normKey.includes('herramientas tecnologicas')) {
            item.herramientas_tecnologicas_demandadas = val;
        } else if (normKey.includes('habilidades competencias y destrezas') || normKey.includes('destrezas considera fundamentales')) {
            item.habilidades_fundamentales = val;

        // 2. Formación y Perfil Profesional (Likert)
        } else if (normKey.includes('brinda confianza')) {
            item.confianza_carrera_formadora = parseLikertValue(val);
        } else if (normKey.includes('consistente con el nivel de formacion') || normKey.includes('consistente con el nivel')) {
            item.consistencia_titulo_competencias = parseLikertValue(val);
        } else if (normKey.includes('consultan regularmente nuestra opinion') || normKey.includes('consultan regularmente')) {
            item.consulta_regular_opinion = parseLikertValue(val);
        } else if (normKey.includes('conozco el perfil profesional')) {
            item.conocimiento_perfil_egreso = parseLikertValue(val);
        } else if (normKey.includes('coherente con el desempeno laboral') || normKey.includes('coherente con el desempeno')) {
            item.coherencia_perfil_desempeno = parseLikertValue(val);
        } else if (normKey.includes('desempeno destacado')) {
            item.formacion_desempeno_destacado = parseLikertValue(val);
        } else if (normKey.includes('incorpora las necesidades del sector laboral') || normKey.includes('formacion practica pasantias')) {
            item.incorporacion_necesidades_practicas = parseLikertValue(val);
        } else if (normKey.includes('evidencia el desarrollo de competencias') || normKey.includes('comunicacion efectiva')) {
            item.evidencia_competencias_laborales = parseLikertValue(val);
        } else if (normKey.includes('demuestran valores y actitudes') || normKey.includes('etica profesional')) {
            item.valores_etica_responsabilidad = parseLikertValue(val);
        } else if (normKey.includes('recopilacion de informacion evaluacion o retroalimentacion')) {
            item.participacion_evaluacion_desempeno = parseLikertValue(val);

        // 3. Relación de la Carrera con la Organización (Likert)
        } else if (normKey.includes('mantiene vinculos con organizaciones')) {
            item.vinculos_oportunidades_laborales = parseLikertValue(val);
        } else if (normKey.includes('vinculacion con el entorno laboral y tecnologico')) {
            item.participacion_vinculacion_entorno = parseLikertValue(val);
        } else if (normKey.includes('difusion de oportunidades laborales convocatorias')) {
            item.participacion_difusion_pasantias = parseLikertValue(val);
        } else if (normKey.includes('intercambio de conocimientos experiencias') || normKey.includes('profesionales del sector tecnologico')) {
            item.participacion_intercambio_conocimiento = parseLikertValue(val);
        } else if (normKey.includes('proposito de retroalimentar el perfil')) {
            item.consulta_retroalimentacion_plan = parseLikertValue(val);
        } else if (normKey.includes('pertinencia de la formacion impartida')) {
            item.consulta_pertinencia_formacion = parseLikertValue(val);
        } else if (normKey.includes('fuente de busqueda de talento') || normKey.includes('recurrimos a la universidad mayor de san simon')) {
            item.busqueda_talento_umss = parseLikertValue(val);
        } else if (normKey.includes('consultado periodicamente') || normKey.includes('autoevaluacion y mejora continua')) {
            item.consulta_procesos_autoevaluacion = parseLikertValue(val);
        
        // Si la columna ya viene con el nombre limpio en snake_case
        } else if (
            [
                'correo_electronico', 'nombre_empresa', 'tipo_organizacion', 'tamano_organizacion', 'rubro_sector',
                'ha_contratado_sistemas', 'probabilidad_incorporacion_futura', 'nivel_formacion_demandado',
                'medio_convocatoria', 'cargos_desempenados', 'areas_emergentes_importantes', 'herramientas_tecnologicas_demandadas',
                'habilidades_fundamentales', 'confianza_carrera_formadora', 'consistencia_titulo_competencias',
                'consulta_regular_opinion', 'conocimiento_perfil_egreso', 'coherencia_perfil_desempeno',
                'formacion_desempeno_destacado', 'incorporacion_necesidades_practicas', 'evidencia_competencias_laborales',
                'valores_etica_responsabilidad', 'participacion_evaluacion_desempeno', 'vinculos_oportunidades_laborales',
                'participacion_vinculacion_entorno', 'participacion_difusion_pasantias', 'participacion_intercambio_conocimiento',
                'consulta_retroalimentacion_plan', 'consulta_pertinencia_formacion', 'busqueda_talento_umss', 'consulta_procesos_autoevaluacion'
            ].includes(key)
        ) {
            item[key] = key.includes('confianza') || key.includes('consistencia') || key.includes('consulta') ||
                        key.includes('conocimiento') || key.includes('coherencia') || key.includes('formacion') ||
                        key.includes('incorporacion') || key.includes('evidencia') || key.includes('valores') ||
                        key.includes('participacion') || key.includes('vinculos') || key.includes('busqueda')
                        ? parseLikertValue(val)
                        : val;
        }
    }

    return item;
}

/**
 * Normaliza filas para encuesta de titulados.
 */
export function mapearFilaTitulado(row: Record<string, any>): Record<string, any> {
    const item: Record<string, any> = {};

    for (const [key, rawVal] of Object.entries(row)) {
        const val = typeof rawVal === 'string' ? rawVal.trim() : rawVal;
        const normKey = cleanText(key);

        if (normKey.includes('anios de vida profesional') || normKey.includes('anos de vida profesional') || normKey.includes('anios vida')) {
            item.anios_vida_profesional = parseFloat(String(val)) || 0;
        } else if (normKey.includes('desempleado') || normKey.includes('tiempo desempleado')) {
            item.tiempo_desempleado = parseFloat(String(val)) || 0;
        } else if (normKey.includes('area le interesaria') || normKey.includes('area de interes') || normKey.includes('area interes')) {
            item.area_interes_posgrado = val;
        } else if (normKey.includes('programa de formacion complementaria de mayor nivel') || normKey.includes('nivel posgrado mayor')) {
            item.nivel_posgrado_mayor = val;
        } else if (normKey.includes('fuente de financiamiento') || normKey.includes('financiamiento posgrado')) {
            item.financiamiento_posgrado = val;
        } else if (normKey.includes('situacion laboral actual')) {
            item.situacion_laboral = val;
        } else {
            // Guardar con clave normalizada si no coincide
            item[key] = val;
        }
    }

    return item;
}
