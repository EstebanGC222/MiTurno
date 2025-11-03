/**
 * Store global para el flujo de reserva pública
 * 
 * Guarda el progreso del cliente mientras hace una reserva:
 * - Servicio seleccionado
 * - Empleado seleccionado
 * - Fecha y hora seleccionada
 * - Datos del cliente
 * 
 * Uso:
 * import { useBookingStore } from '@/store/useBookingStore'
 * 
 * const { servicioSeleccionado, seleccionarServicio } = useBookingStore()
 */

import { create } from 'zustand'

// Interfaces para los datos de la reserva
interface Servicio {
  id: string
  nombre: string
  precio: number
  duracion_minutos: number
  imagen_url: string | null
}

interface Empleado {
  id: string
  nombre_completo: string
  foto_url: string | null
}

interface DatosCliente {
  nombre_completo: string
  telefono: string
  email: string
}

// Interfaz del store de reserva
interface EstadoReserva {
  // Estado - Paso 1: Servicio
  servicioSeleccionado: Servicio | null
  
  // Estado - Paso 2: Empleado
  empleadoSeleccionado: Empleado | null
  
  // Estado - Paso 3: Fecha y hora
  fechaSeleccionada: Date | null
  horaSeleccionada: string | null  // Formato: "14:00"
  
  // Estado - Paso 4: Datos del cliente
  datosCliente: DatosCliente | null
  
  // Paso actual del flujo (1-4)
  pasoActual: number
  
  // Acciones
  seleccionarServicio: (servicio: Servicio) => void
  seleccionarEmpleado: (empleado: Empleado) => void
  seleccionarFechaHora: (fecha: Date, hora: string) => void
  establecerDatosCliente: (datos: DatosCliente) => void
  irAPaso: (paso: number) => void
  reiniciarReserva: () => void
}

/**
 * Hook del store de reserva
 */
export const useBookingStore = create<EstadoReserva>((set) => ({
  // Estado inicial
  servicioSeleccionado: null,
  empleadoSeleccionado: null,
  fechaSeleccionada: null,
  horaSeleccionada: null,
  datosCliente: null,
  pasoActual: 1,
  
  // Seleccionar servicio y avanzar al paso 2
  seleccionarServicio: (servicio) => set({ 
    servicioSeleccionado: servicio,
    pasoActual: 2
  }),
  
  // Seleccionar empleado y avanzar al paso 3
  seleccionarEmpleado: (empleado) => set({ 
    empleadoSeleccionado: empleado,
    pasoActual: 3
  }),
  
  // Seleccionar fecha/hora y avanzar al paso 4
  seleccionarFechaHora: (fecha, hora) => set({ 
    fechaSeleccionada: fecha,
    horaSeleccionada: hora,
    pasoActual: 4
  }),
  
  // Establecer datos del cliente
  establecerDatosCliente: (datos) => set({ 
    datosCliente: datos
  }),
  
  // Ir a un paso específico
  irAPaso: (paso) => set({ pasoActual: paso }),
  
  // Reiniciar todo el flujo de reserva
  reiniciarReserva: () => set({
    servicioSeleccionado: null,
    empleadoSeleccionado: null,
    fechaSeleccionada: null,
    horaSeleccionada: null,
    datosCliente: null,
    pasoActual: 1
  }),
}))
