/**
 * Cliente de Supabase para uso en el navegador (Componentes de Cliente)
 * 
 * Este cliente se usa en componentes que tienen 'use client' al inicio.
 * Maneja la autenticación y las consultas a la base de datos desde el navegador.
 * 
 * Uso:
 * import { crearCliente } from '@/lib/supabase/cliente'
 * 
 * const supabase = crearCliente()
 * const { data } = await supabase.from('servicios').select('*')
 */

import { createBrowserClient } from '@supabase/ssr'

export function crearCliente() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}