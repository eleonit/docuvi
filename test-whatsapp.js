/**
 * Script de Prueba: Envío de WhatsApp
 *
 * ANTES DE EJECUTAR:
 * 1. Asegúrate de que el servidor esté corriendo (npm run dev)
 * 2. Cambia el número de teléfono abajo por el tuyo
 * 3. Asegúrate de que tu número esté registrado en el Sandbox de Twilio
 */

const NUMERO_PRUEBA = '+5215551234567' // ⚠️ CAMBIA ESTO POR TU NÚMERO

const API_URL = 'http://localhost:3003/api/notificaciones/whatsapp'

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

async function testWhatsApp() {
  log('\n🚀 Iniciando prueba de WhatsApp...', 'blue')
  log('─'.repeat(60), 'blue')

  // Paso 1: Verificar configuración
  log('\n📋 Paso 1: Verificando configuración de Twilio...', 'yellow')
  try {
    const configResponse = await fetch(API_URL)
    const config = await configResponse.json()

    log(`✓ Configurado: ${config.configured}`, 'green')
    log(`✓ Proveedor: ${config.provider}`, 'green')
    log(`✓ Método: ${config.authMethod}`, config.secure ? 'green' : 'yellow')

    if (!config.configured) {
      log('\n❌ Error: Twilio no está configurado correctamente', 'red')
      log('Revisa tu archivo .env.local', 'red')
      return
    }
  } catch (error) {
    log('\n❌ Error al verificar configuración:', 'red')
    log(error.message, 'red')
    log('\n💡 Tip: ¿Está el servidor corriendo? (npm run dev)', 'yellow')
    return
  }

  // Paso 2: Validar número
  log('\n📱 Paso 2: Validando número de destino...', 'yellow')
  const phoneRegex = /^\+[1-9]\d{1,14}$/

  if (NUMERO_PRUEBA === '+5215551234567') {
    log('\n⚠️  ADVERTENCIA: Estás usando el número de ejemplo!', 'yellow')
    log('Cambia NUMERO_PRUEBA en este archivo por tu número real', 'yellow')
    log('Formato: +52XXXXXXXXXX (con código de país)', 'yellow')
    log('\nContinuando con el número de ejemplo...', 'yellow')
  }

  if (!phoneRegex.test(NUMERO_PRUEBA)) {
    log(`\n❌ Número inválido: ${NUMERO_PRUEBA}`, 'red')
    log('El número debe estar en formato internacional: +5215551234567', 'red')
    return
  }

  log(`✓ Número válido: ${NUMERO_PRUEBA}`, 'green')

  // Paso 3: Preparar mensaje
  log('\n✉️  Paso 3: Preparando mensaje de prueba...', 'yellow')
  const mensaje = `🎉 *Prueba de Docuvi*

¡Hola! Este es un mensaje de prueba del sistema de notificaciones de WhatsApp.

Si recibes este mensaje, significa que todo está funcionando correctamente.

✅ Twilio configurado
✅ WhatsApp funcionando
✅ Sistema operativo

Fecha: ${new Date().toLocaleString('es-MX')}

---
Sistema Docuvi - Gestión Documental`

  log('✓ Mensaje preparado', 'green')

  // Paso 4: Intentar envío (sin autenticación - solo para probar conectividad)
  log('\n📤 Paso 4: Enviando mensaje...', 'yellow')
  log('⚠️  Nota: Esta prueba requiere autenticación de revisor', 'yellow')

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: NUMERO_PRUEBA,
        message: mensaje,
      }),
    })

    const data = await response.json()

    if (response.ok) {
      log('\n✅ ¡Mensaje enviado exitosamente!', 'green')
      log('─'.repeat(60), 'green')
      log(`📱 Número destino: ${NUMERO_PRUEBA}`, 'green')
      log(`📝 Message SID: ${data.messageSid}`, 'green')
      log(`📊 Estado: ${data.status}`, 'green')
      log('\n💡 Revisa tu WhatsApp para ver el mensaje', 'magenta')
      log('\n🔍 Puedes ver el estado en Twilio Console:', 'blue')
      log('https://console.twilio.com/monitor/logs/sms', 'blue')
    } else {
      log('\n❌ Error al enviar mensaje:', 'red')
      log(`Estado HTTP: ${response.status}`, 'red')
      log(`Error: ${data.error}`, 'red')

      if (data.details) {
        log(`Detalles: ${data.details}`, 'red')
      }

      // Mostrar soluciones comunes
      log('\n💡 Posibles soluciones:', 'yellow')

      if (response.status === 401) {
        log('• Necesitas estar autenticado como revisor', 'yellow')
        log('• Inicia sesión en la app primero', 'yellow')
      }

      if (data.details && data.details.includes('21608')) {
        log('• Tu número no está registrado en el Sandbox de Twilio', 'yellow')
        log('• Ve a https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn', 'yellow')
        log('• Agrega el número de Twilio a WhatsApp', 'yellow')
        log('• Envía el mensaje de registro (join xxxx-xxxx)', 'yellow')
      }

      if (data.details && data.details.includes('21211')) {
        log('• Formato de número incorrecto', 'yellow')
        log('• Usa formato internacional: +5215551234567', 'yellow')
      }
    }
  } catch (error) {
    log('\n❌ Error de conexión:', 'red')
    log(error.message, 'red')
    log('\n💡 Asegúrate de que el servidor esté corriendo', 'yellow')
  }

  log('\n' + '─'.repeat(60), 'blue')
  log('Prueba completada\n', 'blue')
}

// Ejecutar prueba
log('\n╔════════════════════════════════════════════════════════════╗', 'magenta')
log('║         PRUEBA DE NOTIFICACIONES DE WHATSAPP             ║', 'magenta')
log('╚════════════════════════════════════════════════════════════╝', 'magenta')

testWhatsApp().catch(error => {
  log('\n💥 Error inesperado:', 'red')
  console.error(error)
})
