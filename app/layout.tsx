import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata, Viewport } from 'next'
import PixelTracker from '@/components/PixelTracker'
import './globals.css'

export const metadata: Metadata = {
  title: "MERCATUM — El Arte de Vivir & Santuario Interior",
  description: "Mobiliario de autor, electrodomésticos de excepción y rituales de bienestar para el hogar y el cuerpo.",
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f4f0e9',
  viewportFit: 'cover',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className="bg-background">
      <body className="antialiased">
        <PixelTracker />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
        <SpeedInsights />
      </body>
    </html>
  )
}
