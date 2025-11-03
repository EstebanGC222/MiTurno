/**
 * Página de perfil del usuario
 * Ruta: /admin/perfil
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
type Negocio = Database['public']['Tables']['negocios']['Row']

export default function PaginaPerfil() {
  const router = useRouter()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [negocio, setNegocio] = useState<Negocio | null>(null)
  const [estaCargando, setEstaCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  // Estados para editar usuario
  const [editandoUsuario, setEditandoUsuario] = useState(false)
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')

  // Estados para editar negocio
  const [editandoNegocio, setEditandoNegocio] = useState(false)
  const [nombreNegocio, setNombreNegocio] = useState('')
  const [direccion, setDireccion] = useState('')
  const [telefonoNegocio, setTelefonoNegocio] = useState('')

  // Estados para cambiar contraseña
  const [mostrarFormularioContrasena, setMostrarFormularioContrasena] = useState(false)
  const [contrasenaActual, setContrasenaActual] = useState('')
  const [contrasenanueva, setContrasenanueva] = useState('')
  const [contrasenaConfirm, setContrasenaConfirm] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      setEstaCargando(true)
      const supabase = crearCliente()

      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: usuarioData, error: errorUsuario } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single()

      if (errorUsuario || !usuarioData) {
        setError('No se encontró tu perfil')
        setEstaCargando(false)
        return
      }

      setUsuario(usuarioData)
      setNombreCompleto(usuarioData.nombre_completo)
      setEmail(usuarioData.email)
      setTelefono(usuarioData.telefono || '')

      // Cargar negocio
      const { data: negocioData, error: errorNegocio } = await supabase
        .from('negocios')
        .select('*')
        .eq('id', usuarioData.negocio_id)
        .single()

      if (errorNegocio || !negocioData) {
        setError('No se encontró tu negocio')
        setEstaCargando(false)
        return
      }

      setNegocio(negocioData)
      setNombreNegocio(negocioData.nombre)
      setDireccion(negocioData.direccion || '')
      setTelefonoNegocio(negocioData.telefono || '')

      setEstaCargando(false)
    } catch (err) {
      console.error('Error:', err)
      setError('Error al cargar datos')
      setEstaCargando(false)
    }
  }

  const guardarCambiosUsuario = async () => {
    if (!usuario || !nombreCompleto.trim() || !telefono.trim()) {
      setError('Por favor completa todos los campos')
      return
    }

    try {
      setError(null)
      const supabase = crearCliente()

      const { error: errorActualizar } = await supabase
        .from('usuarios')
        .update({
          nombre_completo: nombreCompleto,
          telefono: telefono,
        })
        .eq('id', usuario.id)

      if (errorActualizar) throw errorActualizar

      setUsuario({ ...usuario, nombre_completo: nombreCompleto, telefono })
      setEditandoUsuario(false)
      setExito('Datos personales actualizados correctamente')
      setTimeout(() => setExito(null), 3000)
    } catch (err) {
      console.error('Error:', err)
      setError('Error al actualizar datos personales')
    }
  }

  const generarSlug = (texto: string): string => {
    return texto
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }

  const guardarCambiosNegocio = async () => {
    if (!negocio || !nombreNegocio.trim()) {
      setError('Por favor completa el nombre del negocio')
      return
    }

    try {
      setError(null)
      const supabase = crearCliente()

      const nuevoSlug = generarSlug(nombreNegocio)

      const { error: errorActualizar } = await supabase
        .from('negocios')
        .update({
          nombre: nombreNegocio,
          direccion: direccion,
          telefono: telefonoNegocio,
          slug: nuevoSlug,
        })
        .eq('id', negocio.id)

      if (errorActualizar) throw errorActualizar

      setNegocio({
        ...negocio,
        nombre: nombreNegocio,
        direccion: direccion,
        telefono: telefonoNegocio,
        slug: nuevoSlug,
      })
      setEditandoNegocio(false)
      setExito('Datos del negocio actualizados correctamente')
      setTimeout(() => setExito(null), 3000)
    } catch (err) {
      console.error('Error:', err)
      setError('Error al actualizar datos del negocio')
    }
  }

  const cambiarContrasena = async () => {
    if (!contrasenaActual || !contrasenanueva || !contrasenaConfirm) {
      setError('Por favor completa todos los campos')
      return
    }

    if (contrasenanueva !== contrasenaConfirm) {
      setError('Las contraseñas nuevas no coinciden')
      return
    }

    if (contrasenanueva.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    try {
      setError(null)
      const supabase = crearCliente()

      const { error: errorActualizar } = await supabase.auth.updateUser({
        password: contrasenanueva,
      })

      if (errorActualizar) throw errorActualizar

      setContrasenaActual('')
      setContrasenanueva('')
      setContrasenaConfirm('')
      setMostrarFormularioContrasena(false)
      setExito('Contraseña actualizada correctamente')
      setTimeout(() => setExito(null), 3000)
    } catch (err) {
      console.error('Error:', err)
      setError('Error al cambiar contraseña')
    }
  }

  if (estaCargando) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Cargando perfil...</p>
      </div>
    )
  }

  if (!usuario || !negocio) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">No se pudo cargar tu perfil</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Encabezado */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Mi Perfil</h1>
        <p className="text-gray-600 mt-2">
          Gestiona tu información personal y la de tu negocio
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {exito && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {exito}
        </div>
      )}

      {/* Perfil del Usuario */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Información Personal</CardTitle>
          {!editandoUsuario && (
            <Button
              onClick={() => setEditandoUsuario(true)}
              variant="outline"
              size="sm"
            >
              Editar
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {editandoUsuario ? (
            <>
              <div>
                <Label htmlFor="nombreCompleto" className="text-sm">
                  Nombre Completo *
                </Label>
                <Input
                  id="nombreCompleto"
                  value={nombreCompleto}
                  onChange={(e) => setNombreCompleto(e.target.value)}
                  placeholder="Tu nombre"
                />
              </div>

              <div>
                <Label htmlFor="emailUsuario" className="text-sm">
                  Email
                </Label>
                <Input
                  id="emailUsuario"
                  value={email}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  El email no se puede cambiar aquí
                </p>
              </div>

              <div>
                <Label htmlFor="telefonoUsuario" className="text-sm">
                  Teléfono *
                </Label>
                <Input
                  id="telefonoUsuario"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="3001234567"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={guardarCambiosUsuario}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Guardar Cambios
                </Button>
                <Button
                  onClick={() => {
                    setEditandoUsuario(false)
                    setNombreCompleto(usuario.nombre_completo)
                    setTelefono(usuario.telefono || '')
                  }}
                  variant="outline"
                >
                  Cancelar
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-sm text-gray-600">Nombre Completo</p>
                <p className="text-lg font-semibold text-gray-900">
                  {usuario.nombre_completo}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-lg font-semibold text-gray-900">
                  {usuario.email}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Teléfono</p>
                <p className="text-lg font-semibold text-gray-900">
                  {usuario.telefono || 'No registrado'}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Rol</p>
                <p className="text-lg font-semibold text-gray-900 capitalize">
                  {usuario.rol}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Datos del Negocio */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Información del Negocio</CardTitle>
          {!editandoNegocio && (
            <Button
              onClick={() => setEditandoNegocio(true)}
              variant="outline"
              size="sm"
            >
              Editar
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {editandoNegocio ? (
            <>
              <div>
                <Label htmlFor="nombreNegocio" className="text-sm">
                  Nombre del Negocio *
                </Label>
                <Input
                  id="nombreNegocio"
                  value={nombreNegocio}
                  onChange={(e) => setNombreNegocio(e.target.value)}
                  placeholder="Mi Negocio"
                />
              </div>

              <div>
                <Label htmlFor="direccion" className="text-sm">
                  Dirección
                </Label>
                <textarea
                  id="direccion"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Tu dirección..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="telefonoNegocio" className="text-sm">
                  Teléfono del Negocio
                </Label>
                <Input
                  id="telefonoNegocio"
                  value={telefonoNegocio}
                  onChange={(e) => setTelefonoNegocio(e.target.value)}
                  placeholder="3001234567"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={guardarCambiosNegocio}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Guardar Cambios
                </Button>
                <Button
                  onClick={() => {
                    setEditandoNegocio(false)
                    setNombreNegocio(negocio.nombre)
                    setDireccion(negocio.direccion || '')
                    setTelefonoNegocio(negocio.telefono || '')
                  }}
                  variant="outline"
                >
                  Cancelar
                </Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-sm text-gray-600">Nombre</p>
                <p className="text-lg font-semibold text-gray-900">
                  {negocio.nombre}
                </p>
              </div>

              {negocio.direccion && (
                <div>
                  <p className="text-sm text-gray-600">Dirección</p>
                  <p className="text-gray-700">
                    {negocio.direccion}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-600">Teléfono</p>
                <p className="text-lg font-semibold text-gray-900">
                  {negocio.telefono || 'No registrado'}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Seguridad */}
      <Card>
        <CardHeader>
          <CardTitle>Seguridad</CardTitle>
        </CardHeader>
        <CardContent>
          {!mostrarFormularioContrasena ? (
            <Button
              onClick={() => setMostrarFormularioContrasena(true)}
              variant="outline"
              className="text-blue-600"
            >
              Cambiar Contraseña
            </Button>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="contrasenaActual" className="text-sm">
                  Contraseña Actual *
                </Label>
                <Input
                  id="contrasenaActual"
                  type="password"
                  value={contrasenaActual}
                  onChange={(e) => setContrasenaActual(e.target.value)}
                  placeholder="Tu contraseña actual"
                />
              </div>

              <div>
                <Label htmlFor="contrasenanueva" className="text-sm">
                  Contraseña Nueva *
                </Label>
                <Input
                  id="contrasenanueva"
                  type="password"
                  value={contrasenanueva}
                  onChange={(e) => setContrasenanueva(e.target.value)}
                  placeholder="Nueva contraseña"
                />
              </div>

              <div>
                <Label htmlFor="contrasenaConfirm" className="text-sm">
                  Confirmar Contraseña *
                </Label>
                <Input
                  id="contrasenaConfirm"
                  type="password"
                  value={contrasenaConfirm}
                  onChange={(e) => setContrasenaConfirm(e.target.value)}
                  placeholder="Confirma la contraseña"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={cambiarContrasena}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Cambiar Contraseña
                </Button>
                <Button
                  onClick={() => {
                    setMostrarFormularioContrasena(false)
                    setContrasenaActual('')
                    setContrasenanueva('')
                    setContrasenaConfirm('')
                  }}
                  variant="outline"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
