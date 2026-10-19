# HU1 y carga validada

Actualizacion: 19 de octubre de 2026.

## Revision de controles y HU2

La validacion de columnas comprueba las 49 preguntas de titulados y las 31 columnas de respuesta de empleadores (incluido correo). No exige un total fijo de columnas fisicas: Microsoft Forms agrega metadatos, puntuaciones y comentarios. Las preguntas faltantes y encabezados ambiguos bloquean el guardado. Las columnas adicionales no reconocidas generan una advertencia y requieren revision; no se descartan sus originales. Las celdas vacias por una bifurcacion son distintas de columnas ausentes.

Un archivo sin bytes se rechaza inmediatamente. Un libro vacio, una hoja con solo titulos o filas que solo contienen metadatos muestra un aviso antes de guardar. En CSV se exige que cada respuesta conserve el numero de campos de los titulos, incluso si algunos campos estan vacios. Los mensajes mostrados a la persona usuaria no exponen errores internos del lector de archivos ni de SQL.

La primera tarjeta del dashboard se llama ahora «Media de experiencia profesional (HU1)»: el numero grande es la media en anos. Debajo aparecen mediana, desviacion muestral y cantidad de respuestas validas/excluidas. Si no hay respuestas validas se muestra un guion y una explicacion.

HU2 sigue parcialmente cubierta por los datos: se dispone de area futura de interes y nivel ya cursado, pero no del nivel futuro deseado. El panel advierte esta diferencia. La concentracion de las dos areas principales se calcula con los conteos originales y se compara con un umbral orientativo de mas del 70%, sin sumar porcentajes ya redondeados. Se retiro la afirmacion automatica de viabilidad financiera y el diagnostico automatico de «distribucion equilibrada» bajo ese umbral.

El panel ahora muestra la demanda entre quienes declaran interes y normaliza escritura y acentos de las cinco areas del instrumento. Para completar HU2 falta disponer del nivel deseado en una nueva columna del docente o un instrumento complementario y construir el cruce nivel deseado por area. La viabilidad de programas exige ademas costos, capacidad, modalidad y disposicion a matricularse; no se deduce solo de preferencias porcentuales. El alcance de HU1-HU3, las bases y la nueva exportacion se detallan en [hu3-financiamiento-y-alcance.md](hu3-financiamiento-y-alcance.md).

## Activar la carga

Ejecutar en Supabase SQL Editor, en este orden:

1. `scripts/mejorar_base_datos.sql`, si aun no se aplico.
2. `scripts/habilitar_carga_validada.sql` (tambien puede repetirse).

No se cambiaron las claves ni los permisos de Supabase. La sesion necesita SELECT e INSERT autorizados en las tablas principales. La carga no solicita DELETE ni abre acceso anonimo adicional. Si faltan columnas o la clave no es valida, la interfaz muestra el problema y conserva los registros anteriores. No se verifico la ejecucion remota contra Supabase.

## Flujo de carga implementado

1. Validacion de extension, archivo no vacio, limite de 10 MB y hasta 10.000 respuestas. Un lote preparado mayor de 8 MB se rechaza antes de enviar, para evitar dividir una carga sin transaccion.
2. Lectura de XLSX/XLS con seleccion de hoja y CSV UTF-8, deteccion de CSV malformado y encabezados repetidos/ambiguos. No se reutiliza una vista previa anterior cuando falla otro archivo.
3. Reconocimiento de las columnas requeridas del instrumento. Los metadatos de puntuacion/comentarios se conservan en raw_data pero no sustituyen respuestas reales.
4. Limpieza de espacios y codificacion Unicode; clasificacion de situacion laboral, sector, Si/No y plazos del primer empleo. Las categorias no reconocidas se conservan como originales y se excluyen de los indicadores correspondientes.
5. Conversion de experiencia a anos y desempleo a meses. Cero es valido; una ausencia o texto invalido no es cero. Los numeros de desempleo sin unidad positiva se excluyen por defecto. La persona que carga puede confirmar anos o meses si lo verifico con el docente; la decision queda registrada en calidad_datos. Una unidad escrita en la respuesta siempre prevalece sobre esa seleccion.
6. Separacion de selecciones multiples; las comas dentro de parentesis no parten una opcion de cargos. No se imponen cinco asignaturas a los datos historicos que tienen dos.
7. Escalas independientes: acuerdo de titulados 1-4, satisfaccion del negocio 1-3, importancia 1-4 y empleadores 1-3 mas No sabe. Los codigos nativos se guardan en codigos_ordinales y las categorias en respuestas_originales. Para conservar los radares, las columnas de puntaje utilizan una transformacion lineal documentada a 1-5: `1 + 4*(codigo-1)/(niveles-1)`. No sabe no tiene puntaje.
8. Registro de calidad por campo: respondida, no_aplica, sin_respuesta, no_sabe, invalida y ruta_desconocida. Los saltos no borran respuestas historicas contradictorias: se conservan y generan observaciones.
9. Vista previa transformada/original, conteos y descarga de observaciones. Las observaciones necesitan revision explicita antes de permitir guardar. Las columnas requeridas ausentes, encabezados ambiguos e identificadores conflictivos bloquean la carga.
10. Omision de filas vacias y duplicados exactos. Se comparan huellas de respuestas existentes y de raw_data historico. Para titulados, un ID de origen ya existente con valores diferentes bloquea la carga: no se trata automaticamente como otra persona ni se sobreescribe. Los instrumentos configurados son los dos cuestionarios UMSS revisados; si se incorpora otro formulario debe identificarse separadamente.
11. Una unica solicitud de insercion con ON CONFLICT DO NOTHING por respuesta_hash: evita la carga parcial por lotes del flujo anterior. Si una restriccion falla, PostgreSQL revierte esa solicitud. No hay borrado previo. La proteccion por ID/instrumento y huella tambien se aplica mediante indices en la base para filas nuevas.
12. La exportacion neutraliza cadenas que Excel/CSV podria interpretar como formulas.

## HU1 implementada

- Experiencia profesional declarada: media, mediana, desviacion estandar muestral, respuestas validas y excluidas. No se etiqueta como antiguedad de titulacion.
- Se admite cero anos de experiencia. Valores no finitos y unidades ambiguas no entran en los calculos.
- Ocupacion actual: trabajan en organizacion o emprendimiento / situaciones laborales reconocidas. No se denomina tasa temporal de insercion ni tasa de desempleo de la poblacion.
- Insercion temprana declarada: trabajaba antes de titularse, menos de un mes o intervalo de uno a cuatro meses / respuestas con plazo reconocido. No se usa es_primer_empleo como sustituto del tiempo.
- Sector de desempeno: solamente quienes trabajan en organizacion y declaran un sector reconocido.
- Distribuciones de experiencia, ocupacion, sector y plazos, con alternancia de tabla/grafico y bases explicitas.
- Umbral exploratorio de experiencia editable (inicial: 3 anos), sin inferir cargo gerencial ni seniority.
- Ano de egreso opcional si viene explicitamente en el archivo. No se deduce de la experiencia; los archivos oficiales revisados no permiten tasas por cohorte de egreso.
- Los registros historicos con raw_data se normalizan en memoria para el panel, sin reescribirlos en la base. Los registros de la version nueva conservan sus valores y la unidad confirmada durante la carga.
- Lectura paginada para superar el limite habitual de 1.000 filas y errores de acceso visibles en vez de aparentar una base vacia.

## Resultados de control con los archivos del docente

Se preservan 148 titulados y 53 empleadores. Las columnas de preguntas de ambos archivos se reconocen. Se corrigieron el rubro que sobrescribia el nombre de empresa, los campos adicionales de titulados y las dos preguntas de empleadores antes omitidas.

Para HU1: 123 de 148 situaciones validas corresponden a ocupacion actual (83,1%). Hay 101 respuestas con plazo de primer empleo utilizable; 77 pertenecen a las categorias tempranas (76,2%). Es una proporcion entre respuestas declaradas, no una estimacion longitudinal de toda una cohorte.

## Limites y siguientes decisiones

- Es necesaria la confirmacion del docente sobre la unidad de los numeros de desempleo sin unidad. Cambiar la opcion en la interfaz es una decision metodologica, no una correccion automatica demostrada.
- No se inventan ano de egreso, fechas con zona horaria desconocida, financiamiento futuro o niveles de posgrado deseados que no figuran en los datos.
- La tabla importaciones_encuestas del script anterior queda disponible para una futura bitacora autorizada. Este flujo conserva procedencia en cada respuesta; no fabrica una importacion completada mediante varias solicitudes independientes. No hay bitacora central automatica de los intentos fallidos.
- La huella evita duplicados exactos; no identifica personas distintas por nombre o email. En empleadores, sin un ID oficial exportado, dos respuestas diferentes no se fusionan automaticamente.
- No se corrigieron en Supabase las filas historicas ni se modificaron sus politicas. El boton administrativo de limpieza sigue siendo una accion separada de la carga; no se ejecuta al importar.
- El modulo sigue siendo analisis descriptivo; no se agrego una simulacion a una historia que no la requiere.

## Verificacion

Los Excel originales contienen datos personales y no se versionan. Para ejecutar las pruebas con los datos del docente, colocar localmente ambos archivos autorizados en `datos/`, conservando sus nombres: uno incluye `TITULADOS` y el otro `EMPLEADORES`. Los archivos permanecen en el equipo y estan excluidos mediante `.gitignore`.

`npm test` ejecuta pruebas con los XLSX del proyecto: limpieza, bifurcaciones, mapeo, escalas, denominadores, duplicados, exportacion y guardado mediante dobles de cliente. `node scripts/probar_migracion_base.cjs` prueba ambos scripts SQL con PostgreSQL en memoria tras instalar temporalmente PGlite como se describe en la guia de base de datos. Tambien se ejecutan TypeScript, ESLint y compilacion de produccion.

La prueba local no sustituye la verificacion final de los permisos y la carga contra el proyecto real de Supabase.

Referencia tecnica de transacciones por solicitud: https://docs.postgrest.org/en/stable/references/transactions.html
