-- Ejecutar en Supabase > SQL Editor despues de configurar el acceso administrador.
-- Elimina unicamente el historial de borrados; no elimina respuestas.
BEGIN;
SET LOCAL lock_timeout = '10s';

CREATE OR REPLACE FUNCTION public.limpiar_historial_borrados_administrador()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = ''
SET lock_timeout = '10s'
AS $$
DECLARE
    cantidad_eliminada BIGINT;
BEGIN
    IF NOT public.es_administrador() THEN
        RAISE EXCEPTION 'Se requiere permiso de administrador.' USING ERRCODE = '42501';
    END IF;

    DELETE FROM public.administracion_eventos
    WHERE accion = 'borrado_encuestas' AND id IS NOT NULL;
    GET DIAGNOSTICS cantidad_eliminada = ROW_COUNT;

    RETURN pg_catalog.jsonb_build_object('eliminados', cantidad_eliminada);
END $$;

REVOKE ALL ON FUNCTION public.limpiar_historial_borrados_administrador() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.limpiar_historial_borrados_administrador() TO authenticated;
COMMIT;
NOTIFY pgrst, 'reload schema';
