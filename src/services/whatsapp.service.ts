/**
 * Servicio de WhatsApp
 * Maneja el envío de notificaciones por WhatsApp
 */

/**
 * Verificar si WhatsApp está configurado
 */
export async function verificarConfiguracionWhatsApp(): Promise<{
  configured: boolean
  provider: string
}> {
  const response = await fetch('/api/notificaciones/whatsapp', {
    method: 'GET',
  })

  if (!response.ok) {
    throw new Error('Error al verificar configuración de WhatsApp')
  }

  return await response.json()
}

/**
 * Enviar mensaje de WhatsApp
 */
export async function enviarWhatsApp(
  to: string,
  message: string,
  clienteId?: string,
  documentoId?: string
): Promise<{
  success: boolean
  messageSid?: string
  status?: string
  error?: string
}> {
  const response = await fetch('/api/notificaciones/whatsapp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to,
      message,
      clienteId,
      documentoId,
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || 'Error al enviar WhatsApp')
  }

  return data
}

/**
 * Enviar notificación de documento aprobado
 */
export async function notificarDocumentoAprobado(
  clienteWhatsapp: string,
  clienteNombre: string,
  tipoDocumento: string,
  clienteId: string,
  documentoId: string
): Promise<void> {
  const mensaje = `✅ *Documento Aprobado*\n\n` +
    `Hola ${clienteNombre},\n\n` +
    `Tu documento *${tipoDocumento}* ha sido aprobado exitosamente.\n\n` +
    `Puedes verlo en tu panel de Docuvi.`

  await enviarWhatsApp(clienteWhatsapp, mensaje, clienteId, documentoId)
}

/**
 * Enviar notificación de documento rechazado
 */
export async function notificarDocumentoRechazado(
  clienteWhatsapp: string,
  clienteNombre: string,
  tipoDocumento: string,
  motivoRechazo: string,
  clienteId: string,
  documentoId: string
): Promise<void> {
  const mensaje = `❌ *Documento Rechazado*\n\n` +
    `Hola ${clienteNombre},\n\n` +
    `Tu documento *${tipoDocumento}* ha sido rechazado.\n\n` +
    `Motivo: ${motivoRechazo}\n\n` +
    `Por favor, corrige y vuelve a subirlo en tu panel de Docuvi.`

  await enviarWhatsApp(clienteWhatsapp, mensaje, clienteId, documentoId)
}

/**
 * Enviar notificación de documento próximo a vencer
 */
export async function notificarDocumentoProximoVencer(
  clienteWhatsapp: string,
  clienteNombre: string,
  tipoDocumento: string,
  fechaVencimiento: Date,
  diasRestantes: number,
  clienteId: string,
  documentoId: string
): Promise<void> {
  const mensaje = `⚠️ *Documento Próximo a Vencer*\n\n` +
    `Hola ${clienteNombre},\n\n` +
    `Tu documento *${tipoDocumento}* vence en *${diasRestantes} días*.\n` +
    `Fecha de vencimiento: ${fechaVencimiento.toLocaleDateString('es-MX')}\n\n` +
    `Por favor, renueva este documento lo antes posible en tu panel de Docuvi.`

  await enviarWhatsApp(clienteWhatsapp, mensaje, clienteId, documentoId)
}

/**
 * Enviar notificación de certificado emitido
 */
export async function notificarCertificadoEmitido(
  clienteWhatsapp: string,
  clienteNombre: string,
  codigoCertificado: string,
  fechaValidezHasta: Date,
  clienteId: string
): Promise<void> {
  const mensaje = `🎉 *Certificado Emitido*\n\n` +
    `Felicidades ${clienteNombre},\n\n` +
    `Se ha emitido tu certificado de cumplimiento.\n\n` +
    `Código: *${codigoCertificado}*\n` +
    `Válido hasta: ${fechaValidezHasta.toLocaleDateString('es-MX')}\n\n` +
    `Descárgalo desde tu panel de Docuvi.`

  await enviarWhatsApp(clienteWhatsapp, mensaje, clienteId)
}
