# Esquema de Base de Datos - Docuvi

## Diagrama de Relaciones

```
┌─────────────────┐
│   auth.users    │ (Supabase Auth)
└────────┬────────┘
         │
         ├─────────────────────────────────────────────────┐
         │                                                 │
         v                                                 v
┌────────────────────┐                          ┌──────────────────┐
│     usuarios       │                          │   notificaciones │
├────────────────────┤                          ├──────────────────┤
│ id (PK, FK)        │                          │ id (PK)          │
│ correo             │◄─────────────────────────┤ usuario_id (FK)  │
│ nombre             │                          │ tipo             │
│ rol (revisor/      │                          │ titulo           │
│      cliente)      │                          │ mensaje          │
│ creado_en          │                          │ leida            │
│ actualizado_en     │                          │ documento_id(FK) │
└─────────┬──────────┘                          │ requerimiento_id │
          │                                     └──────────────────┘
          │
          ├──────────────┐
          │              │
          v              v
┌──────────────────┐   ┌──────────────────┐
│    clientes      │   │    auditoria     │
├──────────────────┤   ├──────────────────┤
│ id (PK)          │   │ id (PK)          │
│ nombre_empresa   │   │ actor_id (FK)    │
│ correo_contacto  │   │ accion           │
│ telefono_contacto│   │ entidad          │
│ usuario_id (FK)  │   │ entidad_id       │
│ creado_por (FK)  │   │ datos (JSONB)    │
│ creado_en        │   │ creado_en        │
│ actualizado_en   │   └──────────────────┘
└────────┬─────────┘
         │
         │      ┌────────────────────────┐
         │      │  tipos_documento       │
         │      ├────────────────────────┤
         │      │ id (PK)                │
         │      │ nombre (UNIQUE)        │
         │      │ descripcion            │
         │      │ activo                 │
         │      │ creado_por (FK)        │
         │      │ creado_en              │
         │      │ actualizado_en         │
         │      └───────────┬────────────┘
         │                  │
         v                  v
┌────────────────────────────────────┐
│   requerimientos_cliente          │
├────────────────────────────────────┤
│ id (PK)                            │
│ cliente_id (FK)                    │
│ tipo_documento_id (FK)             │
│ obligatorio                        │
│ periodicidad_meses                 │
│ metadatos (JSONB)                  │
│ creado_en                          │
│ actualizado_en                     │
│ UNIQUE(cliente_id,                 │
│        tipo_documento_id)          │
└──────────────┬─────────────────────┘
               │
               v
┌──────────────────────────────────────┐
│          documentos                  │
├──────────────────────────────────────┤
│ id (PK)                              │
│ requerimiento_cliente_id (FK)        │
│ url                                  │
│ nombre_archivo                       │
│ version                              │
│ estado (pendiente/aprobado/          │
│         rechazado)                   │
│ motivo_rechazo                       │
│ fecha_carga                          │
│ fecha_vencimiento                    │
│ aprobado_por (FK)                    │
│ fecha_aprobacion                     │
│ eliminado (soft delete)              │
│ eliminado_por (FK)                   │
│ eliminado_en                         │
│ creado_en                            │
│ actualizado_en                       │
└────────────┬─────────────────────────┘
             │
             │      ┌─────────────────────────┐
             │      │    certificados         │
             │      ├─────────────────────────┤
             │      │ id (PK)                 │
             │      │ codigo (UNIQUE)         │
             │      │ hash                    │
             │      │ cliente_id (FK)         │
             │      │ emitido_por (FK)        │
             │      │ fecha_emision           │
             │      │ fecha_validez_desde     │
             │      │ fecha_validez_hasta     │
             │      │ estado (activo/revocado/│
             │      │         vencido)        │
             │      │ motivo_revocacion       │
             │      │ revocado_por (FK)       │
             │      │ revocado_en             │
             │      │ datos (JSONB)           │
             │      │ creado_en               │
             │      │ actualizado_en          │
             │      └───────────┬─────────────┘
             │                  │
             v                  v
┌────────────────────────────────────────────┐
│       certificados_detalle                 │
├────────────────────────────────────────────┤
│ id (PK)                                    │
│ certificado_id (FK)                        │
│ requerimiento_id (FK)                      │
│ documento_id (FK)                          │
│ tipo_documento_nombre                      │
│ fecha_aprobacion                           │
│ fecha_vencimiento                          │
│ aprobado_por (FK)                          │
│ datos (JSONB)                              │
│ creado_en                                  │
└────────────────────────────────────────────┘
```

## Tablas Principales

### 1. usuarios

Extiende la tabla `auth.users` de Supabase con información adicional.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID (PK, FK) | Referencia a auth.users(id) |
| correo | TEXT | Email del usuario |
| nombre | TEXT | Nombre completo |
| rol | TEXT | 'revisor' o 'cliente' |
| creado_en | TIMESTAMPTZ | Fecha de creación |
| actualizado_en | TIMESTAMPTZ | Última actualización |

**Triggers:**
- Se crea automáticamente cuando se registra un usuario en `auth.users`
- `updated_at` se actualiza automáticamente

---

### 2. clientes

Empresas o contratistas que deben cumplir con requisitos documentales.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID (PK) | Identificador único |
| nombre_empresa | TEXT | Razón social |
| correo_contacto | TEXT | Email de contacto |
| telefono_contacto | TEXT | Teléfono (opcional) |
| usuario_id | UUID (FK) | Usuario asociado (opcional) |
| creado_por | UUID (FK) | Revisor que lo creó |
| creado_en | TIMESTAMPTZ | Fecha de creación |
| actualizado_en | TIMESTAMPTZ | Última actualización |

**Relaciones:**
- Un cliente puede tener un usuario asociado (para acceso al portal)
- Fue creado por un revisor
- Tiene múltiples requerimientos
- Tiene múltiples certificados

---

### 3. tipos_documento

Catálogo de tipos de documentos que se pueden solicitar.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID (PK) | Identificador único |
| nombre | TEXT (UNIQUE) | Nombre del tipo (ej: "RFC", "INE") |
| descripcion | TEXT | Descripción opcional |
| activo | BOOLEAN | Si está disponible para asignar |
| creado_por | UUID (FK) | Revisor que lo creó |
| creado_en | TIMESTAMPTZ | Fecha de creación |
| actualizado_en | TIMESTAMPTZ | Última actualización |

**Ejemplos:**
- RFC
- INE/IFE
- CURP
- Comprobante de Domicilio
- Acta Constitutiva
- Constancia de Situación Fiscal

---

### 4. requerimientos_cliente

Documentos específicos requeridos para cada cliente.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID (PK) | Identificador único |
| cliente_id | UUID (FK) | Cliente al que pertenece |
| tipo_documento_id | UUID (FK) | Tipo de documento requerido |
| obligatorio | BOOLEAN | Si es obligatorio para certificar |
| periodicidad_meses | INTEGER | Cada cuántos meses se renueva |
| metadatos | JSONB | Datos adicionales |
| creado_en | TIMESTAMPTZ | Fecha de creación |
| actualizado_en | TIMESTAMPTZ | Última actualización |

**Constraint:**
- UNIQUE(cliente_id, tipo_documento_id) - No duplicados

**Relaciones:**
- Pertenece a un cliente
- Es de un tipo de documento
- Tiene múltiples versiones de documentos

---

### 5. documentos

Archivos cargados por los clientes con control de versiones.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID (PK) | Identificador único |
| requerimiento_cliente_id | UUID (FK) | Requerimiento al que pertenece |
| url | TEXT | Ruta en Storage |
| nombre_archivo | TEXT | Nombre del archivo |
| version | INTEGER | Número de versión |
| estado | TEXT | 'pendiente', 'aprobado', 'rechazado' |
| motivo_rechazo | TEXT | Razón del rechazo |
| fecha_carga | TIMESTAMPTZ | Cuándo se subió |
| fecha_vencimiento | DATE | Cuándo expira (opcional) |
| aprobado_por | UUID (FK) | Revisor que aprobó/rechazó |
| fecha_aprobacion | TIMESTAMPTZ | Cuándo se aprobó/rechazó |
| eliminado | BOOLEAN | Soft delete |
| eliminado_por | UUID (FK) | Quién lo eliminó |
| eliminado_en | TIMESTAMPTZ | Cuándo se eliminó |
| creado_en | TIMESTAMPTZ | Fecha de creación |
| actualizado_en | TIMESTAMPTZ | Última actualización |

**Características:**
- Versionado automático
- Soft delete (no se borra físicamente)
- Estados: pendiente → aprobado/rechazado
- Notificaciones automáticas al cambiar estado

**Índices:**
- idx_documentos_requerimiento
- idx_documentos_estado

---

### 6. certificados

Certificados de cumplimiento generados cuando el cliente cumple requisitos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID (PK) | Identificador único |
| codigo | TEXT (UNIQUE) | Código de verificación pública |
| hash | TEXT | Hash para verificación de integridad |
| cliente_id | UUID (FK) | Cliente certificado |
| emitido_por | UUID (FK) | Revisor que emitió |
| fecha_emision | TIMESTAMPTZ | Fecha de emisión |
| fecha_validez_desde | DATE | Válido desde |
| fecha_validez_hasta | DATE | Válido hasta |
| estado | TEXT | 'activo', 'revocado', 'vencido' |
| motivo_revocacion | TEXT | Por qué se revocó |
| revocado_por | UUID (FK) | Quién lo revocó |
| revocado_en | TIMESTAMPTZ | Cuándo se revocó |
| datos | JSONB | Datos adicionales |
| creado_en | TIMESTAMPTZ | Fecha de creación |
| actualizado_en | TIMESTAMPTZ | Última actualización |

**Formato del código:** `CERT-YYYY-XXXXXX` (ej: CERT-2025-123456)

**Índices:**
- idx_certificados_codigo
- idx_certificados_cliente

---

### 7. certificados_detalle

Detalle de qué documentos se incluyeron en cada certificado.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID (PK) | Identificador único |
| certificado_id | UUID (FK) | Certificado al que pertenece |
| requerimiento_id | UUID (FK) | Requerimiento cumplido |
| documento_id | UUID (FK) | Documento aprobado |
| tipo_documento_nombre | TEXT | Nombre del tipo (snapshot) |
| fecha_aprobacion | TIMESTAMPTZ | Cuándo se aprobó |
| fecha_vencimiento | DATE | Cuándo vence |
| aprobado_por | UUID (FK) | Revisor que aprobó |
| datos | JSONB | Datos adicionales |
| creado_en | TIMESTAMPTZ | Fecha de creación |

**Índice:**
- idx_certificados_detalle_certificado

---

### 8. notificaciones

Sistema de notificaciones en tiempo real.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID (PK) | Identificador único |
| usuario_id | UUID (FK) | Usuario destinatario |
| tipo | TEXT | Tipo de notificación |
| titulo | TEXT | Título |
| mensaje | TEXT | Mensaje completo |
| leida | BOOLEAN | Si se leyó |
| datos | JSONB | Datos adicionales |
| documento_id | UUID (FK) | Documento relacionado |
| requerimiento_id | UUID (FK) | Requerimiento relacionado |
| creado_en | TIMESTAMPTZ | Cuándo se creó |
| leida_en | TIMESTAMPTZ | Cuándo se leyó |

**Tipos de notificación:**
- documento_nuevo
- documento_aprobado
- documento_rechazado
- documento_proximo_vencer
- certificado_emitido
- certificado_revocado
- etc.

**Índice:**
- idx_notificaciones_usuario

**Triggers:**
- Se crean automáticamente al aprobar/rechazar documentos
- Se crean al subir nuevos documentos

---

### 9. auditoria

Registro completo de todas las acciones en el sistema.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID (PK) | Identificador único |
| actor_id | UUID (FK) | Usuario que realizó la acción |
| accion | TEXT | Tipo de acción (CREAR, ACTUALIZAR, etc.) |
| entidad | TEXT | Tabla afectada |
| entidad_id | UUID | ID del registro afectado |
| datos | JSONB | Datos antes/después |
| creado_en | TIMESTAMPTZ | Cuándo ocurrió |

**Acciones comunes:**
- CREAR
- ACTUALIZAR
- ELIMINAR
- APROBAR_DOCUMENTO
- RECHAZAR_DOCUMENTO
- GENERAR_CERTIFICADO
- REVOCAR_CERTIFICADO

**Índices:**
- idx_auditoria_actor
- idx_auditoria_entidad
- idx_auditoria_fecha

---

## Funciones Principales

### Gestión de Documentos

```sql
-- Obtener siguiente versión de un documento
obtener_siguiente_version(req_cliente_id UUID) → INTEGER

-- Marcar documento como eliminado (soft delete)
marcar_documento_eliminado(documento_id UUID, usuario_id UUID) → VOID

-- Restaurar documento eliminado
restaurar_documento(documento_id UUID) → VOID
```

### Cumplimiento y Certificación

```sql
-- Verificar si un cliente cumple todos los requisitos
verificar_cumplimiento_cliente(cliente_id_param UUID) → TABLE(
  cumple BOOLEAN,
  total_requerimientos INTEGER,
  requerimientos_cumplidos INTEGER,
  requerimientos_pendientes INTEGER
)

-- Generar código único para certificado
generar_codigo_certificado() → TEXT

-- Actualizar certificados vencidos
actualizar_certificados_vencidos() → INTEGER
```

### Alertas y Reportes

```sql
-- Documentos próximos a vencer
obtener_documentos_proximos_vencer(dias_limite INTEGER DEFAULT 30) → TABLE(
  documento_id UUID,
  cliente_id UUID,
  cliente_nombre TEXT,
  tipo_documento TEXT,
  fecha_vencimiento DATE,
  dias_restantes INTEGER
)
```

### Notificaciones y Auditoría

```sql
-- Crear notificación
crear_notificacion(
  p_usuario_id UUID,
  p_tipo TEXT,
  p_titulo TEXT,
  p_mensaje TEXT,
  p_datos JSONB DEFAULT '{}',
  p_documento_id UUID DEFAULT NULL,
  p_requerimiento_id UUID DEFAULT NULL
) → UUID

-- Registrar en auditoría
registrar_auditoria(
  p_actor_id UUID,
  p_accion TEXT,
  p_entidad TEXT,
  p_entidad_id UUID,
  p_datos JSONB DEFAULT '{}'
) → UUID
```

### Helpers RLS

```sql
-- Obtener rol del usuario actual
obtener_rol_usuario() → TEXT

-- Verificar si el usuario es revisor
es_revisor() → BOOLEAN

-- Obtener ID del cliente asociado al usuario
obtener_cliente_id_usuario() → UUID
```

---

## Vistas

### vista_cumplimiento_clientes

Vista que muestra el estado de cumplimiento de todos los clientes.

```sql
SELECT * FROM public.vista_cumplimiento_clientes;
```

**Columnas:**
- cliente_id
- nombre_empresa
- total_requerimientos
- requerimientos_cumplidos
- requerimientos_pendientes
- requerimientos_rechazados
- requerimientos_obligatorios

---

## Triggers Automáticos

### Timestamps

Todas las tablas con `actualizado_en` actualizan este campo automáticamente al hacer UPDATE.

### Gestión de Usuarios

- `on_auth_user_created`: Crea registro en `public.usuarios` cuando se crea un usuario en `auth.users`

### Notificaciones

- `trigger_notificar_documento`: Notifica al cliente cuando su documento es aprobado/rechazado
- `trigger_notificar_nuevo_documento`: Notifica al revisor cuando se sube un nuevo documento

---

## Row Level Security (RLS)

Todas las tablas tienen RLS habilitado con políticas específicas:

### Revisores
- Acceso completo a todas las tablas
- Pueden crear, leer, actualizar y eliminar

### Clientes
- Solo ven sus propios datos
- Solo ven sus requerimientos y documentos
- Pueden subir documentos a sus requerimientos
- No pueden ver otros clientes

### Público
- Solo puede verificar certificados por código (página pública de verificación)

---

## Storage

### Bucket: documentos

- **Tipo:** Privado
- **Límite:** 10MB por archivo
- **Tipos permitidos:**
  - application/pdf
  - application/msword
  - application/vnd.openxmlformats-officedocument.wordprocessingml.document
  - image/jpeg
  - image/png
  - image/jpg

### Estructura de Carpetas

```
documentos/
├── {cliente_id}/
│   ├── {tipo_documento_id}/
│   │   ├── v1/
│   │   │   └── archivo.pdf
│   │   ├── v2/
│   │   │   └── archivo_actualizado.pdf
│   │   └── v3/
│   │       └── archivo_final.pdf
```

### Políticas de Storage

- **Revisores:** Pueden ver, subir y eliminar todos los archivos
- **Clientes:** Solo pueden ver y subir archivos en su carpeta (`{su_cliente_id}/`)

---

## Flujos Principales

### Flujo 1: Creación de Cliente

1. Revisor crea cliente (opcional: con usuario)
2. Sistema crea registro en `clientes`
3. Si se crea usuario, trigger crea registro en `usuarios`
4. Auditoría registra la acción

### Flujo 2: Asignación de Requerimientos

1. Revisor asigna tipos de documento al cliente
2. Sistema crea registros en `requerimientos_cliente`
3. Cliente puede ver los requerimientos asignados

### Flujo 3: Carga de Documento

1. Cliente sube archivo a Storage
2. Sistema crea registro en `documentos` con estado 'pendiente'
3. Función calcula versión automáticamente
4. Trigger notifica al revisor

### Flujo 4: Revisión de Documento

1. Revisor aprueba o rechaza documento
2. Sistema actualiza estado en `documentos`
3. Trigger notifica al cliente
4. Auditoría registra la acción

### Flujo 5: Generación de Certificado

1. Sistema verifica cumplimiento con `verificar_cumplimiento_cliente()`
2. Si cumple, genera código único
3. Crea registro en `certificados`
4. Crea detalles en `certificados_detalle`
5. Genera PDF con código QR para verificación

### Flujo 6: Verificación Pública

1. Usuario ingresa código en página pública
2. Sistema busca en `certificados` (permitido por RLS público)
3. Muestra detalles del certificado y su validez

---

## Mantenimiento

### Tareas Programadas Recomendadas

```sql
-- Ejecutar diariamente
SELECT public.actualizar_certificados_vencidos();

-- Ejecutar semanalmente
SELECT * FROM public.obtener_documentos_proximos_vencer(30);
-- Enviar alertas según resultados
```

### Limpieza de Datos

```sql
-- Ver documentos eliminados hace más de 90 días
SELECT * FROM public.documentos
WHERE eliminado = true
  AND eliminado_en < NOW() - INTERVAL '90 days';

-- Eliminar notificaciones leídas hace más de 6 meses
DELETE FROM public.notificaciones
WHERE leida = true
  AND leida_en < NOW() - INTERVAL '6 months';
```

---

## Permisos y Seguridad

### Service Role (Servidor)

Usado para operaciones que requieren bypass de RLS:
- Crear usuarios con roles específicos
- Crear notificaciones
- Registrar auditoría

### Anon Key (Cliente)

Usado para operaciones autenticadas con RLS:
- Todo lo demás (CRUD normal)

### Best Practices

1. Nunca exponer `service_role_key` en el frontend
2. Siempre usar `anon_key` en el cliente
3. Confiar en RLS para seguridad a nivel de fila
4. Validar datos en el servidor (API routes)
5. Usar funciones de base de datos para lógica compleja

---

## Índices y Performance

### Índices Principales

- Claves primarias (automático)
- Claves foráneas (automático)
- idx_documentos_requerimiento (búsquedas frecuentes)
- idx_documentos_estado (filtros comunes)
- idx_certificados_codigo (verificación pública)
- idx_notificaciones_usuario (panel de usuario)
- idx_auditoria_fecha (reportes históricos)

### Optimizaciones

- JSONB para metadatos flexibles
- Índices parciales (`WHERE eliminado = false`)
- Vistas materializadas para reportes (futuro)

---

Este esquema está optimizado para:
- Trazabilidad completa (auditoría)
- Versionado de documentos
- Notificaciones en tiempo real
- Verificación pública de certificados
- Escalabilidad
- Seguridad multi-tenant
