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
import { getClientCachedProducts, getSyncCachedProducts } from '@/lib/clientCache'
import { searchAndFilterProducts } from '@/lib/searchUtils'
import { addToCart } from '@/lib/cart'

export default function BoutiquePage() {
  const [productsList, setProductsList] = useState<Product[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = getSyncCachedProducts()
      if (cached && cached.length > 0) return cached
    }
    return PRODUCTS
  })
  const [selectedCategory, setSelectedCategory] = useState('Todos los productos')
  const [viewMode, setViewMode] = useState<'tiendas' | 'products'>('tiendas')
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
    // 1. Lire le filtre catégorie passé par l'URL (ex: ?cat=Mobiliario & Decoración)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const catParam = params.get('cat')
      if (catParam) {
        setSelectedCategory(catParam)
        setViewMode('products')
      }
    }

    const localProducts = getProducts()
    if (localProducts && localProducts.length > PRODUCTS.length) {
      setProductsList((prev) => (localProducts.length > prev.length ? localProducts : prev))
    }
    setSettings(getSiteSettings())

    // Cache IndexedDB ultra-rapide (< 10ms) pour restaurer immédiatement la boutique
    getClientCachedProducts().then((cached) => {
      if (cached && cached.length > 0) {
        setProductsList((prev) => (cached.length >= prev.length ? cached : prev))
      }
    }).catch(() => {})

    fetchSettingsFromDb().then((s) => {
      if (s) setSettings(s)
    }).catch(() => {})

    // 2. Chargement direct depuis le cache / Supabase sans blocage
    const loadProducts = () => {
      fetchProductsFromDb(true).then((dbProducts) => {
        if (dbProducts && dbProducts.length > 0) {
          saveProductsBulk(dbProducts)
          const merged = new Map<string, Product>()
          // 1. Initialiser avec l'ensemble complet des produits par défaut
          PRODUCTS.forEach((p) => merged.set(p.id, p))

          // 2. Fusionner tous les produits issus de Supabase Cloud
          dbProducts.forEach((p) => {
            const def = merged.get(p.id)
            const chosenMain = (p.image || def?.image || '').trim()
            const pImgs = Array.isArray(p.images) ? p.images.filter(Boolean) : []
            const pMedia = Array.isArray(p.media) ? p.media.filter(Boolean) : []
            const pMediaUrls = pMedia.map((m: any) => (typeof m === 'string' ? m : m?.url)).filter(Boolean)
            const authoritativePImgs = pMediaUrls.length > pImgs.length ? pMediaUrls : pImgs

            const defImgs = Array.isArray(def?.images) ? def.images.filter(Boolean) : []
            const rawImages = authoritativePImgs.length > 1
              ? authoritativePImgs
              : (defImgs.length > 0 ? defImgs : (authoritativePImgs.length > 0 ? authoritativePImgs : (chosenMain ? [chosenMain] : [])))

            const defMedia = Array.isArray(def?.media) ? def.media.filter(Boolean) : []
            const rawMedia = pMedia.length > 1
              ? pMedia
              : (defMedia.length > 0 ? defMedia : rawImages.map((u) => ({ url: u, type: isVideoUrl(u) ? 'video' as const : 'image' as const })))

            const orderedImages = chosenMain
              ? Array.from(new Set([chosenMain, ...rawImages]))
              : rawImages

            merged.set(p.id, {
              ...(def || {}),
              ...p,
              image: chosenMain,
              images: orderedImages,
              media: rawMedia,
            })
          })

          // 3. Intégrer également les créations locales récentes
          const localItems = getProducts()
          localItems.forEach((lp) => {
            if (lp && lp.id) {
              const def = merged.get(lp.id)
              merged.set(lp.id, { ...(def || {}), ...lp })
            }
          })

          setProductsList(Array.from(merged.values()))
        }
      }).catch(() => {})
    }

    loadProducts()

    // 3. Écoute Supabase Realtime + Événements locaux
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

  // Liste des noms uniques de catégories
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

  // Cartes de catégories pour la vue "NUESTROS TIENDAS" (identique à la capture)
  const categoryCards = useMemo(() => {
    const map = new Map<string, { name: string; count: number; image: string }>()

    productsList.forEach((p) => {
      const cat = (p.category || '').trim()
      if (!cat || cat === 'Todos los productos' || cat === 'Tous les produits') return

      const existing = map.get(cat)
      const validImg =
        (!isVideoUrl(p.image) && p.image) ||
        (Array.isArray(p.images) && p.images.find((img) => !isVideoUrl(img))) ||
        ''

      if (!existing) {
        map.set(cat, {
          name: cat,
          count: 1,
          image: validImg || '',
        })
      } else {
        existing.count += 1
        if (!existing.image && validImg) {
          existing.image = validImg
        }
      }
    })

    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [productsList])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleAddToCart = (product: Product) => {
    addToCart(product, 1)
    showToast(`« ${product.name} » añadido a la cesta !`)
  }

  const handleBuyNow = (product: Product) => {
    setBuyingProduct(product)
  }

  const handleCheckoutSuccess = (product: Product) => {
    setCartCount((c) => c + 1)
    showToast(`¡Pedido confirmado para ${product.name}! 🎉`)
  }

  // Filtrage et recherche
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

  const displayedProducts = filteredProducts

  // Quand l'utilisateur fait une recherche textuelle, basculer vers les produits
  const handleSearchChange = (val: string) => {
    setSearchQuery(val)
    if (val.trim()) {
      setViewMode('products')
    }
  }

  const handleCategorySelect = (catName: string) => {
    setSelectedCategory(catName)
    setViewMode('products')
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 380, behavior: 'smooth' })
    }
  }

  const handleBackToTiendas = () => {
    setSelectedCategory('Todos los productos')
    setSearchQuery('')
    setViewMode('tiendas')
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setViewMode('products')
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    const elem = document.getElementById('boutique-products-grid')
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const whatsappPhone = (settings.contactPhone || '+34910000000').replace(/[^0-9]/g, '')

  return (
    <main className="min-h-screen flex flex-col bg-[#faf8f5] text-stone-900">
      {/* Toast Notification */}
      {toast && (
        <div className="toast-notification" role="status" aria-live="polite">
          <span>✓</span> {toast}
        </div>
      )}

      {/* Shared Navbar */}
      <Navbar />

      {/* Boutique Header Banner - Couleur initiale raffinée (#ede7dc) */}
      <section className="bg-[#ede7dc] text-[#1c221d] pt-8 pb-7 px-4 text-center border-b border-[#d8d0c2] shadow-sm relative overflow-hidden">
        <div className="max-w-3xl mx-auto space-y-2.5 relative z-10">
          {/* Breadcrumb style Inicio / NUESTRAS TIENDAS */}
          <nav className="text-xs uppercase tracking-[0.2em] text-[#636c5f] flex items-center justify-center gap-2 mb-1.5 font-medium">
            <Link href="/" className="hover:text-[#1c221d] transition underline-offset-4 hover:underline">
              Inicio
            </Link>
            <span className="opacity-40">/</span>
            <span className="text-[#1c221d] font-bold">NUESTRAS TIENDAS</span>
          </nav>

          {/* Eyebrow demandé */}
          <div className="inline-block px-3.5 py-1 rounded-full bg-black/5 border border-black/10 text-[11px] tracking-[0.22em] uppercase text-[#444a42] font-semibold">
            {settings.siteName || 'MERCATUM'} · El Arte de Vivir
          </div>

          {/* Grand Titre */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-wider text-[#1c221d] font-sans">
            NUESTRAS TIENDAS
          </h1>
          <p className="text-base sm:text-lg font-serif italic text-[#4f574d] -mt-1">
            La Tienda
          </p>

          {/* Sous-titre officiel maintenu */}
          <p className="text-xs sm:text-sm text-[#5a6258] max-w-xl mx-auto leading-relaxed pt-0.5">
            Mobiliario de autor, electrodomésticos de excepción, estufas y rituales de bienestar para su hogar.
          </p>
        </div>
      </section>

      {/* Barre de navigation & filtres */}
      <section className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-sm py-3 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          
          {/* Sélecteur de vue : NUESTRAS TIENDAS vs TOUS LES PRODUITS */}
          <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-xl border border-stone-200 w-full md:w-auto">
            <button
              type="button"
              onClick={() => {
                setViewMode('tiendas')
                setSelectedCategory('Todos los productos')
                setSearchQuery('')
              }}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                viewMode === 'tiendas' && !searchQuery
                  ? 'bg-[#1c221d] text-[#f4f0e9] shadow'
                  : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <span>🏬</span>
              <span>Nuestras Tiendas ({categoryCards.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('products')}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                viewMode === 'products' || searchQuery
                  ? 'bg-[#1c221d] text-[#f4f0e9] shadow'
                  : 'text-stone-700 hover:text-stone-900 hover:bg-stone-200/60'
              }`}
            >
              <span>📦</span>
              <span>Todos los Productos ({productsList.length})</span>
            </button>
          </div>

          {/* Champ de recherche rapide */}
          <form className="w-full md:w-80 relative flex items-center" onSubmit={handleSearchSubmit}>
            <span className="absolute left-3 text-stone-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Buscar electrodomésticos, sofás, estufas..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#1c221d] focus:bg-white transition"
              aria-label="Buscar producto"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-stone-400 hover:text-stone-700 text-xs font-bold"
                title="Borrar búsqueda"
              >
                ✕
              </button>
            )}
          </form>
        </div>
      </section>

      {/* VUE 1 : GRILLE DES CATÉGORIES "NUESTRAS TIENDAS" (IDENTIQUE À LA CAPTURE FOURNIE) */}
      {viewMode === 'tiendas' && !searchQuery && (
        <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex-1 w-full">
          <div className="mb-6 flex items-center justify-between border-b border-stone-200 pb-3">
            <div>
              <h2 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-stone-900">
                Departamentos & Colecciones
              </h2>
              <p className="text-xs text-stone-500">
                Seleccione una tienda para descubrir todas las piezas disponibles
              </p>
            </div>
            <span className="text-xs font-bold bg-stone-200/80 text-stone-700 px-3 py-1 rounded-full">
              {categoryCards.length} Categorías
            </span>
          </div>

          {/* Grille 2 colonnes sur mobile, 3 sur tablette, 4 sur grand écran */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {categoryCards.map((cat) => (
              <button
                key={cat.name}
                type="button"
                onClick={() => handleCategorySelect(cat.name)}
                className="bg-white border border-stone-200 hover:border-stone-400 hover:shadow-lg transition-all duration-200 rounded-xl p-3 sm:p-4 flex flex-col justify-between text-left group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#1c221d]"
              >
                {/* Cadre image produit représentatif */}
                <div className="relative w-full aspect-square bg-[#ffffff] rounded-lg flex items-center justify-center p-3 mb-3 overflow-hidden border border-stone-100">
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      loading="lazy"
                      className="object-contain max-h-full max-w-full drop-shadow-sm group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-4xl text-stone-300">📦</div>
                  )}
                </div>

                {/* Nom et Nombre d'articles */}
                <div className="pt-1">
                  <h3 className="font-bold text-stone-900 text-xs sm:text-sm tracking-wider uppercase leading-snug line-clamp-2 min-h-[2.5rem] flex items-center group-hover:text-amber-900 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-stone-500 font-medium text-xs sm:text-sm mt-1">
                    ({cat.count})
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* VUE 2 : CATALOGUE PRODUITS DE LA CATÉGORIE OU RÉSULTATS DE RECHERCHE */}
      {(viewMode === 'products' || searchQuery) && (
        <section className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex-1 w-full">
          
          {/* En-tête de retour vers "NUESTRAS TIENDAS" */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBackToTiendas}
                className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 border border-stone-300"
              >
                <span>←</span>
                <span>Volver a Nuestras Tiendas</span>
              </button>

              <div className="h-5 w-px bg-stone-200 hidden sm:block" />

              <div>
                <span className="text-xs text-stone-400 uppercase tracking-widest block font-medium">Categoría actual :</span>
                <span className="font-bold text-stone-900 text-sm sm:text-base">
                  {searchQuery ? `Resultados para « ${searchQuery} »` : selectedCategory}
                </span>
              </div>
            </div>

            {/* Tri par prix / avis */}
            <div className="flex items-center gap-2 text-xs">
              <label className="text-stone-500 font-medium hidden sm:inline">Ordenar por :</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-800 font-medium focus:ring-2 focus:ring-[#1c221d] focus:outline-none"
              >
                <option value="featured">Recomendados</option>
                <option value="rating">Mejor valorados (★)</option>
                <option value="price-asc">Precio : menor a mayor</option>
                <option value="price-desc">Precio : mayor a menor</option>
              </select>
            </div>
          </div>

          {/* Rail horizontal de navigation rapide entre catégories */}
          <div className="category-tabs-wrapper mb-6">
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
                  onClick={() => handleCategorySelect(cat)}
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

          {/* Compteur & Filtres actifs */}
          <div id="boutique-products-grid" className="boutique-results-count mb-4">
            <div className="results-count-text text-xs text-stone-600">
              <span><strong>{filteredProducts.length}</strong> producto(s) encontrado(s)</span>
              {searchQuery.trim() && (
                <span className="search-query-tag ml-2">
                  para « <strong>{searchQuery.trim()}</strong> »
                </span>
              )}
            </div>

            <div className="active-filters-group">
              {isSearchedGlobally && (
                <span className="global-search-pill" title="Búsqueda ampliada a toda la tienda para encontrar su artículo">
                  🌐 Búsqueda ampliada
                </span>
              )}
              {selectedCategory !== 'Todos los productos' && selectedCategory !== 'Tous les produits' && !isSearchedGlobally && (
                <span className="current-filter-badge">
                  {selectedCategory}
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

          {/* Grille des Produits */}
          {filteredProducts.length === 0 ? (
            <div className="empty-results py-16 text-center bg-white border border-stone-200 rounded-xl p-8">
              <p className="empty-results-title text-base font-bold text-stone-800 mb-2">
                Ningún producto coincide con « <strong>{searchQuery}</strong> ».
              </p>
              <p className="empty-results-hint text-xs text-stone-500 mb-6">
                💡 Pruebe con términos más generales (ej : <em>horno, estufa, sofá, mesa, crema, perfume</em>).
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  className="px-5 py-2.5 bg-[#1c221d] text-[#f4f0e9] rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-800 transition"
                  onClick={() => {
                    setSearchQuery('')
                    setSelectedCategory('Todos los productos')
                  }}
                >
                  Ver toda la tienda ({productsList.length} artículos)
                </button>
                <button
                  type="button"
                  className="px-5 py-2.5 bg-stone-100 text-stone-800 border border-stone-300 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-stone-200 transition"
                  onClick={handleBackToTiendas}
                >
                  Volver a Nuestras Tiendas
                </button>
              </div>
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
                      🛒 Añadir a la cesta +
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}


        </section>
      )}

      {/* Floating WhatsApp Button (exactement comme dans la capture) */}
      <a
        href={`https://wa.me/${whatsappPhone}?text=${encodeURIComponent('Hola, me gustaría obtener más información sobre los productos de MERCATUM.')}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contactar por WhatsApp"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group focus:outline-none focus:ring-4 focus:ring-[#25D366]/40"
      >
        <svg
          className="w-8 h-8 fill-current drop-shadow"
          viewBox="0 0 24 24"
        >
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.983.536 1.776.793 2.791.793 3.182 0 5.768-2.587 5.768-5.766.001-3.183-2.585-5.779-5.768-5.779zm3.435 8.163c-.144.404-.836.774-1.17.822-.311.045-.71.074-2.146-.521-1.838-.761-3.003-2.646-3.094-2.768-.092-.122-.746-.992-.746-1.892 0-.9.472-1.343.64-1.526.168-.184.368-.23.491-.23.123 0 .245.001.353.007.114.006.267-.043.418.32.155.372.531 1.297.577 1.39.046.092.077.2.015.323-.061.123-.092.2-.184.308-.092.107-.193.24-.276.323-.092.093-.188.194-.081.378.107.184.475.784 1.02 1.268.703.626 1.295.82 1.479.912.184.092.291.077.4-.046.107-.123.46-.537.583-.721.123-.184.246-.153.414-.092.169.061 1.074.507 1.258.599.184.092.307.138.353.215.046.077.046.446-.098.85z" />
          <path d="M12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.662 1.436 5.18L2 22l4.981-1.399C8.423 21.498 10.155 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm0 18.2c-1.63 0-3.15-.47-4.44-1.28l-.32-.2-2.96.83.84-2.88-.21-.33C4.1 14.98 3.6 13.53 3.6 12c0-4.63 3.77-8.4 8.4-8.4 4.63 0 8.4 3.77 8.4 8.4 0 4.63-3.77 8.4-8.4 8.4z" />
        </svg>
      </a>

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
