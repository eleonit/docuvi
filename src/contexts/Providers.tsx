/**
 * Providers - Envuelve la aplicación con todos los contextos necesarios
 */

'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './AuthContext'
import { ThemeProvider } from './ThemeContext'
import { ToastContainer } from '@/components/base/Toast'
import { useToastStore } from '@/store/toastStore'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minuto
            refetchOnWindowFocus: true, // Refrescar al volver a la pestaña
            refetchOnReconnect: true,   // Refrescar al reconectar
            retry: (failureCount, error: any) => {
              // No reintentar en errores de autenticación
              const isAuthError =
                error?.message?.includes('JWT') ||
                error?.message?.includes('expired') ||
                error?.message?.includes('invalid') ||
                error?.status === 401

              if (isAuthError) {
                return false
              }

              // Reintentar hasta 2 veces para otros errores
              return failureCount < 2
            },
            retryDelay: (attemptIndex) => {
              // Incrementar el delay exponencialmente: 1s, 2s, 4s
              return Math.min(1000 * 2 ** attemptIndex, 4000)
            },
            // Agregar un timeout para prevenir queries bloqueadas
            networkMode: 'online',
          },
          mutations: {
            retry: false, // No reintentar mutaciones por defecto
            networkMode: 'online',
          },
        },
      })
  )

  const toasts = useToastStore((state) => state.toasts)
  const removeToast = useToastStore((state) => state.removeToast)

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          {children}
          <ToastContainer toasts={toasts} onClose={removeToast} />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
