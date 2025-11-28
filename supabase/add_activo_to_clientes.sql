-- =====================================================
-- MIGRACION: Agregar campo 'activo' a tabla clientes
-- Fecha: 2025-01-03
-- Descripcion: Agrega el campo activo (boolean) a la tabla clientes
--              para permitir activar/desactivar clientes sin eliminarlos
-- =====================================================

-- Agregar columna activo a la tabla clientes
ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT true;

-- Actualizar todos los registros existentes a activo = true
UPDATE public.clientes
SET activo = true
WHERE activo IS NULL;

-- Verificar que la columna se agrego correctamente
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'clientes'
    AND column_name = 'activo'
  ) THEN
    RAISE NOTICE 'Columna "activo" agregada exitosamente a la tabla clientes';
  ELSE
    RAISE EXCEPTION 'Error: No se pudo agregar la columna "activo"';
  END IF;
END $$;
