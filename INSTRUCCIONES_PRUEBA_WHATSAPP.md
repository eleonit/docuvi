# 📱 Instrucciones para Probar WhatsApp

**Tiempo estimado:** 5-10 minutos

---

## 🎯 Objetivo

Enviar un mensaje de prueba por WhatsApp usando Twilio para verificar que todo funciona correctamente.

---

## ✅ Pre-requisitos

Antes de empezar, asegúrate de:

1. ✅ Tener Twilio configurado (ya lo tienes ✓)
2. ✅ Servidor corriendo (`npm run dev`) - Corriendo en puerto 3003 ✓
3. ✅ Tu número registrado en Twilio Sandbox
4. ✅ WhatsApp instalado en tu teléfono

---

## 📋 Paso 1: Registrar tu Número en Twilio Sandbox

### ¿Ya registraste tu número?

Si **NO** has registrado tu número en el Sandbox de Twilio:

```
┌─────────────────────────────────────────────────────────┐
│  1. Ve a Twilio Console:                                │
│     https://console.twilio.com/                         │
│                                                          │
│  2. Navega a:                                           │
│     Messaging > Try it out > Send a WhatsApp message   │
│                                                          │
│  3. Verás algo como:                                    │
│     ┌────────────────────────────────────────┐         │
│     │ Join your Sandbox                      │         │
│     │                                         │         │
│     │ Sandbox Number: +1 415 523 8886        │ 👈     │
│     │                                         │         │
│     │ To join, send this message:            │         │
│     │ join <código-único>                    │ 👈     │
│     │                                         │         │
│     │ Example: join happy-tiger              │         │
│     └────────────────────────────────────────┘         │
│                                                          │
│  4. En tu WhatsApp:                                     │
│     • Agrega +1 415 523 8886 a tus contactos           │
│     • Envíale el mensaje: join xxxx-xxxx               │
│                                                          │
│  5. Recibirás confirmación:                             │
│     "You are all set! ✓"                                │
│                                                          │
│  6. Ahora puedes recibir mensajes de prueba            │
└─────────────────────────────────────────────────────────┘
```

---

## 🧪 Paso 2: Ejecutar la Prueba

Tienes **3 opciones** para probar:

### Opción 1: Script de Node.js (RECOMENDADO)

```bash
# 1. Edita el archivo test-whatsapp.js
# Cambia esta línea:
const NUMERO_PRUEBA = '+5215551234567'  # Por tu número real

# 2. Ejecuta el script
node test-whatsapp.js
```

**Salida esperada:**
```
╔════════════════════════════════════════════════════════════╗
║         PRUEBA DE NOTIFICACIONES DE WHATSAPP             ║
╚════════════════════════════════════════════════════════════╝

🚀 Iniciando prueba de WhatsApp...
────────────────────────────────────────────────────────────

📋 Paso 1: Verificando configuración de Twilio...
✓ Configurado: true
✓ Proveedor: Twilio
✓ Método: Auth Token (Legacy)

📱 Paso 2: Validando número de destino...
✓ Número válido: +5215551234567

✉️  Paso 3: Preparando mensaje de prueba...
✓ Mensaje preparado

📤 Paso 4: Enviando mensaje...
⚠️  Nota: Esta prueba requiere autenticación de revisor

❌ Error al enviar mensaje:
Estado HTTP: 401
Error: No autorizado

💡 Posibles soluciones:
• Necesitas estar autenticado como revisor
• Inicia sesión en la app primero
```

### Opción 2: Usar la Aplicación (MÁS FÁCIL)

```
┌─────────────────────────────────────────────────────────┐
│  1. Abre la aplicación en el navegador:                 │
│     http://localhost:3003                               │
│                                                          │
│  2. Inicia sesión con un usuario REVISOR               │
│                                                          │
│  3. Ve a la página de Clientes                         │
│                                                          │
│  4. Edita un cliente o crea uno nuevo                  │
│                                                          │
│  5. Agrega tu número en formato +52XXXXXXXXXX          │
│                                                          │
│  6. Activa "Notificar por WhatsApp"                    │
│                                                          │
│  7. Ve a la página de Revisión                         │
│                                                          │
│  8. Aprueba o rechaza un documento de ese cliente      │
│                                                          │
│  9. ¡Deberías recibir un WhatsApp automáticamente!     │
└─────────────────────────────────────────────────────────┘
```

### Opción 3: API Directa con cURL

```bash
# 1. Primero necesitas obtener un token de autenticación
# Inicia sesión en la app y abre DevTools (F12)
# Ve a: Application > Local Storage
# Copia el access_token

# 2. Ejecuta este comando (reemplaza TU_TOKEN y TU_NUMERO):
curl -X POST http://localhost:3003/api/notificaciones/whatsapp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -d '{
    "to": "+5215551234567",
    "message": "🎉 Prueba desde Docuvi!"
  }'
```

---

## ✅ Resultado Esperado

Si todo funciona correctamente:

### En la Consola:
```json
{
  "success": true,
  "messageSid": "SM1234567890abcdef1234567890abcd",
  "status": "queued"
}
```

### En tu WhatsApp:
Deberías recibir un mensaje como:

```
🎉 Prueba de Docuvi

¡Hola! Este es un mensaje de prueba del sistema de
notificaciones de WhatsApp.

Si recibes este mensaje, significa que todo está
funcionando correctamente.

✅ Twilio configurado
✅ WhatsApp funcionando
✅ Sistema operativo

Fecha: 28/11/2025 12:30:45

---
Sistema Docuvi - Gestión Documental
```

---

## 🚨 Solución de Problemas

### Error: "No autorizado" (401)

```
❌ Problema: Necesitas estar autenticado como revisor

✅ Solución:
Opción A: Usa la aplicación web (Opción 2 arriba)
Opción B: Obtén un token válido de las DevTools
```

### Error: "21608 - The number is not registered"

```
❌ Problema: Tu número no está registrado en el Sandbox

✅ Solución:
1. Ve a https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
2. Agrega +1 415 523 8886 a WhatsApp
3. Envía: join xxxx-xxxx (el código que te muestre)
4. Espera confirmación
5. Intenta de nuevo
```

### Error: "21211 - Invalid 'To' Phone Number"

```
❌ Problema: Formato de número incorrecto

✅ Solución:
Usa formato internacional con +
  ✅ Correcto: +5215551234567
  ❌ Incorrecto: 5551234567
  ❌ Incorrecto: +52 1 555 123 4567 (con espacios)
```

### No llega el mensaje

```
❌ Problema: Mensaje "enviado" pero no recibido

✅ Diagnóstico:
1. Ve a Twilio Logs: https://console.twilio.com/monitor/logs/sms
2. Busca tu mensaje por número o fecha
3. Revisa el estado:
   • "delivered" = ✅ Entregado
   • "sent" = ⏳ Enviado (espera unos segundos)
   • "failed" = ❌ Falló (revisa el error)
   • "undelivered" = ❌ No entregado

✅ Causas comunes:
• WhatsApp bloqueado en el dispositivo
• Número incorrecto
• No registrado en Sandbox
• Sin conexión a internet en el teléfono
```

---

## 📊 Verificar en Twilio Console

Para ver todos los mensajes enviados:

```
1. Ve a: https://console.twilio.com/monitor/logs/sms

2. Verás una lista de mensajes con:
   • To: Número destino
   • Status: Estado del mensaje
   • Date: Fecha de envío
   • Error Code: Código de error (si falló)

3. Haz clic en un mensaje para ver detalles completos
```

---

## 🎯 Prueba Exitosa - Checklist

Marca lo que has verificado:

- [ ] Número registrado en Twilio Sandbox
- [ ] Mensaje de confirmación "You are all set!" recibido
- [ ] Servidor corriendo en localhost:3003
- [ ] Twilio configurado (verified via GET /api/notificaciones/whatsapp)
- [ ] Script ejecutado sin errores
- [ ] Mensaje recibido en WhatsApp
- [ ] Estado "delivered" en Twilio Console

---

## 🔄 Flujo Completo de Prueba

```
┌─────────────────────────────────────────────────────────┐
│                    FLUJO DE PRUEBA                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Registrar número en Sandbox                         │
│     └─> Enviar "join xxxx-xxxx" a +1 415 523 8886      │
│                                                          │
│  2. Editar test-whatsapp.js                             │
│     └─> Cambiar NUMERO_PRUEBA por tu número            │
│                                                          │
│  3. Ejecutar script                                     │
│     └─> node test-whatsapp.js                          │
│                                                          │
│  4. Ver resultado en consola                            │
│     └─> Verificar status: "queued" o "sent"            │
│                                                          │
│  5. Esperar mensaje en WhatsApp                         │
│     └─> Debería llegar en menos de 10 segundos         │
│                                                          │
│  6. Verificar en Twilio Console                         │
│     └─> Status debe ser "delivered"                     │
│                                                          │
│  7. ✅ ¡Éxito!                                          │
│     └─> WhatsApp funcionando correctamente             │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 💡 Tips Importantes

1. **Formato del número:**
   - SIEMPRE usa formato internacional: `+52XXXXXXXXXX`
   - Sin espacios, guiones ni paréntesis
   - Incluye el código de país (+52 para México)

2. **Sandbox vs Producción:**
   - Sandbox: Solo números registrados pueden recibir
   - Producción: Cualquier número puede recibir
   - Para producción: Solicita WhatsApp Business API

3. **Límites de Twilio:**
   - Sandbox: Máximo 500 mensajes/día
   - Producción: Depende de tu plan
   - Costo: ~$0.005 USD por mensaje (producción)

4. **Tiempo de entrega:**
   - Normalmente: 1-10 segundos
   - Si tarda más: Revisa Twilio Console

---

## 📚 Siguiente Paso

Una vez que funcione la prueba:

1. ✅ Configura clientes con sus números de WhatsApp
2. ✅ Activa notificaciones automáticas
3. ✅ Los clientes recibirán avisos de:
   - Documentos aprobados
   - Documentos rechazados
   - Documentos próximos a vencer
   - Certificados emitidos

---

## 🔗 Links Útiles

- [Twilio Console](https://console.twilio.com/)
- [WhatsApp Sandbox](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)
- [Logs de Mensajes](https://console.twilio.com/monitor/logs/sms)
- [Documentación de Errores](https://www.twilio.com/docs/api/errors)

---

**¿Listo para probar?** 🚀

Ejecuta: `node test-whatsapp.js`
