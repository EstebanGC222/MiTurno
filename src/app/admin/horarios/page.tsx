/**
 * Página para gestionar horarios semanales de empleados
 * Ruta: /admin/horarios
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { crearCliente } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Usuario = Database['public']['Tables']['usuarios']['Row']
type HorarioEmpleado = Database['public']['Tables']['horarios_empleados']['Row']

const DIAS_SEMANA = [
  { id: 1, nombre: 'Lunes' },
  { id: 2, nombre: 'Martes' },
  { id: 3, nombre: 'Miércoles' },
  { id: 4, nombre: 'Jueves' },
  { id: 5, nombre: 'Viernes' },
  { id: 6, nombre: 'Sábado' },
  { id: 7, nombre: 'Domingo' },
]

export default function PaginaHorarios() {
  const router = useRouter()
  const [propietario, setPropietario] = useState<Usuario | null>(null)
  const [empleados, setEmpleados] = useState<Usuario[]>([])
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState<Usuario | null>(null)
  const [horarios, setHorarios] = useState<HorarioEmpleado[]>([])
  const [estaCargando, setEstaCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar datos al montar el componente
  useEffect(() => {
    verificarAutenticacion()
  }, [])

  // Cargar horarios cuando se selecciona un empleado
  useEffect(() => {
    if (empleadoSeleccionado) {
      cargarHorarios(empleadoSeleccionado.id)
    }
  }, [empleadoSeleccionado])

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
        setError('Solo los administradores pueden gestionar horarios')
        setEstaCargando(false)
        return
      }

      setPropietario(perfil)
      await cargarEmpleados(perfil.negocio_id)
    } catch (err) {
      console.error('Error en verificarAutenticacion:', err)
      setError('Error al verificar autenticación')
      setEstaCargando(false)
    }
  }

  const cargarEmpleados = async (negocioId: string) => {
    try {
      const supabase = crearCliente()

      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('negocio_id', negocioId)
        .eq('rol', 'empleado')
        .order('nombre_completo')

      if (error) throw error

      setEmpleados(data || [])
      
      // Seleccionar el primer empleado automáticamente
      if (data && data.length > 0) {
        setEmpleadoSeleccionado(data[0])
      }
      
      setEstaCargando(false)
    } catch (err) {
      console.error('Error al cargar empleados:', err)
      setError('Error al cargar empleados')
      setEstaCargando(false)
    }
  }

  const cargarHorarios = async (empleadoId: string) => {
    try {
      const supabase = crearCliente()

      const { data, error } = await supabase
        .from('horarios_empleados')
        .select('*')
        .eq('empleado_id', empleadoId)
        .order('dia_semana')

      if (error) throw error

      setHorarios(data || [])
    } catch (err) {
      console.error('Error al cargar horarios:', err)
      setError('Error al cargar horarios')
    }
  }

  const guardarHorario = async (
    diaSemana: number,
    horaInicio: string,
    horaFin: string,
    esDescanso: boolean
  ) => {
    if (!empleadoSeleccionado) {
      console.error('empleadoSeleccionado es null')
      return
    }

    try {
      setError(null)
      const supabase = crearCliente()

      console.log('Guardando horario:', {
        diaSemana,
        horaInicio,
        horaFin,
        esDescanso,
        empleadoId: empleadoSeleccionado.id,
      })

      // Validar horarios si no es descanso
      if (!esDescanso && horaInicio >= horaFin) {
        const msg = 'La hora de inicio debe ser menor que la hora de fin'
        console.error(msg)
        setError(msg)
        return
      }

      // Buscar si ya existe horario para este día
      const horarioExistente = horarios.find(h => h.dia_semana === diaSemana)

      console.log('Horario existente:', horarioExistente)

      if (horarioExistente) {
        // Actualizar
        console.log('Actualizando horario...')
        const { data, error } = await supabase
          .from('horarios_empleados')
          .update({
            hora_inicio: esDescanso ? '00:00' : horaInicio,  // ← CAMBIO
            hora_fin: esDescanso ? '00:00' : horaFin,        // ← CAMBIO
            es_descanso: esDescanso,
          })
          .eq('id', horarioExistente.id)

        console.log('Respuesta actualización:', { data, error })

        if (error) {
          console.error('Error Supabase (actualizar):', error)
          setError(`Error al actualizar: ${error.message}`)
          return
        }
      } else {
        // Crear
        console.log('Creando nuevo horario...')
        const { data, error } = await supabase
          .from('horarios_empleados')
          .insert({
            empleado_id: empleadoSeleccionado.id,
            negocio_id: empleadoSeleccionado.negocio_id,
            dia_semana: diaSemana,
            hora_inicio: esDescanso ? '00:00' : horaInicio,  
            hora_fin: esDescanso ? '00:00' : horaFin,        
            es_descanso: esDescanso,
          })

        console.log('Respuesta inserción:', { data, error })

        if (error) {
          console.error('Error Supabase (insertar):', error)
          setError(`Error al crear: ${error.message}`)
          return
        }
      }


      console.log('Horario guardado exitosamente, recargando...')
      // Recargar horarios
      await cargarHorarios(empleadoSeleccionado.id)
      console.log('Horarios recargados')
    } catch (err) {
      console.error('Error CATCH al guardar horario:', err)
      console.error('Error type:', typeof err)
      console.error('Error keys:', Object.keys(err || {}))
      setError(`Error inesperado: ${JSON.stringify(err)}`)
    }
  }


  const getHorarioDia = (diaSemana: number) => {
    return horarios.find(h => h.dia_semana === diaSemana)
  }

  if (estaCargando) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Cargando...</p>
      </div>
    )
  }

  if (empleados.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Horarios</h1>
          <p className="text-gray-600 mt-2">
            Configura los horarios de trabajo de tus empleados
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <p className="text-blue-800">
            📋 No tienes empleados registrados aún.
          </p>
          <p className="text-blue-600 text-sm mt-2">
            Primero debes crear empleados en la sección "Empleados"
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Horarios</h1>
        <p className="text-gray-600 mt-2">
          Configura los horarios semanales de trabajo
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label className="text-sm font-medium text-gray-600 mb-2 block">
            Selecciona un Empleado
          </Label>
          <div className="space-y-2">
            {empleados.map((emp) => (
              <button
                key={emp.id}
                onClick={() => setEmpleadoSeleccionado(emp)}
                className={`w-full text-left px-4 py-3 rounded border transition ${
                  empleadoSeleccionado?.id === emp.id
                    ? 'bg-blue-50 border-blue-300'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className="font-medium text-gray-900">{emp.nombre_completo}</p>
                <p className="text-xs text-gray-600">{emp.email}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Horarios */}
        <div className="md:col-span-2">
          {empleadoSeleccionado && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {empleadoSeleccionado.nombre_completo}
              </h3>

              <div className="bg-white rounded-lg shadow divide-y">
                {DIAS_SEMANA.map((dia) => {
                  const horarioDia = getHorarioDia(dia.id)
                  const esDescanso = horarioDia?.es_descanso || false
                  const horaInicio = horarioDia?.hora_inicio || '09:00'
                  const horaFin = horarioDia?.hora_fin || '17:00'

                  return (
                    <FilaDia
                      key={dia.id}
                      dia={dia}
                      horarioDia={horarioDia}
                      esDescanso={esDescanso}
                      horaInicio={horaInicio}
                      horaFin={horaFin}
                      onGuardar={(hi, hf, desc) =>
                        guardarHorario(dia.id, hi, hf, desc)
                      }
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Componente para renderizar una fila de día
 */
function FilaDia({
  dia,
  horarioDia,
  esDescanso,
  horaInicio,
  horaFin,
  onGuardar,
}: {
  dia: { id: number; nombre: string }
  horarioDia: any
  esDescanso: boolean
  horaInicio: string
  horaFin: string
  onGuardar: (horaInicio: string, horaFin: string, esDescanso: boolean) => void
}) {
  const [editando, setEditando] = useState(false)
  const [nuevoHI, setNuevoHI] = useState(horaInicio)
  const [nuevoHF, setNuevoHF] = useState(horaFin)
  const [nuevoDescanso, setNuevoDescanso] = useState(esDescanso)

  // Actualizar estado cuando cambien los props
  useEffect(() => {
    setNuevoHI(horaInicio)
    setNuevoHF(horaFin)
    setNuevoDescanso(esDescanso)
  }, [horaInicio, horaFin, esDescanso])

  const handleGuardar = () => {
    onGuardar(nuevoHI, nuevoHF, nuevoDescanso)
    setEditando(false)
  }

  const handleCancelar = () => {
    // Restaurar valores originales
    setNuevoHI(horaInicio)
    setNuevoHF(horaFin)
    setNuevoDescanso(esDescanso)
    setEditando(false)
  }

  return (
    <div className="px-6 py-4">
      <div className="flex items-center justify-between">
        <span className="font-medium text-gray-900 min-w-24">{dia.nombre}</span>

        {!editando ? (
          <div className="flex items-center gap-4">
            {nuevoDescanso ? (
              <span className="text-gray-600 text-sm">Descanso</span>
            ) : (
              <span className="text-gray-600 text-sm">
                {nuevoHI} - {nuevoHF}
              </span>
            )}
            <Button
              onClick={() => setEditando(true)}
              variant="outline"
              size="sm"
            >
              Editar
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={nuevoDescanso}
                onChange={(e) => setNuevoDescanso(e.target.checked)}
                className="rounded"
              />
              Descanso
            </label>

            {!nuevoDescanso && (
              <>
                <Input
                  type="time"
                  value={nuevoHI}
                  onChange={(e) => setNuevoHI(e.target.value)}
                  className="w-24 h-8"
                />
                <span className="text-gray-400">-</span>
                <Input
                  type="time"
                  value={nuevoHF}
                  onChange={(e) => setNuevoHF(e.target.value)}
                  className="w-24 h-8"
                />
              </>
            )}

            <Button onClick={handleGuardar} size="sm" className="ml-2">
              Guardar
            </Button>
            <Button
              onClick={handleCancelar}
              variant="outline"
              size="sm"
            >
              Cancelar
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

