-- 1. Crear primero el usuario en Supabase > Authentication > Users > Add user.
--    Correo: admin_umss2026@gmail.com. Definir la contrasena SOLO en Supabase.
-- 2. Ejecutar configurar_acceso_administrador.sql antes de este archivo.
-- 3. Ejecutar TODO este archivo en el SQL Editor del propietario.
-- No crea usuarios, no contiene contrasenas ni modifica respuestas.
BEGIN;
DO $$
DECLARE
    correo TEXT := 'admin_umss2026@gmail.com';
    cuenta UUID;
BEGIN
    SELECT id INTO cuenta FROM auth.users WHERE lower(email) = lower(correo);
    IF cuenta IS NULL THEN
        RAISE EXCEPTION 'Primero crear la cuenta % en Authentication > Users.', correo;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = cuenta AND email_confirmed_at IS NOT NULL) THEN
        RAISE EXCEPTION 'La cuenta % necesita correo confirmado antes de activarla.', correo;
    END IF;
    INSERT INTO public.administradores_sistema (usuario_id, habilitado)
    VALUES (cuenta, true)
    ON CONFLICT (usuario_id) DO UPDATE SET habilitado = true;
END $$;
COMMIT;

SELECT u.email, a.habilitado
FROM public.administradores_sistema a
JOIN auth.users u ON u.id = a.usuario_id
WHERE lower(u.email) = 'admin_umss2026@gmail.com';
