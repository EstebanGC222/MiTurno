'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/useAuthStore'
import { crearCliente } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Database } from '@/types/database'
import { formatearMoneda } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Usuario = Database['public']['Tables']['usuarios']['Row']

function getSemanaActual() {
  const hoy = new Date()
  const diaActual = hoy.getDay() || 7 // Sunday=0 -> 7
  const lunes = new Date(hoy)
  lunes.setDate(hoy.getDate() - diaActual + 1)
  const domingo = new Date(lunes)
  domingo.setDate(lunes.getDate() + 6)
  return {
    inicio: lunes.toISOString().split('T')[0],
    fin: domingo.toISOString().split('T')[0]
  }
}

export default function AgendaEmpleado() {
  const router = useRouter()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [citas, setCitas] = useState<any[]>([])
  const [estaCargando, setEstaCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  //cerrar sesión
  const { perfil, cerrarSesion } = useAuthStore()

  const manejarCerrarSesion = async () => {
    const supabase = crearCliente()
    await supabase.auth.signOut()
    cerrarSesion()
    router.push('/auth/login')
  }

  // Filtros de rango
  const semana = getSemanaActual()
  const [filtroInicio, setFiltroInicio] = useState(semana.inicio)
  const [filtroFin, setFiltroFin] = useState(semana.fin)

  useEffect(() => {
    verificarAuth()
  }, [])

  const verificarAuth = async () => {
    try {
      const supabase = crearCliente()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      // Cargar perfil
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

      if (perfil.rol !== 'empleado') {
        setError('Solo empleados pueden acceder a esta página')
        setEstaCargando(false)
        return
      }

      setUsuario(perfil)
      await cargarCitas(perfil.id)
    } catch (err) {
      setError('Error de autenticación')
      setEstaCargando(false)
    }
  }

  const cargarCitas = async (empleadoId: string) => {
    try {
      setEstaCargando(true)
      const supabase = crearCliente()
      const { data, error } = await supabase
        .from('citas')
        .select(`
          *,
          cliente:clientes(nombre_completo, email, telefono),
          servicio:servicios(nombre, precio)
        `)
        .eq('empleado_id', empleadoId)
        .order('hora_inicio', { ascending: true })

      if (error) throw error
      setCitas(data || [])
      setEstaCargando(false)
    } catch (err) {
      setError('Error al cargar citas')
      setEstaCargando(false)
    }
  }

  // Filtrar por rango de fechas
  const citasFiltradas = citas.filter(c =>
    c.hora_inicio.slice(0, 10) >= filtroInicio &&
    c.hora_inicio.slice(0, 10) <= filtroFin
  )

  // Agrupa citas por fecha dentro del rango
  const citasAgrupadas = citasFiltradas.reduce((acc: any, cita: any) => {
    const fecha = cita.hora_inicio.slice(0, 10)
    if (!acc[fecha]) acc[fecha] = []
    acc[fecha].push(cita)
    return acc
  }, {})

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Mi Agenda</h1>
      <p className="text-gray-600 mb-4">
        Consulta tus citas próximamente reservadas.
      </p>

      {/* Filtros de fechas */}
      <div className="flex gap-3 items-center mb-6">
        <label className="text-sm font-medium text-gray-700">De:</label>
        <input
          type="date"
          value={filtroInicio}
          onChange={e => setFiltroInicio(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        />
        <label className="text-sm font-medium text-gray-700">a:</label>
        <input
          type="date"
          value={filtroFin}
          onChange={e => setFiltroFin(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        />
        <button
          className="ml-4 px-3 py-1 bg-blue-600 text-white rounded text-sm font-semibold"
          type="button"
          onClick={() => {
            setFiltroInicio(semana.inicio)
            setFiltroFin(semana.fin)
          }}
        >
          Esta semana
        </button>
        <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{perfil?.nombre_completo}</span>
            <Button onClick={manejarCerrarSesion} variant="outline" size="sm">
              Cerrar Sesión
            </Button>
          </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      {estaCargando ? (
        <p className="text-center text-gray-500 py-6">Cargando citas...</p>
      ) : (
        <>
          <h2 className="font-semibold text-lg mb-1">
            Citas entre {filtroInicio} y {filtroFin}
          </h2>
          {Object.keys(citasAgrupadas).length === 0 ? (
            <p className="text-gray-500">No tienes citas en este periodo</p>
          ) : (
            Object.entries(citasAgrupadas).map(([fecha, citasDia]: any) => (
              <div key={fecha}>
                <h3 className="text-base text-blue-700 font-bold mt-6 mb-2">
                  {new Date(fecha).toLocaleDateString('es-ES')}
                </h3>
                {citasDia.map((cita: any) => (
                  <Card key={cita.id} className="mb-3">
                    <CardHeader>
                      <CardTitle>
                        {cita.servicio?.nombre} —{' '}
                        <span className="font-normal text-sm text-gray-700">
                          {cita.hora_inicio.slice(11, 16)} a {cita.hora_fin.slice(11, 16)}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-gray-700">
                        Cliente: <b>{cita.cliente?.nombre_completo}</b> <br />
                        Teléfono: {cita.cliente?.telefono} <br />
                        Email: {cita.cliente?.email} <br />
                        Precio: {formatearMoneda(cita.servicio?.precio || 0)}
                      </div>
                      <div className="mt-2">
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-medium border capitalize
                          bg-gray-100 text-gray-800 border-gray-300">
                          {cita.estado}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ))
          )}
        </>
      )}
    </div>
  )
}
