# 🔔 Instrucciones: Activar Notificaciones para Revisores

## 📋 Problema Identificado

**Los revisores NO están recibiendo notificaciones cuando hay documentos pendientes de revisión.**

### ¿Por qué ocurre?

El sistema tiene el código para notificaciones, pero los **triggers de base de datos** pueden:
1. No estar aplicados en Supabase
2. Tener una versión antigua que solo notifica a un revisor
3. Estar mal configurados

## ✅ Solución

He creado un script SQL que:
- ✅ Notifica a **TODOS** los revisores cuando se sube un documento nuevo
- ✅ Notifica al cliente cuando su documento es aprobado/rechazado
- ✅ Incluye mejor manejo de errores
- ✅ Muestra logs detallados para debugging

---

## 🚀 Pasos para Aplicar el Fix

### Opción A: Desde Supabase Dashboard (RECOMENDADO)

1. **Abrir Supabase Dashboard:**
   ```
   https://supabase.com/dashboard
   ```

2. **Seleccionar tu proyecto:**
   - Click en tu proyecto "Docuvi"

3. **Ir al SQL Editor:**
   - En el menú lateral, click en "SQL Editor"
   - Click en "+ New Query"

4. **Copiar y Pegar el Script:**
   - Abre el archivo: `fix_notificaciones_revisores.sql`
   - Copia TODO el contenido
   - Pégalo en el editor SQL de Supabase

5. **Ejecutar el Script:**
   - Click en el botón "Run" (o presiona Ctrl+Enter)
   - Espera a que se ejecute

6. **Verificar Resultado:**

   Deberías ver un mensaje como:
   ```
   ╔════════════════════════════════════════════════════╗
   ║  VERIFICACIÓN DE NOTIFICACIONES PARA REVISORES    ║
   ╚════════════════════════════════════════════════════╝

   ✓ Triggers creados: 2 de 2
   ✓ Funciones creadas: 2 de 2
   ✓ Revisores en sistema: 1

   ✅ ÉXITO: Sistema de notificaciones configurado correctamente

   Ahora cuando un cliente suba un documento:
     1. Se creará una notificación para TODOS los revisores
     2. Los revisores verán la campana con badge de notificación
     3. Al aprobar/rechazar, se notificará al cliente
   ```

### Opción B: Desde psql (Avanzado)

Si tienes acceso directo a la base de datos:

```bash
psql $DATABASE_URL -f fix_notificaciones_revisores.sql
```

---

## 🧪 Cómo Probar que Funciona

### Prueba 1: Verificar Estado Actual

**Antes de aplicar el fix**, ejecuta este script para ver el estado:

```sql
-- Ejecutar en Supabase SQL Editor
SELECT
  tgname AS trigger_name,
  tgenabled AS enabled
FROM pg_trigger
WHERE tgname IN ('trigger_notificar_nuevo_documento', 'trigger_notificar_documento');
```

**Resultado esperado:**
- Si NO aparece nada = Los triggers no están creados ❌
- Si aparecen 2 triggers = Ya están creados ✅

### Prueba 2: Subir un Documento de Prueba

1. **Iniciar Sesión como Cliente:**
   - Ve a http://localhost:3003
   - Inicia sesión con un usuario cliente

2. **Subir un Documento:**
   - Ve a "Mis Requerimientos"
   - Sube un documento en cualquier requerimiento

3. **Cambiar a Usuario Revisor:**
   - Cierra sesión
   - Inicia sesión con un usuario revisor

4. **Verificar Notificación:**
   - ✅ Deberías ver un badge rojo en la campana 🔔
   - ✅ Al hacer click, debe aparecer la notificación:
     ```
     Nuevo documento pendiente
     El cliente "Nombre Empresa" ha subido un documento: Tipo de Documento
     ```

5. **Aprobar o Rechazar el Documento:**
   - Ve a "Bandeja de Revisión"
   - Aprueba o rechaza el documento

6. **Cambiar a Usuario Cliente:**
   - Cierra sesión
   - Inicia sesión con el cliente

7. **Verificar Notificación del Cliente:**
   - ✅ El cliente debe ver una notificación de aprobación/rechazo

### Prueba 3: Verificar Notificaciones en la BD

Ejecuta este query para ver las notificaciones recientes:

```sql
SELECT
  n.id,
  n.tipo,
  n.titulo,
  n.mensaje,
  u.email AS usuario_email,
  u.rol AS usuario_rol,
  n.creado_en,
  n.leida
FROM public.notificaciones n
LEFT JOIN public.usuarios u ON u.id = n.usuario_id
ORDER BY n.creado_en DESC
LIMIT 10;
```

**Resultado esperado:**
- ✅ Ver notificaciones de tipo `documento_nuevo` para revisores
- ✅ Ver notificaciones de tipo `documento_aprobado` o `documento_rechazado` para clientes

---

## 🔍 Solución de Problemas

### ❌ Error: "No hay revisores en el sistema"

**Problema:** No tienes usuarios con rol 'revisor'

**Solución:**
1. Ve a Supabase Dashboard > Authentication > Users
2. Verifica que tengas al menos un usuario
3. Ve a SQL Editor y ejecuta:
   ```sql
   SELECT id, email, rol FROM public.usuarios WHERE rol = 'revisor';
   ```
4. Si no hay resultados, crea un revisor o actualiza un usuario:
   ```sql
   UPDATE public.usuarios
   SET rol = 'revisor'
   WHERE email = 'tu_email@ejemplo.com';
   ```

### ❌ Error: "permission denied for function"

**Problema:** No tienes permisos para crear funciones

**Solución:**
- Debes ejecutar el script con un usuario que tenga permisos de SUPERUSER
- En Supabase Dashboard esto no debería pasar (eres admin)
- Si usas psql, conéctate con el usuario postgres

### ❌ Las notificaciones no aparecen en la campana

**Posibles causas:**

1. **El trigger no se ejecutó:**
   - Verifica en SQL que el trigger existe
   - Sube un documento nuevo para probarlo

2. **Problemas de caché:**
   - Refresca la página (F5)
   - Cierra sesión y vuelve a iniciar

3. **Usuario sin ID:**
   - Verifica que el usuario revisor tenga un ID válido:
     ```sql
     SELECT id, email, rol FROM public.usuarios WHERE email = 'tu_revisor@ejemplo.com';
     ```

4. **Realtime no está funcionando:**
   - Las notificaciones usan Supabase Realtime
   - Verifica la conexión en DevTools > Network > WS

---

## 📊 Qué Hace el Script Exactamente

### Función: `notificar_documento_nuevo()`

```
Cuando un cliente SUBE un documento:
├─ Obtiene el nombre del tipo de documento
├─ Obtiene el nombre de la empresa del cliente
├─ Busca TODOS los usuarios con rol = 'revisor'
└─ Para CADA revisor:
   └─ Crea una notificación tipo 'documento_nuevo'
```

**Mejora vs versión antigua:**
- ❌ Antes: Solo notificaba al PRIMER revisor (`LIMIT 1`)
- ✅ Ahora: Notifica a TODOS los revisores

### Función: `notificar_cambio_estado_documento()`

```
Cuando un revisor APRUEBA/RECHAZA un documento:
├─ Verifica que el estado cambió
├─ Busca el usuario_id del cliente
├─ Si el cliente tiene un usuario:
│  ├─ Si APROBADO: Crea notificación 'documento_aprobado'
│  └─ Si RECHAZADO: Crea notificación 'documento_rechazado'
└─ Si NO tiene usuario: Log de advertencia (no falla)
```

---

## 🎯 Checklist Final

Marca cuando hayas completado:

- [ ] Script `fix_notificaciones_revisores.sql` ejecutado en Supabase
- [ ] Mensaje de éxito ✅ recibido
- [ ] Al menos 1 revisor existe en el sistema
- [ ] Prueba realizada: Cliente sube documento
- [ ] Prueba realizada: Revisor ve notificación
- [ ] Prueba realizada: Revisor aprueba documento
- [ ] Prueba realizada: Cliente ve notificación de aprobación
- [ ] Campana de notificaciones funciona correctamente

---

## 📚 Archivos Creados

1. **`fix_notificaciones_revisores.sql`** - Script principal a ejecutar
2. **`verificar_triggers_notificaciones.sql`** - Script de verificación (opcional)
3. **`INSTRUCCIONES_FIX_NOTIFICACIONES_REVISORES.md`** - Este archivo

---

## 💡 Tips Importantes

1. **Una sola vez**: Solo necesitas ejecutar el script UNA VEZ
2. **Safe to re-run**: Si lo ejecutas varias veces, no hay problema (usa `CREATE OR REPLACE`)
3. **No afecta datos**: No modifica datos existentes, solo crea/actualiza funciones y triggers
4. **Realtime**: Las notificaciones aparecen en tiempo real sin refrescar
5. **Backup**: Supabase hace backup automático, pero puedes exportar la BD antes si quieres

---

## 🔗 Flujo Completo

```
┌─────────────────────────────────────────────────────────┐
│                FLUJO DE NOTIFICACIONES                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Cliente sube documento                              │
│     └─> Trigger: notificar_documento_nuevo()           │
│         └─> Crea notificación para CADA revisor        │
│                                                          │
│  2. Revisor recibe notificación en tiempo real          │
│     └─> Campana 🔔 muestra badge rojo                  │
│     └─> Panel muestra: "Nuevo documento pendiente"     │
│                                                          │
│  3. Revisor va a "Bandeja de Revisión"                 │
│     └─> Ve el documento en la lista                    │
│                                                          │
│  4. Revisor aprueba/rechaza documento                   │
│     └─> Trigger: notificar_cambio_estado_documento()   │
│         └─> Crea notificación para el cliente          │
│                                                          │
│  5. Cliente recibe notificación                         │
│     └─> Campana 🔔 muestra badge rojo                  │
│     └─> "Documento aprobado" o "Documento rechazado"   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🚨 Si Algo Sale Mal

1. **Revisa los logs de Supabase:**
   - Dashboard > Logs > Postgres Logs
   - Busca errores recientes

2. **Verifica que la función crear_notificacion existe:**
   ```sql
   SELECT proname FROM pg_proc WHERE proname = 'crear_notificacion';
   ```

3. **Verifica la tabla de notificaciones:**
   ```sql
   SELECT COUNT(*) FROM public.notificaciones;
   ```

4. **Contacta conmigo** si necesitas ayuda adicional

---

**¿Listo para activar las notificaciones?** 🚀

Ejecuta `fix_notificaciones_revisores.sql` en Supabase SQL Editor
