/**
 * Generador de PDF para Certificados de Cumplimiento
 * Diseño basado en el sistema de referencia
 */

import { jsPDF } from 'jspdf'
import QRCode from 'qrcode'
import type { CertificadoConRelaciones } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Formatea una fecha para el PDF
 */
function formatearFechaPDF(fecha: string | Date): string {
  const date = typeof fecha === 'string' ? new Date(fecha) : fecha
  return format(date, "d 'de' MMMM 'de' yyyy", { locale: es })
}

/**
 * Genera el certificado PDF con diseño profesional
 */
export async function generarCertificadoPDF(certificado: CertificadoConRelaciones) {
  const doc = new jsPDF()

  // Configuración
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 20
  let y = 0

  // ===================================
  // HEADER - Barra verde superior
  // ===================================
  doc.setFillColor(34, 197, 94) // green-500
  doc.rect(0, 0, pageWidth, 12, 'F')

  y = 30

  // ===================================
  // TÍTULO PRINCIPAL
  // ===================================
  doc.setFontSize(26)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(59, 130, 246) // blue-500
  doc.text('CERTIFICADO DE CUMPLIMIENTO', pageWidth / 2, y, { align: 'center' })

  y += 8
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text('Sistema de Control Documental', pageWidth / 2, y, { align: 'center' })

  y += 15

  // ===================================
  // LÍNEA SEPARADORA
  // ===================================
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.5)
  doc.line(margin, y, pageWidth - margin, y)

  y += 10

  // ===================================
  // CÓDIGO DE CERTIFICADO (destacado)
  // ===================================
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Código de Certificado:', margin, y)

  doc.setTextColor(59, 130, 246) // blue-500
  doc.setFontSize(12)
  doc.text(certificado.codigo, margin + 50, y)

  y += 10

  // ===================================
  // INFORMACIÓN EN DOS COLUMNAS
  // ===================================
  const col1X = margin
  const col2X = pageWidth / 2 + 10

  // COLUMNA IZQUIERDA
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Empresa:', col1X, y)
  doc.setFont('helvetica', 'normal')
  const nombreEmpresa = certificado.cliente?.nombre_empresa || 'N/A'
  doc.text(nombreEmpresa.substring(0, 40), col1X + 20, y)

  // COLUMNA DERECHA
  doc.setFont('helvetica', 'bold')
  doc.text('Emitido por:', col2X, y)
  doc.setFont('helvetica', 'normal')
  const nombreEmisor = certificado.emisor?.nombre || 'Docuvi - Revisor'
  doc.text(nombreEmisor.substring(0, 35), col2X + 25, y)

  y += 7

  // COLUMNA IZQUIERDA
  doc.setFont('helvetica', 'bold')
  doc.text('Contacto:', col1X, y)
  doc.setFont('helvetica', 'normal')
  const correoContacto = certificado.cliente?.correo_contacto || 'N/A'
  doc.text(correoContacto.substring(0, 40), col1X + 20, y)

  // COLUMNA DERECHA
  doc.setFont('helvetica', 'bold')
  doc.text('Fecha de Emisión:', col2X, y)
  doc.setFont('helvetica', 'normal')
  doc.text(formatearFechaPDF(certificado.fecha_emision), col2X + 35, y)

  y += 7

  // COLUMNA IZQUIERDA
  if (certificado.cliente?.telefono_contacto) {
    doc.setFont('helvetica', 'bold')
    doc.text('Teléfono:', col1X, y)
    doc.setFont('helvetica', 'normal')
    doc.text(certificado.cliente.telefono_contacto, col1X + 20, y)
  }

  // COLUMNA DERECHA
  doc.setFont('helvetica', 'bold')
  doc.text('Válido hasta:', col2X, y)
  doc.setFont('helvetica', 'normal')
  doc.text(formatearFechaPDF(certificado.fecha_validez_hasta), col2X + 25, y)

  y += 15

  // ===================================
  // BOX VERDE - CUMPLIMIENTO CERTIFICADO
  // ===================================
  const boxHeight = 20
  doc.setFillColor(34, 197, 94, 20) // green con transparencia
  doc.setDrawColor(34, 197, 94)
  doc.setLineWidth(0.8)
  doc.roundedRect(margin, y, pageWidth - 2 * margin, boxHeight, 3, 3, 'FD')

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(22, 163, 74) // green-600
  doc.text('CUMPLIMIENTO CERTIFICADO', pageWidth / 2, y + 7, { align: 'center' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(60, 60, 60)
  const textoConformidad = `Se certifica que ${nombreEmpresa} ha cumplido satisfactoriamente con todos`
  doc.text(textoConformidad, pageWidth / 2, y + 13, { align: 'center' })
  doc.text('los requerimientos documentales establecidos, según se detalla a continuación.', pageWidth / 2, y + 17, { align: 'center' })

  y += boxHeight + 12

  // ===================================
  // DOCUMENTOS CERTIFICADOS
  // ===================================
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(59, 130, 246) // blue-500
  doc.text('Documentos Certificados', margin, y)

  y += 8

  // TABLA DE DOCUMENTOS
  const tableStartY = y
  const colWidths = {
    num: 10,
    tipo: 75,
    aprobacion: 45,
    vencimiento: 45,
  }

  // Header de la tabla
  doc.setFillColor(59, 130, 246) // blue-500
  doc.rect(margin, y, pageWidth - 2 * margin, 8, 'F')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('#', margin + 2, y + 5)
  doc.text('Tipo de Documento', margin + colWidths.num + 2, y + 5)
  doc.text('Fecha Aprobación', margin + colWidths.num + colWidths.tipo + 2, y + 5)
  doc.text('Vencimiento', margin + colWidths.num + colWidths.tipo + colWidths.aprobacion + 2, y + 5)

  y += 8

  // Filas de documentos
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)

  if (certificado.detalles && certificado.detalles.length > 0) {
    certificado.detalles.forEach((detalle, index) => {
      // Alternar color de fondo
      if (index % 2 === 0) {
        doc.setFillColor(249, 250, 251) // gray-50
        doc.rect(margin, y, pageWidth - 2 * margin, 7, 'F')
      }

      doc.setFontSize(9)
      doc.text((index + 1).toString(), margin + 3, y + 5)

      const tipoDocumento = detalle.tipo_documento_nombre || 'N/A'
      doc.text(tipoDocumento.substring(0, 35), margin + colWidths.num + 2, y + 5)

      const fechaAprobacion = detalle.fecha_aprobacion
        ? formatearFechaPDF(detalle.fecha_aprobacion)
        : 'N/A'
      doc.text(fechaAprobacion, margin + colWidths.num + colWidths.tipo + 2, y + 5)

      const vencimiento = detalle.fecha_vencimiento
        ? formatearFechaPDF(detalle.fecha_vencimiento)
        : 'Sin vencimiento'
      doc.text(vencimiento, margin + colWidths.num + colWidths.tipo + colWidths.aprobacion + 2, y + 5)

      y += 7
    })
  }

  // Borde de la tabla
  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.3)
  doc.rect(margin, tableStartY, pageWidth - 2 * margin, y - tableStartY)

  y += 10

  // Total de documentos
  doc.setFillColor(239, 246, 255) // blue-50
  doc.rect(margin, y, pageWidth - 2 * margin, 12, 'F')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(59, 130, 246)
  doc.text('Total de Documentos Certificados:', margin + 5, y + 5)
  doc.text((certificado.detalles?.length || 0).toString(), margin + 75, y + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(60, 60, 60)
  doc.text('Todos los documentos han sido revisados y aprobados satisfactoriamente.', margin + 5, y + 9)

  y += 20

  // ===================================
  // VERIFICACIÓN DE AUTENTICIDAD
  // ===================================
  const verificationBoxY = y
  const verificationBoxHeight = 50

  doc.setDrawColor(200, 200, 200)
  doc.setLineWidth(0.5)
  doc.rect(margin, verificationBoxY, pageWidth - 2 * margin, verificationBoxHeight)

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(59, 130, 246)
  doc.text('VERIFICACIÓN DE AUTENTICIDAD', pageWidth / 2, verificationBoxY + 8, { align: 'center' })

  // Generar código QR
  try {
    const urlVerificacion = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verificar/${certificado.codigo}`
    const qrCodeDataUrl = await QRCode.toDataURL(urlVerificacion, {
      width: 200,
      margin: 1,
    })

    // QR a la izquierda
    const qrSize = 35
    const qrX = margin + 10
    const qrY = verificationBoxY + 12

    doc.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize)

    // Texto a la derecha del QR
    const textX = qrX + qrSize + 10
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(60, 60, 60)
    doc.text('Escanea el código QR para verificar', textX, qrY + 5)
    doc.text('la autenticidad de este certificado.', textX, qrY + 10)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text('Hash de Verificación:', textX, qrY + 18)

    doc.setFont('courier', 'normal')
    doc.setFontSize(7)
    const hashLine1 = certificado.hash.substring(0, 32)
    const hashLine2 = certificado.hash.substring(32, 64)
    doc.text(hashLine1, textX, qrY + 23)
    doc.text(hashLine2, textX, qrY + 27)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(100, 100, 100)
    doc.setFont('helvetica', 'italic')
    doc.text('También puedes verificar en:', textX, qrY + 33)
    doc.setTextColor(59, 130, 246)
    doc.text(urlVerificacion.replace('http://', '').replace('https://', ''), textX, qrY + 37)

  } catch (error) {
    console.error('Error generando QR:', error)
  }

  // ===================================
  // FOOTER
  // ===================================
  const footerY = pageHeight - 25

  doc.setFontSize(7)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(100, 100, 100)

  const disclaimer1 = 'Este certificado es válido únicamente durante el período especificado y puede ser revocado en cualquier momento.'
  const disclaimer2 = 'Para verificar su vigencia, consulte el sistema de verificación en línea utilizando el código QR o el hash proporcionado.'

  doc.text(disclaimer1, pageWidth / 2, footerY, { align: 'center' })
  doc.text(disclaimer2, pageWidth / 2, footerY + 4, { align: 'center' })

  // Línea separadora del footer
  doc.setDrawColor(200, 200, 200)
  doc.line(margin, footerY + 8, pageWidth - margin, footerY + 8)

  // Footer con información del sistema
  doc.setFillColor(59, 130, 246)
  doc.rect(0, pageHeight - 12, pageWidth, 12, 'F')

  doc.setFontSize(7)
  doc.setTextColor(255, 255, 255)
  const fechaGeneracion = format(new Date(), "dd/MM/yyyy, HH:mm:ss")
  doc.text(
    `Documento generado electrónicamente el ${fechaGeneracion} - Sistema de Control Documental`,
    pageWidth / 2,
    pageHeight - 6,
    { align: 'center' }
  )

  // ===================================
  // GUARDAR PDF
  // ===================================
  const nombreEmpresaClean = (certificado.cliente?.nombre_empresa || 'Certificado')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 30)

  doc.save(`Certificado_${certificado.codigo}_${nombreEmpresaClean}.pdf`)
}
