/**
 * Gestión de Tipos de Documento
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
import {
  obtenerTiposDocumento,
  crearTipoDocumento,
  actualizarTipoDocumento,
  toggleActivoTipoDocumento,
} from '@/services'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/store/toastStore'

export default function TiposDocumentoPage() {
  const queryClient = useQueryClient()
  const { usuario } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTipo, setEditingTipo] = useState<any>(null)
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
  })

  const { data: tipos, isLoading } = useQuery({
    queryKey: ['tipos-documento'],
    queryFn: () => obtenerTiposDocumento(false),
  })

  const crearMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!usuario) throw new Error('No autenticado')
      return crearTipoDocumento({
        ...data,
        creado_por: usuario.id,
        activo: true,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-documento'] })
      toast.success('Tipo de documento creado')
      cerrarModal()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const actualizarMutation = useMutation({
    mutationFn: async (data: { id: string; datos: typeof formData }) => {
      return actualizarTipoDocumento(data.id, data.datos)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-documento'] })
      toast.success('Tipo de documento actualizado')
      cerrarModal()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const toggleActivoMutation = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      return toggleActivoTipoDocumento(id, activo)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tipos-documento'] })
      toast.success('Estado actualizado')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingTipo) {
      actualizarMutation.mutate({ id: editingTipo.id, datos: formData })
    } else {
      crearMutation.mutate(formData)
    }
  }

  const handleEditar = (tipo: any) => {
    setEditingTipo(tipo)
    setFormData({
      nombre: tipo.nombre,
      descripcion: tipo.descripcion || '',
    })
    setIsModalOpen(true)
  }

  const cerrarModal = () => {
    setIsModalOpen(false)
    setEditingTipo(null)
    setFormData({ nombre: '', descripcion: '' })
  }

  if (isLoading) return <PageLoading />

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tipos de Documento</h1>
          <p className="text-gray-600 mt-1">Gestiona el catálogo de tipos de documentos</p>
        </div>
        <Boton onClick={() => setIsModalOpen(true)}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Tipo
        </Boton>
      </div>

      <Card>
        <CardContent>
          {!tipos || tipos.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">No hay tipos de documento</p>
              <Boton variant="primary" className="mt-4" onClick={() => setIsModalOpen(true)}>
                Crear primer tipo
              </Boton>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tipos.map((tipo) => (
                    <tr key={tipo.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{tipo.nombre}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{tipo.descripcion || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {tipo.activo ? (
                          <Badge variant="success">Activo</Badge>
                        ) : (
                          <Badge variant="neutral">Inactivo</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                        <Boton size="sm" variant="outline" onClick={() => handleEditar(tipo)}>
                          Editar
                        </Boton>
                        <Boton
                          size="sm"
                          variant={tipo.activo ? 'secondary' : 'primary'}
                          onClick={() => toggleActivoMutation.mutate({ id: tipo.id, activo: !tipo.activo })}
                        >
                          {tipo.activo ? 'Desactivar' : 'Activar'}
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

      {/* Modal Crear/Editar */}
      <Modal
        isOpen={isModalOpen}
        onClose={cerrarModal}
        title={editingTipo ? 'Editar Tipo de Documento' : 'Nuevo Tipo de Documento'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre"
            required
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            placeholder="Ej: RFC, INE, Comprobante de Domicilio"
          />
          <Textarea
            label="Descripción"
            rows={3}
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            placeholder="Describe el tipo de documento..."
          />

          <div className="flex gap-3 justify-end pt-4">
            <Boton type="button" variant="ghost" onClick={cerrarModal}>
              Cancelar
            </Boton>
            <Boton
              type="submit"
              isLoading={crearMutation.isPending || actualizarMutation.isPending}
            >
              {editingTipo ? 'Actualizar' : 'Crear'}
            </Boton>
          </div>
        </form>
      </Modal>
    </div>
  )
}
