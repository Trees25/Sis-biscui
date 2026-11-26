-- =========================================================================
-- ACTUALIZACIÓN DE UNIDAD DE MEDIDA: FRUTAS Y VERDURAS EN SUCURSALES (A UNIDADES)
-- Archivo: supabase/update_frutas_verduras_unidades.sql
-- Propósito:
--   Establecer que las frutas y verduras se midan por unidad ('unidad')
--   en vez de kilos en el inventario y stock de las sucursales.
--   (Nota: los sabores de helado permanecen en 'peso').
-- =========================================================================

UPDATE public.productos
SET unidad_medida = 'unidad'
WHERE categoria <> 'helados'
  AND (
    categoria IN ('frutas_verduras', 'frutas', 'verduras', 'fruta', 'verdura')
    OR lower(nombre) ~* '(fruta|verdura|limon|limón|naranja|banana|frutilla|durazno|kiwi|manzana|pera)'
  );

-- Notificar recarga de esquema a PostgREST
NOTIFY pgrst, 'reload schema';
