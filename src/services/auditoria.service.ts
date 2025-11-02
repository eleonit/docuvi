/**
 * Servicio de Auditoría
 */

import { createClient } from '@/lib/supabase/client'
import type { Auditoria } from '@/types'

/**
 * Obtener logs de auditoría
 */
export async function obtenerLogsAuditoria(
  limite = 100,
  offset = 0
): Promise<Auditoria[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('auditoria')
    .select('*')
    .order('creado_en', { ascending: false })
    .range(offset, offset + limite - 1)

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Obtener logs de auditoría por entidad
 */
export async function obtenerLogsEntidad(
  entidad: string,
  entidadId: string
): Promise<Auditoria[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('auditoria')
    .select('*')
    .eq('entidad', entidad)
    .eq('entidad_id', entidadId)
    .order('creado_en', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Obtener logs de auditoría por actor
 */
export async function obtenerLogsPorActor(actorId: string): Promise<Auditoria[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('auditoria')
    .select('*')
    .eq('actor_id', actorId)
    .order('creado_en', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Obtener logs de auditoría por acción
 */
export async function obtenerLogsPorAccion(accion: string): Promise<Auditoria[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('auditoria')
    .select('*')
    .eq('accion', accion)
    .order('creado_en', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Filtrar logs de auditoría
 */
export async function filtrarLogs(filtros: {
  entidad?: string
  accion?: string
  actorId?: string
  fechaDesde?: string
  fechaHasta?: string
  limite?: number
  offset?: number
}): Promise<Auditoria[]> {
  const supabase = createClient()

  let query = supabase
    .from('auditoria')
    .select('*')
    .order('creado_en', { ascending: false })

  if (filtros.entidad) {
    query = query.eq('entidad', filtros.entidad)
  }

  if (filtros.accion) {
    query = query.eq('accion', filtros.accion)
  }

  if (filtros.actorId) {
    query = query.eq('actor_id', filtros.actorId)
  }

  if (filtros.fechaDesde) {
    query = query.gte('creado_en', filtros.fechaDesde)
  }

  if (filtros.fechaHasta) {
    query = query.lte('creado_en', filtros.fechaHasta)
  }

  if (filtros.limite) {
    const offset = filtros.offset || 0
    query = query.range(offset, offset + filtros.limite - 1)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Registrar acción de auditoría
 */
export async function registrarAuditoria(
  actorId: string,
  accion: string,
  entidad: string,
  entidadId: string,
  datos?: Record<string, unknown>
): Promise<Auditoria> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('auditoria')
    .insert({
      actor_id: actorId,
      accion,
      entidad,
      entidad_id: entidadId,
      datos: datos || {},
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Obtener resumen de actividad por usuario
 */
export async function obtenerResumenActividad(actorId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('auditoria')
    .select('accion, entidad')
    .eq('actor_id', actorId)

  if (error) {
    throw new Error(error.message)
  }

  // Agrupar por acción
  const resumen = data.reduce(
    (acc, log) => {
      acc[log.accion] = (acc[log.accion] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return resumen
}

/**
 * Obtener actividad reciente
 */
export async function obtenerActividadReciente(limite = 20): Promise<Auditoria[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('auditoria')
    .select('*')
    .order('creado_en', { ascending: false })
    .limit(limite)

  if (error) {
    throw new Error(error.message)
  }

  return data
}
