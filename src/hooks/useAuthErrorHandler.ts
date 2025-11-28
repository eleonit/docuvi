/**
 * Hook para manejar errores de autenticación en queries
 */

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/store/toastStore'

export function useAuthErrorHandler() {
  const router = useRouter()
  const { signOut } = useAuth()

  const handleAuthError = async (error: any) => {
    // Detectar errores de autenticación
    const isAuthError =
      error?.message?.includes('JWT') ||
      error?.message?.includes('token') ||
      error?.message?.includes('expired') ||
      error?.message?.includes('invalid') ||
      error?.message?.includes('auth') ||
      error?.code === 'PGRST301' || // PostgreSQL error for expired JWT
      error?.status === 401

    if (isAuthError) {
      console.warn('Error de autenticación detectado:', error)

      toast.error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.')

      // Esperar un momento antes de cerrar sesión para que el usuario vea el mensaje
      await new Promise(resolve => setTimeout(resolve, 1500))

      // Cerrar sesión y redirigir
      await signOut()
      router.push('/iniciar-sesion')

      return true
    }

    return false
  }

  return { handleAuthError }
}

/**
 * Verifica si un error es un error de autenticación
 */
export function isAuthenticationError(error: any): boolean {
  if (!error) return false

  const errorMessage = error?.message?.toLowerCase() || ''
  const errorCode = error?.code?.toLowerCase() || ''

  return (
    errorMessage.includes('jwt') ||
    errorMessage.includes('token') ||
    errorMessage.includes('expired') ||
    errorMessage.includes('invalid') ||
    errorMessage.includes('auth') ||
    errorMessage.includes('session') ||
    errorCode === 'pgrst301' ||
    error?.status === 401
  )
}
