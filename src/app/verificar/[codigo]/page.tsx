/**
 * Página Pública de Verificación de Certificados
 */

'use client'

import { use, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, Badge, Boton, Input, PageLoading } from '@/components/base'
import { verificarCertificado } from '@/services'
import { formatearFecha } from '@/lib/fechas'
import Link from 'next/link'

export default function VerificarCertificadoPage({
  params,
}: {
  params: Promise<{ codigo: string }>
}) {
  const resolvedParams = use(params)
  const codigoFromUrl = resolvedParams.codigo ? decodeURIComponent(resolvedParams.codigo) : null
  const [codigoBusqueda, setCodigoBusqueda] = useState(codigoFromUrl || '')
  const [codigoActual, setCodigoActual] = useState(codigoFromUrl || '')

  const { data: resultado, isLoading } = useQuery({
    queryKey: ['verificar-certificado', codigoActual],
    queryFn: () => verificarCertificado(codigoActual),
    enabled: !!codigoActual,
  })

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault()
    setCodigoActual(codigoBusqueda)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Verificar Certificado</h1>
          <p className="text-gray-600 mt-2">
            Ingresa el código del certificado para verificar su autenticidad
          </p>
        </div>

        <Card className="mb-8">
          <CardContent className="p-6">
            <form onSubmit={handleBuscar} className="flex gap-3">
              <Input
                placeholder="Ej: CERT-2025-123456"
                value={codigoBusqueda}
                onChange={(e) => setCodigoBusqueda(e.target.value)}
                className="flex-1"
              />
              <Boton type="submit">Verificar</Boton>
            </form>
          </CardContent>
        </Card>

        {isLoading && <PageLoading />}

        {resultado && !isLoading && (
          <Card>
            <CardContent className="p-6">
              {resultado.valido ? (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-green-100 rounded-full">
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
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-green-600">Certificado Válido</h2>
                      <p className="text-gray-600">{resultado.mensaje}</p>
                    </div>
                  </div>

                  {resultado.certificado && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Código</p>
                          <p className="text-base font-mono font-medium text-gray-900">
                            {resultado.certificado.codigo}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Empresa</p>
                          <p className="text-base font-medium text-gray-900">
                            {resultado.certificado.cliente?.nombre_empresa}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Fecha de Emisión</p>
                          <p className="text-base font-medium text-gray-900">
                            {formatearFecha(resultado.certificado.fecha_emision)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Vigencia</p>
                          <p className="text-base font-medium text-gray-900">
                            {formatearFecha(resultado.certificado.fecha_validez_desde)} -{' '}
                            {formatearFecha(resultado.certificado.fecha_validez_hasta)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Emitido por</p>
                          <p className="text-base font-medium text-gray-900">
                            {resultado.certificado.emisor?.nombre}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Estado</p>
                          <Badge variant="success">Activo</Badge>
                        </div>
                      </div>

                      {resultado.certificado.detalles &&
                        resultado.certificado.detalles.length > 0 && (
                          <div className="mt-6">
                            <p className="text-sm font-medium text-gray-700 mb-3">
                              Documentos verificados:
                            </p>
                            <ul className="space-y-2">
                              {resultado.certificado.detalles.map((detalle: any) => (
                                <li
                                  key={detalle.id}
                                  className="flex items-center gap-2 text-sm text-gray-600"
                                >
                                  <svg
                                    className="w-5 h-5 text-green-500 flex-shrink-0"
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
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-red-100 rounded-full">
                      <svg
                        className="w-8 h-8 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-red-600">
                        Certificado No Válido
                      </h2>
                      <p className="text-gray-600">{resultado.mensaje}</p>
                    </div>
                  </div>

                  {resultado.motivo && (
                    <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                      <p className="text-sm font-medium text-red-800">Motivo:</p>
                      <p className="text-sm text-red-700 mt-1">{resultado.motivo}</p>
                    </div>
                  )}

                  {resultado.certificado && (
                    <div className="mt-6 space-y-2">
                      <p className="text-sm text-gray-600">
                        <strong>Código:</strong> {resultado.certificado.codigo}
                      </p>
                      <p className="text-sm text-gray-600">
                        <strong>Estado:</strong>{' '}
                        <Badge variant="danger">{resultado.certificado.estado}</Badge>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="mt-8 text-center">
          <Link href="/iniciar-sesion">
            <Boton variant="ghost">Ir al portal de clientes</Boton>
          </Link>
        </div>
      </div>
    </div>
  )
}
