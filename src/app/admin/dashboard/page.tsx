// src/app/admin/dashboard/page.tsx

/**
 * Dashboard admin con estadísticas
 * Ruta: /admin/dashboard
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { crearCliente } from '@/lib/supabase/client'
import { formatearMoneda } from '@/lib/utils'
import { Database } from '@/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Usuario = Database['public']['Tables']['usuarios']['Row']

interface EstadisticasDto {
  totalCitas: number
  citasConfirmadas: number
  citasCanceladas: number
  citasCompletadas: number
  ingresoTotal: number
  ingresoEstasMes: number
  servicioMasPopular: string | null
  empleadoEstrella: string | null
}

export default function PaginaDashboard() {
  const router = useRouter()
  const [propietario, setPropietario] = useState<Usuario | null>(null)
  const [stats, setStats] = useState<EstadisticasDto | null>(null)
  const [estaCargando, setEstaCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    verificarAutenticacion()
  }, [])

  const verificarAutenticacion = async () => {
    try {
      const supabase = crearCliente()

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: perfil, error: errorPerfil } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single()

      if (errorPerfil || !perfil) {
        setError('No se encontró tu perfil')
        setEstaCargando(false)
        return
      }

      if (perfil.rol !== 'admin') {
        setError('Solo los administradores pueden acceder al dashboard')
        setEstaCargando(false)
        return
      }

      setPropietario(perfil)
      await cargarEstadisticas(perfil.negocio_id)
    } catch (err) {
      console.error('Error en verificarAutenticacion:', err)
      setError('Error al verificar autenticación')
      setEstaCargando(false)
    }
  }

  const cargarEstadisticas = async (negocioId: string) => {
    try {
      setEstaCargando(true)
      const supabase = crearCliente()

      // Total de citas
      const { data: totalCitasData } = await supabase
        .from('citas')
        .select('*', { count: 'exact', head: true })
        .eq('negocio_id', negocioId)

      const totalCitas = totalCitasData?.length || 0

      // Citas por estado
      const { data: citasConfirmadas } = await supabase
        .from('citas')
        .select('*', { count: 'exact', head: true })
        .eq('negocio_id', negocioId)
        .eq('estado', 'confirmada')

      const { data: citasCanceladas } = await supabase
        .from('citas')
        .select('*', { count: 'exact', head: true })
        .eq('negocio_id', negocioId)
        .eq('estado', 'cancelada')

      const { data: citasCompletadas } = await supabase
        .from('citas')
        .select('*', { count: 'exact', head: true })
        .eq('negocio_id', negocioId)
        .eq('estado', 'completada')

      // Ingreso total (de citas completadas)
      const { data: citasCompletadasDetalles } = await supabase
        .from('citas')
        .select(`
          *,
          servicio:servicios(precio)
        `)
        .eq('negocio_id', negocioId)
        .eq('estado', 'completada')

      const ingresoTotal = (citasCompletadasDetalles || []).reduce(
        (suma, cita) => suma + (cita.servicio?.precio || 0),
        0
      )

      // Ingreso este mes
      const ahora = new Date()
      const primerDiaMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()

      const { data: citasEstasMes } = await supabase
        .from('citas')
        .select(`
          *,
          servicio:servicios(precio)
        `)
        .eq('negocio_id', negocioId)
        .eq('estado', 'completada')
        .gte('hora_inicio', primerDiaMes)

      const ingresoEstasMes = (citasEstasMes || []).reduce(
        (suma, cita) => suma + (cita.servicio?.precio || 0),
        0
      )

            // Servicio más popular
      const { data: serviciosPopulares } = await supabase
        .from('citas')
        .select(`
          servicio_id,
          servicio:servicios(nombre)
        `)
        .eq('negocio_id', negocioId)
        .eq('estado', 'completada')

      const conteoServicios: { [key: string]: { nombre: string; count: number } } = {}
      ;(serviciosPopulares || []).forEach((cita: any) => {
        const nombre = cita.servicio?.[0]?.nombre || 'Desconocido'
        if (!conteoServicios[nombre]) {
          conteoServicios[nombre] = { nombre, count: 0 }
        }
        conteoServicios[nombre].count++
      })

      const servicioMasPopular =
        Object.values(conteoServicios).sort((a, b) => b.count - a.count)[0]?.nombre || null

      // Empleado estrella
      const { data: empleadosEstrellas } = await supabase
        .from('citas')
        .select(`
          empleado_id,
          empleado:usuarios(nombre_completo)
        `)
        .eq('negocio_id', negocioId)
        .eq('estado', 'completada')

      const conteoEmpleados: { [key: string]: { nombre: string; count: number } } = {}
      ;(empleadosEstrellas || []).forEach((cita: any) => {
        const nombre = cita.empleado?.[0]?.nombre_completo || 'Desconocido'
        if (!conteoEmpleados[nombre]) {
          conteoEmpleados[nombre] = { nombre, count: 0 }
        }
        conteoEmpleados[nombre].count++
      })

      const empleadoEstrella =
        Object.values(conteoEmpleados).sort((a, b) => b.count - a.count)[0]?.nombre || null

      setStats({
        totalCitas,
        citasConfirmadas: citasConfirmadas?.length || 0,
        citasCanceladas: citasCanceladas?.length || 0,
        citasCompletadas: citasCompletadas?.length || 0,
        ingresoTotal,
        ingresoEstasMes,
        servicioMasPopular,
        empleadoEstrella,
      })

      setEstaCargando(false)
    } catch (err) {
      console.error('Error al cargar estadísticas:', err)
      setError('Error al cargar las estadísticas')
      setEstaCargando(false)
    }
  }

  if (estaCargando) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Cargando dashboard...</p>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">No se pudieron cargar las estadísticas</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Resumen de tu negocio
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Grid de estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de citas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total de Citas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {stats.totalCitas}
            </div>
            <div className="flex gap-2 mt-2 text-xs text-gray-600">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                ✓ {stats.citasConfirmadas}
              </span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                ✓ {stats.citasCompletadas}
              </span>
              <span className="px-2 py-1 bg-red-100 text-red-700 rounded">
                ✗ {stats.citasCanceladas}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Ingreso total */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Ingreso Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {formatearMoneda(stats.ingresoTotal)}
            </div>
            <p className="text-xs text-gray-600 mt-2">
              De citas completadas
            </p>
          </CardContent>
        </Card>

        {/* Ingreso este mes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Ingreso Este Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {formatearMoneda(stats.ingresoEstasMes)}
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {new Date().toLocaleDateString('es-ES', { month: 'long' })}
            </p>
          </CardContent>
        </Card>

        {/* Tasa de completación */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Tasa de Completación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">
              {stats.totalCitas > 0
                ? Math.round((stats.citasCompletadas / stats.totalCitas) * 100)
                : 0}
              %
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Citas completadas vs total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grid de información adicional */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Servicio más popular */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Servicio Más Popular</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.servicioMasPopular ? (
              <p className="text-lg font-semibold text-gray-900">
                {stats.servicioMasPopular}
              </p>
            ) : (
              <p className="text-gray-600">Sin datos disponibles</p>
            )}
          </CardContent>
        </Card>

        {/* Empleado estrella */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Empleado Estrella</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.empleadoEstrella ? (
              <p className="text-lg font-semibold text-gray-900">
                {stats.empleadoEstrella}
              </p>
            ) : (
              <p className="text-gray-600">Sin datos disponibles</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Estado general */}
      <Card>
        <CardHeader>
          <CardTitle>Estado General</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Barra de citas confirmadas */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Citas Confirmadas
                </span>
                <span className="text-sm text-gray-600">
                  {stats.citasConfirmadas}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{
                    width: `${
                      stats.totalCitas > 0
                        ? (stats.citasConfirmadas / stats.totalCitas) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Barra de citas completadas */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Citas Completadas
                </span>
                <span className="text-sm text-gray-600">
                  {stats.citasCompletadas}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{
                    width: `${
                      stats.totalCitas > 0
                        ? (stats.citasCompletadas / stats.totalCitas) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Barra de citas canceladas */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Citas Canceladas
                </span>
                <span className="text-sm text-gray-600">
                  {stats.citasCanceladas}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-red-500 h-2 rounded-full"
                  style={{
                    width: `${
                      stats.totalCitas > 0
                        ? (stats.citasCanceladas / stats.totalCitas) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
