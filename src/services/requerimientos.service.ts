/**
 * Servicio de Requerimientos de Cliente
 */

import { createClient } from '@/lib/supabase/client'
import type {
  RequerimientoCliente,
  RequerimientoConRelaciones,
  CrearRequerimiento,
  ActualizarRequerimiento,
} from '@/types'

/**
 * Obtener requerimientos de un cliente
 */
export async function obtenerRequerimientosCliente(
  clienteId: string
): Promise<RequerimientoConRelaciones[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('requerimientos_cliente')
    .select(`
      *,
      tipo_documento:tipo_documento_id (
        id,
        nombre,
        descripcion,
        activo
      ),
      documentos:documentos (
        id,
        url,
        nombre_archivo,
        version,
        estado,
        fecha_carga,
        fecha_vencimiento,
        eliminado
      )
    `)
    .eq('cliente_id', clienteId)
    .order('creado_en', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Obtener requerimiento por ID
 */
export async function obtenerRequerimientoPorId(
  id: string
): Promise<RequerimientoConRelaciones> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('requerimientos_cliente')
    .select(`
      *,
      tipo_documento:tipo_documento_id (
        id,
        nombre,
        descripcion,
        activo
      ),
      cliente:cliente_id (
        id,
        nombre_empresa,
        correo_contacto
      ),
      documentos:documentos (
        id,
        url,
        nombre_archivo,
        version,
        estado,
        fecha_carga,
        fecha_vencimiento,
        motivo_rechazo,
        aprobado_por,
        eliminado
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
 * Crear requerimiento
 */
export async function crearRequerimiento(
  datos: CrearRequerimiento
): Promise<RequerimientoCliente> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('requerimientos_cliente')
    .insert(datos)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Actualizar requerimiento
 */
export async function actualizarRequerimiento(
  id: string,
  datos: ActualizarRequerimiento
): Promise<RequerimientoCliente> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('requerimientos_cliente')
    .update(datos)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Eliminar requerimiento
 */
export async function eliminarRequerimiento(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.from('requerimientos_cliente').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

/**
 * Asignar múltiples requerimientos a un cliente
 */
export async function asignarRequerimientos(
  clienteId: string,
  tiposDocumentoIds: string[],
  obligatorio = true
): Promise<RequerimientoCliente[]> {
  const supabase = createClient()

  const requerimientos = tiposDocumentoIds.map((tipoDocumentoId) => ({
    cliente_id: clienteId,
    tipo_documento_id: tipoDocumentoId,
    obligatorio,
  }))

  const { data, error } = await supabase
    .from('requerimientos_cliente')
    .insert(requerimientos)
    .select()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Verificar si un cliente ya tiene un tipo de documento asignado
 */
export async function verificarRequerimientoExiste(
  clienteId: string,
  tipoDocumentoId: string
): Promise<boolean> {
  const supabase = createClient()

  const { count } = await supabase
    .from('requerimientos_cliente')
    .select('*', { count: 'exact', head: true })
    .eq('cliente_id', clienteId)
    .eq('tipo_documento_id', tipoDocumentoId)

  return (count || 0) > 0
}

/**
 * Obtener documento más reciente de un requerimiento
 */
export async function obtenerDocumentoMasReciente(requerimientoId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('documentos')
    .select('*')
    .eq('requerimiento_cliente_id', requerimientoId)
    .eq('eliminado', false)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }

  return data
}

/**
 * Obtener estado de cumplimiento de requerimientos de un cliente
 */
export async function obtenerEstadoCumplimiento(clienteId: string) {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('verificar_cumplimiento_cliente', {
    cliente_id_param: clienteId,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data[0]
}
