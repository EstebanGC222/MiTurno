// src/app/api/empleados/crear/route.ts

/**
 * API Route para crear empleados
 * Usa la Service Role Key para acceso admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { nombre, email, contrasena, telefono, negocio_id } = body

    // Validar campos requeridos
    if (!nombre || !email || !contrasena || !negocio_id) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      )
    }

    // Crear cliente Supabase con Service Role Key (para usar admin API)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Variables de entorno no configuradas' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Crear usuario en Auth
    const { data: dataAuth, error: errorAuth } = await supabase.auth.admin.createUser({
      email,
      password: contrasena,
      email_confirm: true,
    })

    if (errorAuth) {
      console.error('Error al crear usuario en Auth:', errorAuth)
      return NextResponse.json(
        { error: `Error al crear usuario: ${errorAuth.message}` },
        { status: 400 }
      )
    }

    if (!dataAuth.user) {
      return NextResponse.json(
        { error: 'No se pudo crear el usuario' },
        { status: 500 }
      )
    }

    // Crear perfil en tabla usuarios
    const { data: dataPerfil, error: errorPerfil } = await supabase
      .from('usuarios')
      .insert({
        id: dataAuth.user.id,
        negocio_id,
        rol: 'empleado',
        nombre_completo: nombre,
        email,
        telefono: telefono || null,
      })
      .select()
      .single()

    if (errorPerfil) {
      console.error('Error al crear perfil:', errorPerfil)
      // Si falla crear el perfil, eliminar el usuario de Auth
      await supabase.auth.admin.deleteUser(dataAuth.user.id)
      return NextResponse.json(
        { error: `Error al crear perfil: ${errorPerfil.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { 
        success: true,
        empleado: dataPerfil 
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error en API:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
