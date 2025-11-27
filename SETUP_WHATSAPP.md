# Guía Rápida: Configurar Notificaciones por WhatsApp

Esta guía te ayudará a configurar las notificaciones por WhatsApp en Docuvi en **menos de 10 minutos**.

## Paso 1: Crear Cuenta en Twilio (2 minutos)

1. Ve a [twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Regístrate con tu email
3. Verifica tu número de teléfono
4. Obtienes **$15.50 USD gratis** para pruebas

## Paso 2: Obtener Credenciales (1 minuto)

1. Ve a [console.twilio.com](https://console.twilio.com/)
2. Copia tu **Account SID** (empieza con `AC...`)
3. Copia tu **Auth Token** (haz clic en "Show" para verlo)

## Paso 3: Configurar WhatsApp Sandbox (2 minutos)

1. En la consola de Twilio, ve a: **Messaging** > **Try it out** > **Send a WhatsApp message**
2. Verás un código QR y un número como `+1 415 523 8886`
3. Agrega ese número a tus contactos de WhatsApp
4. Envíale el mensaje que te indica (ej: `join <código>`)
5. Recibirás confirmación: "You are all set!"
6. Copia el número completo: `whatsapp:+14155238886`

## Paso 4: Configurar Variables de Entorno (2 minutos)

1. Abre tu archivo `.env.local`
2. Agrega estas líneas:

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx        # Pegado del Paso 2
TWILIO_AUTH_TOKEN=tu_auth_token           # Pegado del Paso 2
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886  # Pegado del Paso 3
CRON_SECRET=mi_secreto_aleatorio_123      # Inventa uno aleatorio
```

3. Guarda el archivo

## Paso 5: Ejecutar Migration de Base de Datos (1 minuto)

Opción A - Desde Supabase Dashboard:
1. Ve a tu proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor**
3. Copia y pega el contenido de `supabase/add_whatsapp_config.sql`
4. Ejecuta el script

Opción B - Desde terminal:
```bash
psql $DATABASE_URL -f supabase/add_whatsapp_config.sql
```

## Paso 6: Reiniciar la Aplicación (1 minuto)

```bash
npm run dev
```

## ¡Listo! 🎉

Ahora puedes:
- ✅ Ver notificaciones en la plataforma (campana en el header)
- ✅ Configurar WhatsApp de cada cliente
- ✅ Enviar notificaciones de prueba
- ✅ Recibir alertas de vencimientos

## Probar que Funciona

### Prueba 1: Enviar WhatsApp Manual

Desde el código (o una página de prueba):

```typescript
import { enviarWhatsApp } from '@/services'

await enviarWhatsApp(
  '+5215512345678',  // Tu número en formato internacional
  '¡Hola! Esta es una prueba de Docuvi.'
)
```

### Prueba 2: Configurar un Cliente

1. Ve a la página de clientes
2. Edita un cliente
3. Agrega tu número de WhatsApp en formato `+5215512345678`
4. Activa "Notificar por WhatsApp"
5. Guarda

### Prueba 3: Simular Vencimiento

1. Crea un documento con fecha de vencimiento en 5 días
2. Apruébalo
3. Ejecuta manualmente la verificación (desde Postman o código):

```bash
curl -X POST http://localhost:3000/api/notificaciones/check-vencimientos \
  -H "Authorization: Bearer tu_token" \
  -H "Content-Type: application/json" \
  -d '{"diasLimite": 30}'
```

4. Deberías recibir un WhatsApp con la alerta

## Configuración Avanzada (Opcional)

### Activar Job Automático (Cron)

Para que se verifiquen vencimientos automáticamente cada día:

#### Opción A: Supabase Cron

1. Deploy de Edge Function:
```bash
supabase functions deploy check-vencimientos
supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxx
supabase secrets set TWILIO_AUTH_TOKEN=xxxxx
supabase secrets set TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
supabase secrets set CRON_SECRET=tu_secreto
```

2. En Supabase Dashboard > Database > Cron Jobs:
```sql
SELECT
  net.http_post(
    url:='https://tu-project.supabase.co/functions/v1/check-vencimientos',
    headers:='{"Authorization": "Bearer tu_secreto"}'::jsonb
  );
```

Schedule: `0 9 * * *` (9:00 AM diario)

#### Opción B: GitHub Actions

Crea `.github/workflows/check-vencimientos.yml`:

```yaml
name: Check Vencimientos
on:
  schedule:
    - cron: '0 9 * * *'  # 9:00 AM UTC diario
  workflow_dispatch:  # Permite ejecución manual

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger check
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/notificaciones/check-vencimientos \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

## Producción: WhatsApp Business

Para usar en producción con números reales:

1. Solicita acceso a [Twilio WhatsApp Business](https://www.twilio.com/whatsapp/request-access)
2. Completa el proceso de aprobación (toma ~2 semanas)
3. Cambia `TWILIO_WHATSAPP_FROM` a tu número aprobado

## Costos

- **Sandbox**: Gratis (solo para pruebas)
- **Producción**: ~$0.005 USD por mensaje
- **Ejemplo**: 100 clientes × 30 mensajes/mes = $15 USD/mes

## Problemas Comunes

### "Error 21608: The number is not registered"
- **Solución**: En sandbox, el número receptor debe estar registrado. Sigue el Paso 3 con ese número.

### "Error 21211: Invalid 'To' Phone Number"
- **Solución**: Usa formato internacional: `+5215512345678` (sin espacios ni guiones)

### "Unauthorized"
- **Solución**: Verifica que las credenciales en `.env.local` sean correctas

### No llega el mensaje
- **Solución**: Revisa en [Twilio Logs](https://console.twilio.com/monitor/logs/sms) el estado del mensaje

## Soporte

Consulta la documentación completa: `NOTIFICACIONES_WHATSAPP.md`

---

**¿Listo en 10 minutos?** ⏱️ Si sigues esta guía paso a paso, deberías tener WhatsApp funcionando en menos de 10 minutos.
