-- =====================================================
-- DOCUVI - SCRIPT DE PRUEBA Y VERIFICACIÓN
-- Sistema de Certificados
-- =====================================================
--
-- Este script permite:
-- 1. Verificar que la instalación fue exitosa
-- 2. Ejecutar pruebas de funcionalidad
-- 3. Generar datos de ejemplo
--
-- =====================================================

-- =====================================================
-- PASO 1: VERIFICACIÓN DE INSTALACIÓN
-- =====================================================

\echo '\n=== VERIFICANDO INSTALACIÓN ==='

-- Verificar tablas
\echo '\n1. Verificando tablas...'
SELECT
  table_name,
  CASE
    WHEN table_name IN ('certificados', 'certificados_detalle') THEN '✓ Existe'
    ELSE '✗ No encontrada'
  END as estado
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('certificados', 'certificados_detalle')
ORDER BY table_name;

-- Verificar índices
\echo '\n2. Verificando índices...'
SELECT
  indexname,
  tablename,
  '✓ Creado' as estado
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('certificados', 'certificados_detalle')
ORDER BY tablename, indexname;

-- Verificar funciones
\echo '\n3. Verificando funciones...'
SELECT
  routine_name,
  '✓ Instalada' as estado
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'generar_codigo_certificado',
    'verificar_cumplimiento_cliente',
    'actualizar_certificados_vencidos',
    'obtener_certificados_proximos_vencer',
    'notificar_certificado_generado',
    'notificar_certificado_revocado'
  )
ORDER BY routine_name;

-- Verificar triggers
\echo '\n4. Verificando triggers...'
SELECT
  trigger_name,
  event_object_table as tabla,
  '✓ Activo' as estado
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table = 'certificados'
ORDER BY trigger_name;

-- Verificar vistas
\echo '\n5. Verificando vistas...'
SELECT
  table_name,
  '✓ Creada' as estado
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN ('vista_certificados_clientes', 'vista_certificados_completos')
ORDER BY table_name;

-- Verificar RLS
\echo '\n6. Verificando Row Level Security...'
SELECT
  tablename,
  CASE WHEN rowsecurity THEN '✓ Habilitado' ELSE '✗ Deshabilitado' END as rls_estado
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('certificados', 'certificados_detalle');

-- Verificar políticas
\echo '\n7. Verificando políticas de seguridad...'
SELECT
  tablename,
  policyname,
  cmd as operacion,
  '✓ Activa' as estado
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('certificados', 'certificados_detalle')
ORDER BY tablename, policyname;

-- =====================================================
-- PASO 2: PRUEBAS DE FUNCIONALIDAD
-- =====================================================

\echo '\n\n=== EJECUTANDO PRUEBAS ==='

-- Test 1: Generar código de certificado
\echo '\n1. Probando generar_codigo_certificado()...'
DO $$
DECLARE
  codigo1 TEXT;
  codigo2 TEXT;
BEGIN
  codigo1 := generar_codigo_certificado();
  codigo2 := generar_codigo_certificado();

  RAISE NOTICE '  Código generado 1: %', codigo1;
  RAISE NOTICE '  Código generado 2: %', codigo2;

  IF codigo1 ~ '^CERT-\d{4}-\d{6}$' THEN
    RAISE NOTICE '  ✓ Formato correcto';
  ELSE
    RAISE WARNING '  ✗ Formato incorrecto';
  END IF;

  IF codigo1 != codigo2 THEN
    RAISE NOTICE '  ✓ Códigos únicos';
  ELSE
    RAISE WARNING '  ✗ Códigos duplicados';
  END IF;
END $$;

-- Test 2: Verificar cumplimiento (requiere datos)
\echo '\n2. Probando verificar_cumplimiento_cliente()...'
DO $$
DECLARE
  cliente_uuid UUID;
  resultado RECORD;
BEGIN
  -- Obtener primer cliente (si existe)
  SELECT id INTO cliente_uuid FROM clientes LIMIT 1;

  IF cliente_uuid IS NULL THEN
    RAISE NOTICE '  ⚠ No hay clientes para probar. Saltando test.';
  ELSE
    SELECT * INTO resultado FROM verificar_cumplimiento_cliente(cliente_uuid);
    RAISE NOTICE '  Cliente ID: %', cliente_uuid;
    RAISE NOTICE '  Cumple: %', resultado.cumple;
    RAISE NOTICE '  Total requerimientos: %', resultado.total_requerimientos;
    RAISE NOTICE '  Requerimientos cumplidos: %', resultado.requerimientos_cumplidos;
    RAISE NOTICE '  ✓ Función ejecutada correctamente';
  END IF;
END $$;

-- Test 3: Actualizar certificados vencidos
\echo '\n3. Probando actualizar_certificados_vencidos()...'
DO $$
DECLARE
  actualizados INTEGER;
BEGIN
  actualizados := actualizar_certificados_vencidos();
  RAISE NOTICE '  Certificados actualizados: %', actualizados;
  RAISE NOTICE '  ✓ Función ejecutada correctamente';
END $$;

-- Test 4: Obtener certificados próximos a vencer
\echo '\n4. Probando obtener_certificados_proximos_vencer()...'
DO $$
DECLARE
  total INTEGER;
BEGIN
  SELECT COUNT(*) INTO total FROM obtener_certificados_proximos_vencer(30);
  RAISE NOTICE '  Certificados próximos a vencer (30 días): %', total;
  RAISE NOTICE '  ✓ Función ejecutada correctamente';
END $$;

-- =====================================================
-- PASO 3: ESTADÍSTICAS ACTUALES
-- =====================================================

\echo '\n\n=== ESTADÍSTICAS ACTUALES ==='

-- Estadísticas de certificados
\echo '\n1. Resumen de certificados:'
SELECT
  estado,
  COUNT(*) as cantidad,
  MIN(fecha_emision) as primer_certificado,
  MAX(fecha_emision) as ultimo_certificado
FROM certificados
GROUP BY estado
ORDER BY estado;

-- Si no hay certificados
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM certificados LIMIT 1) THEN
    RAISE NOTICE '  ℹ No hay certificados en el sistema';
  END IF;
END $$;

-- Certificados por cliente
\echo '\n2. Certificados por cliente:'
SELECT * FROM vista_certificados_clientes
ORDER BY total_certificados DESC
LIMIT 10;

-- Certificados próximos a vencer
\echo '\n3. Certificados próximos a vencer (30 días):'
SELECT
  codigo,
  cliente_nombre,
  fecha_validez_hasta,
  dias_hasta_vencimiento
FROM vista_certificados_completos
WHERE estado = 'activo'
  AND dias_hasta_vencimiento <= 30
ORDER BY dias_hasta_vencimiento ASC
LIMIT 10;

-- =====================================================
-- PASO 4: DATOS DE PRUEBA (OPCIONAL)
-- =====================================================

\echo '\n\n=== GENERAR DATOS DE PRUEBA ==='
\echo 'Para generar datos de prueba, descomenta y ejecuta la sección siguiente.\n'

/*
-- DESCOMENTA ESTA SECCIÓN PARA GENERAR DATOS DE PRUEBA

DO $$
DECLARE
  revisor_id UUID;
  cliente_id UUID;
  codigo_cert TEXT;
  cert_id UUID;
BEGIN
  -- Obtener primer revisor
  SELECT id INTO revisor_id FROM usuarios WHERE rol = 'revisor' LIMIT 1;

  -- Obtener primer cliente
  SELECT id INTO cliente_id FROM clientes LIMIT 1;

  IF revisor_id IS NULL THEN
    RAISE EXCEPTION 'No hay revisores en el sistema';
  END IF;

  IF cliente_id IS NULL THEN
    RAISE EXCEPTION 'No hay clientes en el sistema';
  END IF;

  -- Generar certificado de prueba activo
  codigo_cert := generar_codigo_certificado();
  INSERT INTO certificados (
    codigo,
    hash,
    cliente_id,
    emitido_por,
    fecha_validez_desde,
    fecha_validez_hasta,
    estado,
    datos
  ) VALUES (
    codigo_cert,
    md5(codigo_cert || NOW()::TEXT),
    cliente_id,
    revisor_id,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '1 year',
    'activo',
    '{"requerimientos_cumplidos": 5, "total_requerimientos": 5}'::jsonb
  ) RETURNING id INTO cert_id;

  RAISE NOTICE 'Certificado de prueba creado: % (ID: %)', codigo_cert, cert_id;

  -- Generar certificado próximo a vencer
  codigo_cert := generar_codigo_certificado();
  INSERT INTO certificados (
    codigo,
    hash,
    cliente_id,
    emitido_por,
    fecha_validez_desde,
    fecha_validez_hasta,
    estado,
    datos
  ) VALUES (
    codigo_cert,
    md5(codigo_cert || NOW()::TEXT),
    cliente_id,
    revisor_id,
    CURRENT_DATE - INTERVAL '11 months',
    CURRENT_DATE + INTERVAL '15 days',
    'activo',
    '{"requerimientos_cumplidos": 3, "total_requerimientos": 3}'::jsonb
  );

  RAISE NOTICE 'Certificado próximo a vencer creado: %', codigo_cert;

  -- Generar certificado vencido
  codigo_cert := generar_codigo_certificado();
  INSERT INTO certificados (
    codigo,
    hash,
    cliente_id,
    emitido_por,
    fecha_validez_desde,
    fecha_validez_hasta,
    estado,
    datos
  ) VALUES (
    codigo_cert,
    md5(codigo_cert || NOW()::TEXT),
    cliente_id,
    revisor_id,
    CURRENT_DATE - INTERVAL '2 years',
    CURRENT_DATE - INTERVAL '1 year',
    'vencido',
    '{"requerimientos_cumplidos": 4, "total_requerimientos": 4}'::jsonb
  );

  RAISE NOTICE 'Certificado vencido creado: %', codigo_cert;

  RAISE NOTICE '✓ Datos de prueba generados exitosamente';
END $$;
*/

-- =====================================================
-- PASO 5: LIMPIEZA (OPCIONAL)
-- =====================================================

\echo '\n=== LIMPIEZA ==='
\echo 'Para eliminar TODOS los certificados de prueba, ejecuta:'
\echo '  DELETE FROM certificados WHERE datos @> \'{"es_prueba": true}\'::jsonb;'
\echo ''

-- =====================================================
-- RESUMEN FINAL
-- =====================================================

\echo '\n=== RESUMEN ==='
DO $$
DECLARE
  tablas_ok BOOLEAN;
  funciones_ok BOOLEAN;
  vistas_ok BOOLEAN;
  rls_ok BOOLEAN;
BEGIN
  -- Verificar tablas
  SELECT COUNT(*) = 2 INTO tablas_ok
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('certificados', 'certificados_detalle');

  -- Verificar funciones
  SELECT COUNT(*) >= 6 INTO funciones_ok
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name LIKE '%certificado%';

  -- Verificar vistas
  SELECT COUNT(*) = 2 INTO vistas_ok
  FROM information_schema.views
  WHERE table_schema = 'public'
    AND table_name IN ('vista_certificados_clientes', 'vista_certificados_completos');

  -- Verificar RLS
  SELECT bool_and(rowsecurity) INTO rls_ok
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('certificados', 'certificados_detalle');

  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'RESULTADO DE LA VERIFICACIÓN';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Tablas:      %', CASE WHEN tablas_ok THEN '✓ OK' ELSE '✗ ERROR' END;
  RAISE NOTICE 'Funciones:   %', CASE WHEN funciones_ok THEN '✓ OK' ELSE '✗ ERROR' END;
  RAISE NOTICE 'Vistas:      %', CASE WHEN vistas_ok THEN '✓ OK' ELSE '✗ ERROR' END;
  RAISE NOTICE 'Seguridad:   %', CASE WHEN rls_ok THEN '✓ OK' ELSE '✗ ERROR' END;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

  IF tablas_ok AND funciones_ok AND vistas_ok AND rls_ok THEN
    RAISE NOTICE 'Estado:      ✓ INSTALACIÓN EXITOSA';
  ELSE
    RAISE NOTICE 'Estado:      ✗ INSTALACIÓN INCOMPLETA';
    RAISE NOTICE 'Revisa los errores anteriores y ejecuta certificados_implementation.sql';
  END IF;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
END $$;

\echo '\nPara más información, consulta: CERTIFICADOS_README.md'
\echo ''
