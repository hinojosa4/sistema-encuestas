// lib/dataMappers.ts

/** Escalas nativas independientes; los puntajes de presentacion se transforman a 1-5.
 * Las categorias originales y los codigos ordinales se conservan en importPipeline.
 */
export type Escala = 'acuerdo' | 'empleador' | 'satisfaccion' | 'importancia';

export function normalizarTexto(value: unknown): string {
    return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/@/g, 'o').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function codigoOrdinal(value: unknown, escala: Escala = 'acuerdo'): number | null {
    const opciones: Record<Escala, string[]> = {
        acuerdo: ['totalmente en desacuerdo', 'en desacuerdo', 'de acuerdo', 'totalmente de acuerdo'],
        empleador: ['totalmente desacuerdo', 'parcialmente de acuerdo', 'totalmente de acuerdo'],
        satisfaccion: ['insatisfecho', 'algo satisfecho', 'satisfecho'],
        importancia: ['no es importante', 'poco importante', 'importante', 'muy importante'],
    };
    const index = opciones[escala].indexOf(normalizarTexto(value));
    return index < 0 ? null : index + 1;
}

// Puntaje transformado 1-5 para conservar compatibilidad con los radares.
// El codigo nativo y la categoria original se conservan por separado en la carga.
export function parseLikertValue(val: unknown, escala: Escala = 'acuerdo'): number | null {
    const codigo = codigoOrdinal(val, escala);
    if (codigo !== null) {
        const niveles = escala === 'empleador' || escala === 'satisfaccion' ? 3 : 4;
        return Number((1 + (codigo - 1) * 4 / (niveles - 1)).toFixed(4));
    }
    if (typeof val === 'number') return Number.isFinite(val) && val >= 1 && val <= 5 ? val : null;
    if (typeof val === 'string' && /^\s*[1-5](?:\.\d+)?\s*$/.test(val)) {
        const numero = Number(val);
        return numero <= 5 ? numero : null;
    }
    return null;
}



/**
 * Normaliza una cadena para comparación flexible (sin tildes, minúsculas, sin signos de puntuación).
 */
function cleanText(text: string): string {
    return normalizarTexto(text).replace(/\d+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Mapea una fila cruda (de Excel o CSV de Google Forms) a las columnas estructuradas de `encuesta_empleadores`.
 */
export function mapearFilaEmpleador(row: Record<string, unknown>): Record<string, unknown> {
    const item: Record<string, unknown> = {
        raw_data: row,
    };

    for (const [key, rawVal] of Object.entries(row)) {
        const val = typeof rawVal === 'string' ? rawVal.trim() : rawVal;
        const normKey = cleanText(key);
        // Columnas estructuradas se resuelven antes que los patrones del formulario.
        if (['correo_electronico', 'nombre_empresa', 'tipo_organizacion', 'tamano_organizacion', 'rubro_sector', 'ha_contratado_sistemas', 'probabilidad_incorporacion_futura', 'nivel_formacion_demandado', 'medio_convocatoria', 'cargos_desempenados', 'areas_emergentes_importantes', 'herramientas_tecnologicas_demandadas', 'habilidades_fundamentales', 'confianza_carrera_formadora', 'consistencia_titulo_competencias', 'consulta_regular_opinion', 'conocimiento_perfil_egreso', 'coherencia_perfil_desempeno', 'formacion_desempeno_destacado', 'incorporacion_necesidades_practicas', 'evidencia_competencias_laborales', 'valores_etica_responsabilidad', 'participacion_evaluacion_desempeno', 'vinculos_oportunidades_laborales', 'participacion_vinculacion_entorno', 'participacion_difusion_pasantias', 'participacion_intercambio_conocimiento', 'consulta_retroalimentacion_plan', 'consulta_pertinencia_formacion', 'busqueda_talento_umss', 'consulta_procesos_autoevaluacion'].includes(key)) {
            item[key] = ['confianza_carrera_formadora', 'consistencia_titulo_competencias', 'consulta_regular_opinion', 'conocimiento_perfil_egreso', 'coherencia_perfil_desempeno', 'formacion_desempeno_destacado', 'incorporacion_necesidades_practicas', 'evidencia_competencias_laborales', 'valores_etica_responsabilidad', 'participacion_evaluacion_desempeno', 'vinculos_oportunidades_laborales', 'participacion_vinculacion_entorno', 'participacion_difusion_pasantias', 'participacion_intercambio_conocimiento', 'consulta_retroalimentacion_plan', 'consulta_pertinencia_formacion', 'busqueda_talento_umss', 'consulta_procesos_autoevaluacion'].includes(key)
                ? parseLikertValue(val, 'empleador') : val;
            continue;
        }


        // 0. Datos Generales
        if (normKey.includes('correo') || normKey.includes('email')) {
            item.correo_electronico = val;
        } else if (normKey.includes('nombre de la empresa')) {
            item.nombre_empresa = val;
        } else if (normKey.includes('tipo de organizacion')) {
            item.tipo_organizacion = val;
        } else if (normKey.includes('tamano de la organizacion')) {
            item.tamano_organizacion = val;
        } else if (normKey.includes('rubro o sector principal') || (normKey.includes('rubro') && normKey.includes('organizacion'))) {
            item.rubro_sector = val;

            // 1. Empleabilidad
        } else if (normKey.includes('contratado ingenieros') || normKey.includes('ultimos anos') || normKey.includes('ultimos anios')) {
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
            item.confianza_carrera_formadora = parseLikertValue(val, 'empleador');
        } else if (normKey.includes('consistente con el nivel de formacion') || normKey.includes('consistente con el nivel')) {
            item.consistencia_titulo_competencias = parseLikertValue(val, 'empleador');
        } else if (normKey.includes('consultan regularmente nuestra opinion') || normKey.includes('consultan regularmente')) {
            item.consulta_regular_opinion = parseLikertValue(val, 'empleador');
        } else if (normKey.includes('conozco el perfil profesional')) {
            item.conocimiento_perfil_egreso = parseLikertValue(val, 'empleador');
        } else if (normKey.includes('coherente con el desempeno laboral') || normKey.includes('coherente con el desempeno')) {
            item.coherencia_perfil_desempeno = parseLikertValue(val, 'empleador');
        } else if (normKey.includes('desempeno destacado')) {
            item.formacion_desempeno_destacado = parseLikertValue(val, 'empleador');
        } else if (normKey.includes('incorpora las necesidades del sector laboral') || normKey.includes('formacion practica pasantias')) {
            item.incorporacion_necesidades_practicas = parseLikertValue(val, 'empleador');
        } else if (normKey.includes('evidencia el desarrollo de competencias') || normKey.includes('comunicacion efectiva')) {
            item.evidencia_competencias_laborales = parseLikertValue(val, 'empleador');
        } else if (normKey.includes('demuestran valores y actitudes') || normKey.includes('etica profesional')) {
            item.valores_etica_responsabilidad = parseLikertValue(val, 'empleador');
        } else if (normKey.includes('recopilacion de informacion evaluacion o retroalimentacion')) {
            item.participacion_evaluacion_desempeno = parseLikertValue(val, 'empleador');

            // 3. Relación de la Carrera con la Organización (Likert)
        } else if (normKey.includes('mantiene vinculos con organizaciones')) {
            item.vinculos_oportunidades_laborales = parseLikertValue(val, 'empleador');
        } else if (normKey.includes('vinculacion con el entorno laboral y tecnologico')) {
            item.participacion_vinculacion_entorno = parseLikertValue(val, 'empleador');
        } else if (normKey.includes('difusion de oportunidades laborales convocatorias')) {
            item.participacion_difusion_pasantias = parseLikertValue(val, 'empleador');
        } else if (normKey.includes('intercambio de conocimientos experiencias') || normKey.includes('profesionales del sector tecnologico')) {
            item.participacion_intercambio_conocimiento = parseLikertValue(val, 'empleador');
        } else if (normKey.includes('proposito de retroalimentar el perfil') || normKey.includes('retroalimentar el perfil profesional')) {
            item.consulta_retroalimentacion_plan = parseLikertValue(val, 'empleador');
        } else if (normKey.includes('pertinencia de la formacion impartida')) {
            item.consulta_pertinencia_formacion = parseLikertValue(val, 'empleador');
        } else if (normKey.includes('fuente de busqueda de talento') || normKey.includes('recurrimos a la universidad mayor de san simon')) {
            item.busqueda_talento_umss = parseLikertValue(val, 'empleador');
        } else if (normKey.includes('consultado periodicamente') || normKey.includes('autoevaluacion y mejora continua')) {
            item.consulta_procesos_autoevaluacion = parseLikertValue(val, 'empleador');

        }
    }

    return item;
}

/**
 * Normaliza filas para encuesta de titulados (alineada 100% con Supabase y Microsoft Forms).
 */
export function mapearFilaTitulado(row: Record<string, unknown>): Record<string, unknown> {
    const item: Record<string, unknown> = {
        raw_data: row, // Respaldo íntegro original
    };

    for (const [key, rawVal] of Object.entries(row)) {
        const trimmedKey = key.trim();

        // ⚠️ Omitir metadatos de Microsoft Forms (Puntos, Comentarios, Id, Horas)
        // para evitar que columnas auxiliares vacías sobrescriban los datos reales
        if (
            trimmedKey.startsWith('Puntos:') ||
            trimmedKey.startsWith('Comentarios:') ||
            trimmedKey.startsWith('Hora de') ||
            trimmedKey.startsWith('Total de puntos') ||
            trimmedKey === 'Id'
        ) {
            continue;
        }

        const val = typeof rawVal === 'string' ? rawVal.trim() : rawVal;
        const normKey = cleanText(key);
        // Columnas estructuradas se resuelven antes que los patrones del formulario.
        if (['edad', 'genero', 'ha_realizado_posgrado', 'nivel_posgrado_cursado', 'institucion_posgrado_cursado', 'financiamiento_posgrado_cursado', 'nombre_programa_cursado', 'interes_futuro_posgrado', 'area_interes_posgrado', 'institucion_optaria_posgrado', 'opinion_posgrado_fcyt', 'anios_vida_profesional', 'tiempo_desempleado', 'situacion_laboral_actual', 'empresa_trabajo_actual', 'rubro_empresa_trabajo', 'otro_rubro_trabajo', 'sector_empresa_trabajo', 'departamento_trabajo', 'area_empresa_trabajo', 'otra_area_trabajo', 'cargo_actual', 'otro_cargo_actual', 'pertinencia_laboral_carrera', 'razon_desempleo', 'origen_emprendimiento', 'tipo_entregable_negocio', 'financiamiento_negocio', 'satisfaccion_negocio', 'importancia_formacion_negocio', 'es_primer_empleo', 'tiempo_conseguir_primer_empleo', 'cantidad_empleos_desempenados', 'satisfaccion_global_carrera', 'concordancia_formacion_requerimientos', 'aspectos_utilidad', 'aspectos_mejora', 'asignaturas_ventaja_competitiva', 'asignaturas_menos_utiles', 'interes_red_contactos', 'email_contacto', 'telefono_contacto', 'linkedin_url', 'antiguedad_trabajo_actual', 'medio_obtencion_trabajo', 'remuneracion_mensual', 'ha_trabajado_antes', 'otra_asignatura_ventaja', 'otra_asignatura_menos_util'].includes(key)) {
            item[key] = ['opinion_posgrado_fcyt', 'pertinencia_laboral_carrera', 'satisfaccion_negocio', 'importancia_formacion_negocio', 'satisfaccion_global_carrera', 'concordancia_formacion_requerimientos'].includes(key)
                ? parseLikertValue(val, key === 'satisfaccion_negocio' ? 'satisfaccion' : key === 'importancia_formacion_negocio' ? 'importancia' : 'acuerdo') : val;
            continue;
        }


        // 0. Datos Generales
        if (normKey.includes('edad que tiene') || normKey === 'edad') {
            item.edad = val;
        } else if (normKey.includes('genero')) {
            item.genero = val;

            // 1. Formación complementaria / Posgrado
        } else if (normKey.includes('formacion complementaria') && !normKey.includes('mayor nivel')) {
            item.ha_realizado_posgrado = val;
        } else if (normKey.includes('mayor nivel') || normKey.includes('nivel posgrado')) {
            item.nivel_posgrado_cursado = val;
        } else if (normKey.includes('donde ha cursado')) {
            item.institucion_posgrado_cursado = val;
        } else if (normKey.includes('fuente de financiamiento') || normKey.includes('financiamiento posgrado')) {
            item.financiamiento_posgrado_cursado = val;
        } else if (normKey.includes('nombre del programa')) {
            item.nombre_programa_cursado = val;
        } else if (normKey.includes('interesado en realizar estudios en algun programa de posgrado') || normKey.includes('interes futuro posgrado')) {
            item.interes_futuro_posgrado = val;
        } else if (normKey.includes('areas le interesaria') || normKey.includes('area de interes') || normKey.includes('area interes')) {
            item.area_interes_posgrado = val;
        } else if (normKey.includes('organizacion educativa optaria') || normKey.includes('institucion optaria')) {
            item.institucion_optaria_posgrado = val;
        } else if (normKey.includes('posgrado de la fcyt')) {
            item.opinion_posgrado_fcyt = parseLikertValue(val);

            // 2. Tiempos y Situación Laboral
        } else if ((normKey.includes('anos de vida profesional') || normKey.includes('anios de vida profesional') || normKey.includes('vida profesional')) && !normKey.includes('asignaturas')) {
            item.anios_vida_profesional = Number.isFinite(Number(String(val).replace(',', '.'))) && String(val).trim() !== '' ? Number(String(val).replace(',', '.')) : null;
        } else if (normKey.includes('tiempo en que se ha encontrado desempleado') || normKey.includes('tiempo desempleado')) {
            item.tiempo_desempleado = Number.isFinite(Number(String(val).replace(',', '.'))) && String(val).trim() !== '' ? Number(String(val).replace(',', '.')) : null;
        } else if (normKey.includes('describe su situacion laboral') || normKey.includes('situacion laboral actual')) {
            item.situacion_laboral_actual = val;

            // Rama A: Empresa
        } else if ((normKey.includes('nombre de la empresa') && normKey.includes('trabaja')) || normKey === 'empresa trabajo actual') {
            item.empresa_trabajo_actual = val;
        } else if (normKey.includes('rubro de la organizacion') || normKey.includes('rubro empresa')) {
            item.rubro_empresa_trabajo = val;
        } else if (normKey.includes('otro rubro')) {
            item.otro_rubro_trabajo = val;
        } else if (normKey.includes('sector corresponde') || normKey.includes('sector empresa')) {
            item.sector_empresa_trabajo = val;
        } else if (normKey.includes('departamento de bolivia') || normKey.includes('departamento trabajo')) {
            item.departamento_trabajo = val;
        } else if (normKey.includes('area dentro de la organizacion') || normKey.includes('area empresa')) {
            item.area_empresa_trabajo = val;
        } else if (normKey.includes('otra area') || normKey.includes('otro area')) {
            item.otra_area_trabajo = val;
        } else if (normKey.includes('cargo que desempena') || normKey.includes('cargo actual')) {
            item.cargo_actual = val;
        } else if (normKey.includes('otro cargo')) {
            item.otro_cargo_actual = val;
        } else if (normKey.includes('pertinentes a su formacion') || normKey.includes('pertinencia laboral')) {
            item.pertinencia_laboral_carrera = parseLikertValue(val);

        } else if (normKey.includes('antiguedad tiene en su actual trabajo') || normKey === 'antiguedad trabajo actual') {
            item.antiguedad_trabajo_actual = val;
        } else if (normKey.includes('medio obtuvo el trabajo') || normKey === 'medio obtencion trabajo') {
            item.medio_obtencion_trabajo = val;
        } else if (normKey.includes('remuneracion promedio mensual') || normKey === 'remuneracion mensual') {
            item.remuneracion_mensual = val;
        } else if (normKey.includes('ha tenido algun trabajo antes') || normKey === 'ha trabajado antes') {
            item.ha_trabajado_antes = val;
        } else if (/^otra asignatura(?:\s*\d+)?$/.test(normKey)) {
            item[/[:_]\s*1$/.test(trimmedKey) ? 'otra_asignatura_menos_util' : 'otra_asignatura_ventaja'] = val;

            // Rama B: Desempleo
        } else if (normKey.includes('razon por la que actualmente no trabaja') || normKey.includes('razon desempleo')) {
            item.razon_desempleo = val;

            // Rama C: Emprendimiento
        } else if (normKey.includes('origen del desarrollo de su propio emprendimiento') || normKey.includes('origen emprendimiento')) {
            item.origen_emprendimiento = val;
        } else if (normKey.includes('entregable genera el negocio') || normKey.includes('tipo entregable')) {
            item.tipo_entregable_negocio = val;
        } else if (normKey.includes('financiamiento externo para su negocio') || normKey.includes('financiamiento negocio')) {
            item.financiamiento_negocio = val;
        } else if (normKey.includes('rendimiento actual de su negocio') || normKey.includes('satisfaccion negocio')) {
            item.satisfaccion_negocio = parseLikertValue(val, 'satisfaccion');
        } else if (normKey.includes('formacion en ingenieria en sistemas para iniciar') || normKey.includes('importancia formacion negocio')) {
            item.importancia_formacion_negocio = parseLikertValue(val, 'importancia');

            // 3. Inserción Laboral
        } else if (normKey.includes('demoro en conseguir') || normKey.includes('tiempo conseguir primer trabajo') || normKey.includes('tiempo conseguir primer empleo')) {
            item.tiempo_conseguir_primer_empleo = val;
        } else if (normKey.includes('primer empleo') && normKey.includes('ejerce actualmente')) {
            item.es_primer_empleo = val;
        } else if (normKey.includes('cuantos empleos usted se ha desempenado') || normKey.includes('cantidad empleos')) {
            item.cantidad_empleos_desempenados = val;

            // 4. Criterios Académicos ARCUSUR
        } else if (normKey.includes('grado de satisfaccion que ha desarrollado') || normKey.includes('satisfaccion global carrera')) {
            item.satisfaccion_global_carrera = parseLikertValue(val);
        } else if (normKey.includes('concordancia entre la formacion') || normKey.includes('concordancia formacion')) {
            item.concordancia_formacion_requerimientos = parseLikertValue(val);
        } else if (normKey.includes('bastante utilidad') || normKey.includes('aspectos utilidad')) {
            item.aspectos_utilidad = val;
        } else if (normKey.includes('pueden mejorarse') || normKey.includes('aspectos mejora')) {
            item.aspectos_mejora = val;
        } else if (normKey.includes('ventaja competitiva') || normKey.includes('asignaturas ventaja')) {
            item.asignaturas_ventaja_competitiva = val;
        } else if (normKey.includes('no le resultaron de mucha utilidad') || normKey.includes('asignaturas menos utiles')) {
            item.asignaturas_menos_utiles = val;

            // 5. Contacto
        } else if (normKey.includes('red de contactos oficial') || normKey.includes('interes red contactos')) {
            item.interes_red_contactos = val;
        } else if (normKey.includes('email de contacto') || normKey.includes('email contacto')) {
            item.email_contacto = val;
        } else if (normKey.includes('telefonico') || normKey.includes('whatsapp') || normKey.includes('telefono contacto')) {
            item.telefono_contacto = val;
        } else if (normKey.includes('linkedin')) {
            item.linkedin_url = val;

        }
    }

    return item;
}
