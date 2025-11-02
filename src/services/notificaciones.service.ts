/**
 * Servicio de Notificaciones
 */

import { createClient } from '@/lib/supabase/client'
import type { Notificacion } from '@/types'

/**
 * Obtener notificaciones de un usuario
 */
export async function obtenerNotificaciones(
  usuarioId: string,
  soloNoLeidas = false
): Promise<Notificacion[]> {
  const supabase = createClient()

  let query = supabase
    .from('notificaciones')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('creado_en', { ascending: false })

  if (soloNoLeidas) {
    query = query.eq('leida', false)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Obtener cantidad de notificaciones no leídas
 */
export async function obtenerCantidadNoLeidas(usuarioId: string): Promise<number> {
  const supabase = createClient()

  const { count, error } = await supabase
    .from('notificaciones')
    .select('*', { count: 'exact', head: true })
    .eq('usuario_id', usuarioId)
    .eq('leida', false)

  if (error) {
    throw new Error(error.message)
  }

  return count || 0
}

/**
 * Marcar notificación como leída
 */
export async function marcarComoLeida(notificacionId: string): Promise<Notificacion> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('notificaciones')
    .update({
      leida: true,
      leida_en: new Date().toISOString(),
    })
    .eq('id', notificacionId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Marcar todas las notificaciones como leídas
 */
export async function marcarTodasComoLeidas(usuarioId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('notificaciones')
    .update({
      leida: true,
      leida_en: new Date().toISOString(),
    })
    .eq('usuario_id', usuarioId)
    .eq('leida', false)

  if (error) {
    throw new Error(error.message)
  }
}

/**
 * Eliminar notificación
 */
export async function eliminarNotificacion(notificacionId: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.from('notificaciones').delete().eq('id', notificacionId)

  if (error) {
    throw new Error(error.message)
  }
}

/**
 * Suscribirse a notificaciones en tiempo real
 */
export function suscribirseNotificaciones(
  usuarioId: string,
  callback: (notificacion: Notificacion) => void
) {
  const supabase = createClient()

  const channel = supabase
    .channel('notificaciones')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notificaciones',
        filter: `usuario_id=eq.${usuarioId}`,
      },
      (payload) => {
        callback(payload.new as Notificacion)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Crear notificación (solo para uso interno/admin)
 */
export async function crearNotificacion(
  usuarioId: string,
  tipo: string,
  titulo: string,
  mensaje: string,
  datos?: Record<string, unknown>,
  documentoId?: string,
  requerimientoId?: string
): Promise<Notificacion> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('notificaciones')
    .insert({
      usuario_id: usuarioId,
      tipo,
      titulo,
      mensaje,
      datos: datos || {},
      documento_id: documentoId || null,
      requerimiento_id: requerimientoId || null,
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}
