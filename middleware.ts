/**
 * Middleware de Next.js que se ejecuta ANTES de cada petición
 * 
 * Funciones:
 * 1. Actualiza la sesión de Supabase en cada petición
 * 2. Protege rutas privadas (admin, employee)
 * 3. Redirige usuarios no autenticados al login
 * 4. Redirige usuarios autenticados fuera del login
 * 
 * Este archivo DEBE estar en la raíz del proyecto, NO en src/
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(peticion: NextRequest) {
  let respuestaSupabase = NextResponse.next({
    request: peticion,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return peticion.cookies.getAll()
        },
        setAll(cookiesPorConfigurar) {
          cookiesPorConfigurar.forEach(({ name, value, options }) => 
            peticion.cookies.set(name, value)
          )
          respuestaSupabase = NextResponse.next({
            request: peticion,
          })
          cookiesPorConfigurar.forEach(({ name, value, options }) =>
            respuestaSupabase.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: NO mover esto fuera del middleware
  // Refrescar la sesión si está expirada
  const {
    data: { user: usuario },
  } = await supabase.auth.getUser()

  // Definir rutas protegidas
  const esRutaAdmin = peticion.nextUrl.pathname.startsWith('/admin')
  const esRutaEmpleado = peticion.nextUrl.pathname.startsWith('/employee')
  const esRutaAuth = peticion.nextUrl.pathname.startsWith('/auth')

  // Si intenta acceder a rutas protegidas sin estar autenticado
  if ((esRutaAdmin || esRutaEmpleado) && !usuario) {
    const url = peticion.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // Si está autenticado e intenta acceder al login, redirigir al dashboard
  if (esRutaAuth && usuario) {
    // Obtener el rol del usuario desde la base de datos
    const { data: perfil } = await supabase
      .from('users')
      .select('role')
      .eq('id', usuario.id)
      .single()

    const url = peticion.nextUrl.clone()
    
    // Redirigir según el rol
    if (perfil?.role === 'admin') {
      url.pathname = '/admin/dashboard'
    } else if (perfil?.role === 'employee') {
      url.pathname = '/employee/dashboard'
    } else {
      // Si no tiene perfil, redirigir al registro
      url.pathname = '/auth/register'
    }
    
    return NextResponse.redirect(url)
  }

  return respuestaSupabase
}

export const config = {
  matcher: [
    /*
     * Coincide con todas las rutas excepto:
     * - _next/static (archivos estáticos)
     * - _next/image (optimización de imágenes)
     * - favicon.ico (favicon)
     * - Archivos en /public (*.svg, *.png, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
