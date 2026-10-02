'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import { Search, Heart, ShoppingBag, Menu, X } from 'lucide-react'
import { getSiteSettings, getProducts, saveSiteSettings, DEFAULT_SETTINGS, type SiteSettings } from '@/lib/store'
import { PRODUCTS, Product } from '@/lib/products'
import { fetchProductsFromDb, fetchSettingsFromDb, subscribeToProductsChanges } from '@/lib/supabaseService'
import { getCartCount, clearCart } from '@/lib/cart'
import CartModal from '@/components/CartModal'
import CheckoutModal from '@/components/CheckoutModal'

interface NavbarProps {
  cartCount?: number
  onOpenCart?: () => void
}

export default function Navbar({ cartCount, onOpenCart }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [productsList, setProductsList] = useState<Product[]>(PRODUCTS)
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)
  const [internalCartCount, setInternalCartCount] = useState<number>(0)
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [checkoutProduct, setCheckoutProduct] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const pathname = usePathname()
  const router = useRouter()
  const isHomePage = pathname === '/'

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = searchQuery.trim()
    if (trimmed) {
      if (typeof window !== 'undefined') {
        window.location.href = `/boutique?q=${encodeURIComponent(trimmed)}`
      } else {
        router.push(`/boutique?q=${encodeURIComponent(trimmed)}`)
      }
    } else {
      if (typeof window !== 'undefined') {
        window.location.href = '/boutique'
      } else {
        router.push('/boutique')
      }
    }
  }

  const refreshCartCount = () => {
    setInternalCartCount(getCartCount())
  }

  useEffect(() => {
    refreshCartCount()
    const local = getProducts()
    if (local && local.length > 0) {
      setProductsList(local)
    }
    setSettings(getSiteSettings())
    fetchSettingsFromDb().then((s) => {
      if (s) {
        setSettings(s)
        saveSiteSettings(s)
      }
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
    window.addEventListener('mercatum:cart_updated', refreshCartCount)
    window.addEventListener('storage', refreshCartCount)

    const handleOpenCartEvent = () => {
      setIsCartOpen(true)
    }
    window.addEventListener('mercatum:open_cart', handleOpenCartEvent)

    return () => {
      unsubscribe()
      window.removeEventListener('mercatum:products_updated', loadProducts)
      window.removeEventListener('storage', loadProducts)
      window.removeEventListener('mercatum:cart_updated', refreshCartCount)
      window.removeEventListener('storage', refreshCartCount)
      window.removeEventListener('mercatum:open_cart', handleOpenCartEvent)
    }
  }, [])

  const displayCartCount = typeof cartCount === 'number'
    ? Math.max(cartCount, internalCartCount)
    : internalCartCount

  const handleCartClick = () => {
    setIsCartOpen(true)
    if (onOpenCart) {
      onOpenCart()
    }
  }

  const handleBuyNowClick = () => {
    if (displayCartCount > 0) {
      setIsCartOpen(true)
    } else {
      if (pathname === '/boutique') {
        const grid = document.getElementById('boutique-products-grid') || document.getElementById('tiendas-selection')
        if (grid) {
          grid.scrollIntoView({ behavior: 'smooth', block: 'start' })
        } else {
          window.scrollTo({ top: 400, behavior: 'smooth' })
        }
      } else {
        router.push('/boutique')
      }
    }
  }

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
      {isHomePage ? (
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-stone-200 px-4 py-2.5 sm:py-3 shadow-sm transition-all duration-300">
          <div className="max-w-7xl mx-auto">
            {/* Ligne 1: Menu - Logo MERCATUM - Favoris - Cesta */}
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="text-stone-900 hover:text-stone-600 transition p-1 flex items-center justify-center cursor-pointer bg-transparent border-0"
                aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              >
                {menuOpen ? <X className="w-6 h-6 text-stone-900 stroke-[2]" /> : <Menu className="w-6 h-6 text-stone-900 stroke-[2]" />}
              </button>

              <Link href="/" className="brand-home flex items-center">
                <span className="font-serif italic font-bold tracking-widest text-xl sm:text-2xl text-stone-950 select-none drop-shadow-none">
                  MERCATUM
                </span>
              </Link>

              <div className="flex items-center gap-3 sm:gap-4 text-stone-900">
                <Link href="/boutique" className="text-stone-900 hover:text-stone-600 transition p-1" title="Favoritos">
                  <Heart className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.8]" />
                </Link>
                <button
                  type="button"
                  onClick={handleCartClick}
                  className="relative text-stone-900 hover:text-stone-600 transition p-1 cursor-pointer bg-transparent border-0"
                  title="Cesta"
                  aria-label="Cesta"
                >
                  <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.8]" />
                  {displayCartCount > 0 && (
                    <span className="absolute -top-1 -right-1.5 bg-amber-500 text-stone-950 text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center shadow">
                      {displayCartCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Ligne 2: Barre de recherche pilule avec bouton rond loupe */}
            <form
              action="/boutique"
              method="GET"
              onSubmit={handleSearchSubmit}
              className="mt-2.5 max-w-xl mx-auto w-full relative flex items-center rounded-full border border-stone-300 bg-stone-50/90 backdrop-blur-md px-4 py-1.5 sm:py-2 shadow-inner transition hover:border-stone-400 focus-within:border-stone-900 focus-within:bg-white"
            >
              <input
                type="text"
                name="q"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="¿Qué estás buscando?"
                className="w-full bg-transparent text-stone-900 placeholder-stone-500 text-xs sm:text-sm font-normal outline-none pr-9 tracking-wide"
              />
              <button
                type="submit"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-stone-900 text-white flex items-center justify-center shrink-0 shadow hover:bg-stone-800 transition cursor-pointer"
                title="Buscar"
                aria-label="Buscar"
              >
                <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white stroke-[2.5]" />
              </button>
            </form>
          </div>
        </header>
      ) : (
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

          <Link href="/" className="brand" style={{ display: 'flex', alignItems: 'center' }}>
            <img src="/logo.jpg" alt="MERCATUM Logo" style={{ height: '40px', objectFit: 'contain' }} />
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
              <button
                type="button"
                className="button dark mobile-menu-buy-btn w-full"
                onClick={() => {
                  setMenuOpen(false)
                  handleBuyNowClick()
                }}
                style={{ cursor: 'pointer', textAlign: 'center' }}
              >
                Comprar Ahora / Tienda <span>→</span>
              </button>
            </div>
          </nav>

          <div className="header-actions">
            <button
              type="button"
              onClick={handleBuyNowClick}
              className="header-buy-btn"
              style={{ cursor: 'pointer', border: 'none' }}
            >
              Comprar Ahora
            </button>
            <button
              type="button"
              onClick={handleCartClick}
              className="header-cart-btn"
              aria-label="Cesta"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            >
              <span style={{ fontSize: '13px', lineHeight: 1 }}>🛒</span>
              <span>Cesta</span>
              <span className="cart-badge-pill">({displayCartCount})</span>
            </button>
          </div>
        </header>
      )}

      {/* Slide-out Navigation Drawer (Mobile & Desktop) */}
      {menuOpen && (
        <div className="fixed inset-0 z-[9999] flex" aria-modal="true" role="dialog">
          {/* Dark Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Panel */}
          <div className="relative w-full max-w-xs sm:max-w-sm bg-[#141814] text-[#f4f0e9] h-full shadow-2xl z-10 flex flex-col justify-between overflow-y-auto border-r border-white/10 animate-in slide-in-from-left duration-300">
            <div className="p-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-5 border-b border-white/10">
                <Link
                  href="/"
                  onClick={() => setMenuOpen(false)}
                  className="font-serif italic font-bold tracking-widest text-xl text-white select-none"
                >
                  MERCATUM
                </Link>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="w-9 h-9 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition cursor-pointer border-0"
                  aria-label="Cerrar menú"
                >
                  <X className="w-5 h-5 text-white stroke-[2.5]" />
                </button>
              </div>

              {/* Navigation Categories */}
              <div className="mt-6 flex flex-col gap-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-2 px-3">
                  Navegación &amp; Colecciones
                </p>
                <Link
                  href="/"
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition ${
                    pathname === '/' ? 'bg-white/15 text-white font-bold' : 'text-stone-200 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>🏠 Inicio</span>
                  <span className="text-xs text-white/50">→</span>
                </Link>
                <Link
                  href="/boutique"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium text-stone-200 hover:bg-white/10 hover:text-white transition"
                >
                  <span>🛍️ Toda la Tienda</span>
                  <span className="text-xs text-white/50">→</span>
                </Link>
                <Link
                  href="/boutique?cat=Placa%20inducci%C3%B3n"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium text-stone-200 hover:bg-white/10 hover:text-white transition"
                >
                  <span>🔥 Electrodomésticos &amp; Placas</span>
                  <span className="text-xs text-white/50">→</span>
                </Link>
                <Link
                  href="/boutique?cat=HORNOS"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium text-stone-200 hover:bg-white/10 hover:text-white transition"
                >
                  <span>🍳 Hornos Pirolíticos</span>
                  <span className="text-xs text-white/50">→</span>
                </Link>
                <Link
                  href="/boutique?cat=Alta%20Cosm%C3%A9tica%20%26%20Cuidado%20Facial"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium text-stone-200 hover:bg-white/10 hover:text-white transition"
                >
                  <span>✨ Belleza &amp; Cosmética</span>
                  <span className="text-xs text-white/50">→</span>
                </Link>
                <Link
                  href="/boutique?cat=Mobiliario%20%26%20Decoraci%C3%B3n"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium text-stone-200 hover:bg-white/10 hover:text-white transition"
                >
                  <span>🛋️ Mobiliario &amp; Decoración</span>
                  <span className="text-xs text-white/50">→</span>
                </Link>
                <Link
                  href="/boutique?cat=Chimenea"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium text-stone-200 hover:bg-white/10 hover:text-white transition"
                >
                  <span>🪵 Chimeneas &amp; Fuego</span>
                  <span className="text-xs text-white/50">→</span>
                </Link>
                <Link
                  href="/boutique?cat=Colchones"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium text-stone-200 hover:bg-white/10 hover:text-white transition"
                >
                  <span>🌙 Colchones &amp; Descanso</span>
                  <span className="text-xs text-white/50">→</span>
                </Link>
                <Link
                  href="/#histoire"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium text-stone-200 hover:bg-white/10 hover:text-white transition"
                >
                  <span>🌿 Nuestra Filosofía</span>
                  <span className="text-xs text-white/50">→</span>
                </Link>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-6 border-t border-white/10 bg-black/20 flex flex-col gap-3">
              <Link
                href="/boutique"
                onClick={() => setMenuOpen(false)}
                className="w-full py-3 bg-white text-stone-900 rounded-xl text-center font-bold text-sm hover:bg-stone-100 transition shadow-lg flex items-center justify-center gap-2"
              >
                <span>Acceder a la Tienda</span>
                <span>→</span>
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  setIsCartOpen(true)
                }}
                className="w-full py-2.5 bg-white/10 text-white rounded-xl text-center font-medium text-xs hover:bg-white/20 transition flex items-center justify-center gap-2 border-0 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-white" />
                <span>Ver mi Cesta ({displayCartCount})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slide-in Cart Drawer */}
      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCheckout={(consolidated) => {
          setIsCartOpen(false)
          setCheckoutProduct(consolidated)
        }}
      />

      {/* Bank Transfer Checkout Modal when triggered from Cart */}
      {checkoutProduct && (
        <CheckoutModal
          product={checkoutProduct}
          initialQuantity={1}
          onClose={() => setCheckoutProduct(null)}
          onSuccess={() => {
            clearCart()
            setCheckoutProduct(null)
          }}
        />
      )}
    </>
  )
}
