import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Cache mémoire serveur (RAM) pour répondre instantanément (< 1ms) aux requêtes répétées
const imageMemoryCache = new Map<string, { buffer: Buffer; mimeType: string; timestamp: number }>()
const IMAGE_CACHE_TTL = 1000 * 60 * 60 * 24 // 24 heures

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=2592000, s-maxage=31536000, stale-while-revalidate=86400, immutable',
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const index = parseInt(searchParams.get('index') || '0', 10)

    if (!id) {
      return NextResponse.redirect(new URL('/placeholder.svg', request.url))
    }

    const cacheKey = `${id}:${index}`
    const cached = imageMemoryCache.get(cacheKey)
    if (cached && (Date.now() - cached.timestamp < IMAGE_CACHE_TTL)) {
      return new NextResponse(cached.buffer, {
        status: 200,
        headers: {
          'Content-Type': cached.mimeType,
          'Content-Length': cached.buffer.length.toString(),
          ...CACHE_HEADERS,
        },
      })
    }

    const { data, error } = await supabase
      .from('products')
      .select('image, images, media')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.redirect(new URL('/placeholder.svg', request.url))
    }

    let rawImages: string[] = []
    if (Array.isArray(data.images) && data.images.length > 0) {
      rawImages = data.images.filter(Boolean)
    } else if (typeof data.images === 'string') {
      try {
        const parsed = JSON.parse(data.images)
        if (Array.isArray(parsed)) rawImages = parsed.filter(Boolean)
      } catch {}
    }

    let rawMedia: string[] = []
    if (Array.isArray(data.media) && data.media.length > 0) {
      rawMedia = data.media.map((m: any) => (typeof m === 'string' ? m : m?.url)).filter(Boolean)
    } else if (typeof data.media === 'string') {
      try {
        const parsed = JSON.parse(data.media)
        if (Array.isArray(parsed)) {
          rawMedia = parsed.map((m: any) => (typeof m === 'string' ? m : m?.url)).filter(Boolean)
        }
      } catch {}
    }

    if (rawMedia.length > rawImages.length) {
      rawImages = rawMedia
    }

    let raw = ''
    if (rawImages.length > 0) {
      raw = String(rawImages[index] || rawImages[0] || data.image || '').trim()
    } else {
      raw = String(data.image || '').trim()
    }

    // 1. Si c'est une URL directe (http:// ou https://)
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return NextResponse.redirect(raw)
    }

    // 2. Si c'est un chemin relatif (/images/... ou /uploads/...)
    if (raw.startsWith('/')) {
      return NextResponse.redirect(new URL(raw, request.url))
    }

    // 3. Si c'est une image Data URL base64
    if (raw.startsWith('data:')) {
      const parts = raw.split(';base64,')
      if (parts.length === 2) {
        const mimeType = parts[0].replace('data:', '') || 'image/jpeg'
        const buffer = Buffer.from(parts[1], 'base64')

        // Mettre en cache mémoire (limité à 500 entrées pour éviter de surcharger la RAM)
        if (imageMemoryCache.size > 500) {
          const oldestKey = imageMemoryCache.keys().next().value
          if (oldestKey) imageMemoryCache.delete(oldestKey)
        }
        imageMemoryCache.set(cacheKey, { buffer, mimeType, timestamp: Date.now() })

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Content-Length': buffer.length.toString(),
            ...CACHE_HEADERS,
          },
        })
      }
    }

    return NextResponse.redirect(new URL('/placeholder.svg', request.url))
  } catch (err) {
    console.error('Erreur /api/product-image:', err)
    return NextResponse.redirect(new URL('/placeholder.svg', request.url))
  }
}
