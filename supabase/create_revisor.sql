-- =====================================================
-- DOCUVI - CREAR USUARIO REVISOR
-- Script para crear usuarios administradores/revisores
-- =====================================================

-- ⚠️ IMPORTANTE: Este script debe ejecutarse con el Service Role Key
-- No funcionará con el anon key debido a las restricciones de auth.users

-- =====================================================
-- OPCIÓN 1: Crear revisor desde Supabase UI (RECOMENDADO)
-- =====================================================
-- 1. Ve a Authentication → Users en Supabase Dashboard
-- 2. Click en "Add user" → "Create new user"
-- 3. Completa los campos:
--    - Email: admin@docuvi.com
--    - Password: (tu contraseña segura)
--    - User Metadata (JSON):
--      {
--        "nombre": "Administrador",
--        "rol": "revisor"
--      }
-- 4. El trigger automático creará el registro en public.usuarios

-- =====================================================
-- OPCIÓN 2: Actualizar usuario existente a revisor
-- =====================================================
-- Si ya creaste un usuario y quieres hacerlo revisor:

-- Reemplaza el email y nombre con tus datos
DO $$
DECLARE
  usuario_email TEXT := 'admin@docuvi.com'; -- ⚠️ CAMBIAR AQUÍ
  usuario_nombre TEXT := 'Administrador';   -- ⚠️ CAMBIAR AQUÍ
  user_id UUID;
  usuarios_encontrados INTEGER;
BEGIN
  -- Contar cuántos usuarios existen con ese email
  SELECT COUNT(*) INTO usuarios_encontrados
  FROM auth.users
  WHERE email = usuario_email;

  IF usuarios_encontrados = 0 THEN
    RAISE EXCEPTION 'Usuario con email % no encontrado. Créalo primero desde Authentication > Users', usuario_email;
  END IF;

  IF usuarios_encontrados > 1 THEN
    RAISE WARNING 'Se encontraron % usuarios con email %. Usando el más reciente.', usuarios_encontrados, usuario_email;
  END IF;

  -- Buscar el usuario en auth.users por email (tomar el más reciente si hay duplicados)
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = usuario_email
  ORDER BY created_at DESC
  LIMIT 1;

  -- Actualizar o crear registro en public.usuarios
  INSERT INTO public.usuarios (id, correo, nombre, rol)
  VALUES (user_id, usuario_email, usuario_nombre, 'revisor')
  ON CONFLICT (id) DO UPDATE
  SET rol = 'revisor',
      nombre = EXCLUDED.nombre;

  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ Usuario actualizado a rol REVISOR';
  RAISE NOTICE 'Email: %', usuario_email;
  RAISE NOTICE 'Nombre: %', usuario_nombre;
  RAISE NOTICE 'ID: %', user_id;
  RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- OPCIÓN 3: Crear múltiples revisores
-- =====================================================
-- Descomenta y modifica según necesites:

/*
DO $$
DECLARE
  revisores JSONB := '[
    {"email": "admin1@docuvi.com", "nombre": "Juan Pérez"},
    {"email": "admin2@docuvi.com", "nombre": "María García"},
    {"email": "admin3@docuvi.com", "nombre": "Carlos López"}
  ]'::jsonb;
  revisor JSONB;
  user_id UUID;
BEGIN
  FOR revisor IN SELECT * FROM jsonb_array_elements(revisores)
  LOOP
    -- Buscar usuario (tomar el más reciente si hay duplicados)
    SELECT id INTO user_id
    FROM auth.users
    WHERE email = revisor->>'email'
    ORDER BY created_at DESC
    LIMIT 1;

    IF user_id IS NOT NULL THEN
      -- Actualizar rol
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
      RAISE WARNING '⚠️ Usuario no encontrado: %. Créalo desde Authentication > Users', revisor->>'email';
    END IF;
  END LOOP;
END $$;
*/

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Ver todos los usuarios revisores creados:
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

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================

-- Ver todos los usuarios en auth.users
-- SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-- Ver todos los usuarios en public.usuarios
-- SELECT * FROM public.usuarios ORDER BY creado_en DESC;

-- Ver usuarios sin rol asignado
-- SELECT au.id, au.email
-- FROM auth.users au
-- LEFT JOIN public.usuarios pu ON pu.id = au.id
-- WHERE pu.id IS NULL;
