-- =====================================================
-- DOCUVI - ROLLBACK DE CERTIFICADOS
-- Script para desinstalar la implementación de certificados
-- =====================================================
--
-- ADVERTENCIA: Este script eliminará TODOS los datos de certificados
-- Úsalo solo si estás seguro de que quieres desinstalar completamente
-- el sistema de certificados.
--
-- =====================================================

\echo '\n=== INICIANDO ROLLBACK DE CERTIFICADOS ==='
\echo 'ADVERTENCIA: Esto eliminará TODOS los datos de certificados\n'

-- Confirmar antes de proceder
-- Descomenta la siguiente línea para proceder con el rollback
-- \set PROCEED 'yes'

-- =====================================================
-- PASO 1: ELIMINAR TRIGGERS
-- =====================================================

\echo '\n1. Eliminando triggers...'

DROP TRIGGER IF EXISTS trigger_certificados_actualizado ON public.certificados;
DROP TRIGGER IF EXISTS trigger_notificar_certificado_generado ON public.certificados;
DROP TRIGGER IF EXISTS trigger_notificar_certificado_revocado ON public.certificados;

\echo '   ✓ Triggers eliminados'

-- =====================================================
-- PASO 2: ELIMINAR VISTAS
-- =====================================================

\echo '\n2. Eliminando vistas...'

DROP VIEW IF EXISTS public.vista_certificados_completos CASCADE;
DROP VIEW IF EXISTS public.vista_certificados_clientes CASCADE;

\echo '   ✓ Vistas eliminadas'

-- =====================================================
-- PASO 3: ELIMINAR POLÍTICAS RLS
-- =====================================================

\echo '\n3. Eliminando políticas de seguridad...'

-- Políticas de certificados
DROP POLICY IF EXISTS "certificados_all_revisor" ON public.certificados;
DROP POLICY IF EXISTS "certificados_select_cliente" ON public.certificados;
DROP POLICY IF EXISTS "certificados_select_public" ON public.certificados;

-- Políticas de certificados_detalle
DROP POLICY IF EXISTS "certificados_detalle_all_revisor" ON public.certificados_detalle;
DROP POLICY IF EXISTS "certificados_detalle_select_cliente" ON public.certificados_detalle;
DROP POLICY IF EXISTS "certificados_detalle_select_public" ON public.certificados_detalle;

\echo '   ✓ Políticas eliminadas'

-- =====================================================
-- PASO 4: ELIMINAR TABLAS
-- =====================================================

\echo '\n4. Eliminando tablas...'

-- Desactivar RLS antes de eliminar
ALTER TABLE IF EXISTS public.certificados DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.certificados_detalle DISABLE ROW LEVEL SECURITY;

-- Eliminar tablas (CASCADE eliminará referencias)
DROP TABLE IF EXISTS public.certificados_detalle CASCADE;
DROP TABLE IF EXISTS public.certificados CASCADE;

\echo '   ✓ Tablas eliminadas'

-- =====================================================
-- PASO 5: ELIMINAR FUNCIONES
-- =====================================================

\echo '\n5. Eliminando funciones...'

DROP FUNCTION IF EXISTS public.notificar_certificado_revocado() CASCADE;
DROP FUNCTION IF EXISTS public.notificar_certificado_generado() CASCADE;
DROP FUNCTION IF EXISTS public.obtener_certificados_proximos_vencer(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.actualizar_certificados_vencidos() CASCADE;
DROP FUNCTION IF EXISTS public.verificar_cumplimiento_cliente(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.generar_codigo_certificado() CASCADE;

\echo '   ✓ Funciones eliminadas'

-- =====================================================
-- PASO 6: ELIMINAR ÍNDICES (si quedan huérfanos)
-- =====================================================

\echo '\n6. Limpiando índices huérfanos...'

DROP INDEX IF EXISTS public.idx_certificados_codigo;
DROP INDEX IF EXISTS public.idx_certificados_cliente;
DROP INDEX IF EXISTS public.idx_certificados_estado;
DROP INDEX IF EXISTS public.idx_certificados_fecha_validez;
DROP INDEX IF EXISTS public.idx_certificados_detalle_certificado;
DROP INDEX IF EXISTS public.idx_certificados_detalle_documento;

\echo '   ✓ Índices eliminados'

-- =====================================================
-- PASO 7: ELIMINAR CRON JOBS (si existen)
-- =====================================================

\echo '\n7. Eliminando cron jobs...'

-- Solo si tienes pg_cron instalado
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    PERFORM cron.unschedule('actualizar-certificados-vencidos');
    RAISE NOTICE '   ✓ Cron jobs eliminados';
  ELSE
    RAISE NOTICE '   ℹ pg_cron no está instalado, saltando';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '   ℹ No se encontraron cron jobs';
END $$;

-- =====================================================
-- PASO 8: LIMPIAR NOTIFICACIONES Y AUDITORÍA
-- =====================================================

\echo '\n8. Limpiando notificaciones y auditoría relacionadas...'

DELETE FROM public.notificaciones
WHERE tipo IN ('certificado_generado', 'certificado_revocado');

DELETE FROM public.auditoria
WHERE entidad = 'certificados';

\echo '   ✓ Registros limpiados'

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

\echo '\n=== VERIFICACIÓN DE ROLLBACK ==='

DO $$
DECLARE
  tablas_count INTEGER;
  funciones_count INTEGER;
  vistas_count INTEGER;
  triggers_count INTEGER;
BEGIN
  -- Contar elementos que deberían estar eliminados
  SELECT COUNT(*) INTO tablas_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('certificados', 'certificados_detalle');

  SELECT COUNT(*) INTO funciones_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name LIKE '%certificado%';

  SELECT COUNT(*) INTO vistas_count
  FROM information_schema.views
  WHERE table_schema = 'public'
    AND table_name IN ('vista_certificados_clientes', 'vista_certificados_completos');

  SELECT COUNT(*) INTO triggers_count
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
    AND trigger_name LIKE '%certificado%';

  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'RESULTADO DEL ROLLBACK';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Tablas restantes:    %', tablas_count;
  RAISE NOTICE 'Funciones restantes: %', funciones_count;
  RAISE NOTICE 'Vistas restantes:    %', vistas_count;
  RAISE NOTICE 'Triggers restantes:  %', triggers_count;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  IF tablas_count = 0 AND funciones_count = 0 AND vistas_count = 0 AND triggers_count = 0 THEN
    RAISE NOTICE 'Estado: ✓ ROLLBACK COMPLETADO EXITOSAMENTE';
    RAISE NOTICE '';
    RAISE NOTICE 'El sistema de certificados ha sido desinstalado completamente.';
    RAISE NOTICE 'Para reinstalar, ejecuta: certificados_implementation.sql';
  ELSE
    RAISE WARNING 'Estado: ⚠ ROLLBACK INCOMPLETO';
    RAISE WARNING 'Algunos elementos no pudieron ser eliminados.';
    RAISE WARNING 'Revisa los errores anteriores.';
  END IF;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
END $$;

\echo '\n=== ROLLBACK FINALIZADO ==='
\echo ''
