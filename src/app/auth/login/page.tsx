/**
 * Página de inicio de sesión
 * Ruta: /auth/login
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { crearCliente } from '../../../lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export default function PaginaLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [estaCargando, setEstaCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const manejarLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setEstaCargando(true)

    try {
      const supabase = crearCliente()

      // Intentar iniciar sesión
      const { data, error: errorLogin } = await supabase.auth.signInWithPassword({
        email,
        password: contrasena,
      })

      if (errorLogin) {
        setError('Credenciales incorrectas. Verifica tu email y contraseña.')
        setEstaCargando(false)
        return
      }

      if (data.user) {
        // Obtener el perfil del usuario para saber su rol
        const { data: perfil, error: errorPerfil } = await supabase
          .from('usuarios')
          .select('rol')
          .eq('id', data.user.id)
          .single()

        if (errorPerfil || !perfil) {
          setError('No se encontró tu perfil. Contacta al administrador.')
          setEstaCargando(false)
          return
        }

        // Redirigir según el rol
        if (perfil.rol === 'admin') {
          router.push('/admin/dashboard')
        } else if (perfil.rol === 'empleado') {
          router.push('/employee/dashboard')
        } else {
          setError('Rol de usuario no reconocido.')
          setEstaCargando(false)
        }
      }
    } catch (err) {
      console.error('Error en login:', err)
      setError('Ocurrió un error inesperado. Intenta de nuevo.')
      setEstaCargando(false)
    }
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Iniciar Sesión
        </CardTitle>
        <CardDescription className="text-center">
          Ingresa a tu cuenta de MiTurno Software
        </CardDescription>
      </CardHeader>

      <form onSubmit={manejarLogin}>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

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
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full"
            disabled={estaCargando}
          >
            {estaCargando ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </Button>

          <div className="text-sm text-center text-gray-600">
            ¿No tienes cuenta?{' '}
            <Link href="/auth/register" className="text-blue-600 hover:underline">
              Regístrate aquí
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
