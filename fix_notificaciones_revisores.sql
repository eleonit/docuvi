-- =====================================================
-- FIX: Notificaciones para Revisores
-- Mejora la función para notificar a TODOS los revisores
-- cuando se sube un nuevo documento
-- =====================================================

-- =====================================================
-- FUNCIÓN MEJORADA: Notificar documento nuevo a TODOS los revisores
-- =====================================================
CREATE OR REPLACE FUNCTION public.notificar_documento_nuevo()
RETURNS TRIGGER AS $$
DECLARE
  revisor_record RECORD;
  tipo_doc_nombre TEXT;
  cliente_nombre TEXT;
BEGIN
  -- Obtener información del documento
  SELECT td.nombre, c.nombre_empresa INTO tipo_doc_nombre, cliente_nombre
  FROM public.requerimientos_cliente rc
  INNER JOIN public.tipos_documento td ON td.id = rc.tipo_documento_id
  INNER JOIN public.clientes c ON c.id = rc.cliente_id
  WHERE rc.id = NEW.requerimiento_cliente_id;

  -- Notificar a TODOS los revisores activos
  FOR revisor_record IN
    SELECT id FROM public.usuarios WHERE rol = 'revisor'
  LOOP
    PERFORM public.crear_notificacion(
      revisor_record.id,
      'documento_nuevo',
      'Nuevo documento pendiente',
      'El cliente "' || cliente_nombre || '" ha subido un documento: ' || tipo_doc_nombre,
      jsonb_build_object(
        'documento_id', NEW.id,
        'cliente', cliente_nombre,
        'tipo_documento', tipo_doc_nombre
      ),
      NEW.id,
      NEW.requerimiento_cliente_id
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCIÓN MEJORADA: Notificar cambio de estado de documento
-- Incluye mejor manejo de errores y logs
-- =====================================================
CREATE OR REPLACE FUNCTION public.notificar_cambio_estado_documento()
RETURNS TRIGGER AS $$
DECLARE
  cliente_usuario_id UUID;
  tipo_doc_nombre TEXT;
  cliente_nombre TEXT;
BEGIN
  -- Solo notificar si el estado cambió
  IF NEW.estado != OLD.estado AND NEW.estado IN ('aprobado', 'rechazado') THEN
    -- Obtener usuario_id del cliente e información del documento
    SELECT c.usuario_id, c.nombre_empresa, td.nombre
    INTO cliente_usuario_id, cliente_nombre, tipo_doc_nombre
    FROM public.requerimientos_cliente rc
    INNER JOIN public.clientes c ON c.id = rc.cliente_id
    INNER JOIN public.tipos_documento td ON td.id = rc.tipo_documento_id
    WHERE rc.id = NEW.requerimiento_cliente_id;

    -- Solo continuar si el cliente tiene un usuario asociado
    IF cliente_usuario_id IS NOT NULL THEN
      -- Crear notificación según el estado
      IF NEW.estado = 'aprobado' THEN
        PERFORM public.crear_notificacion(
          cliente_usuario_id,
          'documento_aprobado',
          'Documento aprobado',
          'Tu documento "' || tipo_doc_nombre || '" ha sido aprobado',
          jsonb_build_object(
            'documento_id', NEW.id,
            'tipo_documento', tipo_doc_nombre,
            'fecha_aprobacion', NEW.fecha_aprobacion,
            'fecha_vencimiento', NEW.fecha_vencimiento
          ),
          NEW.id,
          NEW.requerimiento_cliente_id
        );
      ELSIF NEW.estado = 'rechazado' THEN
        PERFORM public.crear_notificacion(
          cliente_usuario_id,
          'documento_rechazado',
          'Documento rechazado',
          'Tu documento "' || tipo_doc_nombre || '" ha sido rechazado. Motivo: ' || COALESCE(NEW.motivo_rechazo, 'No especificado'),
          jsonb_build_object(
            'documento_id', NEW.id,
            'tipo_documento', tipo_doc_nombre,
            'motivo', NEW.motivo_rechazo
          ),
          NEW.id,
          NEW.requerimiento_cliente_id
        );
      END IF;
    ELSE
      -- Log para debugging (opcional)
      RAISE NOTICE 'Cliente sin usuario asociado - No se envió notificación para documento %', NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RECREAR TRIGGERS
-- =====================================================

-- Trigger para notificar cuando se sube un nuevo documento
DROP TRIGGER IF EXISTS trigger_notificar_nuevo_documento ON public.documentos;
CREATE TRIGGER trigger_notificar_nuevo_documento
  AFTER INSERT ON public.documentos
  FOR EACH ROW
  EXECUTE FUNCTION public.notificar_documento_nuevo();

-- Trigger para notificar cambio de estado (aprobado/rechazado)
DROP TRIGGER IF EXISTS trigger_notificar_documento ON public.documentos;
CREATE TRIGGER trigger_notificar_documento
  AFTER UPDATE ON public.documentos
  FOR EACH ROW
  EXECUTE FUNCTION public.notificar_cambio_estado_documento();

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Verificar que los triggers se crearon correctamente
DO $$
DECLARE
  trigger_count INTEGER;
  function_count INTEGER;
  revisor_count INTEGER;
BEGIN
  -- Contar triggers
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname IN ('trigger_notificar_nuevo_documento', 'trigger_notificar_documento');

  -- Contar funciones
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN ('notificar_documento_nuevo', 'notificar_cambio_estado_documento');

  -- Contar revisores
  SELECT COUNT(*) INTO revisor_count
  FROM public.usuarios
  WHERE rol = 'revisor';

  -- Mostrar resultados
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  VERIFICACIÓN DE NOTIFICACIONES PARA REVISORES    ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '✓ Triggers creados: % de 2', trigger_count;
  RAISE NOTICE '✓ Funciones creadas: % de 2', function_count;
  RAISE NOTICE '✓ Revisores en sistema: %', revisor_count;
  RAISE NOTICE '';

  IF trigger_count = 2 AND function_count = 2 THEN
    RAISE NOTICE '✅ ÉXITO: Sistema de notificaciones configurado correctamente';
  ELSE
    RAISE NOTICE '⚠️  ADVERTENCIA: Algunos componentes no se crearon correctamente';
  END IF;

  IF revisor_count = 0 THEN
    RAISE NOTICE '⚠️  ADVERTENCIA: No hay revisores en el sistema';
    RAISE NOTICE '   Las notificaciones no se enviarán hasta que agregues un revisor';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Ahora cuando un cliente suba un documento:';
  RAISE NOTICE '  1. Se creará una notificación para TODOS los revisores';
  RAISE NOTICE '  2. Los revisores verán la campana con badge de notificación';
  RAISE NOTICE '  3. Al aprobar/rechazar, se notificará al cliente';
  RAISE NOTICE '';
END $$;
