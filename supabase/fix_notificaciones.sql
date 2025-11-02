-- =====================================================
-- FIX: Notificaciones con usuario_id NULL
-- Corrige triggers que intentan crear notificaciones
-- cuando el cliente no tiene usuario asociado
-- =====================================================

-- =====================================================
-- FUNCIÓN CORREGIDA: Notificar cambio de estado de documento
-- =====================================================
CREATE OR REPLACE FUNCTION public.notificar_cambio_estado_documento()
RETURNS TRIGGER AS $$
DECLARE
  cliente_usuario_id UUID;
  tipo_doc_nombre TEXT;
BEGIN
  -- Solo notificar si el estado cambió
  IF NEW.estado != OLD.estado AND NEW.estado IN ('aprobado', 'rechazado') THEN
    -- Obtener usuario_id del cliente
    SELECT c.usuario_id INTO cliente_usuario_id
    FROM public.requerimientos_cliente rc
    INNER JOIN public.clientes c ON c.id = rc.cliente_id
    WHERE rc.id = NEW.requerimiento_cliente_id;

    -- Solo continuar si el cliente tiene un usuario asociado
    IF cliente_usuario_id IS NOT NULL THEN
      -- Obtener nombre del tipo de documento
      SELECT td.nombre INTO tipo_doc_nombre
      FROM public.requerimientos_cliente rc
      INNER JOIN public.tipos_documento td ON td.id = rc.tipo_documento_id
      WHERE rc.id = NEW.requerimiento_cliente_id;

      -- Crear notificación
      IF NEW.estado = 'aprobado' THEN
        PERFORM public.crear_notificacion(
          cliente_usuario_id,
          'documento_aprobado',
          'Documento aprobado',
          'Tu documento "' || tipo_doc_nombre || '" ha sido aprobado',
          jsonb_build_object('documento_id', NEW.id),
          NEW.id,
          NEW.requerimiento_cliente_id
        );
      ELSIF NEW.estado = 'rechazado' THEN
        PERFORM public.crear_notificacion(
          cliente_usuario_id,
          'documento_rechazado',
          'Documento rechazado',
          'Tu documento "' || tipo_doc_nombre || '" ha sido rechazado. Motivo: ' || COALESCE(NEW.motivo_rechazo, 'No especificado'),
          jsonb_build_object('documento_id', NEW.id, 'motivo', NEW.motivo_rechazo),
          NEW.id,
          NEW.requerimiento_cliente_id
        );
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCIÓN CORREGIDA: Notificar documento nuevo
-- =====================================================
CREATE OR REPLACE FUNCTION public.notificar_documento_nuevo()
RETURNS TRIGGER AS $$
DECLARE
  revisor_id UUID;
  tipo_doc_nombre TEXT;
  cliente_nombre TEXT;
BEGIN
  -- Obtener primer revisor (puedes modificar esta lógica)
  SELECT id INTO revisor_id
  FROM public.usuarios
  WHERE rol = 'revisor'
  LIMIT 1;

  -- Solo notificar si hay un revisor
  IF revisor_id IS NOT NULL THEN
    -- Obtener información del documento
    SELECT td.nombre, c.nombre_empresa INTO tipo_doc_nombre, cliente_nombre
    FROM public.requerimientos_cliente rc
    INNER JOIN public.tipos_documento td ON td.id = rc.tipo_documento_id
    INNER JOIN public.clientes c ON c.id = rc.cliente_id
    WHERE rc.id = NEW.requerimiento_cliente_id;

    PERFORM public.crear_notificacion(
      revisor_id,
      'documento_nuevo',
      'Nuevo documento pendiente',
      'El cliente "' || cliente_nombre || '" ha subido un documento: ' || tipo_doc_nombre,
      jsonb_build_object('documento_id', NEW.id, 'cliente', cliente_nombre),
      NEW.id,
      NEW.requerimiento_cliente_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Mostrar mensaje de éxito
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✓ Triggers de notificaciones corregidos';
  RAISE NOTICE 'Ahora verifican que el usuario_id no sea NULL antes de crear notificaciones';
END $$;
