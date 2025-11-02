-- =====================================================
-- DOCUVI - REINSTALACIÓN LIMPIA DE CERTIFICADOS
-- Versión para Supabase SQL Editor (Dashboard Web)
-- =====================================================
--
-- ADVERTENCIA: Este script eliminará TODOS los certificados
-- existentes y reinstalará el sistema desde cero.
--
-- Solo ejecuta esto si estás seguro.
--
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  DOCUVI - REINSTALACIÓN DE CERTIFICADOS          ║';
  RAISE NOTICE '╚════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- FASE 1: LIMPIEZA DE INSTALACIÓN ANTERIOR
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━ FASE 1: LIMPIEZA DE INSTALACIÓN ANTERIOR ━━━';
  RAISE NOTICE '';
END $$;

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

-- Eliminar tablas (Esto eliminará TODOS los datos)
DROP TABLE IF EXISTS public.certificados_detalle CASCADE;
DROP TABLE IF EXISTS public.certificados CASCADE;

-- Eliminar funciones
DROP FUNCTION IF EXISTS public.notificar_certificado_revocado() CASCADE;
DROP FUNCTION IF EXISTS public.notificar_certificado_generado() CASCADE;
DROP FUNCTION IF EXISTS public.obtener_certificados_proximos_vencer(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.actualizar_certificados_vencidos() CASCADE;
DROP FUNCTION IF EXISTS public.verificar_cumplimiento_cliente(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.generar_codigo_certificado() CASCADE;

DO $$
BEGIN
  RAISE NOTICE '✓ Limpieza completada';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- FASE 2: INSTALACIÓN LIMPIA
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━ FASE 2: INSTALACIÓN LIMPIA ━━━';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- CREAR TABLAS
-- =====================================================

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

-- =====================================================
-- CREAR ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_certificados_codigo ON public.certificados(codigo);
CREATE INDEX IF NOT EXISTS idx_certificados_cliente ON public.certificados(cliente_id);
CREATE INDEX IF NOT EXISTS idx_certificados_estado ON public.certificados(estado) WHERE estado = 'activo';
CREATE INDEX IF NOT EXISTS idx_certificados_fecha_validez ON public.certificados(fecha_validez_hasta) WHERE estado = 'activo';
CREATE INDEX IF NOT EXISTS idx_certificados_detalle_certificado ON public.certificados_detalle(certificado_id);
CREATE INDEX IF NOT EXISTS idx_certificados_detalle_documento ON public.certificados_detalle(documento_id);

-- =====================================================
-- CREAR FUNCIONES
-- =====================================================

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
  WHERE cliente_id = cliente_id_param AND obligatorio = true;

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

CREATE OR REPLACE FUNCTION public.actualizar_certificados_vencidos()
RETURNS INTEGER AS $$
DECLARE
  actualizados INTEGER;
BEGIN
  UPDATE public.certificados
  SET estado = 'vencido'
  WHERE estado = 'activo' AND fecha_validez_hasta < CURRENT_DATE;
  GET DIAGNOSTICS actualizados = ROW_COUNT;
  RETURN actualizados;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.obtener_certificados_proximos_vencer(
  dias_limite INTEGER DEFAULT 30
)
RETURNS TABLE (
  certificado_id UUID,
  codigo TEXT,
  cliente_id UUID,
  cliente_nombre TEXT,
  fecha_validez_hasta DATE,
  dias_restantes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS certificado_id,
    c.codigo,
    cl.id AS cliente_id,
    cl.nombre_empresa AS cliente_nombre,
    c.fecha_validez_hasta,
    (c.fecha_validez_hasta - CURRENT_DATE) AS dias_restantes
  FROM public.certificados c
  INNER JOIN public.clientes cl ON cl.id = c.cliente_id
  WHERE c.estado = 'activo'
    AND c.fecha_validez_hasta BETWEEN CURRENT_DATE AND (CURRENT_DATE + dias_limite)
  ORDER BY c.fecha_validez_hasta ASC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CREAR TRIGGERS Y FUNCIONES DE NOTIFICACIÓN
-- =====================================================

CREATE OR REPLACE FUNCTION public.notificar_certificado_generado()
RETURNS TRIGGER AS $$
DECLARE
  cliente_usuario_id UUID;
  cliente_nombre TEXT;
BEGIN
  SELECT c.usuario_id, c.nombre_empresa INTO cliente_usuario_id, cliente_nombre
  FROM public.clientes c WHERE c.id = NEW.cliente_id;

  IF cliente_usuario_id IS NOT NULL THEN
    PERFORM public.crear_notificacion(
      cliente_usuario_id,
      'certificado_generado',
      'Certificado generado',
      'Se ha generado un certificado de cumplimiento para ' || cliente_nombre || '. Código: ' || NEW.codigo,
      jsonb_build_object(
        'certificado_id', NEW.id,
        'codigo', NEW.codigo,
        'fecha_validez_hasta', NEW.fecha_validez_hasta
      )
    );
  END IF;

  PERFORM public.registrar_auditoria(
    NEW.emitido_por,
    'certificado_generado',
    'certificados',
    NEW.id,
    jsonb_build_object(
      'codigo', NEW.codigo,
      'cliente_id', NEW.cliente_id,
      'fecha_validez_desde', NEW.fecha_validez_desde,
      'fecha_validez_hasta', NEW.fecha_validez_hasta
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.notificar_certificado_revocado()
RETURNS TRIGGER AS $$
DECLARE
  cliente_usuario_id UUID;
  cliente_nombre TEXT;
BEGIN
  IF NEW.estado = 'revocado' AND OLD.estado != 'revocado' THEN
    SELECT c.usuario_id, c.nombre_empresa INTO cliente_usuario_id, cliente_nombre
    FROM public.clientes c WHERE c.id = NEW.cliente_id;

    IF cliente_usuario_id IS NOT NULL THEN
      PERFORM public.crear_notificacion(
        cliente_usuario_id,
        'certificado_revocado',
        'Certificado revocado',
        'El certificado ' || NEW.codigo || ' ha sido revocado. Motivo: ' || COALESCE(NEW.motivo_revocacion, 'No especificado'),
        jsonb_build_object(
          'certificado_id', NEW.id,
          'codigo', NEW.codigo,
          'motivo', NEW.motivo_revocacion
        )
      );
    END IF;

    PERFORM public.registrar_auditoria(
      NEW.revocado_por,
      'certificado_revocado',
      'certificados',
      NEW.id,
      jsonb_build_object(
        'codigo', NEW.codigo,
        'motivo_revocacion', NEW.motivo_revocacion
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_certificados_actualizado ON public.certificados;
CREATE TRIGGER trigger_certificados_actualizado
  BEFORE UPDATE ON public.certificados
  FOR EACH ROW EXECUTE FUNCTION actualizar_timestamp();

DROP TRIGGER IF EXISTS trigger_notificar_certificado_generado ON public.certificados;
CREATE TRIGGER trigger_notificar_certificado_generado
  AFTER INSERT ON public.certificados
  FOR EACH ROW EXECUTE FUNCTION public.notificar_certificado_generado();

DROP TRIGGER IF EXISTS trigger_notificar_certificado_revocado ON public.certificados;
CREATE TRIGGER trigger_notificar_certificado_revocado
  AFTER UPDATE ON public.certificados
  FOR EACH ROW EXECUTE FUNCTION public.notificar_certificado_revocado();

-- =====================================================
-- HABILITAR RLS Y CREAR POLÍTICAS
-- =====================================================

ALTER TABLE public.certificados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificados_detalle ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "certificados_all_revisor" ON public.certificados;
CREATE POLICY "certificados_all_revisor" ON public.certificados
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'revisor')
  );

DROP POLICY IF EXISTS "certificados_select_cliente" ON public.certificados;
CREATE POLICY "certificados_select_cliente" ON public.certificados
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.clientes WHERE id = cliente_id AND usuario_id = auth.uid())
  );

DROP POLICY IF EXISTS "certificados_select_public" ON public.certificados;
CREATE POLICY "certificados_select_public" ON public.certificados
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "certificados_detalle_all_revisor" ON public.certificados_detalle;
CREATE POLICY "certificados_detalle_all_revisor" ON public.certificados_detalle
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol = 'revisor')
  );

DROP POLICY IF EXISTS "certificados_detalle_select_cliente" ON public.certificados_detalle;
CREATE POLICY "certificados_detalle_select_cliente" ON public.certificados_detalle
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.certificados c
      INNER JOIN public.clientes cl ON cl.id = c.cliente_id
      WHERE c.id = certificado_id AND cl.usuario_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "certificados_detalle_select_public" ON public.certificados_detalle;
CREATE POLICY "certificados_detalle_select_public" ON public.certificados_detalle
  FOR SELECT USING (true);

-- =====================================================
-- CREAR VISTAS
-- =====================================================

DROP VIEW IF EXISTS public.vista_certificados_clientes CASCADE;
CREATE OR REPLACE VIEW public.vista_certificados_clientes AS
SELECT
  c.id AS cliente_id,
  c.nombre_empresa,
  COUNT(cert.id) AS total_certificados,
  COUNT(CASE WHEN cert.estado = 'activo' THEN 1 END) AS certificados_activos,
  COUNT(CASE WHEN cert.estado = 'vencido' THEN 1 END) AS certificados_vencidos,
  COUNT(CASE WHEN cert.estado = 'revocado' THEN 1 END) AS certificados_revocados,
  MAX(cert.fecha_emision) AS ultimo_certificado_emitido,
  MIN(CASE WHEN cert.estado = 'activo' THEN cert.fecha_validez_hasta END) AS proxima_fecha_vencimiento
FROM public.clientes c
LEFT JOIN public.certificados cert ON cert.cliente_id = c.id
GROUP BY c.id, c.nombre_empresa;

DROP VIEW IF EXISTS public.vista_certificados_completos CASCADE;
CREATE OR REPLACE VIEW public.vista_certificados_completos AS
SELECT
  cert.id,
  cert.codigo,
  cert.hash,
  cert.estado,
  cert.fecha_emision,
  cert.fecha_validez_desde,
  cert.fecha_validez_hasta,
  cert.motivo_revocacion,
  c.id AS cliente_id,
  c.nombre_empresa AS cliente_nombre,
  c.correo_contacto AS cliente_correo,
  c.telefono_contacto AS cliente_telefono,
  u.id AS emisor_id,
  u.nombre AS emisor_nombre,
  u.correo AS emisor_correo,
  (SELECT COUNT(*) FROM public.certificados_detalle WHERE certificado_id = cert.id) AS total_documentos,
  CASE
    WHEN cert.estado = 'revocado' THEN false
    WHEN cert.estado = 'vencido' THEN false
    WHEN cert.fecha_validez_hasta < CURRENT_DATE THEN false
    WHEN cert.fecha_validez_desde > CURRENT_DATE THEN false
    ELSE true
  END AS es_valido,
  CASE
    WHEN cert.fecha_validez_hasta >= CURRENT_DATE
    THEN cert.fecha_validez_hasta - CURRENT_DATE
    ELSE 0
  END AS dias_hasta_vencimiento
FROM public.certificados cert
INNER JOIN public.clientes c ON c.id = cert.cliente_id
INNER JOIN public.usuarios u ON u.id = cert.emitido_por;

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================

DO $$
DECLARE
  tablas_count INTEGER;
  funciones_count INTEGER;
  triggers_count INTEGER;
  vistas_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO tablas_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('certificados', 'certificados_detalle');

  SELECT COUNT(*) INTO funciones_count
  FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name IN (
      'generar_codigo_certificado',
      'verificar_cumplimiento_cliente',
      'actualizar_certificados_vencidos',
      'obtener_certificados_proximos_vencer',
      'notificar_certificado_generado',
      'notificar_certificado_revocado'
    );

  SELECT COUNT(*) INTO triggers_count
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
    AND event_object_table = 'certificados';

  SELECT COUNT(*) INTO vistas_count
  FROM information_schema.views
  WHERE table_schema = 'public'
    AND table_name IN ('vista_certificados_clientes', 'vista_certificados_completos');

  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'VERIFICACIÓN DE INSTALACIÓN';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE 'Tablas instaladas: % de 2', tablas_count;
  RAISE NOTICE 'Funciones instaladas: % de 6', funciones_count;
  RAISE NOTICE 'Triggers instalados: % (3 esperados)', triggers_count;
  RAISE NOTICE 'Vistas instaladas: % de 2', vistas_count;

  IF tablas_count = 2 AND funciones_count = 6 AND vistas_count = 2 THEN
    RAISE NOTICE '';
    RAISE NOTICE '✓ REINSTALACIÓN COMPLETADA EXITOSAMENTE';
  ELSE
    RAISE WARNING '';
    RAISE WARNING '⚠ La instalación puede estar incompleta';
  END IF;

  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- FIN DE LA REINSTALACIÓN
-- =====================================================
