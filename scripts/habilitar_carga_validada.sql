-- Ejecutar DESPUES de mejorar_base_datos.sql en el SQL Editor de Supabase.
-- Cambios aditivos para HU1 y carga validada. No borra ni reinterpreta respuestas.
BEGIN;
SET LOCAL lock_timeout = '10s';
ALTER TABLE public.encuesta_titulados
    ADD COLUMN IF NOT EXISTS anio_egreso INTEGER,
    ADD COLUMN IF NOT EXISTS respuesta_hash TEXT,
    ADD COLUMN IF NOT EXISTS archivo_sha256 TEXT,
    ADD COLUMN IF NOT EXISTS archivo_nombre TEXT,
    ADD COLUMN IF NOT EXISTS hoja_origen TEXT,
    ADD COLUMN IF NOT EXISTS instrumento_origen TEXT,
    ADD COLUMN IF NOT EXISTS version_mapeo INTEGER;
ALTER TABLE public.encuesta_empleadores
    ADD COLUMN IF NOT EXISTS respuesta_hash TEXT,
    ADD COLUMN IF NOT EXISTS archivo_sha256 TEXT,
    ADD COLUMN IF NOT EXISTS archivo_nombre TEXT,
    ADD COLUMN IF NOT EXISTS hoja_origen TEXT,
    ADD COLUMN IF NOT EXISTS respuesta_origen_id TEXT,
    ADD COLUMN IF NOT EXISTS instrumento_origen TEXT,
    ADD COLUMN IF NOT EXISTS version_mapeo INTEGER;
-- Indices completos (no parciales): compatibles con ON CONFLICT desde PostgREST.
-- PostgreSQL permite varias filas con NULL, conservando todos los historicos.
CREATE UNIQUE INDEX IF NOT EXISTS titulados_respuesta_hash_uidx
    ON public.encuesta_titulados(respuesta_hash);
CREATE UNIQUE INDEX IF NOT EXISTS empleadores_respuesta_hash_uidx
    ON public.encuesta_empleadores(respuesta_hash);
CREATE UNIQUE INDEX IF NOT EXISTS titulados_identificador_origen_uidx
    ON public.encuesta_titulados(instrumento_origen, respuesta_origen_id)
    WHERE instrumento_origen IS NOT NULL AND respuesta_origen_id IS NOT NULL;
DO $$
DECLARE tabla TEXT; campo TEXT; nombre TEXT;
BEGIN
    FOREACH tabla IN ARRAY ARRAY['encuesta_titulados', 'encuesta_empleadores'] LOOP
        FOREACH campo IN ARRAY ARRAY['respuesta_hash', 'archivo_sha256'] LOOP
            nombre := tabla || '_' || campo || '_sha256';
            IF NOT EXISTS (SELECT 1 FROM pg_constraint
                WHERE conrelid = format('public.%I', tabla)::regclass AND conname = nombre) THEN
                EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I
                    CHECK (%I IS NULL OR %I ~ ''^[a-f0-9]{64}$'') NOT VALID', tabla, nombre, campo, campo);
            END IF;
        END LOOP;
    END LOOP;
END $$;
COMMENT ON COLUMN public.encuesta_titulados.anio_egreso IS
    'Solo ano explicitamente declarado. Nunca se deduce de anos de vida profesional.';
COMMENT ON COLUMN public.encuesta_titulados.respuesta_hash IS
    'SHA256 de la respuesta original canonica, sin puntuaciones ni comentarios auxiliares. Evita duplicados exactos, no identifica personas.';
COMMENT ON COLUMN public.encuesta_empleadores.respuesta_hash IS
    'SHA256 de la respuesta original canonica; no usar empresa ni correo como identificador unico.';
-- No se agregan permisos nuevos. La carga necesita SELECT e INSERT autorizados.
COMMIT;
NOTIFY pgrst, 'reload schema';
