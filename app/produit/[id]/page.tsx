'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CheckoutModal from '@/components/CheckoutModal'
import ProductMediaCarousel from '@/components/ProductMediaCarousel'
import {
  PRODUCTS,
  Product,
  VolumeOption,
  extractContenance,
  extractVolumes,
  getCleanDescription,
  isVideoUrl,
} from '@/lib/products'
import { getProducts, saveProduct, saveProductsBulk } from '@/lib/store'
import { fetchProductByIdFromDb, fetchProductsFromDb } from '@/lib/supabaseService'

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string)

  const [product, setProduct] = useState<Product | null>(null)
  const [allProducts, setAllProducts] = useState<Product[]>(PRODUCTS)
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0)
  const [isGalleryPaused, setIsGalleryPaused] = useState(false)
  const [selectedVolume, setSelectedVolume] = useState<string>('')
  const [quantity, setQuantity] = useState(1)

  const volumes = useMemo(() => {
    return extractVolumes(product)
  }, [product])

  const [selectedVolumeOption, setSelectedVolumeOption] = useState<VolumeOption | null>(null)

  useEffect(() => {
    if (volumes.length > 0) {
      setSelectedVolumeOption((prev) => {
        if (prev && volumes.some((v) => v.volume === prev.volume)) {
          return volumes.find((v) => v.volume === prev.volume) || prev
        }
        return volumes[0]
      })
    } else {
      setSelectedVolumeOption(null)
    }
  }, [volumes])

  const effectiveContenance = useMemo(() => {
    return extractContenance(product)
  }, [product])

  const contenanceOptions = useMemo(() => {
    if (!effectiveContenance) return []
    return effectiveContenance.split(',').map((s) => s.trim()).filter(Boolean)
  }, [effectiveContenance])

  useEffect(() => {
    if (contenanceOptions.length > 0) {
      if (!selectedVolume || !contenanceOptions.includes(selectedVolume)) {
        setSelectedVolume(contenanceOptions[0])
      }
    } else {
      setSelectedVolume('')
    }
  }, [contenanceOptions, selectedVolume])

  const displayedPrice = selectedVolumeOption ? selectedVolumeOption.price : product?.price || ''
  const displayedRawPrice = selectedVolumeOption ? selectedVolumeOption.rawPrice : product?.rawPrice || 0
  const [activeTab, setActiveTab] = useState<'desc' | 'ingredients' | 'application' | 'livraison'>('desc')
  const [cartCount, setCartCount] = useState(0)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [buyingProduct, setBuyingProduct] = useState<Product | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!productId) return

    // 1. Chercher dans les produits locaux ou le catalogue up-to-date
    const localList = getProducts()
    setAllProducts(localList)
    const foundLocal = localList.find((p) => p.id === productId) || PRODUCTS.find((p) => p.id === productId)

    if (foundLocal) {
      setProduct(foundLocal)
      setActiveImageIndex(0)
      setLoading(false)
    } else {
      setProduct(null)
      setLoading(true)
    }

    // 2. Synchronisation en arrière-plan depuis Supabase (met à jour le cache local pour toujours)
    fetchProductByIdFromDb(productId).then((dbProduct) => {
      if (dbProduct) {
        setProduct((prev) => {
          if (!prev) return dbProduct
          const prevImgsCount = (prev.images?.length || 0) + (prev.media?.length || 0)
          const dbImgsCount = (dbProduct.images?.length || 0) + (dbProduct.media?.length || 0)
          if (prevImgsCount > dbImgsCount) {
            return {
              ...dbProduct,
              image: prev.image || dbProduct.image,
              images: prev.images || dbProduct.images,
              media: prev.media || dbProduct.media,
            }
          }
          return dbProduct
        })
        saveProduct(dbProduct)
      }
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })

    // Charger et mettre en cache tous les produits Supabase pour les recommandations
    fetchProductsFromDb().then((dbList) => {
      if (dbList && dbList.length > 0) {
        saveProductsBulk(dbList)
        const merged = new Map<string, Product>()
        dbList.forEach((p) => merged.set(p.id, p))
        localList.forEach((p) => {
          if (!merged.has(p.id)) {
            merged.set(p.id, p)
          } else {
            const existing = merged.get(p.id)!
            const pCount = (p.images?.length || 0) + (p.media?.length || 0)
            const existingCount = (existing.images?.length || 0) + (existing.media?.length || 0)
            if (pCount > existingCount) {
              merged.set(p.id, {
                ...existing,
                image: p.image || existing.image,
                images: p.images || existing.images,
                media: p.media || existing.media,
              })
            }
          }
        })
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
    const volLabel = selectedVolumeOption
      ? ` · ${selectedVolumeOption.volume} (${selectedVolumeOption.price})`
      : selectedVolume
      ? ` · ${selectedVolume}`
      : ''
    showToast(`« ${product.name}${volLabel} » (x${quantity}) ajouté au panier !`)
  }

  const handleBuyNow = () => {
    if (!product) return
    let cleanName = product.name
    if (selectedVolumeOption) {
      const regexOtherSize = /\b(30|50|100|150|200|250)\s*ml\b/i
      if (regexOtherSize.test(cleanName)) {
        cleanName = cleanName.replace(regexOtherSize, selectedVolumeOption.volume)
      } else {
        cleanName = `${cleanName} · ${selectedVolumeOption.volume}`
      }
    }
    const volProduct: Product = selectedVolumeOption
      ? {
          ...product,
          name: cleanName,
          price: selectedVolumeOption.price,
          rawPrice: selectedVolumeOption.rawPrice,
          contenance: selectedVolumeOption.volume,
          type: product.type
            ? `${product.type} · ${selectedVolumeOption.volume}`
            : selectedVolumeOption.volume,
        }
      : selectedVolume
      ? {
          ...product,
          contenance: selectedVolume,
          type: product.type ? `${product.type} · ${selectedVolume}` : selectedVolume,
        }
      : product
    setBuyingProduct(volProduct)
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
        if (img && !list.includes(img)) list.push(img)
      })
    }
    if (product.media && product.media.length > 0) {
      product.media.forEach((m) => {
        if (m && m.url && !list.includes(m.url)) list.push(m.url)
      })
    }
    return list.length > 0 ? list : ['/placeholder.svg']
  }, [product])

  // Garder l'index valide si le nombre d'images change
  useEffect(() => {
    if (activeImageIndex >= galleryImages.length && galleryImages.length > 0) {
      setActiveImageIndex(0)
    }
  }, [galleryImages.length, activeImageIndex])

  // Support du balayage tactile (swipe) sur mobile
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [touchResumeTimeout, setTouchResumeTimeout] = useState<NodeJS.Timeout | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      setTouchStartX(e.touches[0].clientX)
      setIsGalleryPaused(true)
      if (touchResumeTimeout) clearTimeout(touchResumeTimeout)
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX !== null && e.changedTouches.length > 0) {
      const diff = touchStartX - e.changedTouches[0].clientX
      if (diff > 35) {
        // Balayage vers la gauche -> photo suivante
        setActiveImageIndex((prev) => (prev + 1) % galleryImages.length)
      } else if (diff < -35) {
        // Balayage vers la droite -> photo précédente
        setActiveImageIndex((prev) => (prev <= 0 ? galleryImages.length - 1 : prev - 1))
      }
    }
    setTouchStartX(null)
    // Reprise automatique du défilement après 2.5s sur mobile
    const t = setTimeout(() => {
      setIsGalleryPaused(false)
    }, 2500)
    setTouchResumeTimeout(t)
  }

  // Défilement automatique des photos du produit (toutes les 3.5s) si plus d'une photo
  useEffect(() => {
    if (galleryImages.length <= 1 || isGalleryPaused) return
    const interval = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % galleryImages.length)
    }, 3500)
    return () => clearInterval(interval)
  }, [galleryImages.length, isGalleryPaused])

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
            Chargement de votre sélection MERCATUM...
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
          <Link href={`/boutique?cat=${encodeURIComponent(product.category)}`} className="pdp-cat-link">
            {product.category}
          </Link>
          <span className="pdp-sep">/</span>
          <span className="pdp-current-item">{product.name}</span>
        </div>
      </nav>

      {/* Main Product Showcase Section */}
      <section className="pdp-main-section">
        <div className="pdp-container">
          
          {/* Left Column: Visual Showcase Gallery */}
          <div className="pdp-gallery-col">
            <div
              className="pdp-main-visual-wrapper group"
              onMouseEnter={() => {
                if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
                  setIsGalleryPaused(true)
                }
              }}
              onMouseLeave={() => {
                if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
                  setIsGalleryPaused(false)
                }
              }}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {product.tag && (
                <span className="pdp-badge-tag">{product.tag}</span>
              )}
              {(() => {
                const currentImg = galleryImages[activeImageIndex] || galleryImages[0] || product.image || '/placeholder.svg'
                const isVideo = isVideoUrl(currentImg)
                return isVideo ? (
                  <video
                    src={currentImg}
                    autoPlay
                    loop
                    muted
                    controls
                    playsInline
                    className="pdp-main-img"
                  />
                ) : (
                  <img
                    src={currentImg}
                    alt={`${product.name} - vue ${activeImageIndex + 1}`}
                    className="pdp-main-img"
                  />
                )
              })()}

              {/* Navigation flèches et puces si plusieurs photos */}
              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveImageIndex((prev) => (prev <= 0 ? galleryImages.length - 1 : prev - 1))
                    }}
                    aria-label="Photo précédente"
                    className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center text-sm shadow-md transition-all opacity-80 hover:opacity-100"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setActiveImageIndex((prev) => (prev + 1) % galleryImages.length)
                    }}
                    aria-label="Photo suivante"
                    className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center text-sm shadow-md transition-all opacity-80 hover:opacity-100"
                  >
                    ›
                  </button>

                  <div className="absolute top-3 right-3 z-10 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white pointer-events-none shadow-md">
                    {activeImageIndex + 1}/{galleryImages.length} {isVideoUrl(galleryImages[activeImageIndex] || galleryImages[0]) ? '🎬' : '📷'}
                  </div>
                </>
              )}
            </div>

            {/* Thumbnails Row */}
            {galleryImages.length > 1 && (
              <div className="pdp-thumbnails-strip">
                {galleryImages.map((imgUrl, idx) => {
                  const isThumbVideo = isVideoUrl(imgUrl)
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`pdp-thumb-btn relative ${activeImageIndex === idx ? 'active' : ''}`}
                      onClick={() => setActiveImageIndex(idx)}
                      aria-label={`Afficher le média ${idx + 1}`}
                    >
                      {isThumbVideo ? (
                        <>
                          <video src={imgUrl} className="w-full h-full object-cover pointer-events-none" muted playsInline />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-xs">
                            ▶
                          </span>
                        </>
                      ) : (
                        <img src={imgUrl} alt={`${product.name} vue ${idx + 1}`} />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right Column: Information, Selection & Order Actions */}
          <div className="pdp-info-col">
            <div className="pdp-info-header">
              <span className="pdp-brand-eyebrow">
                MERCATUM Paris · {product.category}
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
                <span className="pdp-price-tag">{displayedPrice}</span>
                {selectedVolumeOption && (
                  <span className="text-xs text-[#8ea07c] font-semibold bg-[#b8c8a6]/20 px-2 py-0.5 rounded ml-2">
                    pour {selectedVolumeOption.volume}
                  </span>
                )}
                <span className="pdp-tax-note">TTC · Livraison express offerte</span>
              </div>
            </div>

            {/* Volume / Contenance Selection (Multi-Tarifs ou Format Unique) */}
            {volumes.length > 0 ? (
              <div className="pdp-volume-selector">
                <label className="pdp-selector-label">
                  Contenance : <strong>{selectedVolumeOption?.volume}</strong> —{' '}
                  <span className="text-[#8ea07c] font-bold">{selectedVolumeOption?.price}</span>
                </label>
                <div className="pdp-volume-pills">
                  {volumes.map((opt) => {
                    const isSelected = selectedVolumeOption?.volume === opt.volume
                    return (
                      <button
                        key={opt.volume}
                        type="button"
                        className={`pdp-vol-btn ${isSelected ? 'active' : ''}`}
                        onClick={() => setSelectedVolumeOption(opt)}
                      >
                        <span className="font-semibold">{opt.volume}</span>
                        <span className="text-[11px] opacity-80 ml-1.5 font-normal">({opt.price})</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : contenanceOptions.length > 0 ? (
              <div className="pdp-volume-selector">
                <label className="pdp-selector-label">
                  Contenance : <strong>{selectedVolume || contenanceOptions[0]}</strong>
                </label>
                <div className="pdp-volume-pills">
                  {contenanceOptions.map((vol) => (
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
            ) : null}

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
                Acheter maintenant — {quantity > 1 ? `${((selectedVolumeOption?.rawPrice || displayedRawPrice) * quantity).toFixed(2).replace('.', ',')} €` : displayedPrice} ⚡
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
                  <strong>Écrin Cadeau d&apos;Exception</strong>
                  <p>Présenté dans le coffret signature MERCATUM avec certificat d&apos;authenticité.</p>
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
                      {getCleanDescription(product.description)}
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
        initialQuantity={quantity}
        onClose={() => setBuyingProduct(null)}
        onSuccess={handleCheckoutSuccess}
      />
    </main>
  )
}
