/**
 * Providers - Envuelve la aplicación con todos los contextos necesarios
 */

'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './AuthContext'
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
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  const toasts = useToastStore((state) => state.toasts)
  const removeToast = useToastStore((state) => state.removeToast)

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </AuthProvider>
    </QueryClientProvider>
  )
}
