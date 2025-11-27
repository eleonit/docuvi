/**
 * API Route: Crear Cliente con Usuario
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { crearUsuarioConRol } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar autenticación
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar que el usuario es revisor
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (usuario?.rol !== 'revisor') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const {
      nombre_empresa,
      cuit_cuil,
      domicilio,
      nombre_representante,
      correo_contacto,
      telefono_contacto,
      celular_contacto,
      tipo_persona,
      crear_usuario,
      password
    } = body

    // Validaciones
    if (!nombre_empresa || !correo_contacto) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    let usuarioClienteId = null

    // Crear usuario si se solicita
    if (crear_usuario) {
      if (!password) {
        return NextResponse.json(
          { error: 'Se requiere contraseña para crear usuario' },
          { status: 400 }
        )
      }

      const { data: authUser, error: authError } = await crearUsuarioConRol(
        correo_contacto,
        password,
        nombre_empresa,
        'cliente'
      )

      if (authError) {
        return NextResponse.json(
          { error: `Error al crear usuario: ${authError.message}` },
          { status: 400 }
        )
      }

      usuarioClienteId = authUser.id
    }

    // Crear cliente en la base de datos
    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .insert({
        nombre_empresa,
        cuit_cuil: cuit_cuil || null,
        domicilio: domicilio || null,
        nombre_representante: nombre_representante || null,
        correo_contacto,
        telefono_contacto: telefono_contacto || null,
        celular_contacto: celular_contacto || null,
        tipo_persona: tipo_persona || null,
        usuario_id: usuarioClienteId,
        creado_por: user.id,
      })
      .select()
      .single()

    if (clienteError) {
      return NextResponse.json(
        { error: `Error al crear cliente: ${clienteError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({ data: cliente }, { status: 201 })
  } catch (error: any) {
    console.error('Error en API /api/clientes:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
