'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { getSiteSettings, DEFAULT_SETTINGS } from '@/lib/store'

interface NavbarProps {
  cartCount: number
  onOpenCart?: () => void
}

export default function Navbar({ cartCount, onOpenCart }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [announcement, setAnnouncement] = useState(DEFAULT_SETTINGS.announcement)
  const pathname = usePathname()

  useEffect(() => {
    const settings = getSiteSettings()
    if (settings.announcement) {
      setAnnouncement(settings.announcement)
    }
  }, [])

  return (
    <>
      <div className="announcement">
        {announcement}
      </div>
      <header className="site-header">
        <button
          className="menu-button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
        >
          <span className="menu-icon-bars" aria-hidden="true">
            <span className={`bar ${menuOpen ? 'bar-open-1' : ''}`} />
            <span className={`bar ${menuOpen ? 'bar-open-2' : ''}`} />
          </span>
          <span className="menu-text">{menuOpen ? 'Fermer' : 'Menu'}</span>
        </button>

        <Link href="/" className="brand">
          Maison Lune
        </Link>

        <nav className={`nav ${menuOpen ? 'nav-open' : ''}`} aria-label="Navigation principale">
          <div className="mobile-nav-links">
            <Link
              href="/"
              className={`nav-link ${pathname === '/' ? 'nav-active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              Accueil
            </Link>
            <Link
              href="/boutique"
              className={`nav-link ${pathname === '/boutique' ? 'nav-active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              La boutique
            </Link>
            <Link
              href="/#histoire"
              className="nav-link"
              onClick={() => setMenuOpen(false)}
            >
              Notre histoire
            </Link>
            <Link
              href="/#nouveautes"
              className="nav-link"
              onClick={() => setMenuOpen(false)}
            >
              Nouveautés
            </Link>
          </div>
          <div className="mobile-nav-cta">
            <Link
              href="/boutique"
              className="button dark mobile-menu-buy-btn"
              onClick={() => setMenuOpen(false)}
            >
              Accéder à la boutique <span>→</span>
            </Link>
          </div>
        </nav>

        <div className="header-actions">
          <Link href="/boutique" className="header-buy-btn">
            Acheter maintenant
          </Link>
          <button
            onClick={onOpenCart}
            className="header-cart-btn"
            aria-label="Panier"
          >
            Panier <span className="cart-badge-pill">({cartCount})</span>
          </button>
        </div>
      </header>
    </>
  )
}
