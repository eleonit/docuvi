-- =====================================================
-- DOCUVI - SCRIPT DE ROLLBACK
-- Elimina toda la configuración de base de datos
-- =====================================================
-- ADVERTENCIA: Este script eliminará TODOS los datos
-- Usar solo en desarrollo o para limpiar una instalación
-- =====================================================

BEGIN;

-- =====================================================
-- PASO 1: Eliminar políticas de Storage
-- =====================================================

DROP POLICY IF EXISTS "documentos_storage_select_revisor" ON storage.objects;
DROP POLICY IF EXISTS "documentos_storage_select_cliente" ON storage.objects;
DROP POLICY IF EXISTS "documentos_storage_insert_cliente" ON storage.objects;
DROP POLICY IF EXISTS "documentos_storage_insert_revisor" ON storage.objects;
DROP POLICY IF EXISTS "documentos_storage_delete_revisor" ON storage.objects;

-- =====================================================
-- PASO 2: Eliminar bucket
-- =====================================================

DELETE FROM storage.buckets WHERE id = 'documentos';

-- =====================================================
-- PASO 3: Eliminar políticas RLS
-- =====================================================

-- Usuarios
DROP POLICY IF EXISTS "usuarios_select_own" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_select_revisor" ON public.usuarios;
DROP POLICY IF EXISTS "usuarios_update_own" ON public.usuarios;

-- Clientes
DROP POLICY IF EXISTS "clientes_all_revisor" ON public.clientes;
DROP POLICY IF EXISTS "clientes_select_own" ON public.clientes;

-- Tipos de documento
DROP POLICY IF EXISTS "tipos_documento_all_revisor" ON public.tipos_documento;
DROP POLICY IF EXISTS "tipos_documento_select_cliente" ON public.tipos_documento;

-- Requerimientos
DROP POLICY IF EXISTS "requerimientos_all_revisor" ON public.requerimientos_cliente;
DROP POLICY IF EXISTS "requerimientos_select_cliente" ON public.requerimientos_cliente;

-- Documentos
DROP POLICY IF EXISTS "documentos_select_revisor" ON public.documentos;
DROP POLICY IF EXISTS "documentos_update_revisor" ON public.documentos;
DROP POLICY IF EXISTS "documentos_delete_revisor" ON public.documentos;
DROP POLICY IF EXISTS "documentos_select_cliente" ON public.documentos;
DROP POLICY IF EXISTS "documentos_insert_cliente" ON public.documentos;
DROP POLICY IF EXISTS "documentos_update_cliente" ON public.documentos;

-- Certificados
DROP POLICY IF EXISTS "certificados_all_revisor" ON public.certificados;
DROP POLICY IF EXISTS "certificados_select_cliente" ON public.certificados;
DROP POLICY IF EXISTS "certificados_select_public" ON public.certificados;

-- Certificados detalle
DROP POLICY IF EXISTS "certificados_detalle_select_revisor" ON public.certificados_detalle;
DROP POLICY IF EXISTS "certificados_detalle_select_cliente" ON public.certificados_detalle;
DROP POLICY IF EXISTS "certificados_detalle_select_public" ON public.certificados_detalle;

-- Notificaciones
DROP POLICY IF EXISTS "notificaciones_select_own" ON public.notificaciones;
DROP POLICY IF EXISTS "notificaciones_update_own" ON public.notificaciones;
DROP POLICY IF EXISTS "notificaciones_insert_service" ON public.notificaciones;

-- Auditoría
DROP POLICY IF EXISTS "auditoria_select_revisor" ON public.auditoria;
DROP POLICY IF EXISTS "auditoria_select_cliente" ON public.auditoria;
DROP POLICY IF EXISTS "auditoria_insert_service" ON public.auditoria;

-- =====================================================
-- PASO 4: Deshabilitar RLS
-- =====================================================

ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_documento DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.requerimientos_cliente DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificados DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificados_detalle DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- PASO 5: Eliminar vistas
-- =====================================================

DROP VIEW IF EXISTS public.vista_cumplimiento_clientes;

-- =====================================================
-- PASO 6: Eliminar triggers
-- =====================================================

DROP TRIGGER IF EXISTS trigger_usuarios_actualizado ON public.usuarios;
DROP TRIGGER IF EXISTS trigger_clientes_actualizado ON public.clientes;
DROP TRIGGER IF EXISTS trigger_tipos_documento_actualizado ON public.tipos_documento;
DROP TRIGGER IF EXISTS trigger_requerimientos_actualizado ON public.requerimientos_cliente;
DROP TRIGGER IF EXISTS trigger_documentos_actualizado ON public.documentos;
DROP TRIGGER IF EXISTS trigger_certificados_actualizado ON public.certificados;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trigger_notificar_documento ON public.documentos;
DROP TRIGGER IF EXISTS trigger_notificar_nuevo_documento ON public.documentos;

-- =====================================================
-- PASO 7: Eliminar funciones
-- =====================================================

DROP FUNCTION IF EXISTS public.actualizar_timestamp() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.marcar_documento_eliminado(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.restaurar_documento(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.obtener_siguiente_version(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.verificar_cumplimiento_cliente(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.generar_codigo_certificado() CASCADE;
DROP FUNCTION IF EXISTS public.crear_notificacion(UUID, TEXT, TEXT, TEXT, JSONB, UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.registrar_auditoria(UUID, TEXT, TEXT, UUID, JSONB) CASCADE;
DROP FUNCTION IF EXISTS public.actualizar_certificados_vencidos() CASCADE;
DROP FUNCTION IF EXISTS public.obtener_documentos_proximos_vencer(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.notificar_cambio_estado_documento() CASCADE;
DROP FUNCTION IF EXISTS public.notificar_documento_nuevo() CASCADE;
DROP FUNCTION IF EXISTS obtener_rol_usuario() CASCADE;
DROP FUNCTION IF EXISTS es_revisor() CASCADE;
DROP FUNCTION IF EXISTS obtener_cliente_id_usuario() CASCADE;

-- =====================================================
-- PASO 8: Eliminar tablas
-- =====================================================

DROP TABLE IF EXISTS public.auditoria CASCADE;
DROP TABLE IF EXISTS public.notificaciones CASCADE;
DROP TABLE IF EXISTS public.certificados_detalle CASCADE;
DROP TABLE IF EXISTS public.certificados CASCADE;
DROP TABLE IF EXISTS public.documentos CASCADE;
DROP TABLE IF EXISTS public.requerimientos_cliente CASCADE;
DROP TABLE IF EXISTS public.tipos_documento CASCADE;
DROP TABLE IF EXISTS public.clientes CASCADE;
DROP TABLE IF EXISTS public.usuarios CASCADE;

COMMIT;

-- =====================================================
-- ROLLBACK COMPLETO
-- =====================================================
-- Todas las tablas, funciones y políticas han sido eliminadas
-- La base de datos está limpia y lista para una nueva migración
-- =====================================================
