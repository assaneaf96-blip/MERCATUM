import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import fs from 'fs'
import path from 'path'

// Cache mémoire serveur (RAM) pour chaque image individuelle formatée
const imageMemoryCache = new Map<string, { buffer: Buffer; mimeType: string; timestamp: number }>()
const IMAGE_CACHE_TTL = 1000 * 60 * 60 * 24 // 24 heures

// Cache mémoire des galeries complètes (id -> tableau d'images)
const galleryCache = new Map<string, { images: string[]; timestamp: number }>()
const GALLERY_CACHE_TTL = 1000 * 60 * 60 * 2 // 2 heures

// Déduplication des requêtes simultanées pour éviter de saturer Supabase
const inflightQueries = new Map<string, Promise<string | null>>()

// Cache Edge Vercel CDN : mise en cache CDN à long terme (1 an au Edge CDN)
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800, immutable',
  'CDN-Cache-Control': 'public, max-age=31536000',
  'Vercel-CDN-Cache-Control': 'public, max-age=31536000',
}

// Fallback SVG haute fidélité MERCATUM renvoyé directement avec statut 200 (évite le [?] cassé sur iOS Safari)
const PLACEHOLDER_SVG = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400" fill="none">
    <rect width="400" height="400" fill="#f5f5f4"/>
    <circle cx="200" cy="180" r="28" fill="#e7e5e4"/>
    <path d="M140 255l38-46 28 32 32-38 42 52H140z" fill="#d6d3d1"/>
    <text x="200" y="292" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="600" fill="#a8a29e" letter-spacing="3">MERCATUM</text>
  </svg>`,
  'utf-8'
)

function getPlaceholderResponse(status = 200) {
  return new NextResponse(PLACEHOLDER_SVG, {
    status,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Content-Length': PLACEHOLDER_SVG.length.toString(),
      'Cache-Control': 'public, max-age=120, s-maxage=300',
    },
  })
}

function getMimeTypeFromFilename(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  if (ext === '.webp') return 'image/webp'
  if (ext === '.png') return 'image/png'
  if (ext === '.svg') return 'image/svg+xml'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.avif') return 'image/avif'
  return 'image/jpeg'
}

async function fetchImageFromSupabase(id: string, index: number): Promise<string | null> {
  const queryKey = `${id}:${index}`
  if (inflightQueries.has(queryKey)) {
    return inflightQueries.get(queryKey)!
  }

  const queryPromise = (async (): Promise<string | null> => {
    try {
      // 1. Pour la vignette principale (index === 0), requêter uniquement la colonne 'image'
      // Cela évite de transférer plusieurs Mo de photos Base64 contenues dans 'media' et 'images'
      if (index === 0) {
        const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: new Error('Supabase query timeout') }), 7000)
        )

        const dbPromise = supabase
          .from('products')
          .select('image')
          .eq('id', id)
          .maybeSingle()

        const res = await Promise.race([dbPromise, timeoutPromise])
        const singleImage = res?.data?.image
        if (singleImage && typeof singleImage === 'string' && singleImage.trim()) {
          return singleImage.trim()
        }
      }

      // 2. Si index > 0 ou si 'image' principale était vide, récupérer la galerie complète
      const cached = galleryCache.get(id)
      if (cached && Date.now() - cached.timestamp < GALLERY_CACHE_TTL) {
        return cached.images[index] || cached.images[0] || null
      }

      const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error('Supabase query timeout') }), 7000)
      )

      const dbPromise = supabase
        .from('products')
        .select('image, images, media')
        .eq('id', id)
        .maybeSingle()

      const res = await Promise.race([dbPromise, timeoutPromise])
      const data = res?.data
      if (!data) return null

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

      if (finalList.length > 0) {
        galleryCache.set(id, { images: finalList, timestamp: Date.now() })
        return finalList[index] || finalList[0] || null
      }

      return null
    } catch (e) {
      console.warn(`[product-image] Erreur récupération Supabase pour id=${id}:`, e)
      return null
    } finally {
      inflightQueries.delete(queryKey)
    }
  })()

  inflightQueries.set(queryKey, queryPromise)
  return queryPromise
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const index = parseInt(searchParams.get('index') || '0', 10)

    if (!id) {
      return getPlaceholderResponse(200)
    }

    const cacheKey = `${id}:${index}`

    // 1. Vérifier le cache mémoire RAM de l'image exacte (réponse en 0ms)
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

    // 2. Récupérer l'image depuis Supabase avec déduplication
    const raw = await fetchImageFromSupabase(id, index)

    if (!raw) {
      return getPlaceholderResponse(200)
    }

    // A. URL HTTP/HTTPS directe
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return NextResponse.redirect(raw, {
        status: 301,
        headers: CACHE_HEADERS,
      })
    }

    // B. Chemin local (/uploads/... ou /idole-now.webp)
    if (raw.startsWith('/')) {
      try {
        const cleanPath = raw.split('?')[0].replace(/^\//, '')
        const localPath = path.join(process.cwd(), 'public', cleanPath)
        if (fs.existsSync(localPath)) {
          const buffer = fs.readFileSync(localPath)
          const mimeType = getMimeTypeFromFilename(localPath)

          if (imageMemoryCache.size > 800) {
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
      } catch (err) {
        // En cas d'erreur de lecture locale, fallback sur redirection
      }

      return NextResponse.redirect(new URL(raw, request.url), {
        status: 301,
        headers: CACHE_HEADERS,
      })
    }

    // C. Image Base64 (data:image/...)
    if (raw.startsWith('data:')) {
      const parts = raw.split(';base64,')
      if (parts.length === 2) {
        const mimeType = parts[0].replace('data:', '') || 'image/jpeg'
        const buffer = Buffer.from(parts[1], 'base64')

        // Mettre en cache mémoire (jusqu'à 800 images en RAM)
        if (imageMemoryCache.size > 800) {
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

    return getPlaceholderResponse(200)
  } catch (err) {
    console.error('Erreur /api/product-image:', err)
    return getPlaceholderResponse(200)
  }
}
