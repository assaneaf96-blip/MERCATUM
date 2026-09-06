'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CheckoutModal from '@/components/CheckoutModal'
import ProductMediaCarousel from '@/components/ProductMediaCarousel'
import { PRODUCTS, Product } from '@/lib/products'
import { getProducts } from '@/lib/store'
import { fetchProductByIdFromDb, fetchProductsFromDb } from '@/lib/supabaseService'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string)

  const [product, setProduct] = useState<Product | null>(null)
  const [allProducts, setAllProducts] = useState<Product[]>(PRODUCTS)
  const [selectedImage, setSelectedImage] = useState<string>('')
  const [selectedVolume, setSelectedVolume] = useState<string>('100 ml')
  const [quantity, setQuantity] = useState(1)
  const [activeTab, setActiveTab] = useState<'desc' | 'ingredients' | 'application' | 'livraison'>('desc')
  const [cartCount, setCartCount] = useState(0)
  const [buyingProduct, setBuyingProduct] = useState<Product | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!productId) return

    // 1. Chercher dans les produits locaux ou PRODUCTS
    const localList = getProducts()
    setAllProducts(localList)
    const foundLocal = localList.find((p) => p.id === productId) || PRODUCTS.find((p) => p.id === productId)

    if (foundLocal) {
      setProduct(foundLocal)
      setSelectedImage(foundLocal.image || foundLocal.images?.[0] || '')
      setLoading(false)
    }

    // 2. Chercher en direct dans Supabase
    fetchProductByIdFromDb(productId).then((dbProduct) => {
      if (dbProduct) {
        setProduct(dbProduct)
        setSelectedImage(dbProduct.image || dbProduct.images?.[0] || '')
      }
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })

    // Charger tous les produits Supabase pour les recommandations
    fetchProductsFromDb().then((dbList) => {
      if (dbList && dbList.length > 0) {
        const merged = new Map<string, Product>()
        localList.forEach((p) => merged.set(p.id, p))
        dbList.forEach((p) => merged.set(p.id, p))
        setAllProducts(Array.from(merged.values()))
      }
    }).catch(() => {})
  }, [productId])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleAddToCart = () => {
    if (!product) return
    setCartCount((c) => c + quantity)
    showToast(`« ${product.name} » (x${quantity}) ajouté au panier !`)
  }

  const handleBuyNow = () => {
    if (!product) return
    setBuyingProduct(product)
  }

  const handleCheckoutSuccess = (bought: Product) => {
    setCartCount((c) => c + 1)
    showToast(`Commande validée pour ${bought.name} ! 🎉`)
  }

  const galleryImages = useMemo(() => {
    if (!product) return []
    const list: string[] = []
    if (product.image) list.push(product.image)
    if (product.images && product.images.length > 0) {
      product.images.forEach((img) => {
        if (!list.includes(img)) list.push(img)
      })
    }
    if (product.media && product.media.length > 0) {
      product.media.forEach((m) => {
        if (!list.includes(m.url)) list.push(m.url)
      })
    }
    return list.length > 0 ? list : ['/placeholder.svg']
  }, [product])

  const relatedProducts = useMemo(() => {
    return allProducts
      .filter((p) => p.id !== productId)
      .slice(0, 3)
  }, [allProducts, productId])

  if (loading) {
    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-8">
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <p style={{ fontFamily: 'Georgia, serif', fontSize: '20px', letterSpacing: '0.05em' }}>
            Chargement de votre création Maison Lune...
          </p>
        </div>
      </main>
    )
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar cartCount={cartCount} />
        <div style={{ textAlign: 'center', padding: '100px 20px', flex: 1 }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '32px', marginBottom: '16px' }}>
            Création introuvable
          </h1>
          <p style={{ color: '#666', marginBottom: '24px' }}>
            Ce soin ou parfum n'est plus disponible ou a été déplacé.
          </p>
          <Link href="/boutique" className="button dark">
            Retourner à la boutique <span>→</span>
          </Link>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Toast Notification */}
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

      {/* Breadcrumbs */}
      <nav aria-label="Fil d'Ariane" className="pdp-breadcrumb-nav">
        <div className="pdp-breadcrumb-container">
          <Link href="/">Accueil</Link>
          <span className="pdp-sep">/</span>
          <Link href="/boutique">La Boutique</Link>
          <span className="pdp-sep">/</span>
          <span className="pdp-cat-link">{product.category}</span>
          <span className="pdp-sep">/</span>
          <span className="pdp-current-item">{product.name}</span>
        </div>
      </nav>

      {/* Main Product Showcase Section */}
      <section className="pdp-main-section">
        <div className="pdp-container">
          
          {/* Left Column: Visual Showcase Gallery */}
          <div className="pdp-gallery-col">
            <div className="pdp-main-visual-wrapper">
              {product.tag && (
                <span className="pdp-badge-tag">{product.tag}</span>
              )}
              {selectedImage.endsWith('.mp4') || selectedImage.endsWith('.webm') ? (
                <video
                  src={selectedImage}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="pdp-main-img"
                />
              ) : (
                <img
                  src={selectedImage || product.image || '/placeholder.svg'}
                  alt={product.name}
                  className="pdp-main-img"
                />
              )}
            </div>

            {/* Thumbnails Row */}
            {galleryImages.length > 1 && (
              <div className="pdp-thumbnails-strip">
                {galleryImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`pdp-thumb-btn ${selectedImage === imgUrl ? 'active' : ''}`}
                    onClick={() => setSelectedImage(imgUrl)}
                    aria-label={`Afficher la photo ${idx + 1}`}
                  >
                    <img src={imgUrl} alt={`${product.name} vue ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Information, Selection & Order Actions */}
          <div className="pdp-info-col">
            <div className="pdp-info-header">
              <span className="pdp-brand-eyebrow">
                Maison Lune Paris · {product.category}
              </span>
              <h1 className="pdp-title">{product.name}</h1>
              <p className="pdp-type-sub">{product.type}</p>

              {/* Rating & Reviews */}
              <div className="pdp-rating-row">
                <span className="pdp-stars">★★★★★</span>
                <span className="pdp-rating-score">{product.rating}</span>
                <span className="pdp-reviews-count">({product.reviewsCount} avis clientes vérifiés)</span>
              </div>

              {/* Price */}
              <div className="pdp-price-row">
                <span className="pdp-price-tag">{product.price}</span>
                <span className="pdp-tax-note">TTC · Livraison express offerte</span>
              </div>
            </div>

            {/* Volume Selection if applicable */}
            {(product.category.includes('Parfum') || product.name.toLowerCase().includes('parfum') || product.name.toLowerCase().includes('eau')) && (
              <div className="pdp-volume-selector">
                <label className="pdp-selector-label">Contenance : <strong>{selectedVolume}</strong></label>
                <div className="pdp-volume-pills">
                  {['30 ml', '60 ml', '100 ml'].map((vol) => (
                    <button
                      key={vol}
                      type="button"
                      className={`pdp-vol-btn ${selectedVolume === vol ? 'active' : ''}`}
                      onClick={() => setSelectedVolume(vol)}
                    >
                      {vol}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="pdp-quantity-row">
              <label className="pdp-selector-label">Quantité :</label>
              <div className="pdp-quantity-control">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  aria-label="Diminuer la quantité"
                >
                  -
                </button>
                <span>{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  aria-label="Augmenter la quantité"
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pdp-actions-group">
              <button
                type="button"
                className="pdp-primary-buy-btn"
                onClick={handleBuyNow}
              >
                Acheter maintenant — {product.price} ⚡
              </button>
              <button
                type="button"
                className="pdp-secondary-cart-btn"
                onClick={handleAddToCart}
              >
                Ajouter au panier 🛒
              </button>
            </div>

            {/* Trust Reassurance Badges */}
            <div className="pdp-trust-badges">
              <div className="pdp-badge-item">
                <span className="pdp-badge-icon">🚚</span>
                <div>
                  <strong>Livraison Offerte & Suivie</strong>
                  <p>Colissimo remise contre signature sous 24 à 48 heures ouvrées.</p>
                </div>
              </div>
              <div className="pdp-badge-item">
                <span className="pdp-badge-icon">🎁</span>
                <div>
                  <strong>Écrin Cadeau d'Exception</strong>
                  <p>Présenté dans le coffret signature Maison Lune avec 2 échantillons offerts.</p>
                </div>
              </div>
              <div className="pdp-badge-item">
                <span className="pdp-badge-icon">🔒</span>
                <div>
                  <strong>Paiement Sécurisé par Virement</strong>
                  <p>Coordonnées bancaires officielles et confirmation instantanée par email.</p>
                </div>
              </div>
              <div className="pdp-badge-item">
                <span className="pdp-badge-icon">🌿</span>
                <div>
                  <strong>Fabrication Haute Parfumerie & Cosmétique</strong>
                  <p>Conçu et formulé en France avec des matières premières précieuses et durables.</p>
                </div>
              </div>
            </div>

            {/* Detailed Information Accordions */}
            <div className="pdp-accordion-section">
              {/* Tab 1: Description */}
              <div className="pdp-accordion-item">
                <button
                  type="button"
                  className="pdp-accordion-header"
                  onClick={() => setActiveTab(activeTab === 'desc' ? ('' as any) : 'desc')}
                >
                  <span>La Création & Description</span>
                  <span className="pdp-accordion-arrow">{activeTab === 'desc' ? '−' : '+'}</span>
                </button>
                {activeTab === 'desc' && (
                  <div className="pdp-accordion-body">
                    <p style={{ whiteSpace: 'pre-line', lineHeight: '1.7' }}>
                      {product.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Tab 2: Ingredients */}
              <div className="pdp-accordion-item">
                <button
                  type="button"
                  className="pdp-accordion-header"
                  onClick={() => setActiveTab(activeTab === 'ingredients' ? ('' as any) : 'ingredients')}
                >
                  <span>Notes Olfactives & Ingrédients Rares</span>
                  <span className="pdp-accordion-arrow">{activeTab === 'ingredients' ? '−' : '+'}</span>
                </button>
                {activeTab === 'ingredients' && (
                  <div className="pdp-accordion-body">
                    <p style={{ lineHeight: '1.7' }}>
                      <strong>Matières premières d'exception :</strong> Essences pures distillées à Grasse, actifs botaniques sélectionnés à pleine maturité, absolus floraux précieux. Formule sans parabènes, non comédogène et testée sous contrôle dermatologique.
                    </p>
                  </div>
                )}
              </div>

              {/* Tab 3: Application Advice */}
              <div className="pdp-accordion-item">
                <button
                  type="button"
                  className="pdp-accordion-header"
                  onClick={() => setActiveTab(activeTab === 'application' ? ('' as any) : 'application')}
                >
                  <span>Rituel & Conseils d'Application</span>
                  <span className="pdp-accordion-arrow">{activeTab === 'application' ? '−' : '+'}</span>
                </button>
                {activeTab === 'application' && (
                  <div className="pdp-accordion-body">
                    <p style={{ lineHeight: '1.7' }}>
                      Vaporiser généreusement sur les points de pulsation (creux des poignets, cou, décolleté et derrière les oreilles) pour libérer le sillage tout au long de la journée. Pour les soins cosmétiques, appliquer matin et soir sur une peau préalablement nettoyée en massages délicats de l'intérieur vers l'extérieur du visage.
                    </p>
                  </div>
                )}
              </div>

              {/* Tab 4: Delivery & Returns */}
              <div className="pdp-accordion-item">
                <button
                  type="button"
                  className="pdp-accordion-header"
                  onClick={() => setActiveTab(activeTab === 'livraison' ? ('' as any) : 'livraison')}
                >
                  <span>Livraison & Retours sous 30 jours</span>
                  <span className="pdp-accordion-arrow">{activeTab === 'livraison' ? '−' : '+'}</span>
                </button>
                {activeTab === 'livraison' && (
                  <div className="pdp-accordion-body">
                    <p style={{ lineHeight: '1.7' }}>
                      Toutes les commandes passées avant 14h sont préparées et expédiées le jour même. Vous disposez d'un délai de 30 jours pour nous retourner tout article non ouvert dans son emballage d'origine. Les retours sont simples et pris en charge par notre service client.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Related Products / Le Compagnon Idéal */}
      {relatedProducts.length > 0 && (
        <section className="pdp-related-section">
          <div className="pdp-related-container">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Harmonie & Rituel</p>
                <h2>Le Compagnon Idéal</h2>
              </div>
              <Link href="/boutique" className="text-link">
                Explorer tout le catalogue <span>↗</span>
              </Link>
            </div>

            <div className="product-grid">
              {relatedProducts.map((rel) => (
                <article className="product boutique-product-card" key={rel.id}>
                  <Link href={`/produit/${rel.id}`} className="pdp-card-img-link">
                    <div className="product-image">
                      <img src={rel.image || '/placeholder.svg'} alt={rel.name} />
                      {rel.tag && <span className="product-tag-badge">{rel.tag}</span>}
                    </div>
                  </Link>

                  <div className="product-meta">
                    <div>
                      <span className="product-category-sub">{rel.category}</span>
                      <h3>
                        <Link href={`/produit/${rel.id}`} style={{ color: 'inherit' }}>
                          {rel.name}
                        </Link>
                      </h3>
                      <p className="product-desc">{rel.description}</p>
                    </div>
                    <strong className="product-price-tag">{rel.price}</strong>
                  </div>

                  <div className="boutique-card-actions">
                    <Link
                      href={`/produit/${rel.id}`}
                      className="buy-now-card-btn"
                      style={{ textAlign: 'center' }}
                    >
                      Acheter maintenant ⚡
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

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
