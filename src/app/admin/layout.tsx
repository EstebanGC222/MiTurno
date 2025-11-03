/**
 * Layout para el área de administración
 * Proporciona navegación común a todas las páginas admin
 */

'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { crearCliente } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function LayoutAdmin({
  children,
}: {
  children: React.ReactNode
}) {
  const { perfil, cerrarSesion } = useAuthStore()
  const router = useRouter()

  const manejarCerrarSesion = async () => {
    const supabase = crearCliente()
    await supabase.auth.signOut()
    cerrarSesion()
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex space-x-8">
            <Link href="/admin/dashboard" className="font-semibold text-gray-900">
              MiTurno
            </Link>
            <Link href="/admin/servicios" className="text-gray-600 hover:text-gray-900">
              Servicios
            </Link>
            <Link href="/admin/empleados" className="text-gray-600 hover:text-gray-900">
              Empleados
            </Link>
            <Link href="/admin/horarios" className="text-gray-600 hover:text-gray-900">
              Horarios
            </Link>
            <Link href="/admin/citas" className="text-gray-600 hover:text-gray-900">
              Citas
            </Link>
            <Link href="/admin/perfil" className="text-gray-600 hover:text-gray-900">
              Mi Perfil
            </Link>
            
            
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{perfil?.nombre_completo}</span>
            <Button onClick={manejarCerrarSesion} variant="outline" size="sm">
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </nav>

      {/* Contenido */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
