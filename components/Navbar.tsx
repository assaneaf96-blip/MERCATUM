'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { getSiteSettings, getProducts, DEFAULT_SETTINGS, type SiteSettings } from '@/lib/store'
import { PRODUCTS, Product } from '@/lib/products'
import { fetchProductsFromDb, fetchSettingsFromDb } from '@/lib/supabaseService'

interface NavbarProps {
  cartCount: number
  onOpenCart?: () => void
}

export default function Navbar({ cartCount, onOpenCart }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [productsList, setProductsList] = useState<Product[]>(PRODUCTS)
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)
  const pathname = usePathname()

  useEffect(() => {
    const local = getProducts()
    if (local && local.length > 0) {
      setProductsList(local)
    }
    setSettings(getSiteSettings())
    fetchSettingsFromDb().then((s) => {
      if (s) setSettings(s)
    }).catch(() => {})

    fetchProductsFromDb()
      .then((db) => {
        if (db && db.length > 0) {
          const merged = new Map<string, Product>()
          local.forEach((p) => merged.set(p.id, p))
          db.forEach((p) => merged.set(p.id, p))
          setProductsList(Array.from(merged.values()))
        }
      })
      .catch(() => {})
  }, [])

  return (
    <>
      <div className="announcement-marquee-wrapper" aria-label="Défilement du catalogue produits">
        <div className="announcement-marquee-track">
          {[...productsList, ...productsList].map((prod, idx) => (
            <div key={`${prod.id}-${idx}`} className="announcement-item-wrapper">
              <Link href={`/produit/${prod.id}`} className="announcement-product-chip">
                {prod.image && (
                  <img
                    src={prod.image}
                    alt={prod.name}
                    className="announcement-chip-img"
                    loading="lazy"
                  />
                )}
                <span className="announcement-chip-name">{prod.name}</span>
                <span className="announcement-chip-price">{prod.price}</span>
              </Link>
              <span className="announcement-separator">✦</span>
            </div>
          ))}
        </div>
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
          {settings.siteName || 'MERCATUM'}
        </Link>

        <nav className={`nav ${menuOpen ? 'nav-open' : ''}`} aria-label="Navigation principale">
          <div className="nav-links mobile-nav-links">
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
