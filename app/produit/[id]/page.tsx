'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CheckoutModal from '@/components/CheckoutModal'
import ProductMediaCarousel from '@/components/ProductMediaCarousel'
import RichDescription from '@/components/RichDescription'
import {
  PRODUCTS,
  Product,
  VolumeOption,
  extractContenance,
  extractVolumes,
  extractColors,
  getColorHex,
  getCleanDescription,
  isVideoUrl,
} from '@/lib/products'
import { getProducts, saveProduct, saveProductsBulk } from '@/lib/store'
import { fetchProductByIdFromDb, fetchProductsFromDb } from '@/lib/supabaseService'

function getCategoryQualityBadge(catRaw = '', nameRaw = '') {
  const cat = (catRaw || '').toLowerCase()
  const name = (nameRaw || '').toLowerCase()

  // 1. Électroménager (Frigos, lave-linge, fours, plaques)
  if (
    cat.includes('frigorif') ||
    cat.includes('lavadora') ||
    cat.includes('horno') ||
    cat.includes('électro') ||
    name.includes('frigorif') ||
    name.includes('lavadora') ||
    name.includes('secadora') ||
    name.includes('horno') ||
    name.includes('placa')
  ) {
    return {
      icon: '⚡',
      title: 'Haute Technologie & Fiabilité Certifiée',
      desc: 'Performances énergétiques de pointe et garantie constructeur officielle.',
    }
  }

  // 2. Chauffage & Art du Feu (Poêles à bois / pellets, cheminées)
  if (
    cat.includes('estufa') ||
    cat.includes('chimenea') ||
    cat.includes('pellet') ||
    cat.includes('leña') ||
    name.includes('estufa') ||
    name.includes('chimenea') ||
    name.includes('pellet')
  ) {
    return {
      icon: '🔥',
      title: 'Haute Efficacité Thermique & Sécurité',
      desc: 'Rendement énergétique supérieur et conformité aux normes européennes strictes.',
    }
  }

  // 3. Mobilier, Meubles TV, Bain, Tables, Jeux d'intérieur
  if (
    cat.includes('mobilier') ||
    cat.includes('mueble') ||
    cat.includes('décoration') ||
    cat.includes('juego') ||
    name.includes('sofa') ||
    name.includes('table') ||
    name.includes('meuble') ||
    name.includes('billard') ||
    name.includes('vitrina')
  ) {
    return {
      icon: '🏛️',
      title: 'Mobilier de Créateur & Matières Nobles',
      desc: 'Structures renforcées, bois et finitions haut de gamme faits pour durer.',
    }
  }

  // 4. Plein Air, Jardin, Terrasses, Glamping, Pergolas
  if (
    cat.includes('plein air') ||
    cat.includes('jardin') ||
    cat.includes('évasion') ||
    name.includes('toldo') ||
    name.includes('piscina') ||
    name.includes('glamping') ||
    name.includes('tumbona')
  ) {
    return {
      icon: '☀️',
      title: 'Conception Plein Air & Résistance Intempéries',
      desc: 'Matériaux traités anti-UV et anticorrosion pour un confort durable sous toutes les saisons.',
    }
  }

  // 5. Parfumerie, Cosmétique, Soin du Corps & Capillaire
  if (
    cat.includes('parfum') ||
    cat.includes('cosmétique') ||
    cat.includes('soin') ||
    cat.includes('visage') ||
    cat.includes('cabello') ||
    cat.includes('belleza')
  ) {
    return {
      icon: '🌿',
      title: 'Haute Parfumerie & Cosmétique d’Élite',
      desc: 'Formulations précieuses et actifs d’exception rigoureusement sourcés.',
    }
  }

  // 6. Par défaut pour toute création MERCATUM
  return {
    icon: '✨',
    title: 'Sélection & Conception d’Exception',
    desc: 'Pièces rigoureusement sélectionnées selon les plus hauts standards de durabilité et d’élégance.',
  }
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string)

  const [product, setProduct] = useState<Product | null>(null)
  const [allProducts, setAllProducts] = useState<Product[]>(PRODUCTS)
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0)
  const [isGalleryAutoPlay, setIsGalleryAutoPlay] = useState(false)
  const [selectedVolume, setSelectedVolume] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState<string>('')
  const [quantity, setQuantity] = useState(1)

  const colors = useMemo(() => {
    return extractColors(product)
  }, [product])

  useEffect(() => {
    if (colors.length > 0) {
      setSelectedColor((prev) => (colors.includes(prev) ? prev : colors[0]))
    } else {
      setSelectedColor('')
    }
  }, [colors])

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
    fetchProductsFromDb(false).then((dbList) => {
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
    const colorLabel = selectedColor ? ` · Teinte: ${selectedColor}` : ''
    showToast(`« ${product.name}${volLabel}${colorLabel} » (x${quantity}) ajouté au panier !`)
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
    if (selectedColor) {
      cleanName = `${cleanName} · ${selectedColor}`
    }
    const volProduct: Product = selectedVolumeOption
      ? {
          ...product,
          name: cleanName,
          price: selectedVolumeOption.price,
          rawPrice: selectedVolumeOption.rawPrice,
          contenance: selectedVolumeOption.volume,
          color: selectedColor || product.color,
          type: product.type
            ? `${product.type} · ${selectedVolumeOption.volume}`
            : selectedVolumeOption.volume,
        }
      : selectedVolume
      ? {
          ...product,
          name: cleanName,
          contenance: selectedVolume,
          color: selectedColor || product.color,
          type: product.type ? `${product.type} · ${selectedVolume}` : selectedVolume,
        }
      : {
          ...product,
          name: cleanName,
          color: selectedColor || product.color,
        }
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

  // État du zoom et déplacement panoramique (pan) sur l'image principale
  const [zoomLevel, setZoomLevel] = useState<number>(1)
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // État du mode plein écran (Lightbox)
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [lightboxZoom, setLightboxZoom] = useState<number>(1)
  const [lightboxPan, setLightboxPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [lightboxDragging, setLightboxDragging] = useState(false)
  const [lightboxDragStart, setLightboxDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  // Réinitialiser le zoom lors du changement d'image
  useEffect(() => {
    setZoomLevel(1)
    setPanOffset({ x: 0, y: 0 })
    setIsDragging(false)
  }, [activeImageIndex])

  const handleZoomIn = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setZoomLevel((prev) => Math.min(3.5, Number((prev + 0.5).toFixed(1))))
  }

  const handleZoomOut = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setZoomLevel((prev) => {
      const next = Math.max(1, Number((prev - 0.5).toFixed(1)))
      if (next === 1) setPanOffset({ x: 0, y: 0 })
      return next
    })
  }

  const handleZoomReset = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    setZoomLevel(1)
    setPanOffset({ x: 0, y: 0 })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoomLevel <= 1) return
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoomLevel <= 1) return
    e.preventDefault()
    const maxPan = (zoomLevel - 1) * 220
    const newX = e.clientX - dragStart.x
    const newY = e.clientY - dragStart.y
    setPanOffset({
      x: Math.max(-maxPan, Math.min(maxPan, newX)),
      y: Math.max(-maxPan, Math.min(maxPan, newY)),
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Clavier pour la lightbox (Échap pour fermer, Flèches pour naviguer)
  useEffect(() => {
    if (!isLightboxOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsLightboxOpen(false)
        setLightboxZoom(1)
      } else if (e.key === 'ArrowLeft') {
        setActiveImageIndex((prev) => (prev <= 0 ? galleryImages.length - 1 : prev - 1))
      } else if (e.key === 'ArrowRight') {
        setActiveImageIndex((prev) => (prev + 1) % galleryImages.length)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isLightboxOpen, galleryImages.length])

  // Support du balayage tactile (swipe) et zoom sur mobile
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      if (zoomLevel > 1) {
        setIsDragging(true)
        setDragStart({
          x: e.touches[0].clientX - panOffset.x,
          y: e.touches[0].clientY - panOffset.y,
        })
      } else {
        setTouchStartX(e.touches[0].clientX)
      }
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (zoomLevel > 1 && isDragging && e.touches.length > 0) {
      const maxPan = (zoomLevel - 1) * 220
      const newX = e.touches[0].clientX - dragStart.x
      const newY = e.touches[0].clientY - dragStart.y
      setPanOffset({
        x: Math.max(-maxPan, Math.min(maxPan, newX)),
        y: Math.max(-maxPan, Math.min(maxPan, newY)),
      })
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(false)
      return
    }
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
  }

  // Défilement des photos du produit : UNIQUEMENT si activé manuellement via le bouton "▶ Défiler"
  useEffect(() => {
    if (galleryImages.length <= 1 || !isGalleryAutoPlay || zoomLevel > 1) return
    const interval = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % galleryImages.length)
    }, 3500)
    return () => clearInterval(interval)
  }, [galleryImages.length, isGalleryAutoPlay, zoomLevel])

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
              className={`pdp-main-visual-wrapper group relative ${zoomLevel > 1 ? 'zoomed' : ''}`}
              onMouseLeave={() => {
                setIsDragging(false)
              }}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {product.tag && (
                <span className="pdp-badge-tag">{product.tag}</span>
              )}

              {/* Conteneur de l'image/vidéo avec support du zoom et pan */}
              <div
                className={`w-full h-full flex items-center justify-center overflow-hidden select-none ${
                  zoomLevel > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-zoom-in'
                }`}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onDoubleClick={(e) => {
                  e.stopPropagation()
                  if (zoomLevel > 1) {
                    handleZoomReset()
                  } else {
                    handleZoomIn()
                  }
                }}
              >
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
                      style={{
                        transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
                        transformOrigin: 'center center',
                        transition: isDragging ? 'none' : 'transform 0.25s ease-out',
                      }}
                    />
                  ) : (
                    <img
                      src={currentImg}
                      alt={`${product.name} - vue ${activeImageIndex + 1}`}
                      className="pdp-main-img pointer-events-none"
                      style={{
                        transform: `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`,
                        transformOrigin: 'center center',
                        transition: isDragging ? 'none' : 'transform 0.25s ease-out',
                      }}
                      draggable={false}
                    />
                  )
                })()}
              </div>

              {/* Barre d'outils Zoom (+ / -) et Plein écran */}
              <div
                className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 bg-black/75 backdrop-blur-md text-white px-2.5 py-1.5 rounded-full shadow-2xl border border-white/20"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 1}
                  aria-label="Dézoomer (-)"
                  title="Dézoomer (-)"
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition ${
                    zoomLevel <= 1
                      ? 'opacity-30 cursor-not-allowed text-stone-400'
                      : 'hover:bg-white/20 active:scale-95 text-white'
                  }`}
                >
                  −
                </button>

                <span className="text-[11px] font-bold tracking-wider px-1 min-w-[38px] text-center select-none text-stone-100">
                  {Math.round(zoomLevel * 100)}%
                </span>

                <button
                  type="button"
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 3.5}
                  aria-label="Zoomer (+)"
                  title="Zoomer (+)"
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold transition ${
                    zoomLevel >= 3.5
                      ? 'opacity-30 cursor-not-allowed text-stone-400'
                      : 'hover:bg-white/20 active:scale-95 text-white'
                  }`}
                >
                  +
                </button>

                {zoomLevel > 1 && (
                  <button
                    type="button"
                    onClick={handleZoomReset}
                    aria-label="Réinitialiser le zoom"
                    title="Réinitialiser le zoom (100%)"
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs hover:bg-white/20 text-stone-300 hover:text-white transition ml-0.5"
                  >
                    ↺
                  </button>
                )}

                <div className="w-[1px] h-3.5 bg-white/25 mx-0.5" />

                <button
                  type="button"
                  onClick={() => {
                    setIsLightboxOpen(true)
                    setLightboxZoom(1.4)
                    setLightboxPan({ x: 0, y: 0 })
                  }}
                  aria-label="Plein écran"
                  title="Agrandir en plein écran"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs hover:bg-white/20 text-white transition"
                >
                  ⛶
                </button>

                {galleryImages.length > 1 && (
                  <>
                    <div className="w-[1px] h-3.5 bg-white/25 mx-0.5" />
                    <button
                      type="button"
                      onClick={() => setIsGalleryAutoPlay((prev) => !prev)}
                      aria-label={isGalleryAutoPlay ? "Arrêter le défilement" : "Lancer le défilement"}
                      title={isGalleryAutoPlay ? "Arrêter le diaporama" : "Lancer le diaporama automatique"}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition cursor-pointer ${
                        isGalleryAutoPlay
                          ? 'bg-[#c49a45] text-stone-900 shadow'
                          : 'hover:bg-white/20 text-white'
                      }`}
                    >
                      {isGalleryAutoPlay ? '⏸' : '▶'}
                    </button>
                  </>
                )}
              </div>

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

            {/* Nuances & Déclinaisons de teintes */}
            {colors.length > 0 && (
              <div className="pdp-volume-selector">
                <label className="pdp-selector-label">
                  Nuance / Teinte : <strong>{selectedColor}</strong>
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {colors.map((col) => {
                    const isSelected = selectedColor === col
                    const hex = getColorHex(col)
                    return (
                      <button
                        key={col}
                        type="button"
                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition shadow-sm ${
                          isSelected
                            ? 'bg-[#1c221d] text-white border-[#1c221d] ring-2 ring-[#b8c8a6]/50'
                            : 'bg-white text-stone-800 border-stone-300 hover:border-stone-500 hover:bg-stone-50'
                        }`}
                        onClick={() => setSelectedColor(col)}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/20 flex-shrink-0 shadow-inner"
                          style={{ backgroundColor: hex }}
                        />
                        <span>{col}</span>
                        {isSelected && <span className="text-[10px] text-[#b8c8a6] font-bold">✓</span>}
                      </button>
                    )
                  })}
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
              {(() => {
                const badge = getCategoryQualityBadge(product?.category, product?.name)
                return (
                  <div className="pdp-badge-item">
                    <span className="pdp-badge-icon">{badge.icon}</span>
                    <div>
                      <strong>{badge.title}</strong>
                      <p>{badge.desc}</p>
                    </div>
                  </div>
                )
              })()}
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
                    <RichDescription content={getCleanDescription(product.description)} />
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

      {/* Modal Lightbox Plein Écran Haute Résolution avec Zoom (+ et -) */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-fade-in"
          onClick={() => {
            setIsLightboxOpen(false)
            setLightboxZoom(1)
            setLightboxPan({ x: 0, y: 0 })
          }}
        >
          {/* Barre supérieure Lightbox */}
          <div
            className="w-full max-w-6xl flex items-center justify-between z-10 text-white pb-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="font-serif text-base sm:text-lg text-stone-100 font-semibold">{product.name}</h3>
              <p className="text-xs text-stone-400">
                Vue {activeImageIndex + 1} sur {galleryImages.length} · MERCATUM Paris
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Contrôles de zoom dans le plein écran */}
              <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20">
                <button
                  type="button"
                  onClick={() => {
                    setLightboxZoom((prev) => {
                      const next = Math.max(1, Number((prev - 0.5).toFixed(1)))
                      if (next === 1) setLightboxPan({ x: 0, y: 0 })
                      return next
                    })
                  }}
                  disabled={lightboxZoom <= 1}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Dézoomer (-)"
                >
                  −
                </button>
                <span className="text-xs font-bold min-w-[40px] text-center text-stone-200 select-none">
                  {Math.round(lightboxZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setLightboxZoom((prev) => Math.min(4, Number((prev + 0.5).toFixed(1))))}
                  disabled={lightboxZoom >= 4}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Zoomer (+)"
                >
                  +
                </button>
                {lightboxZoom > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      setLightboxZoom(1)
                      setLightboxPan({ x: 0, y: 0 })
                    }}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-stone-300 hover:text-white hover:bg-white/20 ml-1 transition"
                    title="Réinitialiser le zoom"
                  >
                    ↺
                  </button>
                )}
              </div>

              {/* Bouton Fermer */}
              <button
                type="button"
                onClick={() => {
                  setIsLightboxOpen(false)
                  setLightboxZoom(1)
                  setLightboxPan({ x: 0, y: 0 })
                }}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center text-base transition border border-white/20"
                aria-label="Fermer le plein écran"
                title="Fermer (Échap)"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Contenu visuel plein écran avec support du zoom et pan */}
          <div
            className={`relative w-full flex-1 flex items-center justify-center overflow-hidden my-auto select-none ${
              lightboxZoom > 1 ? (lightboxDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
            }`}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => {
              if (lightboxZoom <= 1) return
              setLightboxDragging(true)
              setLightboxDragStart({ x: e.clientX - lightboxPan.x, y: e.clientY - lightboxPan.y })
            }}
            onMouseMove={(e) => {
              if (!lightboxDragging || lightboxZoom <= 1) return
              const maxPan = (lightboxZoom - 1) * 350
              const newX = e.clientX - lightboxDragStart.x
              const newY = e.clientY - lightboxDragStart.y
              setLightboxPan({
                x: Math.max(-maxPan, Math.min(maxPan, newX)),
                y: Math.max(-maxPan, Math.min(maxPan, newY)),
              })
            }}
            onMouseUp={() => setLightboxDragging(false)}
          >
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
                  className="max-h-[80vh] max-w-[92vw] object-contain shadow-2xl rounded-lg"
                  style={{
                    transform: `scale(${lightboxZoom}) translate(${lightboxPan.x / lightboxZoom}px, ${lightboxPan.y / lightboxZoom}px)`,
                    transition: lightboxDragging ? 'none' : 'transform 0.2s ease-out',
                  }}
                />
              ) : (
                <img
                  src={currentImg}
                  alt={product.name}
                  className="max-h-[80vh] max-w-[92vw] object-contain shadow-2xl rounded-lg pointer-events-none"
                  style={{
                    transform: `scale(${lightboxZoom}) translate(${lightboxPan.x / lightboxZoom}px, ${lightboxPan.y / lightboxZoom}px)`,
                    transition: lightboxDragging ? 'none' : 'transform 0.2s ease-out',
                  }}
                  draggable={false}
                />
              )
            })()}

            {/* Flèches précédent / suivant dans le plein écran */}
            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveImageIndex((prev) => (prev <= 0 ? galleryImages.length - 1 : prev - 1))
                    setLightboxZoom(1)
                    setLightboxPan({ x: 0, y: 0 })
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center text-lg border border-white/20 transition shadow-lg backdrop-blur-sm"
                  aria-label="Image précédente"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setActiveImageIndex((prev) => (prev + 1) % galleryImages.length)
                    setLightboxZoom(1)
                    setLightboxPan({ x: 0, y: 0 })
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white flex items-center justify-center text-lg border border-white/20 transition shadow-lg backdrop-blur-sm"
                  aria-label="Image suivante"
                >
                  ›
                </button>
              </>
            )}
          </div>

          {/* Barre inférieure : miniatures */}
          {galleryImages.length > 1 && (
            <div
              className="w-full max-w-2xl flex items-center justify-center gap-2 pt-3 z-10 overflow-x-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {galleryImages.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setActiveImageIndex(idx)
                    setLightboxZoom(1)
                    setLightboxPan({ x: 0, y: 0 })
                  }}
                  className={`w-12 h-12 sm:w-14 sm:h-14 rounded overflow-hidden border-2 transition flex-shrink-0 ${
                    activeImageIndex === idx ? 'border-white ring-2 ring-white/50 scale-105' : 'border-white/30 opacity-60 hover:opacity-100'
                  }`}
                >
                  {isVideoUrl(imgUrl) ? (
                    <video src={imgUrl} className="w-full h-full object-cover pointer-events-none" muted playsInline />
                  ) : (
                    <img src={imgUrl} alt={`Vue ${idx + 1}`} className="w-full h-full object-cover pointer-events-none" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  )
}
