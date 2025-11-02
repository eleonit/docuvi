/**
 * Mis Certificados - Portal del Cliente
 */

'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, Badge, PageLoading, Boton } from '@/components/base'
import { obtenerClientePorUsuarioId, obtenerCertificadosCliente, obtenerCertificadoPorId } from '@/services'
import { useAuth } from '@/contexts/AuthContext'
import { formatearFecha } from '@/lib/fechas'
import { generarCertificadoPDF } from '@/lib/generarPDF'
import { toast } from '@/store/toastStore'

export default function MisCertificadosPage() {
  const { user } = useAuth()
  const [descargandoId, setDescargandoId] = useState<string | null>(null)

  const { data: cliente } = useQuery({
    queryKey: ['cliente-actual', user?.id],
    queryFn: () => obtenerClientePorUsuarioId(user!.id),
    enabled: !!user,
  })

  const { data: certificados, isLoading } = useQuery({
    queryKey: ['mis-certificados', cliente?.id],
    queryFn: () => obtenerCertificadosCliente(cliente!.id),
    enabled: !!cliente,
  })

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'activo':
        return <Badge variant="success">Activo</Badge>
      case 'revocado':
        return <Badge variant="danger">Revocado</Badge>
      case 'vencido':
        return <Badge variant="neutral">Vencido</Badge>
      default:
        return <Badge variant="neutral">{estado}</Badge>
    }
  }

  const handleDescargarPDF = async (certificadoId: string) => {
    try {
      setDescargandoId(certificadoId)

      // Obtener certificado completo con detalles
      const certificadoCompleto = await obtenerCertificadoPorId(certificadoId)

      // Generar PDF
      await generarCertificadoPDF(certificadoCompleto)

      toast.success('Certificado descargado exitosamente')
    } catch (error) {
      console.error('Error al descargar certificado:', error)
      toast.error('Error al descargar el certificado')
    } finally {
      setDescargandoId(null)
    }
  }

  if (isLoading) return <PageLoading />

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mis Certificados</h1>
        <p className="text-gray-600 mt-1">
          Certificados de cumplimiento emitidos para tu empresa
        </p>
      </div>

      {!certificados || certificados.length === 0 ? (
        <Card>
          <CardContent>
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
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                Aún no tienes certificados emitidos
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Los certificados se generan cuando cumples con todos los requerimientos
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {certificados.map((cert) => (
            <Card key={cert.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Certificado de Cumplimiento
                    </h3>
                    <p className="text-sm text-gray-600 font-mono mt-1">
                      Código: {cert.codigo}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getEstadoBadge(cert.estado)}
                    <Boton
                      size="sm"
                      variant="outline"
                      onClick={() => handleDescargarPDF(cert.id)}
                      isLoading={descargandoId === cert.id}
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Descargar PDF
                    </Boton>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Fecha de Emisión</p>
                    <p className="text-base font-medium text-gray-900">
                      {formatearFecha(cert.fecha_emision)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Vigencia</p>
                    <p className="text-base font-medium text-gray-900">
                      {formatearFecha(cert.fecha_validez_desde)} -{' '}
                      {formatearFecha(cert.fecha_validez_hasta)}
                    </p>
                  </div>
                  {cert.emisor && (
                    <div>
                      <p className="text-sm text-gray-600">Emitido por</p>
                      <p className="text-base font-medium text-gray-900">
                        {cert.emisor.nombre}
                      </p>
                    </div>
                  )}
                </div>

                {cert.estado === 'revocado' && cert.motivo_revocacion && (
                  <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm font-medium text-red-800">
                      Motivo de revocación:
                    </p>
                    <p className="text-sm text-red-700 mt-1">
                      {cert.motivo_revocacion}
                    </p>
                  </div>
                )}

                {cert.detalles && cert.detalles.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">
                      Documentos incluidos:
                    </p>
                    <ul className="space-y-1">
                      {cert.detalles.map((detalle: any) => (
                        <li
                          key={detalle.id}
                          className="text-sm text-gray-600 flex items-center gap-2"
                        >
                          <svg
                            className="w-4 h-4 text-green-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          {detalle.tipo_documento_nombre}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
