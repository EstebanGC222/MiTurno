'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { crearCliente } from '@/lib/supabase/client'
import { formatearMoneda } from '@/lib/utils'
import { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type Servicio = Database['public']['Tables']['servicios']['Row']
type Usuario = Database['public']['Tables']['usuarios']['Row']

export default function PaginaServicios() {
  const router = useRouter()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [estaCargando, setEstaCargando] = useState(true)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [servicioEditando, setServicioEditando] = useState<Servicio | null>(null)

  // Estado del formulario
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [precio, setPrecio] = useState('')
  const [duracion, setDuracion] = useState('')
  const [imagenFile, setImagenFile] = useState<File | null>(null)
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
      // Cargar perfil del usuario
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
      setUsuario(perfil)
      // Ahora cargar servicios
      await cargarServicios(perfil.negocio_id)
    } catch (err) {
      console.error('Error en verificarAutenticacion:', err)
      setError('Error al verificar autenticación')
      setEstaCargando(false)
    }
  }

  const cargarServicios = async (negocioId: string) => {
    try {
      setEstaCargando(true)
      const supabase = crearCliente()
      const { data, error } = await supabase
        .from('servicios')
        .select('*')
        .eq('negocio_id', negocioId)
        .order('creado_en', { ascending: false })
      if (error) {
        console.error('Error en query:', error)
        throw error
      }
      setServicios(data || [])
    } catch (err) {
      console.error('Error al cargar servicios:', err)
      setError('Error al cargar servicios')
    } finally {
      setEstaCargando(false)
    }
  }

  const limpiarFormulario = () => {
    setNombre('')
    setDescripcion('')
    setPrecio('')
    setDuracion('')
    setServicioEditando(null)
    setError(null)
    setImagenFile(null)
  }

  const manejarCrear = () => {
    limpiarFormulario()
    setMostrarFormulario(true)
  }

  const manejarEditar = (servicio: Servicio) => {
    setServicioEditando(servicio)
    setNombre(servicio.nombre)
    setDescripcion(servicio.descripcion || '')
    setPrecio(servicio.precio.toString())
    setDuracion(servicio.duracion_minutos.toString())
    setMostrarFormulario(true)
    setImagenFile(null)
  }

  const manejarGuardar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!nombre || !precio || !duracion) {
      setError('Completa todos los campos requeridos')
      return
    }
    if (!usuario) {
      setError('Usuario no autenticado')
      return
    }
    try {
      const supabase = crearCliente()
      let imagenUrl: string | null = null

      // Subir imagen si hay seleccionada
      if (imagenFile) {
        const { data, error: uploadError } = await supabase.storage
          .from('servicios')
          .upload(`fotos/${Date.now()}-${imagenFile.name}`, imagenFile)
        if (uploadError) throw uploadError
        imagenUrl = supabase.storage
          .from('servicios')
          .getPublicUrl(data.path).data.publicUrl
      }

      if (servicioEditando) {
        // Actualizar servicio existente
        const { error } = await supabase
          .from('servicios')
          .update({
            nombre,
            descripcion: descripcion || null,
            precio: parseFloat(precio),
            duracion_minutos: parseInt(duracion),
            ...(imagenUrl && { imagen_url: imagenUrl }),
          })
          .eq('id', servicioEditando.id)
        if (error) throw error
      } else {
        // Crear nuevo servicio
        const { error } = await supabase
          .from('servicios')
          .insert({
            negocio_id: usuario.negocio_id,
            nombre,
            descripcion: descripcion || null,
            precio: parseFloat(precio),
            duracion_minutos: parseInt(duracion),
            imagen_url: imagenUrl,
            esta_activo: true
          })
        if (error) throw error
      }

      // Recargar servicios
      await cargarServicios(usuario.negocio_id)
      setMostrarFormulario(false)
      limpiarFormulario()
    } catch (err) {
      console.error('Error al guardar:', err)
      setError('Error al guardar el servicio')
    }
  }

  const manejarEliminar = async (id: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este servicio?')) {
      return
    }
    try {
      const supabase = crearCliente()
      const { error } = await supabase
        .from('servicios')
        .delete()
        .eq('id', id)
      if (error) throw error
      setServicios(servicios.filter(s => s.id !== id))
    } catch (err) {
      console.error('Error al eliminar:', err)
      setError('Error al eliminar el servicio')
    }
  }

  if (estaCargando) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Cargando servicios...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Servicios</h1>
          <p className="text-gray-600 mt-2">
            Gestiona los servicios que ofrece tu negocio
          </p>
        </div>
        <Button onClick={manejarCrear}>+ Nuevo Servicio</Button>
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
              {servicioEditando ? 'Editar Servicio' : 'Nuevo Servicio'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={manejarGuardar} className="space-y-4">
              <div>
                <Label htmlFor="nombre">Nombre del Servicio *</Label>
                <Input
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Corte de cabello"
                  required
                />
              </div>
              <div>
                <Label htmlFor="descripcion">Descripción</Label>
                <Input
                  id="descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Detalles del servicio"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="precio">Precio ($) *</Label>
                  <Input
                    id="precio"
                    type="number"
                    value={precio}
                    onChange={(e) => setPrecio(e.target.value)}
                    placeholder="0"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="duracion">Duración (minutos) *</Label>
                  <Input
                    id="duracion"
                    type="number"
                    value={duracion}
                    onChange={(e) => setDuracion(e.target.value)}
                    placeholder="30"
                    min="1"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="imagen">Imagen del servicio</Label>
                <Input
                  id="imagen"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) setImagenFile(e.target.files[0])
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  {servicioEditando ? 'Actualizar' : 'Crear'} Servicio
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

      {/* Tabla de servicios */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {servicios.length === 0 ? (
          <div className="p-6 text-center text-gray-600">
            <p>No hay servicios registrados aún</p>
            <p className="text-sm mt-2">
              Crea el primer servicio haciendo click en "+ Nuevo Servicio"
            </p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Imagen
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Descripción
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Precio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Duración
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {servicios.map((servicio) => (
                <tr key={servicio.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm">
                    {servicio.imagen_url ? (
                      <img
                        src={servicio.imagen_url}
                        alt="Foto servicio"
                        className="h-12 w-12 object-cover rounded"
                      />
                    ) : (
                      <span className="text-gray-400">Sin foto</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {servicio.nombre}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {servicio.descripcion || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {formatearMoneda(servicio.precio)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {servicio.duracion_minutos} min
                  </td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    <Button
                      onClick={() => manejarEditar(servicio)}
                      variant="outline"
                      size="sm"
                    >
                      Editar
                    </Button>
                    <Button
                      onClick={() => manejarEliminar(servicio.id)}
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
