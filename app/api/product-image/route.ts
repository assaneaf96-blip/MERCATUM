import { NextRequest, NextResponse } from 'next/server'
import {
  imageBufferCache,
  BUFFER_CACHE_TTL,
  getOrFetchGallery,
  getMimeTypeFromFilename,
} from '@/lib/imageCache'
import fs from 'fs'
import path from 'path'

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const index = parseInt(searchParams.get('index') || '0', 10)

    if (!id) {
      return getPlaceholderResponse(200)
    }

    const cacheKey = `${id}:${index}`

    // 1. Vérifier si le buffer est DÉJÀ décodé en mémoire RAM (réponse ultra-rapide < 1ms)
    const cachedBuffer = imageBufferCache.get(cacheKey)
    if (cachedBuffer && (Date.now() - cachedBuffer.timestamp < BUFFER_CACHE_TTL)) {
      return new NextResponse(cachedBuffer.buffer, {
        status: 200,
        headers: {
          'Content-Type': cachedBuffer.mimeType,
          'Content-Length': cachedBuffer.buffer.length.toString(),
          ...CACHE_HEADERS,
        },
      })
    }

    // 2. Récupérer la galerie complète du produit
    // Grâce à inflightProductQueries, si 10 requêtes pour le même produit arrivent en même temps,
    // UNE SEULE requête Supabase est exécutée et tous les buffers sont pré-décodés dans setGalleryInCache !
    const gallery = await getOrFetchGallery(id)

    // Vérifier si le buffer a été pré-rempli par getOrFetchGallery
    const postFetchBuffer = imageBufferCache.get(cacheKey)
    if (postFetchBuffer) {
      return new NextResponse(postFetchBuffer.buffer, {
        status: 200,
        headers: {
          'Content-Type': postFetchBuffer.mimeType,
          'Content-Length': postFetchBuffer.buffer.length.toString(),
          ...CACHE_HEADERS,
        },
      })
    }

    let raw = ''
    if (gallery.length > 0) {
      raw = String(gallery[index] || (index === 0 ? gallery[0] : '')).trim()
    }

    if (!raw) {
      try {
        const jsonPath = path.join(process.cwd(), 'public', 'products.json')
        if (fs.existsSync(jsonPath)) {
          const content = fs.readFileSync(jsonPath, 'utf8')
          const arr = JSON.parse(content)
          const found = arr.find((p: any) => p && p.id === id)
          if (found) {
            const fImgs = Array.isArray(found.images) ? found.images.filter(Boolean) : []
            raw = String(fImgs[index] || (index === 0 ? found.image : '')).trim()
          }
        }
      } catch {}
    }

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
    if (raw.startsWith('/') && !raw.startsWith('/api/product-image')) {
      try {
        const cleanPath = raw.split('?')[0].replace(/^\//, '')
        const localPath = path.join(process.cwd(), 'public', cleanPath)
        if (fs.existsSync(localPath)) {
          const buffer = fs.readFileSync(localPath)
          const mimeType = getMimeTypeFromFilename(localPath)
          imageBufferCache.set(cacheKey, { buffer, mimeType, timestamp: Date.now() })

          return new NextResponse(buffer, {
            status: 200,
            headers: {
              'Content-Type': mimeType,
              'Content-Length': buffer.length.toString(),
              ...CACHE_HEADERS,
            },
          })
        }
      } catch (err) {}

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
        imageBufferCache.set(cacheKey, { buffer, mimeType, timestamp: Date.now() })

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
