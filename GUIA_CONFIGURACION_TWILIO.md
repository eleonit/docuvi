# Guía Paso a Paso: Configuración de Twilio para WhatsApp

**Última actualización:** 28 de Noviembre, 2025
**Tiempo estimado:** 15-20 minutos

---

## 📊 Estado Actual de tu Configuración

```
┌─────────────────────────────────────────────────┐
│  CONFIGURACIÓN ACTUAL (.env.local)              │
├─────────────────────────────────────────────────┤
│  ✅ TWILIO_ACCOUNT_SID        Configurado       │
│  ✅ TWILIO_AUTH_TOKEN         Configurado       │
│  ✅ TWILIO_WHATSAPP_FROM      Configurado       │
│  ✅ CRON_SECRET               Configurado       │
│  ❌ TWILIO_API_KEY_SID        No configurado    │
│  ❌ TWILIO_API_KEY_SECRET     No configurado    │
├─────────────────────────────────────────────────┤
│  📍 Método actual: Auth Token (Desarrollo)      │
│  🔐 Nivel de seguridad: Básico                  │
│  ✅ Estado: Funcional para desarrollo           │
└─────────────────────────────────────────────────┘
```

**Conclusión:** Tu configuración actual funciona perfectamente para **desarrollo y testing**.
Para **producción**, debes migrar a API Keys (pasos al final de esta guía).

---

## 🗺️ Mapa de Archivos del Proyecto

```
Docuvi/
├── .env.local                    👈 TUS CLAVES SECRETAS AQUÍ
├── .env.example                  📖 Plantilla de referencia
│
├── src/
│   └── app/
│       └── api/
│           └── notificaciones/
│               └── whatsapp/
│                   └── route.ts  👈 USA LAS CLAVES AQUÍ
│
└── supabase/
    └── functions/
        └── check-vencimientos/
            └── index.ts          👈 USA LAS CLAVES AQUÍ
```

---

## 📍 Paso 1: Entender Dónde se Usan las Claves

### 1.1. Archivo Principal: `route.ts`

**Ubicación:** `src/app/api/notificaciones/whatsapp/route.ts`

**Líneas 32-38:**
```typescript
// Aquí se leen las variables de entorno
const accountSid = process.env.TWILIO_ACCOUNT_SID
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM

// Soporta API Keys (preferido) o Auth Token (fallback)
const apiKeySid = process.env.TWILIO_API_KEY_SID
const apiKeySecret = process.env.TWILIO_API_KEY_SECRET
const authToken = process.env.TWILIO_AUTH_TOKEN
```

**¿Qué hace?**
1. Lee las variables de entorno del archivo `.env.local`
2. Intenta usar API Keys primero (más seguro)
3. Si no hay API Keys, usa Auth Token (tu configuración actual)
4. Construye la autenticación para Twilio

### 1.2. Edge Function: `check-vencimientos`

**Ubicación:** `supabase/functions/check-vencimientos/index.ts`

**Línea 39:**
```typescript
const cronSecret = Deno.env.get('CRON_SECRET')
```

**¿Qué hace?**
- Verifica que solo trabajos autorizados puedan ejecutar verificaciones
- Usa `CRON_SECRET` para autenticación

---

## 🔑 Paso 2: Ubicación de las Claves

### 2.1. Variables de Entorno (.env.local)

**Ubicación del archivo:** Raíz del proyecto
```
C:\Users\Prekad7010\Documents\ProyectosVSC\Docuvi\.env.local
```

**⚠️ MUY IMPORTANTE:**
- ❌ **NUNCA** subas este archivo a Git
- ❌ **NUNCA** compartas las claves con nadie
- ✅ **SIEMPRE** está incluido en `.gitignore`

### 2.2. Verificar que .env.local NO esté en Git

```bash
# Ejecuta esto en tu terminal:
git status | grep ".env.local"

# Si no aparece nada = ✅ BIEN (no está trackeado)
# Si aparece = ❌ MAL (quítalo inmediatamente)
```

---

## 🛠️ Paso 3: Configuración Actual (Auth Token)

Tu configuración actual en `.env.local` debe verse así:

```bash
# ============================================
# Twilio Configuration
# ============================================

# Account SID (empieza con AC...)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Auth Token (para desarrollo)
TWILIO_AUTH_TOKEN=tu_auth_token_real_aqui

# WhatsApp From Number
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# ============================================
# Cron Job Configuration
# ============================================
CRON_SECRET=tu_secreto_aleatorio_aqui
```

### 3.1. ¿Cómo Obtener Estas Claves?

#### Account SID y Auth Token

```
┌─────────────────────────────────────────────────────┐
│  1. Ve a https://console.twilio.com/                │
│                                                      │
│  2. Inicia sesión                                   │
│                                                      │
│  3. En el Dashboard verás:                          │
│     ┌─────────────────────────────────────┐        │
│     │ Account Info                        │        │
│     ├─────────────────────────────────────┤        │
│     │ Account SID: ACxxxxxxxxxxxx  [Copy] │ 👈 1   │
│     │ Auth Token:  **************** [Show] │ 👈 2   │
│     └─────────────────────────────────────┘        │
│                                                      │
│  4. Haz clic en [Show] para ver Auth Token          │
│  5. Copia ambos valores                             │
└─────────────────────────────────────────────────────┘
```

#### WhatsApp From Number (Sandbox)

```
┌─────────────────────────────────────────────────────┐
│  1. En Twilio Console:                              │
│     Messaging > Try it out > Send WhatsApp message  │
│                                                      │
│  2. Verás:                                          │
│     ┌──────────────────────────────────┐           │
│     │ Sandbox Number                   │           │
│     │ +1 415 523 8886                  │ 👈 Copia  │
│     │                                   │           │
│     │ Join by sending:                 │           │
│     │ join <código>                    │ 👈 Envía  │
│     └──────────────────────────────────┘           │
│                                                      │
│  3. Agrega el número a WhatsApp                     │
│  4. Envía el mensaje: join xxxx-xxxx                │
│  5. Recibirás confirmación                          │
│  6. Usa: whatsapp:+14155238886                      │
└─────────────────────────────────────────────────────┘
```

#### CRON_SECRET

```bash
# Genera un secreto aleatorio con cualquiera de estos métodos:

# Opción 1: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Opción 2: PowerShell (Windows)
[Convert]::ToBase64String((1..32|%{Get-Random -Max 256}))

# Opción 3: Inventa uno
mi_secreto_super_seguro_123456789
```

---

## 📝 Paso 4: Editar .env.local

### 4.1. Abrir el archivo

```bash
# Desde VS Code
code .env.local

# O desde cualquier editor de texto
notepad .env.local
```

### 4.2. Verificar/Actualizar valores

Tu archivo debe tener **exactamente** estas líneas con tus valores reales:

```bash
# Supabase (ya configurado)
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Twilio - REEMPLAZA LOS VALORES CON LOS TUYOS
TWILIO_ACCOUNT_SID=AC1234567890abcdef1234567890abcd      # Reemplaza esto
TWILIO_AUTH_TOKEN=1234567890abcdef1234567890abcdef      # Reemplaza esto
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886              # O tu número

# Cron
CRON_SECRET=mi_secreto_generado_aleatoriamente          # Reemplaza esto
```

### 4.3. Guardar el archivo

```
Ctrl + S (Windows/Linux)
Cmd + S (Mac)
```

---

## ✅ Paso 5: Verificar la Configuración

### 5.1. Reiniciar el servidor de desarrollo

```bash
# Detener el servidor (Ctrl + C en la terminal)
# Volver a iniciarlo
npm run dev
```

### 5.2. Probar el endpoint de verificación

**Opción A: Desde el navegador**
```
http://localhost:3000/api/notificaciones/whatsapp
```

**Respuesta esperada:**
```json
{
  "configured": true,
  "provider": "Twilio",
  "authMethod": "Auth Token (Legacy)",
  "secure": false
}
```

**Opción B: Desde PowerShell/Terminal**
```powershell
curl http://localhost:3000/api/notificaciones/whatsapp
```

### 5.3. Interpretar la respuesta

```
┌─────────────────────────────────────────────────────┐
│  "configured": true                                 │
│  ✅ Twilio está correctamente configurado          │
│                                                      │
│  "authMethod": "Auth Token (Legacy)"                │
│  ℹ️  Estás usando Auth Token (OK para desarrollo)  │
│                                                      │
│  "secure": false                                    │
│  ⚠️  Para producción, usa API Keys                 │
└─────────────────────────────────────────────────────┘
```

---

## 🧪 Paso 6: Probar Envío de WhatsApp

### 6.1. Preparar número de prueba

1. Asegúrate de haber registrado tu número en el Sandbox (Paso 3.1)
2. Tu número debe estar en formato internacional: `+5215551234567`

### 6.2. Hacer una prueba

Crea un archivo temporal `test-whatsapp.js` en la raíz:

```javascript
// test-whatsapp.js
async function testWhatsApp() {
  const response = await fetch('http://localhost:3000/api/notificaciones/whatsapp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Necesitarás un token de autenticación real aquí
      'Authorization': 'Bearer tu_token_aqui'
    },
    body: JSON.stringify({
      to: '+5215551234567',  // TU NÚMERO REGISTRADO EN SANDBOX
      message: '¡Hola! Esta es una prueba desde Docuvi.'
    })
  })

  const data = await response.json()
  console.log('Resultado:', data)
}

testWhatsApp()
```

```bash
# Ejecutar
node test-whatsapp.js
```

### 6.3. Verificar logs

Revisa la consola del servidor de desarrollo para ver:

```
✅ Token próximo a expirar, refrescando...
✅ Sesión refrescada automáticamente
📤 Enviando WhatsApp a: whatsapp:+5215551234567
✅ WhatsApp enviado exitosamente
```

---

## 🔐 Paso 7: Migrar a API Keys (Producción)

### 7.1. ¿Cuándo migrar?

Migra a API Keys cuando:
- ✅ Vayas a deployar a producción
- ✅ Tengas más de un desarrollador
- ✅ Necesites rotar credenciales
- ✅ Quieras mayor seguridad

### 7.2. Crear API Keys en Twilio

```
┌─────────────────────────────────────────────────────┐
│  PASO 1: Acceder a API Keys                         │
├─────────────────────────────────────────────────────┤
│  1. Ve a https://console.twilio.com/                │
│  2. Account > API Keys & Tokens                     │
│  3. Click "Create API Key"                          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  PASO 2: Configurar la API Key                      │
├─────────────────────────────────────────────────────┤
│  Friendly Name:  Docuvi Production                  │
│  Key Type:       [x] Standard                       │
│                  [ ] Restricted                     │
│                                                      │
│  [Create API Key]                                   │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  PASO 3: Copiar credenciales                        │
├─────────────────────────────────────────────────────┤
│  ⚠️  ESTAS CREDENCIALES SE MUESTRAN SOLO UNA VEZ   │
│                                                      │
│  API Key SID:    SKxxxxxxxxxxxxxxxx  [Copy] 👈 1    │
│  API Key Secret: xxxxxxxxxxxxxxxxxx  [Copy] 👈 2    │
│                                                      │
│  [Done]                                             │
└─────────────────────────────────────────────────────┘
```

### 7.3. Actualizar .env.local

```bash
# ANTES (Auth Token)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=tu_auth_token              # ❌ Quitar/comentar
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# DESPUÉS (API Keys)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_API_KEY_SID=SKxxxxxxxxxxxxx           # ✅ Agregar
TWILIO_API_KEY_SECRET=tu_secret_aqui         # ✅ Agregar
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
# TWILIO_AUTH_TOKEN=tu_auth_token            # Comentado
```

### 7.4. Verificar migración exitosa

```bash
curl http://localhost:3000/api/notificaciones/whatsapp
```

**Respuesta esperada:**
```json
{
  "configured": true,
  "provider": "Twilio",
  "authMethod": "API Keys (Recommended)",  👈 Cambió
  "secure": true                            👈 Ahora es true
}
```

---

## 🚨 Solución de Problemas

### Error: "Credenciales de Twilio no configuradas"

```
❌ Problema: Las variables de entorno no se están leyendo

✅ Solución:
1. Verifica que .env.local esté en la raíz del proyecto
2. Reinicia el servidor: Ctrl+C y npm run dev
3. Verifica que no haya espacios extras en las variables
4. Confirma que las variables empiecen con TWILIO_ (mayúsculas)
```

### Error: "Error 21608: The number is not registered"

```
❌ Problema: El número receptor no está registrado en el Sandbox

✅ Solución:
1. Agrega +1 415 523 8886 a tus contactos de WhatsApp
2. Envíale el mensaje: join xxxx-xxxx (código de tu sandbox)
3. Espera confirmación: "You are all set!"
4. Intenta de nuevo
```

### Error: "Error 21211: Invalid 'To' Phone Number"

```
❌ Problema: Formato de número incorrecto

✅ Solución:
Usa formato internacional: +5215551234567
  ✅ Correcto: +5215551234567
  ❌ Incorrecto: 5551234567
  ❌ Incorrecto: +52 1 555 123 4567 (con espacios)
  ❌ Incorrecto: (555) 123-4567
```

### Error: "Unauthorized" al hacer POST

```
❌ Problema: Falta token de autenticación o usuario no es revisor

✅ Solución:
1. Asegúrate de estar autenticado en la app
2. Obtén tu token desde las DevTools:
   - F12 > Application > Storage > Local Storage
   - Busca el token de Supabase
3. O inicia sesión con un usuario de rol "revisor"
```

### No llega el mensaje de WhatsApp

```
❌ Problema: Mensaje enviado pero no recibido

✅ Diagnóstico:
1. Ve a https://console.twilio.com/monitor/logs/sms
2. Busca tu mensaje reciente
3. Revisa el estado:
   - "sent" = enviado correctamente
   - "delivered" = entregado
   - "failed" = falló (revisa el error)
   - "undelivered" = no entregado

✅ Causas comunes:
- Número no registrado en Sandbox
- Formato de número incorrecto
- WhatsApp bloqueado en el dispositivo
- Número inválido o desconectado
```

---

## 📋 Checklist Final

### Para Desarrollo
- [x] `.env.local` existe en la raíz
- [x] `TWILIO_ACCOUNT_SID` configurado
- [x] `TWILIO_AUTH_TOKEN` configurado
- [x] `TWILIO_WHATSAPP_FROM` configurado
- [x] `CRON_SECRET` configurado
- [ ] Servidor reiniciado después de cambios
- [ ] Endpoint de verificación devuelve `configured: true`
- [ ] Número de prueba registrado en Sandbox
- [ ] Mensaje de prueba enviado y recibido

### Para Producción
- [ ] API Keys creadas en Twilio Console
- [ ] `TWILIO_API_KEY_SID` configurado
- [ ] `TWILIO_API_KEY_SECRET` configurado
- [ ] Auth Token comentado/removido
- [ ] WhatsApp Business aprobado (no Sandbox)
- [ ] Número de producción configurado
- [ ] Variables de entorno en plataforma de deploy (Vercel, Railway, etc.)
- [ ] Endpoint devuelve `"secure": true`
- [ ] Logs de monitoreo configurados

---

## 📚 Resumen de Variables

| Variable | Requerida | Dónde Obtenerla | Ejemplo |
|----------|-----------|-----------------|---------|
| `TWILIO_ACCOUNT_SID` | ✅ Siempre | Twilio Dashboard | `AC1234567890abcdef...` |
| `TWILIO_AUTH_TOKEN` | ⚠️ Solo desarrollo | Twilio Dashboard (Show) | `1234567890abcdef...` |
| `TWILIO_API_KEY_SID` | ✅ Producción | Crear en API Keys | `SK1234567890abcdef...` |
| `TWILIO_API_KEY_SECRET` | ✅ Producción | Crear en API Keys | `xxxxxxxxxxxx` |
| `TWILIO_WHATSAPP_FROM` | ✅ Siempre | Sandbox o Business | `whatsapp:+14155238886` |
| `CRON_SECRET` | ✅ Siempre | Generar aleatorio | `base64_random_string` |

---

## 🔗 Enlaces Útiles

- [Twilio Console](https://console.twilio.com/)
- [Crear API Keys](https://console.twilio.com/project/api-keys)
- [WhatsApp Sandbox](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)
- [Twilio Logs](https://console.twilio.com/monitor/logs/sms)
- [Documentación API Keys](https://www.twilio.com/docs/iam/api-keys)
- [Códigos de Error Twilio](https://www.twilio.com/docs/api/errors)

---

## 💬 ¿Necesitas Ayuda?

Si tienes problemas:

1. ✅ Revisa la sección "Solución de Problemas" arriba
2. ✅ Verifica el Checklist Final
3. ✅ Consulta los logs de Twilio Console
4. ✅ Revisa la documentación del archivo `VERIFICACION_WHATSAPP_TWILIO.md`

---

**Última verificación:** 28 de Noviembre, 2025
**Versión:** 1.0.0
