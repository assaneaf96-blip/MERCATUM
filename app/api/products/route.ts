import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

import { extractContenance, extractVolumes, extractColors, isVideoUrl } from '@/lib/products'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Surrogate-Control': 'no-store',
  'CDN-Cache-Control': 'no-store',
  'Vercel-CDN-Cache-Control': 'no-store',
}

const FAST_CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=15, stale-while-revalidate=120',
  'CDN-Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
  'Vercel-CDN-Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
}

interface CacheEntry {
  products: any[]
  timestamp: number
}

let serverCache: CacheEntry | null = null
const CACHE_TTL_MS = 120000 // 2 minutes de cache mémoire serveur ultra-rapide

function formatProduct(item: any) {
  const vols = extractVolumes(item)
  const cols = extractColors(item)
  const imagesList = Array.isArray(item.images) && item.images.length > 0
    ? item.images
    : (item.image ? [item.image] : [])
  const mediaList = Array.isArray(item.media) && item.media.length > 0
    ? item.media
    : imagesList.map((url: string) => ({
        url,
        type: isVideoUrl(url) ? 'video' : 'image',
      }))

  return {
    id: item.id,
    name: item.name,
    category: item.category,
    type: item.type || '',
    price: item.price,
    rawPrice: Number(item.raw_price) || 0,
    description: item.description || '',
    image: item.image || (imagesList[0] || ''),
    images: imagesList,
    media: mediaList,
    tag: item.tag || '',
    contenance: item.contenance || extractContenance(item),
    volumes: vols.length > 0 ? vols : undefined,
    colors: cols.length > 0 ? cols : undefined,
    color: cols.length > 0 ? cols.join(', ') : undefined,
    rating: Number(item.rating) || 5.0,
    reviewsCount: Number(item.reviews_count) || 1,
  }
}

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { success: false, error: 'Supabase non configuré' },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      // Pour une fiche produit individuelle, on interroge toujours Supabase en direct avec select('*')
      // afin de charger l'intégralité de la galerie photos / vidéos haute résolution.
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        return NextResponse.json(
          { success: false, error: error?.message || 'Produit introuvable' },
          { status: 404, headers: NO_CACHE_HEADERS }
        )
      }

      return NextResponse.json(
        { success: true, product: formatProduct(data) },
        { headers: NO_CACHE_HEADERS }
      )
    }

    // 2. Pour la liste complète :
    // Si le cache mémoire serveur est actif et récent, répondre INSTANTANÉMENT (< 1ms)
    if (serverCache && serverCache.products.length > 0 && (Date.now() - serverCache.timestamp < CACHE_TTL_MS)) {
      return NextResponse.json(
        { success: true, products: serverCache.products, cached: true },
        { headers: FAST_CACHE_HEADERS }
      )
    }

    // 3. Récupération directe Supabase optimisée :
    // On exclut les colonnes lourdes (images[] base64 et media base64) de la liste globale
    // pour garantir un temps de réponse instantané sans jamais de timeout.
    // L'image principale (image) est conservée pour les miniatures du catalogue.
    // Les galeries complètes sont chargées à la demande via ?id=...
    const { data, error } = await supabase
      .from('products')
      .select('id, name, category, type, price, raw_price, description, image, tag, rating, reviews_count, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      // En cas de coupure temporaire Supabase, servir le cache précédent si disponible
      if (serverCache && serverCache.products.length > 0) {
        return NextResponse.json(
          { success: true, products: serverCache.products, stale: true },
          { headers: FAST_CACHE_HEADERS }
        )
      }
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: NO_CACHE_HEADERS }
      )
    }

    const products = (data || []).map((item) => formatProduct(item))

    // Mettre à jour le cache serveur
    serverCache = {
      products,
      timestamp: Date.now(),
    }

    return NextResponse.json(
      { success: true, products },
      { headers: FAST_CACHE_HEADERS }
    )
  } catch (err: any) {
    console.error('Erreur API /api/products GET:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Erreur serveur interne' },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

export async function POST(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { success: false, error: 'Supabase non configuré' },
      { status: 500 }
    )
  }

  try {
    const body = await request.json()
    if (!body || !body.id || !body.name) {
      return NextResponse.json(
        { success: false, error: 'Les champs "id" et "name" sont requis.' },
        { status: 400 }
      )
    }

    const mediaList = Array.isArray(body.media) ? body.media : []
    const imagesList = Array.isArray(body.images) && body.images.length > 0
      ? body.images
      : mediaList.map((m: any) => (typeof m === 'string' ? m : m?.url)).filter(Boolean)

    const primaryImage =
      (typeof body.image === 'string' && body.image.trim()) ||
      imagesList[0] ||
      ''

    const payload = {
      id: String(body.id),
      name: String(body.name),
      category: body.category || 'Haute Cosmétique',
      type: body.type || '',
      price: body.price || '0 €',
      raw_price: Number(body.rawPrice) || 0,
      description: body.description || '',
      image: primaryImage,
      images: imagesList,
      media: mediaList,
      tag: body.tag || '',
      rating: Number(body.rating) || 5.0,
      reviews_count: Number(body.reviewsCount) || 1,
    }

    const { data, error } = await supabase
      .from('products')
      .upsert(payload, { onConflict: 'id' })
      .select()

    if (error) {
      console.error('Erreur Supabase upsert:', error.message)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      )
    }

    const savedFormatted = data && data.length > 0 ? formatProduct(data[0]) : formatProduct(payload)

    // Mettre à jour immédiatement le cache serveur si le catalogue complet y réside,
    // ou invalider pour forcer un rechargement complet propre au prochain appel
    if (serverCache && Array.isArray(serverCache.products) && serverCache.products.length > 10) {
      const idx = serverCache.products.findIndex((p) => p.id === savedFormatted.id)
      if (idx >= 0) {
        serverCache.products[idx] = savedFormatted
      } else {
        serverCache.products.unshift(savedFormatted)
      }
      serverCache.timestamp = Date.now()
    } else {
      serverCache = null
    }

    // Invalider immédiatement les pages statiques/SSR Next.js
    try {
      revalidatePath('/api/products')
      revalidatePath('/boutique')
      revalidatePath('/')
      revalidatePath('/admin')
      if (payload.id) {
        revalidatePath(`/produit/${payload.id}`)
      }
    } catch {}

    return NextResponse.json({
      success: true,
      product: savedFormatted,
    }, { headers: NO_CACHE_HEADERS })
  } catch (err: any) {
    console.error('Erreur API /api/products POST:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Erreur interne lors de la sauvegarde' },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

export async function DELETE(request: NextRequest) {
  if (!isSupabaseConfigured) {
    return NextResponse.json(
      { success: false, error: 'Supabase non configuré' },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    let id = searchParams.get('id')

    if (!id) {
      const body = await request.json().catch(() => ({}))
      id = body?.id
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID du produit requis' },
        { status: 400, headers: NO_CACHE_HEADERS }
      )
    }

    const { error } = await supabase.from('products').delete().eq('id', id)

    if (error) {
      console.error('Erreur Supabase delete:', error.message)
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500, headers: NO_CACHE_HEADERS }
      )
    }

    // Retirer immédiatement du cache serveur
    if (serverCache && Array.isArray(serverCache.products)) {
      serverCache.products = serverCache.products.filter((p) => p.id !== id)
      serverCache.timestamp = Date.now()
    }

    // Invalider immédiatement les pages statiques/SSR Next.js
    try {
      revalidatePath('/api/products')
      revalidatePath('/boutique')
      revalidatePath('/')
      revalidatePath('/admin')
      revalidatePath(`/produit/${id}`)
    } catch {}

    return NextResponse.json({ success: true }, { headers: NO_CACHE_HEADERS })
  } catch (err: any) {
    console.error('Erreur API /api/products DELETE:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Erreur interne lors de la suppression' },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}
