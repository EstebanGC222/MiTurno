/**
 * Página de registro de nuevo negocio
 * Ruta: /auth/register
 * 
 * Crea un nuevo negocio y el primer usuario administrador
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { crearCliente } from '@/lib/supabase/client'
import { generarSlug } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function PaginaRegistro() {
  const router = useRouter()
  
  // Estado del formulario
  const [nombreNegocio, setNombreNegocio] = useState('')
  const [nombreCompleto, setNombreCompleto] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [confirmarContrasena, setConfirmarContrasena] = useState('')
  
  const [estaCargando, setEstaCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const manejarRegistro = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setEstaCargando(true)

    // Validaciones
    if (contrasena !== confirmarContrasena) {
      setError('Las contraseñas no coinciden')
      setEstaCargando(false)
      return
    }

    if (contrasena.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setEstaCargando(false)
      return
    }

    try {
      const supabase = crearCliente()

      // Paso 1: Crear usuario en Supabase Auth
      const { data: dataAuth, error: errorAuth } = await supabase.auth.signUp({
        email,
        password: contrasena,
      })

      if (errorAuth) {
        setError(`Error al crear cuenta: ${errorAuth.message}`)
        setEstaCargando(false)
        return
      }

      if (!dataAuth.user) {
        setError('No se pudo crear el usuario')
        setEstaCargando(false)
        return
      }

      // Paso 2: Crear el negocio
      const slug = generarSlug(nombreNegocio)
      
      const { data: dataNegocio, error: errorNegocio } = await supabase
        .from('negocios')
        .insert({
          nombre: nombreNegocio,
          slug: slug,
          telefono: telefono || null,
        })
        .select()
        .single()

      if (errorNegocio || !dataNegocio) {
        console.error('Error al crear negocio:', errorNegocio)
        setError(`Error al crear el negocio: ${errorNegocio?.message || 'Intenta con otro nombre'}`)
        setEstaCargando(false)
        return
      }

      // Paso 3: Crear el perfil del usuario administrador
      const { error: errorPerfil } = await supabase
        .from('usuarios')
        .insert({
          id: dataAuth.user.id,
          negocio_id: dataNegocio.id,
          rol: 'admin',
          nombre_completo: nombreCompleto,
          email: email,
          telefono: telefono || null,
        })

      if (errorPerfil) {
        console.error('Error al crear perfil:', errorPerfil)
        setError(`Error al crear el perfil: ${errorPerfil.message}`)
        setEstaCargando(false)
        return
      }

      // Éxito: redirigir al dashboard de admin
      router.push('/admin/dashboard')
      
    } catch (err) {
      console.error('Error en registro:', err)
      setError('Ocurrió un error inesperado. Intenta de nuevo.')
      setEstaCargando(false)
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Crear Cuenta
        </CardTitle>
        <CardDescription className="text-center">
          Registra tu negocio en MiTurno Software
        </CardDescription>
      </CardHeader>

      <form onSubmit={manejarRegistro}>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="nombreNegocio">Nombre del Negocio</Label>
            <Input
              id="nombreNegocio"
              type="text"
              placeholder="Barbería Central"
              value={nombreNegocio}
              onChange={(e) => setNombreNegocio(e.target.value)}
              required
              disabled={estaCargando}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nombreCompleto">Tu Nombre Completo</Label>
            <Input
              id="nombreCompleto"
              type="text"
              placeholder="Juan Pérez"
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              required
              disabled={estaCargando}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={estaCargando}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono (opcional)</Label>
            <Input
              id="telefono"
              type="tel"
              placeholder="3001234567"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              disabled={estaCargando}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contrasena">Contraseña</Label>
            <Input
              id="contrasena"
              type="password"
              placeholder="••••••••"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              required
              disabled={estaCargando}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmarContrasena">Confirmar Contraseña</Label>
            <Input
              id="confirmarContrasena"
              type="password"
              placeholder="••••••••"
              value={confirmarContrasena}
              onChange={(e) => setConfirmarContrasena(e.target.value)}
              required
              disabled={estaCargando}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full"
            disabled={estaCargando}
          >
            {estaCargando ? 'Creando cuenta...' : 'Crear Cuenta'}
          </Button>

          <div className="text-sm text-center text-gray-600">
            ¿Ya tienes cuenta?{' '}
            <Link href="/auth/login" className="text-blue-600 hover:underline">
              Inicia sesión aquí
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
