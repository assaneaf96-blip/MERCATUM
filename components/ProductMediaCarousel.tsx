'use client'

import { useState } from 'react'
import { MediaItem } from '@/lib/products'

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
  // Construire la liste unifiée des éléments médias
  const items: MediaItem[] = []

  if (media && media.length > 0) {
    items.push(...media)
  } else if (images && images.length > 0) {
    images.forEach((url) => {
      const isVideo = /\.(mp4|webm|mov|avi|m4v|ogg)$/i.test(url)
      items.push({ url, type: isVideo ? 'video' : 'image' })
    })
  } else if (fallbackImage) {
    const isVideo = /\.(mp4|webm|mov|avi|m4v|ogg)$/i.test(fallbackImage)
    items.push({ url: fallbackImage, type: isVideo ? 'video' : 'image' })
  }

  const [currentIndex, setCurrentIndex] = useState(0)

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
  const hasMultiple = items.length > 1

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setCurrentIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1))
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setCurrentIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1))
  }

  const handleSelect = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    setCurrentIndex(idx)
  }

  return (
    <div
      className={`relative overflow-hidden group bg-[#eadecc] ${className}`}
      style={{ aspectRatio }}
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
          alt={`${alt} - vue ${currentIndex + 1}`}
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
          <div className="absolute bottom-2 left-0 right-0 z-10 flex justify-center items-center gap-1.5 pointer-events-none">
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

          {/* Compteur discret */}
          <div className="absolute top-2 right-2 z-10 text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/50 text-white pointer-events-none">
            {currentIndex + 1}/{items.length} {currentItem.type === 'video' ? '🎬' : '📷'}
          </div>
        </>
      )}
    </div>
  )
}
