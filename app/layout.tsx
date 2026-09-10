import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata, Viewport } from 'next'
import PixelTracker from '@/components/PixelTracker'
import './globals.css'

export const metadata: Metadata = {
  title: "MERCATUM — L'Art de Vivre & Sanctuaire Intérieur",
  description: "Mobilier de créateur, rituels de soin d'exception et art de vivre pour la maison et le corps.",
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#f4f0e9',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className="bg-background">
      <body className="antialiased">
        <PixelTracker />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
        <SpeedInsights />
      </body>
    </html>
  )
}
