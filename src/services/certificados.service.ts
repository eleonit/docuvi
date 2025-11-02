/**
 * Servicio de Certificados
 */

import { createClient } from '@/lib/supabase/client'
import type { Certificado, CertificadoConRelaciones, CrearCertificado } from '@/types'
import { generarHash } from '@/lib/utils'

/**
 * Obtener certificados de un cliente
 */
export async function obtenerCertificadosCliente(
  clienteId: string
): Promise<CertificadoConRelaciones[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('certificados')
    .select(`
      *,
      cliente:cliente_id (
        id,
        nombre_empresa,
        correo_contacto
      ),
      emisor:emitido_por (
        id,
        nombre,
        correo
      ),
      detalles:certificados_detalle (
        id,
        tipo_documento_nombre,
        fecha_aprobacion,
        fecha_vencimiento
      )
    `)
    .eq('cliente_id', clienteId)
    .order('fecha_emision', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Obtener todos los certificados (revisor)
 */
export async function obtenerCertificados(): Promise<CertificadoConRelaciones[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('certificados')
    .select(`
      *,
      cliente:cliente_id (
        id,
        nombre_empresa
      ),
      emisor:emitido_por (
        id,
        nombre
      )
    `)
    .order('fecha_emision', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Obtener certificado por ID
 */
export async function obtenerCertificadoPorId(id: string): Promise<CertificadoConRelaciones> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('certificados')
    .select(`
      *,
      cliente:cliente_id (
        id,
        nombre_empresa,
        correo_contacto,
        telefono_contacto
      ),
      emisor:emitido_por (
        id,
        nombre,
        correo
      ),
      detalles:certificados_detalle (
        id,
        tipo_documento_nombre,
        fecha_aprobacion,
        fecha_vencimiento,
        aprobado_por,
        datos
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
 * Obtener certificado por código (verificación pública)
 */
export async function obtenerCertificadoPorCodigo(
  codigo: string
): Promise<CertificadoConRelaciones | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('certificados')
    .select(`
      *,
      cliente:cliente_id (
        id,
        nombre_empresa
      ),
      emisor:emitido_por (
        id,
        nombre
      ),
      detalles:certificados_detalle (
        id,
        tipo_documento_nombre,
        fecha_aprobacion,
        fecha_vencimiento
      )
    `)
    .eq('codigo', codigo)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw new Error(error.message)
  }

  return data
}

/**
 * Generar certificado de cumplimiento
 */
export async function generarCertificado(
  clienteId: string,
  emisorId: string,
  fechaValidezDesde: string,
  fechaValidezHasta: string
): Promise<Certificado> {
  const supabase = createClient()

  // Verificar cumplimiento del cliente
  const { data: cumplimiento } = await supabase.rpc('verificar_cumplimiento_cliente', {
    cliente_id_param: clienteId,
  })

  if (!cumplimiento || cumplimiento.length === 0 || !cumplimiento[0].cumple) {
    throw new Error('El cliente no cumple con todos los requerimientos obligatorios')
  }

  // Generar código único
  const { data: codigoData } = await supabase.rpc('generar_codigo_certificado')
  const codigo = codigoData || `CERT-${Date.now()}`

  // Obtener requerimientos y documentos aprobados
  const { data: requerimientos } = await supabase
    .from('requerimientos_cliente')
    .select(`
      id,
      tipo_documento:tipo_documento_id (
        nombre
      )
    `)
    .eq('cliente_id', clienteId)
    .eq('obligatorio', true)

  if (!requerimientos) {
    throw new Error('No se pudieron obtener los requerimientos')
  }

  // Obtener documentos aprobados para cada requerimiento
  const detalles = await Promise.all(
    requerimientos.map(async (req) => {
      const { data: doc } = await supabase
        .from('documentos')
        .select('*')
        .eq('requerimiento_cliente_id', req.id)
        .eq('estado', 'aprobado')
        .eq('eliminado', false)
        .order('version', { ascending: false })
        .limit(1)
        .single()

      return {
        requerimiento_id: req.id,
        documento_id: doc?.id,
        tipo_documento_nombre: (req.tipo_documento as any)?.nombre || 'Desconocido',
        fecha_aprobacion: doc?.fecha_aprobacion || new Date().toISOString(),
        fecha_vencimiento: doc?.fecha_vencimiento || null,
        aprobado_por: doc?.aprobado_por || emisorId,
        datos: {},
      }
    })
  )

  // Generar hash para verificación
  const dataParaHash = JSON.stringify({
    codigo,
    clienteId,
    fechaValidezDesde,
    fechaValidezHasta,
    detalles,
  })
  const hash = await generarHash(dataParaHash)

  // Crear certificado
  const certificadoData: CrearCertificado = {
    codigo,
    hash,
    cliente_id: clienteId,
    emitido_por: emisorId,
    fecha_validez_desde: fechaValidezDesde,
    fecha_validez_hasta: fechaValidezHasta,
    estado: 'activo',
    datos: {
      requerimientos_cumplidos: cumplimiento[0].requerimientos_cumplidos,
      total_requerimientos: cumplimiento[0].total_requerimientos,
    },
  }

  const { data: certificado, error: certError } = await supabase
    .from('certificados')
    .insert(certificadoData)
    .select()
    .single()

  if (certError) {
    throw new Error(certError.message)
  }

  // Crear detalles del certificado
  const detallesConCertificadoId = detalles.map((d) => ({
    ...d,
    certificado_id: certificado.id,
  }))

  const { error: detallesError } = await supabase
    .from('certificados_detalle')
    .insert(detallesConCertificadoId)

  if (detallesError) {
    // Si falla, eliminar el certificado
    await supabase.from('certificados').delete().eq('id', certificado.id)
    throw new Error(detallesError.message)
  }

  return certificado
}

/**
 * Revocar certificado
 */
export async function revocarCertificado(
  certificadoId: string,
  motivoRevocacion: string,
  revocadoPor: string
): Promise<Certificado> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('certificados')
    .update({
      estado: 'revocado',
      motivo_revocacion: motivoRevocacion,
      revocado_por: revocadoPor,
      revocado_en: new Date().toISOString(),
    })
    .eq('id', certificadoId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Verificar validez de un certificado
 */
export async function verificarCertificado(codigo: string) {
  const certificado = await obtenerCertificadoPorCodigo(codigo)

  if (!certificado) {
    return {
      valido: false,
      mensaje: 'Certificado no encontrado',
    }
  }

  if (certificado.estado === 'revocado') {
    return {
      valido: false,
      mensaje: 'Certificado revocado',
      motivo: certificado.motivo_revocacion,
      certificado,
    }
  }

  const hoy = new Date().toISOString().split('T')[0]

  if (certificado.fecha_validez_hasta < hoy) {
    return {
      valido: false,
      mensaje: 'Certificado vencido',
      certificado,
    }
  }

  if (certificado.fecha_validez_desde > hoy) {
    return {
      valido: false,
      mensaje: 'Certificado aún no válido',
      certificado,
    }
  }

  return {
    valido: true,
    mensaje: 'Certificado válido',
    certificado,
  }
}

/**
 * Actualizar certificados vencidos
 */
export async function actualizarCertificadosVencidos(): Promise<number> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('actualizar_certificados_vencidos')

  if (error) {
    throw new Error(error.message)
  }

  return data || 0
}

/**
 * Obtener certificados próximos a vencer
 */
export async function obtenerCertificadosProximosVencer(
  diasLimite = 30
): Promise<Certificado[]> {
  const supabase = createClient()

  const fechaLimite = new Date()
  fechaLimite.setDate(fechaLimite.getDate() + diasLimite)

  const { data, error } = await supabase
    .from('certificados')
    .select('*')
    .eq('estado', 'activo')
    .lte('fecha_validez_hasta', fechaLimite.toISOString().split('T')[0])
    .gte('fecha_validez_hasta', new Date().toISOString().split('T')[0])
    .order('fecha_validez_hasta', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data
}
