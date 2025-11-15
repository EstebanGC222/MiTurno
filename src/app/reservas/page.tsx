'use client'

import emailjs from 'emailjs-com'
import { useEffect, useState } from 'react'
import { crearCliente } from '@/lib/supabase/client'
import { formatearMoneda } from '@/lib/utils'
import { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Negocio = Database['public']['Tables']['negocios']['Row']
type Servicio = Database['public']['Tables']['servicios']['Row']
type Usuario = Database['public']['Tables']['usuarios']['Row']

const EMAILJS_SERVICE_ID = 'service_uhg2aud'
const EMAILJS_TEMPLATE_ID = 'template_0zkkmpr'
const EMAILJS_USER_ID='ApjZSbMqKfZl4n29x'


export default function PaginaReservas() {
  const [negocios, setNegocios] = useState<Negocio[]>([])
  const [negocio, setNegocio] = useState<Negocio | null>(null)
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [empleados, setEmpleados] = useState<Usuario[]>([])
  const [estaCargando, setEstaCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Paso 1: Seleccionar servicio
  const [servicioSeleccionado, setServicioSeleccionado] = useState<Servicio | null>(null)

  // Paso 2: Seleccionar empleado
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<Usuario | null>(null)

  // Paso 3: Seleccionar fecha y hora
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string>('')
  const [horaSeleccionada, setHoraSeleccionada] = useState<string>('')
  const [horasDisponibles, setHorasDisponibles] = useState<string[]>([])

  // Paso 4: Datos del cliente
  const [nombreCliente, setNombreCliente] = useState('')
  const [emailCliente, setEmailCliente] = useState('')
  const [telefonoCliente, setTelefonoCliente] = useState('')

  // Estado de envío
  const [enviando, setEnviando] = useState(false)
  const [citaConfirmada, setCitaConfirmada] = useState(false)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      setEstaCargando(true)
      const supabase = crearCliente()
      // Cargar todos los negocios
      const { data: negociosData, error: errorNegocios } = await supabase
        .from('negocios')
        .select('*')
        .order('nombre')

      if (errorNegocios || !negociosData?.length) {
        setError('No se encontró ningún negocio')
        setEstaCargando(false)
        return
      }
      setNegocios(negociosData)
      // Seleccionar el primero por defecto
      await cargarServiciosEmpleados(negociosData[0])
      setEstaCargando(false)
    } catch (err) {
      console.error('Error al cargar datos:', err)
      setError('Error al cargar los datos')
      setEstaCargando(false)
    }
  }

  const cargarServiciosEmpleados = async (negocioSeleccionado: Negocio) => {
    try {
      const supabase = crearCliente()
      setNegocio(negocioSeleccionado)

      // Cargar servicios
      const { data: serviciosData, error: errorServicios } = await supabase
        .from('servicios')
        .select('*')
        .eq('negocio_id', negocioSeleccionado.id)
        .order('nombre')

      if (errorServicios) throw errorServicios
      setServicios(serviciosData || [])

      // Cargar empleados
      const { data: empleadosData, error: errorEmpleados } = await supabase
        .from('usuarios')
        .select('*')
        .eq('negocio_id', negocioSeleccionado.id)
        .eq('rol', 'empleado')
        .order('nombre_completo')

      if (errorEmpleados) throw errorEmpleados
      setEmpleados(empleadosData || [])

      // Resetear selecciones
      setServicioSeleccionado(null)
      setEmpleadoSeleccionado(null)
      setFechaSeleccionada('')
      setHoraSeleccionada('')
    } catch (err) {
      console.error('Error:', err)
      setError('Error al cargar servicios')
    }
  }

  const obtenerHorasDisponibles = async (fecha: string, empleadoId: string) => {
    try {
      setError(null)
      const supabase = crearCliente()
      // Obtener el día de la semana (1=Lunes, 7=Domingo)
      const fechaObj = new Date(fecha + 'T00:00:00')
      let diaSemana = fechaObj.getDay()
      diaSemana = diaSemana === 0 ? 7 : diaSemana

      // Obtener horario del empleado para ese día
      const { data: horario, error: errorHorario } = await supabase
        .from('horarios_empleados')
        .select('*')
        .eq('empleado_id', empleadoId)
        .eq('dia_semana', diaSemana)
        .single()

      if (errorHorario && errorHorario.code !== 'PGRST116') {
        throw errorHorario
      }
      if (!horario || horario.es_descanso) {
        setHorasDisponibles([])
        setError('Este empleado no trabaja ese día')
        return
      }

      // Obtener citas ya reservadas ese día
      const fechaInicio = new Date(fecha + 'T00:00:00')
      const fechaFin = new Date(fecha + 'T23:59:59')
      const { data: citas, error: errorCitas } = await supabase
        .from('citas')
        .select('hora_inicio, hora_fin')
        .eq('empleado_id', empleadoId)
        .gte('hora_inicio', fechaInicio.toISOString())
        .lt('hora_inicio', fechaFin.toISOString())
        .eq('estado', 'confirmada')

      if (errorCitas) throw errorCitas

      const horaInicioEmpleado = horario.hora_inicio.substring(0, 5)
      const horaFinEmpleado = horario.hora_fin.substring(0, 5)
      const duracionServicio = servicioSeleccionado?.duracion_minutos || 30

      const horas = generarHorasDisponibles(
        horaInicioEmpleado,
        horaFinEmpleado,
        duracionServicio,
        citas || []
      )
      setHorasDisponibles(horas)
    } catch (err) {
      setHorasDisponibles([])
      setError('Error al cargar horas disponibles')
    }
  }

  const generarHorasDisponibles = (
    horaInicio: string,
    horaFin: string,
    duracion: number,
    citasReservadas: any[]
  ): string[] => {
    const horas: string[] = []
    const [hI, mI] = horaInicio.split(':').map(Number)
    const [hF, mF] = horaFin.split(':').map(Number)

    let minutoActual = hI * 60 + mI
    while (minutoActual + duracion <= hF * 60 + mF) {
      const hora = String(Math.floor(minutoActual / 60)).padStart(2, '0')
      const minuto = String(minutoActual % 60).padStart(2, '0')
      const horaStr = `${hora}:${minuto}`

      const estaReservada = citasReservadas.some((cita) => {
        const horaInicioCita = cita.hora_inicio.substring(11, 16)
        return horaInicioCita === horaStr
      })
      if (!estaReservada) {
        horas.push(horaStr)
      }
      minutoActual += duracion
    }
    return horas
  }

  const handleSeleccionarFecha = async (fecha: string) => {
    setFechaSeleccionada(fecha)
    setHoraSeleccionada('')
    if (empleadoSeleccionado) {
      await obtenerHorasDisponibles(fecha, empleadoSeleccionado.id)
    }
  }

  const handleSeleccionarEmpleado = async (empleado: Usuario) => {
    setEmpleadoSeleccionado(empleado)
    setFechaSeleccionada('')
    setHoraSeleccionada('')
    setHorasDisponibles([])
  }

  const confirmarReserva = async () => {
    if (!nombreCliente || !emailCliente || !telefonoCliente) {
      setError('Por favor completa todos los campos')
      return
    }
    if (!fechaSeleccionada || !horaSeleccionada || !empleadoSeleccionado || !servicioSeleccionado || !negocio) {
      setError('Por favor completa la selección de fecha y hora')
      return
    }
    try {
      setEnviando(true)
      const supabase = crearCliente()
      // Crear cliente si no existe
      const { data: clienteExistente } = await supabase
        .from('clientes')
        .select('id')
        .eq('email', emailCliente)
        .eq('negocio_id', negocio.id)
        .single()
      let clienteId = clienteExistente?.id
      if (!clienteId) {
        const { data: nuevoCliente, error: errorCliente } = await supabase
          .from('clientes')
          .insert({
            negocio_id: negocio.id,
            nombre_completo: nombreCliente,
            email: emailCliente,
            telefono: telefonoCliente,
          })
          .select()
          .single()
        if (errorCliente) throw errorCliente
        clienteId = nuevoCliente.id
      }
      // Crear cita
      const [hora, minuto] = horaSeleccionada.split(':').map(Number)
      const fechaHora = new Date(fechaSeleccionada)
      fechaHora.setHours(hora, minuto, 0, 0)
      const horaFin = new Date(fechaHora)
      horaFin.setMinutes(horaFin.getMinutes() + (servicioSeleccionado?.duracion_minutos || 30))
      const { data: cita, error: errorCita } = await supabase
        .from('citas')
        .insert({
          negocio_id: negocio.id,
          empleado_id: empleadoSeleccionado.id,
          cliente_id: clienteId,
          servicio_id: servicioSeleccionado.id,
          hora_inicio: fechaHora.toISOString(),
          hora_fin: horaFin.toISOString(),
          estado: 'confirmada',
        })
        .select()
        .single()
      if (errorCita) throw errorCita

      setCitaConfirmada(true)
      setTimeout(() => {
        setNombreCliente('')
        setEmailCliente('')
        setTelefonoCliente('')
        setServicioSeleccionado(null)
        setEmpleadoSeleccionado(null)
        setFechaSeleccionada('')
        setHoraSeleccionada('')
        setCitaConfirmada(false)
      }, 3000)
    } catch (err) {
      setError('Error al confirmar la reserva')
    } finally {
      setEnviando(false)
    }
    await emailjs.send(
  EMAILJS_SERVICE_ID,
  EMAILJS_TEMPLATE_ID,
  {
    to_email: emailCliente, 
    title: 'Confirmación de Cita',
    cliente: nombreCliente,
    servicio: servicioSeleccionado?.nombre,
    empleado: empleadoSeleccionado?.nombre_completo,
    fecha: new Date(fechaSeleccionada).toLocaleDateString('es-ES'),
    hora: horaSeleccionada,
    
  },
  EMAILJS_USER_ID
)

      
  }


  if (estaCargando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <p className="text-gray-600 text-lg">Cargando...</p>
      </div>
    )
  }

  if (!negocio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <p className="text-red-600 text-lg">No se encontró el negocio</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Encabezado */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {negocio.nombre}
          </h1>
          <p className="text-gray-600">Reserva tu cita ahora</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {citaConfirmada && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            ¡Cita confirmada exitosamente! Te enviaremos los detalles al email.
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Formulario de Reserva</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Selector de negocio - NUEVO */}
            {negocios.length > 1 && (
              <div>
                <Label className="text-sm font-medium text-gray-600 mb-2 block">
                  Selecciona un Negocio
                </Label>
                <div className="flex gap-2 flex-wrap">
                  {negocios.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => cargarServiciosEmpleados(n)}
                      className={`px-4 py-2 rounded border-2 transition ${
                        negocio?.id === n.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {n.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Paso 1: Seleccionar servicio */}
            <div>
              <Label className="text-base font-semibold mb-3 block">
                1. Selecciona un Servicio
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {servicios.map((servicio) => (
                  <button
                    key={servicio.id}
                    onClick={() => {
                      setServicioSeleccionado(servicio)
                      setEmpleadoSeleccionado(null)
                      setFechaSeleccionada('')
                      setHoraSeleccionada('')
                    }}
                    className={`p-3 rounded border-2 text-left transition flex gap-3 ${
                      servicioSeleccionado?.id === servicio.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {servicio.imagen_url ? (
                      <img
                        src={servicio.imagen_url}
                        alt={servicio.nombre}
                        className="h-12 w-12 object-cover rounded"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded bg-gray-200 flex items-center justify-center text-gray-400 text-xl">
                        <span>🖼️</span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">{servicio.nombre}</p>
                      <p className="text-sm text-gray-600">
                        {formatearMoneda(servicio.precio)} • {servicio.duracion_minutos}min
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {servicioSeleccionado && (
              <>
                {/* Paso 2: Seleccionar empleado */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">
                    2. Selecciona un Empleado
                  </Label>
                  <div className="space-y-2">
                    {empleados.map((empleado) => (
                      <button
                        key={empleado.id}
                        onClick={() => handleSeleccionarEmpleado(empleado)}
                        className={`w-full p-3 rounded border-2 text-left transition flex items-center gap-3 ${
                          empleadoSeleccionado?.id === empleado.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {empleado.foto_url ? (
                          <img
                            src={empleado.foto_url}
                            alt={empleado.nombre_completo}
                            className="h-12 w-12 object-cover rounded-full"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-xl">
                            <span>👤</span>
                          </div>
                        )}
                        <span className="font-medium text-gray-900">{empleado.nombre_completo}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {empleadoSeleccionado && (
              <>
                {/* Paso 3: Seleccionar fecha */}
                <div>
                  <Label htmlFor="fecha" className="text-base font-semibold mb-3 block">
                    3. Selecciona una Fecha
                  </Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={fechaSeleccionada}
                    onChange={(e) => handleSeleccionarFecha(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </>
            )}

            {fechaSeleccionada && (
              <>
                {/* Paso 4: Seleccionar hora */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">
                    4. Selecciona una Hora
                  </Label>
                  {horasDisponibles.length === 0 ? (
                    <p className="text-gray-600">
                      No hay horarios disponibles para esta fecha
                    </p>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {horasDisponibles.map((hora) => (
                        <button
                          key={hora}
                          onClick={() => setHoraSeleccionada(hora)}
                          className={`p-2 rounded border-2 text-sm font-medium transition ${
                            horaSeleccionada === hora
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {hora}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {horaSeleccionada && (
              <>
                {/* Paso 5: Datos del cliente */}
                <div className="border-t pt-6">
                  <Label className="text-base font-semibold mb-3 block">
                    5. Tu Información
                  </Label>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="nombre" className="text-sm">
                        Nombre Completo *
                      </Label>
                      <Input
                        id="nombre"
                        value={nombreCliente}
                        onChange={(e) => setNombreCliente(e.target.value)}
                        placeholder="Juan Pérez"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-sm">
                        Email *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={emailCliente}
                        onChange={(e) => setEmailCliente(e.target.value)}
                        placeholder="juan@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="telefono" className="text-sm">
                        Teléfono *
                      </Label>
                      <Input
                        id="telefono"
                        value={telefonoCliente}
                        onChange={(e) => setTelefonoCliente(e.target.value)}
                        placeholder="3001234567"
                      />
                    </div>
                  </div>
                </div>

                {/* Resumen y botón de confirmación */}
                <div className="border-t pt-6 space-y-4">
                  <div className="bg-gray-50 p-4 rounded">
                    <h3 className="font-semibold text-gray-900 mb-2">Resumen</h3>
                    <div className="flex gap-3 items-center my-2">
                      {servicioSeleccionado?.imagen_url && (
                        <img src={servicioSeleccionado.imagen_url} alt="" className="h-12 w-12 object-cover rounded" />
                      )}
                      <div>
                        <p>
                          <span className="text-gray-600">Servicio:</span>{' '}
                          <span className="font-medium">{servicioSeleccionado?.nombre}</span>
                        </p>
                        <p>
                          <span className="text-gray-600">Empleado:</span>{' '}
                          <span className="font-medium">{empleadoSeleccionado?.nombre_completo}</span>
                          {empleadoSeleccionado?.foto_url && (
                            <img src={empleadoSeleccionado.foto_url} alt="" className="h-8 w-8 object-cover rounded-full inline ml-2" />
                          )}
                        </p>
                        <p>
                          <span className="text-gray-600">Fecha:</span>{' '}
                          <span className="font-medium">
                            {new Date(fechaSeleccionada).toLocaleDateString('es-ES')}
                          </span>
                        </p>
                        <p>
                          <span className="text-gray-600">Hora:</span>{' '}
                          <span className="font-medium">{horaSeleccionada}</span>
                        </p>
                        <p className="border-t pt-2 mt-2">
                          <span className="text-gray-600">Precio:</span>{' '}
                          <span className="font-semibold text-blue-600">
                            {formatearMoneda(servicioSeleccionado?.precio || 0)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={confirmarReserva}
                    disabled={enviando}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3"
                  >
                    {enviando ? 'Confirmando...' : 'Confirmar Reserva'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-600 text-sm">
          <p>© {new Date().getFullYear()} {negocio.nombre}. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  )
}
