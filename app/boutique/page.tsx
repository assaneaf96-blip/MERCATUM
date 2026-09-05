'use client'

import { useState, useMemo, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CheckoutModal from '@/components/CheckoutModal'
import ProductMediaCarousel from '@/components/ProductMediaCarousel'
import { PRODUCTS, CATEGORIES, Product } from '@/lib/products'
import { getProducts } from '@/lib/store'

export default function BoutiquePage() {
  const [productsList, setProductsList] = useState<Product[]>(PRODUCTS)
  const [selectedCategory, setSelectedCategory] = useState('Tous les produits')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'rating'>('featured')
  const [cartCount, setCartCount] = useState(0)
  const [buyingProduct, setBuyingProduct] = useState<Product | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    setProductsList(getProducts())
  }, [])

  const categories = useMemo(() => {
    const customCats = productsList.map((p) => p.category)
    const set = new Set([...CATEGORIES, ...customCats])
    return Array.from(set)
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

  const filteredProducts = useMemo(() => {
    return productsList
      .filter((p) => {
        const matchCategory =
          selectedCategory === 'Tous les produits' || p.category === selectedCategory
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

      {/* Boutique Header Banner */}
      <section className="boutique-hero">
        <div className="boutique-hero-content">
          <p className="eyebrow">Le Catalogue Maison Lune</p>
          <h1>La Boutique</h1>
          <p className="boutique-subtitle">
            Explorez notre sélection artisanale de soins botaniques, bougies coulées à la main et objets essentiels. Conçus pour durer et embellir votre quotidien.
          </p>
        </div>
      </section>

      {/* Controls Bar: Categories, Search, Sort */}
      <section className="boutique-controls-section">
        <div className="boutique-controls-container">
          {/* Category Tabs */}
          <div className="category-tabs">
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

          {/* Search & Sort Row */}
          <div className="search-sort-row">
            <div className="search-box">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Rechercher un soin, une bougie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="clear-search" onClick={() => setSearchQuery('')}>✕</button>
              )}
            </div>

            <div className="sort-box">
              <label>Trier par :</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="featured">Sélection recommandée</option>
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
                  <div className="product-image">
                    <ProductMediaCarousel
                      media={product.media}
                      images={product.images}
                      fallbackImage={product.image}
                      alt={product.name}
                      showBadge={product.tag}
                    />
                    <div className="product-overlay-buttons">
                      <button
                        className="quick-add"
                        onClick={() => handleAddToCart(product)}
                      >
                        Ajouter au panier +
                      </button>
                      <button
                        className="quick-buy"
                        onClick={() => handleBuyNow(product)}
                      >
                        Acheter maintenant ⚡
                      </button>
                    </div>
                  </div>

                  <div className="product-meta">
                    <div>
                      <span className="product-category-sub">{product.category}</span>
                      <h3>{product.name}</h3>
                      <p className="product-desc">{product.description}</p>
                      <div className="product-rating">
                        <span className="stars">★★★★★</span>
                        <span className="rating-num">{product.rating} ({product.reviewsCount})</span>
                      </div>
                    </div>
                    <strong className="product-price-tag">{product.price}</strong>
                  </div>

                  <div className="boutique-card-actions">
                    <button
                      className="buy-now-card-btn"
                      onClick={() => handleBuyNow(product)}
                    >
                      Acheter maintenant — {product.price}
                    </button>
                    <button
                      className="add-cart-outline-btn"
                      onClick={() => handleAddToCart(product)}
                      title="Ajouter au panier"
                    >
                      🛒
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
