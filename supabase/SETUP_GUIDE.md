# Guía de Configuración de Supabase - Docuvi

Esta guía te llevará paso a paso para configurar la base de datos de Docuvi en Supabase.

## Requisitos Previos

- Una cuenta en [Supabase](https://supabase.com)
- Un proyecto creado en Supabase
- Acceso al SQL Editor de Supabase

## Opción 1: Migración Completa (Recomendado)

Esta es la forma más rápida de configurar la base de datos. Ejecuta un solo script que contiene todo.

### Pasos:

1. Abre tu proyecto en Supabase
2. Ve a **SQL Editor** en el menú lateral
3. Haz clic en **New query**
4. Copia y pega el contenido completo del archivo `migration_complete.sql`
5. Haz clic en **Run** o presiona `Ctrl + Enter`
6. Espera a que termine la ejecución (puede tomar 30-60 segundos)

✅ **¡Listo!** Tu base de datos está completamente configurada.

## Opción 2: Migración Por Pasos

Si prefieres ejecutar los scripts por separado o necesitas más control:

### Paso 1: Schema (Tablas e Índices)

```sql
-- Ejecutar: schema.sql
```

Este script crea:
- 9 tablas principales
- Índices para optimizar consultas
- Triggers para actualizar timestamps automáticamente

### Paso 2: Funciones y Triggers

```sql
-- Ejecutar: functions.sql
```

Este script crea:
- Funciones de utilidad (cumplimiento, versiones, etc.)
- Triggers para notificaciones automáticas
- Vista de cumplimiento de clientes

### Paso 3: Políticas de Seguridad (RLS)

```sql
-- Ejecutar: policies.sql
```

Este script configura:
- Row Level Security en todas las tablas
- Políticas de acceso para revisores y clientes
- Políticas para storage de archivos

### Paso 4: Configuración de Storage

```sql
-- Ejecutar: storage.sql
```

Este script crea:
- Bucket privado `documentos`
- Límite de 10MB por archivo
- Tipos MIME permitidos (PDF, DOC, DOCX, JPG, PNG)

## Verificación Post-Instalación

Ejecuta estas consultas para verificar que todo esté correcto:

### 1. Verificar tablas creadas

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

Deberías ver 9 tablas:
- auditoria
- certificados
- certificados_detalle
- clientes
- documentos
- notificaciones
- requerimientos_cliente
- tipos_documento
- usuarios

### 2. Verificar RLS está activo

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

Todas las tablas deben tener `rowsecurity = true`.

### 3. Verificar funciones

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```

Deberías ver al menos 13 funciones.

### 4. Verificar bucket de storage

```sql
SELECT * FROM storage.buckets WHERE id = 'documentos';
```

Debe existir un bucket llamado `documentos` con `public = false`.

### 5. Ver vista de cumplimiento

```sql
SELECT * FROM public.vista_cumplimiento_clientes LIMIT 10;
```

Debería ejecutarse sin errores (puede estar vacía si no hay datos).

## Configuración del Proyecto Next.js

Una vez que la base de datos esté lista, configura las variables de entorno:

### 1. Obtener credenciales

En tu proyecto de Supabase:
1. Ve a **Settings** → **API**
2. Copia los siguientes valores:
   - Project URL
   - `anon` public key
   - `service_role` key (secreto)

### 2. Configurar .env.local

Crea o actualiza el archivo `.env.local` en la raíz del proyecto:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=tu_project_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
```

**Importante:** No compartas el `service_role_key` públicamente.

## Crear Usuario Revisor (Admin)

Para comenzar a usar el sistema, necesitas al menos un usuario revisor:

### Opción A: Desde Supabase UI (Recomendado)

1. Ve a **Authentication** → **Users**
2. Haz clic en **Add user**
3. Completa:
   - Email: `admin@docuvi.com` (o el que prefieras)
   - Password: (contraseña segura)
   - User Metadata (JSON):
   ```json
   {
     "nombre": "Administrador",
     "rol": "revisor"
   }
   ```
4. Haz clic en **Create user**

El trigger automático creará el registro en la tabla `usuarios` con el rol `revisor`.

### Opción B: Manual con SQL

```sql
-- 1. Insertar en auth.users (desde UI o con service role)
-- 2. Actualizar rol en tabla usuarios
UPDATE public.usuarios
SET rol = 'revisor'
WHERE correo = 'admin@docuvi.com';
```

## Datos de Prueba (Opcional)

Para probar el sistema, puedes insertar algunos tipos de documento de ejemplo:

```sql
-- Insertar tipos de documento comunes
-- Nota: Necesitas el UUID del usuario revisor
INSERT INTO public.tipos_documento (nombre, descripcion, creado_por, activo)
VALUES
  ('RFC', 'Registro Federal de Contribuyentes', 'uuid-del-revisor', true),
  ('INE/IFE', 'Identificación Oficial', 'uuid-del-revisor', true),
  ('CURP', 'Clave Única de Registro de Población', 'uuid-del-revisor', true),
  ('Comprobante Domicilio', 'Recibo de luz, agua o teléfono', 'uuid-del-revisor', true),
  ('Acta Constitutiva', 'Documento de constitución de la empresa', 'uuid-del-revisor', true),
  ('Constancia Situación Fiscal', 'Constancia emitida por el SAT', 'uuid-del-revisor', true);
```

## Mantenimiento

### Actualizar certificados vencidos

Ejecutar periódicamente (puedes configurar un cron job):

```sql
SELECT public.actualizar_certificados_vencidos();
```

### Ver documentos próximos a vencer

```sql
-- Documentos que vencen en los próximos 30 días
SELECT * FROM public.obtener_documentos_proximos_vencer(30);
```

### Ver resumen de cumplimiento

```sql
SELECT * FROM public.vista_cumplimiento_clientes;
```

## Rollback (Deshacer Migración)

⚠️ **ADVERTENCIA:** Esto eliminará TODOS los datos.

Si necesitas empezar de cero:

```sql
-- Ejecutar: rollback.sql
```

Este script:
- Elimina todas las políticas
- Elimina todas las funciones
- Elimina todas las tablas
- Elimina el bucket de storage

Después puedes volver a ejecutar la migración completa.

## Troubleshooting

### Error: "permission denied for schema public"

**Solución:** Asegúrate de estar ejecutando el script en el SQL Editor de Supabase con tu cuenta de administrador del proyecto.

### Error: "relation already exists"

**Solución:** El script usa `IF NOT EXISTS` y `ON CONFLICT DO NOTHING`, por lo que puedes ejecutarlo múltiples veces de forma segura. Este error se puede ignorar.

### Storage policies no funcionan

**Solución:**
1. Verifica que el bucket `documentos` exista: `SELECT * FROM storage.buckets;`
2. Si no existe, ejecútalo manualmente desde Storage UI o con `storage.sql`
3. Vuelve a ejecutar las políticas de storage en `policies.sql`

### Trigger de nuevo usuario no funciona

**Solución:**
Verifica que el trigger esté activo:

```sql
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
```

Si no existe, ejecuta nuevamente la sección de triggers en `functions.sql`.

### No puedo ver datos siendo cliente

**Solución:**
Verifica que:
1. El usuario tenga rol `cliente` en la tabla `usuarios`
2. Exista un registro en `clientes` con `usuario_id` apuntando al usuario
3. Las políticas RLS estén activas

```sql
-- Verificar usuario
SELECT * FROM public.usuarios WHERE id = 'tu-user-id';

-- Verificar cliente
SELECT * FROM public.clientes WHERE usuario_id = 'tu-user-id';

-- Verificar políticas
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';
```

## Estructura de Carpetas en Storage

Los documentos se almacenan con la siguiente estructura:

```
documentos/
├── {cliente_id}/
│   ├── {tipo_documento_id}/
│   │   ├── v1/
│   │   │   └── archivo.pdf
│   │   ├── v2/
│   │   │   └── archivo_nuevo.pdf
│   │   └── ...
```

Esto permite:
- Organización por cliente
- Separación por tipo de documento
- Versionado de archivos

## Siguientes Pasos

Una vez que la base de datos esté configurada:

1. ✅ Ejecuta `npm run dev` en el proyecto
2. ✅ Accede a http://localhost:3000
3. ✅ Inicia sesión con el usuario revisor creado
4. ✅ Comienza a crear clientes y asignar requerimientos

## Soporte

Si encuentras problemas:

1. Revisa los logs en SQL Editor
2. Verifica las políticas RLS
3. Consulta la documentación de Supabase
4. Revisa los archivos individuales en `/supabase`

## Checklist de Verificación

Usa este checklist para asegurarte de que todo está configurado:

- [ ] Extensión uuid-ossp instalada
- [ ] 9 tablas creadas
- [ ] Índices creados
- [ ] 13+ funciones creadas
- [ ] Triggers activos
- [ ] RLS habilitado en todas las tablas
- [ ] Políticas RLS aplicadas
- [ ] Bucket `documentos` creado
- [ ] Políticas de storage aplicadas
- [ ] Vista `vista_cumplimiento_clientes` creada
- [ ] Variables de entorno configuradas
- [ ] Usuario revisor creado
- [ ] Tipos de documento iniciales creados (opcional)

---

¡Felicidades! 🎉 Tu sistema Docuvi está listo para usar.
