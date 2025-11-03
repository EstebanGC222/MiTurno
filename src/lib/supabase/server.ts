/**
 * Cliente de Supabase para uso en el servidor (Componentes de Servidor, Rutas API)
 * 
 * Este cliente se usa en:
 * - Componentes de Servidor (componentes sin 'use client')
 * - Rutas API (archivos route.ts)
 * - Acciones del Servidor (funciones con 'use server')
 * 
 * Maneja las cookies automáticamente para mantener la sesión del usuario.
 * 
 * Uso:
 * import { crearCliente } from '@/lib/supabase/servidor'
 * 
 * const supabase = await crearCliente()
 * const { data } = await supabase.from('servicios').select('*')
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function crearCliente() {
  const almacenCookies = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return almacenCookies.getAll()
        },
        setAll(cookiesPorConfigurar) {
          try {
            cookiesPorConfigurar.forEach(({ name, value, options }) =>
              almacenCookies.set(name, value, options)
            )
          } catch {
            // El método `setAll` fue llamado desde un Componente de Servidor.
            // Esto puede ignorarse si tienes middleware actualizando cookies.
          }
        },
      },
    }
  )
}