-- =====================================================
-- DOCUVI - STORAGE CONFIGURATION
-- Configuración del almacenamiento de archivos
-- =====================================================

-- Crear bucket 'documentos' (privado)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documentos',
  'documentos',
  false,
  10485760, -- 10MB en bytes
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

-- Nota: Las políticas de storage se configuran en policies.sql
-- Este archivo solo crea el bucket con sus restricciones
