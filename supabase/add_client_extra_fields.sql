-- =====================================================
-- AGREGAR CAMPOS ADICIONALES A LA TABLA CLIENTES
-- =====================================================
-- Campos nuevos:
-- - cuit_cuil: CUIT/CUIL del cliente
-- - domicilio: Dirección física
-- - nombre_representante: Nombre y apellido del representante
-- - celular_contacto: Celular/móvil de contacto
-- - tipo_persona: física o jurídica
-- =====================================================

BEGIN;

-- Agregar columna CUIT/CUIL
ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS cuit_cuil TEXT;

-- Agregar columna Domicilio
ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS domicilio TEXT;

-- Agregar columna Nombre del Representante/Contacto
ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS nombre_representante TEXT;

-- Agregar columna Celular de Contacto
ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS celular_contacto TEXT;

-- Agregar columna Tipo de Persona (física/jurídica)
ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS tipo_persona TEXT CHECK (tipo_persona IN ('fisica', 'juridica'));

-- Crear índice para búsqueda por CUIT/CUIL
CREATE INDEX IF NOT EXISTS idx_clientes_cuit_cuil ON public.clientes(cuit_cuil);

-- Crear índice para filtrar por tipo de persona
CREATE INDEX IF NOT EXISTS idx_clientes_tipo_persona ON public.clientes(tipo_persona);

COMMIT;

-- Verificar los cambios
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'clientes'
ORDER BY ordinal_position;

SELECT '✓ Campos adicionales agregados exitosamente' AS resultado;
