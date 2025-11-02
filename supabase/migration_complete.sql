-- =====================================================
-- DOCUVI - MIGRACIÓN COMPLETA DE BASE DE DATOS
-- Este script contiene toda la configuración necesaria
-- para Supabase en un solo archivo
-- =====================================================
-- Versión: 1.0.0
-- Fecha: 2025-01-01
-- Descripción: Script maestro de migración que incluye:
--   - Esquema completo de tablas
--   - Funciones y triggers
--   - Políticas RLS
--   - Configuración de Storage
-- =====================================================

BEGIN;

-- =====================================================
-- PASO 1: EXTENSIONES
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PASO 2: TABLAS
-- =====================================================

-- Tabla: usuarios
CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  correo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('revisor', 'cliente')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla: clientes
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre_empresa TEXT NOT NULL,
  correo_contacto TEXT NOT NULL,
  telefono_contacto TEXT,
  usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  creado_por UUID NOT NULL REFERENCES public.usuarios(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla: tipos_documento
CREATE TABLE IF NOT EXISTS public.tipos_documento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_por UUID NOT NULL REFERENCES public.usuarios(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla: requerimientos_cliente
CREATE TABLE IF NOT EXISTS public.requerimientos_cliente (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo_documento_id UUID NOT NULL REFERENCES public.tipos_documento(id) ON DELETE CASCADE,
  obligatorio BOOLEAN NOT NULL DEFAULT true,
  periodicidad_meses INTEGER,
  metadatos JSONB DEFAULT '{}'::jsonb,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cliente_id, tipo_documento_id)
);

-- Tabla: documentos
CREATE TABLE IF NOT EXISTS public.documentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  requerimiento_cliente_id UUID NOT NULL REFERENCES public.requerimientos_cliente(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  nombre_archivo TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  motivo_rechazo TEXT,
  fecha_carga TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_vencimiento DATE,
  aprobado_por UUID REFERENCES public.usuarios(id),
  fecha_aprobacion TIMESTAMPTZ,
  eliminado BOOLEAN NOT NULL DEFAULT false,
  eliminado_por UUID REFERENCES public.usuarios(id),
  eliminado_en TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla: certificados
CREATE TABLE IF NOT EXISTS public.certificados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo TEXT NOT NULL UNIQUE,
  hash TEXT NOT NULL,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  emitido_por UUID NOT NULL REFERENCES public.usuarios(id),
  fecha_emision TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_validez_desde DATE NOT NULL,
  fecha_validez_hasta DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'revocado', 'vencido')),
  motivo_revocacion TEXT,
  revocado_por UUID REFERENCES public.usuarios(id),
  revocado_en TIMESTAMPTZ,
  datos JSONB NOT NULL DEFAULT '{}'::jsonb,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla: certificados_detalle
CREATE TABLE IF NOT EXISTS public.certificados_detalle (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  certificado_id UUID NOT NULL REFERENCES public.certificados(id) ON DELETE CASCADE,
  requerimiento_id UUID NOT NULL REFERENCES public.requerimientos_cliente(id),
  documento_id UUID NOT NULL REFERENCES public.documentos(id),
  tipo_documento_nombre TEXT NOT NULL,
  fecha_aprobacion TIMESTAMPTZ NOT NULL,
  fecha_vencimiento DATE,
  aprobado_por UUID NOT NULL REFERENCES public.usuarios(id),
  datos JSONB DEFAULT '{}'::jsonb,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla: notificaciones
CREATE TABLE IF NOT EXISTS public.notificaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  titulo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN NOT NULL DEFAULT false,
  datos JSONB DEFAULT '{}'::jsonb,
  documento_id UUID REFERENCES public.documentos(id) ON DELETE SET NULL,
  requerimiento_id UUID REFERENCES public.requerimientos_cliente(id) ON DELETE SET NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  leida_en TIMESTAMPTZ
);

-- Tabla: auditoria
CREATE TABLE IF NOT EXISTS public.auditoria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  accion TEXT NOT NULL,
  entidad TEXT NOT NULL,
  entidad_id UUID,
  datos JSONB DEFAULT '{}'::jsonb,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- PASO 3: ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_documentos_requerimiento ON public.documentos(requerimiento_cliente_id);
CREATE INDEX IF NOT EXISTS idx_documentos_estado ON public.documentos(estado) WHERE eliminado = false;
CREATE INDEX IF NOT EXISTS idx_certificados_codigo ON public.certificados(codigo);
CREATE INDEX IF NOT EXISTS idx_certificados_cliente ON public.certificados(cliente_id);
CREATE INDEX IF NOT EXISTS idx_certificados_detalle_certificado ON public.certificados_detalle(certificado_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON public.notificaciones(usuario_id, leida);
CREATE INDEX IF NOT EXISTS idx_auditoria_actor ON public.auditoria(actor_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON public.auditoria(entidad, entidad_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON public.auditoria(creado_en DESC);

-- =====================================================
-- PASO 4: FUNCIONES BASE
-- =====================================================

-- Función: Actualizar timestamp
CREATE OR REPLACE FUNCTION actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función: Manejar nuevo usuario de auth
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

-- Función: Marcar documento como eliminado
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

-- Función: Restaurar documento
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

-- Función: Obtener siguiente versión
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

-- Función: Verificar cumplimiento de cliente
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
  SELECT COUNT(*) INTO total
  FROM public.requerimientos_cliente
  WHERE cliente_id = cliente_id_param
    AND obligatorio = true;

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

-- Función: Generar código único para certificado
CREATE OR REPLACE FUNCTION public.generar_codigo_certificado()
RETURNS TEXT AS $$
DECLARE
  nuevo_codigo TEXT;
  existe BOOLEAN;
BEGIN
  LOOP
    nuevo_codigo := 'CERT-' ||
                    TO_CHAR(NOW(), 'YYYY') || '-' ||
                    LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

    SELECT EXISTS(
      SELECT 1 FROM public.certificados WHERE codigo = nuevo_codigo
    ) INTO existe;

    EXIT WHEN NOT existe;
  END LOOP;

  RETURN nuevo_codigo;
END;
$$ LANGUAGE plpgsql;

-- Función: Crear notificación
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
    usuario_id, tipo, titulo, mensaje, datos, documento_id, requerimiento_id
  ) VALUES (
    p_usuario_id, p_tipo, p_titulo, p_mensaje, p_datos, p_documento_id, p_requerimiento_id
  )
  RETURNING id INTO nueva_notificacion_id;

  RETURN nueva_notificacion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Registrar auditoría
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
    actor_id, accion, entidad, entidad_id, datos
  ) VALUES (
    p_actor_id, p_accion, p_entidad, p_entidad_id, p_datos
  )
  RETURNING id INTO nuevo_registro_id;

  RETURN nuevo_registro_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función: Actualizar certificados vencidos
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

-- Función: Obtener documentos próximos a vencer
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

-- Función: Obtener rol del usuario
CREATE OR REPLACE FUNCTION obtener_rol_usuario()
RETURNS TEXT AS $$
  SELECT rol FROM public.usuarios WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Función: Verificar si es revisor
CREATE OR REPLACE FUNCTION es_revisor()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND rol = 'revisor'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Función: Obtener cliente_id del usuario
CREATE OR REPLACE FUNCTION obtener_cliente_id_usuario()
RETURNS UUID AS $$
  SELECT id FROM public.clientes WHERE usuario_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================
-- PASO 5: TRIGGERS AUTOMÁTICOS
-- =====================================================

-- Triggers para actualizar timestamp
DROP TRIGGER IF EXISTS trigger_usuarios_actualizado ON public.usuarios;
CREATE TRIGGER trigger_usuarios_actualizado
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_timestamp();

DROP TRIGGER IF EXISTS trigger_clientes_actualizado ON public.clientes;
CREATE TRIGGER trigger_clientes_actualizado
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_timestamp();

DROP TRIGGER IF EXISTS trigger_tipos_documento_actualizado ON public.tipos_documento;
CREATE TRIGGER trigger_tipos_documento_actualizado
  BEFORE UPDATE ON public.tipos_documento
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_timestamp();

DROP TRIGGER IF EXISTS trigger_requerimientos_actualizado ON public.requerimientos_cliente;
CREATE TRIGGER trigger_requerimientos_actualizado
  BEFORE UPDATE ON public.requerimientos_cliente
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_timestamp();

DROP TRIGGER IF EXISTS trigger_documentos_actualizado ON public.documentos;
CREATE TRIGGER trigger_documentos_actualizado
  BEFORE UPDATE ON public.documentos
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_timestamp();

DROP TRIGGER IF EXISTS trigger_certificados_actualizado ON public.certificados;
CREATE TRIGGER trigger_certificados_actualizado
  BEFORE UPDATE ON public.certificados
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_timestamp();

-- Trigger para crear usuario automáticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Función y trigger para notificar cambio de estado de documento
CREATE OR REPLACE FUNCTION public.notificar_cambio_estado_documento()
RETURNS TRIGGER AS $$
DECLARE
  cliente_usuario_id UUID;
  tipo_doc_nombre TEXT;
BEGIN
  IF NEW.estado != OLD.estado AND NEW.estado IN ('aprobado', 'rechazado') THEN
    SELECT c.usuario_id INTO cliente_usuario_id
    FROM public.requerimientos_cliente rc
    INNER JOIN public.clientes c ON c.id = rc.cliente_id
    WHERE rc.id = NEW.requerimiento_cliente_id;

    SELECT td.nombre INTO tipo_doc_nombre
    FROM public.requerimientos_cliente rc
    INNER JOIN public.tipos_documento td ON td.id = rc.tipo_documento_id
    WHERE rc.id = NEW.requerimiento_cliente_id;

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

-- Función y trigger para notificar documento nuevo
CREATE OR REPLACE FUNCTION public.notificar_documento_nuevo()
RETURNS TRIGGER AS $$
DECLARE
  revisor_id UUID;
  tipo_doc_nombre TEXT;
  cliente_nombre TEXT;
BEGIN
  SELECT id INTO revisor_id
  FROM public.usuarios
  WHERE rol = 'revisor'
  LIMIT 1;

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
-- PASO 6: VISTAS
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

-- =====================================================
-- PASO 7: ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tipos_documento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requerimientos_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificados_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

-- Políticas para usuarios
DROP POLICY IF EXISTS "usuarios_select_own" ON public.usuarios;
CREATE POLICY "usuarios_select_own" ON public.usuarios
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "usuarios_select_revisor" ON public.usuarios;
CREATE POLICY "usuarios_select_revisor" ON public.usuarios
  FOR SELECT USING (es_revisor());

DROP POLICY IF EXISTS "usuarios_update_own" ON public.usuarios;
CREATE POLICY "usuarios_update_own" ON public.usuarios
  FOR UPDATE USING (auth.uid() = id);

-- Políticas para clientes
DROP POLICY IF EXISTS "clientes_all_revisor" ON public.clientes;
CREATE POLICY "clientes_all_revisor" ON public.clientes
  FOR ALL USING (es_revisor());

DROP POLICY IF EXISTS "clientes_select_own" ON public.clientes;
CREATE POLICY "clientes_select_own" ON public.clientes
  FOR SELECT USING (usuario_id = auth.uid());

-- Políticas para tipos_documento
DROP POLICY IF EXISTS "tipos_documento_all_revisor" ON public.tipos_documento;
CREATE POLICY "tipos_documento_all_revisor" ON public.tipos_documento
  FOR ALL USING (es_revisor());

DROP POLICY IF EXISTS "tipos_documento_select_cliente" ON public.tipos_documento;
CREATE POLICY "tipos_documento_select_cliente" ON public.tipos_documento
  FOR SELECT USING (activo = true);

-- Políticas para requerimientos
DROP POLICY IF EXISTS "requerimientos_all_revisor" ON public.requerimientos_cliente;
CREATE POLICY "requerimientos_all_revisor" ON public.requerimientos_cliente
  FOR ALL USING (es_revisor());

DROP POLICY IF EXISTS "requerimientos_select_cliente" ON public.requerimientos_cliente;
CREATE POLICY "requerimientos_select_cliente" ON public.requerimientos_cliente
  FOR SELECT USING (cliente_id = obtener_cliente_id_usuario());

-- Políticas para documentos
DROP POLICY IF EXISTS "documentos_select_revisor" ON public.documentos;
CREATE POLICY "documentos_select_revisor" ON public.documentos
  FOR SELECT USING (es_revisor());

DROP POLICY IF EXISTS "documentos_update_revisor" ON public.documentos;
CREATE POLICY "documentos_update_revisor" ON public.documentos
  FOR UPDATE USING (es_revisor());

DROP POLICY IF EXISTS "documentos_delete_revisor" ON public.documentos;
CREATE POLICY "documentos_delete_revisor" ON public.documentos
  FOR DELETE USING (es_revisor());

DROP POLICY IF EXISTS "documentos_select_cliente" ON public.documentos;
CREATE POLICY "documentos_select_cliente" ON public.documentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.requerimientos_cliente rc
      WHERE rc.id = documentos.requerimiento_cliente_id
        AND rc.cliente_id = obtener_cliente_id_usuario()
    )
  );

DROP POLICY IF EXISTS "documentos_insert_cliente" ON public.documentos;
CREATE POLICY "documentos_insert_cliente" ON public.documentos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.requerimientos_cliente rc
      WHERE rc.id = requerimiento_cliente_id
        AND rc.cliente_id = obtener_cliente_id_usuario()
    )
  );

DROP POLICY IF EXISTS "documentos_update_cliente" ON public.documentos;
CREATE POLICY "documentos_update_cliente" ON public.documentos
  FOR UPDATE USING (
    estado = 'pendiente' AND
    EXISTS (
      SELECT 1 FROM public.requerimientos_cliente rc
      WHERE rc.id = requerimiento_cliente_id
        AND rc.cliente_id = obtener_cliente_id_usuario()
    )
  );

-- Políticas para certificados
DROP POLICY IF EXISTS "certificados_all_revisor" ON public.certificados;
CREATE POLICY "certificados_all_revisor" ON public.certificados
  FOR ALL USING (es_revisor());

DROP POLICY IF EXISTS "certificados_select_cliente" ON public.certificados;
CREATE POLICY "certificados_select_cliente" ON public.certificados
  FOR SELECT USING (cliente_id = obtener_cliente_id_usuario());

DROP POLICY IF EXISTS "certificados_select_public" ON public.certificados;
CREATE POLICY "certificados_select_public" ON public.certificados
  FOR SELECT USING (true);

-- Políticas para certificados_detalle
DROP POLICY IF EXISTS "certificados_detalle_select_revisor" ON public.certificados_detalle;
CREATE POLICY "certificados_detalle_select_revisor" ON public.certificados_detalle
  FOR SELECT USING (es_revisor());

DROP POLICY IF EXISTS "certificados_detalle_select_cliente" ON public.certificados_detalle;
CREATE POLICY "certificados_detalle_select_cliente" ON public.certificados_detalle
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.certificados c
      WHERE c.id = certificado_id
        AND c.cliente_id = obtener_cliente_id_usuario()
    )
  );

DROP POLICY IF EXISTS "certificados_detalle_select_public" ON public.certificados_detalle;
CREATE POLICY "certificados_detalle_select_public" ON public.certificados_detalle
  FOR SELECT USING (true);

-- Políticas para notificaciones
DROP POLICY IF EXISTS "notificaciones_select_own" ON public.notificaciones;
CREATE POLICY "notificaciones_select_own" ON public.notificaciones
  FOR SELECT USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "notificaciones_update_own" ON public.notificaciones;
CREATE POLICY "notificaciones_update_own" ON public.notificaciones
  FOR UPDATE USING (usuario_id = auth.uid());

DROP POLICY IF EXISTS "notificaciones_insert_service" ON public.notificaciones;
CREATE POLICY "notificaciones_insert_service" ON public.notificaciones
  FOR INSERT WITH CHECK (true);

-- Políticas para auditoría
DROP POLICY IF EXISTS "auditoria_select_revisor" ON public.auditoria;
CREATE POLICY "auditoria_select_revisor" ON public.auditoria
  FOR SELECT USING (es_revisor());

DROP POLICY IF EXISTS "auditoria_select_cliente" ON public.auditoria;
CREATE POLICY "auditoria_select_cliente" ON public.auditoria
  FOR SELECT USING (actor_id = auth.uid());

DROP POLICY IF EXISTS "auditoria_insert_service" ON public.auditoria;
CREATE POLICY "auditoria_insert_service" ON public.auditoria
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- PASO 8: STORAGE
-- =====================================================

-- Crear bucket 'documentos'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos',
  'documentos',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/jpg'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de storage
DROP POLICY IF EXISTS "documentos_storage_select_revisor" ON storage.objects;
CREATE POLICY "documentos_storage_select_revisor"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documentos' AND
  EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND rol = 'revisor'
  )
);

DROP POLICY IF EXISTS "documentos_storage_select_cliente" ON storage.objects;
CREATE POLICY "documentos_storage_select_cliente"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documentos' AND
  (storage.foldername(name))[1] = (
    SELECT id::text FROM public.clientes WHERE usuario_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "documentos_storage_insert_cliente" ON storage.objects;
CREATE POLICY "documentos_storage_insert_cliente"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documentos' AND
  (storage.foldername(name))[1] = (
    SELECT id::text FROM public.clientes WHERE usuario_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "documentos_storage_insert_revisor" ON storage.objects;
CREATE POLICY "documentos_storage_insert_revisor"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documentos' AND
  EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND rol = 'revisor'
  )
);

DROP POLICY IF EXISTS "documentos_storage_delete_revisor" ON storage.objects;
CREATE POLICY "documentos_storage_delete_revisor"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documentos' AND
  EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND rol = 'revisor'
  )
);

COMMIT;

-- =====================================================
-- MIGRACIÓN COMPLETA
-- =====================================================
-- La base de datos está lista para usar
-- Para verificar, ejecuta:
-- SELECT * FROM public.vista_cumplimiento_clientes;
-- =====================================================
