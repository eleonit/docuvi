/**
 * Panel Principal del Cliente (Dashboard)
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, Badge, PageLoading } from '@/components/base'
import {
  obtenerClientePorUsuarioId,
  obtenerRequerimientosCliente,
  obtenerEstadoCumplimiento,
  obtenerTiempoRespuestaCliente,
} from '@/services'
import { useAuth } from '@/contexts/AuthContext'

export default function ClienteDashboardPage() {
  const { user } = useAuth()

  const { data: cliente, isLoading: loadingCliente } = useQuery({
    queryKey: ['cliente-actual', user?.id],
    queryFn: () => obtenerClientePorUsuarioId(user!.id),
    enabled: !!user,
  })

  const { data: requerimientos, isLoading: loadingReqs } = useQuery({
    queryKey: ['mis-requerimientos', cliente?.id],
    queryFn: () => obtenerRequerimientosCliente(cliente!.id),
    enabled: !!cliente,
  })

  const { data: cumplimiento, isLoading: loadingCumplimiento } = useQuery({
    queryKey: ['cumplimiento-cliente', cliente?.id],
    queryFn: () => obtenerEstadoCumplimiento(cliente!.id),
    enabled: !!cliente,
  })

  const { data: tiempoRespuesta, isLoading: loadingTiempo } = useQuery({
    queryKey: ['tiempo-respuesta-cliente', cliente?.id],
    queryFn: () => obtenerTiempoRespuestaCliente(cliente!.id),
    enabled: !!cliente,
  })

  if (loadingCliente || loadingReqs || loadingCumplimiento || loadingTiempo) {
    return <PageLoading />
  }

  const documentosPendientes =
    requerimientos?.filter((req) => {
      const docsAprobados = req.documentos?.filter(
        (d) => d.estado === 'aprobado' && !d.eliminado
      )
      return !docsAprobados || docsAprobados.length === 0
    }).length || 0

  const documentosAprobados =
    requerimientos?.filter((req) => {
      const docsAprobados = req.documentos?.filter(
        (d) => d.estado === 'aprobado' && !d.eliminado
      )
      return docsAprobados && docsAprobados.length > 0
    }).length || 0

  // Calcular porcentaje de cumplimiento
  const totalRequerimientos = cumplimiento?.total_requerimientos || 0
  const requerimientosCumplidos = cumplimiento?.requerimientos_cumplidos || 0
  const porcentajeCumplimiento =
    totalRequerimientos > 0 ? Math.round((requerimientosCumplidos / totalRequerimientos) * 100) : 0

  const stats = [
    {
      title: 'Porcentaje de Cumplimiento',
      value: `${porcentajeCumplimiento}%`,
      subtitle: `${requerimientosCumplidos} de ${totalRequerimientos} requerimientos`,
      icon: (
        <svg
          className="w-8 h-8 text-primary-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      color: 'bg-primary-50',
    },
    {
      title: 'Tiempo de Respuesta',
      value: tiempoRespuesta ? `${tiempoRespuesta} días` : 'N/A',
      subtitle: 'Promedio de aprobación',
      icon: (
        <svg
          className="w-8 h-8 text-indigo-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: 'bg-indigo-50',
    },
    {
      title: 'Requerimientos Totales',
      value: requerimientos?.length || 0,
      subtitle: 'Total asignados',
      icon: (
        <svg
          className="w-8 h-8 text-blue-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      color: 'bg-blue-50',
    },
    {
      title: 'Documentos Aprobados',
      value: documentosAprobados,
      subtitle: 'Completados',
      icon: (
        <svg
          className="w-8 h-8 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: 'bg-green-50',
    },
    {
      title: 'Documentos Pendientes',
      value: documentosPendientes,
      subtitle: 'Por cargar',
      icon: (
        <svg
          className="w-8 h-8 text-yellow-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: 'bg-yellow-50',
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Bienvenido, {cliente?.nombre_empresa}
        </h1>
        <p className="text-gray-600 mt-1">
          Aquí puedes ver el resumen de tus documentos y requerimientos
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${stat.color}`}>{stat.icon}</div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.subtitle}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Información de Contacto */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Información de la Empresa
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Nombre de la Empresa</p>
              <p className="text-base font-medium text-gray-900">
                {cliente?.nombre_empresa}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Correo de Contacto</p>
              <p className="text-base font-medium text-gray-900">
                {cliente?.correo_contacto}
              </p>
            </div>
            {cliente?.telefono_contacto && (
              <div>
                <p className="text-sm text-gray-600">Teléfono</p>
                <p className="text-base font-medium text-gray-900">
                  {cliente.telefono_contacto}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
