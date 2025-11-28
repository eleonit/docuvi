/**
 * Modal de Advertencia de Inactividad
 * Muestra un modal cuando el usuario ha estado inactivo por mucho tiempo
 */

'use client'

import { useEffect, useState } from 'react'
import { Modal, Boton } from '@/components/base'

interface InactivityWarningModalProps {
  isOpen: boolean
  onStayLoggedIn: () => void
  onLogout: () => void
  /**
   * Tiempo en segundos antes del cierre de sesión automático
   */
  countdown?: number
}

export default function InactivityWarningModal({
  isOpen,
  onStayLoggedIn,
  onLogout,
  countdown = 300, // 5 minutos por defecto
}: InactivityWarningModalProps) {
  const [remainingTime, setRemainingTime] = useState(countdown)

  useEffect(() => {
    if (!isOpen) {
      setRemainingTime(countdown)
      return
    }

    // Iniciar countdown
    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          onLogout()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen, countdown, onLogout])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onStayLoggedIn}
      title="Sesión Inactiva"
      size="md"
    >
      <div className="space-y-6">
        {/* Icono de advertencia */}
        <div className="flex justify-center">
          <div className="rounded-full bg-yellow-100 dark:bg-yellow-900/30 p-3">
            <svg
              className="w-16 h-16 text-yellow-600 dark:text-yellow-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>

        {/* Mensaje */}
        <div className="text-center space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Tu sesión está a punto de expirar
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Has estado inactivo durante un tiempo. Por seguridad, tu sesión se
            cerrará automáticamente en:
          </p>

          {/* Countdown */}
          <div className="py-4">
            <div className="text-5xl font-bold text-primary-600 dark:text-primary-400 tabular-nums">
              {formatTime(remainingTime)}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              minutos restantes
            </p>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400">
            Si deseas continuar usando la aplicación, haz clic en &ldquo;Continuar Sesión&rdquo;
          </p>
        </div>

        {/* Barra de progreso */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className="bg-yellow-600 dark:bg-yellow-400 h-2 rounded-full transition-all duration-1000 ease-linear"
            style={{ width: `${(remainingTime / countdown) * 100}%` }}
          />
        </div>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Boton
            variant="outline"
            onClick={onLogout}
            fullWidth
            className="order-2 sm:order-1"
          >
            Cerrar Sesión Ahora
          </Boton>
          <Boton
            variant="primary"
            onClick={onStayLoggedIn}
            fullWidth
            className="order-1 sm:order-2"
          >
            Continuar Sesión
          </Boton>
        </div>

        {/* Nota de seguridad */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex gap-3">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
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
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <p className="font-medium mb-1">Nota de Seguridad</p>
              <p>
                Por tu protección, cerramos automáticamente las sesiones inactivas
                después de 30 minutos de inactividad.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
