/**
 * Servicio de Autenticación
 */

import { createClient } from '@/lib/supabase/client'
import type { Usuario } from '@/types'

export interface CredencialesLogin {
  correo: string
  password: string
}

export interface DatosRegistro {
  correo: string
  password: string
  nombre: string
}

/**
 * Iniciar sesión
 */
export async function iniciarSesion({ correo, password }: CredencialesLogin) {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: correo,
    password,
  })

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Cerrar sesión
 */
export async function cerrarSesion() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new Error(error.message)
  }
}

/**
 * Obtener usuario actual
 */
export async function obtenerUsuarioActual(): Promise<Usuario | null> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return usuario
}

/**
 * Solicitar restablecimiento de contraseña
 */
export async function solicitarRestablecerPassword(correo: string) {
  const supabase = createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(correo, {
    redirectTo: `${window.location.origin}/restablecer-contrasena`,
  })

  if (error) {
    throw new Error(error.message)
  }
}

/**
 * Actualizar contraseña
 */
export async function actualizarPassword(nuevaPassword: string) {
  const supabase = createClient()

  const { error } = await supabase.auth.updateUser({
    password: nuevaPassword,
  })

  if (error) {
    throw new Error(error.message)
  }
}

/**
 * Actualizar perfil de usuario
 */
export async function actualizarPerfil(userId: string, datos: Partial<Usuario>) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('usuarios')
    .update(datos)
    .eq('id', userId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

/**
 * Verificar si hay una sesión activa
 */
export async function verificarSesion() {
  const supabase = createClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return session
}
