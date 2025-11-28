/**
 * Contexto de Autenticación
 */

'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { clearLocalSession } from '@/lib/supabase/session-manager'
import { useInactivityDetector } from '@/hooks/useInactivityDetector'
import InactivityWarningModal from '@/components/auth/InactivityWarningModal'
import type { Usuario } from '@/types'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  usuario: Usuario | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showInactivityWarning, setShowInactivityWarning] = useState(false)

  const supabase = useMemo(() => createClient(), [])

  const loadUser = useCallback(async () => {
    try {
      // Timeout para prevenir bloqueos en la carga inicial
      const getUserPromise = supabase.auth.getUser()
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout al cargar usuario')), 5000)
      )

      const result = await Promise.race([getUserPromise, timeoutPromise]) as any
      const user = result?.data?.user

      setUser(user)

      if (user) {
        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', user.id)
          .single()

        setUsuario(usuarioData)
      } else {
        setUsuario(null)
      }
    } catch (error) {
      console.error('Error al cargar usuario:', error)
      setUser(null)
      setUsuario(null)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  const signOut = useCallback(async () => {
    try {
      setIsLoading(true)

      // Limpiar estado inmediatamente para una UX más rápida
      setUser(null)
      setUsuario(null)

      // Cerrar sesión en Supabase con timeout para evitar bloqueos
      const signOutPromise = supabase.auth.signOut()
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout al cerrar sesión')), 5000)
      )

      try {
        await Promise.race([signOutPromise, timeoutPromise])
      } catch (supabaseError) {
        console.warn('Supabase signOut falló (token expirado o timeout), limpiando localmente:', supabaseError)
      }

      // Limpieza forzada de toda la sesión local (localStorage, sessionStorage, cookies)
      // Esto es crítico cuando el token está expirado y Supabase no puede cerrar sesión
      clearLocalSession()

    } catch (error) {
      console.error('Error crítico al cerrar sesión:', error)
      // En caso de error, aún así limpiar el estado y la sesión local
      setUser(null)
      setUsuario(null)
      clearLocalSession()
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Si es un evento de cierre de sesión, limpiar inmediatamente
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setUsuario(null)
          setIsLoading(false)
          return
        }

        // Si el token se refrescó correctamente
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refrescado automáticamente')
        }

        // Actualizar el usuario
        setUser(session?.user ?? null)

        if (session?.user) {
          // Cargar datos del usuario desde la base de datos
          const { data: usuarioData } = await supabase
            .from('usuarios')
            .select('*')
            .eq('id', session.user.id)
            .single()

          setUsuario(usuarioData)
        } else {
          setUsuario(null)
        }
        setIsLoading(false)
      }
    )

    // Refresh automático de sesión cada 3 minutos para mantenerla activa
    // Esto previene que la sesión expire por inactividad
    const refreshInterval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          // Verificar si el token está próximo a expirar (dentro de los próximos 5 minutos)
          const expiresAt = session.expires_at
          const now = Math.floor(Date.now() / 1000)
          const timeUntilExpiry = expiresAt ? expiresAt - now : 0

          // Si el token expira en menos de 5 minutos, refrescarlo
          if (timeUntilExpiry < 5 * 60) {
            console.log('Token próximo a expirar, refrescando...')
            const { error } = await supabase.auth.refreshSession()
            if (error) {
              console.warn('No se pudo refrescar la sesión:', error.message)
            } else {
              console.log('Sesión refrescada automáticamente')
            }
          }
        }
      } catch (error) {
        console.error('Error al refrescar sesión automáticamente:', error)
      }
    }, 3 * 60 * 1000) // 3 minutos

    // Detectar cuando el usuario vuelve a la pestaña después de inactividad
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('Usuario regresó a la pestaña, verificando sesión...')
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            // Verificar si la sesión sigue siendo válida
            const expiresAt = session.expires_at
            const now = Math.floor(Date.now() / 1000)
            const isExpired = expiresAt ? expiresAt < now : true

            if (isExpired) {
              console.warn('Sesión expirada, cerrando sesión...')
              await signOut()
            } else {
              // Refrescar la sesión para extender su validez
              const { error } = await supabase.auth.refreshSession()
              if (error) {
                console.warn('Error al refrescar sesión:', error.message)
                // Si no se puede refrescar, la sesión probablemente expiró
                await signOut()
              } else {
                console.log('Sesión refrescada al regresar a la pestaña')
              }
            }
          } else {
            // No hay sesión, redirigir a login
            console.log('No hay sesión activa')
            setUser(null)
            setUsuario(null)
          }
        } catch (error) {
          console.error('Error al verificar sesión al regresar:', error)
          // En caso de error, intentar cargar el usuario de nuevo
          await loadUser()
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      subscription.unsubscribe()
      clearInterval(refreshInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [loadUser, supabase, signOut])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error

    // Actualizar inmediatamente el estado del usuario y su información
    if (data.user) {
      setUser(data.user)

      const { data: usuarioData } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', data.user.id)
        .single()

      setUsuario(usuarioData)
    }
  }

  const refreshUser = async () => {
    await loadUser()
  }

  // Detector de inactividad - solo activo cuando hay un usuario autenticado
  const { showWarning, cancelWarning } = useInactivityDetector({
    warningTimeout: 25 * 60 * 1000,  // 25 minutos de inactividad
    logoutTimeout: 5 * 60 * 1000,     // 5 minutos adicionales después de la advertencia
    onWarning: () => {
      setShowInactivityWarning(true)
    },
    onLogout: async () => {
      console.log('Cerrando sesión por inactividad')
      setShowInactivityWarning(false)
      await signOut()
    },
    enabled: !!user && !isLoading, // Solo habilitar cuando hay usuario autenticado
  })

  // Handler para cuando el usuario decide continuar la sesión
  const handleStayLoggedIn = useCallback(async () => {
    setShowInactivityWarning(false)
    cancelWarning()

    // Refrescar la sesión para asegurar que sigue activa
    try {
      await supabase.auth.refreshSession()
      console.log('Sesión refrescada después de advertencia de inactividad')
    } catch (error) {
      console.error('Error al refrescar sesión:', error)
    }
  }, [cancelWarning, supabase])

  // Handler para cerrar sesión desde el modal
  const handleLogoutFromModal = useCallback(async () => {
    setShowInactivityWarning(false)
    await signOut()
  }, [signOut])

  return (
    <AuthContext.Provider
      value={{
        user,
        usuario,
        isLoading,
        signIn,
        signOut,
        refreshUser,
      }}
    >
      {children}

      {/* Modal de advertencia de inactividad */}
      <InactivityWarningModal
        isOpen={showInactivityWarning}
        onStayLoggedIn={handleStayLoggedIn}
        onLogout={handleLogoutFromModal}
        countdown={5 * 60} // 5 minutos en segundos
      />
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}
