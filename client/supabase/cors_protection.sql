-- =========================================================================
-- CONTROL ESTRICTO DE ORÍGENES (CORS) EN SERVIDOR POSTGRESQL / SUPABASE
-- Archivo: supabase/cors_protection.sql
--
-- El API Gateway de Supabase devuelve "Access-Control-Allow-Origin: *" por defecto.
-- Para impedir que un sitio web no autorizado consuma la API REST o las funciones RPC
-- usando la clave pública (anon key), registramos un hook "db_pre_request" en PostgREST
-- que inspecciona el encabezado HTTP "Origin" en cada solicitud y rechaza cualquier
-- origen que no esté en la lista blanca (producción y desarrollo local).
-- =========================================================================

-- 0. ASEGURAR FUNCIÓN HELPER DE ROL (public.get_my_role)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol FROM public.usuarios WHERE auth_id = auth.uid() LIMIT 1;
$$;

-- 1. TABLA DE ORÍGENES PERMITIDOS (ADMINISTRABLE EN BASE DE DATOS)
CREATE TABLE IF NOT EXISTS public.cors_allowed_origins (
  id SERIAL PRIMARY KEY,
  origin TEXT NOT NULL UNIQUE,
  environment TEXT NOT NULL DEFAULT 'production' CHECK (environment IN ('production', 'development')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cors_allowed_origins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_cors_origins_select_admin ON public.cors_allowed_origins;
CREATE POLICY rls_cors_origins_select_admin
ON public.cors_allowed_origins
FOR SELECT
TO authenticated
USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS rls_cors_origins_manage_admin ON public.cors_allowed_origins;
CREATE POLICY rls_cors_origins_manage_admin
ON public.cors_allowed_origins
FOR ALL
TO authenticated
USING (public.get_my_role() = 'admin')
WITH CHECK (public.get_my_role() = 'admin');

-- 2. CARGAR ORÍGENES OFICIALES DE PRODUCCIÓN Y DESARROLLO LOCAL
INSERT INTO public.cors_allowed_origins (origin, environment, active)
VALUES
  ('https://sis-biscui.vercel.app', 'production', true),
  ('https://biscui.vercel.app', 'production', true),
  ('http://localhost:5173', 'development', true),
  ('http://localhost:4173', 'development', true),
  ('http://127.0.0.1:5173', 'development', true),
  ('http://127.0.0.1:4173', 'development', true)
ON CONFLICT (origin) DO UPDATE
SET active = EXCLUDED.active,
    environment = EXCLUDED.environment;

-- 3. FUNCIÓN DE VALIDACIÓN DE ORIGEN (EJECUTADA ANTES DE CADA REQUEST EN POSTGREST)
CREATE OR REPLACE FUNCTION public.check_cors_origin()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_headers JSON;
  v_origin TEXT;
  v_is_allowed BOOLEAN := FALSE;
BEGIN
  BEGIN
    v_headers := current_setting('request.headers', true)::JSON;
  EXCEPTION WHEN OTHERS THEN
    v_headers := '{}'::JSON;
  END;

  v_origin := trim(COALESCE(v_headers->>'origin', ''));

  -- Si la petición no incluye header Origin (ej. llamadas directas servidor a servidor o CLI), permitir
  IF v_origin = '' THEN
    RETURN;
  END IF;

  -- Normalizar barra final si existiera
  v_origin := regexp_replace(v_origin, '/+$', '');

  -- Rechazar explícitamente Origin: null (iframes en sandbox / archivos locales file://)
  IF lower(v_origin) = 'null' THEN
    RAISE EXCEPTION 'Acceso bloqueado por política CORS: el origen "null" no está autorizado.'
      USING ERRCODE = '42501', HINT = 'CORS_ORIGIN_DENIED';
  END IF;

  -- 1. Verificar coincidencia exacta en la tabla de orígenes autorizados
  SELECT EXISTS (
    SELECT 1
    FROM public.cors_allowed_origins
    WHERE lower(origin) = lower(v_origin)
      AND active = TRUE
  ) INTO v_is_allowed;

  -- 2. Permitir subdominios de preview/producción oficiales del proyecto Biscui en Vercel
  IF NOT v_is_allowed AND v_origin ~* '^https://[a-z0-9-]*(biscui)[a-z0-9-]*\.vercel\.app$' THEN
    v_is_allowed := TRUE;
  END IF;

  IF NOT v_is_allowed THEN
    RAISE EXCEPTION 'Acceso bloqueado por política CORS: el origen "%" no está autorizado para consumir esta API.', v_origin
      USING ERRCODE = '42501', HINT = 'CORS_ORIGIN_DENIED';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_cors_origin() TO anon, authenticated, authenticator;

-- 4. REGISTRAR EL HOOK GLOBAL EN POSTGREST (db_pre_request)
-- Con esto, cada petición REST o RPC pasa primero por public.check_cors_origin()
ALTER ROLE authenticator SET pgrst.db_pre_request = 'public.check_cors_origin';
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';

