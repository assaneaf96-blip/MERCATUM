'use client'

import { useState, useEffect } from 'react'
import { MediaItem, isVideoUrl } from '@/lib/products'

interface ProductMediaCarouselProps {
  media?: MediaItem[]
  images?: string[]
  fallbackImage: string
  alt: string
  className?: string
  aspectRatio?: string
  showBadge?: string
}

export default function ProductMediaCarousel({
  media,
  images,
  fallbackImage,
  alt,
  className = '',
  aspectRatio = '1 / 1',
  showBadge,
}: ProductMediaCarouselProps) {
  // Construire la liste unifiée des éléments médias sans doublons
  const items: MediaItem[] = []
  const seenUrls = new Set<string>()

  const addItem = (url: string, explicitType?: 'image' | 'video') => {
    if (!url || seenUrls.has(url)) return
    seenUrls.add(url)
    const isVideo = explicitType === 'video' || isVideoUrl(url)
    items.push({ url, type: isVideo ? 'video' : 'image' })
  }

  if (media && media.length > 0) {
    media.forEach((m) => addItem(m.url, m.type))
  }
  if (fallbackImage) {
    addItem(fallbackImage)
  }
  if (images && images.length > 0) {
    images.forEach((img) => addItem(img))
  }

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  const hasMultiple = items.length > 1

  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  // Défilement automatique toutes les 3.5 secondes si plus d'une image
  useEffect(() => {
    if (!hasMultiple || isPaused) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length)
    }, 3500)
    return () => clearInterval(interval)
  }, [hasMultiple, isPaused, items.length])

  // Sécurité pour réinitialiser l'index si la liste des photos change
  useEffect(() => {
    if (currentIndex >= items.length && items.length > 0) {
      setCurrentIndex(0)
    }
  }, [items.length, currentIndex])

  // Si aucun média
  if (items.length === 0) {
    return (
      <div
        className={`relative overflow-hidden bg-stone-100 flex items-center justify-center ${className}`}
        style={{ aspectRatio }}
      >
        <img src="/placeholder.svg" alt={alt} className="w-full h-full object-cover" />
      </div>
    )
  }

  const currentItem = items[currentIndex] || items[0]

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1))
  }

  const handleNext = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1))
  }

  const handleSelect = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setCurrentIndex(idx)
  }

  // Gestion tactile mobile (swipe et pause sans blocage)
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
    setIsPaused(true)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX !== null && items.length > 1) {
      const touchEndX = e.changedTouches[0].clientX
      const diff = touchStartX - touchEndX
      if (diff > 35) {
        handleNext()
      } else if (diff < -35) {
        handlePrev()
      }
    }
    setTouchStartX(null)
    setTimeout(() => setIsPaused(false), 2500)
  }

  const handleMouseEnter = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches) {
      setIsPaused(true)
    }
  }

  const handleMouseLeave = () => {
    setIsPaused(false)
  }

  return (
    <div
      className={`relative overflow-hidden group bg-[#eadecc] ${className}`}
      style={{ aspectRatio }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Média actuel (Image ou Vidéo) */}
      {currentItem.type === 'video' ? (
        <video
          src={currentItem.url}
          className="w-full h-full object-cover"
          controls
          playsInline
          muted
          loop
        />
      ) : (
        <img
          src={currentItem.url}
          alt={`${alt} - vue ${currentIndex + 1} sur ${items.length}`}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            ;(e.target as HTMLImageElement).src = '/placeholder.svg'
          }}
        />
      )}

      {/* Badge promotionnel */}
      {showBadge && (
        <span className="product-tag-badge z-10">{showBadge}</span>
      )}

      {/* Flèches de navigation carrousel */}
      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Image précédente"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition shadow-md"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Image suivante"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition shadow-md"
          >
            ›
          </button>

          {/* Indicateurs / Puces */}
          <div className="absolute bottom-2 left-0 right-0 z-10 flex justify-center items-center gap-1.5 px-2 flex-wrap max-w-[90%] mx-auto pointer-events-none">
            {items.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={(e) => handleSelect(idx, e)}
                aria-label={`Aller au média ${idx + 1}`}
                className={`pointer-events-auto rounded-full transition-all ${
                  currentIndex === idx
                    ? 'w-4 h-1.5 bg-white shadow'
                    : 'w-1.5 h-1.5 bg-white/60 hover:bg-white'
                }`}
              />
            ))}
          </div>

          {/* Compteur de photos visible et précis */}
          <div className="absolute top-2 right-2 z-10 text-[11px] font-bold px-2 py-0.5 rounded bg-black/65 text-white pointer-events-none backdrop-blur-sm shadow-sm">
            {currentIndex + 1}/{items.length} {currentItem.type === 'video' ? '🎬' : '📷'}
          </div>
        </>
      )}
    </div>
  )
}
