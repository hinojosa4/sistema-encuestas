-- SOLO LECTURA. No invoca funciones de borrado ni muestra respuestas personales.
-- Ejecutar completo en SQL Editor. La conexion del editor puede tener ajustes
-- distintos a los de la API, por eso se muestran ambos contextos por separado.
SELECT current_setting('safeupdate.enabled', true) AS safeupdate_conexion_editor;

SELECT r.rolname AS rol, ajuste
FROM pg_roles r CROSS JOIN LATERAL unnest(r.rolconfig) AS ajuste
WHERE r.rolname IN ('authenticator', 'authenticated', 'postgres')
  AND (ajuste LIKE 'safeupdate.enabled=%' OR ajuste LIKE 'session_preload_libraries=%');

SELECT p.proname AS funcion, pg_get_userbyid(p.proowner) AS propietario,
       p.prosecdef AS security_definer,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS ejecucion_authenticated,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS ejecucion_anon,
       pg_get_functiondef(p.oid) ~* 'DELETE[[:space:]]+FROM[[:space:]]+public[.]encuesta_titulados[[:space:]]+WHERE' AS filtro_titulados,
       pg_get_functiondef(p.oid) ~* 'DELETE[[:space:]]+FROM[[:space:]]+public[.]encuesta_empleadores[[:space:]]+WHERE' AS filtro_empleadores
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'vaciar_encuestas_administrador';

SELECT c.conname AS restriccion, c.conrelid::regclass AS tabla_dependiente,
       c.confrelid::regclass AS encuesta_referenciada
FROM pg_constraint c
WHERE c.contype = 'f' AND c.confrelid IN ('public.encuesta_titulados'::regclass, 'public.encuesta_empleadores'::regclass);

SELECT t.tgname AS trigger, t.tgrelid::regclass AS tabla, t.tgenabled AS habilitado
FROM pg_trigger t
WHERE NOT t.tgisinternal AND t.tgrelid IN ('public.encuesta_titulados'::regclass, 'public.encuesta_empleadores'::regclass);

SELECT 'titulados' AS tabla, count(*) AS respuestas FROM public.encuesta_titulados
UNION ALL SELECT 'empleadores', count(*) FROM public.encuesta_empleadores
UNION ALL SELECT 'operaciones_borrado_registradas', count(*) FROM public.administracion_eventos;
