/**
 * Página de Inicio de Sesión
 */

'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { Boton, Input } from '@/components/base'
import { toast } from '@/store/toastStore'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/revisor'

  const { signIn } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await signIn(formData.email, formData.password)
      toast.success('Sesión iniciada correctamente')
      router.push(redirect)
    } catch (error: any) {
      console.error('Error al iniciar sesión:', error)
      toast.error(error.message || 'Error al iniciar sesión')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      <div className="rounded-md shadow-sm space-y-4">
        <Input
          label="Correo electrónico"
          type="email"
          required
          autoComplete="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="tu@correo.com"
        />
        <Input
          label="Contraseña"
          type="password"
          required
          autoComplete="current-password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="••••••••"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-sm">
          <Link
            href="/recuperar-clave"
            className="font-medium text-primary-600 hover:text-primary-500"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
      </div>

      <div>
        <Boton
          type="submit"
          fullWidth
          isLoading={isLoading}
          disabled={isLoading}
        >
          Iniciar Sesión
        </Boton>
      </div>
    </form>
  )
}

export default function IniciarSesionPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Docuvi
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sistema de Gestión Documental
          </p>
        </div>
        <Suspense fallback={<div>Cargando...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
