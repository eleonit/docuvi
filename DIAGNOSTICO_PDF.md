# 🔍 Diagnóstico: Botón de Generar PDF No Funciona

## 📍 Información del Servidor
- URL: http://localhost:3001 (puerto 3001, NO 3000)
- Estado: ✅ Corriendo

## 🧪 Pasos de Diagnóstico

### 1. Abrir la Consola del Navegador

1. Abre: **http://localhost:3001/revisor/certificados**
2. Presiona **F12** (o clic derecho → Inspeccionar)
3. Ve a la pestaña **Console**
4. Deja la consola abierta

### 2. Intentar Generar Certificado

1. Haz clic en **"Generar Certificado"**
2. Llena el formulario:
   - Cliente: (selecciona uno)
   - Fecha desde: 2025-01-01
   - Fecha hasta: 2026-01-01
3. Haz clic en **"Generar"**

### 3. Observar Qué Sucede

**Anota lo que ves**:

#### ¿Se cierra el modal?
- [ ] Sí, el modal se cierra
- [ ] No, el modal permanece abierto

#### ¿Qué mensajes aparecen?
- [ ] Toast: "Certificado generado. Descargando PDF..."
- [ ] Toast: "¡PDF descargado exitosamente!"
- [ ] Toast con error: (anota el mensaje)
- [ ] No aparece ningún toast

#### ¿Hay errores en la consola?
- [ ] Sí (copia el error completo)
- [ ] No hay errores

#### ¿Se crea el certificado en la tabla?
- [ ] Sí, aparece un nuevo certificado
- [ ] No aparece nada nuevo

#### ¿Se descarga el PDF?
- [ ] Sí, se descarga automáticamente
- [ ] No se descarga nada

---

## 🔴 Posibles Escenarios

### Escenario A: Error "El cliente no cumple con todos los requerimientos"

**Causa**: El cliente seleccionado no tiene todos los documentos obligatorios aprobados.

**Solución**:
```sql
-- En Supabase SQL Editor, ejecuta:
SELECT * FROM verificar_cumplimiento_cliente('REEMPLAZA-CON-CLIENTE-ID');

-- Debe retornar:
-- cumple: true
-- total_requerimientos: X
-- requerimientos_cumplidos: X (mismo número)
```

Si `cumple = false`, necesitas:
1. Ir a la gestión de documentos
2. Aprobar todos los documentos obligatorios pendientes
3. Volver a intentar generar el certificado

---

### Escenario B: El certificado se crea pero NO descarga PDF

**Síntomas**:
- ✅ Modal se cierra
- ✅ Aparece en la tabla
- ❌ NO se descarga PDF

**Diagnóstico**:

1. **Abrir consola del navegador (F12)**
2. **Buscar errores relacionados con**:
   - `generarCertificadoPDF`
   - `obtenerCertificadoPorId`
   - `jsPDF`
   - `QRCode`

**Posibles causas**:

#### Causa 1: Error al obtener certificado completo
```javascript
// En consola, verás algo como:
// Error: No se pudo obtener el certificado
```

**Solución**: Verificar que el certificado tenga detalles
```sql
SELECT * FROM certificados_detalle WHERE certificado_id = 'ID-DEL-CERTIFICADO';
-- Debe retornar al menos 1 fila
```

#### Causa 2: Error en generación de QR
```javascript
// En consola, verás:
// Error generando QR: ...
```

**Solución**: Verificar variable de entorno
```bash
# En .env.local, debe existir:
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

Si no existe, agrégala y reinicia el servidor.

#### Causa 3: Dependencias faltantes
```javascript
// En consola, verás:
// Cannot find module 'jspdf'
// Cannot find module 'qrcode'
```

**Solución**:
```bash
npm install jspdf qrcode
```

---

### Escenario C: Nada pasa al hacer clic en "Generar"

**Síntomas**:
- ❌ Modal NO se cierra
- ❌ NO aparece ningún toast
- ❌ NO hay errores en consola

**Diagnóstico**:

1. **Verificar que el botón está conectado**

Abre `src/app/revisor/certificados/page.tsx` y busca:
```typescript
<Boton type="submit" isLoading={generarMutation.isPending}>
  Generar
</Boton>
```

2. **Verificar en consola Network**
   - F12 → Pestaña **Network**
   - Intenta generar certificado
   - ¿Aparece alguna petición a Supabase?
   - Si no aparece nada, hay un problema con el formulario

---

### Escenario D: Error de permisos/autenticación

**Síntomas**:
- Toast: "No autenticado"
- Error en consola sobre sesión

**Solución**:
1. Cerrar sesión
2. Volver a iniciar sesión
3. Intentar de nuevo

---

## 🛠️ Prueba Manual del Generador de PDF

Si quieres probar solo la generación de PDF:

1. **Abre la consola del navegador (F12)**
2. **Ve a un certificado existente** en la tabla
3. **Copia el ID del certificado**
4. **Pega esto en la consola**:

```javascript
// Reemplaza 'CERTIFICADO-ID' con el ID real
const certId = 'CERTIFICADO-ID-AQUI'

// Importar funciones (esto puede no funcionar en todos los navegadores)
// Si no funciona, usa el botón de descarga normal en la tabla

fetch(`/api/certificados/${certId}`)
  .then(r => r.json())
  .then(cert => console.log('Certificado:', cert))
  .catch(e => console.error('Error:', e))
```

---

## 📝 Checklist de Verificación

Antes de generar un certificado, verifica:

### Base de Datos
- [ ] Cliente existe
- [ ] Cliente tiene requerimientos obligatorios configurados
- [ ] Todos los requerimientos obligatorios tienen documentos
- [ ] Todos los documentos están en estado "aprobado"
- [ ] Ningún documento está "eliminado"
- [ ] Documentos no están vencidos (fecha_vencimiento)

### Frontend
- [ ] Servidor corriendo en http://localhost:3001
- [ ] Usuario autenticado como revisor
- [ ] Sin errores en consola al cargar la página
- [ ] Lista de certificados se carga correctamente

### Configuración
- [ ] Archivo .env.local existe
- [ ] Variable NEXT_PUBLIC_APP_URL configurada
- [ ] Variable NEXT_PUBLIC_SUPABASE_URL configurada
- [ ] Variable NEXT_PUBLIC_SUPABASE_ANON_KEY configurada

### Dependencias
- [ ] `npm install` ejecutado
- [ ] Paquete `jspdf` instalado
- [ ] Paquete `qrcode` instalado
- [ ] Paquete `date-fns` instalado

---

## 🎯 Script de Prueba Rápida

Ejecuta esto en la consola del navegador (F12) cuando estés en la página de certificados:

```javascript
// 1. Verificar que las funciones existen
console.log('Testing certificados...')

// 2. Verificar si hay certificados
console.log('Certificados en página:', document.querySelectorAll('table tbody tr').length)

// 3. Verificar si el modal se abre
const botonGenerar = Array.from(document.querySelectorAll('button'))
  .find(btn => btn.textContent.includes('Generar Certificado'))

if (botonGenerar) {
  console.log('✅ Botón "Generar Certificado" encontrado')
} else {
  console.log('❌ Botón "Generar Certificado" NO encontrado')
}
```

---

## 📞 Próximos Pasos

**Después de hacer el diagnóstico, comparte**:

1. ✅ ¿Qué escenario se aplica? (A, B, C o D)
2. ✅ ¿Qué errores aparecen en consola? (copia completa)
3. ✅ ¿El certificado se crea en la tabla?
4. ✅ ¿Qué mensajes de toast aparecen?
5. ✅ Captura de pantalla de la consola

Con esta información podré ayudarte mejor.

---

**URL del servidor**: http://localhost:3001
**Ruta a probar**: http://localhost:3001/revisor/certificados
