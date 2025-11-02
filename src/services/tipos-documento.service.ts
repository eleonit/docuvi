/**
 * Servicio de Tipos de Documento
 */

import { createClient } from '@/lib/supabase/client'
import type { TipoDocumento, CrearTipoDocumento, ActualizarTipoDocumento } from '@/types'

/**
 * Obtener todos los tipos de documento
 */
export async function obtenerTiposDocumento(soloActivos = false): Promise<TipoDocumento[]> {
  const supabase = createClient()

  let query = supabase
    .from('tipos_documento')
    .select('*')
    .order('nombre', { ascending: true })

  if (soloActivos) {
    query = query.eq('activo', true)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Obtener tipo de documento por ID
 */
export async function obtenerTipoDocumentoPorId(id: string): Promise<TipoDocumento> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tipos_documento')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Crear tipo de documento
 */
export async function crearTipoDocumento(datos: CrearTipoDocumento): Promise<TipoDocumento> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tipos_documento')
    .insert(datos)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Actualizar tipo de documento
 */
export async function actualizarTipoDocumento(
  id: string,
  datos: ActualizarTipoDocumento
): Promise<TipoDocumento> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tipos_documento')
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
 * Eliminar tipo de documento
 */
export async function eliminarTipoDocumento(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.from('tipos_documento').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

/**
 * Activar/desactivar tipo de documento
 */
export async function toggleActivoTipoDocumento(id: string, activo: boolean): Promise<TipoDocumento> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tipos_documento')
    .update({ activo })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Verificar si un tipo de documento está en uso
 */
export async function verificarTipoDocumentoEnUso(id: string): Promise<boolean> {
  const supabase = createClient()

  const { count } = await supabase
    .from('requerimientos_cliente')
    .select('*', { count: 'exact', head: true })
    .eq('tipo_documento_id', id)

  return (count || 0) > 0
}

/**
 * Buscar tipos de documento
 */
export async function buscarTiposDocumento(termino: string): Promise<TipoDocumento[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('tipos_documento')
    .select('*')
    .or(`nombre.ilike.%${termino}%,descripcion.ilike.%${termino}%`)
    .order('nombre', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data
}
