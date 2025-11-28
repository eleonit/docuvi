/**
 * Hook para detectar inactividad del usuario
 */

import { useEffect, useState, useCallback, useRef } from 'react'

interface UseInactivityDetectorOptions {
  /**
   * Tiempo de inactividad antes de mostrar advertencia (en ms)
   * Por defecto: 25 minutos
   */
  warningTimeout?: number

  /**
   * Tiempo adicional después de la advertencia antes de cerrar sesión (en ms)
   * Por defecto: 5 minutos
   */
  logoutTimeout?: number

  /**
   * Callback cuando se detecta inactividad (muestra advertencia)
   */
  onWarning?: () => void

  /**
   * Callback cuando se debe cerrar sesión por inactividad
   */
  onLogout?: () => void

  /**
   * Si está habilitado
   */
  enabled?: boolean
}

export function useInactivityDetector({
  warningTimeout = 25 * 60 * 1000, // 25 minutos
  logoutTimeout = 5 * 60 * 1000,   // 5 minutos adicionales
  onWarning,
  onLogout,
  enabled = true
}: UseInactivityDetectorOptions = {}) {
  const [isInactive, setIsInactive] = useState(false)
  const [showWarning, setShowWarning] = useState(false)
  const warningTimerRef = useRef<NodeJS.Timeout | null>(null)
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Reiniciar los timers de inactividad
  const resetTimers = useCallback(() => {
    // Limpiar timers existentes
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current)
    }
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current)
    }

    // Resetear estado
    setIsInactive(false)
    setShowWarning(false)

    if (!enabled) return

    // Configurar nuevo timer para advertencia
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true)
      setIsInactive(true)
      onWarning?.()

      // Configurar timer para cierre de sesión después de la advertencia
      logoutTimerRef.current = setTimeout(() => {
        onLogout?.()
      }, logoutTimeout)
    }, warningTimeout)
  }, [enabled, warningTimeout, logoutTimeout, onWarning, onLogout])

  // Cancelar advertencia (usuario ha vuelto)
  const cancelWarning = useCallback(() => {
    resetTimers()
  }, [resetTimers])

  useEffect(() => {
    if (!enabled) {
      return
    }

    // Eventos que indican actividad del usuario
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ]

    // Resetear timers cuando hay actividad
    const handleActivity = () => {
      if (!showWarning) {
        resetTimers()
      }
    }

    // Agregar listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    // Iniciar timers
    resetTimers()

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })

      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current)
      }
      if (logoutTimerRef.current) {
        clearTimeout(logoutTimerRef.current)
      }
    }
  }, [enabled, showWarning, resetTimers])

  return {
    isInactive,
    showWarning,
    cancelWarning,
    resetTimers,
  }
}
