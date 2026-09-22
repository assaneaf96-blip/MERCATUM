'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import { getSiteSettings, getProducts, DEFAULT_SETTINGS, type SiteSettings } from '@/lib/store'
import { PRODUCTS, Product } from '@/lib/products'
import { fetchProductsFromDb, fetchSettingsFromDb, subscribeToProductsChanges } from '@/lib/supabaseService'

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

    const loadProducts = () => {
      const curLocal = getProducts()
      if (curLocal && curLocal.length > 0) {
        setProductsList(curLocal)
      }
      fetchProductsFromDb(true)
        .then((db) => {
          if (db && db.length > 0) {
            const merged = new Map<string, Product>()
            PRODUCTS.forEach((p) => merged.set(p.id, p))
            curLocal.forEach((p) => merged.set(p.id, p))
            db.forEach((p) => merged.set(p.id, p))
            setProductsList(Array.from(merged.values()))
          }
        })
        .catch(() => {})
    }

    loadProducts()
    const unsubscribe = subscribeToProductsChanges(loadProducts)
    window.addEventListener('mercatum:products_updated', loadProducts)
    window.addEventListener('storage', loadProducts)

    return () => {
      unsubscribe()
      window.removeEventListener('mercatum:products_updated', loadProducts)
      window.removeEventListener('storage', loadProducts)
    }
  }, [])

  const PROMO_ARGUMENTS = [
    {
      icon: '🔥',
      badge: 'REBAJAS HASTA -50%',
      text: 'Precios especiales por liquidación en selección premium',
      highlight: '¡Solo hoy!',
      link: '/boutique',
    },
    {
      icon: '🚚',
      badge: 'ENVÍO GRATIS 24/48H',
      text: 'Entrega rápida y asegurada en toda España a domicilio',
      highlight: 'Península e Islas',
      link: '/boutique',
    },
    {
      icon: '🛡️',
      badge: 'GARANTÍA OFICIAL 2 AÑOS',
      text: 'Productos 100% nuevos de marca con soporte oficial directo',
      highlight: 'Calidad Certificada',
      link: '/boutique',
    },
    {
      icon: '⚡',
      badge: 'VENTA DIRECTA DE FÁBRICA',
      text: 'Ahorro directo sin comisiones ni intermediarios',
      highlight: 'Stock Limitado',
      link: '/boutique',
    },
    {
      icon: '🔒',
      badge: 'PAGO 100% SEGURO',
      text: 'Transferencia bancaria oficial Santander con confirmación inmediata',
      highlight: 'Transacción Segura',
      link: '/boutique',
    },
    {
      icon: '⭐',
      badge: '+12.000 CLIENTES EN ESPAÑA',
      text: 'Valoración media de 4.9/5 con opiniones reales y verificadas',
      highlight: 'Excelente',
      link: '/boutique',
    },
    {
      icon: '📦',
      badge: '30 DÍAS DE PRUEBA',
      text: 'Devolución garantizada y cambio fácil sin compromiso',
      highlight: 'Satisfacción 100%',
      link: '/boutique',
    },
    {
      icon: '🏷️',
      badge: 'OFERTA FLASH DE LANZAMIENTO',
      text: 'Descuentos exclusivos aplicados automáticamente',
      highlight: 'Ahorro Inmediato',
      link: '/boutique',
    },
  ]

  const marqueeItems = useMemo(() => {
    // Répéter les arguments promotionnels pour un défilement infini et continu
    return [...PROMO_ARGUMENTS, ...PROMO_ARGUMENTS]
  }, [])

  return (
    <>
      <div className="announcement-marquee-wrapper" aria-label="Promociones y garantías">
        <div className="announcement-marquee-track">
          {marqueeItems.map((item, idx) => (
            <div key={`promo-${idx}`} className="announcement-item-wrapper">
              <Link href={item.link} className="announcement-promo-chip" title="Ver ofertas en tienda">
                <span className="announcement-promo-badge">
                  <span aria-hidden="true">{item.icon}</span>
                  <span>{item.badge}</span>
                </span>
                <span className="announcement-promo-text">{item.text}</span>
                {item.highlight && (
                  <span className="announcement-promo-highlight">{item.highlight}</span>
                )}
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
          aria-label={menuOpen ? 'Cerrar el menú' : 'Abrir el menú'}
        >
          <span className="menu-icon-bars" aria-hidden="true">
            <span className={`bar ${menuOpen ? 'bar-open-1' : ''}`} />
            <span className={`bar ${menuOpen ? 'bar-open-2' : ''}`} />
          </span>
          <span className="menu-text">{menuOpen ? 'Cerrar' : 'Menú'}</span>
        </button>

        <Link href="/" className="brand">
          {settings.siteName || 'MERCATUM'}
        </Link>

        <nav className={`nav ${menuOpen ? 'nav-open' : ''}`} aria-label="Navegación principal">
          <div className="nav-links mobile-nav-links">
            <Link
              href="/"
              className={`nav-link ${pathname === '/' ? 'nav-active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              Inicio
            </Link>
            <Link
              href="/boutique"
              className={`nav-link ${pathname === '/boutique' ? 'nav-active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              La Tienda
            </Link>
            <Link
              href="/#histoire"
              className="nav-link"
              onClick={() => setMenuOpen(false)}
            >
              Nuestra Filosofía
            </Link>
            <Link
              href="/#nouveautes"
              className="nav-link"
              onClick={() => setMenuOpen(false)}
            >
              Novedades
            </Link>
          </div>
          <div className="mobile-nav-cta">
            <Link
              href="/boutique"
              className="button dark mobile-menu-buy-btn"
              onClick={() => setMenuOpen(false)}
            >
              Acceder a la tienda <span>→</span>
            </Link>
          </div>
        </nav>

        <div className="header-actions">
          <Link href="/boutique" className="header-buy-btn">
            Comprar Ahora
          </Link>
          <button
            onClick={onOpenCart}
            className="header-cart-btn"
            aria-label="Cesta"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <span style={{ fontSize: '13px', lineHeight: 1 }}>🛒</span>
            <span>Cesta</span>
            <span className="cart-badge-pill">({cartCount})</span>
          </button>
        </div>
      </header>
    </>
  )
}
