-- =====================================================
-- DOCUVI - SCRIPT DE LIMPIEZA SELECTIVA
-- =====================================================
-- Este script permite limpiar datos específicos mientras
-- mantiene la configuración base del sistema.
--
-- INSTRUCCIONES:
-- Comenta/descomenta las secciones según lo que necesites limpiar
-- =====================================================

BEGIN;

-- Deshabilitar triggers temporalmente
SET session_replication_role = 'replica';

-- =====================================================
-- OPCIÓN 1: Limpiar solo datos transaccionales
-- Mantiene: usuarios, clientes, tipos_documento
-- Elimina: documentos, certificados, notificaciones
-- =====================================================

-- Descomentar para eliminar certificados y su detalle
-- DELETE FROM public.certificados_detalle;
-- DELETE FROM public.certificados;
-- SELECT 'Certificados eliminados' AS paso;

-- Descomentar para eliminar notificaciones
-- DELETE FROM public.notificaciones;
-- SELECT 'Notificaciones eliminadas' AS paso;

-- Descomentar para eliminar documentos
-- DELETE FROM public.documentos;
-- SELECT 'Documentos eliminados' AS paso;

-- Descomentar para eliminar auditoría
-- DELETE FROM public.auditoria;
-- SELECT 'Auditoría eliminada' AS paso;

-- =====================================================
-- OPCIÓN 2: Limpiar requerimientos y documentos
-- Útil para reconfigurar qué documentos pide cada cliente
-- =====================================================

-- Descomentar para eliminar requerimientos y sus documentos
-- DELETE FROM public.certificados_detalle;
-- DELETE FROM public.certificados;
-- DELETE FROM public.notificaciones WHERE requerimiento_id IS NOT NULL;
-- DELETE FROM public.documentos;
-- DELETE FROM public.requerimientos_cliente;
-- SELECT 'Requerimientos y documentos eliminados' AS paso;

-- =====================================================
-- OPCIÓN 3: Eliminar un cliente específico y sus datos
-- Reemplaza 'CLIENTE_UUID_AQUI' con el ID real del cliente
-- =====================================================

-- Descomentar y reemplazar UUID para eliminar cliente específico
/*
DO $$
DECLARE
  cliente_id_var UUID := 'CLIENTE_UUID_AQUI'::UUID;
BEGIN
  -- Eliminar datos relacionados al cliente
  DELETE FROM public.certificados_detalle
  WHERE certificado_id IN (
    SELECT id FROM public.certificados WHERE cliente_id = cliente_id_var
  );

  DELETE FROM public.certificados
  WHERE cliente_id = cliente_id_var;

  DELETE FROM public.documentos
  WHERE requerimiento_cliente_id IN (
    SELECT id FROM public.requerimientos_cliente WHERE cliente_id = cliente_id_var
  );

  DELETE FROM public.notificaciones
  WHERE requerimiento_id IN (
    SELECT id FROM public.requerimientos_cliente WHERE cliente_id = cliente_id_var
  );

  DELETE FROM public.requerimientos_cliente
  WHERE cliente_id = cliente_id_var;

  DELETE FROM public.clientes
  WHERE id = cliente_id_var;

  RAISE NOTICE 'Cliente % eliminado', cliente_id_var;
END $$;
*/

-- =====================================================
-- OPCIÓN 4: Limpiar documentos antiguos
-- Elimina documentos más viejos que X meses
-- =====================================================

-- Descomentar para eliminar documentos de más de 6 meses
/*
DELETE FROM public.certificados_detalle
WHERE documento_id IN (
  SELECT id FROM public.documentos
  WHERE fecha_carga < NOW() - INTERVAL '6 months'
);

DELETE FROM public.notificaciones
WHERE documento_id IN (
  SELECT id FROM public.documentos
  WHERE fecha_carga < NOW() - INTERVAL '6 months'
);

DELETE FROM public.documentos
WHERE fecha_carga < NOW() - INTERVAL '6 months';

SELECT 'Documentos antiguos eliminados' AS paso;
*/

-- =====================================================
-- OPCIÓN 5: Limpiar solo documentos rechazados
-- =====================================================

-- Descomentar para eliminar solo documentos rechazados
/*
DELETE FROM public.notificaciones
WHERE documento_id IN (
  SELECT id FROM public.documentos
  WHERE estado = 'rechazado'
);

DELETE FROM public.documentos
WHERE estado = 'rechazado';

SELECT 'Documentos rechazados eliminados' AS paso;
*/

-- =====================================================
-- OPCIÓN 6: Limpiar notificaciones antiguas leídas
-- =====================================================

-- Descomentar para eliminar notificaciones leídas de más de 30 días
/*
DELETE FROM public.notificaciones
WHERE leida = true
AND creado_en < NOW() - INTERVAL '30 days';

SELECT 'Notificaciones antiguas eliminadas' AS paso;
*/

-- =====================================================
-- OPCIÓN 7: Limpiar auditoría antigua
-- =====================================================

-- Descomentar para eliminar auditoría de más de 3 meses
/*
DELETE FROM public.auditoria
WHERE creado_en < NOW() - INTERVAL '3 months';

SELECT 'Auditoría antigua eliminada' AS paso;
*/

-- =====================================================
-- OPCIÓN 8: Marcar documentos como eliminados (soft delete)
-- En lugar de eliminar, marca como eliminado
-- =====================================================

-- Descomentar para soft delete de documentos rechazados
/*
UPDATE public.documentos
SET
  eliminado = true,
  eliminado_en = NOW(),
  eliminado_por = (SELECT id FROM public.usuarios WHERE rol = 'revisor' LIMIT 1)
WHERE estado = 'rechazado'
AND eliminado = false;

SELECT 'Documentos marcados como eliminados' AS paso;
*/

-- =====================================================
-- Habilitar triggers nuevamente
-- =====================================================
SET session_replication_role = 'origin';

-- =====================================================
-- Verificar conteos actuales
-- =====================================================
SELECT
  'usuarios' AS tabla,
  COUNT(*) AS total_registros,
  COUNT(*) FILTER (WHERE rol = 'revisor') AS revisores,
  COUNT(*) FILTER (WHERE rol = 'cliente') AS clientes_usuario
FROM public.usuarios
UNION ALL
SELECT
  'clientes' AS tabla,
  COUNT(*) AS total_registros,
  COUNT(*) FILTER (WHERE activo = true) AS activos,
  COUNT(*) FILTER (WHERE activo = false) AS inactivos
FROM public.clientes
UNION ALL
SELECT
  'tipos_documento' AS tabla,
  COUNT(*) AS total_registros,
  COUNT(*) FILTER (WHERE activo = true) AS activos,
  COUNT(*) FILTER (WHERE activo = false) AS inactivos
FROM public.tipos_documento
UNION ALL
SELECT
  'requerimientos_cliente' AS tabla,
  COUNT(*) AS total_registros,
  COUNT(*) FILTER (WHERE obligatorio = true) AS obligatorios,
  COUNT(*) FILTER (WHERE obligatorio = false) AS opcionales
FROM public.requerimientos_cliente
UNION ALL
SELECT
  'documentos' AS tabla,
  COUNT(*) AS total_registros,
  COUNT(*) FILTER (WHERE estado = 'aprobado') AS aprobados,
  COUNT(*) FILTER (WHERE estado = 'rechazado') AS rechazados
FROM public.documentos
WHERE eliminado = false
UNION ALL
SELECT
  'certificados' AS tabla,
  COUNT(*) AS total_registros,
  COUNT(*) FILTER (WHERE estado = 'activo') AS activos,
  COUNT(*) FILTER (WHERE estado = 'revocado') AS revocados
FROM public.certificados
UNION ALL
SELECT
  'notificaciones' AS tabla,
  COUNT(*) AS total_registros,
  COUNT(*) FILTER (WHERE leida = true) AS leidas,
  COUNT(*) FILTER (WHERE leida = false) AS no_leidas
FROM public.notificaciones
UNION ALL
SELECT
  'auditoria' AS tabla,
  COUNT(*) AS total_registros,
  NULL::BIGINT AS columna2,
  NULL::BIGINT AS columna3
FROM public.auditoria;

COMMIT;

SELECT '✓ Operación completada' AS resultado;
SELECT 'Revisa los conteos para verificar los cambios' AS nota;
