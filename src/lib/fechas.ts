/**
 * Utilidades para manejo de fechas
 */

import { format, parseISO, differenceInDays, addMonths, isAfter, isBefore, isValid } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Formatea una fecha a formato legible en español
 */
export function formatearFecha(fecha: string | Date, formato = 'PP'): string {
  try {
    const date = typeof fecha === 'string' ? parseISO(fecha) : fecha
    if (!isValid(date)) return 'Fecha inválida'
    return format(date, formato, { locale: es })
  } catch {
    return 'Fecha inválida'
  }
}

/**
 * Formatea una fecha y hora
 */
export function formatearFechaHora(fecha: string | Date): string {
  return formatearFecha(fecha, 'PPp')
}

/**
 * Formatea una fecha a formato corto (dd/MM/yyyy)
 */
export function formatearFechaCorta(fecha: string | Date): string {
  return formatearFecha(fecha, 'dd/MM/yyyy')
}

/**
 * Formatea una fecha a formato ISO (yyyy-MM-dd) para inputs
 */
export function formatearFechaISO(fecha: string | Date): string {
  try {
    const date = typeof fecha === 'string' ? parseISO(fecha) : fecha
    if (!isValid(date)) return ''
    return format(date, 'yyyy-MM-dd')
  } catch {
    return ''
  }
}

/**
 * Calcula días restantes hasta una fecha
 */
export function diasRestantes(fechaFutura: string | Date): number {
  try {
    const fecha = typeof fechaFutura === 'string' ? parseISO(fechaFutura) : fechaFutura
    if (!isValid(fecha)) return 0
    return differenceInDays(fecha, new Date())
  } catch {
    return 0
  }
}

/**
 * Verifica si una fecha ya pasó
 */
export function estaVencido(fecha: string | Date): boolean {
  try {
    const fechaObj = typeof fecha === 'string' ? parseISO(fecha) : fecha
    if (!isValid(fechaObj)) return false
    return isBefore(fechaObj, new Date())
  } catch {
    return false
  }
}

/**
 * Verifica si una fecha está próxima a vencer (menos de X días)
 */
export function estaProximoVencer(fecha: string | Date, diasLimite = 30): boolean {
  try {
    const dias = diasRestantes(fecha)
    return dias > 0 && dias <= diasLimite
  } catch {
    return false
  }
}

/**
 * Agrega meses a una fecha
 */
export function agregarMeses(fecha: string | Date, meses: number): Date {
  const fechaObj = typeof fecha === 'string' ? parseISO(fecha) : fecha
  return addMonths(fechaObj, meses)
}

/**
 * Obtiene el estado de vencimiento de un documento
 */
export function obtenerEstadoVencimiento(
  fechaVencimiento: string | null | undefined
): 'vigente' | 'proximo' | 'vencido' | 'sin_fecha' {
  if (!fechaVencimiento) return 'sin_fecha'

  if (estaVencido(fechaVencimiento)) return 'vencido'
  if (estaProximoVencer(fechaVencimiento, 30)) return 'proximo'
  return 'vigente'
}

/**
 * Obtiene el color del badge según estado de vencimiento
 */
export function obtenerColorVencimiento(
  fechaVencimiento: string | null | undefined
): 'success' | 'warning' | 'danger' | 'neutral' {
  const estado = obtenerEstadoVencimiento(fechaVencimiento)

  switch (estado) {
    case 'vigente':
      return 'success'
    case 'proximo':
      return 'warning'
    case 'vencido':
      return 'danger'
    default:
      return 'neutral'
  }
}

/**
 * Formatea un rango de fechas
 */
export function formatearRangoFechas(fechaInicio: string | Date, fechaFin: string | Date): string {
  return `${formatearFechaCorta(fechaInicio)} - ${formatearFechaCorta(fechaFin)}`
}

/**
 * Verifica si una fecha es válida
 */
export function esFechaValida(fecha: string | Date): boolean {
  try {
    const fechaObj = typeof fecha === 'string' ? parseISO(fecha) : fecha
    return isValid(fechaObj)
  } catch {
    return false
  }
}
