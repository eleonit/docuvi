/**
 * Mis Requerimientos - Portal del Cliente
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
  Badge,
  PageLoading,
  Alert,
} from '@/components/base'
import {
  obtenerClientePorUsuarioId,
  obtenerRequerimientosCliente,
  subirDocumento,
} from '@/services'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/store/toastStore'
import { formatearFecha, obtenerEstadoVencimiento } from '@/lib/fechas'
import { TAMANO_MAXIMO_ARCHIVO } from '@/types'

export default function MisRequerimientosPage() {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const [selectedReq, setSelectedReq] = useState<any>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [fechaVencimiento, setFechaVencimiento] = useState('')

  const { data: cliente } = useQuery({
    queryKey: ['cliente-actual', user?.id],
    queryFn: () => obtenerClientePorUsuarioId(user!.id),
    enabled: !!user,
  })

  const { data: requerimientos, isLoading } = useQuery({
    queryKey: ['mis-requerimientos', cliente?.id],
    queryFn: () => obtenerRequerimientosCliente(cliente!.id),
    enabled: !!cliente,
  })

  const subirMutation = useMutation({
    mutationFn: async () => {
      if (!archivo || !selectedReq || !cliente) {
        throw new Error('Faltan datos requeridos')
      }

      return subirDocumento(
        archivo,
        selectedReq.id,
        cliente.id,
        selectedReq.tipo_documento_id,
        fechaVencimiento || undefined
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mis-requerimientos'] })
      toast.success('Documento subido exitosamente')
      cerrarModal()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > TAMANO_MAXIMO_ARCHIVO) {
      toast.error('El archivo es demasiado grande. Máximo 10MB')
      return
    }

    setArchivo(file)
  }

  const handleSubir = () => {
    if (!archivo) {
      toast.error('Selecciona un archivo')
      return
    }
    subirMutation.mutate()
  }

  const cerrarModal = () => {
    setSelectedReq(null)
    setArchivo(null)
    setFechaVencimiento('')
  }

  const getUltimoDocumento = (req: any) => {
    if (!req.documentos || req.documentos.length === 0) return null
    const docsNoEliminados = req.documentos.filter((d: any) => !d.eliminado)
    return docsNoEliminados.sort((a: any, b: any) => b.version - a.version)[0]
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'aprobado':
        return <Badge variant="success">Aprobado</Badge>
      case 'pendiente':
        return <Badge variant="warning">En Revisión</Badge>
      case 'rechazado':
        return <Badge variant="danger">Rechazado</Badge>
      default:
        return <Badge variant="neutral">Sin Documento</Badge>
    }
  }

  const getVencimientoBadge = (fecha: string | null) => {
    if (!fecha) return null
    const estado = obtenerEstadoVencimiento(fecha)

    switch (estado) {
      case 'vigente':
        return <Badge variant="success">Vigente</Badge>
      case 'proximo':
        return <Badge variant="warning">Próximo a vencer</Badge>
      case 'vencido':
        return <Badge variant="danger">Vencido</Badge>
      default:
        return null
    }
  }

  if (isLoading) return <PageLoading />

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Mis Requerimientos</h1>
        <p className="text-gray-600 mt-1">
          Documentos que debes mantener actualizados
        </p>
      </div>

      {!requerimientos || requerimientos.length === 0 ? (
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                No tienes requerimientos asignados
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {requerimientos.map((req) => {
            const ultimoDoc = getUltimoDocumento(req)

            return (
              <Card key={req.id}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {req.tipo_documento?.nombre}
                        {req.obligatorio && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </h3>
                      {req.tipo_documento?.descripcion && (
                        <p className="text-sm text-gray-600 mt-1">
                          {req.tipo_documento.descripcion}
                        </p>
                      )}
                    </div>
                    <Boton onClick={() => setSelectedReq(req)}>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      Subir Documento
                    </Boton>
                  </div>

                  {ultimoDoc ? (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          Último documento:
                        </span>
                        {getEstadoBadge(ultimoDoc.estado)}
                      </div>
                      <p className="text-sm text-gray-600">
                        <strong>Archivo:</strong> {ultimoDoc.nombre_archivo}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Subido el:</strong>{' '}
                        {formatearFecha(ultimoDoc.fecha_carga)}
                      </p>
                      {ultimoDoc.fecha_vencimiento && (
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600">
                            <strong>Vence el:</strong>{' '}
                            {formatearFecha(ultimoDoc.fecha_vencimiento)}
                          </p>
                          {getVencimientoBadge(ultimoDoc.fecha_vencimiento)}
                        </div>
                      )}
                      {ultimoDoc.estado === 'rechazado' && (
                        <Alert variant="danger">
                          <strong>Motivo de rechazo:</strong>{' '}
                          {ultimoDoc.motivo_rechazo}
                        </Alert>
                      )}
                    </div>
                  ) : (
                    <Alert variant="info">
                      <p>No has subido ningún documento para este requerimiento.</p>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Subir Documento */}
      <Modal
        isOpen={!!selectedReq}
        onClose={cerrarModal}
        title={`Subir: ${selectedReq?.tipo_documento?.nombre}`}
        size="md"
      >
        <div className="space-y-4">
          <Alert variant="info">
            <p>
              Formatos permitidos: PDF, DOC, DOCX, JPG, PNG
              <br />
              Tamaño máximo: 10MB
            </p>
          </Alert>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Archivo
            </label>
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
            {archivo && (
              <p className="mt-2 text-sm text-gray-600">
                Archivo seleccionado: {archivo.name}
              </p>
            )}
          </div>

          <Input
            label="Fecha de Vencimiento (Opcional)"
            type="date"
            value={fechaVencimiento}
            onChange={(e) => setFechaVencimiento(e.target.value)}
            helperText="Si el documento tiene vigencia limitada"
          />

          <div className="flex gap-3 justify-end pt-4">
            <Boton variant="ghost" onClick={cerrarModal}>
              Cancelar
            </Boton>
            <Boton onClick={handleSubir} isLoading={subirMutation.isPending}>
              Subir Documento
            </Boton>
          </div>
        </div>
      </Modal>
    </div>
  )
}
