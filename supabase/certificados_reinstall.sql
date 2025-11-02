-- =====================================================
-- DOCUVI - REINSTALACIÓN LIMPIA DE CERTIFICADOS
-- Script para reinstalar completamente el sistema
-- =====================================================
--
-- Este script realiza:
-- 1. Rollback completo del sistema actual (si existe)
-- 2. Instalación limpia de certificados
--
-- Úsalo cuando necesites actualizar o reinstalar el sistema
-- de certificados desde cero.
--
-- =====================================================

\echo '\n╔════════════════════════════════════════════════════╗'
\echo '║  DOCUVI - REINSTALACIÓN DE CERTIFICADOS          ║'
\echo '╚════════════════════════════════════════════════════╝'
\echo ''

-- =====================================================
-- FASE 1: ROLLBACK
-- =====================================================

\echo '\n━━━ FASE 1: LIMPIEZA DE INSTALACIÓN ANTERIOR ━━━\n'

-- Eliminar triggers
DROP TRIGGER IF EXISTS trigger_certificados_actualizado ON public.certificados;
DROP TRIGGER IF EXISTS trigger_notificar_certificado_generado ON public.certificados;
DROP TRIGGER IF EXISTS trigger_notificar_certificado_revocado ON public.certificados;

-- Eliminar vistas
DROP VIEW IF EXISTS public.vista_certificados_completos CASCADE;
DROP VIEW IF EXISTS public.vista_certificados_clientes CASCADE;

-- Eliminar políticas
DROP POLICY IF EXISTS "certificados_all_revisor" ON public.certificados;
DROP POLICY IF EXISTS "certificados_select_cliente" ON public.certificados;
DROP POLICY IF EXISTS "certificados_select_public" ON public.certificados;
DROP POLICY IF EXISTS "certificados_detalle_all_revisor" ON public.certificados_detalle;
DROP POLICY IF EXISTS "certificados_detalle_select_cliente" ON public.certificados_detalle;
DROP POLICY IF EXISTS "certificados_detalle_select_public" ON public.certificados_detalle;

-- Desactivar RLS
ALTER TABLE IF EXISTS public.certificados DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.certificados_detalle DISABLE ROW LEVEL SECURITY;

-- Eliminar tablas (NOTA: Esto eliminará TODOS los datos)
-- Si quieres preservar datos, comenta estas líneas y haz backup primero
DROP TABLE IF EXISTS public.certificados_detalle CASCADE;
DROP TABLE IF EXISTS public.certificados CASCADE;

-- Eliminar funciones
DROP FUNCTION IF EXISTS public.notificar_certificado_revocado() CASCADE;
DROP FUNCTION IF EXISTS public.notificar_certificado_generado() CASCADE;
DROP FUNCTION IF EXISTS public.obtener_certificados_proximos_vencer(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.actualizar_certificados_vencidos() CASCADE;
DROP FUNCTION IF EXISTS public.verificar_cumplimiento_cliente(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.generar_codigo_certificado() CASCADE;

\echo '✓ Limpieza completada\n'

-- =====================================================
-- FASE 2: INSTALACIÓN LIMPIA
-- =====================================================

\echo '━━━ FASE 2: INSTALACIÓN LIMPIA ━━━\n'

-- Ejecutar script de implementación
\i certificados_implementation.sql

\echo '\n╔════════════════════════════════════════════════════╗'
\echo '║  REINSTALACIÓN COMPLETADA                         ║'
\echo '╚════════════════════════════════════════════════════╝'
\echo ''
\echo 'Ejecuta certificados_test.sql para verificar la instalación.'
\echo ''
