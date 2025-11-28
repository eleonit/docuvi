/**
 * Supabase Middleware Client - Para uso en middleware de Next.js
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refrescar sesión si existe con timeout para evitar bloqueos
  let user = null
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth timeout')), 3000)
      ),
    ]) as any
    user = result?.data?.user
  } catch (error) {
    console.error('Middleware auth timeout o error:', error)
    // Continuar sin usuario en caso de error
  }

  // Proteger rutas de autenticación si el usuario ya está logueado
  if (
    user &&
    (request.nextUrl.pathname.startsWith('/iniciar-sesion') ||
      request.nextUrl.pathname.startsWith('/recuperar-clave') ||
      request.nextUrl.pathname.startsWith('/restablecer-contrasena'))
  ) {
    // Obtener rol del usuario
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (usuario) {
      const url = request.nextUrl.clone()
      url.pathname = usuario.rol === 'revisor' ? '/revisor' : '/cliente'
      return NextResponse.redirect(url)
    }
  }

  // Proteger rutas del revisor
  if (request.nextUrl.pathname.startsWith('/revisor')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/iniciar-sesion'
      url.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (usuario?.rol !== 'revisor') {
      const url = request.nextUrl.clone()
      url.pathname = '/cliente'
      return NextResponse.redirect(url)
    }
  }

  // Proteger rutas del cliente
  if (request.nextUrl.pathname.startsWith('/cliente')) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/iniciar-sesion'
      url.searchParams.set('redirect', request.nextUrl.pathname)
      return NextResponse.redirect(url)
    }

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', user.id)
      .single()

    if (usuario?.rol !== 'cliente') {
      const url = request.nextUrl.clone()
      url.pathname = '/revisor'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
