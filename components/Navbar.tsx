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
          aria-label="Ouvrir le menu"
        >
          {menuOpen ? 'Fermer' : 'Menu'}
        </button>

        <Link href="/" className="brand">
          Maison Lune
        </Link>

        <nav className={`nav ${menuOpen ? 'nav-open' : ''}`} aria-label="Navigation principale">
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
            Panier ({cartCount})
          </button>
        </div>
      </header>
    </>
  )
}
