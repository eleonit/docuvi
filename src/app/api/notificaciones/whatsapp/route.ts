/**
 * API Endpoint: Enviar notificaciones por WhatsApp
 * POST /api/notificaciones/whatsapp
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Tipos de WhatsApp
interface WhatsAppMessage {
  to: string // Número de WhatsApp (formato internacional, ej: +5215512345678)
  message: string
  clienteId?: string
  documentoId?: string
}

/**
 * Enviar mensaje de WhatsApp usando Twilio
 */
async function enviarWhatsAppTwilio(to: string, message: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM // ej: whatsapp:+14155238886

  if (!accountSid || !authToken || !whatsappFrom) {
    throw new Error('Credenciales de Twilio no configuradas')
  }

  // Asegurar formato correcto (agregar whatsapp: prefix)
  const toWhatsApp = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`

  const params = new URLSearchParams({
    From: whatsappFrom,
    To: toWhatsApp,
    Body: message,
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
    },
    body: params.toString(),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(`Error de Twilio: ${errorData.message || response.statusText}`)
  }

  return await response.json()
}

/**
 * POST - Enviar notificación por WhatsApp
 */
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
        { error: 'Solo revisores pueden enviar notificaciones' },
        { status: 403 }
      )
    }

    // Obtener datos del request
    const body: WhatsAppMessage = await request.json()
    const { to, message, clienteId } = body

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: to, message' },
        { status: 400 }
      )
    }

    // Si se proporciona clienteId, verificar configuración
    if (clienteId) {
      const { data: cliente } = await supabase
        .from('clientes')
        .select('notificar_whatsapp, whatsapp_contacto')
        .eq('id', clienteId)
        .single()

      if (!cliente?.notificar_whatsapp) {
        return NextResponse.json(
          { error: 'El cliente no acepta notificaciones por WhatsApp' },
          { status: 400 }
        )
      }

      // Validar que el número coincida
      if (cliente.whatsapp_contacto && cliente.whatsapp_contacto !== to) {
        return NextResponse.json(
          { error: 'El número de WhatsApp no coincide con el registrado' },
          { status: 400 }
        )
      }
    }

    // Enviar mensaje por WhatsApp
    const resultado = await enviarWhatsAppTwilio(to, message)

    // Registrar en auditoría
    await supabase.from('auditoria').insert({
      actor_id: user.id,
      accion: 'ENVIAR_WHATSAPP',
      entidad: 'notificaciones',
      entidad_id: resultado.sid || null,
      datos: {
        to,
        mensaje: message,
        cliente_id: clienteId,
        resultado: resultado,
      },
    })

    return NextResponse.json({
      success: true,
      messageSid: resultado.sid,
      status: resultado.status,
    })
  } catch (error: any) {
    console.error('Error al enviar WhatsApp:', error)
    return NextResponse.json(
      {
        error: 'Error al enviar notificación',
        details: error.message,
      },
      { status: 500 }
    )
  }
}

/**
 * GET - Verificar configuración de WhatsApp
 */
export async function GET() {
  const configured = !!(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_WHATSAPP_FROM
  )

  return NextResponse.json({
    configured,
    provider: 'Twilio',
  })
}
