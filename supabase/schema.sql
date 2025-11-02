-- =====================================================
-- DOCUVI - DATABASE SCHEMA
-- Sistema de Gestión Documental
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLA: usuarios
-- Extiende auth.users con información adicional
-- =====================================================
CREATE TABLE IF NOT EXISTS public.usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  correo TEXT NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('revisor', 'cliente')),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLA: clientes
-- Empresas/contratistas que suben documentos
-- =====================================================
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

-- =====================================================
-- TABLA: tipos_documento
-- Catálogo de tipos de documentos (RFC, INE, etc.)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.tipos_documento (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  creado_por UUID NOT NULL REFERENCES public.usuarios(id),
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- TABLA: requerimientos_cliente
-- Documentos requeridos para cada cliente
-- =====================================================
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

-- =====================================================
-- TABLA: documentos
-- Archivos cargados por los clientes
-- =====================================================
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

-- Índice para búsquedas por requerimiento y estado
CREATE INDEX IF NOT EXISTS idx_documentos_requerimiento ON public.documentos(requerimiento_cliente_id);
CREATE INDEX IF NOT EXISTS idx_documentos_estado ON public.documentos(estado) WHERE eliminado = false;

-- =====================================================
-- TABLA: certificados
-- Certificados de cumplimiento generados
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

CREATE INDEX IF NOT EXISTS idx_certificados_codigo ON public.certificados(codigo);
CREATE INDEX IF NOT EXISTS idx_certificados_cliente ON public.certificados(cliente_id);

-- =====================================================
-- TABLA: certificados_detalle
-- Detalle de documentos incluidos en cada certificado
-- =====================================================
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

CREATE INDEX IF NOT EXISTS idx_certificados_detalle_certificado ON public.certificados_detalle(certificado_id);

-- =====================================================
-- TABLA: notificaciones
-- Sistema de notificaciones en tiempo real
-- =====================================================
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

CREATE INDEX IF NOT EXISTS idx_notificaciones_usuario ON public.notificaciones(usuario_id, leida);

-- =====================================================
-- TABLA: auditoria
-- Registro de todas las acciones del sistema
-- =====================================================
CREATE TABLE IF NOT EXISTS public.auditoria (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  accion TEXT NOT NULL,
  entidad TEXT NOT NULL,
  entidad_id UUID,
  datos JSONB DEFAULT '{}'::jsonb,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_actor ON public.auditoria(actor_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON public.auditoria(entidad, entidad_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON public.auditoria(creado_en DESC);

-- =====================================================
-- TRIGGERS: updated_at automático
-- =====================================================
CREATE OR REPLACE FUNCTION actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.actualizado_en = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_usuarios_actualizado
  BEFORE UPDATE ON public.usuarios
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_timestamp();

CREATE TRIGGER trigger_clientes_actualizado
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_timestamp();

CREATE TRIGGER trigger_tipos_documento_actualizado
  BEFORE UPDATE ON public.tipos_documento
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_timestamp();

CREATE TRIGGER trigger_requerimientos_actualizado
  BEFORE UPDATE ON public.requerimientos_cliente
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_timestamp();

CREATE TRIGGER trigger_documentos_actualizado
  BEFORE UPDATE ON public.documentos
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_timestamp();

CREATE TRIGGER trigger_certificados_actualizado
  BEFORE UPDATE ON public.certificados
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_timestamp();
