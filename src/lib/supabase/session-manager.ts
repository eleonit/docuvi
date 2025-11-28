/**
 * Session Manager - Utilidades para manejar sesiones expiradas
 */

import { createClient } from './client'

/**
 * Verifica si la sesión actual es válida
 * Retorna false si está expirada o no existe
 */
export async function isSessionValid(): Promise<boolean> {
  try {
    const supabase = createClient()
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error || !session) {
      return false
    }

    // Verificar si el token está expirado
    const expiresAt = session.expires_at
    if (expiresAt) {
      const now = Math.floor(Date.now() / 1000)
      return expiresAt > now
    }

    return true
  } catch {
    return false
  }
}

/**
 * Intenta refrescar la sesión
 * Retorna true si tuvo éxito, false si falló
 */
export async function tryRefreshSession(): Promise<boolean> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.auth.refreshSession()

    if (error || !data.session) {
      return false
    }

    return true
  } catch {
    return false
  }
}

/**
 * Limpia toda la información de sesión local
 * Usado cuando Supabase signOut falla
 */
export function clearLocalSession(): void {
  try {
    // Limpiar localStorage
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key)
      } catch (e) {
        console.warn(`No se pudo eliminar ${key}:`, e)
      }
    })

    // Limpiar sessionStorage
    keysToRemove.forEach(key => {
      try {
        sessionStorage.removeItem(key)
      } catch (e) {
        console.warn(`No se pudo eliminar ${key} de sessionStorage:`, e)
      }
    })

    // Limpiar cookies
    document.cookie.split(';').forEach(cookie => {
      const [name] = cookie.split('=')
      const trimmedName = name.trim()
      if (trimmedName.startsWith('sb-') || trimmedName.includes('supabase')) {
        document.cookie = `${trimmedName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
        // También intentar limpiar con dominio
        document.cookie = `${trimmedName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname}`
      }
    })

    console.log('Sesión local limpiada completamente')
  } catch (error) {
    console.error('Error al limpiar sesión local:', error)
  }
}

/**
 * Verifica y refresca la sesión si es necesario
 * Retorna true si la sesión es válida o fue refrescada exitosamente
 */
export async function ensureValidSession(): Promise<boolean> {
  const isValid = await isSessionValid()

  if (!isValid) {
    return await tryRefreshSession()
  }

  return true
}
