/**
 * Store global de autenticación usando Zustand
 * 
 * Guarda el estado del usuario actual y su perfil.
 * Accesible desde cualquier componente de la aplicación.
 * 
 * Uso:
 * import { useAuthStore } from '@/store/useAuthStore'
 * 
 * const { usuario, perfil, establecerUsuario } = useAuthStore()
 */

import { create } from 'zustand'
import { User } from '@supabase/supabase-js'
import { Database } from '../types/database'

// Tipo del perfil del usuario desde la base de datos
type PerfilUsuario = Database['public']['Tables']['usuarios']['Row']

// Interfaz que define la estructura del store
interface EstadoAuth {
  // Estado
  usuario: User | null                           // Datos del usuario de Supabase Auth
  perfil: PerfilUsuario | null                   // Datos del perfil desde tabla usuarios
  estaCargando: boolean                          // Indica si está cargando datos
  
  // Acciones (funciones para modificar el estado)
  establecerUsuario: (usuario: User | null) => void
  establecerPerfil: (perfil: PerfilUsuario | null) => void
  establecerCargando: (cargando: boolean) => void
  cerrarSesion: () => void
}

/**
 * Hook del store de autenticación
 * Usa Zustand para crear un store global simple
 */
export const useAuthStore = create<EstadoAuth>((set) => ({
  // Estado inicial
  usuario: null,
  perfil: null,
  estaCargando: true,
  
  // Función para establecer el usuario
  establecerUsuario: (usuario) => set({ usuario }),
  
  // Función para establecer el perfil
  establecerPerfil: (perfil) => set({ perfil }),
  
  // Función para establecer el estado de carga
  establecerCargando: (estaCargando) => set({ estaCargando }),
  
  // Función para cerrar sesión (limpia todo el estado)
  cerrarSesion: () => set({ 
    usuario: null, 
    perfil: null, 
    estaCargando: false 
  }),
}))
