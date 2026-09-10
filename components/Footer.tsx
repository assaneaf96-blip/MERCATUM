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
        <Link href="/" className="brand-footer">{settings.siteName || 'MERCATUM'}</Link>
        <p>Art de Vivre, mobilier d&apos;exception et rituels de soin pour le corps et la maison. Conçu pour cultiver votre bien-être au quotidien.</p>
      </div>

      <div className="footer-col">
        <h4>Navigation</h4>
        <Link href="/">Accueil</Link>
        <Link href="/boutique">La Boutique</Link>
        <Link href="/#histoire">Notre Philosophie</Link>
        <Link href="/#nouveautes">Nouveautés</Link>
      </div>

      <div className="footer-col">
        <h4>Engagements</h4>
        <span>Design Durable &amp; Matières Nobles</span>
        <span>Rituels de Bien-Être Quotidiens</span>
        <span>Objets &amp; Formulations d&apos;Exception</span>
        <span>Expédition Soignée &amp; Service Sur-Mesure</span>
      </div>

      <div className="footer-col">
        <h4>Contact</h4>
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
        <small>© 2026 {settings.siteName || 'MERCATUM'}. Tous droits réservés.</small>
      </div>
    </footer>
  )
}
