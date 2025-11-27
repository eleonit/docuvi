/**
 * API Endpoint: Verificar documentos próximos a vencer
 * POST /api/notificaciones/check-vencimientos
 *
 * Este endpoint puede ser llamado manualmente o por un cron job externo
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que el usuario sea revisor
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (usuario?.rol !== 'revisor') {
      return NextResponse.json(
        { error: 'Solo revisores pueden ejecutar esta verificación' },
        { status: 403 }
      )
    }

    // Obtener parámetros
    const body = await request.json().catch(() => ({}))
    const diasLimite = body.diasLimite || 30

    // Obtener documentos próximos a vencer
    const { data: documentos, error: docsError } = await supabase
      .rpc('obtener_documentos_proximos_vencer', { dias_limite: diasLimite })

    if (docsError) {
      throw new Error(`Error al obtener documentos: ${docsError.message}`)
    }

    if (!documentos || documentos.length === 0) {
      return NextResponse.json({
        success: true,
        documentosEncontrados: 0,
        notificacionesCreadas: 0,
        mensaje: 'No hay documentos próximos a vencer',
      })
    }

    // Obtener información de clientes
    const clientesIds = [...new Set(documentos.map((d: any) => d.cliente_id))]
    const { data: clientes } = await supabase
      .from('clientes')
      .select('id, nombre_empresa, usuario_id, dias_anticipacion_vencimiento')
      .in('id', clientesIds)

    const clientesMap = new Map(clientes?.map((c) => [c.id, c]) || [])

    let notificacionesCreadas = 0
    const notificacionesPendientes: any[] = []

    // Verificar notificaciones existentes para evitar duplicados
    const { data: notifExistentes } = await supabase
      .from('notificaciones')
      .select('documento_id')
      .eq('tipo', 'documento_proximo_vencer')
      .in('documento_id', documentos.map((d: any) => d.documento_id))
      .gte('creado_en', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Últimas 24 horas

    const documentosConNotificacion = new Set(
      notifExistentes?.map((n) => n.documento_id) || []
    )

    // Procesar cada documento
    for (const doc of documentos) {
      const cliente = clientesMap.get(doc.cliente_id)
      if (!cliente || !cliente.usuario_id) continue

      const diasAnticipacion = cliente.dias_anticipacion_vencimiento || 7

      // Solo notificar si está dentro de los días de anticipación configurados
      if (doc.dias_restantes > diasAnticipacion) {
        continue
      }

      // Evitar duplicados
      if (documentosConNotificacion.has(doc.documento_id)) {
        continue
      }

      // Preparar notificación
      notificacionesPendientes.push({
        usuario_id: cliente.usuario_id,
        tipo: 'documento_proximo_vencer',
        titulo: `Documento ${doc.tipo_documento} próximo a vencer`,
        mensaje: `El documento ${doc.tipo_documento} del cliente ${doc.cliente_nombre} vence en ${doc.dias_restantes} días (${new Date(doc.fecha_vencimiento).toLocaleDateString('es-MX')})`,
        documento_id: doc.documento_id,
        datos: {
          dias_restantes: doc.dias_restantes,
          fecha_vencimiento: doc.fecha_vencimiento,
          cliente_nombre: doc.cliente_nombre,
          tipo_documento: doc.tipo_documento,
        },
      })
    }

    // Crear notificaciones en lote
    if (notificacionesPendientes.length > 0) {
      const { error: insertError } = await supabase
        .from('notificaciones')
        .insert(notificacionesPendientes)

      if (insertError) {
        console.error('Error al crear notificaciones:', insertError)
      } else {
        notificacionesCreadas = notificacionesPendientes.length
      }
    }

    return NextResponse.json({
      success: true,
      documentosEncontrados: documentos.length,
      notificacionesCreadas,
      documentosProcesados: notificacionesPendientes.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Error al verificar vencimientos:', error)
    return NextResponse.json(
      {
        error: 'Error al verificar vencimientos',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

/**
 * GET - Obtener documentos próximos a vencer sin crear notificaciones
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar autenticación
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que el usuario sea revisor
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (usuario?.rol !== 'revisor') {
      return NextResponse.json(
        { error: 'Solo revisores pueden ver esta información' },
        { status: 403 }
      )
    }

    // Obtener parámetros de query
    const searchParams = request.nextUrl.searchParams
    const diasLimite = parseInt(searchParams.get('diasLimite') || '30', 10)

    // Obtener documentos próximos a vencer
    const { data: documentos, error: docsError } = await supabase
      .rpc('obtener_documentos_proximos_vencer', { dias_limite: diasLimite })

    if (docsError) {
      throw new Error(`Error al obtener documentos: ${docsError.message}`)
    }

    return NextResponse.json({
      success: true,
      documentos: documentos || [],
      count: documentos?.length || 0,
    })
  } catch (error: any) {
    console.error('Error al obtener documentos próximos a vencer:', error)
    return NextResponse.json(
      {
        error: 'Error al obtener documentos',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
