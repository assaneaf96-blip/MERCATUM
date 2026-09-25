'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getSiteSettings, DEFAULT_SETTINGS, type SiteSettings } from '@/lib/store'

export default function Footer() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    setSettings(getSiteSettings())
  }, [])

  return (
    <footer className="site-footer">
      <div className="footer-brand-block">
        <Link href="/" className="brand-footer" style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/logo.jpg" alt="MERCATUM Logo" style={{ height: '40px', objectFit: 'contain' }} />
        </Link>
        <p>Arte de Vivir, mobiliario de excepción y rituales de bienestar para el cuerpo y el hogar. Diseñado para enriquecer su día a día.</p>
      </div>

      <div className="footer-col">
        <h4>Navegación</h4>
        <Link href="/">Inicio</Link>
        <Link href="/boutique">La Tienda</Link>
        <Link href="/#histoire">Nuestra Filosofía</Link>
        <Link href="/#nouveautes">Novedades</Link>
      </div>

      <div className="footer-col">
        <h4>Compromisos</h4>
        <span>Diseño Duradero &amp; Materiales Nobles</span>
        <span>Rituales de Bienestar Cotidianos</span>
        <span>Objetos &amp; Fórmulas de Excepción</span>
        <span>Envíos Cuidados &amp; Atención a Medida</span>
      </div>

      <div className="footer-col">
        <h4>Contacto</h4>
        <span>📍 {settings.contactAddress}</span>
        <a href={`tel:${settings.contactPhone.replace(/\s+/g, '')}`} style={{ color: 'inherit', textDecoration: 'none' }}>
          📞 {settings.contactPhone}
        </a>
        <a href={`mailto:${settings.contactEmail}`} style={{ color: 'inherit', textDecoration: 'none' }}>
          ✉️ {settings.contactEmail}
        </a>
        <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{settings.contactHours}</span>
      </div>

      <div className="footer-bottom">
        <small>© 2026 {settings.siteName || 'MERCATUM'}. Todos los derechos reservados.</small>
      </div>
    </footer>
  )
}
