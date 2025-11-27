# Sistema de Notificaciones y WhatsApp - Docuvi

Este documento describe cómo configurar y utilizar el sistema de notificaciones en la plataforma y el envío de mensajes por WhatsApp para alertas de vencimientos.

## Índice

1. [Características](#características)
2. [Arquitectura](#arquitectura)
3. [Configuración](#configuración)
4. [Uso](#uso)
5. [API Reference](#api-reference)
6. [Troubleshooting](#troubleshooting)

---

## Características

### Notificaciones en la Plataforma

- ✅ **Centro de notificaciones en tiempo real** con campana en el header
- ✅ **Suscripción a eventos** usando Supabase Realtime
- ✅ **Notificaciones del navegador** (si el usuario lo permite)
- ✅ **Filtros**: Ver todas o solo no leídas
- ✅ **Marcar como leída** individual o todas
- ✅ **Tipos de notificación**:
  - Documento nuevo subido
  - Documento aprobado
  - Documento rechazado
  - Documento próximo a vencer
  - Certificado emitido
  - Certificado revocado

### Notificaciones por WhatsApp

- ✅ **Integración con Twilio** para envío de mensajes
- ✅ **Alertas de vencimiento** automáticas
- ✅ **Notificaciones de aprobación/rechazo** (opcional)
- ✅ **Configuración granular** por cliente
- ✅ **Días de anticipación** configurables (1-90 días)
- ✅ **Job automático** para verificar vencimientos diariamente

---

## Arquitectura

### Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND                               │
├─────────────────────────────────────────────────────────────┤
│  NotificationBell.tsx                                       │
│  ├─ Campana con badge de contador                          │
│  ├─ Panel desplegable con lista                            │
│  └─ Suscripción en tiempo real                             │
│                                                             │
│  ConfiguracionNotificaciones.tsx                           │
│  ├─ Toggle de WhatsApp                                     │
│  ├─ Input de número de teléfono                            │
│  └─ Slider de días de anticipación                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      BACKEND                                │
├─────────────────────────────────────────────────────────────┤
│  API Routes                                                 │
│  ├─ /api/notificaciones/whatsapp (POST/GET)               │
│  │  └─ Envía mensajes individuales por WhatsApp           │
│  └─ /api/notificaciones/check-vencimientos (POST/GET)     │
│     └─ Verifica y notifica documentos próximos a vencer    │
│                                                             │
│  Edge Functions (Supabase)                                 │
│  └─ check-vencimientos                                     │
│     ├─ Se ejecuta diariamente por cron                     │
│     ├─ Detecta documentos por vencer                       │
│     ├─ Crea notificaciones en plataforma                   │
│     └─ Envía WhatsApp si está configurado                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      DATABASE                               │
├─────────────────────────────────────────────────────────────┤
│  Tablas                                                     │
│  ├─ notificaciones                                         │
│  │  ├─ usuario_id, tipo, titulo, mensaje                  │
│  │  ├─ leida, documento_id, datos                         │
│  │  └─ Trigger: Realtime subscriptions                    │
│  │                                                         │
│  ├─ clientes                                               │
│  │  ├─ whatsapp_contacto                                  │
│  │  ├─ notificar_whatsapp                                 │
│  │  └─ dias_anticipacion_vencimiento                      │
│  │                                                         │
│  └─ configuracion_notificaciones                          │
│     ├─ cliente_id, tipo_notificacion, canal               │
│     ├─ habilitado, dias_anticipacion                      │
│     └─ Configuración granular por tipo y canal            │
│                                                             │
│  Funciones                                                  │
│  └─ obtener_documentos_proximos_vencer(dias_limite)       │
│     └─ Retorna documentos que vencen en N días            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                      EXTERNAL                               │
├─────────────────────────────────────────────────────────────┤
│  Twilio WhatsApp API                                        │
│  └─ api.twilio.com/2010-04-01/.../Messages.json           │
└─────────────────────────────────────────────────────────────┘
```

---

## Configuración

### 1. Configurar Twilio

#### Paso 1: Crear cuenta en Twilio

1. Regístrate en [Twilio](https://www.twilio.com/try-twilio)
2. Ve a la [consola](https://console.twilio.com/)
3. Copia tu **Account SID** y **Auth Token**

#### Paso 2: Configurar WhatsApp Sandbox (Desarrollo)

1. Ve a **Messaging** > **Try it out** > **Send a WhatsApp message**
2. Sigue las instrucciones para conectar tu número de WhatsApp personal
3. Envía el mensaje de activación (ej: `join <código>`)
4. Copia el número de sandbox (ej: `whatsapp:+14155238886`)

#### Paso 3: Configurar WhatsApp Business (Producción)

Para producción, necesitas:
1. Solicitar un [Twilio WhatsApp Business Account](https://www.twilio.com/whatsapp/request-access)
2. Completar el proceso de aprobación de Facebook
3. Obtener tu número de WhatsApp Business aprobado

### 2. Variables de Entorno

Crea o actualiza tu archivo `.env.local`:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Cron Secret (para Edge Function)
CRON_SECRET=tu_clave_secreta_aleatoria_aqui
```

**Importante**: Nunca subas el archivo `.env.local` a git. Usa `.env.example` como referencia.

### 3. Ejecutar Migration de Base de Datos

```bash
# Conectar a Supabase y ejecutar el script
psql $DATABASE_URL -f supabase/add_whatsapp_config.sql
```

O desde la UI de Supabase:
1. Ve a **SQL Editor**
2. Abre el archivo `supabase/add_whatsapp_config.sql`
3. Ejecuta el script

### 4. Desplegar Edge Function (Opcional)

Para el job automático de verificación de vencimientos:

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link al proyecto
supabase link --project-ref tu-project-ref

# Deploy de la función
supabase functions deploy check-vencimientos

# Configurar secretos
supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxx
supabase secrets set TWILIO_AUTH_TOKEN=xxxxx
supabase secrets set TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
supabase secrets set CRON_SECRET=tu_clave_secreta
```

### 5. Configurar Cron Job

#### Opción A: Supabase Cron (Recomendado)

En el dashboard de Supabase:
1. Ve a **Database** > **Cron Jobs**
2. Crea un nuevo job:
   - **Name**: check-vencimientos-daily
   - **Schedule**: `0 9 * * *` (9:00 AM diario)
   - **Command**:
   ```sql
   SELECT
     net.http_post(
       url:='https://tu-project-ref.supabase.co/functions/v1/check-vencimientos',
       headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_CRON_SECRET"}'::jsonb,
       body:='{}'::jsonb
     ) as request_id;
   ```

#### Opción B: Cron externo (ej: GitHub Actions, Vercel Cron)

Llama al endpoint `/api/notificaciones/check-vencimientos` desde tu servicio de cron preferido.

---

## Uso

### Para Revisores

#### 1. Configurar WhatsApp de un Cliente

```typescript
import { actualizarCliente } from '@/services'

await actualizarCliente(clienteId, {
  whatsapp_contacto: '+5215512345678',
  notificar_whatsapp: true,
  dias_anticipacion_vencimiento: 7
})
```

#### 2. Enviar WhatsApp Manual

```typescript
import { enviarWhatsApp } from '@/services'

await enviarWhatsApp(
  '+5215512345678',
  '¡Hola! Tu documento ha sido aprobado.',
  clienteId,
  documentoId
)
```

#### 3. Verificar Vencimientos Manualmente

```typescript
// Desde un componente de React
const handleCheckVencimientos = async () => {
  const response = await fetch('/api/notificaciones/check-vencimientos', {
    method: 'POST',
    body: JSON.stringify({ diasLimite: 30 })
  })
  const data = await response.json()
  console.log(`Notificaciones enviadas: ${data.notificacionesCreadas}`)
}
```

### Para Clientes

#### 1. Configurar Preferencias

El componente `ConfiguracionNotificaciones` permite a los clientes:
- Activar/desactivar notificaciones por WhatsApp
- Configurar su número de WhatsApp
- Elegir días de anticipación (1-90 días)

```tsx
import ConfiguracionNotificaciones from '@/components/clientes/ConfiguracionNotificaciones'

<ConfiguracionNotificaciones cliente={cliente} />
```

#### 2. Ver Notificaciones

El componente `NotificationBell` muestra todas las notificaciones:

```tsx
import NotificationBell from '@/components/notificaciones/NotificationBell'

<NotificationBell />
```

---

## API Reference

### POST /api/notificaciones/whatsapp

Envía un mensaje de WhatsApp.

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body**:
```json
{
  "to": "+5215512345678",
  "message": "Tu mensaje aquí",
  "clienteId": "uuid-opcional",
  "documentoId": "uuid-opcional"
}
```

**Response**:
```json
{
  "success": true,
  "messageSid": "SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "status": "queued"
}
```

### GET /api/notificaciones/whatsapp

Verifica si WhatsApp está configurado.

**Response**:
```json
{
  "configured": true,
  "provider": "Twilio"
}
```

### POST /api/notificaciones/check-vencimientos

Verifica documentos próximos a vencer y crea notificaciones.

**Body** (opcional):
```json
{
  "diasLimite": 30
}
```

**Response**:
```json
{
  "success": true,
  "documentosEncontrados": 15,
  "notificacionesCreadas": 12,
  "timestamp": "2025-11-27T10:00:00Z"
}
```

### GET /api/notificaciones/check-vencimientos

Obtiene la lista de documentos próximos a vencer sin crear notificaciones.

**Query Params**:
- `diasLimite` (opcional, default: 30)

**Response**:
```json
{
  "success": true,
  "documentos": [
    {
      "documento_id": "uuid",
      "cliente_id": "uuid",
      "cliente_nombre": "Empresa ABC",
      "tipo_documento": "RFC",
      "fecha_vencimiento": "2025-12-15",
      "dias_restantes": 18
    }
  ],
  "count": 1
}
```

---

## Tipos de Notificación

### documento_nuevo
- **Cuándo**: Cliente sube un nuevo documento
- **Destinatario**: Revisor
- **Canales**: Plataforma

### documento_aprobado
- **Cuándo**: Revisor aprueba un documento
- **Destinatario**: Cliente
- **Canales**: Plataforma, WhatsApp (opcional)

### documento_rechazado
- **Cuándo**: Revisor rechaza un documento
- **Destinatario**: Cliente
- **Canales**: Plataforma, WhatsApp (opcional)

### documento_proximo_vencer
- **Cuándo**: Documento aprobado próximo a vencer
- **Destinatario**: Cliente y Revisor
- **Canales**: Plataforma, WhatsApp (opcional)
- **Frecuencia**: Una vez al día (vía cron)

### certificado_emitido
- **Cuándo**: Se genera un nuevo certificado
- **Destinatario**: Cliente
- **Canales**: Plataforma, WhatsApp (opcional)

### certificado_revocado
- **Cuándo**: Se revoca un certificado
- **Destinatario**: Cliente
- **Canales**: Plataforma

---

## Troubleshooting

### WhatsApp no se envía

**Problema**: Los mensajes no llegan a WhatsApp.

**Soluciones**:
1. Verifica que las credenciales de Twilio sean correctas
2. Verifica que el número de WhatsApp esté en formato internacional: `+5215512345678`
3. En desarrollo, verifica que el número esté registrado en el sandbox de Twilio
4. Revisa los logs de Twilio en su consola
5. Verifica que `notificar_whatsapp` esté en `true` para el cliente

### Notificaciones duplicadas

**Problema**: El cliente recibe múltiples notificaciones del mismo documento.

**Soluciones**:
1. La API `check-vencimientos` incluye deduplicación de 24 horas
2. Verifica que no estés ejecutando múltiples cron jobs simultáneamente
3. Revisa los logs de ejecución del cron

### Edge Function falla

**Problema**: La Edge Function no se ejecuta correctamente.

**Soluciones**:
1. Verifica que los secretos estén configurados: `supabase secrets list`
2. Revisa los logs: `supabase functions logs check-vencimientos`
3. Verifica que el `CRON_SECRET` coincida en todos lados
4. Asegúrate de que la función tenga acceso a la base de datos

### Notificaciones en tiempo real no funcionan

**Problema**: Las notificaciones no aparecen automáticamente.

**Soluciones**:
1. Verifica que Supabase Realtime esté habilitado para la tabla `notificaciones`
2. En el dashboard de Supabase: **Database** > **Replication** > habilita `notificaciones`
3. Verifica en la consola del navegador si hay errores de WebSocket
4. Refresca la página y verifica la conexión

---

## Mejoras Futuras

- [ ] Soporte para múltiples idiomas en mensajes
- [ ] Plantillas personalizables de mensajes
- [ ] Integración con otros proveedores (WhatsApp Business API directo)
- [ ] Dashboard de analytics de notificaciones
- [ ] Historial de mensajes enviados
- [ ] Rate limiting para evitar spam
- [ ] Respuestas automáticas por WhatsApp
- [ ] Notificaciones por email además de WhatsApp

---

## Seguridad

### Buenas Prácticas

1. **Nunca expongas credenciales**: Usa variables de entorno
2. **Valida números de teléfono**: Solo acepta formato internacional
3. **Rate limiting**: Implementa límites de envío
4. **Autenticación**: Solo revisores pueden enviar WhatsApp manual
5. **Logs de auditoría**: Registra todos los envíos
6. **CRON_SECRET**: Usa una clave fuerte y única
7. **RLS**: Las políticas de Supabase protegen los datos

---

## Costos

### Twilio Pricing

- **Mensajes de WhatsApp**: ~$0.005 USD por mensaje (varía por país)
- **Cuenta gratuita**: $15.50 USD de crédito inicial
- **Sandbox**: Gratis para desarrollo

**Estimación mensual** (100 clientes, 30 notificaciones/mes):
- 100 clientes × 30 notificaciones = 3,000 mensajes/mes
- 3,000 × $0.005 = ~$15 USD/mes

---

## Soporte

Para problemas o preguntas:
- Revisa este documento
- Consulta la [documentación de Twilio](https://www.twilio.com/docs/whatsapp)
- Revisa los logs de la aplicación
- Contacta al equipo de desarrollo

---

**Última actualización**: 2025-11-27
