-- =====================================================
-- Verificar Triggers de Notificaciones
-- =====================================================

-- Verificar si existen los triggers
SELECT
  tgname AS trigger_name,
  tgenabled AS enabled,
  proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname IN ('trigger_notificar_nuevo_documento', 'trigger_notificar_documento')
ORDER BY tgname;

-- Verificar si existen las funciones
SELECT
  proname AS function_name,
  prosrc AS function_body
FROM pg_proc
WHERE proname IN ('notificar_documento_nuevo', 'notificar_cambio_estado_documento')
ORDER BY proname;

-- Verificar que hay al menos un revisor en el sistema
SELECT
  id,
  email,
  rol,
  nombre_completo
FROM public.usuarios
WHERE rol = 'revisor';

-- Verificar notificaciones recientes (últimas 10)
SELECT
  n.id,
  n.tipo,
  n.titulo,
  n.mensaje,
  n.usuario_id,
  u.email AS usuario_email,
  u.rol AS usuario_rol,
  n.creado_en,
  n.leida
FROM public.notificaciones n
LEFT JOIN public.usuarios u ON u.id = n.usuario_id
ORDER BY n.creado_en DESC
LIMIT 10;
