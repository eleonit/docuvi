/**
 * Edge Function: Verificar documentos próximos a vencer
 * Se ejecuta periódicamente vía cron job
 *
 * Configura en Supabase Dashboard:
 * - Función: check-vencimientos
 * - Cron: 0 9 * * * (todos los días a las 9am)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DocumentoVencimiento {
  documento_id: string
  cliente_id: string
  cliente_nombre: string
  tipo_documento: string
  fecha_vencimiento: string
  dias_restantes: number
  whatsapp_contacto?: string
  notificar_whatsapp?: boolean
  usuario_id?: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar autorización (solo desde cron o con clave especial)
    const authHeader = req.headers.get('authorization')
    const cronSecret = Deno.env.get('CRON_SECRET')

    if (authHeader !== `Bearer ${cronSecret}`) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Crear cliente de Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Obtener documentos próximos a vencer
    const { data: documentos, error: docsError } = await supabase
      .rpc('obtener_documentos_proximos_vencer', { dias_limite: 30 })

    if (docsError) {
      throw new Error(`Error al obtener documentos: ${docsError.message}`)
    }

    console.log(`Encontrados ${documentos?.length || 0} documentos próximos a vencer`)

    if (!documentos || documentos.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          documentosEncontrados: 0,
          notificacionesEnviadas: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Obtener información adicional de clientes (WhatsApp, usuario)
    const clientesIds = [...new Set(documentos.map((d: any) => d.cliente_id))]
    const { data: clientes } = await supabase
      .from('clientes')
      .select('id, whatsapp_contacto, notificar_whatsapp, usuario_id, dias_anticipacion_vencimiento')
      .in('id', clientesIds)

    // Mapear clientes para acceso rápido
    const clientesMap = new Map(clientes?.map((c) => [c.id, c]) || [])

    let notificacionesEnviadas = 0
    let whatsappEnviados = 0

    // Procesar cada documento
    for (const doc of documentos as DocumentoVencimiento[]) {
      const cliente = clientesMap.get(doc.cliente_id)
      if (!cliente) continue

      const diasAnticipacion = cliente.dias_anticipacion_vencimiento || 7

      // Solo notificar si está dentro de los días de anticipación configurados
      if (doc.dias_restantes > diasAnticipacion) {
        continue
      }

      const mensaje = `⚠️ *Documento próximo a vencer*\n\n` +
        `Cliente: ${doc.cliente_nombre}\n` +
        `Documento: ${doc.tipo_documento}\n` +
        `Vence: ${new Date(doc.fecha_vencimiento).toLocaleDateString('es-MX')}\n` +
        `Días restantes: ${doc.dias_restantes}\n\n` +
        `Por favor, renueva este documento a la brevedad.`

      // 1. Crear notificación en la plataforma
      if (cliente.usuario_id) {
        const { error: notifError } = await supabase
          .from('notificaciones')
          .insert({
            usuario_id: cliente.usuario_id,
            tipo: 'documento_proximo_vencer',
            titulo: `Documento ${doc.tipo_documento} próximo a vencer`,
            mensaje: `Tu documento ${doc.tipo_documento} vence en ${doc.dias_restantes} días (${new Date(doc.fecha_vencimiento).toLocaleDateString('es-MX')})`,
            documento_id: doc.documento_id,
            datos: {
              dias_restantes: doc.dias_restantes,
              fecha_vencimiento: doc.fecha_vencimiento,
            },
          })

        if (!notifError) {
          notificacionesEnviadas++
          console.log(`Notificación creada para usuario ${cliente.usuario_id}`)
        } else {
          console.error(`Error al crear notificación: ${notifError.message}`)
        }
      }

      // 2. Enviar WhatsApp si está configurado
      if (cliente.notificar_whatsapp && cliente.whatsapp_contacto) {
        try {
          const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
          const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
          const twilioWhatsappFrom = Deno.env.get('TWILIO_WHATSAPP_FROM')

          if (twilioAccountSid && twilioAuthToken && twilioWhatsappFrom) {
            const whatsappTo = cliente.whatsapp_contacto.startsWith('whatsapp:')
              ? cliente.whatsapp_contacto
              : `whatsapp:${cliente.whatsapp_contacto}`

            const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`
            const params = new URLSearchParams({
              From: twilioWhatsappFrom,
              To: whatsappTo,
              Body: mensaje,
            })

            const response = await fetch(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Authorization:
                  'Basic ' +
                  btoa(`${twilioAccountSid}:${twilioAuthToken}`),
              },
              body: params.toString(),
            })

            if (response.ok) {
              whatsappEnviados++
              console.log(`WhatsApp enviado a ${cliente.whatsapp_contacto}`)
            } else {
              const errorData = await response.json()
              console.error(`Error al enviar WhatsApp: ${errorData.message}`)
            }
          }
        } catch (whatsappError: any) {
          console.error(`Error en envío de WhatsApp: ${whatsappError.message}`)
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        documentosEncontrados: documentos.length,
        notificacionesEnviadas,
        whatsappEnviados,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('Error en check-vencimientos:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
