/**
 * Servicio de Documentos
 */

import { createClient } from '@/lib/supabase/client'
import type { Documento, DocumentoConRelaciones, CrearDocumento, ActualizarDocumento } from '@/types'
import { construirRutaStorage, generarNombreUnicoArchivo } from '@/lib/utils'

/**
 * Obtener documentos de un requerimiento
 */
export async function obtenerDocumentos(requerimientoId: string): Promise<Documento[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('documentos')
    .select('*')
    .eq('requerimiento_cliente_id', requerimientoId)
    .eq('eliminado', false)
    .order('version', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Obtener documento por ID
 */
export async function obtenerDocumentoPorId(id: string): Promise<DocumentoConRelaciones> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('documentos')
    .select(`
      *,
      requerimiento_cliente:requerimiento_cliente_id (
        id,
        obligatorio,
        periodicidad_meses,
        tipo_documento:tipo_documento_id (
          id,
          nombre,
          descripcion
        ),
        cliente:cliente_id (
          id,
          nombre_empresa,
          correo_contacto
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Obtener todos los documentos pendientes (para revisor)
 */
export async function obtenerDocumentosPendientes(): Promise<DocumentoConRelaciones[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('documentos')
    .select(`
      *,
      requerimiento_cliente:requerimiento_cliente_id (
        id,
        tipo_documento:tipo_documento_id (
          id,
          nombre
        ),
        cliente:cliente_id (
          id,
          nombre_empresa
        )
      )
    `)
    .eq('estado', 'pendiente')
    .eq('eliminado', false)
    .order('fecha_carga', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Subir documento
 */
export async function subirDocumento(
  archivo: File,
  requerimientoId: string,
  clienteId: string,
  tipoDocumentoId: string,
  fechaVencimiento?: string
): Promise<Documento> {
  const supabase = createClient()

  // Obtener siguiente versión
  const { data: versionData } = await supabase.rpc('obtener_siguiente_version', {
    req_cliente_id: requerimientoId,
  })

  const version = versionData || 1

  // Generar nombre único
  const nombreUnico = generarNombreUnicoArchivo(archivo.name)

  // Construir ruta
  const rutaStorage = construirRutaStorage(clienteId, tipoDocumentoId, version, nombreUnico)

  // Subir archivo a Storage
  const { error: uploadError } = await supabase.storage
    .from('documentos')
    .upload(rutaStorage, archivo)

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  // Crear registro en la BD
  const documentoData: CrearDocumento = {
    requerimiento_cliente_id: requerimientoId,
    url: rutaStorage,
    nombre_archivo: archivo.name,
    version,
    estado: 'pendiente',
    fecha_vencimiento: fechaVencimiento || null,
  }

  const { data, error } = await supabase
    .from('documentos')
    .insert(documentoData)
    .select()
    .single()

  if (error) {
    // Si falla la inserción, eliminar el archivo
    await supabase.storage.from('documentos').remove([rutaStorage])
    throw new Error(error.message)
  }

  return data
}

/**
 * Aprobar documento
 */
export async function aprobarDocumento(
  documentoId: string,
  aprobadoPor: string,
  fechaVencimiento?: string
): Promise<Documento> {
  const supabase = createClient()

  // Construir objeto solo con campos definidos
  const datosActualizar: any = {
    estado: 'aprobado',
    aprobado_por: aprobadoPor,
    fecha_aprobacion: new Date().toISOString(),
  }

  // Solo agregar fecha_vencimiento si se proporciona
  if (fechaVencimiento) {
    datosActualizar.fecha_vencimiento = fechaVencimiento
  }

  const { data, error } = await supabase
    .from('documentos')
    .update(datosActualizar)
    .eq('id', documentoId)
    .select()
    .single()

  if (error) {
    console.error('Error al aprobar documento:', error)
    throw new Error(error.message)
  }

  return data
}

/**
 * Rechazar documento
 */
export async function rechazarDocumento(
  documentoId: string,
  motivoRechazo: string
): Promise<Documento> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('documentos')
    .update({
      estado: 'rechazado',
      motivo_rechazo: motivoRechazo,
    })
    .eq('id', documentoId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Eliminar documento (soft delete)
 */
export async function eliminarDocumento(documentoId: string, usuarioId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.rpc('marcar_documento_eliminado', {
    documento_id: documentoId,
    usuario_id: usuarioId,
  })

  if (error) {
    throw new Error(error.message)
  }
}

/**
 * Restaurar documento eliminado
 */
export async function restaurarDocumento(documentoId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.rpc('restaurar_documento', {
    documento_id: documentoId,
  })

  if (error) {
    throw new Error(error.message)
  }
}

/**
 * Obtener URL firmada para descargar documento
 */
export async function obtenerUrlDescarga(rutaArchivo: string): Promise<string> {
  const supabase = createClient()

  const { data, error } = await supabase.storage
    .from('documentos')
    .createSignedUrl(rutaArchivo, 3600) // 1 hora

  if (error) {
    throw new Error(error.message)
  }

  return data.signedUrl
}

/**
 * Obtener documentos próximos a vencer
 */
export async function obtenerDocumentosProximosVencer(diasLimite = 30) {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('obtener_documentos_proximos_vencer', {
    dias_limite: diasLimite,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Obtener documentos vencidos (versión simple sin relaciones)
 */
export async function obtenerDocumentosVencidosSimple(): Promise<Documento[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('documentos')
    .select('*')
    .eq('estado', 'aprobado')
    .eq('eliminado', false)
    .not('fecha_vencimiento', 'is', null)
    .lt('fecha_vencimiento', new Date().toISOString().split('T')[0])
    .order('fecha_vencimiento', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Filtrar documentos con múltiples criterios
 */
export async function filtrarDocumentos(filtros: {
  estado?: string
  clienteId?: string
  tipoDocumentoId?: string
  fechaDesde?: string
  fechaHasta?: string
}): Promise<DocumentoConRelaciones[]> {
  const supabase = createClient()

  let query = supabase
    .from('documentos')
    .select(`
      *,
      requerimiento_cliente:requerimiento_cliente_id (
        id,
        tipo_documento:tipo_documento_id (
          id,
          nombre
        ),
        cliente:cliente_id (
          id,
          nombre_empresa
        )
      )
    `)
    .eq('eliminado', false)

  if (filtros.estado && filtros.estado !== 'todos') {
    query = query.eq('estado', filtros.estado)
  }

  if (filtros.fechaDesde) {
    query = query.gte('fecha_carga', filtros.fechaDesde)
  }

  if (filtros.fechaHasta) {
    query = query.lte('fecha_carga', filtros.fechaHasta)
  }

  const { data, error } = await query.order('fecha_carga', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data
}
