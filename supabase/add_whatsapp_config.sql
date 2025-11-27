-- =====================================================
-- AGREGAR CONFIGURACIÓN DE WHATSAPP Y PREFERENCIAS
-- Este script agrega campos necesarios para WhatsApp
-- =====================================================

-- =====================================================
-- FUNCIÓN HELPER: Actualizar timestamp automáticamente
-- =====================================================
CREATE OR REPLACE FUNCTION public.actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- MODIFICACIONES A TABLAS EXISTENTES
-- =====================================================

-- Agregar campo de WhatsApp a la tabla clientes
ALTER TABLE public.clientes
ADD COLUMN IF NOT EXISTS whatsapp_contacto TEXT,
ADD COLUMN IF NOT EXISTS notificar_whatsapp BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS dias_anticipacion_vencimiento INTEGER DEFAULT 7;

-- Agregar campo de WhatsApp a la tabla usuarios
ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS whatsapp TEXT,
ADD COLUMN IF NOT EXISTS notificar_whatsapp BOOLEAN DEFAULT true;

-- Crear tabla de configuración de notificaciones (más granular)
CREATE TABLE IF NOT EXISTS public.configuracion_notificaciones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  tipo_notificacion TEXT NOT NULL, -- 'documento_aprobado', 'documento_rechazado', 'documento_proximo_vencer', etc.
  canal TEXT NOT NULL, -- 'plataforma', 'whatsapp', 'email'
  habilitado BOOLEAN DEFAULT true,
  dias_anticipacion INTEGER, -- Para notificaciones de vencimiento
  creado_en TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cliente_id, tipo_notificacion, canal)
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_config_notificaciones_cliente
  ON public.configuracion_notificaciones(cliente_id);
CREATE INDEX IF NOT EXISTS idx_config_notificaciones_tipo
  ON public.configuracion_notificaciones(tipo_notificacion);

-- RLS para configuración de notificaciones
ALTER TABLE public.configuracion_notificaciones ENABLE ROW LEVEL SECURITY;

-- Política: Revisores pueden ver y gestionar todo
CREATE POLICY "Revisores pueden gestionar configuración de notificaciones"
  ON public.configuracion_notificaciones
  FOR ALL
  USING (public.es_revisor());

-- Política: Clientes pueden ver su propia configuración
CREATE POLICY "Clientes pueden ver su configuración de notificaciones"
  ON public.configuracion_notificaciones
  FOR SELECT
  USING (
    cliente_id IN (
      SELECT id FROM public.clientes WHERE usuario_id = auth.uid()
    )
  );

-- Actualizar trigger para actualizado_en
DROP TRIGGER IF EXISTS actualizar_configuracion_notificaciones_updated_at ON public.configuracion_notificaciones;
CREATE TRIGGER actualizar_configuracion_notificaciones_updated_at
  BEFORE UPDATE ON public.configuracion_notificaciones
  FOR EACH ROW
  EXECUTE FUNCTION public.actualizar_updated_at();

-- Crear configuraciones por defecto para clientes existentes
INSERT INTO public.configuracion_notificaciones (cliente_id, tipo_notificacion, canal, habilitado, dias_anticipacion)
SELECT
  c.id,
  tipo,
  canal,
  true,
  CASE WHEN tipo = 'documento_proximo_vencer' THEN 7 ELSE NULL END
FROM public.clientes c
CROSS JOIN (
  VALUES
    ('documento_aprobado', 'plataforma'),
    ('documento_aprobado', 'whatsapp'),
    ('documento_rechazado', 'plataforma'),
    ('documento_rechazado', 'whatsapp'),
    ('documento_proximo_vencer', 'plataforma'),
    ('documento_proximo_vencer', 'whatsapp'),
    ('certificado_emitido', 'plataforma'),
    ('certificado_emitido', 'whatsapp')
) AS tipos(tipo, canal)
ON CONFLICT (cliente_id, tipo_notificacion, canal) DO NOTHING;

-- Función para obtener configuración de notificaciones de un cliente
CREATE OR REPLACE FUNCTION public.obtener_configuracion_notificaciones_cliente(
  cliente_id_param UUID
)
RETURNS TABLE (
  tipo_notificacion TEXT,
  canal TEXT,
  habilitado BOOLEAN,
  dias_anticipacion INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cn.tipo_notificacion,
    cn.canal,
    cn.habilitado,
    cn.dias_anticipacion
  FROM public.configuracion_notificaciones cn
  WHERE cn.cliente_id = cliente_id_param;
END;
$$ LANGUAGE plpgsql;

-- Comentarios
COMMENT ON TABLE public.configuracion_notificaciones IS
  'Configuración granular de notificaciones por cliente, tipo y canal';
COMMENT ON COLUMN public.clientes.whatsapp_contacto IS
  'Número de WhatsApp del cliente para notificaciones (formato internacional +52...)';
COMMENT ON COLUMN public.clientes.notificar_whatsapp IS
  'Si el cliente acepta recibir notificaciones por WhatsApp';
COMMENT ON COLUMN public.clientes.dias_anticipacion_vencimiento IS
  'Días de anticipación para notificar vencimientos (default: 7 días)';
