/**
 * Componente: Configuración de Notificaciones para Clientes
 * Permite configurar preferencias de notificaciones por WhatsApp
 */

'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Boton, Input } from '@/components/base'
import { actualizarCliente } from '@/services'
import type { Cliente } from '@/types'

interface ConfiguracionNotificacionesProps {
  cliente: Cliente
  onClose?: () => void
}

export default function ConfiguracionNotificaciones({
  cliente,
  onClose,
}: ConfiguracionNotificacionesProps) {
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    whatsapp_contacto: cliente.whatsapp_contacto || '',
    notificar_whatsapp: cliente.notificar_whatsapp ?? true,
    dias_anticipacion_vencimiento: cliente.dias_anticipacion_vencimiento || 7,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const actualizarMutation = useMutation({
    mutationFn: () =>
      actualizarCliente(cliente.id, {
        whatsapp_contacto: formData.whatsapp_contacto || null,
        notificar_whatsapp: formData.notificar_whatsapp,
        dias_anticipacion_vencimiento: formData.dias_anticipacion_vencimiento,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      queryClient.invalidateQueries({ queryKey: ['cliente', cliente.id] })
      if (onClose) onClose()
    },
    onError: (error: Error) => {
      console.error('Error al actualizar configuración:', error)
      setErrors({ general: error.message })
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    // Validaciones
    const newErrors: Record<string, string> = {}

    if (formData.notificar_whatsapp && !formData.whatsapp_contacto) {
      newErrors.whatsapp_contacto =
        'Debe proporcionar un número de WhatsApp si desea recibir notificaciones'
    }

    if (
      formData.whatsapp_contacto &&
      !/^\+\d{10,15}$/.test(formData.whatsapp_contacto)
    ) {
      newErrors.whatsapp_contacto =
        'Formato inválido. Use formato internacional: +52XXXXXXXXXX'
    }

    if (
      formData.dias_anticipacion_vencimiento < 1 ||
      formData.dias_anticipacion_vencimiento > 90
    ) {
      newErrors.dias_anticipacion_vencimiento = 'Debe estar entre 1 y 90 días'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    actualizarMutation.mutate()
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Configuración de Notificaciones
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Configura cómo y cuándo deseas recibir notificaciones de vencimientos
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* WhatsApp */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                Notificaciones por WhatsApp
              </h3>
              <p className="text-sm text-gray-600">
                Recibe alertas de vencimientos por WhatsApp
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.notificar_whatsapp}
                onChange={(e) =>
                  setFormData({ ...formData, notificar_whatsapp: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {formData.notificar_whatsapp && (
            <div>
              <Input
                label="Número de WhatsApp"
                type="tel"
                placeholder="+52XXXXXXXXXX"
                value={formData.whatsapp_contacto}
                onChange={(e) =>
                  setFormData({ ...formData, whatsapp_contacto: e.target.value })
                }
                error={errors.whatsapp_contacto}
                helperText="Formato internacional. Ejemplo: +5215512345678"
                required={formData.notificar_whatsapp}
              />
            </div>
          )}
        </div>

        {/* Días de anticipación */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Días de anticipación para vencimientos
          </label>
          <p className="text-sm text-gray-600 mb-3">
            ¿Con cuántos días de anticipación deseas recibir notificaciones antes del
            vencimiento?
          </p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="1"
              max="90"
              value={formData.dias_anticipacion_vencimiento}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  dias_anticipacion_vencimiento: parseInt(e.target.value, 10),
                })
              }
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="90"
                value={formData.dias_anticipacion_vencimiento}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dias_anticipacion_vencimiento: Math.min(
                      90,
                      Math.max(1, parseInt(e.target.value, 10) || 1)
                    ),
                  })
                }
                className="w-16 px-2 py-1 text-center border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <span className="text-sm text-gray-600">días</span>
            </div>
          </div>
          {errors.dias_anticipacion_vencimiento && (
            <p className="text-sm text-red-600 mt-1">
              {errors.dias_anticipacion_vencimiento}
            </p>
          )}
        </div>

        {/* Información adicional */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <svg
              className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Tipos de notificaciones:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Documentos aprobados o rechazados</li>
                <li>Documentos próximos a vencer</li>
                <li>Certificados emitidos</li>
              </ul>
              <p className="mt-2">
                Las notificaciones en la plataforma siempre están activas. Aquí solo
                configuras las notificaciones adicionales por WhatsApp.
              </p>
            </div>
          </div>
        </div>

        {/* Errores generales */}
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{errors.general}</p>
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
          {onClose && (
            <Boton variant="ghost" onClick={onClose} type="button">
              Cancelar
            </Boton>
          )}
          <Boton
            type="submit"
            isLoading={actualizarMutation.isPending}
            disabled={actualizarMutation.isPending}
          >
            Guardar Configuración
          </Boton>
        </div>
      </form>
    </div>
  )
}
