/**
 * Funciones utilitarias generales del proyecto
 * 
 * Este archivo contiene helpers que se usan en toda la aplicación.
 */

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combina clases de Tailwind CSS de manera inteligente
 * Evita conflictos entre clases (ej: "p-4 p-2" se convierte solo en "p-2")
 * 
 * Uso:
 * cn("px-2 py-1", estaActivo && "bg-blue-500", nombreClase)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea un número como moneda colombiana (COP)
 * 
 * Uso:
 * formatearMoneda(50000) // "$50.000"
 */
export function formatearMoneda(monto: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(monto)
}

/**
 * Formatea un número de teléfono colombiano
 * 
 * Uso:
 * formatearTelefono("3001234567") // "300 123 4567"
 */
export function formatearTelefono(telefono: string): string {
  const limpio = telefono.replace(/\D/g, '')
  if (limpio.length === 10) {
    return `${limpio.slice(0, 3)} ${limpio.slice(3, 6)} ${limpio.slice(6)}`
  }
  return telefono
}

/**
 * Valida formato de teléfono colombiano (10 dígitos)
 */
export function esTeléfonoVálido(telefono: string): boolean {
  const limpio = telefono.replace(/\D/g, '')
  return limpio.length === 10
}

/**
 * Valida formato de email
 */
export function esEmailVálido(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Genera un slug URL-friendly desde un texto
 * 
 * Uso:
 * generarSlug("Barbería El Elegante") // "barberia-el-elegante"
 */
export function generarSlug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD') // Normaliza caracteres con acentos
    .replace(/[\u0300-\u036f]/g, '') // Elimina acentos
    .replace(/[^a-z0-9\s-]/g, '') // Elimina caracteres especiales
    .trim()
    .replace(/\s+/g, '-') // Reemplaza espacios con guiones
    .replace(/-+/g, '-') // Elimina guiones duplicados
}

/**
 * Formatea una fecha en español
 * 
 * Uso:
 * formatearFecha(new Date()) // "30 de octubre de 2025"
 */
export function formatearFecha(fecha: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(fecha)
}

/**
 * Formatea una hora en formato 12 horas
 * 
 * Uso:
 * formatearHora(new Date()) // "6:00 PM"
 */
export function formatearHora(fecha: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(fecha)
}

/**
 * Convierte minutos a formato de horas y minutos
 * 
 * Uso:
 * minutosATexto(90) // "1h 30min"
 * minutosATexto(45) // "45min"
 */
export function minutosATexto(minutos: number): string {
  const horas = Math.floor(minutos / 60)
  const minutosRestantes = minutos % 60
  
  if (horas === 0) {
    return `${minutosRestantes}min`
  }
  
  if (minutosRestantes === 0) {
    return `${horas}h`
  }
  
  return `${horas}h ${minutosRestantes}min`
}
