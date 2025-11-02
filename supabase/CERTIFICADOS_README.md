# Implementación de Certificados en PDF

Este documento describe la implementación completa del sistema de certificados de cumplimiento con generación de PDF para Docuvi.

## 📋 Contenido

1. [Descripción General](#descripción-general)
2. [Instalación](#instalación)
3. [Estructura de la Base de Datos](#estructura-de-la-base-de-datos)
4. [Funciones Disponibles](#funciones-disponibles)
5. [Seguridad](#seguridad)
6. [Uso](#uso)
7. [Mantenimiento](#mantenimiento)

## 🎯 Descripción General

El sistema de certificados permite:

- ✅ Generar certificados de cumplimiento en formato PDF
- ✅ Verificar autenticidad mediante código QR y hash SHA-256
- ✅ Gestionar el ciclo de vida (activo, vencido, revocado)
- ✅ Notificaciones automáticas a clientes
- ✅ Verificación pública de certificados
- ✅ Auditoría completa de acciones

## 🚀 Instalación

### Scripts Disponibles

El sistema incluye varios scripts SQL para diferentes propósitos:

| Script | Propósito | Cuándo usarlo |
|--------|-----------|---------------|
| `certificados_implementation.sql` | Instalación completa | Primera instalación |
| `certificados_reinstall.sql` | Reinstalación limpia | Actualizar o resolver errores |
| `certificados_rollback.sql` | Desinstalación | Remover el sistema completamente |
| `certificados_test.sql` | Verificación y pruebas | Verificar instalación |

### Prerequisitos

Antes de ejecutar el script, asegúrate de que:

1. El esquema base de Docuvi esté instalado (`schema.sql`)
2. Las funciones base estén creadas (`functions.sql`)
3. La extensión `uuid-ossp` esté habilitada

### Pasos de Instalación

#### Opción 1: Primera Instalación

1. **Conectarse a Supabase**
   - Ve a tu proyecto en [Supabase](https://supabase.com)
   - Navega a: **SQL Editor** → **New Query**

2. **Ejecutar el script de implementación**
   ```bash
   # Copia el contenido de certificados_implementation.sql
   # y pégalo en el SQL Editor
   ```

3. **Verificar instalación**
   ```bash
   # Ejecutar el script de pruebas
   psql -f supabase/certificados_test.sql
   ```

#### Opción 2: Reinstalación (Si ya existe)

Si ya ejecutaste el script antes y quieres reinstalar:

```bash
# Esto eliminará y recreará todo
psql -f supabase/certificados_reinstall.sql
```

**⚠️ ADVERTENCIA**: Esto eliminará todos los datos existentes de certificados.

#### Opción 3: Instalación desde línea de comandos

```bash
# Primera instalación
psql -h db.xxxxxxxxxxxx.supabase.co \
     -p 5432 \
     -d postgres \
     -U postgres \
     -f supabase/certificados_implementation.sql

# Verificar
psql -f supabase/certificados_test.sql
```

## 📊 Estructura de la Base de Datos

### Tablas

#### `certificados`

Tabla principal de certificados de cumplimiento.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | ID único del certificado |
| `codigo` | TEXT | Código único (CERT-YYYY-XXXXXX) |
| `hash` | TEXT | Hash SHA-256 para verificación |
| `cliente_id` | UUID | ID del cliente certificado |
| `emitido_por` | UUID | ID del revisor que emitió |
| `fecha_emision` | TIMESTAMPTZ | Fecha de emisión |
| `fecha_validez_desde` | DATE | Inicio de validez |
| `fecha_validez_hasta` | DATE | Fin de validez |
| `estado` | TEXT | activo, revocado, vencido |
| `motivo_revocacion` | TEXT | Motivo si fue revocado |
| `datos` | JSONB | Datos adicionales |

#### `certificados_detalle`

Detalle de documentos incluidos en cada certificado.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | ID único del detalle |
| `certificado_id` | UUID | ID del certificado |
| `requerimiento_id` | UUID | ID del requerimiento |
| `documento_id` | UUID | ID del documento certificado |
| `tipo_documento_nombre` | TEXT | Nombre del tipo de documento |
| `fecha_aprobacion` | TIMESTAMPTZ | Fecha de aprobación |
| `fecha_vencimiento` | DATE | Fecha de vencimiento (opcional) |
| `aprobado_por` | UUID | ID del revisor que aprobó |

### Índices

Creados automáticamente para optimizar consultas:

- `idx_certificados_codigo` - Búsqueda por código
- `idx_certificados_cliente` - Filtrar por cliente
- `idx_certificados_estado` - Filtrar por estado
- `idx_certificados_fecha_validez` - Ordenar por vencimiento
- `idx_certificados_detalle_certificado` - Detalles de un certificado
- `idx_certificados_detalle_documento` - Documentos certificados

## 🔧 Funciones Disponibles

### `generar_codigo_certificado()`

Genera un código único para un nuevo certificado.

```sql
SELECT generar_codigo_certificado();
-- Resultado: 'CERT-2025-123456'
```

### `verificar_cumplimiento_cliente(cliente_id UUID)`

Verifica si un cliente cumple con todos los requerimientos obligatorios.

```sql
SELECT * FROM verificar_cumplimiento_cliente('uuid-del-cliente');
-- Retorna: cumple, total_requerimientos, requerimientos_cumplidos, requerimientos_pendientes
```

### `actualizar_certificados_vencidos()`

Marca como vencidos los certificados cuya fecha de validez haya expirado.

```sql
SELECT actualizar_certificados_vencidos();
-- Retorna: número de certificados actualizados
```

**Recomendación**: Ejecutar diariamente mediante cron job.

### `obtener_certificados_proximos_vencer(dias_limite INT)`

Obtiene certificados que vencen en los próximos N días.

```sql
SELECT * FROM obtener_certificados_proximos_vencer(30);
-- Retorna certificados que vencen en los próximos 30 días
```

## 🔒 Seguridad

### Row Level Security (RLS)

Todas las tablas tienen RLS habilitado con las siguientes políticas:

#### Para Revisores
- ✅ Acceso completo a todos los certificados
- ✅ Pueden crear, leer, actualizar y revocar certificados

#### Para Clientes
- ✅ Solo pueden ver sus propios certificados
- ❌ No pueden crear ni modificar certificados

#### Acceso Público
- ✅ Cualquiera puede verificar certificados por código
- ✅ Acceso de solo lectura para verificación de autenticidad
- ✅ Usado en la página `/verificar/[codigo]`

### Validación de Datos

- El `estado` solo acepta: 'activo', 'revocado', 'vencido'
- El `codigo` es único en toda la base de datos
- Las fechas de validez deben ser coherentes
- Referencias a otras tablas con cascada

## 💻 Uso

### Desde el Frontend

El sistema ya está integrado con el frontend:

```typescript
import { generarCertificado } from '@/services/certificados.service'
import { generarCertificadoPDF } from '@/lib/generarPDF'

// 1. Generar certificado en la BD
const certificado = await generarCertificado(
  clienteId,
  emisorId,
  fechaDesde,
  fechaHasta
)

// 2. Obtener certificado completo
const certificadoCompleto = await obtenerCertificadoPorId(certificado.id)

// 3. Generar PDF
await generarCertificadoPDF(certificadoCompleto)
```

### Desde SQL

#### Crear un certificado manualmente

```sql
-- 1. Verificar cumplimiento
SELECT * FROM verificar_cumplimiento_cliente('cliente-uuid');

-- 2. Generar código
SELECT generar_codigo_certificado();

-- 3. Insertar certificado
INSERT INTO certificados (
  codigo,
  hash,
  cliente_id,
  emitido_por,
  fecha_validez_desde,
  fecha_validez_hasta,
  datos
) VALUES (
  'CERT-2025-123456',
  'hash-sha256-aqui',
  'cliente-uuid',
  'revisor-uuid',
  '2025-01-01',
  '2026-01-01',
  '{"requerimientos_cumplidos": 5, "total_requerimientos": 5}'::jsonb
);
```

#### Revocar un certificado

```sql
UPDATE certificados
SET
  estado = 'revocado',
  motivo_revocacion = 'Documentos desactualizados',
  revocado_por = 'revisor-uuid',
  revocado_en = NOW()
WHERE codigo = 'CERT-2025-123456';
```

#### Consultar certificados de un cliente

```sql
SELECT * FROM vista_certificados_completos
WHERE cliente_id = 'cliente-uuid'
ORDER BY fecha_emision DESC;
```

## 🔄 Mantenimiento

### Tareas Diarias

**Actualizar certificados vencidos**

Configurar un cron job para ejecutar diariamente:

```sql
-- Opción 1: pg_cron (si está instalado)
SELECT cron.schedule(
  'actualizar-certificados-vencidos',
  '0 0 * * *', -- Medianoche todos los días
  $$SELECT public.actualizar_certificados_vencidos()$$
);

-- Opción 2: Supabase Edge Function (recomendado)
-- Crear una Edge Function que se ejecute diariamente
```

### Tareas Semanales

**Alertar sobre certificados próximos a vencer**

```sql
-- Obtener certificados que vencen en 30 días
SELECT
  codigo,
  cliente_nombre,
  fecha_validez_hasta,
  dias_hasta_vencimiento
FROM vista_certificados_completos
WHERE estado = 'activo'
  AND dias_hasta_vencimiento <= 30
ORDER BY dias_hasta_vencimiento ASC;
```

### Monitoreo

**Estadísticas de certificados**

```sql
-- Resumen general
SELECT
  COUNT(*) as total_certificados,
  COUNT(*) FILTER (WHERE estado = 'activo') as activos,
  COUNT(*) FILTER (WHERE estado = 'vencido') as vencidos,
  COUNT(*) FILTER (WHERE estado = 'revocado') as revocados
FROM certificados;

-- Por cliente
SELECT * FROM vista_certificados_clientes
ORDER BY total_certificados DESC;
```

## 📝 Vistas Disponibles

### `vista_certificados_clientes`

Resumen de certificados por cliente.

```sql
SELECT * FROM vista_certificados_clientes;
```

Columnas:
- `cliente_id`, `nombre_empresa`
- `total_certificados`, `certificados_activos`, `certificados_vencidos`, `certificados_revocados`
- `ultimo_certificado_emitido`, `proxima_fecha_vencimiento`

### `vista_certificados_completos`

Vista completa con toda la información del certificado.

```sql
SELECT * FROM vista_certificados_completos
WHERE es_valido = true;
```

## 🐛 Solución de Problemas

### Error: "trigger already exists" al ejecutar el script

**Síntoma**: `ERROR: 42710: trigger "trigger_certificados_actualizado" for relation "certificados" already exists`

**Causa**: El script ya fue ejecutado anteriormente y algunos objetos ya existen.

**Solución 1 - Reinstalación limpia** (Recomendado):
```bash
# Esto eliminará todos los datos de certificados y reinstalará
psql -f supabase/certificados_reinstall.sql
```

**Solución 2 - Solo actualizar funciones y triggers**:
```sql
-- Ejecutar solo las funciones (CREATE OR REPLACE las actualiza)
-- El script ya está actualizado con DROP TRIGGER IF EXISTS
psql -f supabase/certificados_implementation.sql
```

**Solución 3 - Rollback completo**:
```bash
# Desinstalar completamente y luego reinstalar
psql -f supabase/certificados_rollback.sql
psql -f supabase/certificados_implementation.sql
```

### Error: "función no encontrada"

```bash
# Verificar que las funciones base estén instaladas
SELECT proname FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
AND proname LIKE '%certificado%';
```

### Error: "RLS impide el acceso"

```bash
# Verificar las políticas RLS
SELECT * FROM pg_policies
WHERE tablename IN ('certificados', 'certificados_detalle');
```

### Certificados no se actualizan a vencidos

```bash
# Ejecutar manualmente
SELECT actualizar_certificados_vencidos();

# Verificar cron jobs
SELECT * FROM cron.job;
```

### Error: "tabla ya existe"

```bash
# Si ves errores de tablas duplicadas, usa el script de reinstalación
psql -f supabase/certificados_reinstall.sql
```

## 📚 Recursos Adicionales

- [Documentación de Supabase](https://supabase.com/docs)
- [Repositorio del Proyecto](https://github.com/tu-repo/docuvi)
- [Código Frontend: generarPDF.ts](../src/lib/generarPDF.ts)
- [Servicio: certificados.service.ts](../src/services/certificados.service.ts)

## 🤝 Soporte

Para reportar problemas o solicitar funcionalidades:

1. Crear un issue en el repositorio
2. Contactar al equipo de desarrollo
3. Revisar la documentación en `/docs`

---

**Versión**: 1.0
**Última actualización**: 2025-01-01
**Mantenido por**: Equipo Docuvi
