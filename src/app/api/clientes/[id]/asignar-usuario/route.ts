/**
 * API Route: Asignar o Crear Usuario para Cliente
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { crearUsuarioConRol } from '@/lib/supabase/admin'

interface Params {
  params: Promise<{
    id: string
  }>
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
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

    // Obtener cliente
    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', id)
      .single()

    if (clienteError || !cliente) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    const body = await request.json()
    const { correo, password, nombre } = body

    // Validaciones
    if (!correo || !password) {
      return NextResponse.json(
        { error: 'Se requiere correo y contraseña' },
        { status: 400 }
      )
    }

    // Crear usuario en Supabase Auth
    const { data: authUser, error: authError } = await crearUsuarioConRol(
      correo,
      password,
      nombre || cliente.nombre_empresa,
      'cliente'
    )

    if (authError) {
      return NextResponse.json(
        { error: `Error al crear usuario: ${authError.message}` },
        { status: 400 }
      )
    }

    // Asignar usuario al cliente
    const { data: clienteActualizado, error: updateError } = await supabase
      .from('clientes')
      .update({ usuario_id: authUser.id })
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { error: `Error al asignar usuario: ${updateError.message}` },
        { status: 400 }
      )
    }

    return NextResponse.json({ data: clienteActualizado }, { status: 200 })
  } catch (error: any) {
    console.error('Error en API /api/clientes/[id]/asignar-usuario:', error)
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
