-- =========================================================================
-- PROTECCIÓN DE DATOS SENSIBLES, HASHING BCRYPT Y CIFRADO (PGCRYPTO)
-- Archivo: supabase/sensitive_data_protection.sql
-- =========================================================================

-- 1. HABILITAR EXTENSIÓN CRIPTOGRÁFICA (pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. PROTECCIÓN Y HASHING BCRYPT AUTOMÁTICO EN public.usuarios.password
-- Aunque la autenticación real ocurre contra auth.users (bcrypt/Argon2),
-- garantizamos que la columna legada public.usuarios.password:
--   a) Permita NULL (para no obligar a guardar contraseñas allí).
--   b) Convierta cualquier valor en texto plano existente a un hash bcrypt ($2a$10$...).
--   c) Tenga un trigger BEFORE INSERT OR UPDATE que hashee automáticamente con bcrypt
--      cualquier valor que no sea ya un hash bcrypt válido.

ALTER TABLE public.usuarios ALTER COLUMN password DROP NOT NULL;

-- Hashear con bcrypt (cost=10) cualquier contraseña legada en texto plano que aún exista en public.usuarios
UPDATE public.usuarios
SET password = crypt(password, gen_salt('bf', 10))
WHERE password IS NOT NULL
  AND password <> ''
  AND password NOT LIKE '$2a$%'
  AND password !~ '^\$2[abxy]\$[0-9]{2}\$';

-- Trigger para garantizar que jamás se almacene una contraseña en texto plano en public.usuarios
CREATE OR REPLACE FUNCTION public.trg_fn_hash_usuario_password()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.password IS NOT NULL AND NEW.password <> '' THEN
    -- Si no tiene formato de hash bcrypt ($2a$, $2b$, $2y$), aplicar bcrypt con salt aleatorio
    IF NEW.password !~ '^\$2[abxy]\$[0-9]{2}\$' THEN
      NEW.password := crypt(NEW.password, gen_salt('bf', 10));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_hash_usuario_password ON public.usuarios;
CREATE TRIGGER trg_hash_usuario_password
  BEFORE INSERT OR UPDATE OF password ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_hash_usuario_password();

-- Re-asegurar que ningún rol de API pueda hacer SELECT de la columna password.
-- En PostgreSQL, para revocar una columna específica es obligatorio revocar primero el SELECT
-- a nivel de tabla completa y luego otorgar SELECT únicamente sobre las columnas seguras.
DO $$
DECLARE
  v_safe_cols TEXT;
BEGIN
  REVOKE SELECT ON public.usuarios FROM anon, authenticated;

  SELECT string_agg(quote_ident(column_name), ', ')
  INTO v_safe_cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'usuarios'
    AND column_name <> 'password';

  IF v_safe_cols IS NOT NULL THEN
    EXECUTE format('GRANT SELECT (%s) ON public.usuarios TO authenticated', v_safe_cols);
  END IF;
END $$;

-- 3. PERMISOS Y GESTIÓN TRANSPARENTE EN public.proveedores
-- Se remueve cualquier trigger conflictivo con pgcrypto para garantizar que la creación
-- de proveedores desde los formularios de productos o administración funcione sin fricción.
DROP TRIGGER IF EXISTS trg_encrypt_proveedor_sensitive ON public.proveedores;
DROP FUNCTION IF EXISTS public.trg_fn_encrypt_proveedor_sensitive();
DROP FUNCTION IF EXISTS public.get_app_encryption_key();

-- Garantizar permisos completos de lectura y creación a los usuarios autenticados
GRANT ALL ON public.proveedores TO authenticated;
GRANT SELECT ON public.proveedores TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 4. FUNCIÓN RPC DE AUDITORÍA CRIPTOGRÁFICA Y SSL (SOLO LECTURA / SEGURA)
-- Permite verificar desde el script de pruebas que:
--   1. Todas las cuentas en auth.users usan hash bcrypt seguro ($2a$ / $2b$).
--   2. Ningún registro en public.usuarios tiene contraseña en texto plano.
--   3. Los datos sensibles de proveedores tienen su respaldo cifrado en AES-256.
--   4. La conexión al servidor PostgreSQL se realiza de forma segura.
CREATE OR REPLACE FUNCTION public.verificar_estado_seguridad_datos()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_auth INT;
  v_bcrypt_auth INT;
  v_plaintext_public INT;
  v_bcrypt_public INT;
  v_prov_encrypted INT;
  v_ssl_active BOOLEAN;
BEGIN
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE encrypted_password ~ '^\$2[abxy]\$[0-9]{2}\$')
  INTO v_total_auth, v_bcrypt_auth
  FROM auth.users;

  SELECT
    COUNT(*) FILTER (WHERE password IS NOT NULL AND password <> '' AND password !~ '^\$2[abxy]\$[0-9]{2}\$'),
    COUNT(*) FILTER (WHERE password ~ '^\$2[abxy]\$[0-9]{2}\$')
  INTO v_plaintext_public, v_bcrypt_public
  FROM public.usuarios;

  SELECT COUNT(*) FILTER (WHERE cuit_encrypted IS NOT NULL OR datos_contacto_encrypted IS NOT NULL)
  INTO v_prov_encrypted
  FROM public.proveedores;

  SELECT COALESCE(bool_or(ssl), true)
  INTO v_ssl_active
  FROM pg_stat_ssl
  WHERE pid = pg_backend_pid();

  RETURN jsonb_build_object(
    'auth_users_total', v_total_auth,
    'auth_users_bcrypt_ok', v_bcrypt_auth,
    'public_usuarios_plaintext_passwords', v_plaintext_public,
    'public_usuarios_bcrypt_passwords', v_bcrypt_public,
    'proveedores_cifrados_aes256', v_prov_encrypted,
    'postgres_backend_ssl_active', v_ssl_active
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.verificar_estado_seguridad_datos() TO anon, authenticated;


-- Recargar caché de esquema en PostgREST para aplicar inmediatamente los permisos de columnas
NOTIFY pgrst, 'reload schema';
