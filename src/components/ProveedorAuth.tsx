/**
 * Componente proveedor de autenticación
 * 
 * Inicializa el estado de autenticación cuando la app carga.
 * Debe envolver toda la aplicación en el layout principal.
 * 
 * Uso en layout.tsx:
 * <ProveedorAuth>
 *   {children}
 * </ProveedorAuth>
 */

'use client'

import { useInicializarAuth } from '../hooks/useInicializarAuth'
import { useAuthStore } from '../store/useAuthStore'

export function ProveedorAuth({ children }: { children: React.ReactNode }) {
  // Inicializar autenticación
  useInicializarAuth()
  
  const { estaCargando } = useAuthStore()

  // Mostrar pantalla de carga mientras verifica la sesión
  if (estaCargando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  // Una vez cargado, mostrar el contenido
  return <>{children}</>
}
