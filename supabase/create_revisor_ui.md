# Guía: Crear Usuario Revisor en Supabase

## Método 1: Desde Supabase Dashboard (Más Fácil) ⭐

### Paso 1: Ir a Authentication

1. Abre tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. En el menú lateral, ve a **Authentication** → **Users**

### Paso 2: Crear Nuevo Usuario

1. Haz clic en el botón **"Add user"** (esquina superior derecha)
2. Selecciona **"Create new user"**

### Paso 3: Completar el Formulario

Llena los siguientes campos:

**Email:**
```
admin@docuvi.com
```
(o el email que prefieras)

**Password:**
```
TuContraseñaSegura123!
```
(elige una contraseña fuerte)

**Auto Confirm User:**
- ✅ Marca esta casilla (para que no necesite verificar email)

**User Metadata (JSON):**

Copia y pega exactamente esto en el campo de metadata:

```json
{
  "nombre": "Administrador",
  "rol": "revisor"
}
```

**Explicación:**
- `nombre`: El nombre completo del usuario
- `rol`: Debe ser `"revisor"` para tener acceso de administrador

### Paso 4: Crear Usuario

1. Haz clic en **"Create user"**
2. Espera a que aparezca el mensaje de confirmación

### Paso 5: Verificar

El trigger automático `on_auth_user_created` creará el registro en la tabla `public.usuarios` con:
- El rol `revisor`
- El nombre que especificaste
- El correo del usuario

**Para verificar que se creó correctamente:**

1. Ve a **SQL Editor**
2. Ejecuta esta consulta:

```sql
SELECT
  u.id,
  u.correo,
  u.nombre,
  u.rol,
  u.creado_en
FROM public.usuarios u
WHERE u.rol = 'revisor'
ORDER BY u.creado_en DESC;
```

Deberías ver tu usuario revisor en los resultados.

---

## Método 2: Desde SQL Editor (Avanzado)

Si ya tienes un usuario creado y solo quieres cambiarle el rol a revisor:

### Paso 1: Ir al SQL Editor

Ve a **SQL Editor** → **New query**

### Paso 2: Ejecutar el Script

Copia y pega este código, **modificando el email**:

```sql
DO $$
DECLARE
  usuario_email TEXT := 'tu-email@example.com'; -- ⚠️ CAMBIAR ESTE EMAIL
  usuario_nombre TEXT := 'Tu Nombre';           -- ⚠️ CAMBIAR ESTE NOMBRE
  user_id UUID;
BEGIN
  -- Buscar el usuario en auth.users por email
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = usuario_email;

  IF user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario con email % no encontrado', usuario_email;
  END IF;

  -- Actualizar o crear registro en public.usuarios
  INSERT INTO public.usuarios (id, correo, nombre, rol)
  VALUES (user_id, usuario_email, usuario_nombre, 'revisor')
  ON CONFLICT (id) DO UPDATE
  SET rol = 'revisor',
      nombre = EXCLUDED.nombre;

  RAISE NOTICE '✅ Usuario % actualizado a rol REVISOR', usuario_email;
END $$;
```

### Paso 3: Ejecutar

Haz clic en **Run** o presiona `Ctrl + Enter`

---

## Método 3: Crear Múltiples Revisores

Si necesitas crear varios administradores:

### Paso 1: Crear los Usuarios en Supabase UI

Para cada usuario:
1. Ve a **Authentication** → **Users** → **Add user**
2. Completa email y password (sin metadata por ahora)
3. Marca "Auto Confirm User"

### Paso 2: Asignar Rol con SQL

Ejecuta este script en el **SQL Editor**, modificando los emails y nombres:

```sql
DO $$
DECLARE
  revisores JSONB := '[
    {"email": "admin1@docuvi.com", "nombre": "Juan Pérez"},
    {"email": "admin2@docuvi.com", "nombre": "María García"},
    {"email": "revisor@docuvi.com", "nombre": "Carlos López"}
  ]'::jsonb;
  revisor JSONB;
  user_id UUID;
BEGIN
  FOR revisor IN SELECT * FROM jsonb_array_elements(revisores)
  LOOP
    SELECT id INTO user_id
    FROM auth.users
    WHERE email = revisor->>'email';

    IF user_id IS NOT NULL THEN
      INSERT INTO public.usuarios (id, correo, nombre, rol)
      VALUES (
        user_id,
        revisor->>'email',
        revisor->>'nombre',
        'revisor'
      )
      ON CONFLICT (id) DO UPDATE
      SET rol = 'revisor',
          nombre = EXCLUDED.nombre;

      RAISE NOTICE '✅ Revisor creado: % (%)', revisor->>'nombre', revisor->>'email';
    ELSE
      RAISE WARNING '⚠️ Usuario no encontrado: %', revisor->>'email';
    END IF;
  END LOOP;
END $$;
```

---

## Verificación Final

### Comprobar que el usuario existe y tiene el rol correcto:

```sql
SELECT
  u.id,
  u.correo,
  u.nombre,
  u.rol,
  u.creado_en,
  au.email_confirmed_at,
  au.last_sign_in_at
FROM public.usuarios u
INNER JOIN auth.users au ON au.id = u.id
WHERE u.rol = 'revisor'
ORDER BY u.creado_en DESC;
```

### Resultado esperado:

| correo | nombre | rol | creado_en |
|--------|--------|-----|-----------|
| admin@docuvi.com | Administrador | revisor | 2025-01-01 ... |

---

## Iniciar Sesión

Una vez creado el usuario revisor:

1. Inicia tu aplicación: `npm run dev`
2. Ve a http://localhost:3000
3. Haz clic en **Iniciar Sesión**
4. Ingresa:
   - **Email:** El email que configuraste
   - **Password:** La contraseña que elegiste
5. Deberías ser redirigido a `/revisor` (el dashboard de administrador)

---

## Troubleshooting

### ❌ Error: "Usuario no encontrado"

**Causa:** El usuario no existe en `auth.users`

**Solución:** Primero crea el usuario desde Authentication → Users, luego ejecuta el script SQL.

---

### ❌ No puedo iniciar sesión

**Verifica:**

1. **Email confirmado:**
```sql
SELECT email, email_confirmed_at
FROM auth.users
WHERE email = 'tu-email@example.com';
```

Si `email_confirmed_at` es NULL:
- Confirma el email manualmente desde Supabase UI
- O marca "Auto Confirm User" al crear el usuario

2. **Usuario existe en public.usuarios:**
```sql
SELECT * FROM public.usuarios WHERE correo = 'tu-email@example.com';
```

Si no existe, ejecuta el script de la Opción 2.

---

### ❌ Inicio sesión pero voy a `/cliente` en vez de `/revisor`

**Causa:** El rol no es `revisor`

**Verificar rol:**
```sql
SELECT correo, rol FROM public.usuarios WHERE correo = 'tu-email@example.com';
```

**Corregir rol:**
```sql
UPDATE public.usuarios
SET rol = 'revisor'
WHERE correo = 'tu-email@example.com';
```

---

### ❌ Trigger no creó el usuario en public.usuarios

**Verificar que el trigger existe:**
```sql
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created';
```

Si no existe, ejecuta nuevamente el archivo `functions.sql` o `migration_complete.sql`.

**Crear usuario manualmente:**
```sql
INSERT INTO public.usuarios (id, correo, nombre, rol)
SELECT
  id,
  email,
  'Administrador',
  'revisor'
FROM auth.users
WHERE email = 'tu-email@example.com'
ON CONFLICT (id) DO UPDATE SET rol = 'revisor';
```

---

## Resumen Rápido

### Para crear tu primer revisor:

1. ✅ Ve a **Authentication** → **Users** → **Add user**
2. ✅ Email: `admin@docuvi.com`
3. ✅ Password: (tu elección)
4. ✅ Auto Confirm: ☑️
5. ✅ User Metadata:
   ```json
   {"nombre": "Administrador", "rol": "revisor"}
   ```
6. ✅ Click **Create user**
7. ✅ Inicia sesión en tu app

**¡Listo! Ya tienes acceso de administrador.** 🎉

---

## Cambiar Usuario Cliente a Revisor

Si un usuario ya existe con rol `cliente` y quieres promoverlo:

```sql
UPDATE public.usuarios
SET rol = 'revisor'
WHERE correo = 'usuario@example.com';
```

Cierra sesión y vuelve a iniciar para que los cambios surtan efecto.

---

## Seguridad

⚠️ **Importante:**

- No compartas las credenciales del revisor
- Usa contraseñas fuertes (mínimo 8 caracteres, mayúsculas, números, símbolos)
- Considera habilitar autenticación de dos factores (2FA) en Supabase
- No uses el mismo password en múltiples servicios
- Cambia las contraseñas periódicamente

---

## Siguientes Pasos

Una vez que tengas tu usuario revisor:

1. Inicia sesión en la aplicación
2. Ve a **Tipos de Documento** y crea los tipos que necesites
3. Ve a **Clientes** y crea tu primer cliente
4. Asigna requerimientos al cliente
5. El cliente puede iniciar sesión y subir documentos
6. Tú puedes aprobarlos o rechazarlos

¡Tu sistema Docuvi está listo para usar! 🚀
