import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Cache mémoire serveur (RAM) pour chaque image individuelle formatée
const imageMemoryCache = new Map<string, { buffer: Buffer; mimeType: string; timestamp: number }>()
const IMAGE_CACHE_TTL = 1000 * 60 * 60 * 24 // 24 heures

// Cache mémoire des galeries complètes (id -> tableau d'images)
const galleryCache = new Map<string, { images: string[]; timestamp: number }>()
const GALLERY_CACHE_TTL = 1000 * 60 * 60 * 2 // 2 heures

// Déduplication des requêtes simultanées vers Supabase pour un même produit
const inflightGalleryQueries = new Map<string, Promise<string[]>>()

// Cache Edge Vercel CDN : mise en cache CDN à long terme
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800, immutable',
  'CDN-Cache-Control': 'public, max-age=31536000',
  'Vercel-CDN-Cache-Control': 'public, max-age=31536000',
}

async function fetchGalleryFromSupabase(id: string): Promise<string[]> {
  // 1. Vérifier si la galerie complète est déjà en cache mémoire
  const cached = galleryCache.get(id)
  if (cached && Date.now() - cached.timestamp < GALLERY_CACHE_TTL) {
    return cached.images
  }

  // 2. Si une requête est déjà en vol pour ce même produit, attendre sa réponse
  if (inflightGalleryQueries.has(id)) {
    return inflightGalleryQueries.get(id)!
  }

  // 3. Lancer une seule requête Supabase pour récupérer TOUTES les photos de la galerie
  const queryPromise = (async () => {
    try {
      const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('Supabase query timeout') }), 4500)
      )

      const dbPromise = supabase
        .from('products')
        .select('image, images, media')
        .eq('id', id)
        .maybeSingle()

      const res = await Promise.race([dbPromise, timeoutPromise])
      const data = res?.data
      if (!data) return []

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

      const finalList = rawMedia.length >= rawImages.length ? rawMedia : rawImages
      if (finalList.length === 0 && data.image) {
        finalList.push(String(data.image).trim())
      }

      // Sauvegarder dans le cache des galeries
      galleryCache.set(id, { images: finalList, timestamp: Date.now() })
      return finalList
    } catch (e) {
      console.warn('Erreur récupération galerie produit:', id, e)
      return []
    } finally {
      inflightGalleryQueries.delete(id)
    }
  })()

  inflightGalleryQueries.set(id, queryPromise)
  return queryPromise
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const index = parseInt(searchParams.get('index') || '0', 10)

    if (!id) {
      return NextResponse.redirect(new URL('/placeholder.svg', request.url), {
        status: 302,
        headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' }
      })
    }

    const cacheKey = `${id}:${index}`

    // 1. Vérifier le cache mémoire de l'image exacte (RAM)
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

    // 2. Récupérer la galerie complète du produit depuis Supabase (avec déduplication automatique)
    const gallery = await fetchGalleryFromSupabase(id)

    // Récupérer l'image précise correspondant à l'index demandé
    let raw = ''
    if (gallery.length > 0) {
      raw = String(gallery[index] || (index === 0 ? gallery[0] : '')).trim()
    }

    if (!raw) {
      return NextResponse.redirect(new URL('/placeholder.svg', request.url), {
        status: 302,
        headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' }
      })
    }

    // A. URL directe (http:// ou https://)
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return NextResponse.redirect(raw, {
        status: 301,
        headers: CACHE_HEADERS,
      })
    }

    // B. Chemin relatif (/images/... ou /uploads/...)
    if (raw.startsWith('/')) {
      return NextResponse.redirect(new URL(raw, request.url), {
        status: 301,
        headers: CACHE_HEADERS,
      })
    }

    // C. Image Base64
    if (raw.startsWith('data:')) {
      const parts = raw.split(';base64,')
      if (parts.length === 2) {
        const mimeType = parts[0].replace('data:', '') || 'image/jpeg'
        const buffer = Buffer.from(parts[1], 'base64')

        // Mettre en cache mémoire (limité à 400 images pour protéger la RAM)
        if (imageMemoryCache.size > 400) {
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

    return NextResponse.redirect(new URL('/placeholder.svg', request.url), {
      status: 302,
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' }
    })
  } catch (err) {
    console.error('Erreur /api/product-image:', err)
    return NextResponse.redirect(new URL('/placeholder.svg', request.url), {
      status: 302,
      headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' }
    })
  }
}
