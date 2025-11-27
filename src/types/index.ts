/**
 * Application Types
 * Tipos usados en la aplicación
 */

import { Database } from './database'

// Tipos de tablas para uso en la aplicación
export type Usuario = Database['public']['Tables']['usuarios']['Row']
export type Cliente = Database['public']['Tables']['clientes']['Row']
export type TipoDocumento = Database['public']['Tables']['tipos_documento']['Row']
export type RequerimientoCliente = Database['public']['Tables']['requerimientos_cliente']['Row']
export type Documento = Database['public']['Tables']['documentos']['Row']
export type Certificado = Database['public']['Tables']['certificados']['Row']
export type CertificadoDetalle = Database['public']['Tables']['certificados_detalle']['Row']
export type Notificacion = Database['public']['Tables']['notificaciones']['Row']
export type Auditoria = Database['public']['Tables']['auditoria']['Row']

// Tipos compuestos con relaciones
export interface ClienteConUsuario extends Cliente {
  usuario?: Usuario | null
}

export interface RequerimientoConRelaciones extends RequerimientoCliente {
  tipo_documento?: TipoDocumento
  cliente?: Cliente
  documentos?: Documento[]
}

export interface DocumentoConRelaciones extends Documento {
  requerimiento_cliente?: RequerimientoConRelaciones
}

export interface CertificadoConRelaciones extends Certificado {
  cliente?: Cliente
  emisor?: Usuario
  detalles?: CertificadoDetalle[]
}

// DTOs para creación
export type CrearCliente = Database['public']['Tables']['clientes']['Insert']
export type CrearTipoDocumento = Database['public']['Tables']['tipos_documento']['Insert']
export type CrearRequerimiento = Database['public']['Tables']['requerimientos_cliente']['Insert']
export type CrearDocumento = Database['public']['Tables']['documentos']['Insert']
export type CrearCertificado = Database['public']['Tables']['certificados']['Insert']

// DTOs para actualización
export type ActualizarCliente = Database['public']['Tables']['clientes']['Update']
export type ActualizarTipoDocumento = Database['public']['Tables']['tipos_documento']['Update']
export type ActualizarRequerimiento = Database['public']['Tables']['requerimientos_cliente']['Update']
export type ActualizarDocumento = Database['public']['Tables']['documentos']['Update']
export type ActualizarCertificado = Database['public']['Tables']['certificados']['Update']

// Tipos de respuesta de funciones
export interface CumplimientoCliente {
  cumple: boolean
  total_requerimientos: number
  requerimientos_cumplidos: number
  requerimientos_pendientes: number
}

export interface DocumentoProximoVencer {
  documento_id: string
  cliente_id: string
  cliente_nombre: string
  tipo_documento: string
  fecha_vencimiento: string
  dias_restantes: number
}

// Tipos para autenticación
export interface SesionUsuario {
  usuario: Usuario
  session_id: string
}

// Tipos para formularios
export interface FormularioCliente {
  nombre_empresa: string
  cuit_cuil?: string
  domicilio?: string
  nombre_representante?: string
  correo_contacto: string
  telefono_contacto?: string
  celular_contacto?: string
  tipo_persona?: 'fisica' | 'juridica'
  crear_usuario: boolean
  password?: string
}

export interface FormularioTipoDocumento {
  nombre: string
  descripcion?: string
  activo: boolean
}

export interface FormularioRequerimiento {
  tipo_documento_id: string
  obligatorio: boolean
  periodicidad_meses?: number
  metadatos?: Record<string, unknown>
}

export interface FormularioDocumento {
  archivo: File
  fecha_vencimiento?: string
}

export interface FormularioAprobacion {
  documento_id: string
  estado: 'aprobado' | 'rechazado'
  fecha_vencimiento?: string
  motivo_rechazo?: string
}

// Tipos para filtros
export interface FiltrosRevision {
  estado?: 'todos' | 'pendiente' | 'aprobado' | 'rechazado'
  cliente_id?: string
  tipo_documento_id?: string
  fecha_desde?: string
  fecha_hasta?: string
  busqueda?: string
}

export interface FiltrosDocumentos {
  estado?: 'todos' | 'pendiente' | 'aprobado' | 'rechazado'
  vencimiento?: 'todos' | 'vigentes' | 'proximos' | 'vencidos'
  tipo_documento_id?: string
}

// Tipos para respuestas de API
export interface RespuestaAPI<T = unknown> {
  data?: T
  error?: string
  mensaje?: string
}

export interface RespuestaPaginada<T> {
  data: T[]
  total: number
  pagina: number
  limite: number
  total_paginas: number
}

// Tipos para estadísticas
export interface EstadisticasRevisor {
  total_clientes: number
  clientes_activos: number
  documentos_pendientes: number
  documentos_aprobados: number
  documentos_rechazados: number
  documentos_proximos_vencer: number
  certificados_activos: number
}

export interface EstadisticasCliente {
  total_requerimientos: number
  requerimientos_cumplidos: number
  requerimientos_pendientes: number
  documentos_aprobados: number
  documentos_rechazados: number
  documentos_pendientes: number
  certificados_activos: number
  documentos_proximos_vencer: number
}

// Tipos para notificaciones
export type TipoNotificacion =
  | 'documento_nuevo'
  | 'documento_aprobado'
  | 'documento_rechazado'
  | 'documento_proximo_vencer'
  | 'documento_vencido'
  | 'certificado_emitido'
  | 'certificado_revocado'
  | 'certificado_proximo_vencer'
  | 'requerimiento_nuevo'
  | 'info'
  | 'warning'
  | 'error'

// Tipos para el estado de carga de archivos
export interface EstadoCargaArchivo {
  archivo: File
  progreso: number
  estado: 'cargando' | 'completado' | 'error'
  error?: string
}

// Tipos para validación de archivos
export interface ValidacionArchivo {
  valido: boolean
  errores: string[]
}

// Tipos para el generador de PDFs
export interface DatosCertificadoPDF {
  codigo: string
  cliente_nombre: string
  fecha_emision: string
  fecha_validez_desde: string
  fecha_validez_hasta: string
  documentos: {
    tipo: string
    fecha_aprobacion: string
    fecha_vencimiento?: string
  }[]
  qr_data: string
}

// Constantes exportadas
export const ROLES = {
  REVISOR: 'revisor' as const,
  CLIENTE: 'cliente' as const,
}

export const ESTADOS_DOCUMENTO = {
  PENDIENTE: 'pendiente' as const,
  APROBADO: 'aprobado' as const,
  RECHAZADO: 'rechazado' as const,
}

export const ESTADOS_CERTIFICADO = {
  ACTIVO: 'activo' as const,
  REVOCADO: 'revocado' as const,
  VENCIDO: 'vencido' as const,
}

export const TIPOS_ARCHIVO_PERMITIDOS = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/jpg',
]

export const TAMANO_MAXIMO_ARCHIVO = 10 * 1024 * 1024 // 10MB

export const EXTENSIONES_PERMITIDAS = [
  '.pdf',
  '.doc',
  '.docx',
  '.jpg',
  '.jpeg',
  '.png',
]
