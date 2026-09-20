'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CheckoutModal from '@/components/CheckoutModal'
import ProductMediaCarousel from '@/components/ProductMediaCarousel'
import { PRODUCTS, CATEGORIES, Product, stripImagesFromDescription, isVideoUrl } from '@/lib/products'
import { getProducts, saveProductsBulk, getSiteSettings, DEFAULT_SETTINGS, type SiteSettings } from '@/lib/store'
import { fetchProductsFromDb, fetchSettingsFromDb, subscribeToProductsChanges } from '@/lib/supabaseService'
import { getClientCachedProducts } from '@/lib/clientCache'
import { searchAndFilterProducts } from '@/lib/searchUtils'

export default function BoutiquePage() {
  const [productsList, setProductsList] = useState<Product[]>(PRODUCTS)
  const [selectedCategory, setSelectedCategory] = useState('Todos los productos')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating'>('featured')
  const [visibleCount, setVisibleCount] = useState(24)
  const [cartCount, setCartCount] = useState(0)
  const [buyingProduct, setBuyingProduct] = useState<Product | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS)

  const tabsRef = useRef<HTMLDivElement>(null)

  const scrollTabs = (direction: 'left' | 'right') => {
    if (tabsRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260
      tabsRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  useEffect(() => {
    // 1. Lire le filtre catégorie passé par l'URL (ex: ?cat=Maison & Décoration)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const catParam = params.get('cat')
      if (catParam) {
        setSelectedCategory(catParam)
      }
    }

    const localProducts = getProducts()
    setProductsList(localProducts)
    setSettings(getSiteSettings())

    // Cache IndexedDB ultra-rapide (< 10ms) pour restaurer immédiatement la boutique
    getClientCachedProducts().then((cached) => {
      if (cached && cached.length > 0) {
        setProductsList(cached)
      }
    }).catch(() => {})

    fetchSettingsFromDb().then((s) => {
      if (s) setSettings(s)
    }).catch(() => {})

    // 2. Chargement direct depuis le cache / Supabase sans blocage
    const loadProducts = () => {
      fetchProductsFromDb(false).then((dbProducts) => {
        if (dbProducts && dbProducts.length > 0) {
          saveProductsBulk(dbProducts)
          const merged = new Map<string, Product>()
          const defaultMap = new Map<string, Product>()
          PRODUCTS.forEach((p) => defaultMap.set(p.id, p))

          dbProducts.forEach((p) => {
            const def = defaultMap.get(p.id)
            const chosenMain = (p.image || def?.image || '').trim()
            const rawImages = (p.images && p.images.length > 0)
              ? p.images
              : (def?.images && def.images.length > 0 ? def.images : (chosenMain ? [chosenMain] : []))
            const rawMedia = (p.media && p.media.length > 0)
              ? p.media
              : (def?.media && def.media.length > 0 ? def.media : rawImages.map((u) => ({ url: u, type: isVideoUrl(u) ? 'video' as const : 'image' as const })))

            const orderedImages = chosenMain
              ? [chosenMain, ...rawImages.filter((u) => u !== chosenMain)]
              : rawImages

            merged.set(p.id, {
              ...(def || {}),
              ...p,
              image: chosenMain,
              images: orderedImages,
              media: rawMedia,
            })
          })

          // Intégrer également les créations locales en mémoire pour ne perdre aucun produit
          const localItems = getProducts()
          localItems.forEach((lp) => {
            if (lp && lp.id && !merged.has(lp.id)) {
              merged.set(lp.id, lp)
            }
          })

          setProductsList(Array.from(merged.values()))
        }
      }).catch(() => {})
    }

    loadProducts()

    // 3. Écoute Supabase Realtime + Événements locaux : intègre tout nouveau produit dès son ajout
    const handleUpdate = () => {
      loadProducts()
    }
    const unsubscribe = subscribeToProductsChanges(handleUpdate)
    window.addEventListener('mercatum:products_updated', handleUpdate)
    window.addEventListener('storage', handleUpdate)

    return () => {
      unsubscribe()
      window.removeEventListener('mercatum:products_updated', handleUpdate)
      window.removeEventListener('storage', handleUpdate)
    }
  }, [])

  const categories = useMemo(() => {
    const all = [
      ...CATEGORIES,
      ...productsList.map((p) => p.category).filter(Boolean),
    ]
    const unique: string[] = []
    const seen = new Set<string>()
    for (const c of all) {
      const clean = c.trim()
      if (!clean) continue
      const lower = clean.toLowerCase()
      if (!seen.has(lower)) {
        seen.add(lower)
        unique.push(clean)
      }
    }
    return unique
  }, [productsList])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleAddToCart = (product: Product) => {
    setCartCount((c) => c + 1)
    showToast(`« ${product.name} » añadido a la cesta !`)
  }

  const handleBuyNow = (product: Product) => {
    setBuyingProduct(product)
  }

  const handleCheckoutSuccess = (product: Product) => {
    setCartCount((c) => c + 1)
    showToast(`¡Pedido confirmado para ${product.name}! 🎉`)
  }

  const normalizeCat = (cat: string) =>
    (cat || '')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()

  const { filteredProducts, isSearchedGlobally } = useMemo(() => {
    const { products, searchedGlobally } = searchAndFilterProducts(
      productsList,
      searchQuery,
      selectedCategory
    )

    const sorted = [...products].sort((a, b) => {
      if (sortBy === 'price-asc') return a.rawPrice - b.rawPrice
      if (sortBy === 'price-desc') return b.rawPrice - a.rawPrice
      if (sortBy === 'rating') return b.rating - a.rating
      return 0
    })

    return { filteredProducts: sorted, isSearchedGlobally: searchedGlobally }
  }, [productsList, selectedCategory, searchQuery, sortBy])

  useEffect(() => {
    setVisibleCount(24)
  }, [selectedCategory, searchQuery, sortBy])

  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount)
  }, [filteredProducts, visibleCount])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    const elem = document.getElementById('boutique-products-grid')
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <main className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Toast Notification */}
      {toast && (
        <div className="toast-notification" role="status" aria-live="polite">
          <span>✓</span> {toast}
        </div>
      )}

      {/* Shared Navbar */}
      <Navbar
        cartCount={cartCount}
        onOpenCart={() => showToast(`Su cesta contiene ${cartCount} artículo(s)`)}
      />

      {/* Boutique Header Banner - Compact & Raffiné */}
      <section className="boutique-hero">
        <div className="boutique-hero-content">
          <div className="boutique-hero-header-line">
            <span className="eyebrow">{settings.siteName || 'MERCATUM'} · El Arte de Vivir</span>
          </div>
          <h1>La Tienda</h1>
          <p className="boutique-subtitle">
            Mobiliario de autor, electrodomésticos de excepción, estufas y rituales de bienestar para su hogar.
          </p>
        </div>
      </section>

      {/* Controls Bar: Categories Slider, Search, Sort */}
      <section className="boutique-controls-section">
        <div className="boutique-controls-container">
          {/* Category Horizontal Rail with Nav Arrows */}
          <div className="category-tabs-wrapper">
            <button
              type="button"
              className="category-tab-scroll-btn left"
              onClick={() => scrollTabs('left')}
              title="Categorías anteriores"
              aria-label="Categorías anteriores"
            >
              ‹
            </button>
            <div ref={tabsRef} className="category-tabs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`category-tab-btn ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="category-tab-scroll-btn right"
              onClick={() => scrollTabs('right')}
              title="Categorías siguientes"
              aria-label="Categorías siguientes"
            >
              ›
            </button>
          </div>

          {/* Search & Sort Row */}
          <div className="search-sort-row">
            <form className="search-form" onSubmit={handleSearchSubmit}>
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Buscar (estufa, horno, sofá, crema, perfume...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Buscar un producto"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="clear-search"
                    onClick={() => setSearchQuery('')}
                    title="Borrar búsqueda"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button type="submit" className="search-submit-btn">
                Buscar
              </button>
            </form>

            <div className="category-dropdown-quick">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                aria-label="Filtrar por categoría"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="sort-box">
              <label>Ordenar por :</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="featured">Recomendados</option>
                <option value="rating">Mejor valorados (★)</option>
                <option value="price-asc">Precio : menor a mayor</option>
                <option value="price-desc">Precio : mayor a menor</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="boutique-grid-section flex-1">
        <div className="boutique-grid-container">
          <div id="boutique-products-grid" className="boutique-results-count">
            <div className="results-count-text">
              <span><strong>{filteredProducts.length}</strong> producto(s) encontrado(s)</span>
              {searchQuery.trim() && (
                <span className="search-query-tag">
                  para « <strong>{searchQuery.trim()}</strong> »
                </span>
              )}
            </div>

            <div className="active-filters-group">
              {isSearchedGlobally && (
                <span className="global-search-pill" title="Búsqueda ampliada a toda la tienda para encontrar su artículo">
                  🌐 Resultado ampliado a toda la tienda
                </span>
              )}
              {selectedCategory !== 'Todos los productos' && selectedCategory !== 'Tous les produits' && !isSearchedGlobally && (
                <span className="current-filter-badge">
                  Categoría : <strong>{selectedCategory}</strong>
                  <button type="button" onClick={() => setSelectedCategory('Todos los productos')}>✕</button>
                </span>
              )}
              {(searchQuery.trim() || (selectedCategory !== 'Todos los productos' && selectedCategory !== 'Tous les produits')) && (
                <button
                  type="button"
                  className="clear-search-btn"
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedCategory('Todos los productos')
                  }}
                >
                  Borrar filtros ✕
                </button>
              )}
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="empty-results">
              <p className="empty-results-title">
                Ningún producto coincide con « <strong>{searchQuery}</strong> ».
              </p>
              <p className="empty-results-hint">
                💡 Pruebe con términos más generales (ej : <em>horno, estufa, sofá, mesa, crema, perfume, mueble</em>).
              </p>
              <button
                type="button"
                className="button dark"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('Todos los productos')
                }}
              >
                Ver toda la tienda ({productsList.length} artículos)
              </button>
            </div>
          ) : (
            <div className="product-grid">
              {displayedProducts.map((product) => (
                <article className="product boutique-product-card" key={product.id}>
                  <Link href={`/produit/${product.id}`} className="block relative" style={{ cursor: 'pointer' }}>
                    <div className="product-image">
                      <ProductMediaCarousel
                        media={product.media}
                        images={product.images}
                        fallbackImage={product.image}
                        alt={product.name}
                        aspectRatio="unset"
                        className="h-full"
                        showBadge={product.tag}
                      />
                    </div>
                  </Link>

                  <div className="product-meta">
                    <div>
                      <span className="product-category-sub">{product.category}</span>
                      <h3>
                        <Link href={`/produit/${product.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                          {product.name}
                        </Link>
                      </h3>
                      <p className="product-desc">{stripImagesFromDescription(product.description)}</p>
                      <div className="product-rating">
                        <span className="stars">★★★★★</span>
                        <span className="rating-num">{product.rating} ({product.reviewsCount})</span>
                      </div>
                    </div>
                    <strong className="product-price-tag">{product.price}</strong>
                  </div>

                  <div className="boutique-card-actions">
                    <Link
                      href={`/produit/${product.id}`}
                      className="buy-now-card-btn"
                      style={{ textAlign: 'center', background: 'var(--foreground)', color: 'var(--background)' }}
                    >
                      Comprar Ahora ⚡
                    </Link>
                    <button
                      className="add-cart-outline-btn"
                      onClick={() => handleAddToCart(product)}
                      aria-label="Añadir a la cesta"
                    >
                      Añadir a la cesta +
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          {filteredProducts.length > visibleCount && (
            <div style={{ textAlign: 'center', marginTop: '48px', marginBottom: '32px' }}>
              <button
                type="button"
                className="button dark"
                onClick={() => setVisibleCount((prev) => prev + 24)}
                style={{ padding: '15px 36px', fontSize: '15px', borderRadius: '9999px', cursor: 'pointer' }}
              >
                Ver más productos ({displayedProducts.length} de {filteredProducts.length}) ↓
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Shared Footer */}
      <Footer />

      {/* Checkout Modal */}
      <CheckoutModal
        product={buyingProduct}
        onClose={() => setBuyingProduct(null)}
        onSuccess={handleCheckoutSuccess}
      />
    </main>
  )
}
