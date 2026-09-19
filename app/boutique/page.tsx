'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CheckoutModal from '@/components/CheckoutModal'
import ProductMediaCarousel from '@/components/ProductMediaCarousel'
import { PRODUCTS, CATEGORIES, Product, stripImagesFromDescription } from '@/lib/products'
import { getProducts, saveProductsBulk, getSiteSettings, DEFAULT_SETTINGS, type SiteSettings } from '@/lib/store'
import { fetchProductsFromDb, fetchSettingsFromDb, subscribeToProductsChanges } from '@/lib/supabaseService'
import { getClientCachedProducts } from '@/lib/clientCache'

export default function BoutiquePage() {
  const [productsList, setProductsList] = useState<Product[]>(PRODUCTS)
  const [selectedCategory, setSelectedCategory] = useState('Tous les produits')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating'>('featured')
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
            if (def) {
              const defCount = (def.images?.length || 0) + (def.media?.length || 0)
              const pCount = (p.images?.length || 0) + (p.media?.length || 0)
              if (defCount > pCount) {
                merged.set(p.id, {
                  ...p,
                  image: def.image || p.image,
                  images: def.images && def.images.length > 0 ? def.images : p.images,
                  media: def.media && def.media.length > 0 ? def.media : p.media,
                })
                return
              }
            }
            merged.set(p.id, p)
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
    showToast(`« ${product.name} » ajouté au panier !`)
  }

  const handleBuyNow = (product: Product) => {
    setBuyingProduct(product)
  }

  const handleCheckoutSuccess = (product: Product) => {
    setCartCount((c) => c + 1)
    showToast(`Commande validée pour ${product.name} ! 🎉`)
  }

  const normalizeCat = (cat: string) =>
    (cat || '')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()

  const filteredProducts = useMemo(() => {
    return productsList
      .filter((p) => {
        const matchCategory =
          selectedCategory === 'Tous les produits' ||
          normalizeCat(p.category) === normalizeCat(selectedCategory)
        const matchSearch =
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.type.toLowerCase().includes(searchQuery.toLowerCase())
        return matchCategory && matchSearch
      })
      .sort((a, b) => {
        if (sortBy === 'price-asc') return a.rawPrice - b.rawPrice
        if (sortBy === 'price-desc') return b.rawPrice - a.rawPrice
        if (sortBy === 'rating') return b.rating - a.rating
        return 0
      })
  }, [productsList, selectedCategory, searchQuery, sortBy])

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Toast notification */}
      {toast && (
        <div className="toast-notification">
          <span>✓</span> {toast}
        </div>
      )}

      {/* Shared Navbar */}
      <Navbar
        cartCount={cartCount}
        onOpenCart={() => showToast(`Votre panier contient ${cartCount} article(s)`)}
      />

      {/* Boutique Header Banner - Compact & Raffiné */}
      <section className="boutique-hero">
        <div className="boutique-hero-content">
          <div className="boutique-hero-header-line">
            <span className="eyebrow">{settings.siteName || 'MERCATUM'} · L&apos;Art de Vivre</span>
            <span className="boutique-count-pill">{productsList.length} pièces d&apos;exception</span>
          </div>
          <h1>La Boutique</h1>
          <p className="boutique-subtitle">
            Mobilier de créateur, électroménager d&apos;exception, poêles et rituels de soin pour votre intérieur.
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
              title="Catégories précédentes"
              aria-label="Catégories précédentes"
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
              title="Catégories suivantes"
              aria-label="Catégories suivantes"
            >
              ›
            </button>
          </div>

          {/* Search & Sort Row */}
          <div className="search-sort-row">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Rechercher parmi nos 360+ articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="clear-search" onClick={() => setSearchQuery('')}>✕</button>
              )}
            </div>

            <div className="category-dropdown-quick">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                aria-label="Filtrer par catégorie"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="sort-box">
              <label>Trier :</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="featured">Recommandés</option>
                <option value="rating">Meilleures notes (★)</option>
                <option value="price-asc">Prix : croissant</option>
                <option value="price-desc">Prix : décroissant</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="boutique-grid-section flex-1">
        <div className="boutique-grid-container">
          <div className="boutique-results-count">
            <span>{filteredProducts.length} produit(s) trouvé(s)</span>
            {selectedCategory !== 'Tous les produits' && (
              <span className="current-filter-badge">
                Catégorie : <strong>{selectedCategory}</strong>
                <button onClick={() => setSelectedCategory('Tous les produits')}>✕</button>
              </span>
            )}
          </div>

          {filteredProducts.length === 0 ? (
            <div className="empty-results">
              <p>Aucun produit ne correspond à votre recherche « {searchQuery} ».</p>
              <button
                className="button outline"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('Tous les produits')
                }}
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="product-grid">
              {filteredProducts.map((product) => (
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
                      Acheter maintenant ⚡
                    </Link>
                    <button
                      className="add-cart-outline-btn"
                      onClick={() => handleAddToCart(product)}
                      aria-label="Ajouter au panier"
                    >
                      Ajouter au panier +
                    </button>
                  </div>
                </article>
              ))}
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
