/**
 * Database Types - Generated from Supabase Schema
 * Este archivo define los tipos de la base de datos
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Rol = 'revisor' | 'cliente'
export type EstadoDocumento = 'pendiente' | 'aprobado' | 'rechazado'
export type EstadoCertificado = 'activo' | 'revocado' | 'vencido'

export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string
          correo: string
          nombre: string
          rol: Rol
          creado_en: string
          actualizado_en: string
        }
        Insert: {
          id: string
          correo: string
          nombre: string
          rol: Rol
          creado_en?: string
          actualizado_en?: string
        }
        Update: {
          id?: string
          correo?: string
          nombre?: string
          rol?: Rol
          creado_en?: string
          actualizado_en?: string
        }
      }
      clientes: {
        Row: {
          id: string
          nombre_empresa: string
          correo_contacto: string
          telefono_contacto: string | null
          usuario_id: string | null
          creado_por: string
          creado_en: string
          actualizado_en: string
        }
        Insert: {
          id?: string
          nombre_empresa: string
          correo_contacto: string
          telefono_contacto?: string | null
          usuario_id?: string | null
          creado_por: string
          creado_en?: string
          actualizado_en?: string
        }
        Update: {
          id?: string
          nombre_empresa?: string
          correo_contacto?: string
          telefono_contacto?: string | null
          usuario_id?: string | null
          creado_por?: string
          creado_en?: string
          actualizado_en?: string
        }
      }
      tipos_documento: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          activo: boolean
          creado_por: string
          creado_en: string
          actualizado_en: string
        }
        Insert: {
          id?: string
          nombre: string
          descripcion?: string | null
          activo?: boolean
          creado_por: string
          creado_en?: string
          actualizado_en?: string
        }
        Update: {
          id?: string
          nombre?: string
          descripcion?: string | null
          activo?: boolean
          creado_por?: string
          creado_en?: string
          actualizado_en?: string
        }
      }
      requerimientos_cliente: {
        Row: {
          id: string
          cliente_id: string
          tipo_documento_id: string
          obligatorio: boolean
          periodicidad_meses: number | null
          metadatos: Json
          creado_en: string
          actualizado_en: string
        }
        Insert: {
          id?: string
          cliente_id: string
          tipo_documento_id: string
          obligatorio?: boolean
          periodicidad_meses?: number | null
          metadatos?: Json
          creado_en?: string
          actualizado_en?: string
        }
        Update: {
          id?: string
          cliente_id?: string
          tipo_documento_id?: string
          obligatorio?: boolean
          periodicidad_meses?: number | null
          metadatos?: Json
          creado_en?: string
          actualizado_en?: string
        }
      }
      documentos: {
        Row: {
          id: string
          requerimiento_cliente_id: string
          url: string
          nombre_archivo: string
          version: number
          estado: EstadoDocumento
          motivo_rechazo: string | null
          fecha_carga: string
          fecha_vencimiento: string | null
          aprobado_por: string | null
          fecha_aprobacion: string | null
          eliminado: boolean
          eliminado_por: string | null
          eliminado_en: string | null
          creado_en: string
          actualizado_en: string
        }
        Insert: {
          id?: string
          requerimiento_cliente_id: string
          url: string
          nombre_archivo: string
          version?: number
          estado?: EstadoDocumento
          motivo_rechazo?: string | null
          fecha_carga?: string
          fecha_vencimiento?: string | null
          aprobado_por?: string | null
          fecha_aprobacion?: string | null
          eliminado?: boolean
          eliminado_por?: string | null
          eliminado_en?: string | null
          creado_en?: string
          actualizado_en?: string
        }
        Update: {
          id?: string
          requerimiento_cliente_id?: string
          url?: string
          nombre_archivo?: string
          version?: number
          estado?: EstadoDocumento
          motivo_rechazo?: string | null
          fecha_carga?: string
          fecha_vencimiento?: string | null
          aprobado_por?: string | null
          fecha_aprobacion?: string | null
          eliminado?: boolean
          eliminado_por?: string | null
          eliminado_en?: string | null
          creado_en?: string
          actualizado_en?: string
        }
      }
      certificados: {
        Row: {
          id: string
          codigo: string
          hash: string
          cliente_id: string
          emitido_por: string
          fecha_emision: string
          fecha_validez_desde: string
          fecha_validez_hasta: string
          estado: EstadoCertificado
          motivo_revocacion: string | null
          revocado_por: string | null
          revocado_en: string | null
          datos: Json
          creado_en: string
          actualizado_en: string
        }
        Insert: {
          id?: string
          codigo: string
          hash: string
          cliente_id: string
          emitido_por: string
          fecha_emision?: string
          fecha_validez_desde: string
          fecha_validez_hasta: string
          estado?: EstadoCertificado
          motivo_revocacion?: string | null
          revocado_por?: string | null
          revocado_en?: string | null
          datos?: Json
          creado_en?: string
          actualizado_en?: string
        }
        Update: {
          id?: string
          codigo?: string
          hash?: string
          cliente_id?: string
          emitido_por?: string
          fecha_emision?: string
          fecha_validez_desde?: string
          fecha_validez_hasta?: string
          estado?: EstadoCertificado
          motivo_revocacion?: string | null
          revocado_por?: string | null
          revocado_en?: string | null
          datos?: Json
          creado_en?: string
          actualizado_en?: string
        }
      }
      certificados_detalle: {
        Row: {
          id: string
          certificado_id: string
          requerimiento_id: string
          documento_id: string
          tipo_documento_nombre: string
          fecha_aprobacion: string
          fecha_vencimiento: string | null
          aprobado_por: string
          datos: Json
          creado_en: string
        }
        Insert: {
          id?: string
          certificado_id: string
          requerimiento_id: string
          documento_id: string
          tipo_documento_nombre: string
          fecha_aprobacion: string
          fecha_vencimiento?: string | null
          aprobado_por: string
          datos?: Json
          creado_en?: string
        }
        Update: {
          id?: string
          certificado_id?: string
          requerimiento_id?: string
          documento_id?: string
          tipo_documento_nombre?: string
          fecha_aprobacion?: string
          fecha_vencimiento?: string | null
          aprobado_por?: string
          datos?: Json
          creado_en?: string
        }
      }
      notificaciones: {
        Row: {
          id: string
          usuario_id: string
          tipo: string
          titulo: string
          mensaje: string
          leida: boolean
          datos: Json
          documento_id: string | null
          requerimiento_id: string | null
          creado_en: string
          leida_en: string | null
        }
        Insert: {
          id?: string
          usuario_id: string
          tipo: string
          titulo: string
          mensaje: string
          leida?: boolean
          datos?: Json
          documento_id?: string | null
          requerimiento_id?: string | null
          creado_en?: string
          leida_en?: string | null
        }
        Update: {
          id?: string
          usuario_id?: string
          tipo?: string
          titulo?: string
          mensaje?: string
          leida?: boolean
          datos?: Json
          documento_id?: string | null
          requerimiento_id?: string | null
          creado_en?: string
          leida_en?: string | null
        }
      }
      auditoria: {
        Row: {
          id: string
          actor_id: string | null
          accion: string
          entidad: string
          entidad_id: string | null
          datos: Json
          creado_en: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          accion: string
          entidad: string
          entidad_id?: string | null
          datos?: Json
          creado_en?: string
        }
        Update: {
          id?: string
          actor_id?: string | null
          accion?: string
          entidad?: string
          entidad_id?: string | null
          datos?: Json
          creado_en?: string
        }
      }
    }
    Views: {
      vista_cumplimiento_clientes: {
        Row: {
          cliente_id: string
          nombre_empresa: string
          total_requerimientos: number
          requerimientos_cumplidos: number
          requerimientos_pendientes: number
          requerimientos_rechazados: number
          requerimientos_obligatorios: number
        }
      }
    }
    Functions: {
      obtener_rol_usuario: {
        Args: Record<string, never>
        Returns: Rol
      }
      es_revisor: {
        Args: Record<string, never>
        Returns: boolean
      }
      obtener_cliente_id_usuario: {
        Args: Record<string, never>
        Returns: string
      }
      marcar_documento_eliminado: {
        Args: {
          documento_id: string
          usuario_id: string
        }
        Returns: void
      }
      restaurar_documento: {
        Args: {
          documento_id: string
        }
        Returns: void
      }
      obtener_siguiente_version: {
        Args: {
          req_cliente_id: string
        }
        Returns: number
      }
      verificar_cumplimiento_cliente: {
        Args: {
          cliente_id_param: string
        }
        Returns: {
          cumple: boolean
          total_requerimientos: number
          requerimientos_cumplidos: number
          requerimientos_pendientes: number
        }[]
      }
      generar_codigo_certificado: {
        Args: Record<string, never>
        Returns: string
      }
      crear_notificacion: {
        Args: {
          p_usuario_id: string
          p_tipo: string
          p_titulo: string
          p_mensaje: string
          p_datos?: Json
          p_documento_id?: string
          p_requerimiento_id?: string
        }
        Returns: string
      }
      registrar_auditoria: {
        Args: {
          p_actor_id: string
          p_accion: string
          p_entidad: string
          p_entidad_id: string
          p_datos?: Json
        }
        Returns: string
      }
      actualizar_certificados_vencidos: {
        Args: Record<string, never>
        Returns: number
      }
      obtener_documentos_proximos_vencer: {
        Args: {
          dias_limite?: number
        }
        Returns: {
          documento_id: string
          cliente_id: string
          cliente_nombre: string
          tipo_documento: string
          fecha_vencimiento: string
          dias_restantes: number
        }[]
      }
    }
  }
}
