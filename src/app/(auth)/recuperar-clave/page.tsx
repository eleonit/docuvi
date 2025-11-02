/**
 * Página de Recuperar Contraseña
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Boton, Input, Alert } from '@/components/base'
import { toast } from '@/store/toastStore'
import { solicitarRestablecerPassword } from '@/services'

export default function RecuperarClavePage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await solicitarRestablecerPassword(email)
      setEmailSent(true)
      toast.success('Se ha enviado un correo de recuperación')
    } catch (error: any) {
      console.error('Error al recuperar contraseña:', error)
      toast.error(error.message || 'Error al enviar correo de recuperación')
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Revisa tu correo
            </h2>
          </div>
          <Alert variant="success">
            <p className="mb-2">
              Se ha enviado un correo electrónico a <strong>{email}</strong> con
              instrucciones para restablecer tu contraseña.
            </p>
            <p>Si no recibes el correo en unos minutos, revisa tu carpeta de spam.</p>
          </Alert>
          <div>
            <Link href="/iniciar-sesion">
              <Boton fullWidth variant="secondary">
                Volver al inicio de sesión
              </Boton>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Recuperar Contraseña
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer
            tu contraseña.
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <Input
            label="Correo electrónico"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
          />

          <div>
            <Boton type="submit" fullWidth isLoading={isLoading} disabled={isLoading}>
              Enviar instrucciones
            </Boton>
          </div>

          <div className="text-center">
            <Link
              href="/iniciar-sesion"
              className="font-medium text-sm text-primary-600 hover:text-primary-500"
            >
              Volver al inicio de sesión
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
