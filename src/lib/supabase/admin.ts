/**
 * Supabase Admin Client - Solo para uso en API Routes del servidor
 * Usa la Service Role Key y tiene acceso completo a la base de datos
 * NUNCA usar en el cliente
 */

import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY no está definida')
}

export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

/**
 * Crear usuario con rol específico
 */
export async function crearUsuarioConRol(
  correo: string,
  password: string,
  nombre: string,
  rol: 'revisor' | 'cliente'
) {
  try {
    // Crear usuario en auth.users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: correo,
      password,
      email_confirm: true,
      user_metadata: {
        nombre,
        rol,
      },
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('No se pudo crear el usuario')

    return { data: authData.user, error: null }
  } catch (error) {
    console.error('Error al crear usuario:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Eliminar usuario
 */
export async function eliminarUsuario(userId: string) {
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Error al eliminar usuario:', error)
    return { error: error as Error }
  }
}

/**
 * Actualizar contraseña de usuario
 */
export async function actualizarPasswordUsuario(userId: string, nuevaPassword: string) {
  try {
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: nuevaPassword,
    })
    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Error al actualizar contraseña:', error)
    return { error: error as Error }
  }
}
