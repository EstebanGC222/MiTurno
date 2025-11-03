/**
 * Layout para páginas de autenticación (login, registro)
 * 
 * Este layout se aplica a todas las rutas dentro de /auth/*
 * Proporciona un diseño centrado y limpio para formularios de auth.
 */

export default function LayoutAuth({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
