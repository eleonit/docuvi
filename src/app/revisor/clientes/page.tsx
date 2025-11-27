/**
 * Página de Gestión de Clientes
 */

'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Boton, Card, CardHeader, CardTitle, CardContent, Modal, Input, Badge, PageLoading } from '@/components/base'
import { obtenerClientes } from '@/services'
import { toast } from '@/store/toastStore'

export default function ClientesPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    nombre_empresa: '',
    cuit_cuil: '',
    tipo_persona: 'juridica' as 'fisica' | 'juridica',
    domicilio: '',
    nombre_representante: '',
    correo_contacto: '',
    telefono_contacto: '',
    celular_contacto: '',
    crear_usuario: true,
    password: '',
  })

  const { data: clientes, isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: obtenerClientes,
  })

  const crearClienteMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al crear cliente')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] })
      toast.success('Cliente creado exitosamente')
      setIsModalOpen(false)
      setFormData({
        nombre_empresa: '',
        cuit_cuil: '',
        tipo_persona: 'juridica',
        domicilio: '',
        nombre_representante: '',
        correo_contacto: '',
        telefono_contacto: '',
        celular_contacto: '',
        crear_usuario: true,
        password: '',
      })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    crearClienteMutation.mutate(formData)
  }

  if (isLoading) return <PageLoading />

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600 mt-1">Gestiona los clientes y contratistas</p>
        </div>
        <Boton onClick={() => setIsModalOpen(true)}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Cliente
        </Boton>
      </div>

      <Card>
        <CardContent>
          {!clientes || clientes.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">No hay clientes registrados</p>
              <Boton variant="primary" className="mt-4" onClick={() => setIsModalOpen(true)}>
                Crear primer cliente
              </Boton>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CUIT/CUIL</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {clientes.map((cliente) => (
                    <tr key={cliente.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-gray-900">{cliente.nombre_empresa}</div>
                        {cliente.nombre_representante && (
                          <div className="text-xs text-gray-500">Rep: {cliente.nombre_representante}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {cliente.cuit_cuil || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {cliente.tipo_persona ? (
                          <Badge variant={cliente.tipo_persona === 'juridica' ? 'info' : 'neutral'}>
                            {cliente.tipo_persona === 'juridica' ? 'Jurídica' : 'Física'}
                          </Badge>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div>{cliente.correo_contacto}</div>
                        <div className="text-xs text-gray-500">
                          {cliente.celular_contacto || cliente.telefono_contacto || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {cliente.usuario_id ? (
                          <Badge variant="success">Activo</Badge>
                        ) : (
                          <Badge variant="neutral">Sin usuario</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Boton size="sm" variant="outline" onClick={() => router.push(`/revisor/clientes/${cliente.id}`)}>
                          Ver Detalle
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

      {/* Modal Crear Cliente */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nuevo Cliente"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo de Persona */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Persona <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="tipo_persona"
                  value="juridica"
                  checked={formData.tipo_persona === 'juridica'}
                  onChange={(e) => setFormData({ ...formData, tipo_persona: 'juridica' })}
                  className="border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Persona Jurídica</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="tipo_persona"
                  value="fisica"
                  checked={formData.tipo_persona === 'fisica'}
                  onChange={(e) => setFormData({ ...formData, tipo_persona: 'fisica' })}
                  className="border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">Persona Física</span>
              </label>
            </div>
          </div>

          {/* Nombre de Empresa */}
          <Input
            label={formData.tipo_persona === 'fisica' ? 'Nombre Completo' : 'Nombre de la Empresa / Razón Social'}
            required
            value={formData.nombre_empresa}
            onChange={(e) => setFormData({ ...formData, nombre_empresa: e.target.value })}
            placeholder={formData.tipo_persona === 'fisica' ? 'Ej: Juan Pérez' : 'Ej: Constructora ABC S.A.'}
          />

          {/* CUIT/CUIL */}
          <Input
            label="CUIT/CUIL"
            value={formData.cuit_cuil}
            onChange={(e) => setFormData({ ...formData, cuit_cuil: e.target.value })}
            placeholder="XX-XXXXXXXX-X"
            helperText="Formato: 20-12345678-9"
          />

          {/* Domicilio */}
          <Input
            label="Domicilio"
            value={formData.domicilio}
            onChange={(e) => setFormData({ ...formData, domicilio: e.target.value })}
            placeholder="Calle, número, ciudad, provincia"
          />

          {/* Nombre del Representante/Contacto */}
          <Input
            label={formData.tipo_persona === 'fisica' ? 'Persona de Contacto (opcional)' : 'Nombre del Representante / Contacto'}
            value={formData.nombre_representante}
            onChange={(e) => setFormData({ ...formData, nombre_representante: e.target.value })}
            placeholder="Nombre y apellido del contacto"
          />

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Datos de Contacto</h3>

            {/* Correo de Contacto */}
            <Input
              label="Correo Electrónico"
              type="email"
              required
              value={formData.correo_contacto}
              onChange={(e) => setFormData({ ...formData, correo_contacto: e.target.value })}
              placeholder="contacto@empresa.com"
              className="mb-3"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Teléfono */}
              <Input
                label="Teléfono Fijo"
                type="tel"
                value={formData.telefono_contacto}
                onChange={(e) => setFormData({ ...formData, telefono_contacto: e.target.value })}
                placeholder="011 4444-5555"
              />

              {/* Celular */}
              <Input
                label="Celular / WhatsApp"
                type="tel"
                value={formData.celular_contacto}
                onChange={(e) => setFormData({ ...formData, celular_contacto: e.target.value })}
                placeholder="11 5555-6666"
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={formData.crear_usuario}
                onChange={(e) => setFormData({ ...formData, crear_usuario: e.target.checked })}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">Crear cuenta de usuario para acceder al sistema</span>
            </label>

            {formData.crear_usuario && (
              <Input
                label="Contraseña Temporal"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                helperText="El cliente recibirá estas credenciales para acceder al sistema"
              />
            )}
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Boton type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Boton>
            <Boton type="submit" isLoading={crearClienteMutation.isPending}>
              Crear Cliente
            </Boton>
          </div>
        </form>
      </Modal>
    </div>
  )
}
