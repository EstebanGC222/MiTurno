import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
// import { ProveedorAuth } from '@/components/ProveedorAuth'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MiTurno Software',
  description: 'Sistema de gestión de citas para barberías y peluquerías',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={inter.className} suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
