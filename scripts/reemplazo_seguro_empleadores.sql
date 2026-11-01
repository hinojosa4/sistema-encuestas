-- Migración aditiva. Ejecutar tras habilitar_carga_validada.sql y configurar_acceso_administrador.sql.
-- Instalar estas funciones NO reemplaza datos. La operación requiere sesión administradora y confirmación en la UI.
BEGIN;
SET LOCAL lock_timeout = '10s';
ALTER TABLE public.encuesta_empleadores ADD COLUMN IF NOT EXISTS clasificacion_areas JSONB;
CREATE TABLE IF NOT EXISTS public.respaldos_empleadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    version_anterior TEXT NOT NULL,
    filas_anteriores INTEGER NOT NULL,
    filas_nuevas INTEGER NOT NULL,
    archivo_sha256 TEXT NOT NULL,
    datos JSONB NOT NULL CHECK (jsonb_typeof(datos) = 'array')
);
ALTER TABLE public.respaldos_empleadores ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.respaldos_empleadores FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.respaldos_empleadores TO authenticated;
DROP POLICY IF EXISTS respaldo_lectura_admin ON public.respaldos_empleadores;
CREATE POLICY respaldo_lectura_admin ON public.respaldos_empleadores FOR SELECT TO authenticated USING ((SELECT public.es_administrador()));

CREATE OR REPLACE FUNCTION public.previsualizar_reemplazo_empleadores()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE snapshot JSONB; graduates INTEGER;
BEGIN
    IF NOT public.es_administrador() THEN RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501'; END IF;
    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY id), '[]'::jsonb) INTO snapshot FROM public.encuesta_empleadores t;
    SELECT count(*) INTO graduates FROM public.encuesta_titulados;
    RETURN jsonb_build_object('version', md5(snapshot::text), 'empleadores', jsonb_array_length(snapshot), 'titulados', graduates);
END $$;

CREATE OR REPLACE FUNCTION public.reemplazar_encuesta_empleadores(p_filas JSONB, p_version_esperada TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' SET lock_timeout = '10s' AS $$
DECLARE snapshot JSONB; version_actual TEXT; n INTEGER; file_hash TEXT; sheet TEXT; backup_id UUID; columns_list TEXT;
BEGIN
    IF NOT public.es_administrador() THEN RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501'; END IF;
    IF jsonb_typeof(p_filas) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Formato inválido' USING ERRCODE = '22023'; END IF;
    n := jsonb_array_length(p_filas);
    IF n < 1 OR n > 10000 OR octet_length(p_filas::text) > 8388608 THEN RAISE EXCEPTION 'Tamaño inválido' USING ERRCODE = '22023'; END IF;
    file_hash := p_filas->0->>'archivo_sha256'; sheet := p_filas->0->>'hoja_origen';
    IF file_hash IS NULL OR file_hash !~ '^[a-f0-9]{64}$' OR COALESCE(btrim(sheet),'') = '' THEN RAISE EXCEPTION 'Falta procedencia' USING ERRCODE = '22023'; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_filas) r WHERE
        jsonb_typeof(r) IS DISTINCT FROM 'object' OR jsonb_typeof(r->'raw_data') IS DISTINCT FROM 'object'
        OR r->>'archivo_sha256' IS DISTINCT FROM file_hash OR r->>'hoja_origen' IS DISTINCT FROM sheet
        OR COALESCE(r->>'respuesta_hash','') !~ '^[a-f0-9]{64}$'
        OR (r->>'fila_origen') IS NULL OR (r->>'fila_origen') !~ '^[0-9]+$')
        OR (SELECT count(DISTINCT r->>'respuesta_hash') FROM jsonb_array_elements(p_filas) r) <> n
        OR (SELECT count(DISTINCT r->>'fila_origen') FROM jsonb_array_elements(p_filas) r) <> n
    THEN RAISE EXCEPTION 'Filas inválidas o repetidas' USING ERRCODE = '22023'; END IF;
    -- No permitir borrados en cascada, incluso si otro módulo agregó relaciones.
    IF EXISTS (SELECT 1 FROM pg_catalog.pg_constraint WHERE contype = 'f' AND confrelid = 'public.encuesta_empleadores'::regclass)
    THEN RAISE EXCEPTION 'Existen relaciones que requieren revisión' USING ERRCODE = '23503'; END IF;
    LOCK TABLE public.encuesta_empleadores IN SHARE ROW EXCLUSIVE MODE;
    SELECT COALESCE(jsonb_agg(to_jsonb(t) ORDER BY id), '[]'::jsonb) INTO snapshot FROM public.encuesta_empleadores t;
    version_actual := md5(snapshot::text);
    IF p_version_esperada IS DISTINCT FROM version_actual THEN RAISE EXCEPTION 'La base cambió; repita la vista previa' USING ERRCODE = '40001'; END IF;
    -- Repetir el mismo archivo/hoja/mapeo no elimina revisiones manuales ni crea otro respaldo.
    IF (SELECT count(*) FROM public.encuesta_empleadores) = n AND NOT EXISTS (
        SELECT 1 FROM public.encuesta_empleadores WHERE archivo_sha256 IS DISTINCT FROM file_hash OR hoja_origen IS DISTINCT FROM sheet
            OR version_mapeo IS DISTINCT FROM (p_filas->0->>'version_mapeo')::INTEGER
    ) THEN RETURN jsonb_build_object('inserted', n, 'sin_cambios', true, 'respaldo_id', NULL); END IF;
    INSERT INTO public.respaldos_empleadores(usuario_id,version_anterior,filas_anteriores,filas_nuevas,archivo_sha256,datos)
        VALUES (auth.uid(),version_actual,jsonb_array_length(snapshot),n,file_hash,snapshot) RETURNING id INTO backup_id;
    -- Lista real del esquema; jamás copiar ID ni timestamps ni revisiones desde el archivo entrante.
    SELECT string_agg(quote_ident(attname), ', ' ORDER BY attnum) INTO columns_list
        FROM pg_catalog.pg_attribute WHERE attrelid = 'public.encuesta_empleadores'::regclass AND attnum > 0 AND NOT attisdropped
        AND attname NOT IN ('id','created_at','clasificacion_areas');
    DELETE FROM public.encuesta_empleadores WHERE true;
    EXECUTE format('INSERT INTO public.encuesta_empleadores (%s) SELECT %s FROM jsonb_populate_recordset(NULL::public.encuesta_empleadores, $1)', columns_list, columns_list) USING p_filas;
    -- Cualquier fallo de restricciones revierte respaldo y reemplazo juntos. Titulados nunca se modifica.
    RETURN jsonb_build_object('inserted', n, 'sin_cambios', false, 'respaldo_id', backup_id);
END $$;

CREATE TABLE IF NOT EXISTS public.revisiones_areas_empleadores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), empleador_id BIGINT NOT NULL,
    usuario_id UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), anterior JSONB, nueva JSONB NOT NULL
);
ALTER TABLE public.revisiones_areas_empleadores ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.revisiones_areas_empleadores FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.revisiones_areas_empleadores TO authenticated;
DROP POLICY IF EXISTS revisiones_lectura_admin ON public.revisiones_areas_empleadores;
CREATE POLICY revisiones_lectura_admin ON public.revisiones_areas_empleadores FOR SELECT TO authenticated USING ((SELECT public.es_administrador()));
CREATE OR REPLACE FUNCTION public.revisar_areas_empleador(p_id BIGINT,p_original TEXT,p_etiquetas TEXT[],p_nota TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r public.encuesta_empleadores; result JSONB;
BEGIN
    IF NOT public.es_administrador() THEN RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501'; END IF;
    IF COALESCE(length(btrim(p_nota)),0) < 1 OR length(p_nota) > 1000 OR p_etiquetas IS NULL
       OR (COALESCE(length(btrim(p_original)),0) = 0 AND cardinality(p_etiquetas) > 0)
       OR EXISTS (SELECT 1 FROM unnest(p_etiquetas) t WHERE t IS NULL OR t NOT IN ('ia','seguridad','datos','software','automatizacion','nube','gestion','transversales','general','blockchain','interoperabilidad'))
    THEN RAISE EXCEPTION 'Revisión inválida' USING ERRCODE = '22023'; END IF;
    SELECT * INTO r FROM public.encuesta_empleadores WHERE id=p_id FOR UPDATE;
    IF NOT FOUND OR COALESCE(r.respuestas_originales->>'areas_emergentes_importantes',r.areas_emergentes_importantes,'') IS DISTINCT FROM p_original
    THEN RAISE EXCEPTION 'La respuesta cambió; recargue' USING ERRCODE = '40001'; END IF;
    result := jsonb_build_object('etiquetas',to_jsonb(ARRAY(SELECT DISTINCT t FROM unnest(p_etiquetas) t ORDER BY t)), 'nota',btrim(p_nota), 'original',p_original,'revisado_por',auth.uid(),'revisado_utc',now());
    INSERT INTO public.revisiones_areas_empleadores(empleador_id,usuario_id,anterior,nueva) VALUES(p_id,auth.uid(),r.clasificacion_areas,result);
    UPDATE public.encuesta_empleadores SET clasificacion_areas=result WHERE id=p_id;
    RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.previsualizar_reemplazo_empleadores() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reemplazar_encuesta_empleadores(JSONB,TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.revisar_areas_empleador(BIGINT,TEXT,TEXT[],TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.previsualizar_reemplazo_empleadores() TO authenticated;
GRANT EXECUTE ON FUNCTION public.reemplazar_encuesta_empleadores(JSONB,TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revisar_areas_empleador(BIGINT,TEXT,TEXT[],TEXT) TO authenticated;
COMMIT;
NOTIFY pgrst, 'reload schema';
