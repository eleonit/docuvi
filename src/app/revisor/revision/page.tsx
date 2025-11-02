/**
 * Bandeja de Revisión de Documentos
 */

'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  CardContent,
  Modal,
  Boton,
  Input,
  Textarea,
  Badge,
  PageLoading,
} from '@/components/base'
import { obtenerDocumentosPendientes, aprobarDocumento, rechazarDocumento, obtenerUrlDescarga } from '@/services'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/store/toastStore'
import { formatearFecha } from '@/lib/fechas'

export default function BandejaRevisionPage() {
  const queryClient = useQueryClient()
  const { usuario } = useAuth()
  const [selectedDoc, setSelectedDoc] = useState<any>(null)
  const [accion, setAccion] = useState<'aprobar' | 'rechazar' | null>(null)
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [motivoRechazo, setMotivoRechazo] = useState('')

  const { data: documentos, isLoading } = useQuery({
    queryKey: ['documentos-pendientes'],
    queryFn: obtenerDocumentosPendientes,
  })

  const aprobarMutation = useMutation({
    mutationFn: async ({ id, fecha }: { id: string; fecha?: string }) => {
      if (!usuario) throw new Error('No autenticado')
      return aprobarDocumento(id, usuario.id, fecha)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos-pendientes'] })
      toast.success('Documento aprobado')
      cerrarModal()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const rechazarMutation = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      return rechazarDocumento(id, motivo)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos-pendientes'] })
      toast.success('Documento rechazado')
      cerrarModal()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleAprobar = () => {
    if (!selectedDoc) return
    aprobarMutation.mutate({
      id: selectedDoc.id,
      fecha: fechaVencimiento || undefined,
    })
  }

  const handleRechazar = () => {
    if (!selectedDoc || !motivoRechazo.trim()) {
      toast.error('Debes proporcionar un motivo de rechazo')
      return
    }
    rechazarMutation.mutate({
      id: selectedDoc.id,
      motivo: motivoRechazo,
    })
  }

  const cerrarModal = () => {
    setSelectedDoc(null)
    setAccion(null)
    setFechaVencimiento('')
    setMotivoRechazo('')
  }

  const handleVerDocumento = async (doc: any) => {
    try {
      const url = await obtenerUrlDescarga(doc.url)
      window.open(url, '_blank')
    } catch (error) {
      toast.error('Error al abrir el documento')
    }
  }

  if (isLoading) return <PageLoading />

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Bandeja de Revisión</h1>
        <p className="text-gray-600 mt-1">Revisa y aprueba los documentos pendientes</p>
      </div>

      <Card>
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                No hay documentos pendientes de revisión
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
                      Archivo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Fecha de Carga
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documentos.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {doc.requerimiento_cliente?.cliente?.nombre_empresa}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {doc.requerimiento_cliente?.tipo_documento?.nombre}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {doc.nombre_archivo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatearFecha(doc.fecha_carga)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <Boton
                          size="sm"
                          variant="outline"
                          onClick={() => handleVerDocumento(doc)}
                        >
                          Ver
                        </Boton>
                        <Boton
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            setSelectedDoc(doc)
                            setAccion('aprobar')
                          }}
                        >
                          Aprobar
                        </Boton>
                        <Boton
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            setSelectedDoc(doc)
                            setAccion('rechazar')
                          }}
                        >
                          Rechazar
                        </Boton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Aprobar */}
      <Modal
        isOpen={accion === 'aprobar'}
        onClose={cerrarModal}
        title="Aprobar Documento"
        footer={
          <>
            <Boton variant="ghost" onClick={cerrarModal}>
              Cancelar
            </Boton>
            <Boton
              onClick={handleAprobar}
              isLoading={aprobarMutation.isPending}
            >
              Aprobar
            </Boton>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            ¿Estás seguro de aprobar este documento?
          </p>
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <p className="text-sm">
              <strong>Cliente:</strong>{' '}
              {selectedDoc?.requerimiento_cliente?.cliente?.nombre_empresa}
            </p>
            <p className="text-sm">
              <strong>Tipo:</strong>{' '}
              {selectedDoc?.requerimiento_cliente?.tipo_documento?.nombre}
            </p>
            <p className="text-sm">
              <strong>Archivo:</strong> {selectedDoc?.nombre_archivo}
            </p>
          </div>
          <Input
            label="Fecha de Vencimiento (Opcional)"
            type="date"
            value={fechaVencimiento}
            onChange={(e) => setFechaVencimiento(e.target.value)}
            helperText="Si el documento tiene vigencia limitada, indica la fecha de vencimiento"
          />
        </div>
      </Modal>

      {/* Modal Rechazar */}
      <Modal
        isOpen={accion === 'rechazar'}
        onClose={cerrarModal}
        title="Rechazar Documento"
        footer={
          <>
            <Boton variant="ghost" onClick={cerrarModal}>
              Cancelar
            </Boton>
            <Boton
              variant="danger"
              onClick={handleRechazar}
              isLoading={rechazarMutation.isPending}
            >
              Rechazar
            </Boton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <p className="text-sm">
              <strong>Cliente:</strong>{' '}
              {selectedDoc?.requerimiento_cliente?.cliente?.nombre_empresa}
            </p>
            <p className="text-sm">
              <strong>Tipo:</strong>{' '}
              {selectedDoc?.requerimiento_cliente?.tipo_documento?.nombre}
            </p>
            <p className="text-sm">
              <strong>Archivo:</strong> {selectedDoc?.nombre_archivo}
            </p>
          </div>
          <Textarea
            label="Motivo del Rechazo"
            required
            rows={4}
            value={motivoRechazo}
            onChange={(e) => setMotivoRechazo(e.target.value)}
            placeholder="Explica por qué rechazas este documento..."
            helperText="El cliente verá este mensaje"
          />
        </div>
      </Modal>
    </div>
  )
}
