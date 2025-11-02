/**
 * Gestión de Certificados
 */

'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  Modal,
  Boton,
  Select,
  Input,
  Textarea,
  Badge,
  PageLoading,
} from '@/components/base'
import {
  obtenerCertificados,
  obtenerClientes,
  generarCertificado,
  revocarCertificado,
  obtenerEstadoCumplimiento,
  obtenerCertificadoPorId,
} from '@/services'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/store/toastStore'
import { formatearFecha } from '@/lib/fechas'
import { generarCertificadoPDF } from '@/lib/generarPDF'

export default function CertificadosPage() {
  const queryClient = useQueryClient()
  const { usuario } = useAuth()
  const [isModalGenerar, setIsModalGenerar] = useState(false)
  const [isModalRevocar, setIsModalRevocar] = useState(false)
  const [selectedCertificado, setSelectedCertificado] = useState<any>(null)
  const [descargandoId, setDescargandoId] = useState<string | null>(null)
  const [formGenerar, setFormGenerar] = useState({
    cliente_id: '',
    fecha_validez_desde: '',
    fecha_validez_hasta: '',
  })
  const [motivoRevocacion, setMotivoRevocacion] = useState('')

  const { data: certificados, isLoading } = useQuery({
    queryKey: ['certificados'],
    queryFn: obtenerCertificados,
  })

  const { data: clientes } = useQuery({
    queryKey: ['clientes'],
    queryFn: obtenerClientes,
  })

  const generarMutation = useMutation({
    mutationFn: async (data: typeof formGenerar) => {
      if (!usuario) throw new Error('No autenticado')

      // Verificar cumplimiento primero
      const cumplimiento = await obtenerEstadoCumplimiento(data.cliente_id)
      if (!cumplimiento || !cumplimiento.cumple) {
        throw new Error('El cliente no cumple con todos los requerimientos obligatorios')
      }

      return generarCertificado(
        data.cliente_id,
        usuario.id,
        data.fecha_validez_desde,
        data.fecha_validez_hasta
      )
    },
    onSuccess: async (certificado) => {
      // Invalidar queries para actualizar la lista
      queryClient.invalidateQueries({ queryKey: ['certificados'] })

      // Cerrar modal
      cerrarModalGenerar()

      // Mostrar mensaje de éxito
      toast.success('Certificado generado. Descargando PDF...')

      try {
        // Obtener certificado completo con todos los detalles
        const certificadoCompleto = await obtenerCertificadoPorId(certificado.id)

        // Generar y descargar PDF automáticamente
        await generarCertificadoPDF(certificadoCompleto)

        toast.success('¡PDF descargado exitosamente!')
      } catch (error) {
        console.error('Error al generar PDF:', error)
        toast.error('Certificado creado, pero hubo un error al descargar el PDF. Usa el botón de descarga en la tabla.')
      }
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const revocarMutation = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      if (!usuario) throw new Error('No autenticado')
      return revocarCertificado(id, motivo, usuario.id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificados'] })
      toast.success('Certificado revocado')
      cerrarModalRevocar()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleGenerarSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    generarMutation.mutate(formGenerar)
  }

  const handleRevocarSubmit = () => {
    if (!selectedCertificado || !motivoRevocacion.trim()) {
      toast.error('Debes proporcionar un motivo de revocación')
      return
    }
    revocarMutation.mutate({
      id: selectedCertificado.id,
      motivo: motivoRevocacion,
    })
  }

  const cerrarModalGenerar = () => {
    setIsModalGenerar(false)
    setFormGenerar({
      cliente_id: '',
      fecha_validez_desde: '',
      fecha_validez_hasta: '',
    })
  }

  const cerrarModalRevocar = () => {
    setIsModalRevocar(false)
    setSelectedCertificado(null)
    setMotivoRevocacion('')
  }

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
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Certificados</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Gestiona los certificados de cumplimiento</p>
        </div>
        <Boton onClick={() => setIsModalGenerar(true)} className="w-full sm:w-auto">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
            />
          </svg>
          <span className="hidden sm:inline">Generar Certificado</span>
          <span className="sm:hidden">Generar</span>
        </Boton>
      </div>

      <Card>
        <CardContent>
          {!certificados || certificados.length === 0 ? (
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
              <p className="mt-2 text-sm text-gray-600">No hay certificados generados</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Fecha Emisión
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Vigencia
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {certificados.map((cert) => (
                    <tr key={cert.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {cert.codigo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {cert.cliente?.nombre_empresa}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatearFecha(cert.fecha_emision)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatearFecha(cert.fecha_validez_desde)} -{' '}
                        {formatearFecha(cert.fecha_validez_hasta)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{getEstadoBadge(cert.estado)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <Boton
                          size="sm"
                          variant="outline"
                          onClick={() => handleDescargarPDF(cert.id)}
                          isLoading={descargandoId === cert.id}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </Boton>
                        {cert.estado === 'activo' && (
                          <Boton
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setSelectedCertificado(cert)
                              setIsModalRevocar(true)
                            }}
                          >
                            Revocar
                          </Boton>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Generar */}
      <Modal
        isOpen={isModalGenerar}
        onClose={cerrarModalGenerar}
        title="Generar Certificado de Cumplimiento"
        size="md"
      >
        <form onSubmit={handleGenerarSubmit} className="space-y-4">
          <Select
            label="Cliente"
            required
            value={formGenerar.cliente_id}
            onChange={(e) => setFormGenerar({ ...formGenerar, cliente_id: e.target.value })}
            options={[
              { value: '', label: 'Selecciona un cliente' },
              ...(clientes?.map((c) => ({ value: c.id, label: c.nombre_empresa })) || []),
            ]}
          />
          <Input
            label="Fecha de Validez Desde"
            type="date"
            required
            value={formGenerar.fecha_validez_desde}
            onChange={(e) =>
              setFormGenerar({ ...formGenerar, fecha_validez_desde: e.target.value })
            }
          />
          <Input
            label="Fecha de Validez Hasta"
            type="date"
            required
            value={formGenerar.fecha_validez_hasta}
            onChange={(e) =>
              setFormGenerar({ ...formGenerar, fecha_validez_hasta: e.target.value })
            }
          />

          <div className="flex gap-3 justify-end pt-4">
            <Boton type="button" variant="ghost" onClick={cerrarModalGenerar}>
              Cancelar
            </Boton>
            <Boton type="submit" isLoading={generarMutation.isPending}>
              Generar
            </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal Revocar */}
      <Modal
        isOpen={isModalRevocar}
        onClose={cerrarModalRevocar}
        title="Revocar Certificado"
        footer={
          <>
            <Boton variant="ghost" onClick={cerrarModalRevocar}>
              Cancelar
            </Boton>
            <Boton
              variant="danger"
              onClick={handleRevocarSubmit}
              isLoading={revocarMutation.isPending}
            >
              Revocar
            </Boton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-red-800">
              <strong>Código:</strong> {selectedCertificado?.codigo}
            </p>
            <p className="text-sm text-red-800">
              <strong>Cliente:</strong> {selectedCertificado?.cliente?.nombre_empresa}
            </p>
          </div>
          <Textarea
            label="Motivo de Revocación"
            required
            rows={4}
            value={motivoRevocacion}
            onChange={(e) => setMotivoRevocacion(e.target.value)}
            placeholder="Explica por qué revocar este certificado..."
          />
        </div>
      </Modal>
    </div>
  )
}
