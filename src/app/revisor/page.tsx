/**
 * Panel Principal del Revisor (Dashboard)
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardHeader, CardTitle, CardContent, Badge, PageLoading } from '@/components/base'
import {
  obtenerDocumentosPendientes,
  obtenerClientes,
  obtenerCumplimientoTotal,
  obtenerCumplimientoPorCliente,
  obtenerClientesMasRapidos,
  obtenerClientesMasLentos,
  obtenerDocumentosVencidos,
  obtenerRequerimientosPendientesCarga,
} from '@/services'

export default function RevisorDashboardPage() {
  const { data: documentos, isLoading: loadingDocs } = useQuery({
    queryKey: ['documentos-pendientes'],
    queryFn: obtenerDocumentosPendientes,
  })

  const { data: clientes, isLoading: loadingClientes } = useQuery({
    queryKey: ['clientes'],
    queryFn: obtenerClientes,
  })

  const { data: cumplimientoTotal, isLoading: loadingCumplimiento } = useQuery({
    queryKey: ['cumplimiento-total'],
    queryFn: obtenerCumplimientoTotal,
  })

  const { data: cumplimientoClientes, isLoading: loadingCumplimientoClientes } = useQuery({
    queryKey: ['cumplimiento-clientes'],
    queryFn: obtenerCumplimientoPorCliente,
  })

  const { data: clientesRapidos, isLoading: loadingRapidos } = useQuery({
    queryKey: ['clientes-rapidos'],
    queryFn: () => obtenerClientesMasRapidos(3),
  })

  const { data: clientesLentos, isLoading: loadingLentos } = useQuery({
    queryKey: ['clientes-lentos'],
    queryFn: () => obtenerClientesMasLentos(3),
  })

  const { data: documentosVencidos, isLoading: loadingVencidos } = useQuery({
    queryKey: ['documentos-vencidos'],
    queryFn: obtenerDocumentosVencidos,
  })

  const { data: pendientesCarga, isLoading: loadingPendientesCarga } = useQuery({
    queryKey: ['pendientes-carga'],
    queryFn: obtenerRequerimientosPendientesCarga,
  })

  const isLoading =
    loadingDocs ||
    loadingClientes ||
    loadingCumplimiento ||
    loadingCumplimientoClientes ||
    loadingRapidos ||
    loadingLentos ||
    loadingVencidos ||
    loadingPendientesCarga

  if (isLoading) {
    return <PageLoading />
  }

  const stats = [
    {
      title: 'Cumplimiento Total',
      value: `${cumplimientoTotal?.porcentaje_total || 0}%`,
      subtitle: `${cumplimientoTotal?.requerimientos_cumplidos || 0} de ${cumplimientoTotal?.total_requerimientos || 0}`,
      icon: (
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      value: documentos?.length || 0,
      subtitle: 'Requieren revisión',
      icon: (
        <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
    {
      title: 'Documentos Vencidos',
      value: documentosVencidos?.length || 0,
      subtitle: 'Requieren atención',
      icon: (
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      ),
      color: 'bg-red-50',
    },
    {
      title: 'Total Clientes',
      value: clientes?.length || 0,
      subtitle: 'Activos en el sistema',
      icon: (
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      color: 'bg-blue-50',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Panel de Control</h1>
        <p className="text-gray-600 mt-1">Bienvenido al sistema de gestión documental</p>
      </div>

      {/* Stats Grid Principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

      {/* Cumplimiento por Cliente y Tiempos de Respuesta */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cumplimiento por Cliente */}
        <Card>
          <CardHeader>
            <CardTitle>Cumplimiento por Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            {!cumplimientoClientes || cumplimientoClientes.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No hay datos disponibles</p>
            ) : (
              <div className="space-y-4">
                {cumplimientoClientes.slice(0, 5).map((cliente) => (
                  <div key={cliente.cliente_id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900">
                        {cliente.cliente_nombre}
                      </span>
                      <span className="text-sm font-semibold text-primary-600">
                        {cliente.porcentaje_cumplimiento}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${cliente.porcentaje_cumplimiento}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      {cliente.requerimientos_cumplidos} de {cliente.total_requerimientos}{' '}
                      requerimientos cumplidos
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Clientes más rápidos y lentos */}
        <div className="space-y-6">
          {/* Clientes más rápidos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
                Clientes Más Rápidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!clientesRapidos || clientesRapidos.length === 0 ? (
                <p className="text-center text-gray-500 py-4 text-sm">No hay datos</p>
              ) : (
                <div className="space-y-3">
                  {clientesRapidos.map((cliente, index) => (
                    <div
                      key={cliente.cliente_id}
                      className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-green-700 text-lg">{index + 1}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {cliente.cliente_nombre}
                          </p>
                          <p className="text-xs text-gray-500">
                            {cliente.total_documentos} documentos
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600">
                          {cliente.dias_promedio}
                        </p>
                        <p className="text-xs text-gray-500">días</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clientes más lentos */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"
                  />
                </svg>
                Clientes Más Lentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!clientesLentos || clientesLentos.length === 0 ? (
                <p className="text-center text-gray-500 py-4 text-sm">No hay datos</p>
              ) : (
                <div className="space-y-3">
                  {clientesLentos.map((cliente, index) => (
                    <div
                      key={cliente.cliente_id}
                      className="flex items-center justify-between p-3 bg-orange-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-orange-700 text-lg">{index + 1}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {cliente.cliente_nombre}
                          </p>
                          <p className="text-xs text-gray-500">
                            {cliente.total_documentos} documentos
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-orange-600">
                          {cliente.dias_promedio}
                        </p>
                        <p className="text-xs text-gray-500">días</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Documentos Vencidos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Documentos Vencidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!documentosVencidos || documentosVencidos.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
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
              <p className="mt-2 text-sm text-gray-600">No hay documentos vencidos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tipo de Documento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Archivo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Fecha Vencimiento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Días Vencido
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documentosVencidos.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {doc.cliente_nombre}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {doc.tipo_documento}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {doc.nombre_archivo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(doc.fecha_vencimiento).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="danger">{doc.dias_vencido} días</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documentos Pendientes de Carga por Clientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            Documentos Pendientes de Carga por Clientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!pendientesCarga || pendientesCarga.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
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
              <p className="mt-2 text-sm text-gray-600">
                Todos los clientes han cargado sus documentos
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tipo de Documento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendientesCarga.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {req.cliente_nombre}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {req.tipo_documento}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Badge variant={req.obligatorio ? 'danger' : 'warning'}>
                            Pendiente de Carga
                          </Badge>
                          {req.obligatorio && (
                            <span className="text-xs text-red-600 font-medium">
                              (Obligatorio)
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documentos Pendientes de Revisión */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos Pendientes de Revisión</CardTitle>
        </CardHeader>
        <CardContent>
          {!documentos || documentos.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
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
              <p className="mt-2 text-sm text-gray-600">No hay documentos pendientes</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tipo de Documento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Archivo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Fecha de Carga
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documentos.slice(0, 10).map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {doc.requerimiento_cliente?.cliente?.nombre_empresa}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {doc.requerimiento_cliente?.tipo_documento?.nombre}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {doc.nombre_archivo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(doc.fecha_carga).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="warning">Pendiente</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
