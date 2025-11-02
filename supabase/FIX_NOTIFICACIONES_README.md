# 🔧 Fix: Error de Notificaciones con usuario_id NULL

## ❌ Error

```
null value in column "usuario_id" of relation "notificaciones" violates not-null constraint
```

## 🔍 Causa

Este error ocurre cuando:
1. **Apruebas un documento** de un cliente que NO tiene usuario asociado
2. **Generas un certificado** para un cliente sin usuario
3. El trigger intenta crear una notificación con `usuario_id = NULL`
4. La base de datos rechaza esto porque `usuario_id` es NOT NULL

**Escenario común**: Clientes creados por el revisor que no tienen cuenta de acceso al sistema.

---

## ✅ Solución

Ejecutar el script `fix_notificaciones.sql` que corrige los triggers para verificar que el cliente tenga un `usuario_id` antes de intentar crear notificaciones.

---

## 🚀 Cómo Aplicar el Fix

### Opción 1: Supabase SQL Editor (Dashboard Web) ⭐

1. **Ve a Supabase Dashboard**
   - https://supabase.com/dashboard
   - Selecciona tu proyecto

2. **Abre SQL Editor**
   - Click en **"SQL Editor"** en el menú lateral
   - Click en **"New Query"**

3. **Copia y pega el script**
   - Abre el archivo: `supabase/fix_notificaciones.sql`
   - Copia TODO el contenido
   - Pégalo en el SQL Editor

4. **Ejecuta el script**
   - Click en **"RUN"** (o Cmd/Ctrl + Enter)
   - Espera el mensaje: `✓ Triggers de notificaciones corregidos`

5. **¡Listo!** ✅

---

### Opción 2: Línea de Comandos (psql)

```bash
cd supabase
psql -h db.xxxxxxxxxxxx.supabase.co \
     -p 5432 \
     -d postgres \
     -U postgres \
     -f fix_notificaciones.sql
```

---

## 🧪 Verificar que Funciona

### 1. Aprobar un Documento

1. Ve a: `http://localhost:3003/revisor/revision`
2. Busca un documento pendiente
3. Haz clic en **"Aprobar"**
4. ✅ Debe funcionar sin el error de `usuario_id`

### 2. Generar un Certificado

1. Ve a: `http://localhost:3003/revisor/certificados`
2. Haz clic en **"Generar Certificado"**
3. Selecciona un cliente (con o sin usuario)
4. ✅ Debe funcionar sin el error de `usuario_id`

---

## 📋 Qué Hace el Fix

### Trigger: `notificar_cambio_estado_documento`

**Antes** (causaba error):
```sql
-- Obtener usuario_id del cliente
SELECT c.usuario_id INTO cliente_usuario_id ...

-- Crear notificación (sin verificar)
PERFORM public.crear_notificacion(
  cliente_usuario_id,  -- ❌ Puede ser NULL
  ...
);
```

**Después** (corregido):
```sql
-- Obtener usuario_id del cliente
SELECT c.usuario_id INTO cliente_usuario_id ...

-- Solo crear notificación si hay usuario
IF cliente_usuario_id IS NOT NULL THEN  -- ✅ Verificación añadida
  PERFORM public.crear_notificacion(
    cliente_usuario_id,
    ...
  );
END IF;
```

### Trigger: `notificar_documento_nuevo`

También corregido para verificar que el `revisor_id` no sea NULL antes de crear la notificación.

---

## 🔍 Verificar que el Fix se Aplicó

```sql
-- En Supabase SQL Editor, ejecuta:

-- Verificar que la función existe
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'notificar_cambio_estado_documento';

-- Debe retornar 1 fila

-- Verificar el código de la función (opcional)
SELECT pg_get_functiondef('public.notificar_cambio_estado_documento'::regproc);

-- Debe mostrar el código con la verificación IF cliente_usuario_id IS NOT NULL
```

---

## 💡 Alternativa: Asociar Usuarios a Clientes

Si quieres que los clientes reciban notificaciones, debes asociarles un usuario:

### Opción A: Desde la UI
1. Ve a **Gestión de Clientes**
2. Edita el cliente
3. Asigna un usuario existente

### Opción B: Crear usuario para el cliente

```sql
-- 1. Crear usuario en auth.users (Supabase Auth)
-- Esto se hace desde el Dashboard de Supabase:
-- Authentication → Users → Add user

-- 2. Después, asociar el usuario al cliente
UPDATE clientes
SET usuario_id = 'UUID-DEL-USUARIO-CREADO'
WHERE id = 'UUID-DEL-CLIENTE';
```

---

## 📊 Tipos de Clientes

### Cliente CON usuario asociado
- ✅ Puede iniciar sesión
- ✅ Recibe notificaciones
- ✅ Puede subir documentos
- ✅ Puede ver certificados

### Cliente SIN usuario asociado
- ❌ No puede iniciar sesión
- ❌ **NO recibe notificaciones** (por diseño)
- ✅ El revisor puede gestionar sus documentos
- ✅ El revisor puede generar certificados
- ℹ️ Es solo un registro de empresa

---

## ✅ Checklist de Solución

- [ ] Ejecuté el script `fix_notificaciones.sql` en Supabase
- [ ] Vi el mensaje: "✓ Triggers de notificaciones corregidos"
- [ ] Probé aprobar un documento
- [ ] No apareció el error de `usuario_id`
- [ ] Probé generar un certificado
- [ ] Funciona correctamente

---

## 🐛 Si el Error Persiste

### 1. Verificar que el script se ejecutó
```sql
-- Debe retornar el código actualizado
SELECT pg_get_functiondef('public.notificar_cambio_estado_documento'::regproc);
```

### 2. Ver qué trigger está fallando
Revisa la consola del servidor para ver el stack trace completo.

### 3. Verificar otros triggers
```sql
-- Listar todos los triggers en la tabla notificaciones
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('documentos', 'certificados');
```

---

## 📝 Archivos Relacionados

- `supabase/fix_notificaciones.sql` - Script de corrección
- `supabase/functions.sql` - Funciones originales
- `supabase/certificados_implementation.sql` - Implementación de certificados

---

**Estado**: ✅ Solución disponible
**Acción requerida**: Ejecutar `fix_notificaciones.sql` en Supabase
**Tiempo estimado**: 1 minuto
