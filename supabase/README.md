# Configuración de Base de Datos Supabase

Este directorio contiene los scripts SQL necesarios para configurar la base de datos de Docuvi en Supabase.

## 🚀 Inicio Rápido

**La forma más rápida de configurar la base de datos:**

1. Abre el SQL Editor en tu proyecto de Supabase
2. Ejecuta el archivo **`migration_complete.sql`**
3. ¡Listo! Tu base de datos está configurada

Para instrucciones detalladas, consulta **`SETUP_GUIDE.md`**

## 📁 Archivos Disponibles

### Scripts de Migración

- **`migration_complete.sql`** ⭐ - Script completo todo-en-uno (RECOMENDADO)
- **`rollback.sql`** - Script para deshacer la migración

### Scripts Modulares

Si prefieres ejecutar por pasos, usa estos archivos en orden:

1. **`schema.sql`** - Crea todas las tablas, índices y triggers básicos
2. **`functions.sql`** - Crea funciones personalizadas, triggers adicionales y vistas
3. **`policies.sql`** - Configura las políticas de Row Level Security (RLS)
4. **`storage.sql`** - Configura el bucket de almacenamiento de archivos

### Documentación

- **`SETUP_GUIDE.md`** - Guía completa de instalación y configuración paso a paso
- **`DATABASE_SCHEMA.md`** - Documentación detallada del esquema de base de datos
- **`README.md`** - Este archivo

### Datos de Prueba (Opcional)

- **`seed_data.sql`** - Script para poblar la base de datos con datos de ejemplo

## 📊 Diagrama de Base de Datos

Para ver el diagrama completo de relaciones y documentación del esquema, consulta `DATABASE_SCHEMA.md`.

## Descripción de Scripts

### schema.sql
Crea la estructura principal:
- Tabla `usuarios` (extiende auth.users)
- Tabla `clientes` (empresas/contratistas)
- Tabla `tipos_documento` (catálogo de tipos de documentos)
- Tabla `requerimientos_cliente` (documentos requeridos por cliente)
- Tabla `documentos` (archivos cargados)
- Tabla `certificados` y `certificados_detalle` (certificados de cumplimiento)
- Tabla `notificaciones` (notificaciones en tiempo real)
- Tabla `auditoria` (registro de acciones)
- Triggers para `updated_at` automático

### functions.sql
Crea funciones útiles:
- `handle_new_user()` - Crea usuario en tabla pública cuando se registra
- `marcar_documento_eliminado()` - Soft delete de documentos
- `restaurar_documento()` - Restaurar documento eliminado
- `obtener_siguiente_version()` - Versionado de documentos
- `verificar_cumplimiento_cliente()` - Verifica si cliente cumple requisitos
- `generar_codigo_certificado()` - Genera código único para certificados
- `crear_notificacion()` - Crea notificación para usuario
- `registrar_auditoria()` - Registra acción en auditoría
- `obtener_documentos_proximos_vencer()` - Lista documentos por vencer
- `actualizar_certificados_vencidos()` - Marca certificados vencidos
- Triggers para notificaciones automáticas
- Vista `vista_cumplimiento_clientes` - Resumen de cumplimiento

### policies.sql
Configura seguridad a nivel de fila (RLS):
- Políticas para revisores (acceso completo)
- Políticas para clientes (acceso solo a sus datos)
- Políticas de storage para archivos
- Funciones helper para verificar roles

### storage.sql
Configura el bucket de almacenamiento:
- Bucket privado `documentos`
- Límite de 10MB por archivo
- Tipos MIME permitidos: PDF, DOC, DOCX, JPG, PNG

## Verificación Post-Instalación

Después de ejecutar todos los scripts, verifica:

1. ✅ Todas las tablas están creadas
2. ✅ RLS está habilitado en todas las tablas
3. ✅ El bucket 'documentos' existe
4. ✅ Las funciones y triggers están activos
5. ✅ Las políticas están aplicadas

## Datos de Prueba (Opcional)

Para crear un usuario revisor de prueba:

```sql
-- Primero crear el usuario en Authentication > Users en Supabase UI
-- Luego actualizar su rol:
UPDATE public.usuarios
SET rol = 'revisor'
WHERE correo = 'admin@example.com';
```

## Mantenimiento

### Actualizar certificados vencidos (ejecutar periódicamente):
```sql
SELECT public.actualizar_certificados_vencidos();
```

### Ver documentos próximos a vencer:
```sql
SELECT * FROM public.obtener_documentos_proximos_vencer(30);
```

### Ver resumen de cumplimiento:
```sql
SELECT * FROM public.vista_cumplimiento_clientes;
```

## Troubleshooting

### Error: "permission denied for schema public"
Asegúrate de estar usando el SQL Editor de Supabase con permisos de administrador.

### Error: "relation already exists"
Algunos scripts son idempotentes. Si ya ejecutaste un script, puedes omitir los errores de "already exists".

### Storage policies no funcionan
Verifica que el bucket 'documentos' exista primero. Puedes crearlo manualmente en Storage > Buckets si es necesario.
