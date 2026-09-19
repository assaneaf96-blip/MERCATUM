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

  const addItem = (item: any, explicitType?: 'image' | 'video') => {
    if (!item) return
    const url = typeof item === 'string' ? item.trim() : (item?.url ? String(item.url).trim() : '')
    if (!url || seenUrls.has(url)) return
    seenUrls.add(url)
    const isVideo = explicitType === 'video' || item?.type === 'video' || isVideoUrl(url)
    items.push({ url, type: isVideo ? 'video' : 'image' })
  }

  if (media && Array.isArray(media) && media.length > 0) {
    media.forEach((m) => addItem(m, typeof m === 'object' ? m?.type : undefined))
  }
  if (fallbackImage) {
    addItem(fallbackImage)
  }
  if (images && Array.isArray(images) && images.length > 0) {
    images.forEach((img) => addItem(img))
  }

  const [currentIndex, setCurrentIndex] = useState(0)

  const hasMultiple = items.length > 1

  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [zoomLevel, setZoomLevel] = useState<number>(1)

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setZoomLevel((prev) => Math.min(2.5, Number((prev + 0.4).toFixed(1))))
  }

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setZoomLevel((prev) => Math.max(1, Number((prev - 0.4).toFixed(1))))
  }

  const handleZoomReset = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setZoomLevel(1)
  }

  useEffect(() => {
    setZoomLevel(1)
  }, [currentIndex])

  useEffect(() => {
    if (currentIndex >= items.length && items.length > 0) {
      setCurrentIndex(0)
    }
  }, [items.length, currentIndex])

  const containerStyle =
    aspectRatio && aspectRatio !== 'unset' && aspectRatio !== 'auto'
      ? { aspectRatio }
      : { height: '100%' }

  // Si aucun média
  if (items.length === 0) {
    return (
      <div
        className={`w-full relative overflow-hidden bg-stone-100 flex items-center justify-center ${className}`}
        style={containerStyle}
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

  // Navigation tactile mobile par glissement (swipe)
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
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
  }

  const handleMouseLeave = () => {
    setZoomLevel(1)
  }

  return (
    <div
      className={`w-full relative overflow-hidden group bg-[#eadecc] ${className}`}
      style={containerStyle}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Média actuel (Image ou Vidéo) avec support du zoom */}
      {currentItem.type === 'video' ? (
        <video
          src={currentItem.url}
          className="w-full h-full object-cover"
          controls
          playsInline
          muted
          loop
          style={{
            transform: zoomLevel > 1 ? `scale(${zoomLevel})` : undefined,
            transformOrigin: 'center center',
            transition: 'transform 0.25s ease-out',
          }}
        />
      ) : (
        <img
          src={currentItem.url}
          alt={`${alt} - vue ${currentIndex + 1} sur ${items.length}`}
          className={`w-full h-full object-cover transition-transform duration-500 ${
            zoomLevel > 1 ? '' : 'group-hover:scale-105'
          }`}
          style={{
            transform: zoomLevel > 1 ? `scale(${zoomLevel})` : undefined,
            transformOrigin: 'center center',
            transition: 'transform 0.25s ease-out',
          }}
          onError={(e) => {
            const target = e.currentTarget
            if (target && !target.src.endsWith('/placeholder.svg')) {
              target.src = '/placeholder.svg'
            }
          }}
        />
      )}

      {/* Badge promotionnel */}
      {showBadge && (
        <span className="product-tag-badge z-10">{showBadge}</span>
      )}

      {/* Boutons Zoom + et - sur le produit */}
      <div
        className={`absolute bottom-2.5 left-2.5 z-20 flex items-center gap-1 bg-black/70 backdrop-blur-md text-white px-2 py-1 rounded-full shadow-lg border border-white/20 transition-opacity duration-200 ${
          zoomLevel > 1 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
        }}
      >
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoomLevel <= 1}
          aria-label="Dézoomer (-)"
          title="Dézoomer (-)"
          className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition ${
            zoomLevel <= 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/20 active:scale-90 text-white'
          }`}
        >
          −
        </button>
        <span className="text-[10px] font-semibold px-0.5 min-w-[28px] text-center select-none text-stone-200">
          {Math.round(zoomLevel * 100)}%
        </span>
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={zoomLevel >= 2.5}
          aria-label="Zoomer (+)"
          title="Zoomer (+)"
          className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition ${
            zoomLevel >= 2.5 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/20 active:scale-90 text-white'
          }`}
        >
          +
        </button>
        {zoomLevel > 1 && (
          <button
            type="button"
            onClick={handleZoomReset}
            aria-label="Réinitialiser"
            title="Réinitialiser le zoom"
            className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] hover:bg-white/25 text-stone-300 hover:text-white ml-0.5"
          >
            ↺
          </button>
        )}

      </div>

      {/* Flèches de navigation carrousel */}
      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label="Image précédente"
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center text-xs opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition shadow-md"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label="Image suivante"
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-black/60 hover:bg-black/85 text-white flex items-center justify-center text-xs opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition shadow-md"
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
