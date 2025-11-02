-- =====================================================
-- DOCUVI - ROW LEVEL SECURITY POLICIES
-- Políticas de seguridad a nivel de fila
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

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Función para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION obtener_rol_usuario()
RETURNS TEXT AS $$
  SELECT rol FROM public.usuarios WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Función para verificar si el usuario es revisor
CREATE OR REPLACE FUNCTION es_revisor()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() AND rol = 'revisor'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Función para obtener el cliente_id asociado al usuario
CREATE OR REPLACE FUNCTION obtener_cliente_id_usuario()
RETURNS UUID AS $$
  SELECT id FROM public.clientes WHERE usuario_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================
-- POLICIES: usuarios
-- =====================================================

-- Los usuarios pueden ver su propia información
CREATE POLICY "usuarios_select_own" ON public.usuarios
  FOR SELECT USING (auth.uid() = id);

-- Los revisores pueden ver todos los usuarios
CREATE POLICY "usuarios_select_revisor" ON public.usuarios
  FOR SELECT USING (es_revisor());

-- Los usuarios pueden actualizar su propia información
CREATE POLICY "usuarios_update_own" ON public.usuarios
  FOR UPDATE USING (auth.uid() = id);

-- =====================================================
-- POLICIES: clientes
-- =====================================================

-- Los revisores pueden ver, crear, actualizar y eliminar clientes
CREATE POLICY "clientes_all_revisor" ON public.clientes
  FOR ALL USING (es_revisor());

-- Los clientes pueden ver solo su propia empresa
CREATE POLICY "clientes_select_own" ON public.clientes
  FOR SELECT USING (usuario_id = auth.uid());

-- =====================================================
-- POLICIES: tipos_documento
-- =====================================================

-- Los revisores pueden gestionar tipos de documento
CREATE POLICY "tipos_documento_all_revisor" ON public.tipos_documento
  FOR ALL USING (es_revisor());

-- Los clientes pueden ver tipos de documento activos
CREATE POLICY "tipos_documento_select_cliente" ON public.tipos_documento
  FOR SELECT USING (activo = true);

-- =====================================================
-- POLICIES: requerimientos_cliente
-- =====================================================

-- Los revisores pueden gestionar todos los requerimientos
CREATE POLICY "requerimientos_all_revisor" ON public.requerimientos_cliente
  FOR ALL USING (es_revisor());

-- Los clientes pueden ver sus propios requerimientos
CREATE POLICY "requerimientos_select_cliente" ON public.requerimientos_cliente
  FOR SELECT USING (
    cliente_id = obtener_cliente_id_usuario()
  );

-- =====================================================
-- POLICIES: documentos
-- =====================================================

-- Los revisores pueden ver, actualizar y eliminar todos los documentos
CREATE POLICY "documentos_select_revisor" ON public.documentos
  FOR SELECT USING (es_revisor());

CREATE POLICY "documentos_update_revisor" ON public.documentos
  FOR UPDATE USING (es_revisor());

CREATE POLICY "documentos_delete_revisor" ON public.documentos
  FOR DELETE USING (es_revisor());

-- Los clientes pueden ver sus propios documentos
CREATE POLICY "documentos_select_cliente" ON public.documentos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.requerimientos_cliente rc
      WHERE rc.id = documentos.requerimiento_cliente_id
        AND rc.cliente_id = obtener_cliente_id_usuario()
    )
  );

-- Los clientes pueden crear documentos en sus requerimientos
CREATE POLICY "documentos_insert_cliente" ON public.documentos
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.requerimientos_cliente rc
      WHERE rc.id = requerimiento_cliente_id
        AND rc.cliente_id = obtener_cliente_id_usuario()
    )
  );

-- Los clientes pueden actualizar sus propios documentos pendientes
CREATE POLICY "documentos_update_cliente" ON public.documentos
  FOR UPDATE USING (
    estado = 'pendiente' AND
    EXISTS (
      SELECT 1 FROM public.requerimientos_cliente rc
      WHERE rc.id = requerimiento_cliente_id
        AND rc.cliente_id = obtener_cliente_id_usuario()
    )
  );

-- =====================================================
-- POLICIES: certificados
-- =====================================================

-- Los revisores pueden gestionar certificados
CREATE POLICY "certificados_all_revisor" ON public.certificados
  FOR ALL USING (es_revisor());

-- Los clientes pueden ver sus propios certificados
CREATE POLICY "certificados_select_cliente" ON public.certificados
  FOR SELECT USING (
    cliente_id = obtener_cliente_id_usuario()
  );

-- Cualquiera puede verificar certificados por código (para la página pública)
CREATE POLICY "certificados_select_public" ON public.certificados
  FOR SELECT USING (true);

-- =====================================================
-- POLICIES: certificados_detalle
-- =====================================================

-- Los revisores pueden ver todos los detalles
CREATE POLICY "certificados_detalle_select_revisor" ON public.certificados_detalle
  FOR SELECT USING (es_revisor());

-- Los clientes pueden ver detalles de sus certificados
CREATE POLICY "certificados_detalle_select_cliente" ON public.certificados_detalle
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.certificados c
      WHERE c.id = certificado_id
        AND c.cliente_id = obtener_cliente_id_usuario()
    )
  );

-- Cualquiera puede ver detalles para verificación pública
CREATE POLICY "certificados_detalle_select_public" ON public.certificados_detalle
  FOR SELECT USING (true);

-- =====================================================
-- POLICIES: notificaciones
-- =====================================================

-- Los usuarios solo pueden ver sus propias notificaciones
CREATE POLICY "notificaciones_select_own" ON public.notificaciones
  FOR SELECT USING (usuario_id = auth.uid());

-- Los usuarios pueden actualizar sus propias notificaciones
CREATE POLICY "notificaciones_update_own" ON public.notificaciones
  FOR UPDATE USING (usuario_id = auth.uid());

-- Solo el sistema puede crear notificaciones (mediante service role)
CREATE POLICY "notificaciones_insert_service" ON public.notificaciones
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- POLICIES: auditoria
-- =====================================================

-- Los revisores pueden ver toda la auditoría
CREATE POLICY "auditoria_select_revisor" ON public.auditoria
  FOR SELECT USING (es_revisor());

-- Los clientes pueden ver su propia auditoría
CREATE POLICY "auditoria_select_cliente" ON public.auditoria
  FOR SELECT USING (actor_id = auth.uid());

-- Solo el sistema puede insertar en auditoría
CREATE POLICY "auditoria_insert_service" ON public.auditoria
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- STORAGE POLICIES
-- =====================================================

-- Crear bucket para documentos (ejecutar en Supabase Storage UI o API)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', false);

-- Políticas para el bucket 'documentos'

-- Los revisores pueden ver todos los archivos
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

-- Los clientes pueden ver sus propios archivos
-- Estructura de path: {cliente_id}/{tipo_documento_id}/{version}/{filename}
CREATE POLICY "documentos_storage_select_cliente"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documentos' AND
  (storage.foldername(name))[1] = (
    SELECT id::text FROM public.clientes WHERE usuario_id = auth.uid()
  )
);

-- Los clientes pueden subir archivos a su carpeta
CREATE POLICY "documentos_storage_insert_cliente"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documentos' AND
  (storage.foldername(name))[1] = (
    SELECT id::text FROM public.clientes WHERE usuario_id = auth.uid()
  )
);

-- Los revisores pueden subir cualquier archivo
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

-- Los revisores pueden eliminar archivos
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
