/**
 * Servicio de Clientes
 */

import { createClient } from '@/lib/supabase/client'
import type { Cliente, ClienteConUsuario, CrearCliente, ActualizarCliente } from '@/types'

/**
 * Obtener todos los clientes
 */
export async function obtenerClientes(): Promise<ClienteConUsuario[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('clientes')
    .select(`
      *,
      usuario:usuario_id (
        id,
        correo,
        nombre,
        rol
      )
    `)
    .order('nombre_empresa', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Obtener cliente por ID
 */
export async function obtenerClientePorId(id: string): Promise<ClienteConUsuario> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('clientes')
    .select(`
      *,
      usuario:usuario_id (
        id,
        correo,
        nombre,
        rol
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
 * Obtener cliente por usuario_id
 */
export async function obtenerClientePorUsuarioId(usuarioId: string): Promise<Cliente | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .eq('usuario_id', usuarioId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }

  return data
}

/**
 * Crear cliente
 * Nota: La creación del usuario se hace a través de un API route
 */
export async function crearCliente(datos: CrearCliente): Promise<Cliente> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('clientes')
    .insert(datos)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Actualizar cliente
 */
export async function actualizarCliente(
  id: string,
  datos: ActualizarCliente
): Promise<Cliente> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('clientes')
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
 * Eliminar cliente
 */
export async function eliminarCliente(id: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.from('clientes').delete().eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

/**
 * Buscar clientes por nombre
 */
export async function buscarClientes(termino: string): Promise<Cliente[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .or(`nombre_empresa.ilike.%${termino}%,correo_contacto.ilike.%${termino}%`)
    .order('nombre_empresa', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Obtener estadísticas del cliente
 */
export async function obtenerEstadisticasCliente(clienteId: string) {
  const supabase = createClient()

  // Total de requerimientos
  const { count: totalRequerimientos } = await supabase
    .from('requerimientos_cliente')
    .select('*', { count: 'exact', head: true })
    .eq('cliente_id', clienteId)

  // Requerimientos obligatorios
  const { count: requerimientosObligatorios } = await supabase
    .from('requerimientos_cliente')
    .select('*', { count: 'exact', head: true })
    .eq('cliente_id', clienteId)
    .eq('obligatorio', true)

  // Documentos por estado
  const { data: documentos } = await supabase
    .from('documentos')
    .select('estado, requerimiento_cliente_id!inner(cliente_id)')
    .eq('requerimiento_cliente_id.cliente_id', clienteId)
    .eq('eliminado', false)

  const documentosPendientes = documentos?.filter((d) => d.estado === 'pendiente').length || 0
  const documentosAprobados = documentos?.filter((d) => d.estado === 'aprobado').length || 0
  const documentosRechazados = documentos?.filter((d) => d.estado === 'rechazado').length || 0

  // Certificados activos
  const { count: certificadosActivos } = await supabase
    .from('certificados')
    .select('*', { count: 'exact', head: true })
    .eq('cliente_id', clienteId)
    .eq('estado', 'activo')

  return {
    total_requerimientos: totalRequerimientos || 0,
    requerimientos_obligatorios: requerimientosObligatorios || 0,
    documentos_pendientes: documentosPendientes,
    documentos_aprobados: documentosAprobados,
    documentos_rechazados: documentosRechazados,
    certificados_activos: certificadosActivos || 0,
  }
}

/**
 * Asignar o crear usuario para un cliente
 */
export async function asignarUsuarioACliente(
  clienteId: string,
  datos: { correo: string; password: string; nombre?: string }
): Promise<Cliente> {
  const response = await fetch(`/api/clientes/${clienteId}/asignar-usuario`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(datos),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || 'Error al asignar usuario')
  }

  return result.data
}
