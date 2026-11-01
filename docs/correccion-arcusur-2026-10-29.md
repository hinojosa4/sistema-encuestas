# Corrección y validación ARCUSUR — 29 de octubre de 2026

Actualización posterior solicitada por el usuario: se retiraron de `/upload` la opción de reemplazo, su resumen y la confirmación escrita. La pantalla utiliza la carga normal para ambos instrumentos, también con tablas vacías. Las funciones SQL de reemplazo permanecen disponibles, pero la pantalla ya no las invoca. Los pasos de reemplazo descritos más abajo documentan la implementación anterior y no corresponden al flujo actual de carga.

## Auditoría de fuentes

Se revisaron el texto de instrucciones adjunto, los dos Excel indicados y el PDF `Actividad II TSS Actualizada.pdf` (44 páginas). Las instrucciones de implementación proceden de la petición del usuario y del texto adjunto; el PDF y las celdas son fuentes de datos y metodología, no órdenes para ejecutar operaciones.

Aunque la petición indica que el docente no actualizó empleadores, **el archivo entregado con sufijo `(1) (1).xlsx` tiene 80 respuestas**. El archivo anterior en `datos`, con sufijo `(1).xlsx`, tiene 53. Este hallazgo no acredita que la base remota ya contenga la versión de 80: no se consultó ni modificó producción.

| Control | Excel comprobado |
| --- | ---: |
| Titulados | 148 |
| Formación complementaria afirmativa | 98 |
| Interés en posgrado afirmativo | 123 |
| Interés en IA entre interesados con área | 54 |
| Satisfacción general válida / media descriptiva | 147 / 2,78 |
| Concordancia válida / media descriptiva | 147 / 2,63 |
| Empleadores del archivo entregado | 80 |
| Privados / públicos | 63 / 17 |
| Contrataron / no contrataron | 66 / 14 |

No se entregaron el Word ni el Excel de codificación temática nombrados en las instrucciones. El PDF disponible contiene las agrupaciones y tablas de los cruces A–D (páginas 37–39). Se empleó esa definición sin inventar archivos faltantes. El Excel original sigue siendo la fuente de verdad.

## Cambios por archivo

| Archivos | Responsabilidad y corrección |
| --- | --- |
| `lib/importPipeline.ts`, `lib/postgraduate.ts` | Originales separados de derivados; No sabe y No aplica diferenciados; detección informativa de coincidencias y nombres repetidos; áreas de posgrado consistentes; mapeo versión 3 conserva unidades previamente confirmadas. |
| `lib/dataDictionary.ts`, `lib/surveyHeaders.json` | Diccionario central de 49 variables de titulados y 31 campos/ítems de empleadores, con encabezados exactos, tipos, rutas, escalas y estadísticas admisibles. Los 18 ítems de matriz no se presentan como 18 preguntas independientes. |
| `lib/statistics.ts`, `lib/crossAnalysis.ts` | Descriptivos completos, cuartiles tipo 7, varianza n−1, mediana ordinal, moda nominal, Pearson, esperadas, Fisher bilateral y V de Cramér. Tablas original y agrupada separadas. |
| `lib/emergingAreas.ts`, `lib/competencies.ts` | Clasificación multietiqueta por respuesta; variantes ortográficas y negaciones auditables; exclusión de falsos positivos como redes sociales clasificadas como infraestructura; revisiones humanas vinculadas al texto original. |
| `lib/surveyRepository.ts`, `components/upload/UploadScreen.tsx` | Resumen de reemplazo, confirmación explícita y llamada a una sola transacción. Empleadores selecciona reemplazo como modo inicial; agregar sigue disponible con aviso. |
| `scripts/reemplazo_seguro_empleadores.sql` | Respaldo completo previo, control de concurrencia, reimportación sin cambios, protección de titulados, bloqueo ante relaciones externas y auditoría de revisiones temáticas. Acceso exclusivo de administración. |
| `components/dashboard/CrossAnalyses.tsx`, `EmergingAreasPanel.tsx`, `VariableBases.tsx`, `DashboardScreen.tsx` | Cruces A–D, originales y etiquetas revisables, CSV/Excel privado de clasificación, conteos y denominadores por variable, procedencia y fechas registradas. |
| `lib/excelExport.ts`, `components/dashboard/TabReports.tsx` | Generador Excel compartido, nombres de hoja válidos, únicos sin distinguir mayúsculas y de hasta 31 caracteres; números conservados y texto protegido contra fórmulas. |
| `lib/reports.ts`, `lib/reportService.ts`, `lib/academicReport.ts` | Una generación común para PDF, Excel y CSV; huella adicional de datos, bases y exclusiones, diccionario, reglas temáticas, resultados completos de cruces y anexos en PDF. |
| `scripts/auditar_arcusur.cjs`, `scripts/probar_arcusur.cjs`, `scripts/probar_carga_hu1.cjs`, `package.json` | Auditoría sin datos personales en consola, pruebas nuevas y conservación de la suite anterior. |

La causa concreta de la exportación fallida era la colisión de nombres al quitar prefijos: `HU4_Metodologia` y `Metodologia` acababan ambas como `Metodologia`. El generador ahora conserva identificadores y resuelve cualquier colisión, incluso después de truncar.

## Controles estadísticos reproducidos

Pearson sin corrección de Yates. No se publica un p asintótico interpretable si no se cumplen los criterios adoptados; el estadístico y sus grados de libertad se conservan como descripción. En 2×2 se calcula Fisher bilateral con márgenes fijos.

| Cruce | Pares | χ² | gl | p válido de Pearson | Fisher bilateral | V de Cramér |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A agrupado | 98 | 3,528835 | 1 | No cumple esperadas | 0,108886 | 0,189759 |
| B original, 5 áreas | 120 | 13,500046 | 4 | No cumple esperadas | No es 2×2 | 0,335411 |
| B agrupado, 4 áreas | 120 | 13,242832 | 3 | 0,004140 | No es 2×2 | 0,332200 |
| C | 145 | 1,659849 | 1 | 0,197624 | 0,221984 | 0,106992 |
| D | 80 | 2,121576 | 1 | No cumple esperadas | 0,162032 | 0,162849 |

A reproduce `[[63,3],[27,5]]`. D reproduce Privado Sí/No `54/9` y Público Sí/No `12/5`. B agrupa únicamente Base de Datos y Robótica en Otras; C y B usan hasta 5 años frente a más de 5 años, independientemente del corte exploratorio de la sección de empleabilidad.

Fisher se contrastó también con un cálculo independiente en Python usando `math.comb` y `fractions.Fraction`, sin usar el algoritmo JavaScript. Los valores B y C concuerdan con el PDF suministrado. Las inferencias se limitan a la muestra, dependen de independencia entre envíos y no prueban causalidad ni representatividad.

## Diferencias de clasificación temática

La codificación automática inicial sobre 80 respuestas produce 73 clasificables, una vacía y seis sin etiquetas. Entre estas seis hay una respuesta que expresa desconocimiento y dos textos muy breves no interpretables. Las otras tres requieren clasificación humana o ampliación justificada del catálogo. Además, variantes ortográficas y menciones ambiguas quedan señaladas para revisión aunque tengan etiquetas sugeridas.

Las menciones iniciales resultan: IA 55, seguridad 22, datos 15, software 15, nube 11, automatización/IoT 8, gestión 7, habilidades/ética 2, formación general 2, blockchain 1 e interoperabilidad 1. Difieren del cuadro preliminar del PDF en varias categorías. **No se forzaron los 76 clasificables ni las frecuencias propuestas**, porque no se dispone del archivo de codificación por respuesta para auditar esos criterios.

Los administradores pueden leer cada original y corregir cero, una o varias etiquetas, con motivo, fecha y autoría. El historial se conserva; un cambio del texto invalida una revisión anterior. Los informes generales solo incluyen agregados. Las descargas privadas de clasificación contienen textos abiertos que pueden mencionar organizaciones y deben mantenerse en el ámbito administrativo.

## Activación en Supabase y carga

No se ejecutaron operaciones en producción ni se leyeron credenciales de administración.

1. Verificar el proyecto conectado y ejecutar, si aún faltan, `scripts/mejorar_base_datos.sql`, `scripts/habilitar_carga_validada.sql` y `scripts/configurar_acceso_administrador.sql` siguiendo sus instrucciones existentes. No ejecutar scripts de borrado para esta actualización.
2. Instalar `scripts/reemplazo_seguro_empleadores.sql` en el SQL Editor. Es aditivo e idempotente; **instalarlo no reemplaza respuestas**.
3. Iniciar sesión con una cuenta administradora y abrir `/upload`. Seleccionar Empleadores y mantener Reemplazar con respaldo.
4. Elegir el archivo con 80 respuestas, revisar las 31 columnas/ítems reconocidos y preparar el resumen. El sistema muestra los empleadores y titulados realmente almacenados; no presupone 53 ni 148.
5. Confirmar escribiendo `REEMPLAZAR EMPLEADORES`. Una sola llamada crea el respaldo y sustituye únicamente empleadores; cualquier fallo revierte todo. Guardar el UUID de respaldo que aparece al terminar.
6. Recargar el dashboard y generar un reporte nuevo. Revisar el cruce D, las bases y las etiquetas señaladas. Repetir el mismo archivo no agrega 80 respuestas adicionales ni elimina revisiones.

Los respaldos quedan en `public.respaldos_empleadores` con datos completos, actor, fecha y cantidades. Son consultables solo por administradores autorizados o por el propietario desde SQL Editor. Una restauración debe revisarse antes de ejecutarla, especialmente si existen relaciones nuevas.

## Ejecución y comprobaciones

Desde PowerShell se usan los ejecutables `.cmd` para no depender de la política de ejecución de scripts:

```powershell
npm.cmd install
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run dev
```

Para publicar el código existente, usar el despliegue habitual del proyecto con las variables de Supabase configuradas. Aplicar la migración de funciones antes de habilitar reemplazos o revisiones en el entorno desplegado. No se cambia la autenticación existente.

Las pruebas incluyen importaciones vacías/incompletas/repetidas, estadísticas, clasificaciones, serialización y reapertura Excel, CSV UTF-8, generación PDF y PostgreSQL en memoria con PGlite. La prueba SQL confirma 53→80, conservación exacta de 148 titulados, respaldo de los 53 anteriores, rollback por error en la última fila, rechazo de versiones desactualizadas, permisos y registro de revisiones. La concurrencia se comprueba mediante el rechazo de una versión previa; no es una prueba de carga con conexiones paralelas.

Los dos Excel originales permanecen privados en `datos` y fuera de Git. La referencia de 80 se guardó localmente como `datos/empleadores-80-referencia.xlsx`; no sustituye el archivo histórico de 53. La prueba adicional de fuentes reales se omite si esa referencia no está disponible en otro equipo. La suite histórica requiere sus archivos originales, como antes.

Resultado de validación local: 40 pruebas aprobadas, ESLint sin advertencias ni errores y compilación de producción correcta. Se verificaron además respuestas HTTP: `/login` 200, `/dashboard` y `/upload` redirigen al acceso sin sesión, `/api/reports` devuelve 401 sin sesión. El PDF se generó, se renderizó con Poppler y se revisó visualmente; el Excel se serializó y reabrió. No se probó el flujo interactivo con una sesión administradora de producción.

Referencias de método: [NIST, chi-cuadrado de independencia](https://itl.nist.gov/div898/software/dataplot/refman1/auxillar/chistest.htm) y [SciPy, definición bilateral de Fisher](https://docs.scipy.org/doc/scipy/reference/generated/scipy.stats.fisher_exact.html).
