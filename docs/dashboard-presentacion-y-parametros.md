# Presentación del análisis y parámetros metodológicos

Actualización: 19 de octubre de 2026.

La navegación usa Empleabilidad, Formación continua, Financiamiento, Formación y competencias y Reportes. Los identificadores HU permanecen como referencias internas de código y documentación; no aparecen como títulos del producto. Las tarjetas de indicadores tienen fondo blanco. Se mantienen colores en gráficos y mapas de calor porque representan categorías o proporciones y cuentan con etiquetas y leyendas.

El encabezado mantiene azul institucional y borde rojo tanto en acceso como dentro del sistema. La sección activa del navbar se destaca en blanco. En Cargar datos no se solicitan decisiones técnicas de limpieza ni la versión del cuestionario al administrador: la preparación se ejecuta automáticamente y se presenta un resumen para revisión. Las duraciones sin unidad confirmada no se convierten por suposición. La versión del instrumento queda sin consignar; archivo, hoja, huella y versión del mapeo se registran automáticamente.

Los valores y resúmenes cuantitativos se calculan desde las respuestas visibles. Las fórmulas, catálogos, escalas y advertencias metodológicas son reglas explícitas, no resultados precargados. El resumen de financiamiento muestra fuente predominante, conteo, porcentaje, becas y exclusiones de la generación actual. Las aclaraciones extensas sobre el alcance se ofrecen en desplegables.

## Año de egreso

La experiencia profesional no permite deducir el año de egreso. Sin años explícitos válidos, se oculta el análisis por cohorte y se explica la ausencia en un desplegable. Con datos válidos aparecen distribución de egreso, media, mediana y desviación estándar muestral de los años calendario transcurridos y una tabla de ocupación actual por cohorte. Cada fila informa ocupados, base con estado reconocido y exclusiones. Esto no representa una tasa longitudinal de inserción laboral.

Se aceptan años numéricos enteros entre 1900 y el año de referencia. El importador también reconoce el encabezado `anio_egreso`; la columna persistente se habilita mediante `scripts/habilitar_carga_validada.sql`. Los reportes incluyen tres tablas Egreso y usan como referencia el año UTC de su generación. Ningún año se completa desde la experiencia ni se escriben datos sintéticos en la base.

## Alfa y p-valor

`SIGNIFICANCE_LEVEL` en `lib/statistics.ts` centraliza alfa = 0,05 para el contraste y las exportaciones. Alfa es una decisión metodológica previa, no una estimación obtenida con las respuestas. La interfaz no ofrece cambiarlo después de ver el resultado. Un nivel distinto debe justificarse y acordarse en el protocolo; si la asignatura exige uno, debe respetarse.

El p-valor se calcula a partir de la tabla cuando se cumplen los criterios de la aproximación. Cambiar alfa no modifica ese p-valor ni corrige esperadas bajas. La tabla actual requiere otro método para inferencia; no se fabrica un p-valor ni se agrupan categorías para lograr significancia.

## Contenido de competencias

Las valoraciones de formación, concordancia y mejoras curriculares son el contenido principal. La perspectiva de empleadores ofrece contexto independiente. La vinculación institucional y los radares son complementarios y permanecen desplegables. Los radares apoyan la visualización solicitada en reportes; no sustituyen la medición individual de suficiencia por competencia. La advertencia de alcance permanece disponible para evitar interpretar percepciones generales como brechas numéricas entre formación recibida y exigencia del puesto.

Pendientes funcionales principales: captura directa de respuestas, variables futuras no recogidas en el instrumento, evaluación por competencia, método inferencial adecuado para el cruce disperso y experimentación reproducible con escenarios. Los filtros actuales solo segmentan observaciones.
