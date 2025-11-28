/**
 * Contexto de Autenticación
 */

'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { clearLocalSession } from '@/lib/supabase/session-manager'
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

        // Si el token expiró, limpiar sesión localmente
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

    // Refresh automático de sesión cada 5 minutos para mantenerla activa
    const refreshInterval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          // Intentar refrescar la sesión
          const { error } = await supabase.auth.refreshSession()
          if (error) {
            console.warn('No se pudo refrescar la sesión, puede estar expirada')
          }
        }
      } catch (error) {
        console.error('Error al refrescar sesión automáticamente:', error)
      }
    }, 5 * 60 * 1000) // 5 minutos

    // Detectar cuando el usuario vuelve a la pestaña después de inactividad
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            // Intentar refrescar cuando el usuario regresa
            await supabase.auth.refreshSession()
          }
        } catch (error) {
          console.warn('Error al refrescar sesión al regresar:', error)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      subscription.unsubscribe()
      clearInterval(refreshInterval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [loadUser, supabase])

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

  const signOut = async () => {
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
  }

  const refreshUser = async () => {
    await loadUser()
  }

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
