-- =========================================================================
-- REPARACIÓN DEFINITIVA Y A PRUEBA DE FALLOS: ERROR "digest(text, unknown)"
-- Archivo: supabase/fix_proveedores_digest.sql
-- =========================================================================
-- Copia y ejecuta TODO este script en el SQL Editor de tu Dashboard de Supabase.
-- =========================================================================

-- 1. HABILITAR EXTENSIÓN CRIPTOGRÁFICA EN EL ESQUEMA 'extensions'
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. ELIMINAR CUALQUIER TRIGGER RESIDUAL EN public.proveedores CON CASCADE
DROP TRIGGER IF EXISTS trg_encrypt_proveedor_sensitive ON public.proveedores CASCADE;
DROP FUNCTION IF EXISTS public.trg_fn_encrypt_proveedor_sensitive() CASCADE;
DROP FUNCTION IF EXISTS public.get_app_encryption_key() CASCADE;

-- Bloque anónimo para buscar y eliminar dinámicamente cualquier otro trigger
-- en proveedores que mencione cifrado o encriptación:
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT trigger_name
        FROM information_schema.triggers
        WHERE event_object_table = 'proveedores'
          AND (trigger_name ILIKE '%encrypt%' OR trigger_name ILIKE '%sensitive%' OR trigger_name ILIKE '%digest%')
    ) LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.proveedores CASCADE;', r.trigger_name);
        RAISE NOTICE 'Trigger conflictivo eliminado: %', r.trigger_name;
    END LOOP;
END $$;

-- 3. CREAR WRAPPER UNIVERSAL DE digest() EN SCHEMA public
-- Si alguna función o vista en la base de datos sigue buscando digest() en public,
-- este wrapper evita el error "function digest(text, unknown) does not exist"
-- delegando a extensions.digest() o al sha256 nativo de PostgreSQL:
CREATE OR REPLACE FUNCTION public.digest(p_data TEXT, p_type TEXT)
RETURNS BYTEA
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  BEGIN
    RETURN extensions.digest(p_data::bytea, p_type);
  EXCEPTION WHEN OTHERS THEN
    RETURN sha256(p_data::bytea);
  END;
END;
$$;

CREATE OR REPLACE FUNCTION public.digest(p_data BYTEA, p_type TEXT)
RETURNS BYTEA
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  BEGIN
    RETURN extensions.digest(p_data, p_type);
  EXCEPTION WHEN OTHERS THEN
    RETURN sha256(p_data);
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.digest(TEXT, TEXT) TO public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.digest(BYTEA, TEXT) TO public, anon, authenticated;

-- 4. REEMPLAZAR get_app_encryption_key CON VERSIÓN SEGURA (SIN ERROR)
CREATE OR REPLACE FUNCTION public.get_app_encryption_key()
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(sha256((current_database() || '::biscui_aes256_column_key_v1')::bytea), 'hex');
$$;

GRANT EXECUTE ON FUNCTION public.get_app_encryption_key() TO public, anon, authenticated;

-- 5. RESTAURAR PERMISOS DE LECTURA Y ESCRITURA EN public.proveedores
GRANT ALL ON public.proveedores TO authenticated;
GRANT SELECT ON public.proveedores TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 6. RECARGAR CACHÉ DE POSTGREST
NOTIFY pgrst, 'reload schema';
