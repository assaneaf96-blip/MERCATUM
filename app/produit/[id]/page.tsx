'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import CheckoutModal from '@/components/CheckoutModal'
import ProductMediaCarousel from '@/components/ProductMediaCarousel'
import RichDescription from '@/components/RichDescription'
import { trackPixel } from '@/components/PixelTracker'
import {
  PRODUCTS,
  Product,
  VolumeOption,
  extractContenance,
  extractVolumes,
  extractColors,
  extractColorImages,
  formatColorEs,
  getColorHex,
  getCleanDescription,
  isVideoUrl,
} from '@/lib/products'
import { getProducts, saveProduct, saveProductsBulk } from '@/lib/store'
import { fetchProductByIdFromDb, fetchProductsFromDb } from '@/lib/supabaseService'
import { getClientCachedProducts, getSyncCachedProducts } from '@/lib/clientCache'
import { addToCart } from '@/lib/cart'

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
      title: 'Alta Tecnología & Fiabilidad Certificada',
      desc: 'Rendimiento energético de vanguardia y garantía oficial del fabricante.',
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
      title: 'Alta Eficiencia Térmica & Seguridad',
      desc: 'Rendimiento energético superior y conformidad con las normas europeas más estrictas.',
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
      title: 'Mobiliario de Autor & Materiales Nobles',
      desc: 'Estructuras reforzadas, maderas y acabados de alta gama hechos para perdurar.',
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
      title: 'Diseño Exterior & Resistencia Climática',
      desc: 'Materiales tratados anti-UV y anticorrosión para un confort duradero en todas las estaciones.',
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
      title: 'Alta Perfumería & Cosmética de Élite',
      desc: 'Formulaciones selectas y activos extraordinarios rigurosamente obtenidos.',
    }
  }

  // 6. Par défaut pour toute création MERCATUM
  return {
    icon: '✨',
    title: 'Selección & Diseño de Excepción',
    desc: 'Piezas rigurosamente seleccionadas bajo los más altos estándares de durabilidad y elegancia.',
  }
}

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const productId = Array.isArray(params?.id) ? params.id[0] : (params?.id as string)

  const [product, setProduct] = useState<Product | null>(() => {
    if (!productId) return null
    return PRODUCTS.find((p) => p.id === productId) || null
  })
  const [allProducts, setAllProducts] = useState<Product[]>(PRODUCTS)
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0)
  const [selectedVolume, setSelectedVolume] = useState<string>('')
  const [selectedColor, setSelectedColor] = useState<string>('')
  const [quantity, setQuantity] = useState(1)

  const colors = useMemo(() => {
    return extractColors(product)
  }, [product])

  const colorImages = useMemo(() => {
    return extractColorImages(product)
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
  const [loading, setLoading] = useState<boolean>(() => {
    if (!productId) return true
    return !PRODUCTS.some((p) => p.id === productId)
  })

  useEffect(() => {
    if (!productId) return

    // Forcer le défilement tout en haut de l'écran immédiatement (0, 0)
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }

    // 1. Chercher dans les produits locaux ou le catalogue synchrone
    const syncCached = getSyncCachedProducts()
    const localList = getProducts()
    const combinedList = syncCached && syncCached.length > 0 ? syncCached : localList
    setAllProducts(combinedList)
    const defProduct = PRODUCTS.find((p) => p.id === productId)
    const foundInList = combinedList.find((p) => p.id === productId)
    const foundInitial = foundInList || defProduct

    if (foundInitial) {
      const mainImg = (foundInitial.image || defProduct?.image || '').trim()
      const defImgs = Array.isArray(defProduct?.images) ? defProduct.images.filter(Boolean) : []
      const foundImgs = Array.isArray(foundInitial.images) ? foundInitial.images.filter(Boolean) : []
      // TOUJOURS préserver et fusionner l'intégralité des images dès la première milliseconde
      const mergedImgs = Array.from(new Set([mainImg, ...foundImgs, ...defImgs].filter(Boolean)))
      const defMedia = Array.isArray(defProduct?.media) ? defProduct.media.filter(Boolean) : []
      const foundMedia = Array.isArray(foundInitial.media) ? foundInitial.media.filter(Boolean) : []
      const mergedMedia = foundMedia.length > 1
        ? foundMedia
        : (defMedia.length > 1 ? defMedia : mergedImgs.map((u) => ({ url: u, type: isVideoUrl(u) ? 'video' as const : 'image' as const })))

      setProduct({
        ...(defProduct || {}),
        ...foundInitial,
        image: mainImg,
        images: mergedImgs,
        media: mergedMedia,
      })
      setActiveImageIndex(0)
      setLoading(false)
    } else {
      // Vérifier le cache IndexedDB instantané avant d'afficher un écran de chargement
      getClientCachedProducts().then((cached) => {
        if (cached && cached.length > 0) {
          const foundCached = cached.find((p) => p.id === productId)
          if (foundCached) {
            setProduct(foundCached)
            setActiveImageIndex(0)
            setLoading(false)
          }
        }
      }).catch(() => {})
      setProduct(null)
      setLoading(true)
    }

    // 2. Synchronisation en arrière-plan depuis Supabase (charge la totalité absolue des médias HD)
    fetchProductByIdFromDb(productId).then((dbProduct) => {
      if (dbProduct) {
        setProduct((prev) => {
          if (!prev) return dbProduct
          const mainImg = (dbProduct.image || prev.image || defProduct?.image || '').trim()
          const dbImgs = (dbProduct.images && dbProduct.images.length > 0) ? dbProduct.images : []
          const prevImgs = (prev.images && prev.images.length > 0) ? prev.images : []
          const defImgs = defProduct?.images || []
          // Ne jamais perdre la moindre image : fusionner toutes les sources
          const allImgs = Array.from(new Set([mainImg, ...dbImgs, ...prevImgs, ...defImgs].filter(Boolean)))

          const dbMedia = (dbProduct.media && dbProduct.media.length > 0) ? dbProduct.media : []
          const prevMedia = (prev.media && prev.media.length > 0) ? prev.media : []
          const defMedia = defProduct?.media || []
          const mergedMedia = dbMedia.length > 1
            ? dbMedia
            : (prevMedia.length > 1 ? prevMedia : (defMedia.length > 1 ? defMedia : allImgs.map((u) => ({ url: u, type: isVideoUrl(u) ? 'video' as const : 'image' as const }))))

          const mergedProduct = {
            ...(defProduct || {}),
            ...prev,
            ...dbProduct,
            image: mainImg,
            images: allImgs,
            media: mergedMedia,
          }
          saveProduct(mergedProduct)
          return mergedProduct
        })
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

  useEffect(() => {
    if (product) {
      trackPixel('ViewContent', {
        id: product.id,
        name: product.name,
        price: product.rawPrice,
      })
    }
  }, [product?.id])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleAddToCart = () => {
    if (!product) return
    const volProduct: Product = selectedVolumeOption
      ? {
          ...product,
          price: selectedVolumeOption.price,
          rawPrice: selectedVolumeOption.rawPrice,
          contenance: selectedVolumeOption.volume,
        }
      : product

    addToCart(volProduct, quantity, {
      color: selectedColor ? formatColorEs(selectedColor) : product.color,
      volume: selectedVolumeOption?.volume || selectedVolume || product.contenance,
    })

    const effectivePrice = selectedVolumeOption?.rawPrice || product.rawPrice
    trackPixel('AddToCart', {
      id: product.id,
      name: product.name,
      price: effectivePrice * quantity,
      quantity,
    })
    const volLabel = selectedVolumeOption
      ? ` · ${selectedVolumeOption.volume} (${selectedVolumeOption.price})`
      : selectedVolume
      ? ` · ${selectedVolume}`
      : ''
    const colorLabel = selectedColor ? ` · Tono: ${formatColorEs(selectedColor)}` : ''
    showToast(`« ${product.name}${volLabel}${colorLabel} » (x${quantity}) añadido a la cesta !`)
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
      cleanName = `${cleanName} · ${formatColorEs(selectedColor)}`
    }
    const volProduct: Product = selectedVolumeOption
      ? {
          ...product,
          name: cleanName,
          price: selectedVolumeOption.price,
          rawPrice: selectedVolumeOption.rawPrice,
          contenance: selectedVolumeOption.volume,
          color: formatColorEs(selectedColor) || product.color,
          type: product.type
            ? `${product.type} · ${selectedVolumeOption.volume}`
            : selectedVolumeOption.volume,
        }
      : selectedVolume
      ? {
          ...product,
          name: cleanName,
          contenance: selectedVolume,
          color: formatColorEs(selectedColor) || product.color,
          type: product.type ? `${product.type} · ${selectedVolume}` : selectedVolume,
        }
      : {
          ...product,
          name: cleanName,
          color: formatColorEs(selectedColor) || product.color,
        }
    trackPixel('InitiateCheckout', {
      id: product.id,
      name: product.name,
      price: volProduct.rawPrice,
      quantity: 1,
    })
    setBuyingProduct(volProduct)
  }

  const handleCheckoutSuccess = (bought: Product) => {
    setCartCount((c) => c + 1)
    showToast(`¡Pedido confirmado para ${bought.name}! 🎉`)
  }

  const galleryImages = useMemo(() => {
    if (!product) return []
    const def = PRODUCTS.find((p) => p.id === product.id)
    const list: string[] = []
    const addImg = (img?: string) => {
      if (!img || typeof img !== 'string') return
      const trimmed = img.trim()
      if (trimmed && !isVideoUrl(trimmed) && !list.includes(trimmed)) {
        list.push(trimmed)
      }
    }

    if (product.image) addImg(product.image)
    if (product.images && product.images.length > 0) {
      product.images.forEach(addImg)
    }
    if (def?.images && def.images.length > 0) {
      def.images.forEach(addImg)
    }
    if (product.media && product.media.length > 0) {
      product.media.forEach((m) => {
        if (m && m.url && m.type !== 'video') addImg(m.url)
      })
    }
    if (def?.media && def.media.length > 0) {
      def.media.forEach((m) => {
        if (m && m.url && m.type !== 'video') addImg(m.url)
      })
    }

    // Extraire également toutes les photos intégrées dans la description
    const descText = product.description || def?.description || ''
    if (descText) {
      const imgRegex = /(!\[(.*?)\]\((.*?)\)|<img[^>]*src=["']([^"']+)["'][^>]*>)/gi
      let match: RegExpExecArray | null
      while ((match = imgRegex.exec(descText)) !== null) {
        const u = match[3]?.trim() || match[4]?.trim()
        if (u) addImg(u)
      }
    }

    return list.length > 0 ? list : ['/placeholder.svg']
  }, [product])

  // Garder l'index valide si le nombre d'images change
  useEffect(() => {
    if (activeImageIndex >= galleryImages.length && galleryImages.length > 0) {
      setActiveImageIndex(0)
    }
  }, [galleryImages.length, activeImageIndex])

  const handleSelectColor = (col: string) => {
    setSelectedColor(col)

    if (!galleryImages || galleryImages.length === 0) return

    // 1. Image précisément associée à cette couleur (Option B)
    const colEs = formatColorEs(col)
    const directUrl =
      colorImages[col] ||
      colorImages[colEs] ||
      colorImages[col.toLowerCase()] ||
      colorImages[colEs.toLowerCase()] ||
      Object.entries(colorImages).find(
        ([k]) => k.toLowerCase() === col.toLowerCase() || k.toLowerCase() === colEs.toLowerCase()
      )?.[1]

    if (directUrl) {
      const idx = galleryImages.findIndex(
        (img) => img === directUrl || img.includes(directUrl) || directUrl.includes(img)
      )
      if (idx >= 0) {
        setActiveImageIndex(idx)
        return
      }
    }

    // 2. Détection intelligente par nom de la couleur dans l'URL de l'image
    const cleanColName = col.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
    const cleanColEs = colEs.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
    const keywordIdx = galleryImages.findIndex((img) => {
      const imgLower = img.toLowerCase()
      return (
        (cleanColName.length >= 3 && imgLower.includes(cleanColName)) ||
        (cleanColEs.length >= 3 && imgLower.includes(cleanColEs))
      )
    })
    if (keywordIdx >= 0) {
      setActiveImageIndex(keywordIdx)
      return
    }

    // 3. Fallback automatique par ordre si le produit a plusieurs couleurs et plusieurs photos
    const colIdx = colors.indexOf(col)
    if (colIdx >= 0 && colIdx < galleryImages.length && galleryImages.length > 1) {
      setActiveImageIndex(colIdx)
    }
  }

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



  const relatedProducts = useMemo(() => {
    return allProducts
      .filter((p) => p.id !== productId)
      .slice(0, 3)
  }, [allProducts, productId])

  if (loading) {
    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <nav aria-label="Ruta de navegación" className="pdp-breadcrumb-nav">
          <div className="pdp-breadcrumb-container flex items-center justify-between">
            <Link href="/boutique" className="text-xs text-stone-600 font-semibold hover:text-stone-900 transition flex items-center gap-1">
              <span>‹</span>
              <span>Volver a La Tienda</span>
            </Link>
            <span className="text-[10.5px] uppercase font-bold tracking-widest text-stone-400 animate-pulse">
              Cargando artículo...
            </span>
          </div>
        </nav>
        <section className="pdp-main-section flex-1 py-8 px-4 max-w-7xl mx-auto w-full">
          <div className="pdp-container">
            <div className="pdp-gallery-col">
              <div className="pdp-main-visual-wrapper bg-[#fffcf7] animate-pulse rounded-xl flex items-center justify-center border border-stone-200 aspect-square">
                <span className="text-stone-400 font-serif italic text-sm">MERCATUM · El Arte de Vivir</span>
              </div>
            </div>
            <div className="pdp-info-col space-y-4 pt-4">
              <div className="h-4 w-32 bg-stone-200/80 rounded animate-pulse" />
              <div className="h-8 w-3/4 bg-stone-200/80 rounded animate-pulse" />
              <div className="h-6 w-28 bg-stone-200/80 rounded animate-pulse" />
              <div className="h-28 w-full bg-stone-200/60 rounded-xl animate-pulse mt-6" />
            </div>
          </div>
        </section>
        <Footer />
      </main>
    )
  }

  if (!product) {
    return (
      <main className="min-h-screen bg-background text-foreground flex flex-col">
        <Navbar />
        <div style={{ textAlign: 'center', padding: '100px 20px', flex: 1 }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '32px', marginBottom: '16px' }}>
            Artículo no disponible
          </h1>
          <p style={{ color: '#666', marginBottom: '24px' }}>
            Este artículo ya no está disponible o ha sido trasladado.
          </p>
          <Link href="/boutique" className="button dark">
            Volver a la tienda <span>→</span>
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
      <Navbar />

      {/* Breadcrumbs */}
      <nav aria-label="Ruta de navegación" className="pdp-breadcrumb-nav">
        <div className="pdp-breadcrumb-container">
          {/* Version mobile compacte et raffinée */}
          <div className="pdp-breadcrumb-mobile">
            <Link href="/boutique" className="pdp-back-link">
              <span className="pdp-back-arrow">‹</span>
              <span>Volver a La Tienda</span>
            </Link>
            <Link
              href={`/boutique?cat=${encodeURIComponent(product.category)}`}
              className="pdp-category-tag"
            >
              {product.category}
            </Link>
          </div>

          {/* Version Desktop : chemin complet */}
          <div className="pdp-breadcrumb-desktop">
            <Link href="/">Inicio</Link>
            <span className="pdp-sep">/</span>
            <Link href="/boutique">La Tienda</Link>
            <span className="pdp-sep">/</span>
            <Link href={`/boutique?cat=${encodeURIComponent(product.category)}`} className="pdp-cat-link">
              {product.category}
            </Link>
            <span className="pdp-sep">/</span>
            <span className="pdp-current-item">{product.name}</span>
          </div>
        </div>
      </nav>

      {/* Main Product Showcase Section */}
      <section className="pdp-main-section w-full max-w-full overflow-hidden">
        <div className="pdp-container w-full max-w-full min-w-0">
          
          {/* Left Column: Visual Showcase Gallery */}
          <div className="pdp-gallery-col w-full max-w-full min-w-0">
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
                        objectFit: 'contain',
                        maxWidth: '100%',
                        maxHeight: '100%',
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
                        objectFit: 'contain',
                        maxWidth: '100%',
                        maxHeight: '100%',
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
                  aria-label="Alejar (-)"
                  title="Alejar (-)"
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
                  aria-label="Acercar (+)"
                  title="Acercar (+)"
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
                    aria-label="Restablecer zoom"
                    title="Restablecer zoom (100%)"
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
                  aria-label="Pantalla completa"
                  title="Ampliar a pantalla completa"
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs hover:bg-white/20 text-white transition"
                >
                  ⛶
                </button>

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
                    aria-label="Foto anterior"
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
                    aria-label="Foto siguiente"
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
              <div className="pdp-thumbnails-strip w-full max-w-full min-w-0">
                {galleryImages.map((imgUrl, idx) => {
                  const isThumbVideo = isVideoUrl(imgUrl)
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={`pdp-thumb-btn relative ${activeImageIndex === idx ? 'active' : ''}`}
                      onClick={() => setActiveImageIndex(idx)}
                      aria-label={`Ver archivo multimedia ${idx + 1}`}
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
                MERCATUM Madrid · {product.category}
              </span>
              <h1 className="pdp-title">{product.name}</h1>
              <p className="pdp-type-sub">{product.type}</p>

              {/* Rating & Reviews */}
              <div className="pdp-rating-row">
                <span className="pdp-stars">★★★★★</span>
                <span className="pdp-rating-score">{product.rating}</span>
                <span className="pdp-reviews-count">({product.reviewsCount} opiniones verificadas de clientes)</span>
              </div>

              {/* Price */}
              <div className="pdp-price-row">
                <span className="pdp-price-tag">{displayedPrice}</span>
                {selectedVolumeOption && (
                  <span className="text-xs text-[#8ea07c] font-semibold bg-[#b8c8a6]/20 px-2 py-0.5 rounded ml-2">
                    para {selectedVolumeOption.volume}
                  </span>
                )}
                <span className="pdp-tax-note">IVA incl. · Envío express gratuito</span>
              </div>
            </div>

            {/* Volume / Contenance Selection (Multi-Tarifs ou Format Unique) */}
            {volumes.length > 0 ? (
              <div className="pdp-volume-selector">
                <label className="pdp-selector-label">
                  Capacidad / Formato : <strong>{selectedVolumeOption?.volume}</strong> —{' '}
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
                  Capacidad / Formato : <strong>{selectedVolume || contenanceOptions[0]}</strong>
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
                  Tono / Color : <strong>{formatColorEs(selectedColor)}</strong>
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
                        onClick={() => handleSelectColor(col)}
                      >
                        <span
                          className="w-3.5 h-3.5 rounded-full border border-black/20 flex-shrink-0 shadow-inner"
                          style={{ backgroundColor: hex }}
                        />
                        <span>{formatColorEs(col)}</span>
                        {isSelected && <span className="text-[10px] text-[#b8c8a6] font-bold">✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Quantity Selector */}
            <div className="pdp-quantity-row">
              <label className="pdp-selector-label">Cantidad :</label>
              <div className="pdp-quantity-control">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  aria-label="Disminuir la cantidad"
                >
                  -
                </button>
                <span>{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  aria-label="Aumentar la cantidad"
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
                Comprar ahora — {quantity > 1 ? `${((selectedVolumeOption?.rawPrice || displayedRawPrice) * quantity).toFixed(2).replace('.', ',')} €` : displayedPrice} ⚡
              </button>
              <button
                type="button"
                className="pdp-secondary-cart-btn"
                onClick={handleAddToCart}
              >
                Añadir a la cesta 🛒
              </button>
            </div>

            {/* Trust Reassurance Badges */}
            <div className="pdp-trust-badges">
              <div className="pdp-badge-item">
                <span className="pdp-badge-icon">🚚</span>
                <div>
                  <strong>Envío Gratuito & Asegurado</strong>
                  <p>Entrega rápida con seguimiento en 24 a 48 horas laborables.</p>
                </div>
              </div>
              <div className="pdp-badge-item">
                <span className="pdp-badge-icon">🎁</span>
                <div>
                  <strong>Embalaje Premium Protegido</strong>
                  <p>Preparado con la máxima protección y precinto oficial MERCATUM.</p>
                </div>
              </div>
              <div className="pdp-badge-item">
                <span className="pdp-badge-icon">🔒</span>
                <div>
                  <strong>Transferencia Inmediata 100% Segura</strong>
                  <p>Operación directa banco a banco con cifrado oficial y máxima protección. Confirmación en tiempo real para envío express en 24/48h.</p>
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
                  <span>La Creación & Descripción</span>
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
                  <span>Notas & Materiales de Excelencia</span>
                  <span className="pdp-accordion-arrow">{activeTab === 'ingredients' ? '−' : '+'}</span>
                </button>
                {activeTab === 'ingredients' && (
                  <div className="pdp-accordion-body">
                    <p style={{ lineHeight: '1.7' }}>
                      <strong>Calidad & Materiales de Excelencia :</strong> Componentes certificados de alto rendimiento, materiales seleccionados bajo los estándares europeos más exigentes y garantía oficial completa.
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
                  <span>Instrucciones & Consejos de Uso</span>
                  <span className="pdp-accordion-arrow">{activeTab === 'application' ? '−' : '+'}</span>
                </button>
                {activeTab === 'application' && (
                  <div className="pdp-accordion-body">
                    <p style={{ lineHeight: '1.7' }}>
                      Diseñado para un uso óptimo y seguro desde el primer día. Incluye manual detallado de instrucciones y recomendaciones para un mantenimiento sencillo y máxima durabilidad.
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
                  <span>Envío Asegurado & Devolución en 30 días</span>
                  <span className="pdp-accordion-arrow">{activeTab === 'livraison' ? '−' : '+'}</span>
                </button>
                {activeTab === 'livraison' && (
                  <div className="pdp-accordion-body">
                    <p style={{ lineHeight: '1.7' }}>
                      Todos los pedidos se procesan y expiden en 24/48h con seguro a todo riesgo. Dispone de un plazo de 30 días para cualquier cambio o devolución asistida por nuestro equipo de atención al cliente en España.
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
                <p className="eyebrow">Selección Exclusiva</p>
                <h2>Artículos recomendados</h2>
              </div>
              <Link href="/boutique" className="text-link">
                Explorar todo el catálogo <span>↗</span>
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
                      Comprar ahora ⚡
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
                Vista {activeImageIndex + 1} de {galleryImages.length} · MERCATUM
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
                  title="Alejar (-)"
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
                  title="Acercar (+)"
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
                    title="Restablecer zoom"
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
                aria-label="Cerrar pantalla completa"
                title="Cerrar (Esc)"
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
                  aria-label="Imagen anterior"
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
                  aria-label="Imagen siguiente"
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
                    <img src={imgUrl} alt={`Vista ${idx + 1}`} className="w-full h-full object-cover pointer-events-none" />
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
