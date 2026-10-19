import type { AnalysisReport, ReportCell } from './reports';

export const UMSS_COLORS = { azul: '#003770', rojo: '#E30613', blanco: '#FFFFFF' };
export type AcademicMetadata = { autores: string; docente: string; periodo: string };
export type AcademicBlock =
    | { tipo: 'texto'; texto: string }
    | { tipo: 'subtitulo'; texto: string }
    | { tipo: 'tabla'; titulo: string; columnas: string[]; filas: ReportCell[][]; nota: string; anchos?: number[] }
    | { tipo: 'barras'; titulo: string; categorias: { nombre: string; cantidad: number; porcentaje: number }[]; nota: string }
    | { tipo: 'radar'; titulo: string; grupo: AnalysisReport['radares'][number]; nota: string };
export type AcademicSection = { titulo: string; bloques: AcademicBlock[] };
const text = (texto: string): AcademicBlock => ({ tipo: 'texto', texto });
const sub = (texto: string): AcademicBlock => ({ tipo: 'subtitulo', texto });
const value = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : null;
export const formatAcademicNumber = (v: unknown, digits = 1) => value(v) === null ? 'No disponible' : Number(v).toLocaleString('es-BO',{maximumFractionDigits:digits});
const pct = (v: unknown) => value(v) === null ? 'No disponible' : `${formatAcademicNumber(v)}%`;

export function academicRows(report: AnalysisReport, name: string) {
    const t = report.tablas.find(t=>t.nombre===name);
    return t ? t.filas.map(row=>Object.fromEntries(t.columnas.map((k,i)=>[k,row[i]]))) : [];
}
const frequencies = (report: AnalysisReport,name: string) => academicRows(report,name).map(r=>({nombre:String(r.nombre ?? ''),cantidad:Number(r.cantidad),porcentaje:Number(r.porcentaje)}));

export function buildAcademicReport(r: AnalysisReport) {
    const metric = (name: string) => academicRows(r,'Resumen').find(row=>row.indicador===name);
    const c = r.cruce;
    const areas = frequencies(r,'HU2_Areas').sort((a,b)=>b.cantidad-a.cantidad);
    const funding = frequencies(r,'HU3_Fuentes').sort((a,b)=>b.cantidad-a.cantidad);
    const stats = academicRows(r,'HU4_Estadisticos');
    const ratings = stats.filter(row=>row.fuente==='Titulados');
    const improvements = academicRows(r,'HU4_Mejoras').filter(row=>row.pregunta==='Aspectos por mejorar').sort((a,b)=>Number(b.cantidad)-Number(a.cantidad));
    const topics = academicRows(r,'HU4_Demanda').filter(row=>row.pregunta==='Áreas y tecnologías emergentes').sort((a,b)=>Number(b.cantidad)-Number(a.cantidad));
    const occupation = metric('Ocupación actual (%)');
    const interest = metric('Interesados en posgrado');
    const experience = metric('Experiencia profesional: media (años)');
    const graduation = academicRows(r,'Egreso_Estadisticos')[0];
    const graduationCohorts = academicRows(r,'Egreso_Ocupacion');
    const methodology = academicRows(r,'HU4_Metodologia');
    const cohort = r.parametros.scope==='experiencia'?'titulados con experiencia laboral declarada':'todos los titulados, como contexto general';
    const table = (titulo: string,columnas: string[],filas: ReportCell[][],nota: string,anchos?: number[]): AcademicBlock => ({tipo:'tabla',titulo,columnas,filas,nota,anchos});
    const frequencyTable = (titulo: string,name: string,nota: string) => {
        const rows=frequencies(r,name);
        if(name==='Perfil_Edad') rows.sort((a,b)=>(parseFloat(a.nombre)||Infinity)-(parseFloat(b.nombre)||Infinity));
        if(name==='HU2_Niveles_Cursados') {
            const order=['Diplomado','Especialidad','Maestría','Doctorado','Posdoctorado'];
            rows.sort((a,b)=>order.indexOf(a.nombre)-order.indexOf(b.nombre));
        }
        return table(titulo,['Categoría','Respuestas','Porcentaje'],rows.map(v=>[v.nombre,v.cantidad,pct(v.porcentaje)]),nota,[0.64,0.16,0.2]);
    };
    const sections: AcademicSection[] = [
        { titulo:'1 Introducción y justificación', bloques:[
            text('El presente análisis de mercado caracteriza la experiencia profesional, la formación continua y las percepciones sobre la preparación laboral de titulados de Ingeniería en Sistemas, junto con las valoraciones y necesidades expresadas por empleadores. Su propósito es aportar evidencia descriptiva para la revisión curricular y la gestión académica en el marco del trabajo de autoevaluación planteado en la guía de la asignatura.'),
            text('La evidencia procede de encuestas realizadas por el docente y suministradas al equipo. El análisis no acredita un nuevo levantamiento de campo ni una evaluación formal de acreditación. Las acciones propuestas se presentan para revisión académica; su ejecución exige contrastarlas con costos, capacidad institucional y demanda efectiva.'),
            sub('Objetivo general'), text('Describir el perfil laboral y las preferencias de formación de las personas que respondieron, e identificar oportunidades de mejora a partir de las opiniones de titulados y empleadores.'),
            sub('Objetivos específicos'),
            text('Caracterizar experiencia, ocupación y sector de desempeño; describir las áreas de interés y el financiamiento de programas cursados; examinar percepciones de formación y requerimientos laborales; y sintetizar propuestas que puedan ser verificadas antes de su incorporación al Plan de Desarrollo Estratégico.'),
        ]},
        { titulo:'2 Marco metodológico', bloques:[
            text(`Se realizó un análisis secundario, cuantitativo, descriptivo y exploratorio de ${r.titulados} respuestas de titulados y ${r.empleadores} de empleadores visibles en la base al generar este informe. La población de interés son los titulados de Ingeniería en Sistemas y las organizaciones vinculadas a su ejercicio profesional. No se cuenta con un marco muestral ni un diseño probabilístico documentados que permitan generalizar los porcentajes a toda esa población.`),
            text('La herramienta importa archivos Excel o CSV, identifica preguntas, conserva respuestas originales, revisa categorías y unidades y omite duplicados exactos en la carga. Los saltos del cuestionario se distinguen de las ausencias. Los números de desempleo sin una unidad confirmada se excluyen del indicador en meses; cero permanece como una respuesta válida. Omitir duplicados exactos no demuestra que exista una única respuesta independiente por persona.'),
            text(`Las bases cambian por pregunta. El análisis de competencias utiliza ${cohort}; el filtro considera trabajo actual, emprendimiento, trabajo previo declarado o experiencia profesional positiva. El corte exploratorio de experiencia es de ${r.parametros.corte} años y no identifica cargos, jerarquías ni año de egreso. La pertinencia del puesto se restringe a quienes trabajan en una organización.`),
            text('Las valoraciones de titulados conservan cuatro categorías de acuerdo y las de empleadores tres categorías, además de No sabe sin puntaje. Las medias y desviaciones muestrales resumen códigos ordinales; se acompañan de frecuencias y medianas, y no equivalen a niveles de dominio ni a distancias psicológicas demostradas. Las preguntas de selección múltiple usan personas que respondieron como denominador y pueden sumar más de 100%.'),
            text('Se construye una tabla de contingencia entre nivel cursado y financiamiento utilizado. La aproximación de Pearson se interpreta solo si satisface los criterios de frecuencias esperadas descritos en el diagnóstico (National Institute of Standards and Technology [NIST], s. f.). Las menciones abiertas de empleadores se clasifican mediante palabras clave; se informa la cantidad sin coincidencias y se requiere revisión humana para sustentar decisiones.'),
            text('La fecha de generación no es la fecha de aplicación de las encuestas. El periodo de recolección, el procedimiento de selección y la independencia de las respuestas deben documentarse con el docente. La lectura de la base es paginada y no constituye una instantánea transaccional; los formatos exportados de una misma generación comparten sus valores.'),
        ]},
        { titulo:'3 Demanda educativa y perfil de los titulados', bloques:[
            sub('Perfil de las respuestas'),
            frequencyTable('Tabla 1 Edad declarada','Perfil_Edad','Base: respuestas no vacías de edad. Se conservan categorías declaradas; no se estima una edad exacta a partir de intervalos.'),
            frequencyTable('Tabla 2 Género declarado','Perfil_Genero','Base: respuestas no vacías de género. Describe la composición de la muestra.'),
            text(`La experiencia profesional media es ${formatAcademicNumber(experience?.valor)} años, sobre ${formatAcademicNumber(experience?.base_valida,0)} respuestas válidas. La ocupación actual alcanza ${pct(occupation?.valor)} entre ${formatAcademicNumber(occupation?.base_valida,0)} situaciones reconocidas. Son indicadores de la muestra; la experiencia no permite calcular automáticamente antigüedad desde la titulación ni inserción por cohorte.`),
            frequencyTable('Tabla 3 Situación laboral','HU1_Ocupacion','Ocupación actual incluye trabajo en organización o emprendimiento. No es una tasa de inserción longitudinal.'),
            ...(graduationCohorts.length ? [
                text(`Se dispone de ${formatAcademicNumber(graduation?.base,0)} años de egreso válidos. Al año de referencia ${formatAcademicNumber(graduation?.anio_referencia,0)}, el tiempo medio transcurrido es ${formatAcademicNumber(graduation?.media)} años, la mediana ${formatAcademicNumber(graduation?.mediana)} y la desviación muestral ${formatAcademicNumber(graduation?.desviacion_muestral)}. Se excluyen ${formatAcademicNumber(graduation?.excluidos,0)} respuestas sin año válido. Son diferencias entre años calendario, no fechas exactas de titulación.`),
                table('Tabla 3a Ocupación actual por cohorte de egreso',['Egreso','Ocupados','Estado válido','Sin estado válido','Ocupación'],graduationCohorts.map(row=>[cellNumber(row.anio),cellNumber(row.ocupados),cellNumber(row.base),cellNumber(row.excluidos),pct(row.porcentaje)]),'Comparación entre quienes respondieron. No mide inserción dentro de un plazo ni seguimiento longitudinal.',[.16,.18,.22,.24,.2]),
            ] : []),
            frequencyTable('Tabla 4 Sector de desempeño','HU1_Sectores','Solo quienes trabajan en una organización y declaran un sector reconocido.'),
            sub('Preferencias de formación continua'),
            text(`${formatAcademicNumber(interest?.valor,0)} de ${formatAcademicNumber(interest?.base_valida,0)} respuestas Sí o No válidas declaran interés en realizar un posgrado. Los porcentajes temáticos se calculan entre interesados con área declarada. El nivel ya cursado se conserva como antecedente y no se utiliza como nivel deseado.`),
            {tipo:'barras',titulo:'Figura 1 Áreas de interés entre titulados interesados',categorias:areas,nota:'Fuente: elaboración propia a partir de las encuestas suministradas. La longitud representa el porcentaje de respuestas con área declarada.'},
            text(areas.length?`El área con más preferencias es ${areas[0].nombre}, con ${areas[0].cantidad} respuestas (${pct(areas[0].porcentaje)}). Las dos primeras reúnen ${pct(metric('Concentración de dos áreas (%)')?.valor)}. El umbral orientativo de 70% no es una meta a alcanzar ni demuestra viabilidad financiera.`:'No hay áreas válidas para priorizar una oferta. Se requiere revisar la disponibilidad de respuestas antes de formular propuestas.'),
            frequencyTable('Tabla 5 Nivel de posgrado cursado o en curso','HU2_Niveles_Cursados','Antecedentes de quienes confirman formación complementaria. No informa qué nivel desean estudiar.'),
        ]},
        { titulo:'4 Oferta laboral y requerimientos del sector productivo', bloques:[
            text(`La encuesta de empleadores contiene ${r.empleadores} respuestas. Permite conocer la composición de las organizaciones y sus percepciones; no constituye un censo de vacantes ni permite cuantificar contrataciones efectivas futuras.`),
            frequencyTable('Tabla 6 Tipo de organización','Sector_Tipo_Organizacion','Base: organizaciones con tipo declarado. La presencia de una respuesta pública o privada no acredita por sí sola el trabajo de campo del equipo.'),
            frequencyTable('Tabla 7 Nivel de formación demandado por organizaciones','Sector_Formacion','La demanda de un empleador no sustituye el nivel de posgrado deseado por un titulado.'),
            table('Tabla 8 Áreas emergentes mencionadas con mayor frecuencia',['Tema','Menciones','Porcentaje'],topics.slice(0,6).map(t=>[String(t.nombre),cellNumber(t.cantidad),pct(t.porcentaje)]),'Clasificación preliminar por palabras clave; una respuesta puede mencionar varios temas. No mide insuficiencia ni número de puestos disponibles.',[0.64,0.16,0.2]),
            text(methodology.filter(row=>String(row.indicador).startsWith('Base temática:')).map(row=>`${row.indicador}: ${row.valor}`).join(' ') || 'No hay bases temáticas disponibles. La ausencia de coincidencias no equivale a ausencia de necesidades.'),
            sub('Percepción de la formación y competencias'),
            table('Tabla 9 Valoración de titulados sobre su formación',['Pregunta','n válido','Media','Mediana','Desv.'],ratings.map(t=>[String(t.pregunta),cellNumber(t.validas),formatAcademicNumber(t.media,2),formatAcademicNumber(t.mediana,2),formatAcademicNumber(t.desviacion_muestral,2)]),'Escala nativa de acuerdo 1 a 4. Desviación muestral solo con al menos dos respuestas. No comparar directamente con la escala 1 a 3 de empleadores.',[0.5,0.12,0.12,0.13,0.13]),
            {tipo:'radar',titulo:'Figura 2 Percepción de empleadores sobre perfil y competencias',grupo:r.radares[0],nota:'Medias nativas de acuerdo 1 a 3, con bases por eje en la tabla. No son una medición separada de cada competencia técnica y transversal.'},
        ]},
        { titulo:'5 Diagnóstico y síntesis de resultados', bloques:[
            sub('Financiamiento de programas cursados'),
            text(funding.length?`La fuente más declarada es ${funding[0].nombre.toLowerCase()}, con ${funding[0].cantidad} respuestas (${pct(funding[0].porcentaje)}). Esta distribución caracteriza antecedentes de la muestra. No prueba restricciones económicas ni permite deducir la fuente que utilizarían en un nuevo programa.`:'No hay fuentes reconocidas para describir antecedentes de financiamiento.'),
            frequencyTable('Tabla 10 Fuentes utilizadas','HU3_Fuentes','Categorías del instrumento: recursos propios, beca parcial y beca total. No distingue al otorgante de las becas.'),
            table('Tabla 11 Cruce de nivel cursado y financiamiento utilizado',['Nivel cursado',...c.columnas,'Total'],[...c.filas.map((name,i)=>[name,...c.observadas[i],c.totalesFila[i]]),['Total',...c.columnas.map((_,j)=>c.observadas.reduce((n,row)=>n+row[j],0)),c.total]],'Cantidades observadas. El color de las celdas destaca su proporción por fila y no representa significancia.'),
            text(contrastText(r)),
            table('Tabla 12 Aspectos por mejorar más seleccionados',['Aspecto','Personas','Porcentaje'],improvements.slice(0,6).map(t=>[String(t.nombre),cellNumber(t.cantidad),pct(t.porcentaje)]),'Base: personas de la población seleccionada que respondieron esta pregunta. Una persona puede elegir varias opciones.',[0.64,0.16,0.2]),
            text('La convergencia entre preferencias temáticas, mejoras curriculares y menciones de empleadores orienta temas para estudio, pero no identifica una brecha causal ni autoriza eliminar asignaturas por su posición en un ranking. Las muestras no están pareadas y sus medias no deben restarse como formación recibida menos requerida.'),
        ]},
        { titulo:'6 Conclusiones y propuestas estratégicas', bloques:[
            text(r.titulados?`Los indicadores describen una muestra con ${pct(occupation?.valor)} de ocupación actual entre situaciones reconocidas y preferencias de posgrado concentradas principalmente en ${areas[0]?.nombre ?? 'áreas aún no identificadas'}. La información permite priorizar estudios complementarios, pero no estimar demanda efectiva de matrícula, inserción por cohorte ni rentabilidad de programas.`:'La generación no contiene respuestas de titulados visibles. No es posible sostener conclusiones sobre su perfil o demanda; se requiere revisar cargas y permisos.'),
            text('Se propone estudiar programas modulares en las áreas con mayor preferencia, contrastando nivel deseado, disponibilidad de pago, modalidad, costos y cupos. Antes de abrir una oferta, validar esos supuestos con un instrumento complementario y con la unidad académica responsable.'),
            text('Las fuentes históricas de financiamiento justifican investigar mecanismos de becas, crédito o convenios empresariales, sin asumir que los mismos mecanismos se repetirán. Para revisar el currículo, contrastar las mejoras señaladas con resultados de aprendizaje, contenidos y evidencia de desempeño. La valoración por competencia debe recogerse individualmente frente al puesto.'),
            sub('Estado del producto final solicitado'),
            table('Tabla 13 Cumplimiento y pendientes',['Componente','Estado','Pendiente verificable'],[
                ['Documento académico','Generado para revisión','Completar autoría, periodo, revisión docente y respaldo del levantamiento.'],
                ['Herramienta de recolección','Parcial','El sistema importa respuestas de formularios externos. No incorpora captura directa propia.'],
                ['Análisis y reportes','Implementado','Validar resultados y archivos exportados con el comité. Persisten las limitaciones de datos descritas.'],
                ['Experimentación de escenarios','Pendiente','Definir variables de decisión, modelo, supuestos, escenarios y criterios de evaluación.'],
                ['Simulación de sistemas','Pendiente','Implementar y validar experimentos reproducibles; el corte de experiencia solo segmenta respuestas observadas.'],
            ],'La generación de un PDF no sustituye la experimentación ni acredita por sí sola el cumplimiento integral de la guía.',[0.25,0.2,0.55]),
            text('Para la fase de simulación puede estudiarse la matrícula de un programa bajo distintos cupos, aranceles y apoyos. Esa propuesta requiere estimar probabilidades de inscripción y abandono, costos y efectos de las ayudas; tales parámetros no están disponibles en las encuestas actuales. Los resultados hipotéticos deben identificarse como escenarios y separarse de las respuestas observadas.'),
        ]},
        { titulo:'7 Referencias bibliográficas', bloques:[
            text('Carrera de Ingeniería en Sistemas, Universidad Mayor de San Simón. (s. f.-a). Encuesta de opinión a titulados de Ingeniería en Sistemas [Conjunto de datos no publicado proporcionado por el docente].'),
            text('Carrera de Ingeniería en Sistemas, Universidad Mayor de San Simón. (s. f.-b). Encuesta empleadores II Sistemas [Conjunto de datos no publicado proporcionado por el docente].'),
            text('Guía metodológica y técnica integral Análisis de Mercado y Herramienta de Recolección de Datos Enfoque ARCUSUR. (s. f.). [Material de asignatura proporcionado por el docente, archivo TSS_2.pdf].'),
            text('National Institute of Standards and Technology. (s. f.). Chi-square independence test. Dataplot. https://itl.nist.gov/div898/software/dataplot/refman1/auxillar/chistest.htm'),
            text('Universidad Mayor de San Simón. (s. f.). Escudo UMSS. https://www.umss.edu.bo/escudo-umss/'),
        ]},
        { titulo:'Anexo Trazabilidad y alcance', bloques:[
            text(`Generado en UTC: ${r.generadoUTC}. Versión de método: ${r.version}. Huella SHA-256 del contenido analítico: ${r.huella}. Identifica la generación de datos, no el archivo PDF ni la autoría académica. No es una firma institucional.`),
            text(`Población de competencias: ${cohort}. Corte exploratorio de experiencia: ${r.parametros.corte} años. El detalle completo de frecuencias, exclusiones, escalas y reglas de clasificación se conserva en el Excel de análisis de la misma generación.`),
            table('Tabla A1 Procedencia registrada',['Origen','Archivo','Respuestas'],academicRows(r,'Procedencia').map(row=>[String(row.tipo),String(row.archivo),cellNumber(row.respuestas)]),'Se presenta lo registrado en la base. Los nombres o huellas ausentes no se inventan.',[0.2,0.65,0.15]),
            text('La generación automática organiza evidencia y propuestas para revisión. No reemplaza la verificación académica de autoría, referencias, instrumentos, consentimiento ni trabajo de campo exigido por la asignatura. El equipo debe documentar las empresas participantes según las instrucciones del docente sin publicar datos de contacto de las personas.'),
        ]},
    ];
    const resumen = `Este informe analiza ${r.titulados} respuestas de titulados y ${r.empleadores} de empleadores. ${occupation?.base_valida ? `La ocupación actual declarada alcanza ${pct(occupation.valor)} en su base válida.` : 'No hay una base válida para informar ocupación.'} ${areas.length ? `La mayor preferencia temática de posgrado corresponde a ${areas[0].nombre}.` : 'No hay preferencias temáticas utilizables.'} Los resultados permiten un diagnóstico descriptivo; faltan datos para evaluar preferencias de nivel y financiamiento futuro y suficiencia por competencia. La simulación de escenarios sigue pendiente.`;
    return { titulo:'Análisis de mercado de titulados de Ingeniería en Sistemas', subtitulo:'Perfil profesional y formación continua frente a los requerimientos del sector productivo', resumen, sections };
}
const cellNumber = (v: unknown): number | null => value(v);

function contrastText(r: AnalysisReport) {
    const rows = academicRows(r,'HU3_Contraste');
    const get = (key: string) => rows.find(row=>row.indicador===key)?.valor;
    if(r.cruce.estado==='frecuencias_bajas') return `El estadístico de Pearson es ${formatAcademicNumber(get('Chi-cuadrada'),3)}, con ${formatAcademicNumber(get('Grados de libertad'),0)} grados de libertad. ${formatAcademicNumber(get('Esperadas menores de 5'),0)} de ${r.cruce.filas.length*r.cruce.columnas.length} esperadas son menores de 5; la mínima es ${formatAcademicNumber(get('Mínima esperada'),3)}. La aproximación asintótica no cumple los criterios adoptados, por lo que no se presenta un p-valor interpretable ni una conclusión de asociación. Se requiere un método exacto o de permutación (NIST, s. f.).`;
    if(r.cruce.estado==='calculada') return `Pearson: ${formatAcademicNumber(get('Chi-cuadrada'),3)}, grados de libertad ${formatAcademicNumber(get('Grados de libertad'),0)} y p-valor ${Number(get('p-valor asintótico'))<0.0001?'< 0,0001':formatAcademicNumber(get('p-valor asintótico'),4)}. Con alfa ${formatAcademicNumber(get('Alfa'),2)}, ${Number(get('p-valor asintótico'))<Number(get('Alfa'))?'se encuentra evidencia de asociación':'no se encuentra evidencia suficiente de asociación'}. Esto no demuestra causalidad ni permite inferir intenciones futuras.`;
    return 'No hay condiciones suficientes para emitir una conclusión inferencial. La tabla y sus conteos permanecen disponibles como descripción; no se reemplaza la falta de un contraste válido por una afirmación de independencia.';
}
