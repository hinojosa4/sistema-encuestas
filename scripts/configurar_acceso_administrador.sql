-- Ejecutar en Supabase > SQL Editor, despues de los esquemas de encuestas.
-- No borra respuestas. REEMPLAZA las politicas de las tres tablas de encuestas
-- por acceso exclusivo para administradores. Retira acceso anonimo existente.
-- El borrado solo queda disponible mediante una funcion que comprueba el permiso.
BEGIN;
SET LOCAL lock_timeout = '10s';

DO $$
BEGIN
    IF to_regclass('public.encuesta_titulados') IS NULL
       OR to_regclass('public.encuesta_empleadores') IS NULL
       OR to_regclass('public.importaciones_encuestas') IS NULL THEN
        RAISE EXCEPTION 'Primero ejecutar mejorar_base_datos.sql y habilitar_carga_validada.sql.';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.administradores_sistema (
    usuario_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    habilitado BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.administradores_sistema ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.administradores_sistema FROM PUBLIC, anon, authenticated;
-- Solo el propietario del proyecto administra esta lista desde SQL Editor.

CREATE OR REPLACE FUNCTION public.es_administrador()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.administradores_sistema
        WHERE usuario_id = (SELECT auth.uid()) AND habilitado = true
    );
$$;
REVOKE ALL ON FUNCTION public.es_administrador() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.es_administrador() TO authenticated;

CREATE TABLE IF NOT EXISTS public.administracion_eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    accion TEXT NOT NULL CHECK (accion IN ('borrado_encuestas')),
    detalle JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.administracion_eventos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.administracion_eventos FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.administracion_eventos TO authenticated;
DROP POLICY IF EXISTS administracion_eventos_lectura ON public.administracion_eventos;
CREATE POLICY administracion_eventos_lectura ON public.administracion_eventos
    FOR SELECT TO authenticated USING ((SELECT public.es_administrador()));

DO $$
DECLARE
    tabla TEXT;
    politica RECORD;
    secuencia TEXT;
BEGIN
    FOREACH tabla IN ARRAY ARRAY['encuesta_titulados', 'encuesta_empleadores', 'importaciones_encuestas'] LOOP
        FOR politica IN SELECT policyname FROM pg_catalog.pg_policies
                        WHERE schemaname = 'public' AND tablename = tabla LOOP
            EXECUTE format('DROP POLICY %I ON public.%I', politica.policyname, tabla);
        END LOOP;
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tabla);
        EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', tabla);
        EXECUTE format('GRANT SELECT, INSERT ON public.%I TO authenticated', tabla);
        EXECUTE format('CREATE POLICY administrador_lectura ON public.%I
            FOR SELECT TO authenticated USING ((SELECT public.es_administrador()))', tabla);
        EXECUTE format('CREATE POLICY administrador_insercion ON public.%I
            FOR INSERT TO authenticated WITH CHECK ((SELECT public.es_administrador()))', tabla);
        IF tabla <> 'importaciones_encuestas' THEN
            secuencia := pg_get_serial_sequence(format('public.%I', tabla), 'id');
            IF secuencia IS NOT NULL THEN
                EXECUTE format('REVOKE ALL ON SEQUENCE %s FROM PUBLIC, anon, authenticated', secuencia);
                EXECUTE format('GRANT USAGE ON SEQUENCE %s TO authenticated', secuencia);
            END IF;
        END IF;
    END LOOP;
END $$;

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
    -- Impide intercalar una importacion con el borrado de las dos tablas.
    LOCK TABLE public.encuesta_titulados, public.encuesta_empleadores IN EXCLUSIVE MODE;
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

-- Solo metadatos de permisos. Ejecutar este archivo no invoca el borrado.
SELECT tablename, policyname, roles, cmd
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('encuesta_titulados', 'encuesta_empleadores', 'importaciones_encuestas', 'administracion_eventos')
ORDER BY tablename, policyname;
