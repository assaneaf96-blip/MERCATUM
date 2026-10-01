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
    if (searchQuery.trim()) {
      router.push(`/boutique?q=${encodeURIComponent(searchQuery.trim())}`)
    } else {
      router.push('/boutique')
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
        <header className="sticky top-0 z-50 bg-[#121612]/95 backdrop-blur-md border-b border-white/10 px-4 py-2.5 sm:py-3 shadow-md transition-all duration-300">
          <div className="max-w-7xl mx-auto">
            {/* Ligne 1: Menu - Logo MERCATUM - Compte - Favoris - Cesta */}
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setMenuOpen(!menuOpen)}
                className="text-white hover:opacity-80 transition p-1 flex items-center justify-center cursor-pointer bg-transparent border-0"
                aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              >
                {menuOpen ? <X className="w-6 h-6 text-white stroke-[2]" /> : <Menu className="w-6 h-6 text-white stroke-[2]" />}
              </button>

              <Link href="/" className="brand-home flex items-center">
                <span className="font-serif italic font-bold tracking-widest text-xl sm:text-2xl text-white select-none drop-shadow">
                  MERCATUM
                </span>
              </Link>

              <div className="flex items-center gap-3 sm:gap-4 text-white">
                <Link href="/boutique" className="text-white hover:opacity-80 transition p-1" title="Favoritos">
                  <Heart className="w-5 h-5 sm:w-6 sm:h-6 stroke-[1.8]" />
                </Link>
                <button
                  type="button"
                  onClick={handleCartClick}
                  className="relative text-white hover:opacity-80 transition p-1 cursor-pointer bg-transparent border-0"
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
              onSubmit={handleSearchSubmit}
              className="mt-2.5 max-w-xl mx-auto w-full relative flex items-center rounded-full border border-white/60 bg-black/30 backdrop-blur-md px-4 py-1.5 sm:py-2 shadow-sm transition hover:border-white focus-within:border-white focus-within:bg-black/50"
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="¿Qué estás buscando?"
                className="w-full bg-transparent text-white placeholder-white/80 text-xs sm:text-sm font-normal outline-none pr-9 tracking-wide"
              />
              <button
                type="submit"
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white text-stone-900 flex items-center justify-center shrink-0 shadow hover:bg-stone-100 transition cursor-pointer"
                title="Buscar"
                aria-label="Buscar"
              >
                <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-stone-900 stroke-[2.5]" />
              </button>
            </form>
          </div>

          {/* Menu Drawer */}
          <nav className={`nav ${menuOpen ? 'nav-open' : ''}`} aria-label="Navegación principal">
            <div className="nav-links mobile-nav-links">
              <Link href="/" className="nav-link nav-active" onClick={() => setMenuOpen(false)}>Inicio</Link>
              <Link href="/boutique" className="nav-link" onClick={() => setMenuOpen(false)}>La Tienda</Link>
              <Link href="/boutique?cat=Placa%20inducci%C3%B3n" className="nav-link" onClick={() => setMenuOpen(false)}>Electrodomésticos &amp; Placas</Link>
              <Link href="/boutique?cat=Alta%20Cosm%C3%A9tica%20%26%20Cuidado%20Facial" className="nav-link" onClick={() => setMenuOpen(false)}>Belleza &amp; Cosmética</Link>
              <Link href="/boutique?cat=Mobiliario%20%26%20Decoraci%C3%B3n" className="nav-link" onClick={() => setMenuOpen(false)}>Mobiliario &amp; Decoración</Link>
              <Link href="/#histoire" className="nav-link" onClick={() => setMenuOpen(false)}>Nuestra Filosofía</Link>
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
