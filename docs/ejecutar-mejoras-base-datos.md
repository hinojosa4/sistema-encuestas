# Aplicar las mejoras de la base de datos

Script: `scripts/mejorar_base_datos.sql`. Version: 19 de octubre de 2026.

Actualizacion posterior de la aplicacion: la carga validada y la HU1 ya estan implementadas. Ejecutar tambien `scripts/habilitar_carga_validada.sql` y consultar `docs/hu1-y-carga-validada.md`. La seccion de adaptaciones pendientes de esta guia describe el estado anterior; el documento nuevo especifica que partes ya funcionan y que limites permanecen.

## Ejecucion

1. Abrir el proyecto correcto en Supabase y entrar a SQL Editor.
2. Crear una consulta, copiar todo el archivo SQL y ejecutarlo completo.
3. Al finalizar, revisar el resumen de columnas y politicas. El script no consulta datos personales.
4. Para revisar en detalle el resultado, ejecutar `scripts/inspeccionar_esquema.sql`.

El script puede ejecutarse de nuevo. Usa una transaccion para que un fallo revierta todos los cambios de esa ejecucion. Conserva los registros, los nombres singulares de las tablas, sus columnas existentes y sus identificadores. No convierte automaticamente los datos anteriores ni agrega los datos del Excel. Se aplica al esquema singular compartido por el usuario; si solamente encuentra el esquema alternativo plural, se detiene para evitar crear tablas desconectadas.

## Cambios incluidos

- Campo `ha_trabajado_antes` y campos complementarios presentes en el Excel, aunque no existan aun en una instalacion anterior.
- Respaldo `raw_data`, originales de tiempos, identificadores y fechas de origen.
- Columnas numericas nuevas para anos profesionales normalizados y meses de desempleo. Las columnas numericas antiguas se conservan para compatibilidad, pero no se consideran depuradas.
- Objetos JSON para categorias originales, codigos ordinales, selecciones multiples y calidad por campo.
- Tabla de importaciones con archivo, huella SHA-256, hoja, version y conteos.
- Restricciones de tipos JSON, numeros normalizados no negativos y finitos, filas de origen y referencias a importaciones.
- Prevencion de una segunda carga completada del mismo tipo/archivo/hoja, y de una misma fila repetida dentro del mismo lote, cuando el importador suministre esos metadatos.
- Activacion de RLS sin agregar acceso anonimo ni eliminar las politicas existentes.

Los campos de preguntas condicionales siguen permitiendo NULL. No se fuerza que todos respondan preguntas de ramas que no recorrieron ni que las respuestas historicas tengan exactamente cinco asignaturas seleccionadas.

## Lo que necesita adaptacion en la aplicacion

Este script modifica el esquema, no el codigo del importador. La aplicacion debe completar los metadatos y los valores normalizados para que estas mejoras se utilicen. No se deben interpretar objetos vacios de calidad como prueba de que una fila ya fue validada.

Siguen pendientes los errores identificados en la auditoria: rubro que sobrescribe nombre de empresa, encabezados no reconocidos, escalas y lectura de tiempos ambiguos. Hasta corregirlos, conservar los XLSX y no recargar los datos desde el flujo de reemplazo actual.

El dashboard actual sigue leyendo las columnas antiguas. Los nuevos campos normalizados requieren adaptar sus calculos antes de declarar que los resultados historicos estan corregidos.

El script tampoco cambia el guardado actual a una transaccion de importacion ni elimina su borrado previo: ese cambio pertenece a la aplicacion o a un procedimiento de carga autorizado. La transaccion del script protege la migracion del esquema, no futuras cargas del frontend.

Las politicas previas se conservan. En tablas nuevas, RLS deja la API sin acceso hasta configurar permisos apropiados. La tabla nueva de importaciones no tiene politicas para clientes; debe administrarse desde el SQL Editor o integrarse despues con un flujo autorizado. No abrir permisos anonimos de lectura o borrado para resolver errores del frontend.

## Pruebas

La prueba `scripts/probar_migracion_base.cjs` usa PostgreSQL en memoria mediante PGlite y no lee `.env` ni se conecta a Supabase. Instalacion temporal y ejecucion desde la raiz del proyecto:

```powershell
npm.cmd install --prefix tmp/sql-validation --no-save --package-lock=false --ignore-scripts @electric-sql/pglite
node scripts/probar_migracion_base.cjs
```

Se verifican creacion desde cero, ejecucion repetida, actualizacion de tablas anteriores, preservacion de ID y respuestas, NULL/cero, entradas invalidas, referencias, duplicados de importacion y activacion de RLS sin politicas permisivas nuevas. No sustituye la comprobacion de permisos y del esquema desplegado en Supabase.
