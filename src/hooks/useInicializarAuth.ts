'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { crearCliente } from '@/lib/supabase/client'

export function useInicializarAuth() {
  const { 
    establecerUsuario, 
    establecerPerfil, 
    establecerCargando,
    cerrarSesion
  } = useAuthStore()

  useEffect(() => {
    let isMounted = true
    const supabase = crearCliente()

    // Función para cargar el perfil del usuario
    const cargarPerfil = async (usuarioId: string) => {
      try {
        const { data: perfil, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('id', usuarioId)
          .single()

        if (error) {
          console.error('Error al cargar perfil:', error)
          return null
        }

        return perfil
      } catch (err) {
        console.error('Error en cargarPerfil:', err)
        return null
      }
    }

    // Verificar sesión actual
    const verificarSesion = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!isMounted) return

        if (user) {
          // Usuario logueado - cargar perfil
          establecerUsuario(user)
          const perfil = await cargarPerfil(user.id)
          if (isMounted) {
            establecerPerfil(perfil)
          }
        } else {
          // No hay usuario logueado
          cerrarSesion()
        }
      } catch (error) {
        console.error('Error al verificar sesión:', error)
        if (isMounted) {
          cerrarSesion()
        }
      } finally {
        if (isMounted) {
          establecerCargando(false)
        }
      }
    }

    // Ejecutar al montar el componente
    verificarSesion()

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (evento, sesion) => {
        if (!isMounted) return

        if (evento === 'SIGNED_IN' && sesion?.user) {
          // Usuario inició sesión
          establecerUsuario(sesion.user)
          const perfil = await cargarPerfil(sesion.user.id)
          if (isMounted) {
            establecerPerfil(perfil)
            establecerCargando(false)
          }
        } else if (evento === 'SIGNED_OUT') {
          // Usuario cerró sesión
          cerrarSesion()
        }
      }
    )

    // Cleanup: desuscribirse cuando el componente se desmonte
    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [establecerUsuario, establecerPerfil, establecerCargando, cerrarSesion])
}
