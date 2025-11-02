/**
 * Utilidades generales de la aplicación
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combina clases de Tailwind CSS de forma inteligente
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea un nombre de archivo para storage
 */
export function formatearNombreArchivo(nombre: string): string {
  return nombre
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9.-]/g, '')
}

/**
 * Obtiene la extensión de un archivo
 */
export function obtenerExtension(nombreArchivo: string): string {
  const partes = nombreArchivo.split('.')
  return partes.length > 1 ? `.${partes[partes.length - 1]}` : ''
}

/**
 * Formatea bytes a formato legible
 */
export function formatearBytes(bytes: number, decimales = 2): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const dm = decimales < 0 ? 0 : decimales
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

/**
 * Genera un nombre único para archivo en storage
 */
export function generarNombreUnicoArchivo(nombreOriginal: string): string {
  const timestamp = Date.now()
  const extension = obtenerExtension(nombreOriginal)
  const nombreSinExtension = nombreOriginal.replace(extension, '')
  const nombreFormateado = formatearNombreArchivo(nombreSinExtension)

  return `${timestamp}_${nombreFormateado}${extension}`
}

/**
 * Construye la ruta de storage para un documento
 */
export function construirRutaStorage(
  clienteId: string,
  tipoDocumentoId: string,
  version: number,
  nombreArchivo: string
): string {
  return `${clienteId}/${tipoDocumentoId}/${version}/${nombreArchivo}`
}

/**
 * Valida el formato de un correo electrónico
 */
export function validarCorreo(correo: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(correo)
}

/**
 * Valida el formato de un teléfono (básico)
 */
export function validarTelefono(telefono: string): boolean {
  // Permite números, espacios, guiones, paréntesis y el símbolo +
  const regex = /^[\d\s\-()+ ]{8,20}$/
  return regex.test(telefono)
}

/**
 * Trunca un texto a una longitud específica
 */
export function truncarTexto(texto: string, longitud: number): string {
  if (texto.length <= longitud) return texto
  return texto.substring(0, longitud) + '...'
}

/**
 * Capitaliza la primera letra de un string
 */
export function capitalizar(texto: string): string {
  if (!texto) return ''
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase()
}

/**
 * Genera un hash simple a partir de un string
 */
export async function generarHash(texto: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(texto)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Espera un tiempo determinado (útil para delays)
 */
export function esperar(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Obtiene las iniciales de un nombre
 */
export function obtenerIniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/)
  if (palabras.length === 1) {
    return palabras[0].substring(0, 2).toUpperCase()
  }
  return (palabras[0][0] + palabras[palabras.length - 1][0]).toUpperCase()
}

/**
 * Parsea parámetros de búsqueda de URL
 */
export function parsearParametrosBusqueda(searchParams: URLSearchParams): Record<string, string> {
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })
  return params
}
