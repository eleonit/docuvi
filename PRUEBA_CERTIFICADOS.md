# 🧪 Prueba de Generación de Certificados PDF

## ✅ Cambios Realizados

Se modificó el archivo `src/app/revisor/certificados/page.tsx` para que **descargue automáticamente el PDF** después de generar un certificado.

### Antes:
- ✅ Crear certificado en BD
- ❌ **NO** descargaba PDF automáticamente
- ℹ️ Usuario tenía que buscar el certificado y hacer clic en "Descargar"

### Ahora:
- ✅ Crear certificado en BD
- ✅ **SÍ** descarga PDF automáticamente
- ✅ Usuario recibe notificación de progreso

---

## 🔍 Cómo Verificar que Funciona

### Paso 1: Preparar Datos de Prueba

**Necesitas**:
- ✅ Un cliente registrado
- ✅ Requerimientos obligatorios configurados para ese cliente
- ✅ Todos los documentos obligatorios aprobados

**Verificar cumplimiento**:
```sql
-- En Supabase SQL Editor
SELECT * FROM verificar_cumplimiento_cliente('ID-DEL-CLIENTE');

-- Debe retornar:
-- cumple: true
-- total_requerimientos: N
-- requerimientos_cumplidos: N (mismo número)
```

### Paso 2: Generar Certificado desde la UI

1. **Navegar a Certificados**
   ```
   http://localhost:3000/revisor/certificados
   ```

2. **Hacer clic en "Generar Certificado"**

3. **Llenar el formulario**:
   - Cliente: Seleccionar cliente
   - Fecha de validez desde: Ej. 2025-01-01
   - Fecha de validez hasta: Ej. 2026-01-01

4. **Hacer clic en "Generar"**

### Paso 3: Observar el Comportamiento

**Lo que DEBE suceder**:

1. ✅ Modal se cierra
2. ✅ Aparece toast: "Certificado generado. Descargando PDF..."
3. ✅ Se descarga automáticamente un archivo PDF:
   ```
   Certificado_CERT-2025-XXXXXX_NombreEmpresa.pdf
   ```
4. ✅ Aparece toast: "¡PDF descargado exitosamente!"
5. ✅ El certificado aparece en la tabla

**Si algo falla**:
- ❌ Aparece toast: "Certificado creado, pero hubo un error al descargar el PDF..."
- ℹ️ Puedes usar el botón de descarga manual en la tabla

---

## 🐛 Solución de Problemas

### Problema 1: "El cliente no cumple con todos los requerimientos obligatorios"

**Causa**: El cliente no tiene todos los documentos aprobados.

**Solución**:
```sql
-- Verificar qué falta
SELECT
  rc.id,
  td.nombre as tipo_documento,
  COALESCE(d.estado, 'sin_documento') as estado
FROM requerimientos_cliente rc
LEFT JOIN tipos_documento td ON td.id = rc.tipo_documento_id
LEFT JOIN LATERAL (
  SELECT estado
  FROM documentos
  WHERE requerimiento_cliente_id = rc.id
    AND eliminado = false
  ORDER BY version DESC
  LIMIT 1
) d ON true
WHERE rc.cliente_id = 'ID-DEL-CLIENTE'
  AND rc.obligatorio = true;
```

**Acciones**:
1. Asegúrate de que todos los requerimientos obligatorios tengan documentos
2. Aprueba todos los documentos pendientes
3. Vuelve a intentar generar el certificado

---

### Problema 2: El PDF no se descarga

**Verificar en consola del navegador** (F12):

```javascript
// Busca errores relacionados con:
// - generarCertificadoPDF
// - obtenerCertificadoPorId
// - jsPDF
// - QRCode
```

**Posibles causas**:

1. **Error en obtenerCertificadoPorId**
   ```typescript
   // Verifica que el certificado tenga detalles
   const cert = await obtenerCertificadoPorId('ID')
   console.log(cert.detalles) // Debe tener array de documentos
   ```

2. **Error en generación de QR**
   ```typescript
   // Verifica que NEXT_PUBLIC_APP_URL esté configurado
   console.log(process.env.NEXT_PUBLIC_APP_URL)
   ```

3. **Error en jsPDF**
   ```bash
   # Reinstalar dependencias
   npm install jspdf qrcode
   ```

---

### Problema 3: Se descarga pero el PDF está vacío o mal formado

**Revisar**:
1. Certificado tiene datos completos
2. Cliente tiene nombre y contacto
3. Detalles tienen documentos

**Probar manualmente**:
```typescript
// En consola del navegador (F12)
import { generarCertificadoPDF } from '@/lib/generarPDF'

// Obtener un certificado de la lista
const cert = certificados[0] // O el que quieras

// Generar PDF manualmente
await generarCertificadoPDF(cert)
```

---

## 📋 Checklist de Prueba

### Preparación
- [ ] Base de datos con script `certificados_reinstall_web.sql` instalado
- [ ] Cliente creado con requerimientos obligatorios
- [ ] Todos los documentos obligatorios aprobados
- [ ] `NEXT_PUBLIC_APP_URL` configurado en `.env.local`

### Prueba de Generación Automática
- [ ] Click en "Generar Certificado"
- [ ] Llenar formulario
- [ ] Click en "Generar"
- [ ] Toast: "Certificado generado. Descargando PDF..."
- [ ] PDF se descarga automáticamente
- [ ] Toast: "¡PDF descargado exitosamente!"
- [ ] Certificado aparece en la tabla

### Prueba de Descarga Manual
- [ ] Click en botón de descarga (icono) en la tabla
- [ ] PDF se descarga
- [ ] Toast: "Certificado descargado exitosamente"

### Verificación del PDF
- [ ] Abrir el PDF descargado
- [ ] Verificar que muestra:
  - Código del certificado (CERT-YYYY-XXXXXX)
  - Información del cliente
  - Tabla con documentos certificados
  - Código QR funcional
  - Hash de verificación
  - Fechas de validez

### Prueba de Verificación Pública
- [ ] Abrir: `http://localhost:3000/verificar/CERT-YYYY-XXXXXX`
- [ ] Debe mostrar información del certificado
- [ ] Estado: Válido ✓
- [ ] Información coincide con el PDF

---

## 🔧 Variables de Entorno Necesarias

Asegúrate de tener en `.env.local`:

```bash
# URL de la aplicación (para código QR)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase (ya deberías tenerlas)
NEXT_PUBLIC_SUPABASE_URL=tu-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-key
```

---

## 📊 Datos de Prueba SQL

Si necesitas crear datos de prueba:

```sql
-- 1. Crear cliente de prueba
INSERT INTO clientes (nombre_empresa, correo_contacto, telefono_contacto, creado_por)
VALUES (
  'Empresa de Prueba SA',
  'prueba@ejemplo.com',
  '555-1234',
  (SELECT id FROM usuarios WHERE rol = 'revisor' LIMIT 1)
)
RETURNING id;

-- 2. Crear requerimientos obligatorios
-- (Usa el ID del cliente del paso anterior)

-- 3. Subir y aprobar documentos
-- (Hacer esto desde la UI es más fácil)
```

---

## ✅ Resultado Esperado

Cuando todo funcione correctamente:

1. **UI del Revisor**:
   - Generar certificado → Descarga automática
   - Botón descarga manual → Funciona también

2. **Archivo PDF**:
   - Nombre: `Certificado_CERT-2025-XXXXXX_EmpresaDePrueba.pdf`
   - Tamaño: ~50-200 KB (depende del contenido)
   - Contenido: Completo y legible

3. **Base de Datos**:
   - Tabla `certificados`: 1 nuevo registro
   - Tabla `certificados_detalle`: N registros (N = documentos)
   - Tabla `notificaciones`: Notificación al cliente

4. **Verificación Pública**:
   - Código QR funciona
   - URL pública muestra certificado válido

---

**Última actualización**: 2025-01-01
