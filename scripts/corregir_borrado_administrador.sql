-- Actualiza SOLO la funcion de borrado. Ejecutar completo en SQL Editor.
-- No invoca la funcion: ejecutar este archivo NO borra respuestas.
-- Mantiene autenticacion, control administrador, transaccion y auditoria.
BEGIN;
SET LOCAL lock_timeout = '10s';

CREATE OR REPLACE FUNCTION public.vaciar_encuestas_administrador()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
SET lock_timeout = '10s'
AS $$
DECLARE
    cantidad_titulados BIGINT;
    cantidad_empleadores BIGINT;
BEGIN
    IF NOT public.es_administrador() THEN
        RAISE EXCEPTION 'Se requiere permiso de administrador.' USING ERRCODE = '42501';
    END IF;
    LOCK TABLE public.encuesta_titulados, public.encuesta_empleadores IN EXCLUSIVE MODE;
    -- Los ID son claves primarias no nulas. La condicion declara el alcance
    -- previsto y es compatible con safeupdate, sin desactivar esa proteccion.
    DELETE FROM public.encuesta_titulados WHERE id IS NOT NULL;
    GET DIAGNOSTICS cantidad_titulados = ROW_COUNT;
    DELETE FROM public.encuesta_empleadores WHERE id IS NOT NULL;
    GET DIAGNOSTICS cantidad_empleadores = ROW_COUNT;
    INSERT INTO public.administracion_eventos (usuario_id, accion, detalle)
    VALUES (auth.uid(), 'borrado_encuestas', pg_catalog.jsonb_build_object(
        'titulados', cantidad_titulados, 'empleadores', cantidad_empleadores));
    RETURN pg_catalog.jsonb_build_object('titulados', cantidad_titulados, 'empleadores', cantidad_empleadores);
END $$;
REVOKE ALL ON FUNCTION public.vaciar_encuestas_administrador() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vaciar_encuestas_administrador() TO authenticated;
COMMIT;
NOTIFY pgrst, 'reload schema';

SELECT p.proname AS funcion, p.prosecdef AS ejecuta_con_permisos_del_propietario,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS ejecucion_authenticated,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS ejecucion_anon
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'vaciar_encuestas_administrador';
