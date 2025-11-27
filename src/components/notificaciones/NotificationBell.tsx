/**
 * Componente: Campana de Notificaciones
 * Muestra el ícono de notificaciones con badge y panel desplegable
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/AuthContext'
import {
  obtenerNotificaciones,
  obtenerCantidadNoLeidas,
  marcarComoLeida,
  marcarTodasComoLeidas,
  eliminarNotificacion,
  suscribirseNotificaciones
} from '@/services'
import { Badge } from '@/components/base'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Notificacion } from '@/types'

export default function NotificationBell() {
  const { usuario } = useAuth()
  const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('unread')
  const panelRef = useRef<HTMLDivElement>(null)

  // Query para obtener notificaciones
  const { data: notificaciones = [] } = useQuery({
    queryKey: ['notificaciones', usuario?.id, filter],
    queryFn: () => obtenerNotificaciones(usuario!.id, filter === 'unread'),
    enabled: !!usuario?.id && isOpen,
    refetchInterval: 30000, // Refetch cada 30 segundos cuando está abierto
  })

  // Query para contador de no leídas
  const { data: cantidadNoLeidas = 0 } = useQuery({
    queryKey: ['notificaciones-count', usuario?.id],
    queryFn: () => obtenerCantidadNoLeidas(usuario!.id),
    enabled: !!usuario?.id,
    refetchInterval: 30000,
  })

  // Suscripción a notificaciones en tiempo real
  useEffect(() => {
    if (!usuario?.id) return

    const unsubscribe = suscribirseNotificaciones(usuario.id, (nuevaNotificacion) => {
      // Invalidar queries para refrescar datos
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] })
      queryClient.invalidateQueries({ queryKey: ['notificaciones-count'] })

      // Opcional: Mostrar notificación del navegador
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(nuevaNotificacion.titulo, {
          body: nuevaNotificacion.mensaje,
          icon: '/favicon.ico',
        })
      }
    })

    return () => unsubscribe()
  }, [usuario?.id, queryClient])

  // Cerrar panel al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Mutation para marcar como leída
  const marcarLeidaMutation = useMutation({
    mutationFn: marcarComoLeida,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] })
      queryClient.invalidateQueries({ queryKey: ['notificaciones-count'] })
    },
  })

  // Mutation para marcar todas como leídas
  const marcarTodasLeidasMutation = useMutation({
    mutationFn: () => marcarTodasComoLeidas(usuario!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] })
      queryClient.invalidateQueries({ queryKey: ['notificaciones-count'] })
    },
  })

  // Mutation para eliminar
  const eliminarMutation = useMutation({
    mutationFn: eliminarNotificacion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificaciones'] })
      queryClient.invalidateQueries({ queryKey: ['notificaciones-count'] })
    },
  })

  const handleNotificationClick = (notificacion: Notificacion) => {
    if (!notificacion.leida) {
      marcarLeidaMutation.mutate(notificacion.id)
    }
    // Aquí puedes agregar navegación si la notificación tiene enlaces
  }

  const getNotificationIcon = (tipo: string) => {
    switch (tipo) {
      case 'documento_nuevo':
      case 'documento_aprobado':
        return (
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
      case 'documento_rechazado':
        return (
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
      case 'documento_proximo_vencer':
      case 'warning':
        return (
          <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        )
      case 'certificado_emitido':
        return (
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        )
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )
    }
  }

  if (!usuario) return null

  return (
    <div className="relative" ref={panelRef}>
      {/* Botón de campana */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notificaciones"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {cantidadNoLeidas > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {cantidadNoLeidas > 99 ? '99+' : cantidadNoLeidas}
          </span>
        )}
      </button>

      {/* Panel de notificaciones */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Notificaciones</h3>
              {cantidadNoLeidas > 0 && (
                <button
                  onClick={() => marcarTodasLeidasMutation.mutate()}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  disabled={marcarTodasLeidasMutation.isPending}
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>

            {/* Filtros */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  filter === 'unread'
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                No leídas ({cantidadNoLeidas})
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  filter === 'all'
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Todas
              </button>
            </div>
          </div>

          {/* Lista de notificaciones */}
          <div className="max-h-96 overflow-y-auto">
            {notificaciones.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-sm">No tienes notificaciones</p>
              </div>
            ) : (
              <div>
                {notificaciones.map((notificacion) => (
                  <div
                    key={notificacion.id}
                    className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notificacion.leida ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleNotificationClick(notificacion)}
                  >
                    <div className="flex gap-3">
                      {/* Ícono */}
                      {getNotificationIcon(notificacion.tipo)}

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {notificacion.titulo}
                          </h4>
                          {!notificacion.leida && (
                            <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notificacion.mensaje}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(notificacion.creado_en), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </p>
                      </div>

                      {/* Botón eliminar */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          eliminarMutation.mutate(notificacion.id)
                        }}
                        className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 transition-colors"
                        aria-label="Eliminar notificación"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notificaciones.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 text-center">
              <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                Ver todas las notificaciones
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
