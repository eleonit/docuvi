/**
 * Contexto de Autenticación
 */

'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
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
      const { data: { user } } = await supabase.auth.getUser()
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
        console.log('Auth state change:', event, session?.user?.id)

        // Si es un evento de cierre de sesión, limpiar inmediatamente
        if (event === 'SIGNED_OUT') {
          setUser(null)
          setUsuario(null)
          setIsLoading(false)
          return
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

    return () => {
      subscription.unsubscribe()
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
    // Limpiar estado inmediatamente antes de cerrar sesión
    setUser(null)
    setUsuario(null)

    const { error } = await supabase.auth.signOut()
    if (error) throw error
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
