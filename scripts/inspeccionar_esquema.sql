-- Auditoría de solo lectura. No consulta registros de los encuestados.
-- Ejecutar en el SQL Editor de Supabase y revisar cada resultado.

SELECT table_schema, table_name, ordinal_position, column_name,
       data_type, udt_name, is_nullable, column_default,
       character_maximum_length, numeric_precision, numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('encuesta_titulados', 'encuesta_empleadores')
ORDER BY table_name, ordinal_position;

SELECT n.nspname AS table_schema, c.relname AS table_name,
       con.conname AS constraint_name, con.contype AS constraint_type,
       pg_get_constraintdef(con.oid, true) AS definition
FROM pg_catalog.pg_constraint con
JOIN pg_catalog.pg_class c ON c.oid = con.conrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('encuesta_titulados', 'encuesta_empleadores')
ORDER BY c.relname, con.conname;

SELECT schemaname, tablename, indexname, indexdef
FROM pg_catalog.pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('encuesta_titulados', 'encuesta_empleadores')
ORDER BY tablename, indexname;

SELECT n.nspname AS table_schema, c.relname AS table_name,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('encuesta_titulados', 'encuesta_empleadores');

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_catalog.pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('encuesta_titulados', 'encuesta_empleadores')
ORDER BY tablename, policyname;
