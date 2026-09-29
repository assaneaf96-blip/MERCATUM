'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getSiteSettings, saveSiteSettings, DEFAULT_SETTINGS, type SiteSettings } from '@/lib/store'
import { fetchSettingsFromDb } from '@/lib/supabaseService'
import AvisoLegalModal from './AvisoLegalModal'

export default function Footer() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)
  const [isLegalModalOpen, setIsLegalModalOpen] = useState<boolean>(false)
  const [legalModalTab, setLegalModalTab] = useState<number>(0)

  useEffect(() => {
    setSettings(getSiteSettings())
    fetchSettingsFromDb().then((s) => {
      if (s) {
        setSettings(s)
        saveSiteSettings(s)
      }
    }).catch(() => {})

    const handleUpdate = () => {
      setSettings(getSiteSettings())
    }
    window.addEventListener('storage', handleUpdate)
    window.addEventListener('mercatum:settings_updated', handleUpdate)
    return () => {
      window.removeEventListener('storage', handleUpdate)
      window.removeEventListener('mercatum:settings_updated', handleUpdate)
    }
  }, [])

  const openLegalTab = (tabIndex: number) => {
    setLegalModalTab(tabIndex)
    setIsLegalModalOpen(true)
  }

  return (
    <>
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

        <div className="footer-bottom" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div>
            <small>© 2026 {settings.siteName || 'MERCATUM'}. Todos los derechos reservados.</small>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '12px', fontSize: '11px' }}>
            <button
              onClick={() => openLegalTab(0)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#d8d1c6',
                padding: '5px 14px',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '11px',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)'
                e.currentTarget.style.color = '#ffffff'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.color = '#d8d1c6'
              }}
            >
              <span>⚖️</span>
              <span>AVISO LEGAL</span>
            </button>

            <span style={{ color: '#52584e' }}>|</span>

            <button
              onClick={() => openLegalTab(0)}
              style={{ background: 'none', border: 'none', color: '#a3aa9d', cursor: 'pointer', fontSize: '11px' }}
              onMouseOver={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseOut={(e) => (e.currentTarget.style.color = '#a3aa9d')}
            >
              Términos y Condiciones
            </button>

            <span style={{ color: '#52584e' }}>•</span>

            <button
              onClick={() => openLegalTab(1)}
              style={{ background: 'none', border: 'none', color: '#a3aa9d', cursor: 'pointer', fontSize: '11px' }}
              onMouseOver={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseOut={(e) => (e.currentTarget.style.color = '#a3aa9d')}
            >
              Privacidad y Datos
            </button>

            <span style={{ color: '#52584e' }}>•</span>

            <button
              onClick={() => openLegalTab(2)}
              style={{ background: 'none', border: 'none', color: '#a3aa9d', cursor: 'pointer', fontSize: '11px' }}
              onMouseOver={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseOut={(e) => (e.currentTarget.style.color = '#a3aa9d')}
            >
              Cookies
            </button>

            <span style={{ color: '#52584e' }}>•</span>

            <button
              onClick={() => openLegalTab(3)}
              style={{ background: 'none', border: 'none', color: '#a3aa9d', cursor: 'pointer', fontSize: '11px' }}
              onMouseOver={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseOut={(e) => (e.currentTarget.style.color = '#a3aa9d')}
            >
              Certificado de Operaciones
            </button>

            <span style={{ color: '#52584e' }}>•</span>

            <button
              onClick={() => openLegalTab(4)}
              style={{ background: 'none', border: 'none', color: '#a3aa9d', cursor: 'pointer', fontSize: '11px' }}
              onMouseOver={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseOut={(e) => (e.currentTarget.style.color = '#a3aa9d')}
            >
              Garantía Legal (EU)
            </button>
          </div>
        </div>
      </footer>

      <AvisoLegalModal
        isOpen={isLegalModalOpen}
        onClose={() => setIsLegalModalOpen(false)}
        initialTab={legalModalTab}
      />
    </>
  )
}
