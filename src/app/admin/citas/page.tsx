// src/app/admin/citas/page.tsx

/**
 * Página para gestionar citas
 * Ruta: /admin/citas
 */

'use client'

import emailjs from 'emailjs-com'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { crearCliente } from '@/lib/supabase/client'
import { formatearMoneda, formatearFecha } from '@/lib/utils'
import { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Cita = Database['public']['Tables']['citas']['Row']
type Usuario = Database['public']['Tables']['usuarios']['Row']
type Servicio = Database['public']['Tables']['servicios']['Row']

const EMAILJS_SERVICE_ID = 'service_uhg2aud'
const EMAILJS_TEMPLATE_CANCELADA_ID = 'template_quyexo9' 
const EMAILJS_USER_ID = 'ApjZSbMqKfZl4n29x'


export default function PaginaCitas() {
  const router = useRouter()
  const [propietario, setPropietario] = useState<Usuario | null>(null)
  const [citas, setCitas] = useState<any[]>([])
  const [estaCargando, setEstaCargando] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState<string>('todos')
  const [error, setError] = useState<string | null>(null)

  // Cargar datos al montar el componente
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
        setError('Solo los administradores pueden gestionar citas')
        setEstaCargando(false)
        return
      }

      setPropietario(perfil)
      await cargarCitas(perfil.negocio_id)
    } catch (err) {
      console.error('Error en verificarAutenticacion:', err)
      setError('Error al verificar autenticación')
      setEstaCargando(false)
    }
  }

  const cargarCitas = async (negocioId: string) => {
    try {
      setEstaCargando(true)
      const supabase = crearCliente()

      console.log('Cargando citas para negocio:', negocioId)

      // Obtener citas con información relacionada
      const { data, error } = await supabase
        .from('citas')
        .select(`
          *,
          cliente:clientes(nombre_completo, email, telefono),
          empleado:usuarios(nombre_completo),
          servicio:servicios(nombre, precio)
        `)
        .eq('negocio_id', negocioId)
        .order('hora_inicio', { ascending: false })

      console.log('Respuesta de citas:', { data, error })

      if (error) {
        console.error('Error Supabase:', error)
        setError(`Error al cargar: ${error.message}`)
        setEstaCargando(false)
        return
      }

      setCitas(data || [])
    } catch (err) {
      console.error('Error al cargar citas:', err)
      setError(`Error inesperado: ${String(err)}`)
    } finally {
      setEstaCargando(false)
    }
  }

  const cambiarEstadoCita = async (citaId: string, nuevoEstado: string) => {
  try {
    const supabase = crearCliente()
    const { error } = await supabase
      .from('citas')
      .update({ estado: nuevoEstado })
      .eq('id', citaId)

    if (error) throw error

    // Encuentra la cita recién cancelada para enviar el email
    const cita = citas.find(c => c.id === citaId)
    if (nuevoEstado === 'cancelada' && cita) {
      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_CANCELADA_ID,
        {
          to_email: cita.cliente?.email,
          cliente: cita.cliente?.nombre_completo,
          servicio: cita.servicio?.nombre,
          empleado: cita.empleado?.nombre_completo,
          fecha: new Date(cita.hora_inicio).toLocaleDateString('es-ES'),
          hora: new Date(cita.hora_inicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        },
        EMAILJS_USER_ID
      )
    }

    // Actualizar UI
    setCitas(citas.map(c => 
      c.id === citaId ? { ...c, estado: nuevoEstado } : c
    ))
  } catch (err) {
    console.error('Error al cambiar estado:', err)
    setError('Error al cambiar estado de la cita')
  }
}


  const eliminarCita = async (citaId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta cita?')) {
      return
    }

    try {
      const supabase = crearCliente()

      const { error } = await supabase
        .from('citas')
        .delete()
        .eq('id', citaId)

      if (error) throw error

      setCitas(citas.filter(c => c.id !== citaId))
    } catch (err) {
      console.error('Error al eliminar cita:', err)
      setError('Error al eliminar la cita')
    }
  }

  // Nueva función para crear cita de prueba
  const crearCitaPrueba = async () => {
    if (!propietario) return

    try {
      setError(null)
      const supabase = crearCliente()

      // Obtener un empleado
      const { data: empleados } = await supabase
        .from('usuarios')
        .select('id')
        .eq('negocio_id', propietario.negocio_id)
        .eq('rol', 'empleado')
        .limit(1)

      // Obtener un cliente
      const { data: clientes } = await supabase
        .from('clientes')
        .select('id')
        .eq('negocio_id', propietario.negocio_id)
        .limit(1)

      // Obtener un servicio
      const { data: servicios } = await supabase
        .from('servicios')
        .select('id')
        .eq('negocio_id', propietario.negocio_id)
        .limit(1)

      if (!empleados?.length || !clientes?.length || !servicios?.length) {
        setError('Necesitas tener al menos 1 empleado, 1 cliente y 1 servicio')
        return
      }

      const response = await fetch('/api/citas/crear-prueba', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          negocio_id: propietario.negocio_id,
          empleado_id: empleados[0].id,
          cliente_id: clientes[0].id,
          servicio_id: servicios[0].id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Error al crear cita de prueba')
        return
      }

      // Recargar citas
      await cargarCitas(propietario.negocio_id)
    } catch (err) {
      console.error('Error:', err)
      setError('Error al crear cita de prueba')
    }
  }

  // Filtrar citas según estado
  const citasFiltradas = filtroEstado === 'todos' 
    ? citas 
    : citas.filter(c => c.estado === filtroEstado)

  // Agrupar citas por fecha
  const citasAgrupadas = citasFiltradas.reduce((acc: any, cita) => {
    const fecha = new Date(cita.hora_inicio).toLocaleDateString('es-ES')
    if (!acc[fecha]) acc[fecha] = []
    acc[fecha].push(cita)
    return acc
  }, {})

  if (estaCargando) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Cargando citas...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Citas</h1>
        <p className="text-gray-600 mt-2">
          Gestiona todas las citas de tu negocio
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex justify-between items-center mb-3">
          <Label className="text-sm font-medium text-gray-600">
            Filtrar por Estado
          </Label>
          <Button 
            onClick={crearCitaPrueba}
            variant="outline"
            size="sm"
            className="text-blue-600"
          >
            + Crear Cita de Prueba
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap">
          {['todos', 'confirmada', 'cancelada'].map((estado) => (
            <Button
              key={estado}
              onClick={() => setFiltroEstado(estado)}
              variant={filtroEstado === estado ? 'default' : 'outline'}
              size="sm"
              className="capitalize"
            >
              {estado === 'todos' ? 'Todas' : estado}
            </Button>
          ))}
        </div>
      </div>

      {/* Citas por fecha */}
      {Object.keys(citasAgrupadas).length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded p-6 text-center">
          <p className="text-blue-800">No hay citas registradas</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(citasAgrupadas).map(([fecha, citasDia]: any) => (
            <div key={fecha}>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {fecha}
              </h3>
              <div className="space-y-2">
                {citasDia.map((cita: any) => (
                  <TarjetaCita
                    key={cita.id}
                    cita={cita}
                    onCambiarEstado={cambiarEstadoCita}
                    onEliminar={eliminarCita}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Componente para mostrar una tarjeta de cita
 */
function TarjetaCita({
  cita,
  onCambiarEstado,
  onEliminar,
}: {
  cita: any
  onCambiarEstado: (id: string, estado: string) => void
  onEliminar: (id: string) => void
}) {
  const horaInicio = new Date(cita.hora_inicio).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const horaFin = new Date(cita.hora_fin).toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const colorEstado: any = {
    confirmada: 'bg-blue-100 text-blue-800 border-blue-300',
    cancelada: 'bg-red-100 text-red-800 border-red-300',
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <p className="font-semibold text-gray-900">
            {cita.cliente?.nombre_completo || 'Cliente desconocido'}
          </p>
          <p className="text-sm text-gray-600">
            {cita.servicio?.nombre || 'Servicio'} • {horaInicio} - {horaFin}
          </p>
          <p className="text-sm text-gray-600">
            Empleado: {cita.empleado?.nombre_completo || 'No asignado'}
          </p>
        </div>

        <div className="text-right">
          <p className="font-semibold text-gray-900">
            {formatearMoneda(cita.servicio?.precio || 0)}
          </p>
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-medium border mt-2 capitalize ${
              colorEstado[cita.estado] || 'bg-gray-100 text-gray-800 border-gray-300'
            }`}
          >
            {cita.estado}
          </span>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-2 pt-3 border-t border-gray-200">
        {cita.estado !== 'cancelada' && (
          <>
            {cita.estado === 'confirmada' && (
              <>
                <Button
                  onClick={() => onCambiarEstado(cita.id, 'cancelada')}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  Cancelar
                </Button>
              </>
            )}
          </>
        )}
        <Button
          onClick={() => onEliminar(cita.id)}
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-700 ml-auto"
        >
          Eliminar
        </Button>
      </div>
    </div>
  )
}
