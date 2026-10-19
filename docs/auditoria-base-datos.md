# Auditoría de formularios, archivos de respuestas y modelo de datos

Fecha de revisión: 18 de octubre de 2026.

## Dictamen y alcance

Los archivos suministrados contienen las preguntas de todas las ramas de los formularios públicos actuales. No falta una rama completa del cuestionario de titulados. Sí hay errores de importación, pérdida de significado de escalas y diferencias entre ciertos saltos actuales y las respuestas históricas. Conviene corregir el mapeo y completar el modelo antes de volver a importar.

Se revisaron los dos CREATE TABLE compartidos por el usuario después de la primera auditoría. Ese esquema ya contempla cinco de los seis campos inicialmente propuestos: solo falta `ha_trabajado_antes` para cubrir las preguntas de titulados. También existen `otra_area_trabajo` y `otro_cargo_actual`. El acceso directo a Supabase sigue sin verificarse: la API respondió `401 Invalid API key`. El DDL compartido permite evaluar las columnas declaradas, pero no confirma por sí solo el estado desplegado, las políticas de acceso o el contenido guardado. Esta revisión no modificó tablas, registros, formularios ni XLSX.

Se comprobaron los SHA-256: los dos archivos de Descargas son idénticos a sus copias en `datos/`. Se procesaron 148 respuestas de titulados y 53 de empleadores con el lector XLSX y las funciones de mapeo del proyecto. Se leyó la definición pública de ambos formularios sin enviar respuestas. No se inspeccionó una sesión interactiva de navegador: no había un navegador conectado.

## Fuentes

- Titulados: https://forms.cloud.microsoft/Pages/ResponsePage.aspx?id=wR0v9qZR_0qf1njdcpLxNXKXS3EW0SpGiKWGtu349tdURTRMMVJOTUhBWUJCNkxQMzAyQ0NEN1JMTS4u
- Empleadores: https://forms.gle/c2Tz4m4gycoYq96t8
- `datos/ENCUESTA DE OPINIÓN A TITULADOS DE INGENIERÍA EN SISTEMAS (1).xlsx`, hoja `Sheet1`.
- `datos/ENCUESTA EMPLEADORES II SISTEMAS (respuestas) (1).xlsx`, hoja `Respuestas de formulario 1`.
- `lib/dataMappers.ts`, `app/upload/page.tsx`, `lib/fileValidation.ts` y `scripts/setup_encuesta_empleadores.sql`.
- CREATE TABLE de `encuesta_titulados` y `encuesta_empleadores` pegados por el usuario en esta conversación, revisados como definición del esquema proporcionado.

## Cobertura de los formularios

### Titulados

La definición pública tiene 55 elementos: 49 preguntas que reciben respuestas y 6 contenedores de matrices Likert. Las 49 preguntas tienen su columna en el Excel, incluidas las dos preguntas diferentes con el título repetido «Otra asignatura». Excel las distingue como `Otra asignatura:` y `Otra asignatura:1`.

Las 167 columnas del archivo también incluyen metadatos de Microsoft Forms y columnas auxiliares de puntuación/comentarios; no representan 167 preguntas de investigación. Los 148 identificadores de respuesta del archivo están presentes y son únicos dentro de ese archivo.

| Ruta | Datos observados | Lectura |
|---|---:|---|
| Realizó o cursa formación complementaria: sí | 98 | Las 98 respuestas tienen nivel, institución, financiamiento y nombre del programa. |
| Realizó o cursa formación complementaria: no | 50 | Las cuatro preguntas anteriores están vacías en las 50 respuestas, de acuerdo con el salto. |
| Interés en posgrado: sí | 123 | Las 123 respuestas tienen área e institución de interés. |
| Interés en posgrado: no | 25 | Área e institución futuras vacías en las 25 respuestas, de acuerdo con el salto. |
| Trabaja en una organización | 108 | Las 108 respuestas tienen el bloque principal de trabajo actual. |
| Emprendimiento propio | 15 | Las 15 tienen origen, entregable, financiamiento y ambas valoraciones del negocio. |
| Actualmente no trabaja | 25 | Las 25 tienen motivo y pregunta sobre experiencia laboral anterior. |
| No trabaja, pero trabajó antes | 17 | Las 17 tienen tiempo hasta el primer trabajo y cantidad de empleos. |
| No trabaja y nunca trabajó | 8 | Las 8 omiten esas dos preguntas, de acuerdo con el salto. |

Saltos actuales identificados en la definición pública:

1. Formación complementaria: sí abre el bloque de estudios cursados; no salta al interés futuro.
2. Interés futuro: sí abre área/institución; no salta a la opinión del posgrado FCyT.
3. Situación laboral: organización abre empleo actual; emprendimiento salta al bloque del negocio; no trabaja salta a motivo/experiencia previa.
4. Las opciones de remuneración del empleo actual saltan al bloque de primer empleo, evitando el bloque del emprendimiento.
5. Ambas respuestas sobre si el trabajo actual es el primer empleo apuntan actualmente al tiempo hasta el primer trabajo.
6. Quien no trabaja y declara experiencia anterior continúa a inserción laboral; quien nunca trabajó salta a satisfacción con la carrera.
7. El rechazo a integrar la red de contactos finaliza actualmente el formulario; la aceptación continúa a email, teléfono y LinkedIn.

Las preguntas `OTR@ AREA`, `OTR@ CARGO` y las dos de otra asignatura están actualmente marcadas como obligatorias y no tienen saltos por elección de «Otro» en la definición consultada. Por eso no corresponde validar que solamente respondan quienes eligieron «Otro». Existen respuestas de relleno y deben conservarse como originales y marcarse en la limpieza.

### Diferencias entre la definición actual y el archivo de titulados

- 39 personas que trabajan en organización o emprendimiento no tienen tiempo hasta el primer trabajo ni cantidad de empleos. Actualmente ambas respuestas sobre primer empleo conducen a esas preguntas. El bloque cuenta con 101 respuestas, frente a 140 personas que tendrían esa ruta según el formulario actual. Los 8 que nunca trabajaron sí justifican la omisión por bifurcación.
- De 63 personas que rechazaron integrar la red, 19 sí tienen email, teléfono y LinkedIn. Las 85 que aceptaron también tienen esos campos: 104 respuestas con contacto en total. No se debe interpretar la mera presencia de datos como consentimiento vigente para contactarlas.
- La pregunta de asignaturas menos útiles exige actualmente exactamente cinco opciones; el Excel contiene 68 respuestas con dos opciones y 80 con cinco. Son registros históricos que requieren conservar la versión del instrumento o documentar la discrepancia.

Estos hechos no prueban por sí mismos que haya una pérdida de datos o respuestas incorrectas. Pueden deberse a cambios de configuración, edición de respuestas u otras diferencias históricas. No hay un historial de versiones que permita resolver la causa. No rellenar ni borrar esas respuestas automáticamente.

### Empleadores

El formulario público contiene 12 preguntas generales/laborales y 18 ítems de valoración, además del correo: 31 campos de respuesta. El Excel tiene esos 31 campos más la marca temporal: 32 columnas y 53 registros. Todos los campos tienen una respuesta no vacía.

No se identifican saltos por respuesta: la definición pública no contiene secciones de salto ni destinos condicionales en las opciones. Los encabezados de empleabilidad, formación y relación institucional son separadores visuales. Las 30 preguntas sustantivas coinciden con las columnas del Excel; el correo y la marca temporal completan la exportación.

## Errores confirmados en el mapeo de titulados

| Columna Excel | Pregunta / dato | Resultado actual | Acción necesaria |
|---|---|---|---|
| BA y BD | Nombre y rubro de la empresa | Las dos se asignan a `empresa_trabajo_actual`; BD sobrescribe BA en las 108 respuestas laborales. `rubro_empresa_trabajo` no se llena desde esa columna. | Corregir la condición de coincidencia y asignar BD exclusivamente al rubro. |
| BS | Otra área | 108 respuestas no se asignan a campo específico. | Reconocer `OTR@ AREA` y guardar en `otra_area_trabajo`. |
| BY | Otro cargo | 108 respuestas no se asignan a campo específico. | Reconocer `OTR@ CARGO` y guardar en `otro_cargo_actual`. |
| CG | Antigüedad en trabajo actual | 108 respuestas sin campo específico de importación. | Incorporar `antiguedad_trabajo_actual` como categoría de rango. |
| CJ | Medio por el que obtuvo el empleo | 107 respuestas sin campo específico de importación. | Incorporar `medio_obtencion_trabajo`. |
| CM | Remuneración mensual | 108 respuestas sin campo específico de importación. | Incorporar `remuneracion_mensual_rango`; no convertir el intervalo a un sueldo exacto. |
| DO | Ha trabajado antes, estando actualmente sin trabajo | 25 respuestas sin campo específico de importación. | Incorporar `ha_trabajado_antes`. |
| EQ | Otra asignatura que dio ventaja | 148 respuestas sin campo específico de importación. | Incorporar `otra_asignatura_ventaja`. |
| EW | Otra asignatura menos útil | 148 respuestas sin campo específico de importación. | Incorporar `otra_asignatura_menos_util`; distinguirla de EQ aunque el título base se repita. |
| DA | Satisfacción con el negocio | Las 15 respuestas originales se convierten en `null`. | Codificación propia de tres niveles. |
| DF | Importancia de la formación para el negocio | Las 15 respuestas originales se convierten en `null`. | Codificación propia de cuatro niveles. |
| AR y AU | Vida profesional y desempleo | Vacíos y textos no numéricos pasan a cero; las unidades explícitas de desempleo se descartan. | Guardar original, valor normalizado, unidad y estado de validación. |

Son ocho preguntas sin destino específico (BS, BY, CG, CJ, CM, DO, EQ, EW), una pregunta con destino incorrecto (BD) y dos valoraciones reconocidas cuyo contenido se pierde al convertirlo (DA, DF).

La información original no se pierde necesariamente de forma definitiva: los mapeadores incluyen `raw_data` con la fila completa. Sin acceso válido a Supabase no se verificó que cada fila existente haya conservado ese respaldo. Si está presente, permite reconstruir campos; también puede volver a importarse desde los XLSX después de corregir el flujo.

## Errores confirmados en el mapeo de empleadores

| Columna | Campo SQL ya previsto | Problema |
|---|---|---|
| X | `participacion_evaluacion_desempeno` | No reconoce la coma que permanece después de «información» en el texto normalizado. Las 53 respuestas no llegan al campo. |
| AA | `participacion_difusion_pasantias` | No reconoce la coma que permanece entre oportunidades laborales y convocatorias. Las 53 respuestas no llegan al campo. |
| A | No hay columna específica en el SQL versionado | La fecha original de respuesta queda solo en `raw_data`. `created_at` corresponde a inserción en la base y no reemplaza esa fecha. |

Las columnas X y AA ya están contempladas en el SQL de empleadores: sus fallos requieren corregir la importación, no agregar columnas duplicadas. X contiene 15 respuestas «No sabe» y AA contiene 7; deben poder diferenciarse de los casos sin respuesta.

## Tipos y estados que debe soportar el modelo

### Escalas

No existe una única escala de cinco niveles para todas las preguntas:

| Grupo | Categorías ordenadas del formulario | Almacenamiento recomendado |
|---|---|---|
| Acuerdo de titulados | Totalmente en desacuerdo; en desacuerdo; de acuerdo; totalmente de acuerdo | Categoría original y código ordinal 1–4. |
| Satisfacción del negocio | Insatisfecho; algo satisfecho; satisfecho | Categoría original y código ordinal 1–3. |
| Importancia de formación para negocio | No es importante; poco importante; importante; muy importante | Categoría original y código ordinal 1–4. |
| Valoración de empleadores | Totalmente desacuerdo; parcialmente de acuerdo; totalmente de acuerdo; además «No sabe» | Tres niveles sustantivos; conservar «No sabe» como categoría/estado propio. |

Los códigos son una propuesta de representación, no una nueva respuesta del encuestado. Si se desea una puntuación transformada a cinco puntos para presentación, documentar la transformación y conservar las categorías originales. No confundir «No sabe» con dato faltante o con el punto medio de acuerdo.

### Tiempo, categorías y selección múltiple

- Edad: el instrumento pregunta por intervalos; guardar categoría o código de intervalo, no afirmar que es una edad exacta.
- Vida profesional: decimal en años con original conservado; aceptar cero si es una respuesta válida. No reemplazar texto inválido por cero.
- Desempleo: conservar el texto original y normalizar únicamente cuando la unidad sea justificable. Hay respuestas explícitas en años y meses y números sin unidad. Marcar las ambiguas para revisión; no asumir una unidad para todas.
- Antigüedad laboral y salario: categorías de rango, no cantidades exactas.
- Aspectos útiles, aspectos por mejorar, asignaturas y cargos de empleadores: selección múltiple. Conservar respuesta original y representar cada elección separadamente, con `text[]` o tablas hijas, si se necesitan filtros y conteos. No dividir los cargos de empleadores por cada coma: algunas opciones contienen comas dentro del propio rótulo.
- Email, teléfono y LinkedIn: texto; los teléfonos no son magnitudes numéricas.

### Datos ausentes y bifurcaciones

Los campos de ramas deben permitir `NULL`. Distinguir al menos:

- `respondida`: existe respuesta válida, incluido cero cuando corresponda.
- `no_aplica`: la ruta conocida de esa versión del formulario omite la pregunta.
- `sin_respuesta`: la pregunta corresponde, pero no hay respuesta.
- `no_sabe`: respuesta expresa del instrumento de empleadores.
- `invalida`: el valor no puede interpretarse con las reglas documentadas.
- `ruta_desconocida`: no puede determinarse la aplicabilidad histórica con la versión actual.

El estado puede almacenarse en un JSONB de validación por campo para mantener las tablas principales sencillas. No es necesario crear una columna de estado para cada pregunta. Las reglas de obligatoriedad dependen de la ruta y la versión, no solo del indicador `required` del formulario actual.

## Ajustes propuestos a la base

Mantener `encuesta_titulados` y `encuesta_empleadores` como tablas principales es suficiente para este alcance. No hace falta rediseñar todo como un motor genérico de encuestas.

1. Según el DDL compartido, agregar únicamente `ha_trabajado_antes TEXT NULL` para completar la cobertura de preguntas. Ya existen `antiguedad_trabajo_actual`, `medio_obtencion_trabajo`, `remuneracion_mensual`, `otra_asignatura_ventaja`, `otra_asignatura_menos_util`, `otra_area_trabajo` y `otro_cargo_actual`. Usar el nombre existente `remuneracion_mensual` para la categoría salarial; no crear una columna duplicada llamada `remuneracion_mensual_rango`.
2. Corregir los mapeadores antes de cargar datos. No basta con modificar el SQL: las columnas nuevas seguirían vacías si el importador no las asigna.
3. Guardar las categorías originales de escalas y sus códigos propios; documentar cualquier puntuación derivada.
4. Preservar `raw_data` y agregar metadatos de procedencia: importación, archivo/huella SHA-256, hoja, fila de origen, versión del instrumento, identificador y fecha de respuesta cuando existan.
5. Incorporar una tabla de importaciones con fecha, tipo de encuesta, conteos y estado de carga. El identificador de Microsoft Forms es único en este archivo, no necesariamente entre encuestas diferentes. Asociarlo al instrumento de origen. Para empleadores no hay identificador de respuesta exportado: usar una clave técnica de procedencia y una política explícita de duplicados, sin considerar email o empresa como identificadores únicos de encuestados.
6. Registrar advertencias de calidad y rutas históricas sin descartar automáticamente respuestas que difieren del formulario actual.
7. Sustituir el borrado previo a la carga por un reemplazo transaccional o publicación de un lote ya validado. Conservar el lote anterior hasta confirmar la carga completa.
8. Revisar restricciones y políticas reales de acceso. El SQL versionado habilita SELECT e INSERT anónimos en empleadores y no contiene política de DELETE, aunque el importador intenta borrar antes de insertar. Con esas políticas solamente, el flujo de reemplazo no tiene garantizado el comportamiento esperado. No abrir permisos de borrado anónimo como solución; realizar la administración con autorización apropiada.

## Comprobación pendiente en Supabase

Se preparó `scripts/inspeccionar_esquema.sql`, que contiene únicamente consultas de metadatos: columnas, restricciones, índices, activación de RLS y políticas de las dos tablas. Ejecutarlo en el SQL Editor y revisar su salida permite confirmar que el esquema desplegado coincide con el DDL compartido, sin consultar datos personales ni modificar la base.

`CREATE TABLE IF NOT EXISTS` no agrega columnas a una tabla preexistente. Si el SQL compartido es un script de creación y no una extracción del esquema desplegado, sus columnas deben comprobarse con la consulta de inspección antes de asumir que ya existen en Supabase.

## Resultado actualizado con el DDL del usuario

La estructura declarada es adecuada como base y permite representar las ramas mediante campos anulables. Para cobertura de preguntas solo falta `ha_trabajado_antes` en titulados. Empleadores ya tiene todos los campos de respuesta declarados. El DDL no incorpora fechas de respuesta originales ni estados de validación estructurados, y `raw_data` permite conservar sus valores de origen si se guarda correctamente.

El cambio mínimo de cobertura sería el siguiente; se documenta, pero no se ejecutó:

```sql
ALTER TABLE public.encuesta_titulados
ADD COLUMN IF NOT EXISTS ha_trabajado_antes TEXT NULL;
```

Los problemas de sobrescritura del nombre de empresa, preguntas sin mapeo y conversiones de escala siguen pendientes y requieren cambios de importación. Los NUMERIC anulables pueden almacenar códigos de las diferentes escalas, por lo que no es obligatorio cambiar su tipo para corregir la conversión. Los metadatos, catálogos y restricciones adicionales son mejoras del modelo, distintas de la columna que falta para cobertura.

Dictamen actualizado: **no hace falta reconstruir las dos tablas; falta un campo de pregunta en el esquema compartido y es necesario corregir el importador antes de volver a cargar datos**. La coincidencia del esquema desplegado, sus políticas y sus registros sigue pendiente de comprobación directa.
