# 🔧 Solución: Error al Aprobar Documentos

## ❌ Error Original

```
PATCH https://rbaqegvssxgclmichlpk.supabase.co/rest/v1/documentos?id=eq.06d23c6c-61d9-4c91-9119-e614f7b7f207&select=* 400 (Bad Request)
```

## ✅ Solución Aplicada

**Archivo modificado**: `src/services/documentos.service.ts`

**Cambio realizado**: Eliminado el campo `motivo_rechazo: null` del objeto de actualización.

### Antes:
```typescript
const datosActualizar: ActualizarDocumento = {
  estado: 'aprobado',
  aprobado_por: aprobadoPor,
  fecha_aprobacion: new Date().toISOString(),
  motivo_rechazo: null,  // ❌ Esto causaba el error
}
```

### Después:
```typescript
const datosActualizar: any = {
  estado: 'aprobado',
  aprobado_por: aprobadoPor,
  fecha_aprobacion: new Date().toISOString(),
  // ✅ Ya no enviamos motivo_rechazo
}
```

**Razón**: Supabase puede rechazar campos con valor `null` explícito en algunos casos, especialmente si hay triggers o constraints.

---

## 🧪 Cómo Probar la Solución

### 1. Recargar la Página

El servidor de desarrollo ya ha recargado el código automáticamente, pero asegúrate de recargar la página en el navegador:

- Presiona **Ctrl + Shift + R** (Windows/Linux)
- O **Cmd + Shift + R** (Mac)

### 2. Ir a la Página de Revisión

```
http://localhost:3001/revisor/revision
```

### 3. Intentar Aprobar un Documento

1. Busca un documento con estado **"Pendiente"**
2. Haz clic en **"Aprobar"** o en el botón de aprobación
3. Si aparece un modal, llénalo y confirma

### 4. Verificar el Resultado

**Debe suceder**:
- ✅ El documento cambia a estado "Aprobado"
- ✅ Aparece un toast de éxito
- ✅ La tabla se actualiza
- ✅ NO aparece el error 400

**Si aún falla**:
- Abre la consola del navegador (F12)
- Busca el mensaje completo del error
- Verifica lo siguiente:

---

## 🔍 Diagnóstico Adicional

Si el error persiste después del cambio, puede ser por una de estas razones:

### Causa 1: Problemas de Autenticación

**Verificar**:
```javascript
// En consola del navegador (F12)
const { data: { user } } = await supabase.auth.getUser()
console.log('Usuario actual:', user)
console.log('Rol:', user.user_metadata.rol)
```

**Debe mostrar**:
- Usuario autenticado
- `rol: 'revisor'`

**Si el rol no es 'revisor'**:
- Cierra sesión
- Inicia sesión con una cuenta de revisor

### Causa 2: Políticas RLS Bloqueando

**Verificar en Supabase Dashboard**:

1. Ve a: **Database** → **Policies**
2. Busca la tabla: `documentos`
3. Verifica que existe la política: `documentos_update_revisor`
4. Debe decir: `FOR UPDATE USING (es_revisor())`

**Probar política manualmente**:
```sql
-- En Supabase SQL Editor
SELECT es_revisor();
-- Debe retornar: true
```

**Si retorna false**:
```sql
-- Verificar usuario actual
SELECT * FROM usuarios WHERE id = auth.uid();
-- Debe mostrar tu usuario con rol = 'revisor'
```

### Causa 3: Función `es_revisor()` No Existe

**Verificar**:
```sql
-- En Supabase SQL Editor
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'es_revisor';
```

**Si no existe**:
- Reinstalar funciones base: Ejecuta `supabase/functions.sql`

### Causa 4: Campo Requerido Faltante

El error 400 también puede indicar que falta un campo requerido.

**Verificar en consola del navegador**:
```javascript
// Debería mostrar el error detallado
Error al aprobar documento: { details: "...", hint: "...", message: "..." }
```

**Mensaje común**: `"null value in column X violates not-null constraint"`

**Solución**: El campo `aprobado_por` debe tener un valor válido (UUID del revisor).

---

## 📋 Checklist de Solución

- [x] Código modificado (eliminado `motivo_rechazo: null`)
- [ ] Página recargada en el navegador (Ctrl + Shift + R)
- [ ] Sesión activa como revisor
- [ ] Función `es_revisor()` existe en BD
- [ ] Política RLS `documentos_update_revisor` habilitada
- [ ] Intentar aprobar documento
- [ ] Verificar que funciona sin error 400

---

## 🐛 Si Aún No Funciona

### Opción A: Ver Error Completo

1. Abre consola del navegador (F12)
2. Pestaña **Network**
3. Filtra por: `documentos`
4. Intenta aprobar un documento
5. Haz clic en la petición que falla
6. Ve a **Response**
7. **Copia el mensaje de error completo** y compártelo

### Opción B: Probar Aprobación Manual

```sql
-- En Supabase SQL Editor, ejecuta:
UPDATE documentos
SET
  estado = 'aprobado',
  aprobado_por = 'TU-USUARIO-ID-AQUI',  -- UUID del revisor
  fecha_aprobacion = NOW()
WHERE id = '06d23c6c-61d9-4c91-9119-e614f7b7f207';  -- ID del documento

-- Si esto funciona, el problema es en el frontend
-- Si esto falla, el problema es en RLS o constraints
```

### Opción C: Verificar Triggers

```sql
-- En Supabase SQL Editor
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'documentos';
```

**Si hay triggers**:
- Revisa que no estén bloqueando el UPDATE
- Verifica que no requieran campos adicionales

---

## ✅ Resultado Esperado

Después de aplicar la solución:

1. **Aprobar documento**:
   - Click en "Aprobar"
   - Documento cambia a "Aprobado" ✅
   - Sin error 400 ✅

2. **Toast de confirmación**:
   ```
   ✓ Documento aprobado exitosamente
   ```

3. **En la base de datos**:
   ```sql
   SELECT estado, aprobado_por, fecha_aprobacion
   FROM documentos
   WHERE id = 'DOCUMENTO-ID';

   -- Debe mostrar:
   -- estado: 'aprobado'
   -- aprobado_por: UUID del revisor
   -- fecha_aprobacion: Fecha actual
   ```

---

## 🔗 Archivos Relacionados

- `src/services/documentos.service.ts` - Servicio modificado
- `supabase/policies.sql` - Políticas RLS
- `supabase/functions.sql` - Funciones helper (es_revisor)
- `supabase/schema.sql` - Esquema de la tabla documentos

---

**Estado**: ✅ Solución aplicada
**Acción requerida**: Recargar navegador y probar
**Última actualización**: 2025-01-02
