/**
 * Página de Restablecer Contraseña
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Boton, Input } from '@/components/base'
import { toast } from '@/store/toastStore'
import { actualizarPassword } from '@/services'

export default function RestablecerContrasenaPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (formData.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres'
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)

    try {
      await actualizarPassword(formData.password)
      toast.success('Contraseña actualizada correctamente')
      router.push('/iniciar-sesion')
    } catch (error: any) {
      console.error('Error al restablecer contraseña:', error)
      toast.error(error.message || 'Error al restablecer contraseña')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Restablecer Contraseña
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Ingresa tu nueva contraseña
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              label="Nueva contraseña"
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              error={errors.password}
              helperText="Mínimo 6 caracteres"
            />
            <Input
              label="Confirmar contraseña"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              placeholder="••••••••"
              error={errors.confirmPassword}
            />
          </div>

          <div>
            <Boton type="submit" fullWidth isLoading={isLoading} disabled={isLoading}>
              Restablecer Contraseña
            </Boton>
          </div>
        </form>
      </div>
    </div>
  )
}
