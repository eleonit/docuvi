# Actualización: Nuevos Campos para Clientes

## Resumen de Cambios

Se agregaron campos adicionales al formulario y base de datos de clientes para capturar información más completa:

### Nuevos Campos Agregados:

1. **CUIT/CUIL** - Identificación tributaria
2. **Domicilio** - Dirección física del cliente
3. **Nombre del Representante** - Representante legal o persona de contacto
4. **Celular/WhatsApp** - Número de celular adicional
5. **Tipo de Persona** - Persona física o jurídica

## Archivos Modificados

### 1. Base de Datos

**`supabase/schema.sql`**
- Agregados 5 nuevos campos a la tabla `clientes`
- Creados índices para `cuit_cuil` y `tipo_persona`

**`supabase/add_client_extra_fields.sql`** (NUEVO)
- Script de migración para agregar los campos a la BD existente

### 2. TypeScript Types

**`src/types/database.ts`**
- Actualizado el tipo `TipoPersona` = 'fisica' | 'juridica'
- Actualizados los tipos Row, Insert y Update de la tabla `clientes`

**`src/types/index.ts`**
- Actualizado `FormularioCliente` con los nuevos campos

### 3. Frontend

**`src/app/revisor/clientes/page.tsx`**
- Formulario de creación actualizado con todos los campos nuevos
- Tabla de visualización mejorada mostrando:
  - CUIT/CUIL
  - Tipo de persona (badge)
  - Nombre del representante
  - Celular y teléfono

**`src/app/revisor/clientes/[id]/page.tsx`**
- Vista de detalle actualizada con secciones organizadas:
  - Datos Generales (tipo persona, CUIT, estado usuario)
  - Domicilio
  - Representante/Contacto
  - Datos de Contacto (email, teléfono, celular)
- Modal de edición actualizado con todos los campos

### 4. Backend

**`src/app/api/clientes/route.ts`**
- Endpoint POST actualizado para recibir y guardar los nuevos campos

## Instrucciones de Instalación

### Paso 1: Ejecutar Migración SQL

Tienes dos opciones:

#### Opción A: Script de Migración (Recomendado)

Ejecuta el script de migración en Supabase:

```bash
# Desde Supabase SQL Editor
# Ejecuta el archivo: supabase/add_client_extra_fields.sql
```

O desde la terminal:

```bash
supabase db execute --file supabase/add_client_extra_fields.sql
```

#### Opción B: Recrear desde cero

Si prefieres recrear todas las tablas:

```bash
# ADVERTENCIA: Esto eliminará todos los datos
supabase db reset
```

### Paso 2: Verificar Cambios

Verifica que los campos se agregaron correctamente:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'clientes'
  AND column_name IN ('cuit_cuil', 'domicilio', 'nombre_representante', 'celular_contacto', 'tipo_persona');
```

Deberías ver:

| column_name          | data_type | is_nullable |
|---------------------|-----------|-------------|
| cuit_cuil           | text      | YES         |
| domicilio           | text      | YES         |
| nombre_representante| text      | YES         |
| celular_contacto    | text      | YES         |
| tipo_persona        | text      | YES         |

### Paso 3: Reiniciar Servidor de Desarrollo

```bash
npm run dev
```

## Uso de los Nuevos Campos

### Crear Cliente

1. Ve a **Clientes** → **Nuevo Cliente**
2. Selecciona el tipo de persona (Física o Jurídica)
3. Completa los campos adicionales:
   - Si es **Persona Jurídica**: los campos se adaptan para empresa
   - Si es **Persona Física**: los campos se adaptan para persona

### Editar Cliente

1. Ve al detalle de un cliente
2. Haz clic en **Editar Cliente**
3. Modifica los campos necesarios
4. Guarda cambios

### Campos Opcionales vs Obligatorios

**Obligatorios:**
- Tipo de Persona
- Nombre de Empresa/Nombre Completo
- Correo Electrónico

**Opcionales:**
- CUIT/CUIL
- Domicilio
- Nombre del Representante
- Teléfono Fijo
- Celular/WhatsApp

## Características Especiales

### Adaptación por Tipo de Persona

El formulario se adapta dinámicamente según el tipo de persona:

**Persona Jurídica:**
- "Nombre de la Empresa / Razón Social"
- "Nombre del Representante / Contacto"

**Persona Física:**
- "Nombre Completo"
- "Persona de Contacto (opcional)"

### Visualización en Tabla

La tabla de clientes muestra:
- **Cliente**: Nombre + representante (si existe)
- **CUIT/CUIL**: Con formato
- **Tipo**: Badge de color (Azul para Jurídica, Gris para Física)
- **Contacto**: Email + número preferente (celular o teléfono)
- **Usuario**: Estado de acceso al sistema

### Vista de Detalle Mejorada

La información se organiza en secciones:

1. **Datos Generales**
   - Tipo de persona, CUIT/CUIL, Estado de usuario

2. **Domicilio** (si existe)
   - Dirección completa

3. **Representante/Contacto** (si existe)
   - Nombre del representante o persona de contacto

4. **Datos de Contacto**
   - Email, Teléfono fijo, Celular/WhatsApp

## Retrocompatibilidad

✅ **Los clientes existentes siguen funcionando correctamente**

- Los nuevos campos son opcionales (nullable)
- Los clientes creados antes de esta actualización:
  - Se muestran con valores "-" o "No registrado"
  - Pueden editarse para agregar la información faltante
  - No hay pérdida de funcionalidad

## Validaciones

### Frontend
- Email: Validación HTML5 de formato
- Teléfonos: Tipo tel (acepta cualquier formato)
- CUIT/CUIL: Texto libre con placeholder de formato

### Backend
- Campos obligatorios: `nombre_empresa`, `correo_contacto`
- Constraint CHECK en `tipo_persona`: Solo 'fisica' o 'juridica'
- Todos los campos nuevos son opcionales

## Próximos Pasos Sugeridos

1. **Validación de CUIT/CUIL**
   - Implementar validación de formato argentino (XX-XXXXXXXX-X)
   - Validar dígito verificador

2. **Geocodificación**
   - Integrar API de Google Maps para validar domicilios
   - Autocompletar direcciones

3. **Búsqueda Avanzada**
   - Buscar por CUIT/CUIL
   - Filtrar por tipo de persona
   - Búsqueda por domicilio

4. **Exportación**
   - Incluir nuevos campos en exports CSV/Excel
   - Agregar a reportes PDF

## Soporte

Si encuentras problemas:

1. Verifica que el script SQL se ejecutó correctamente
2. Revisa la consola del navegador para errores de TypeScript
3. Verifica que los tipos estén actualizados en `database.ts`
4. Reinicia el servidor de desarrollo

## Checklist de Verificación

- [ ] Script SQL ejecutado exitosamente
- [ ] Servidor de desarrollo reiniciado
- [ ] Formulario de creación muestra todos los campos
- [ ] Formulario de edición muestra todos los campos
- [ ] Tabla de clientes muestra los nuevos datos
- [ ] Vista de detalle muestra toda la información
- [ ] Clientes existentes siguen funcionando
- [ ] Nuevos clientes se crean correctamente
- [ ] Edición de clientes funciona sin errores
