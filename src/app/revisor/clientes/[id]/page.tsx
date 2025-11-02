/**
 * Página de Detalle de Cliente
 * Muestra información detallada del cliente, estadísticas y documentos asignados
 */

'use client'

import { use, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  obtenerClientePorId,
  obtenerEstadisticasCliente,
  obtenerRequerimientosCliente,
  obtenerCertificadosCliente,
  obtenerCertificadoPorId,
  actualizarCliente,
  obtenerTiposDocumento,
  crearRequerimiento,
  generarCertificado,
  obtenerEstadoCumplimiento,
  asignarUsuarioACliente
} from '@/services'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Boton,
  Badge,
  PageLoading,
  Spinner,
  Modal,
  Input,
  Select
} from '@/components/base'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { generarCertificadoPDF } from '@/lib/generarPDF'
import { toast } from '@/store/toastStore'
import { useAuth } from '@/contexts/AuthContext'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function ClienteDetallePage(props: PageProps) {
  const params = use(props.params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const { usuario } = useAuth()

  // Estados para modales
  const [isModalEditar, setIsModalEditar] = useState(false)
  const [isModalRequerimientos, setIsModalRequerimientos] = useState(false)
  const [isModalCertificado, setIsModalCertificado] = useState(false)
  const [isModalAsignarUsuario, setIsModalAsignarUsuario] = useState(false)
  const [descargandoId, setDescargandoId] = useState<string | null>(null)

  // Estados para formularios
  const [formEditar, setFormEditar] = useState({
    nombre_empresa: '',
    correo_contacto: '',
    telefono_contacto: ''
  })

  const [formRequerimiento, setFormRequerimiento] = useState({
    tipo_documento_id: '',
    obligatorio: true,
    periodicidad_meses: ''
  })

  const [formCertificado, setFormCertificado] = useState({
    fecha_validez_desde: '',
    fecha_validez_hasta: ''
  })

  const [formAsignarUsuario, setFormAsignarUsuario] = useState({
    correo: '',
    password: '',
    nombre: ''
  })

  // Obtener datos del cliente
  const { data: cliente, isLoading: loadingCliente } = useQuery({
    queryKey: ['cliente', params.id],
    queryFn: () => obtenerClientePorId(params.id),
  })

  // Obtener estadísticas
  const { data: estadisticas, isLoading: loadingEstadisticas } = useQuery({
    queryKey: ['estadisticas-cliente', params.id],
    queryFn: () => obtenerEstadisticasCliente(params.id),
    enabled: !!params.id,
  })

  // Obtener requerimientos con documentos
  const { data: requerimientos, isLoading: loadingRequerimientos } = useQuery({
    queryKey: ['requerimientos-cliente', params.id],
    queryFn: () => obtenerRequerimientosCliente(params.id),
    enabled: !!params.id,
  })

  // Obtener certificados
  const { data: certificados, isLoading: loadingCertificados } = useQuery({
    queryKey: ['certificados-cliente', params.id],
    queryFn: () => obtenerCertificadosCliente(params.id),
    enabled: !!params.id,
  })

  // Obtener tipos de documento
  const { data: tiposDocumento } = useQuery({
    queryKey: ['tipos-documento'],
    queryFn: () => obtenerTiposDocumento()
  })

  // Mutation para editar cliente
  const editarMutation = useMutation({
    mutationFn: (datos: typeof formEditar) => actualizarCliente(params.id, datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente', params.id] })
      toast.success('Cliente actualizado exitosamente')
      setIsModalEditar(false)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  // Mutation para asignar requerimiento
  const asignarRequerimientoMutation = useMutation({
    mutationFn: (datos: typeof formRequerimiento) => crearRequerimiento({
      cliente_id: params.id,
      tipo_documento_id: datos.tipo_documento_id,
      obligatorio: datos.obligatorio,
      periodicidad_meses: datos.periodicidad_meses ? parseInt(datos.periodicidad_meses) : null,
      metadatos: {}
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['requerimientos-cliente', params.id] })
      queryClient.invalidateQueries({ queryKey: ['estadisticas-cliente', params.id] })
      toast.success('Requerimiento asignado exitosamente')
      setIsModalRequerimientos(false)
      setFormRequerimiento({
        tipo_documento_id: '',
        obligatorio: true,
        periodicidad_meses: ''
      })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  // Mutation para generar certificado
  const generarCertificadoMutation = useMutation({
    mutationFn: async (datos: typeof formCertificado) => {
      if (!usuario) throw new Error('No autenticado')

      // Verificar cumplimiento primero
      const cumplimiento = await obtenerEstadoCumplimiento(params.id)
      if (!cumplimiento || !cumplimiento.cumple) {
        throw new Error('El cliente no cumple con todos los requerimientos obligatorios')
      }

      return generarCertificado(
        params.id,
        usuario.id,
        datos.fecha_validez_desde,
        datos.fecha_validez_hasta
      )
    },
    onSuccess: async (certificado) => {
      queryClient.invalidateQueries({ queryKey: ['certificados-cliente', params.id] })
      queryClient.invalidateQueries({ queryKey: ['estadisticas-cliente', params.id] })
      setIsModalCertificado(false)

      toast.success('Certificado generado. Descargando PDF...')

      try {
        const certificadoCompleto = await obtenerCertificadoPorId(certificado.id)
        await generarCertificadoPDF(certificadoCompleto)
        toast.success('¡PDF descargado exitosamente!')
      } catch (error) {
        console.error('Error al generar PDF:', error)
        toast.error('Certificado creado, pero hubo un error al descargar el PDF.')
      }
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  // Mutation para asignar usuario
  const asignarUsuarioMutation = useMutation({
    mutationFn: (datos: typeof formAsignarUsuario) => asignarUsuarioACliente(params.id, datos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente', params.id] })
      toast.success('Usuario creado y asignado exitosamente. El cliente ya puede iniciar sesión.')
      setIsModalAsignarUsuario(false)
      setFormAsignarUsuario({
        correo: '',
        password: '',
        nombre: ''
      })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  if (loadingCliente) return <PageLoading />

  if (!cliente) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Cliente no encontrado</p>
        <Boton onClick={() => router.push('/revisor/clientes')} className="mt-4">
          Volver a Clientes
        </Boton>
      </div>
    )
  }

  // Función auxiliar para obtener el badge del estado del documento
  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'aprobado':
        return <Badge variant="success">Aprobado</Badge>
      case 'rechazado':
        return <Badge variant="danger">Rechazado</Badge>
      case 'pendiente':
        return <Badge variant="warning">Pendiente</Badge>
      default:
        return <Badge variant="neutral">Sin documentos</Badge>
    }
  }

  // Función para obtener el último documento de un requerimiento
  const getUltimoDocumento = (docs?: any[]) => {
    if (!docs || docs.length === 0) return null
    const docsActivos = docs.filter(d => !d.eliminado)
    return docsActivos.sort((a, b) => b.version - a.version)[0]
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

  // Handlers para modales
  const abrirModalEditar = () => {
    setFormEditar({
      nombre_empresa: cliente?.nombre_empresa || '',
      correo_contacto: cliente?.correo_contacto || '',
      telefono_contacto: cliente?.telefono_contacto || ''
    })
    setIsModalEditar(true)
  }

  const cerrarModalEditar = () => {
    setIsModalEditar(false)
  }

  const abrirModalRequerimientos = () => {
    setFormRequerimiento({
      tipo_documento_id: '',
      obligatorio: true,
      periodicidad_meses: ''
    })
    setIsModalRequerimientos(true)
  }

  const cerrarModalRequerimientos = () => {
    setIsModalRequerimientos(false)
  }

  const abrirModalCertificado = () => {
    // Establecer fechas por defecto
    const hoy = new Date()
    const unAnoDepues = new Date()
    unAnoDepues.setFullYear(hoy.getFullYear() + 1)

    setFormCertificado({
      fecha_validez_desde: hoy.toISOString().split('T')[0],
      fecha_validez_hasta: unAnoDepues.toISOString().split('T')[0]
    })
    setIsModalCertificado(true)
  }

  const cerrarModalCertificado = () => {
    setIsModalCertificado(false)
  }

  const handleEditarSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    editarMutation.mutate(formEditar)
  }

  const handleAsignarRequerimientoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    asignarRequerimientoMutation.mutate(formRequerimiento)
  }

  const handleGenerarCertificadoSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    generarCertificadoMutation.mutate(formCertificado)
  }

  const abrirModalAsignarUsuario = () => {
    setFormAsignarUsuario({
      correo: cliente?.correo_contacto || '',
      password: '',
      nombre: cliente?.nombre_empresa || ''
    })
    setIsModalAsignarUsuario(true)
  }

  const cerrarModalAsignarUsuario = () => {
    setIsModalAsignarUsuario(false)
  }

  const handleAsignarUsuarioSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    asignarUsuarioMutation.mutate(formAsignarUsuario)
  }

  return (
    <div className="space-y-6">
      {/* Header con acciones */}
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
        <div className="flex-1">
          <Boton
            variant="ghost"
            size="sm"
            onClick={() => router.push('/revisor/clientes')}
            className="mb-2"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </Boton>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 break-words">{cliente.nombre_empresa}</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Detalles y estadísticas del cliente</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Boton variant="outline" onClick={abrirModalEditar} size="sm" className="w-full sm:w-auto">
            Editar Cliente
          </Boton>
          <Boton onClick={abrirModalRequerimientos} size="sm" className="w-full sm:w-auto">
            Asignar Requerimientos
          </Boton>
        </div>
      </div>

      {/* Información básica del cliente */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <CardTitle>Información de Contacto</CardTitle>
            {!cliente.usuario_id && (
              <Boton size="sm" onClick={abrirModalAsignarUsuario} className="w-full sm:w-auto">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Crear Usuario de Acceso
              </Boton>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-1">Correo de Contacto</p>
              <p className="text-gray-900 font-medium">{cliente.correo_contacto}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Teléfono</p>
              <p className="text-gray-900 font-medium">{cliente.telefono_contacto || 'No registrado'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Estado de Usuario</p>
              {cliente.usuario_id ? (
                <div className="flex items-center gap-2">
                  <Badge variant="success">Usuario Activo</Badge>
                  <span className="text-xs text-gray-500">Puede iniciar sesión</span>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <Badge variant="neutral">Sin Usuario</Badge>
                  <span className="text-xs text-gray-500">No puede iniciar sesión</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Estadísticas</h2>
        {loadingEstadisticas ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : estadisticas ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card hoverable padding="md">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-600">
                  {estadisticas.total_requerimientos}
                </p>
                <p className="text-sm text-gray-600 mt-1">Total Requerimientos</p>
              </div>
            </Card>

            <Card hoverable padding="md">
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">
                  {estadisticas.requerimientos_obligatorios}
                </p>
                <p className="text-sm text-gray-600 mt-1">Obligatorios</p>
              </div>
            </Card>

            <Card hoverable padding="md">
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {estadisticas.documentos_pendientes}
                </p>
                <p className="text-sm text-gray-600 mt-1">Pendientes</p>
              </div>
            </Card>

            <Card hoverable padding="md">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {estadisticas.documentos_aprobados}
                </p>
                <p className="text-sm text-gray-600 mt-1">Aprobados</p>
              </div>
            </Card>

            <Card hoverable padding="md">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {estadisticas.documentos_rechazados}
                </p>
                <p className="text-sm text-gray-600 mt-1">Rechazados</p>
              </div>
            </Card>

            <Card hoverable padding="md">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {estadisticas.certificados_activos}
                </p>
                <p className="text-sm text-gray-600 mt-1">Certificados</p>
              </div>
            </Card>
          </div>
        ) : (
          <p className="text-gray-600 text-center py-4">No se pudieron cargar las estadísticas</p>
        )}
      </div>

      {/* Requerimientos y Documentos */}
      <Card>
        <CardHeader>
          <CardTitle>Requerimientos Asignados</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingRequerimientos ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : !requerimientos || requerimientos.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">No hay requerimientos asignados</p>
              <Boton variant="primary" className="mt-4" onClick={abrirModalRequerimientos}>
                Asignar Requerimientos
              </Boton>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo de Documento</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Obligatorio</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Periodicidad</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Versión</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Carga</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimiento</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {requerimientos.map((req) => {
                    const ultimoDoc = getUltimoDocumento(req.documentos)
                    return (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{req.tipo_documento?.nombre}</p>
                            {req.tipo_documento?.descripcion && (
                              <p className="text-xs text-gray-500">{req.tipo_documento.descripcion}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {req.obligatorio ? (
                            <Badge variant="warning">Obligatorio</Badge>
                          ) : (
                            <Badge variant="neutral">Opcional</Badge>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {req.periodicidad_meses ? `${req.periodicidad_meses} meses` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {ultimoDoc ? getEstadoBadge(ultimoDoc.estado) : <Badge variant="neutral">Sin documentos</Badge>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {ultimoDoc ? `v${ultimoDoc.version}` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {ultimoDoc?.fecha_carga
                            ? format(new Date(ultimoDoc.fecha_carga), 'dd/MM/yyyy', { locale: es })
                            : '-'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {ultimoDoc?.fecha_vencimiento
                            ? format(new Date(ultimoDoc.fecha_vencimiento), 'dd/MM/yyyy', { locale: es })
                            : 'Sin vencimiento'
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certificados */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
            <CardTitle>Certificados Emitidos</CardTitle>
            <Boton size="sm" onClick={abrirModalCertificado} className="w-full sm:w-auto">
              Generar Certificado
            </Boton>
          </div>
        </CardHeader>
        <CardContent>
          {loadingCertificados ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : !certificados || certificados.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">No hay certificados emitidos</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-6 sm:mx-0">
              <div className="inline-block min-w-full align-middle">
                <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha Emisión</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Válido Desde</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Válido Hasta</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {certificados.map((cert) => (
                    <tr key={cert.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {cert.codigo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {format(new Date(cert.fecha_emision), 'dd/MM/yyyy', { locale: es })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {format(new Date(cert.fecha_validez_desde), 'dd/MM/yyyy', { locale: es })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {format(new Date(cert.fecha_validez_hasta), 'dd/MM/yyyy', { locale: es })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {cert.estado === 'activo' ? (
                          <Badge variant="success">Activo</Badge>
                        ) : cert.estado === 'vencido' ? (
                          <Badge variant="neutral">Vencido</Badge>
                        ) : (
                          <Badge variant="danger">Revocado</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Boton
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/verificar/${cert.codigo}`)}
                            className="w-full sm:w-auto text-xs"
                          >
                            Ver Detalle
                          </Boton>
                          <Boton
                            size="sm"
                            variant="primary"
                            onClick={() => handleDescargarPDF(cert.id)}
                            isLoading={descargandoId === cert.id}
                            className="w-full sm:w-auto justify-center"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </Boton>
                        </div>
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

      {/* Modal Editar Cliente */}
      <Modal
        isOpen={isModalEditar}
        onClose={cerrarModalEditar}
        title="Editar Cliente"
      >
        <form onSubmit={handleEditarSubmit} className="space-y-4">
          <Input
            label="Nombre de la Empresa"
            value={formEditar.nombre_empresa}
            onChange={(e) => setFormEditar({ ...formEditar, nombre_empresa: e.target.value })}
            required
          />

          <Input
            label="Correo de Contacto"
            type="email"
            value={formEditar.correo_contacto}
            onChange={(e) => setFormEditar({ ...formEditar, correo_contacto: e.target.value })}
            required
          />

          <Input
            label="Teléfono de Contacto"
            type="tel"
            value={formEditar.telefono_contacto}
            onChange={(e) => setFormEditar({ ...formEditar, telefono_contacto: e.target.value })}
          />

          <div className="flex justify-end gap-2 mt-6">
            <Boton type="button" variant="outline" onClick={cerrarModalEditar}>
              Cancelar
            </Boton>
            <Boton type="submit" isLoading={editarMutation.isPending}>
              Guardar Cambios
            </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal Asignar Requerimientos */}
      <Modal
        isOpen={isModalRequerimientos}
        onClose={cerrarModalRequerimientos}
        title="Asignar Nuevo Requerimiento"
      >
        <form onSubmit={handleAsignarRequerimientoSubmit} className="space-y-4">
          <Select
            label="Tipo de Documento"
            value={formRequerimiento.tipo_documento_id}
            onChange={(e) => setFormRequerimiento({ ...formRequerimiento, tipo_documento_id: e.target.value })}
            required
            options={[
              { value: '', label: 'Seleccione un tipo' },
              ...(tiposDocumento?.map(tipo => ({
                value: tipo.id,
                label: tipo.nombre
              })) || [])
            ]}
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="obligatorio"
              checked={formRequerimiento.obligatorio}
              onChange={(e) => setFormRequerimiento({ ...formRequerimiento, obligatorio: e.target.checked })}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="obligatorio" className="text-sm font-medium text-gray-700 cursor-pointer">
              Documento obligatorio
            </label>
          </div>

          <Input
            label="Periodicidad (meses)"
            type="number"
            min="0"
            placeholder="Ej: 12 para anual"
            value={formRequerimiento.periodicidad_meses}
            onChange={(e) => setFormRequerimiento({ ...formRequerimiento, periodicidad_meses: e.target.value })}
            helperText="Dejar vacío si no tiene periodicidad"
          />

          <div className="flex justify-end gap-2 mt-6">
            <Boton type="button" variant="outline" onClick={cerrarModalRequerimientos}>
              Cancelar
            </Boton>
            <Boton type="submit" isLoading={asignarRequerimientoMutation.isPending}>
              Asignar Requerimiento
            </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal Generar Certificado */}
      <Modal
        isOpen={isModalCertificado}
        onClose={cerrarModalCertificado}
        title="Generar Certificado"
      >
        <form onSubmit={handleGenerarCertificadoSubmit} className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800">
              <strong>Nota:</strong> El certificado solo se generará si el cliente cumple con todos los requerimientos obligatorios.
            </p>
          </div>

          <Input
            label="Válido Desde"
            type="date"
            value={formCertificado.fecha_validez_desde}
            onChange={(e) => setFormCertificado({ ...formCertificado, fecha_validez_desde: e.target.value })}
            required
          />

          <Input
            label="Válido Hasta"
            type="date"
            value={formCertificado.fecha_validez_hasta}
            onChange={(e) => setFormCertificado({ ...formCertificado, fecha_validez_hasta: e.target.value })}
            required
            min={formCertificado.fecha_validez_desde}
          />

          <div className="flex justify-end gap-2 mt-6">
            <Boton type="button" variant="outline" onClick={cerrarModalCertificado}>
              Cancelar
            </Boton>
            <Boton type="submit" isLoading={generarCertificadoMutation.isPending}>
              Generar y Descargar PDF
            </Boton>
          </div>
        </form>
      </Modal>

      {/* Modal Asignar Usuario */}
      <Modal
        isOpen={isModalAsignarUsuario}
        onClose={cerrarModalAsignarUsuario}
        title="Crear Usuario de Acceso"
        size="md"
      >
        <form onSubmit={handleAsignarUsuarioSubmit} className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-800">
              <strong>Importante:</strong> Se creará un usuario para que el cliente pueda iniciar sesión en la plataforma y ver su información, documentos y certificados.
            </p>
          </div>

          <Input
            label="Correo Electrónico"
            type="email"
            value={formAsignarUsuario.correo}
            onChange={(e) => setFormAsignarUsuario({ ...formAsignarUsuario, correo: e.target.value })}
            required
            helperText="Este correo se utilizará para iniciar sesión"
          />

          <Input
            label="Nombre Completo"
            type="text"
            value={formAsignarUsuario.nombre}
            onChange={(e) => setFormAsignarUsuario({ ...formAsignarUsuario, nombre: e.target.value })}
            required
            helperText="Nombre del contacto o representante"
          />

          <Input
            label="Contraseña"
            type="password"
            value={formAsignarUsuario.password}
            onChange={(e) => setFormAsignarUsuario({ ...formAsignarUsuario, password: e.target.value })}
            required
            helperText="Mínimo 6 caracteres"
          />

          <div className="flex justify-end gap-2 mt-6">
            <Boton type="button" variant="outline" onClick={cerrarModalAsignarUsuario}>
              Cancelar
            </Boton>
            <Boton type="submit" isLoading={asignarUsuarioMutation.isPending}>
              Crear Usuario
            </Boton>
          </div>
        </form>
      </Modal>
    </div>
  )
}
