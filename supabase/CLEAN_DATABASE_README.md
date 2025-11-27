# Scripts de Limpieza de Base de Datos - Docuvi

Este directorio contiene scripts para limpiar registros de la base de datos de Docuvi.

## ⚠️ ADVERTENCIAS IMPORTANTES

1. **Estos scripts son DESTRUCTIVOS** - Eliminarán datos permanentemente
2. **Haz respaldo antes** - Siempre realiza un backup antes de ejecutar
3. **No elimina archivos** - Los archivos en Supabase Storage deben limpiarse manualmente
4. **Requiere permisos** - Necesitas acceso de administrador a la base de datos

## 📋 Scripts Disponibles

### 1. `clean_database.sql` - Limpieza Total (Preserva Admin)

Elimina **TODOS** los registros de todas las tablas **EXCEPTO el usuario administrador**.

**Cuándo usar:**
- Reset completo del sistema manteniendo acceso
- Entorno de desarrollo/pruebas
- Limpiar datos pero mantener usuario principal

**Qué PRESERVA:**
- ✓ Usuario administrador (primer revisor creado)
- ✓ Notificaciones del administrador
- ✓ Auditoría de acciones del administrador

**Qué elimina:**
- ✓ Todos los demás usuarios (auth.users y public.usuarios)
- ✓ Todos los clientes
- ✓ Todos los tipos de documento
- ✓ Todos los requerimientos
- ✓ Todos los documentos
- ✓ Todos los certificados
- ✓ Notificaciones de otros usuarios
- ✓ Auditoría de otros usuarios

**Opciones de configuración:**
- Por defecto: preserva el primer revisor creado
- Opcional: especifica un correo para preservar un admin específico (editar línea 40 del script)

### 2. `clean_database_selective.sql` - Limpieza Selectiva

Permite elegir qué limpiar manteniendo la configuración base.

**Cuándo usar:**
- Limpiar datos de prueba pero mantener usuarios
- Eliminar documentos viejos pero mantener clientes
- Reset parcial del sistema

## 🚀 Cómo Ejecutar los Scripts

### Preparación: Verificar Usuarios Existentes

Antes de ejecutar el script de limpieza, verifica qué usuarios tienes:

```sql
-- Ver todos los usuarios revisores
SELECT id, correo, nombre, rol, creado_en
FROM public.usuarios
WHERE rol = 'revisor'
ORDER BY creado_en ASC;

-- Ver el usuario que se preservará (el primero)
SELECT id, correo, nombre, rol, creado_en
FROM public.usuarios
WHERE rol = 'revisor'
ORDER BY creado_en ASC
LIMIT 1;
```

### Especificar Admin Específico (Opcional)

Si quieres preservar un administrador específico en lugar del primero creado:

1. Abre `clean_database.sql`
2. Busca la línea 40: `admin_email := NULL;`
3. Cámbiala por: `admin_email := 'tu-admin@correo.com';`
4. Guarda el archivo

### Opción A: Desde Supabase Dashboard

1. Ve a tu proyecto en [Supabase](https://supabase.com)
2. Abre el **SQL Editor**
3. Crea una nueva query
4. Copia y pega el contenido del script
5. **IMPORTANTE:** Si especificaste un admin, verifica que el correo sea correcto
6. Revisa el código para asegurarte
7. Haz clic en **Run**

### Opción B: Desde psql (Terminal)

```bash
# Conectar a tu base de datos
psql -h <tu-host>.supabase.co -p 5432 -d postgres -U postgres

# Ejecutar el script
\i supabase/clean_database.sql
```

### Opción C: Usando Supabase CLI

```bash
# Desde el directorio del proyecto
supabase db reset

# O ejecutar script específico
supabase db execute --file supabase/clean_database.sql
```

## 🗑️ Limpieza de Supabase Storage

Los scripts SQL **NO eliminan archivos** del storage. Debes limpiarlos manualmente:

### Desde Dashboard:

1. Ve a **Storage** en tu proyecto Supabase
2. Abre el bucket `documentos`
3. Selecciona archivos/carpetas
4. Haz clic en **Delete**

### Desde código (Node.js/TypeScript):

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, key)

// Listar archivos
const { data: files } = await supabase
  .storage
  .from('documentos')
  .list()

// Eliminar todos
for (const file of files) {
  await supabase
    .storage
    .from('documentos')
    .remove([file.name])
}
```

## 💾 Cómo Hacer Backup

### Opción A: Desde Supabase Dashboard

1. Ve a **Database** → **Backups**
2. Haz clic en **Create backup**
3. Espera a que complete
4. Descarga el backup si es necesario

### Opción B: Con pg_dump

```bash
pg_dump -h <tu-host>.supabase.co -p 5432 -U postgres -d postgres \
  --schema=public \
  --format=custom \
  --file=backup_$(date +%Y%m%d_%H%M%S).dump
```

## 🔄 Restaurar desde Backup

### Con pg_restore:

```bash
pg_restore -h <tu-host>.supabase.co -p 5432 -U postgres -d postgres \
  --clean \
  --if-exists \
  backup_YYYYMMDD_HHMMSS.dump
```

## 📊 Qué Esperar al Ejecutar

### Salida Exitosa de `clean_database.sql`

Cuando el script se ejecute correctamente, verás:

```
NOTICE: Usuario administrador preservado: <uuid-del-admin>

paso: Registros eliminados de certificados_detalle
paso: Registros eliminados de certificados
paso: Registros eliminados de notificaciones
paso: Registros eliminados de documentos
paso: Registros eliminados de auditoria
paso: Registros eliminados de requerimientos_cliente
paso: Registros eliminados de tipos_documento
paso: Registros eliminados de clientes
paso: Registros eliminados de usuarios (excepto admin)

USUARIO ADMINISTRADOR PRESERVADO
correo_admin: admin@docuvi.com
nombre_admin: Administrador
rol: revisor
fecha_creacion: 2025-01-15 10:30:00

tabla           | registros_restantes
----------------+--------------------
usuarios        | 1
clientes        | 0
tipos_documento | 0
requerimientos  | 0
documentos      | 0
certificados    | 0
notificaciones  | X (solo del admin)
auditoria       | X (solo del admin)

✓ Base de datos limpiada exitosamente
✓ Usuario administrador preservado
⚠ RECORDATORIO: Limpia manualmente los archivos en Supabase Storage
```

## ✅ Checklist Pre-Limpieza

Antes de ejecutar cualquier script, verifica:

- [ ] Tienes un backup reciente
- [ ] Has verificado qué usuario se preservará (ver queries de preparación)
- [ ] Estás en el entorno correcto (dev/staging/production)
- [ ] Has notificado al equipo si es ambiente compartido
- [ ] Has revisado el script que vas a ejecutar
- [ ] Tienes las credenciales correctas
- [ ] Sabes cómo restaurar si algo sale mal
- [ ] Si especificaste un admin por correo, verificaste que existe

## 🆘 Problemas Comunes

### Error: "permission denied"
**Causa:** No tienes permisos suficientes
**Solución:**
- Verifica que tienes permisos de administrador
- Usa el usuario `postgres` de Supabase
- Verifica que RLS no esté bloqueando las operaciones

### Error: "No se encontró ningún usuario administrador (revisor)"
**Causa:** No hay ningún usuario con rol 'revisor' en la base de datos
**Solución:**
1. Verifica que existe al menos un usuario revisor:
   ```sql
   SELECT * FROM public.usuarios WHERE rol = 'revisor';
   ```
2. Si no hay revisores, crea uno primero o usa `clean_database_selective.sql`
3. O modifica el script para no preservar ningún usuario

### Error: "No se encontró usuario revisor con correo: X"
**Causa:** El correo especificado no existe o no es de un revisor
**Solución:**
1. Verifica el correo con:
   ```sql
   SELECT correo, rol FROM public.usuarios WHERE correo = 'tu-correo@example.com';
   ```
2. Asegúrate que el usuario tiene rol 'revisor', no 'cliente'
3. Corrige el correo en la línea 40 del script

### Error: "violates foreign key constraint"
**Causa:** Orden incorrecto de eliminación (solo si editaste el script)
**Solución:**
- El script ya maneja las dependencias correctamente
- Si editaste el script, verifica el orden de DELETE
- Restaura el script original

### Los archivos siguen en Storage
**Causa:** Normal, el script SQL no afecta Storage
**Solución:**
- Los archivos deben eliminarse manualmente
- Ver sección "Limpieza de Supabase Storage"

### Se eliminó el administrador equivocado
**Causa:** No verificaste qué usuario se preservaría
**Solución:**
1. Restaura el backup inmediatamente
2. Ejecuta las queries de verificación antes de limpiar
3. Especifica el admin correcto por correo si es necesario

### No se eliminaron los usuarios de auth.users
**Causa:** Problema con CASCADE o permisos
**Solución:**
- Verifica que tienes permisos sobre auth.users
- Los usuarios deben eliminarse en cascade desde public.usuarios
- Verifica que la relación ON DELETE CASCADE existe en la tabla usuarios

## 📞 Soporte

Si tienes problemas:
1. Revisa los mensajes de error
2. Verifica los logs de Supabase
3. Consulta la documentación de Supabase
4. Contacta al equipo de desarrollo
