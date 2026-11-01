# HU5: reportes, matrices y gráficos exportables

Actualización: 19 de octubre de 2026.

## Qué se implementa

La pestaña «HU5 · Reportes» centraliza una generación de análisis en el backend. Permite descargar:

- **Excel de análisis:** tablas agregadas de HU1–HU4, matrices HU3 de doble entrada (observadas, porcentajes y esperadas), estadísticos, exclusiones, metodología y procedencia. Los gráficos interactivos no se incrustan en el Excel.
- **CSV de una tabla:** UTF-8 con BOM, encabezados y columnas consistentes. Cada fila incluye huella del reporte, fecha UTC, versión y filtros. Un CSV sin filas conserva solo encabezados; el nombre del archivo contiene fecha y prefijo de huella.
- **Informe académico PDF:** sustituye la descarga HTML. Incluye portada con escudo y colores UMSS (#003770, #E30613 y blanco), índice, resumen, las siete secciones académicas de la guía, figuras estáticas, tablas, referencias y anexo de trazabilidad. Autoría, docente y gestión pueden completarse en la interfaz. Los campos vacíos se identifican como pendientes. Los gráficos interactivos permanecen en HU3 y HU4; no se presenta un PDF como interactivo.

PDF, Excel y CSV proceden del mismo objeto generado. El PDF añade narrativa interpretativa a las tablas disponibles; Excel conserva el detalle completo. La portada del PDF no modifica la huella del contenido analítico, que tampoco es el hash del archivo PDF. Cambiar la población de HU4 o el corte exploratorio de HU1 invalida la generación anterior en la interfaz y solicita una nueva. Los parámetros se comparten con las pestañas HU1 y HU4. Se puede generar nuevamente para reflejar cambios posteriores en la base.

La exportación anterior de respuestas individuales sigue disponible por separado, identificada como lectura actual del navegador y con aviso de que puede incluir columnas de contacto. El nuevo reporte agregado no incluye filas de respuesta, contactos ni textos individuales. No se confunden ambas lecturas: una generación del servidor puede ser posterior a la lectura del dashboard.

## Backend y acceso

`GET /api/reports?scope=experiencia&corte=3` lee ambas tablas mediante paginación y calcula el reporte con las mismas funciones estadísticas utilizadas en el dashboard. Acepta `scope=experiencia|todos` y un corte entero de 0 a 30. Los parámetros inválidos producen 400; errores de configuración o consulta producen un mensaje redactado y no un reporte parcial.

El cliente envía la sesión mediante cookies del mismo origen. El servidor verifica el usuario con Supabase Auth y el permiso mediante `es_administrador()` antes de consultar datos: responde 401 sin sesión, 403 sin permiso o 503 si no se puede verificar. No utiliza claves de servicio ni realiza escrituras al generar reportes. El esquema de acceso se activa con `scripts/configurar_acceso_administrador.sql` y `scripts/activar_administrador.sql`; consultar `docs/acceso-administrador.md`.

Las consultas se realizan sin caché, con límite de 30 segundos por solicitud de red a Supabase. Las respuestas HTTP llevan `Cache-Control: private, no-store`. No se registra ni exporta el token de sesión. La aplicación incorpora un único rol administrador, sin registro público ni rol de comité separado.

Las pantallas HU1–HU4 conservan su cálculo local existente. La generación de HU5 se calcula en el servidor; no es una migración total de todas las pantallas al backend.

## Trazabilidad y límites

- Cada generación incluye fecha UTC, versión de método, población, corte y huella SHA-256 del objeto JSON antes de añadir la propia huella. La interfaz presenta la fecha en America/La_Paz.
- Excel añade una hoja Identificacion con esa huella. PDF la incluye en el anexo y un prefijo en sus pies de página. CSV la repite por fila. La huella identifica el contenido de una generación; no es el hash binario de cada formato, una firma institucional ni prueba de autenticidad de las respuestas.
- Procedencia agrupa los campos ya registrados: archivo, huella de archivo, hoja, instrumento, versiones e importación. Si faltan, se conserva esa ausencia; no se inventa una importación ni se recalcula el archivo que ya no está presente en el servidor.
- La consulta es paginada y abarca dos tablas; no constituye una instantánea transaccional de PostgreSQL. Evitar importaciones o modificaciones durante la generación. Todos los formatos de una generación sí comparten sus valores, aunque futuras generaciones puedan cambiar.
- Los vacíos numéricos quedan vacíos; cero se conserva. Los textos de CSV/Excel pasan por la protección contra interpretación como fórmulas. El PDF trata las etiquetas como texto, conserva los acentos españoles y pagina tablas y párrafos según su espacio disponible.
- Los resultados siguen siendo descriptivos de quienes respondieron. No se inventan variables faltantes ni se publica un p-valor asintótico interpretable para una tabla con esperadas bajas. La clasificación temática HU4 sigue siendo preliminar.

## Estado de cumplimiento

Se cubren exportación tabular, matrices cruzadas, informe académico PDF y generación automática de los análisis en backend. Los gráficos son interactivos en el dashboard y estáticos en el documento. Quedan fuera de este cambio: firma o validación institucional, bitácora persistente de reportes aprobados y una instantánea transaccional de las lecturas. La autorización se concentra en el único rol administrador. No se implementa exportación Word en esta versión: se selecciona PDF como formato académico entre las alternativas solicitadas.

El producto final de la guía sigue parcialmente cubierto: hay documento de análisis para revisión y herramienta de importación/análisis. La captura directa propia de encuestas y la experimentación por simulación de escenarios están pendientes. Los filtros descriptivos no sustituyen un modelo de simulación. El PDF incluye una matriz de cumplimiento y no inventa resultados de escenarios ni un nuevo trabajo de campo realizado por el equipo.

La limitación de datos de HU4 permanece: falta evaluar suficiencia por competencia técnica/transversal frente al puesto. Esa ausencia no impide exportar los análisis disponibles, pero no se declara completa literalmente esa parte de HU4.

## Verificación

Pruebas con los archivos oficiales: matrices conciliadas con sus totales, porcentajes por fila, ida y vuelta XLSX en memoria, parámetros inválidos, CSV con fórmulas/comillas/saltos de línea/ceros, ausencia de respuestas individuales en el objeto de análisis, estructura académica, colores UMSS, generación y lectura PDF, hash y propagación de errores sin reporte parcial. Se ejecutan TypeScript, ESLint y compilación de producción. Se genera y renderiza un PDF con datos reales para inspección visual de la paginación, tablas y figuras.

Las pruebas automáticas de lectura utilizan dobles de cliente. Antes de incorporar el acceso administrador se comprobó el servicio real: devolvió 148 titulados y 53 empleadores con la clave pública configurada, sin escrituras. Esa comprobación histórica no certifica las políticas nuevas: después de activar el esquema de acceso se debe verificar la sesión administradora real. Las políticas nuevas se prueban además en PostgreSQL temporal con identidades y respuestas sintéticas.

La descarga desde el navegador y los controles del dashboard deben verificarse con una sesión conectada. La ampliación de perfil y sector incorporó siete distribuciones para un total de 28 tablas. La revisión posterior añade distribución, ocupación y estadísticos de egreso: el reporte contiene ahora 31 tablas, aunque las de cohortes pueden quedar vacías si no hay años explícitos válidos.
