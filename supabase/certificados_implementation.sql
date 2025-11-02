-- =====================================================
-- DOCUVI - IMPLEMENTACIÓN DE CERTIFICADOS EN PDF
-- Sistema de Certificados de Cumplimiento
-- Versión: 1.0
-- Fecha: 2025-01-01
-- =====================================================
--
-- Este script contiene toda la implementación necesaria para el
-- sistema de certificados de cumplimiento con generación de PDF:
--
-- 1. Tablas: certificados, certificados_detalle
-- 2. Índices para optimización
-- 3. Funciones auxiliares
-- 4. Triggers automáticos
-- 5. Políticas de seguridad (RLS)
-- 6. Vistas de consulta
--
-- PREREQUISITOS:
-- - El esquema base de Docuvi debe estar instalado (usuarios, clientes, documentos, etc.)
-- - La extensión uuid-ossp debe estar habilitada
--
-- =====================================================

-- =====================================================
-- PASO 1: CREAR TABLAS
-- =====================================================

-- Tabla de certificados
CREATE TABLE IF NOT EXISTS public.certificados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Identificación del certificado
  codigo TEXT NOT NULL UNIQUE,
  hash TEXT NOT NULL,

  -- Referencias
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  emitido_por UUID NOT NULL REFERENCES public.usuarios(id),

  -- Fechas
  fecha_emision TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fecha_validez_desde DATE NOT NULL,
  fecha_validez_hasta DATE NOT NULL,

  -- Estado del certificado
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'revocado', 'vencido')),

  -- Información de revocación
  motivo_revocacion TEXT,
  revocado_por UUID REFERENCES public.usuarios(id),
  revocado_en TIMESTAMPTZ,

  -- Datos adicionales en formato JSON
  datos JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Timestamps
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.certificados IS 'Certificados de cumplimiento generados para clientes';
COMMENT ON COLUMN public.certificados.codigo IS 'Código único del certificado (ej: CERT-2025-123456)';
COMMENT ON COLUMN public.certificados.hash IS 'Hash SHA-256 para verificación de autenticidad';
COMMENT ON COLUMN public.certificados.estado IS 'Estado: activo, revocado, vencido';
COMMENT ON COLUMN public.certificados.datos IS 'Información adicional: requerimientos_cumplidos, total_requerimientos, etc.';

-- Tabla de detalles del certificado
CREATE TABLE IF NOT EXISTS public.certificados_detalle (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relación con certificado
  certificado_id UUID NOT NULL REFERENCES public.certificados(id) ON DELETE CASCADE,

  -- Referencias a documentos incluidos
  requerimiento_id UUID NOT NULL REFERENCES public.requerimientos_cliente(id),
  documento_id UUID NOT NULL REFERENCES public.documentos(id),

  -- Información del documento al momento de certificación
  tipo_documento_nombre TEXT NOT NULL,
  fecha_aprobacion TIMESTAMPTZ NOT NULL,
  fecha_vencimiento DATE,
  aprobado_por UUID NOT NULL REFERENCES public.usuarios(id),

  -- Datos adicionales
  datos JSONB DEFAULT '{}'::jsonb,

  -- Timestamp
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.certificados_detalle IS 'Detalle de documentos incluidos en cada certificado';
COMMENT ON COLUMN public.certificados_detalle.tipo_documento_nombre IS 'Nombre del tipo de documento (snapshot al momento de certificación)';

-- =====================================================
-- PASO 2: CREAR ÍNDICES
-- =====================================================

-- Índices para certificados
CREATE INDEX IF NOT EXISTS idx_certificados_codigo
  ON public.certificados(codigo);

CREATE INDEX IF NOT EXISTS idx_certificados_cliente
  ON public.certificados(cliente_id);

CREATE INDEX IF NOT EXISTS idx_certificados_estado
  ON public.certificados(estado) WHERE estado = 'activo';

CREATE INDEX IF NOT EXISTS idx_certificados_fecha_validez
  ON public.certificados(fecha_validez_hasta) WHERE estado = 'activo';

-- Índices para certificados_detalle
CREATE INDEX IF NOT EXISTS idx_certificados_detalle_certificado
  ON public.certificados_detalle(certificado_id);

CREATE INDEX IF NOT EXISTS idx_certificados_detalle_documento
  ON public.certificados_detalle(documento_id);

-- =====================================================
-- PASO 3: FUNCIONES AUXILIARES
-- =====================================================

-- Función: Generar código único para certificado
-- Formato: CERT-YYYY-XXXXXX (6 dígitos aleatorios)
CREATE OR REPLACE FUNCTION public.generar_codigo_certificado()
RETURNS TEXT AS $$
DECLARE
  nuevo_codigo TEXT;
  existe BOOLEAN;
BEGIN
  LOOP
    -- Generar código: CERT-YYYY-XXXXXX
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

COMMENT ON FUNCTION public.generar_codigo_certificado IS 'Genera un código único para certificado en formato CERT-YYYY-XXXXXX';

-- Función: Verificar cumplimiento de cliente
-- Retorna si el cliente cumple con todos los requerimientos obligatorios
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

COMMENT ON FUNCTION public.verificar_cumplimiento_cliente IS 'Verifica si un cliente cumple con todos los requerimientos obligatorios';

-- Función: Actualizar certificados vencidos
-- Marca como vencidos los certificados cuya fecha_validez_hasta haya pasado
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

COMMENT ON FUNCTION public.actualizar_certificados_vencidos IS 'Actualiza el estado de certificados vencidos. Ejecutar periódicamente con cron';

-- Función: Obtener certificados próximos a vencer
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

COMMENT ON FUNCTION public.obtener_certificados_proximos_vencer IS 'Obtiene certificados que vencen en los próximos N días';

-- =====================================================
-- PASO 4: TRIGGERS
-- =====================================================

-- Trigger: Actualizar timestamp automáticamente
DROP TRIGGER IF EXISTS trigger_certificados_actualizado ON public.certificados;
CREATE TRIGGER trigger_certificados_actualizado
  BEFORE UPDATE ON public.certificados
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_timestamp();

-- Trigger: Notificar cuando se genera un certificado
CREATE OR REPLACE FUNCTION public.notificar_certificado_generado()
RETURNS TRIGGER AS $$
DECLARE
  cliente_usuario_id UUID;
  cliente_nombre TEXT;
BEGIN
  -- Obtener usuario_id y nombre del cliente
  SELECT c.usuario_id, c.nombre_empresa INTO cliente_usuario_id, cliente_nombre
  FROM public.clientes c
  WHERE c.id = NEW.cliente_id;

  -- Notificar al cliente si tiene usuario asociado
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

  -- Registrar en auditoría
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

DROP TRIGGER IF EXISTS trigger_notificar_certificado_generado ON public.certificados;
CREATE TRIGGER trigger_notificar_certificado_generado
  AFTER INSERT ON public.certificados
  FOR EACH ROW
  EXECUTE FUNCTION public.notificar_certificado_generado();

-- Trigger: Notificar cuando se revoca un certificado
CREATE OR REPLACE FUNCTION public.notificar_certificado_revocado()
RETURNS TRIGGER AS $$
DECLARE
  cliente_usuario_id UUID;
  cliente_nombre TEXT;
BEGIN
  IF NEW.estado = 'revocado' AND OLD.estado != 'revocado' THEN
    -- Obtener usuario_id y nombre del cliente
    SELECT c.usuario_id, c.nombre_empresa INTO cliente_usuario_id, cliente_nombre
    FROM public.clientes c
    WHERE c.id = NEW.cliente_id;

    -- Notificar al cliente
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

    -- Registrar en auditoría
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

DROP TRIGGER IF EXISTS trigger_notificar_certificado_revocado ON public.certificados;
CREATE TRIGGER trigger_notificar_certificado_revocado
  AFTER UPDATE ON public.certificados
  FOR EACH ROW
  EXECUTE FUNCTION public.notificar_certificado_revocado();

-- =====================================================
-- PASO 5: POLÍTICAS DE SEGURIDAD (RLS)
-- =====================================================

-- Habilitar RLS en las tablas
ALTER TABLE public.certificados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificados_detalle ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS: certificados

-- Los revisores pueden gestionar todos los certificados
DROP POLICY IF EXISTS "certificados_all_revisor" ON public.certificados;
CREATE POLICY "certificados_all_revisor" ON public.certificados
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid() AND rol = 'revisor'
    )
  );

-- Los clientes pueden ver sus propios certificados
DROP POLICY IF EXISTS "certificados_select_cliente" ON public.certificados;
CREATE POLICY "certificados_select_cliente" ON public.certificados
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.clientes
      WHERE id = cliente_id AND usuario_id = auth.uid()
    )
  );

-- Acceso público para verificación de certificados (página pública /verificar)
DROP POLICY IF EXISTS "certificados_select_public" ON public.certificados;
CREATE POLICY "certificados_select_public" ON public.certificados
  FOR SELECT USING (true);

-- POLÍTICAS: certificados_detalle

-- Los revisores pueden gestionar todos los detalles
DROP POLICY IF EXISTS "certificados_detalle_all_revisor" ON public.certificados_detalle;
CREATE POLICY "certificados_detalle_all_revisor" ON public.certificados_detalle
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid() AND rol = 'revisor'
    )
  );

-- Los clientes pueden ver detalles de sus certificados
DROP POLICY IF EXISTS "certificados_detalle_select_cliente" ON public.certificados_detalle;
CREATE POLICY "certificados_detalle_select_cliente" ON public.certificados_detalle
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.certificados c
      INNER JOIN public.clientes cl ON cl.id = c.cliente_id
      WHERE c.id = certificado_id AND cl.usuario_id = auth.uid()
    )
  );

-- Acceso público para verificación
DROP POLICY IF EXISTS "certificados_detalle_select_public" ON public.certificados_detalle;
CREATE POLICY "certificados_detalle_select_public" ON public.certificados_detalle
  FOR SELECT USING (true);

-- =====================================================
-- PASO 6: VISTAS ÚTILES
-- =====================================================

-- Vista: Resumen de certificados por cliente
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

COMMENT ON VIEW public.vista_certificados_clientes IS 'Resumen de certificados por cliente';

-- Vista: Certificados con información completa
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
  -- Cliente
  c.id AS cliente_id,
  c.nombre_empresa AS cliente_nombre,
  c.correo_contacto AS cliente_correo,
  c.telefono_contacto AS cliente_telefono,
  -- Emisor
  u.id AS emisor_id,
  u.nombre AS emisor_nombre,
  u.correo AS emisor_correo,
  -- Estadísticas
  (SELECT COUNT(*) FROM public.certificados_detalle WHERE certificado_id = cert.id) AS total_documentos,
  -- Validez
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

COMMENT ON VIEW public.vista_certificados_completos IS 'Vista completa de certificados con información de cliente, emisor y validez';

-- =====================================================
-- PASO 7: DATOS INICIALES (OPCIONAL)
-- =====================================================

-- Puedes insertar datos de prueba aquí si lo necesitas
-- Por ejemplo, certificados de ejemplo para testing

-- =====================================================
-- PASO 8: CONFIGURACIÓN DE CRON (OPCIONAL)
-- =====================================================

-- Si tienes pg_cron instalado, puedes configurar una tarea
-- para actualizar automáticamente los certificados vencidos:
--
-- SELECT cron.schedule(
--   'actualizar-certificados-vencidos',
--   '0 0 * * *', -- Ejecutar diariamente a medianoche
--   $$SELECT public.actualizar_certificados_vencidos()$$
-- );

-- =====================================================
-- VERIFICACIÓN DE INSTALACIÓN
-- =====================================================

-- Consulta para verificar que todo se instaló correctamente
DO $$
DECLARE
  tablas_count INTEGER;
  funciones_count INTEGER;
  triggers_count INTEGER;
  vistas_count INTEGER;
BEGIN
  -- Contar tablas
  SELECT COUNT(*) INTO tablas_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('certificados', 'certificados_detalle');

  -- Contar funciones
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

  -- Contar triggers
  SELECT COUNT(*) INTO triggers_count
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
    AND event_object_table IN ('certificados');

  -- Contar vistas
  SELECT COUNT(*) INTO vistas_count
  FROM information_schema.views
  WHERE table_schema = 'public'
    AND table_name IN ('vista_certificados_clientes', 'vista_certificados_completos');

  -- Mostrar resultados
  RAISE NOTICE '=== VERIFICACIÓN DE INSTALACIÓN ===';
  RAISE NOTICE 'Tablas instaladas: % de 2', tablas_count;
  RAISE NOTICE 'Funciones instaladas: % de 6', funciones_count;
  RAISE NOTICE 'Triggers instalados: % (2 esperados)', triggers_count;
  RAISE NOTICE 'Vistas instaladas: % de 2', vistas_count;

  IF tablas_count = 2 AND funciones_count = 6 AND vistas_count = 2 THEN
    RAISE NOTICE '✓ Instalación completada exitosamente';
  ELSE
    RAISE WARNING '⚠ La instalación puede estar incompleta';
  END IF;
END $$;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

-- NOTAS IMPORTANTES:
--
-- 1. SEGURIDAD:
--    - RLS está habilitado en todas las tablas
--    - Los certificados tienen acceso público para verificación
--    - Los clientes solo ven sus propios certificados
--    - Los revisores tienen acceso completo
--
-- 2. PERFORMANCE:
--    - Índices creados en columnas de búsqueda frecuente
--    - Vistas materializadas pueden agregarse si es necesario
--
-- 3. MANTENIMIENTO:
--    - Ejecutar actualizar_certificados_vencidos() diariamente
--    - Monitorear certificados próximos a vencer
--
-- 4. INTEGRACIÓN:
--    - El frontend debe usar generarCertificadoPDF() de lib/generarPDF.ts
--    - El servicio certificados.service.ts maneja la lógica de negocio
--
-- 5. VERIFICACIÓN:
--    - Página pública: /verificar/[codigo]
--    - La verificación usa el hash SHA-256 para autenticidad
--
-- =====================================================
