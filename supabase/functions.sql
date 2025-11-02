-- =====================================================
-- DOCUVI - DATABASE FUNCTIONS & TRIGGERS
-- Funciones útiles y triggers automáticos
-- =====================================================

-- =====================================================
-- FUNCIÓN: Crear usuario cuando se crea en auth.users
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.usuarios (id, correo, nombre, rol)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', 'Usuario'),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'cliente')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para crear usuario automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- FUNCIÓN: Marcar documento como eliminado (soft delete)
-- =====================================================
CREATE OR REPLACE FUNCTION public.marcar_documento_eliminado(
  documento_id UUID,
  usuario_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.documentos
  SET
    eliminado = true,
    eliminado_por = usuario_id,
    eliminado_en = NOW()
  WHERE id = documento_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCIÓN: Restaurar documento eliminado
-- =====================================================
CREATE OR REPLACE FUNCTION public.restaurar_documento(
  documento_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.documentos
  SET
    eliminado = false,
    eliminado_por = NULL,
    eliminado_en = NULL
  WHERE id = documento_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCIÓN: Obtener siguiente versión de documento
-- =====================================================
CREATE OR REPLACE FUNCTION public.obtener_siguiente_version(
  req_cliente_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  ultima_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version), 0) INTO ultima_version
  FROM public.documentos
  WHERE requerimiento_cliente_id = req_cliente_id
    AND eliminado = false;

  RETURN ultima_version + 1;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN: Verificar cumplimiento de cliente
-- Retorna true si el cliente tiene todos los documentos
-- requeridos aprobados y vigentes
-- =====================================================
CREATE OR REPLACE FUNCTION public.verificar_cumplimiento_cliente(
  cliente_id_param UUID
)
RETURNS TABLE (
  cumple BOOLEAN,
  total_requerimientos INTEGER,
  requerimientos_cumplidos INTEGER,
  requerimientos_pendientes INTEGER
) AS $$
DECLARE
  total INTEGER;
  cumplidos INTEGER;
BEGIN
  -- Total de requerimientos obligatorios
  SELECT COUNT(*) INTO total
  FROM public.requerimientos_cliente
  WHERE cliente_id = cliente_id_param
    AND obligatorio = true;

  -- Requerimientos con documento aprobado y vigente
  SELECT COUNT(DISTINCT rc.id) INTO cumplidos
  FROM public.requerimientos_cliente rc
  INNER JOIN public.documentos d ON d.requerimiento_cliente_id = rc.id
  WHERE rc.cliente_id = cliente_id_param
    AND rc.obligatorio = true
    AND d.estado = 'aprobado'
    AND d.eliminado = false
    AND (d.fecha_vencimiento IS NULL OR d.fecha_vencimiento >= CURRENT_DATE);

  RETURN QUERY SELECT
    (cumplidos = total AND total > 0) AS cumple,
    total AS total_requerimientos,
    cumplidos AS requerimientos_cumplidos,
    (total - cumplidos) AS requerimientos_pendientes;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN: Generar código único para certificado
-- =====================================================
CREATE OR REPLACE FUNCTION public.generar_codigo_certificado()
RETURNS TEXT AS $$
DECLARE
  nuevo_codigo TEXT;
  existe BOOLEAN;
BEGIN
  LOOP
    -- Generar código: CERT-YYYY-XXXXXX (6 dígitos aleatorios)
    nuevo_codigo := 'CERT-' ||
                    TO_CHAR(NOW(), 'YYYY') || '-' ||
                    LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

    -- Verificar si ya existe
    SELECT EXISTS(
      SELECT 1 FROM public.certificados WHERE codigo = nuevo_codigo
    ) INTO existe;

    EXIT WHEN NOT existe;
  END LOOP;

  RETURN nuevo_codigo;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN: Crear notificación
-- =====================================================
CREATE OR REPLACE FUNCTION public.crear_notificacion(
  p_usuario_id UUID,
  p_tipo TEXT,
  p_titulo TEXT,
  p_mensaje TEXT,
  p_datos JSONB DEFAULT '{}'::jsonb,
  p_documento_id UUID DEFAULT NULL,
  p_requerimiento_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  nueva_notificacion_id UUID;
BEGIN
  INSERT INTO public.notificaciones (
    usuario_id,
    tipo,
    titulo,
    mensaje,
    datos,
    documento_id,
    requerimiento_id
  ) VALUES (
    p_usuario_id,
    p_tipo,
    p_titulo,
    p_mensaje,
    p_datos,
    p_documento_id,
    p_requerimiento_id
  )
  RETURNING id INTO nueva_notificacion_id;

  RETURN nueva_notificacion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCIÓN: Registrar auditoría
-- =====================================================
CREATE OR REPLACE FUNCTION public.registrar_auditoria(
  p_actor_id UUID,
  p_accion TEXT,
  p_entidad TEXT,
  p_entidad_id UUID,
  p_datos JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  nuevo_registro_id UUID;
BEGIN
  INSERT INTO public.auditoria (
    actor_id,
    accion,
    entidad,
    entidad_id,
    datos
  ) VALUES (
    p_actor_id,
    p_accion,
    p_entidad,
    p_entidad_id,
    p_datos
  )
  RETURNING id INTO nuevo_registro_id;

  RETURN nuevo_registro_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGER: Notificar cuando documento es aprobado/rechazado
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notificar_documento ON public.documentos;
CREATE TRIGGER trigger_notificar_documento
  AFTER UPDATE ON public.documentos
  FOR EACH ROW
  EXECUTE FUNCTION public.notificar_cambio_estado_documento();

-- =====================================================
-- TRIGGER: Notificar al revisor cuando se sube documento
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

  -- Obtener información del documento
  SELECT td.nombre, c.nombre_empresa INTO tipo_doc_nombre, cliente_nombre
  FROM public.requerimientos_cliente rc
  INNER JOIN public.tipos_documento td ON td.id = rc.tipo_documento_id
  INNER JOIN public.clientes c ON c.id = rc.cliente_id
  WHERE rc.id = NEW.requerimiento_cliente_id;

  IF revisor_id IS NOT NULL THEN
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

DROP TRIGGER IF EXISTS trigger_notificar_nuevo_documento ON public.documentos;
CREATE TRIGGER trigger_notificar_nuevo_documento
  AFTER INSERT ON public.documentos
  FOR EACH ROW
  EXECUTE FUNCTION public.notificar_documento_nuevo();

-- =====================================================
-- FUNCIÓN: Actualizar estado de certificados vencidos
-- Ejecutar periódicamente (ej: con cron job o pg_cron)
-- =====================================================
CREATE OR REPLACE FUNCTION public.actualizar_certificados_vencidos()
RETURNS INTEGER AS $$
DECLARE
  actualizados INTEGER;
BEGIN
  UPDATE public.certificados
  SET estado = 'vencido'
  WHERE estado = 'activo'
    AND fecha_validez_hasta < CURRENT_DATE;

  GET DIAGNOSTICS actualizados = ROW_COUNT;
  RETURN actualizados;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN: Obtener documentos próximos a vencer
-- =====================================================
CREATE OR REPLACE FUNCTION public.obtener_documentos_proximos_vencer(
  dias_limite INTEGER DEFAULT 30
)
RETURNS TABLE (
  documento_id UUID,
  cliente_id UUID,
  cliente_nombre TEXT,
  tipo_documento TEXT,
  fecha_vencimiento DATE,
  dias_restantes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id AS documento_id,
    c.id AS cliente_id,
    c.nombre_empresa AS cliente_nombre,
    td.nombre AS tipo_documento,
    d.fecha_vencimiento,
    (d.fecha_vencimiento - CURRENT_DATE) AS dias_restantes
  FROM public.documentos d
  INNER JOIN public.requerimientos_cliente rc ON rc.id = d.requerimiento_cliente_id
  INNER JOIN public.clientes c ON c.id = rc.cliente_id
  INNER JOIN public.tipos_documento td ON td.id = rc.tipo_documento_id
  WHERE d.estado = 'aprobado'
    AND d.eliminado = false
    AND d.fecha_vencimiento IS NOT NULL
    AND d.fecha_vencimiento BETWEEN CURRENT_DATE AND (CURRENT_DATE + dias_limite)
  ORDER BY d.fecha_vencimiento ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VISTA: Resumen de cumplimiento por cliente
-- =====================================================
CREATE OR REPLACE VIEW public.vista_cumplimiento_clientes AS
SELECT
  c.id AS cliente_id,
  c.nombre_empresa,
  COUNT(DISTINCT rc.id) AS total_requerimientos,
  COUNT(DISTINCT CASE
    WHEN d.estado = 'aprobado'
      AND d.eliminado = false
      AND (d.fecha_vencimiento IS NULL OR d.fecha_vencimiento >= CURRENT_DATE)
    THEN rc.id
  END) AS requerimientos_cumplidos,
  COUNT(DISTINCT CASE
    WHEN d.estado = 'pendiente' AND d.eliminado = false
    THEN rc.id
  END) AS requerimientos_pendientes,
  COUNT(DISTINCT CASE
    WHEN d.estado = 'rechazado' AND d.eliminado = false
    THEN rc.id
  END) AS requerimientos_rechazados,
  COUNT(DISTINCT CASE
    WHEN rc.obligatorio = true
    THEN rc.id
  END) AS requerimientos_obligatorios
FROM public.clientes c
LEFT JOIN public.requerimientos_cliente rc ON rc.cliente_id = c.id
LEFT JOIN public.documentos d ON d.requerimiento_cliente_id = rc.id
GROUP BY c.id, c.nombre_empresa;
