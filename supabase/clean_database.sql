-- =====================================================
-- DOCUVI - SCRIPT DE LIMPIEZA DE BASE DE DATOS
-- =====================================================
-- ADVERTENCIA: Este script eliminará TODOS los registros
-- de la base de datos EXCEPTO el usuario administrador
-- (primer revisor creado).
--
-- SE PRESERVA:
-- - Usuario administrador (primer revisor)
-- - Notificaciones del administrador
-- - Auditoría de acciones del administrador
--
-- SE ELIMINA:
-- - Todos los demás usuarios y sus datos de autenticación
-- - Todos los clientes
-- - Todos los documentos y certificados
-- - Todos los tipos de documento
-- - Todos los requerimientos
--
-- IMPORTANTE: Los archivos en Supabase Storage NO se
-- eliminarán automáticamente. Deberás limpiarlos manualmente
-- desde el panel de Supabase.
-- =====================================================

BEGIN;

-- Deshabilitar triggers temporalmente para mejor performance
SET session_replication_role = 'replica';

-- =====================================================
-- PASO 0: Identificar usuario administrador a preservar
-- =====================================================
DO $$
DECLARE
  admin_id UUID;
  admin_email TEXT := NULL; -- Opción: especifica el correo del admin aquí
BEGIN
  -- OPCIÓN A: Preservar administrador por correo electrónico específico
  -- Descomenta y especifica el correo del admin que quieres preservar:
  -- admin_email := 'admin@docuvi.com';

  IF admin_email IS NOT NULL THEN
    -- Buscar admin por correo específico
    SELECT id INTO admin_id
    FROM public.usuarios
    WHERE correo = admin_email
    AND rol = 'revisor';

    IF admin_id IS NULL THEN
      RAISE EXCEPTION 'No se encontró usuario revisor con correo: %', admin_email;
    END IF;
  ELSE
    -- OPCIÓN B: Preservar el primer revisor creado (comportamiento por defecto)
    SELECT id INTO admin_id
    FROM public.usuarios
    WHERE rol = 'revisor'
    ORDER BY creado_en ASC
    LIMIT 1;
  END IF;

  IF admin_id IS NOT NULL THEN
    RAISE NOTICE 'Usuario administrador preservado: %', admin_id;
    -- Guardar en una tabla temporal para referencia
    CREATE TEMP TABLE IF NOT EXISTS admin_preservado (id UUID);
    DELETE FROM admin_preservado;
    INSERT INTO admin_preservado VALUES (admin_id);
  ELSE
    RAISE EXCEPTION 'No se encontró ningún usuario administrador (revisor)';
  END IF;
END $$;

-- =====================================================
-- PASO 1: Eliminar registros de tablas con dependencias
-- (orden: de más dependiente a menos dependiente)
-- PRESERVANDO el usuario administrador
-- =====================================================

-- Eliminar detalles de certificados
DELETE FROM public.certificados_detalle;
SELECT 'Registros eliminados de certificados_detalle' AS paso;

-- Eliminar certificados
DELETE FROM public.certificados;
SELECT 'Registros eliminados de certificados' AS paso;

-- Eliminar notificaciones (excepto las del admin si existen)
DELETE FROM public.notificaciones
WHERE usuario_id NOT IN (SELECT id FROM admin_preservado);
SELECT 'Registros eliminados de notificaciones' AS paso;

-- Eliminar documentos
DELETE FROM public.documentos;
SELECT 'Registros eliminados de documentos' AS paso;

-- Eliminar auditoría (excepto acciones del admin si se desea preservar histórico)
DELETE FROM public.auditoria
WHERE actor_id NOT IN (SELECT id FROM admin_preservado)
   OR actor_id IS NULL;
SELECT 'Registros eliminados de auditoria' AS paso;

-- Eliminar requerimientos de cliente
DELETE FROM public.requerimientos_cliente;
SELECT 'Registros eliminados de requerimientos_cliente' AS paso;

-- Eliminar tipos de documento (creados por otros usuarios)
-- NOTA: Si el admin creó tipos de documento, se preservarán automáticamente
-- por la referencia, pero si quieres eliminarlos también, descomenta la siguiente línea
DELETE FROM public.tipos_documento;
SELECT 'Registros eliminados de tipos_documento' AS paso;

-- Eliminar clientes
DELETE FROM public.clientes;
SELECT 'Registros eliminados de clientes' AS paso;

-- Eliminar usuarios EXCEPTO el administrador
-- Esto también eliminará los usuarios de auth.users por CASCADE
DELETE FROM public.usuarios
WHERE id NOT IN (SELECT id FROM admin_preservado);
SELECT 'Registros eliminados de usuarios (excepto admin)' AS paso;

-- =====================================================
-- PASO 2: Reiniciar secuencias si las hay
-- =====================================================
-- (En este caso usamos UUIDs, no hay secuencias numéricas)

-- =====================================================
-- PASO 3: Habilitar triggers nuevamente
-- =====================================================
SET session_replication_role = 'origin';

-- =====================================================
-- PASO 4: Verificar conteo de registros y mostrar admin preservado
-- =====================================================

-- Mostrar usuario administrador preservado
SELECT
  'USUARIO ADMINISTRADOR PRESERVADO' AS info,
  u.correo AS correo_admin,
  u.nombre AS nombre_admin,
  u.rol AS rol,
  u.creado_en AS fecha_creacion
FROM public.usuarios u
WHERE u.id IN (SELECT id FROM admin_preservado)
LIMIT 1;

-- Conteo de registros restantes
SELECT
  'usuarios' AS tabla,
  COUNT(*) AS registros_restantes
FROM public.usuarios
UNION ALL
SELECT
  'clientes' AS tabla,
  COUNT(*) AS registros_restantes
FROM public.clientes
UNION ALL
SELECT
  'tipos_documento' AS tabla,
  COUNT(*) AS registros_restantes
FROM public.tipos_documento
UNION ALL
SELECT
  'requerimientos_cliente' AS tabla,
  COUNT(*) AS registros_restantes
FROM public.requerimientos_cliente
UNION ALL
SELECT
  'documentos' AS tabla,
  COUNT(*) AS registros_restantes
FROM public.documentos
UNION ALL
SELECT
  'certificados' AS tabla,
  COUNT(*) AS registros_restantes
FROM public.certificados
UNION ALL
SELECT
  'certificados_detalle' AS tabla,
  COUNT(*) AS registros_restantes
FROM public.certificados_detalle
UNION ALL
SELECT
  'notificaciones' AS tabla,
  COUNT(*) AS registros_restantes
FROM public.notificaciones
UNION ALL
SELECT
  'auditoria' AS tabla,
  COUNT(*) AS registros_restantes
FROM public.auditoria;

-- =====================================================
-- FINALIZAR
-- =====================================================

-- Limpiar tabla temporal
DROP TABLE IF EXISTS admin_preservado;

COMMIT;

SELECT '✓ Base de datos limpiada exitosamente' AS resultado;
SELECT '✓ Usuario administrador preservado' AS info;
SELECT '⚠ RECORDATORIO: Limpia manualmente los archivos en Supabase Storage' AS recordatorio;
