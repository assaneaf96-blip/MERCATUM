import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import PixelTracker from '@/components/PixelTracker'
import './globals.css'

export const metadata: Metadata = {
  title: 'Maison Lune — Le beau, simplement',
  description: 'Soins, parfums et objets essentiels fabriqués en France avec soin.',
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
      </body>
    </html>
  )
}
