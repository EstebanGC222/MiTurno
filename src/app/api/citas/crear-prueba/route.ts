import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { negocio_id, empleado_id, cliente_id, servicio_id } = body

    if (!negocio_id || !empleado_id || !cliente_id || !servicio_id) {
      return NextResponse.json(
        { error: 'Faltan parámetros' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: 'Variables de entorno no configuradas' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Crear cita de prueba para mañana a las 10:00
    const mañana = new Date()
    mañana.setDate(mañana.getDate() + 1)
    mañana.setHours(10, 0, 0, 0)

    const horaFin = new Date(mañana)
    horaFin.setMinutes(horaFin.getMinutes() + 30)

    const { data, error } = await supabase
      .from('citas')
      .insert({
        negocio_id,
        empleado_id,
        cliente_id,
        servicio_id,
        hora_inicio: mañana.toISOString(),
        hora_fin: horaFin.toISOString(),
        estado: 'confirmada',
        notas: 'Cita de prueba',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ cita: data }, { status: 201 })
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Error interno' },
      { status: 500 }
    )
  }
}
