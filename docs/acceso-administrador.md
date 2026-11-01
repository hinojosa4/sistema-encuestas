# Activación del acceso administrador

El sistema utiliza un único rol funcional: administrador. No hacen falta cuentas de titulados, empleadores ni otro rol para analizar las encuestas entregadas por el docente. Puede haber varias cuentas autorizadas con ese mismo rol, pero esta instalación prepara `admin_umss2026@gmail.com`.

## Lo implementado

- Inicio de sesión por correo y contraseña con Supabase Auth, cookies SSR y cierre de sesión local.
- Verificación de identidad en Supabase y de la pertenencia a `administradores_sistema`. Los metadatos editables del usuario no conceden acceso.
- Dashboard, importación y administración requieren permiso en el servidor. El endpoint de reportes usa la misma sesión por cookies y rechaza anónimos con 401 y cuentas no autorizadas con 403. Si la verificación falla, no entrega datos.
- El proxy de Next.js renueva cookies; no sustituye la comprobación de permisos en páginas, acciones y API.
- La sección Administración contiene el borrado. Ya no está en el dashboard. Requiere escribir `BORRAR ENCUESTAS` y llamar a una función autorizada que elimina ambas encuestas y registra conteos y actor en una transacción. No se realiza ningún borrado durante la instalación.
- Las políticas de Supabase bloquean lectura e inserción de respuestas para quienes no sean administradores. No se conceden UPDATE/DELETE directos a los clientes: el borrado se canaliza por la función validada. La lista de administradores se modifica exclusivamente desde SQL Editor por el propietario.
- Las respuestas personales y sus exportaciones también quedan dentro del acceso administrador. La portada pública solo describe el proyecto.
- La navegación y los botones de importación de la portada aparecen únicamente después de verificar el permiso de administrador. Mientras se verifica o no hay permiso, no se muestran los módulos privados; la pantalla de ingreso conserva solo el acceso al inicio. La visibilidad se actualiza al entrar, salir o cambiar de sección, sin conceder permisos por la mera presencia de una sesión.
- La portada es pública. Si un administrador entra en `/`, se redirige a `/upload`. El inicio de sesión normal también abre Cargar datos; si se solicitó antes una página protegida concreta, conserva ese destino autorizado. Dentro del sistema el navbar contiene Cargar datos, Dashboard y Administración, sin Inicio. La marca UMSS vuelve a Cargar datos y el menú móvil conserva las mismas opciones.

## Pasos que requiere el propietario en Supabase

Estos pasos no se ejecutaron en el proyecto remoto: el entorno de desarrollo solo dispone de la clave pública, que no permite crear cuentas ni modificar políticas. No colocar una clave `service_role` en el navegador ni compartir contraseñas.

1. Si la base ya funciona con los esquemas actuales, no es necesario volver a cargar los datos. Los archivos de base son `scripts/mejorar_base_datos.sql` y `scripts/habilitar_carga_validada.sql`.
2. En **Authentication > Users > Add user > Create new user**, crear `admin_umss2026@gmail.com`. Definir una contraseña propia, guardarla de forma privada y confirmar el correo mediante la opción de confirmación de Supabase. Si la cuenta ya existe, conservarla y confirmar su correo; no crear una duplicada.
3. En **SQL Editor**, ejecutar completo `scripts/configurar_acceso_administrador.sql`. Conserva respuestas y reemplaza las políticas anteriores de las tablas de encuestas por acceso exclusivo de administradores. El script es transaccional e idempotente. Antes de activarlo, tener abierta la cuenta de propietario del proyecto para completar el paso siguiente.
4. Ejecutar completo `scripts/activar_administrador.sql`. Verifica que la cuenta exista y esté confirmada antes de habilitarla. El resultado esperado es el correo elegido con `habilitado = true`.
5. En la configuración de **Authentication**, mantener habilitado Email/Password y desactivar el registro público de usuarios nuevos para esta instalación. Aunque quedara habilitado, crear una cuenta no permite autoasignarse administración.
6. Abrir `/login` e ingresar con el correo y la contraseña definidos. Las variables existentes `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` siguen siendo las únicas requeridas por la aplicación; no se añade una contraseña de administrador al archivo `.env.local`.

Aplicar solo el código de login **no cierra los permisos antiguos de la API de Supabase**: el paso 3 es obligatorio para completar la protección real de los datos. No volver a ejecutar después scripts antiguos que creen políticas de acceso anónimo.

## Comprobación funcional

Sin sesión, abrir directamente `/dashboard`, `/upload` o `/administracion` debe redirigir a `/login`. `/api/reports` debe responder 401 sin tablas. Con la cuenta activada deben funcionar lectura, importación y reportes. Una cuenta creada sin entrada habilitada en `administradores_sistema` debe ser rechazada.

No probar el botón de borrado con las encuestas reales para validar el login. La transacción de borrado, su auditoría y su reversión ante una falla se prueban en PostgreSQL temporal con datos sintéticos.

La recuperación de contraseña se realiza por el responsable en Supabase Auth; esta versión no incorpora un flujo público de recuperación ni administración de cuentas desde la interfaz. Para revocar una cuenta, el propietario cambia `habilitado = false` en la lista de administradores. Las políticas lo comprueban en cada operación sin depender de que expire el token.

## Verificación técnica

`npm test` incluye pruebas de rechazo por ausencia de sesión, metadatos manipulados, permiso ausente o revocado y fallos de verificación. También ejecuta los esquemas SQL reales en PostgreSQL temporal (PGlite), con un esquema `auth` de prueba: comprueba permisos anon/authenticated, activación idempotente, deduplicación sin UPDATE, bloqueo de autoasignación del permiso por el cliente y reversión completa del borrado si falla la segunda tabla. Este entorno valida la lógica SQL, no sustituye probar Supabase Auth y sus cookies con la cuenta real después de la activación.

Referencias: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Si aparece un error al borrar

La versión inicial de la función incluía DELETE sin WHERE. Un proyecto con `safeupdate` habilitado puede rechazar esa forma con código 21000 y mensaje «DELETE requires a WHERE clause». La captura de un mensaje genérico no basta para confirmar esa causa. PostgreSQL temporal no incluye esa extensión, por lo que pasar las pruebas locales no garantizaba esa compatibilidad con la configuración remota.

`scripts/corregir_borrado_administrador.sql` actualiza únicamente la definición de la función con un filtro explícito sobre los ID no nulos. Conserva la comprobación del administrador, el bloqueo, la transacción y la auditoría; no desactiva `safeupdate` ni invoca el borrado. Ejecutar el archivo no elimina respuestas. El esquema inicial también incorpora la corrección para instalaciones nuevas.

`scripts/diagnosticar_borrado_administrador.sql` es de solo lectura: informa configuración aplicable, metadatos de la función, filtros, dependencias, triggers y conteos. No consulta respuestas personales ni ejecuta la función de borrado. Los ajustes de la conexión SQL Editor pueden diferir de los de la API.

La aplicación ahora muestra referencias controladas para problemas de configuración, autorización, relaciones o espera, sin publicar mensajes SQL crudos. Un fallo de red o una respuesta inesperada no se anuncian como éxito ni garantizan que nada haya cambiado: revisar los datos y el historial antes de intentar nuevamente. No repetir un borrado sobre datos reales para validar una instalación.

Referencia de la restricción: [configuración safeupdate de Supabase](https://supabase.com/docs/guides/database/custom-postgres-config).
