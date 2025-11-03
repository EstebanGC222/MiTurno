'use client'

import { useAuthStore } from '../../../store/useAuthStore'
import { useRouter } from 'next/navigation'
import { crearCliente } from '../../../lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function DashboardEmpleado() {
  const { perfil, cerrarSesion } = useAuthStore()
  const router = useRouter()

  const manejarCerrarSesion = async () => {
    const supabase = crearCliente()
    await supabase.auth.signOut()
    cerrarSesion()
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Mi Agenda</h1>
            <Button onClick={manejarCerrarSesion} variant="outline">
              Cerrar Sesión
            </Button>
          </div>

          <div className="space-y-4">
            <p className="text-gray-600">
              ¡Hola, <span className="font-semibold">{perfil?.nombre_completo}</span>!
            </p>
            
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <p className="text-green-800">
                ✅ Vista de empleado funcionando
              </p>
              <p className="text-sm text-green-600 mt-2">
                Rol: {perfil?.rol}
              </p>
            </div>

            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-2">Tu calendario:</h2>
              <p className="text-gray-500">Próximamente verás tus citas aquí</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
