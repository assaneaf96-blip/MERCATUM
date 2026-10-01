import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import fs from 'fs'
import path from 'path'

// Cache mémoire serveur (RAM) pour répondre instantanément (< 1ms)
const imageMemoryCache = new Map<string, { buffer: Buffer; mimeType: string; timestamp: number }>()
const IMAGE_CACHE_TTL = 1000 * 60 * 60 * 24 // 24 heures

// Cache Edge Vercel CDN : mise en cache CDN à long terme avec réutilisation automatique
const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800, immutable',
  'CDN-Cache-Control': 'public, max-age=31536000',
  'Vercel-CDN-Cache-Control': 'public, max-age=31536000',
}

// Index local paresseux issu de public/products.json pour éviter tout appel réseau à Supabase
let localProductsMap: Map<string, any> | null = null

function getLocalProduct(id: string): any {
  if (!localProductsMap) {
    try {
      const p = path.join(process.cwd(), 'public', 'products.json')
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf-8')
        const items = JSON.parse(raw)
        if (Array.isArray(items)) {
          const map = new Map<string, any>()
          for (const item of items) {
            if (item && item.id) {
              map.set(String(item.id), item)
            }
          }
          localProductsMap = map
        }
      }
    } catch {
      localProductsMap = new Map()
    }
  }
  return localProductsMap?.get(id) || null
}

function extractRawImage(data: any, index: number): string {
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

  if (rawImages.length > 0) {
    return String(rawImages[index] || rawImages[0] || data.image || '').trim()
  }
  return String(data.image || '').trim()
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

    // 1. Chercher d'abord dans le catalogue local pré-généré (0ms de latence, 0 appel Supabase)
    let productData = getLocalProduct(id)

    // 2. Si pas trouvé dans le fichier local (ex: nouveau produit ajouté en direct),
    // interroger Supabase avec un timeout STRICT de 3.5 secondes pour empêcher tout 504 de Vercel
    if (!productData) {
      try {
        const timeoutPromise = new Promise<{ data: null; error: any }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: new Error('Supabase query timeout') }), 3500)
        )
        const dbPromise = supabase
          .from('products')
          .select('image, images, media')
          .eq('id', id)
          .maybeSingle()

        const res = await Promise.race([dbPromise, timeoutPromise])
        if (res && res.data) {
          productData = res.data
        }
      } catch (e) {
        console.warn('Erreur ou timeout Supabase pour image:', id, e)
      }
    }

    if (!productData) {
      return NextResponse.redirect(new URL('/placeholder.svg', request.url), {
        status: 302,
        headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' }
      })
    }

    const raw = extractRawImage(productData, index)

    if (!raw) {
      return NextResponse.redirect(new URL('/placeholder.svg', request.url), {
        status: 302,
        headers: { 'Cache-Control': 'public, max-age=60, s-maxage=60' }
      })
    }

    // 1. Si c'est une URL directe (http:// ou https://)
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return NextResponse.redirect(raw, {
        status: 301,
        headers: CACHE_HEADERS,
      })
    }

    // 2. Si c'est un chemin relatif (/images/... ou /uploads/...)
    if (raw.startsWith('/')) {
      return NextResponse.redirect(new URL(raw, request.url), {
        status: 301,
        headers: CACHE_HEADERS,
      })
    }

    // 3. Si c'est une image Data URL base64
    if (raw.startsWith('data:')) {
      const parts = raw.split(';base64,')
      if (parts.length === 2) {
        const mimeType = parts[0].replace('data:', '') || 'image/jpeg'
        const buffer = Buffer.from(parts[1], 'base64')

        // Mettre en cache mémoire (limité à 300 entrées pour protéger la RAM)
        if (imageMemoryCache.size > 300) {
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
