// src/app/page.tsx

export default function PaginaInicio() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">MiTurno Software</h1>
      <p className="mt-4 text-xl text-gray-600">
        Sistema de gestión de citas para barberías y peluquerías
      </p>
      
      <div className="mt-8 p-4 border rounded">
        <p className="text-green-500">✅ Página cargando correctamente</p>
      </div>

      <div className="mt-4 text-sm text-gray-500">
        <p>📊 Tablas creadas en Supabase:</p>
        <ul className="list-disc list-inside mt-2">
          <li>negocios</li>
          <li>usuarios</li>
          <li>servicios</li>
          <li>clientes</li>
          <li>horarios_empleados</li>
          <li>citas</li>
        </ul>
      </div>
    </main>
  )
}
