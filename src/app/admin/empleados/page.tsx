/**
 * Página para gestionar empleados (CRUD)
 * Ruta: /admin/empleados
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

export default function PaginaEmpleados() {
  const router = useRouter()
  const [propietario, setPropietario] = useState<Usuario | null>(null)
  const [empleados, setEmpleados] = useState<Usuario[]>([])
  const [estaCargando, setEstaCargando] = useState(true)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [empleadoEditando, setEmpleadoEditando] = useState<Usuario | null>(null)
  
  // Estado del formulario
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Cargar datos al montar el componente
  useEffect(() => {
    verificarAutenticacion()
  }, [])

  const verificarAutenticacion = async () => {
    try {
      const supabase = crearCliente()

      // Verificar si hay usuario logueado
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      // Cargar perfil del usuario (propietario)
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

      // Verificar que sea admin
      if (perfil.rol !== 'admin') {
        setError('Solo los administradores pueden gestionar empleados')
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
      setEstaCargando(true)
      const supabase = crearCliente()

      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('negocio_id', negocioId)
        .eq('rol', 'empleado')
        .order('creado_en', { ascending: false })

      if (error) throw error

      setEmpleados(data || [])
    } catch (err) {
      console.error('Error al cargar empleados:', err)
      setError('Error al cargar empleados')
    } finally {
      setEstaCargando(false)
    }
  }

  const limpiarFormulario = () => {
    setNombre('')
    setEmail('')
    setTelefono('')
    setContrasena('')
    setEmpleadoEditando(null)
    setError(null)
  }

  const manejarCrear = () => {
    limpiarFormulario()
    setMostrarFormulario(true)
  }

  const manejarEditar = (empleado: Usuario) => {
    setEmpleadoEditando(empleado)
    setNombre(empleado.nombre_completo)
    setEmail(empleado.email)
    setTelefono(empleado.telefono || '')
    setContrasena('') // No mostramos la contraseña
    setMostrarFormulario(true)
  }

  const manejarGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!nombre || !email) {
      setError('Completa todos los campos requeridos')
      return
    }

    if (!empleadoEditando && !contrasena) {
      setError('La contraseña es requerida para nuevos empleados')
      return
    }

    if (contrasena && contrasena.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    if (!propietario) {
      setError('Error: propietario no identificado')
      return
    }

    try {
      const supabase = crearCliente()

      if (empleadoEditando) {
        // Actualizar empleado existente
        const { error } = await supabase
          .from('usuarios')
          .update({
            nombre_completo: nombre,
            email,
            telefono: telefono || null,
          })
          .eq('id', empleadoEditando.id)

        if (error) throw error
      } else {
        // Crear nuevo empleado vía API
        const response = await fetch('/api/empleados/crear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre,
            email,
            contrasena,
            telefono: telefono || null,
            negocio_id: propietario.negocio_id,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Error al crear empleado')
          return
        }
      }

      // Recargar empleados
      await cargarEmpleados(propietario.negocio_id)
      setMostrarFormulario(false)
      limpiarFormulario()
    } catch (err) {
      console.error('Error al guardar:', err)
      setError('Error al guardar el empleado')
    }
  }


  const manejarEliminar = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este empleado?')) {
      return
    }

    try {
      const supabase = crearCliente()

      // Eliminar perfil de usuarios primero
      const { error: errorPerfil } = await supabase
        .from('usuarios')
        .delete()
        .eq('id', id)

      if (errorPerfil) throw errorPerfil

      // Eliminar usuario de Auth
      const { error: errorAuth } = await supabase.auth.admin.deleteUser(id)
      if (errorAuth) {
        console.warn('Perfil eliminado pero no se pudo eliminar de Auth:', errorAuth)
      }

      setEmpleados(empleados.filter(e => e.id !== id))
    } catch (err) {
      console.error('Error al eliminar:', err)
      setError('Error al eliminar el empleado')
    }
  }

  if (estaCargando) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Cargando empleados...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Empleados</h1>
          <p className="text-gray-600 mt-2">
            Gestiona tu equipo de trabajo
          </p>
        </div>
        <Button onClick={manejarCrear}>+ Nuevo Empleado</Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Formulario */}
      {mostrarFormulario && (
        <Card>
          <CardHeader>
            <CardTitle>
              {empleadoEditando ? 'Editar Empleado' : 'Nuevo Empleado'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={manejarGuardar} className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre Completo *</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="juan@example.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="telefono">Teléfono (opcional)</Label>
                <Input
                  id="telefono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="3001234567"
                />
              </div>

              <div>
                <Label htmlFor="contrasena">
                  Contraseña {empleadoEditando ? '(dejar en blanco para no cambiar)' : '*'}
                </Label>
                <Input
                  id="contrasena"
                  type="password"
                  value={contrasena}
                  onChange={(e) => setContrasena(e.target.value)}
                  placeholder="••••••••"
                  required={!empleadoEditando}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {empleadoEditando ? 'Actualizar' : 'Crear'} Empleado
                </Button>
                <Button
                  type="button"
                  onClick={() => setMostrarFormulario(false)}
                  variant="outline"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tabla de empleados */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {empleados.length === 0 ? (
          <div className="p-6 text-center text-gray-600">
            <p>No hay empleados registrados aún</p>
            <p className="text-sm mt-2">
              Agrega tu primer empleado haciendo click en "+ Nuevo Empleado"
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Teléfono
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {empleados.map((empleado) => (
                <tr key={empleado.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {empleado.nombre_completo}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {empleado.email}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {empleado.telefono || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      empleado.esta_activo
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {empleado.esta_activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <Button
                      onClick={() => manejarEditar(empleado)}
                      variant="outline"
                      size="sm"
                    >
                      Editar
                    </Button>
                    <Button
                      onClick={() => manejarEliminar(empleado.id)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
