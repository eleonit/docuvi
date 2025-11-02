/**
 * Servicio de Estadísticas y Métricas
 */

import { createClient } from '@/lib/supabase/client'
import type { DocumentoConRelaciones } from '@/types'

/**
 * Interfaz para cumplimiento por cliente
 */
export interface CumplimientoCliente {
  cliente_id: string
  cliente_nombre: string
  total_requerimientos: number
  requerimientos_cumplidos: number
  porcentaje_cumplimiento: number
}

/**
 * Interfaz para tiempo de respuesta por cliente
 */
export interface TiempoRespuestaCliente {
  cliente_id: string
  cliente_nombre: string
  dias_promedio: number
  total_documentos: number
}

/**
 * Interfaz para documento vencido
 */
export interface DocumentoVencido {
  id: string
  cliente_id: string
  cliente_nombre: string
  tipo_documento: string
  nombre_archivo: string
  fecha_vencimiento: string
  dias_vencido: number
  requerimiento_id: string
}

/**
 * Obtener porcentaje de cumplimiento total de todos los clientes
 */
export async function obtenerCumplimientoTotal(): Promise<{
  porcentaje_total: number
  total_requerimientos: number
  requerimientos_cumplidos: number
}> {
  const supabase = createClient()

  // Obtener todos los requerimientos
  const { data: requerimientos, error: errorReq } = await supabase
    .from('requerimientos_cliente')
    .select('id, obligatorio')

  if (errorReq) throw new Error(errorReq.message)

  const totalRequerimientos = requerimientos?.length || 0

  // Obtener documentos aprobados únicos por requerimiento
  const { data: documentosAprobados, error: errorDocs } = await supabase
    .from('documentos')
    .select('requerimiento_cliente_id')
    .eq('estado', 'aprobado')
    .eq('eliminado', false)

  if (errorDocs) throw new Error(errorDocs.message)

  // Contar requerimientos únicos con al menos un documento aprobado
  const requerimientosUnicos = new Set(
    documentosAprobados?.map((d) => d.requerimiento_cliente_id) || []
  )
  const requerimientosCumplidos = requerimientosUnicos.size

  const porcentajeTotal =
    totalRequerimientos > 0 ? (requerimientosCumplidos / totalRequerimientos) * 100 : 0

  return {
    porcentaje_total: Math.round(porcentajeTotal * 10) / 10,
    total_requerimientos: totalRequerimientos,
    requerimientos_cumplidos: requerimientosCumplidos,
  }
}

/**
 * Obtener porcentajes de cumplimiento por cliente
 */
export async function obtenerCumplimientoPorCliente(): Promise<CumplimientoCliente[]> {
  const supabase = createClient()

  // Obtener todos los clientes con sus requerimientos
  const { data: clientes, error: errorClientes } = await supabase
    .from('clientes')
    .select(`
      id,
      nombre_empresa,
      requerimientos:requerimientos_cliente(
        id,
        documentos:documentos(
          id,
          estado,
          eliminado
        )
      )
    `)
    .eq('activo', true)

  if (errorClientes) throw new Error(errorClientes.message)

  const cumplimientoClientes: CumplimientoCliente[] = []

  for (const cliente of clientes || []) {
    const requerimientos = (cliente.requerimientos as any[]) || []
    const totalRequerimientos = requerimientos.length

    // Contar requerimientos con al menos un documento aprobado y no eliminado
    const requerimientosCumplidos = requerimientos.filter((req: any) => {
      const documentos = req.documentos || []
      return documentos.some(
        (doc: any) => doc.estado === 'aprobado' && doc.eliminado === false
      )
    }).length

    const porcentaje =
      totalRequerimientos > 0 ? (requerimientosCumplidos / totalRequerimientos) * 100 : 0

    cumplimientoClientes.push({
      cliente_id: cliente.id,
      cliente_nombre: cliente.nombre_empresa,
      total_requerimientos: totalRequerimientos,
      requerimientos_cumplidos: requerimientosCumplidos,
      porcentaje_cumplimiento: Math.round(porcentaje * 10) / 10,
    })
  }

  return cumplimientoClientes.sort(
    (a, b) => b.porcentaje_cumplimiento - a.porcentaje_cumplimiento
  )
}

/**
 * Obtener clientes más rápidos en dar cumplimiento (en días promedio)
 */
export async function obtenerClientesMasRapidos(limite = 5): Promise<TiempoRespuestaCliente[]> {
  const supabase = createClient()

  // Obtener documentos aprobados con información del cliente
  const { data: documentos, error } = await supabase
    .from('documentos')
    .select(`
      id,
      fecha_carga,
      fecha_aprobacion,
      requerimiento_cliente:requerimiento_cliente_id(
        cliente:cliente_id(
          id,
          nombre_empresa
        )
      )
    `)
    .eq('estado', 'aprobado')
    .eq('eliminado', false)
    .not('fecha_aprobacion', 'is', null)

  if (error) throw new Error(error.message)

  // Calcular días promedio por cliente
  const tiemposPorCliente = new Map<
    string,
    { nombre: string; totalDias: number; totalDocs: number }
  >()

  for (const doc of documentos || []) {
    const requerimiento = doc.requerimiento_cliente as any
    if (!requerimiento?.cliente) continue

    const cliente = requerimiento.cliente
    const fechaCarga = new Date(doc.fecha_carga)
    const fechaAprobacion = new Date(doc.fecha_aprobacion!)
    const dias = Math.floor(
      (fechaAprobacion.getTime() - fechaCarga.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (!tiemposPorCliente.has(cliente.id)) {
      tiemposPorCliente.set(cliente.id, {
        nombre: cliente.nombre_empresa,
        totalDias: 0,
        totalDocs: 0,
      })
    }

    const datos = tiemposPorCliente.get(cliente.id)!
    datos.totalDias += dias
    datos.totalDocs += 1
  }

  // Convertir a array y calcular promedio
  const tiemposArray: TiempoRespuestaCliente[] = Array.from(tiemposPorCliente.entries()).map(
    ([clienteId, datos]) => ({
      cliente_id: clienteId,
      cliente_nombre: datos.nombre,
      dias_promedio: Math.round((datos.totalDias / datos.totalDocs) * 10) / 10,
      total_documentos: datos.totalDocs,
    })
  )

  // Ordenar por días promedio (menor a mayor) y limitar
  return tiemposArray.sort((a, b) => a.dias_promedio - b.dias_promedio).slice(0, limite)
}

/**
 * Obtener clientes más lentos en dar cumplimiento (en días promedio)
 */
export async function obtenerClientesMasLentos(limite = 5): Promise<TiempoRespuestaCliente[]> {
  const supabase = createClient()

  // Obtener documentos aprobados con información del cliente
  const { data: documentos, error } = await supabase
    .from('documentos')
    .select(`
      id,
      fecha_carga,
      fecha_aprobacion,
      requerimiento_cliente:requerimiento_cliente_id(
        cliente:cliente_id(
          id,
          nombre_empresa
        )
      )
    `)
    .eq('estado', 'aprobado')
    .eq('eliminado', false)
    .not('fecha_aprobacion', 'is', null)

  if (error) throw new Error(error.message)

  // Calcular días promedio por cliente
  const tiemposPorCliente = new Map<
    string,
    { nombre: string; totalDias: number; totalDocs: number }
  >()

  for (const doc of documentos || []) {
    const requerimiento = doc.requerimiento_cliente as any
    if (!requerimiento?.cliente) continue

    const cliente = requerimiento.cliente
    const fechaCarga = new Date(doc.fecha_carga)
    const fechaAprobacion = new Date(doc.fecha_aprobacion!)
    const dias = Math.floor(
      (fechaAprobacion.getTime() - fechaCarga.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (!tiemposPorCliente.has(cliente.id)) {
      tiemposPorCliente.set(cliente.id, {
        nombre: cliente.nombre_empresa,
        totalDias: 0,
        totalDocs: 0,
      })
    }

    const datos = tiemposPorCliente.get(cliente.id)!
    datos.totalDias += dias
    datos.totalDocs += 1
  }

  // Convertir a array y calcular promedio
  const tiemposArray: TiempoRespuestaCliente[] = Array.from(tiemposPorCliente.entries()).map(
    ([clienteId, datos]) => ({
      cliente_id: clienteId,
      cliente_nombre: datos.nombre,
      dias_promedio: Math.round((datos.totalDias / datos.totalDocs) * 10) / 10,
      total_documentos: datos.totalDocs,
    })
  )

  // Ordenar por días promedio (mayor a menor) y limitar
  return tiemposArray.sort((a, b) => b.dias_promedio - a.dias_promedio).slice(0, limite)
}

/**
 * Obtener documentos vencidos con información del cliente
 */
export async function obtenerDocumentosVencidos(): Promise<DocumentoVencido[]> {
  const supabase = createClient()

  const fechaHoy = new Date().toISOString().split('T')[0]

  const { data: documentos, error } = await supabase
    .from('documentos')
    .select(`
      id,
      nombre_archivo,
      fecha_vencimiento,
      requerimiento_cliente:requerimiento_cliente_id(
        id,
        tipo_documento:tipo_documento_id(
          nombre
        ),
        cliente:cliente_id(
          id,
          nombre_empresa
        )
      )
    `)
    .eq('estado', 'aprobado')
    .eq('eliminado', false)
    .not('fecha_vencimiento', 'is', null)
    .lt('fecha_vencimiento', fechaHoy)
    .order('fecha_vencimiento', { ascending: true })

  if (error) throw new Error(error.message)

  return (documentos || []).map((doc) => {
    const requerimiento = doc.requerimiento_cliente as any
    const fechaVencimiento = new Date(doc.fecha_vencimiento!)
    const hoy = new Date()
    const diasVencido = Math.floor((hoy.getTime() - fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24))

    return {
      id: doc.id,
      cliente_id: requerimiento.cliente.id,
      cliente_nombre: requerimiento.cliente.nombre_empresa,
      tipo_documento: requerimiento.tipo_documento.nombre,
      nombre_archivo: doc.nombre_archivo,
      fecha_vencimiento: doc.fecha_vencimiento!,
      dias_vencido: diasVencido,
      requerimiento_id: requerimiento.id,
    }
  })
}
