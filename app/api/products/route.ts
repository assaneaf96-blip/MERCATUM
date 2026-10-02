import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { setGalleryInCache } from '@/lib/imageCache'
import fs from 'fs'
import path from 'path'

import { PRODUCTS, extractContenance, extractVolumes, extractColors, extractColorImages, isVideoUrl } from '@/lib/products'

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

interface CacheEntry {
  products: any[]
  timestamp: number
}

let serverCache: CacheEntry | null = null
const CACHE_TTL_MS = 60000 // 1 minute de cache mémoire serveur ultra-rapide (< 1ms)

let cachedProductsJsonMap: Map<string, any> | null = null

function getProductsJsonMap(): Map<string, any> {
  if (cachedProductsJsonMap) return cachedProductsJsonMap
  cachedProductsJsonMap = new Map()
  try {
    const jsonPath = path.join(process.cwd(), 'public', 'products.json')
    if (fs.existsSync(jsonPath)) {
      const content = fs.readFileSync(jsonPath, 'utf8')
      const arr = JSON.parse(content)
      if (Array.isArray(arr)) {
        arr.forEach((p) => {
          if (p && p.id) cachedProductsJsonMap!.set(p.id, p)
        })
      }
    }
  } catch (err) {
    console.warn('Erreur chargement public/products.json:', err)
  }
  return cachedProductsJsonMap
}

// Cache individuel par produit (id → produit formaté)
const productCache = new Map<string, { product: any; timestamp: number }>()
const PRODUCT_CACHE_TTL_MS = 3600000 // 1 heure


function formatProduct(item: any) {
  const vols = extractVolumes(item)
  const cols = extractColors(item)
  const colImgs = extractColorImages(item)

  const jsonMap = getProductsJsonMap()
  const jsonProduct = jsonMap.get(item.id)
  const defProduct = PRODUCTS.find((p) => p.id === item.id) || jsonProduct

  let rawImages: string[] = []
  if (Array.isArray(item.images)) {
    rawImages = item.images.filter(Boolean)
  } else if (typeof item.images === 'string') {
    try {
      const parsed = JSON.parse(item.images)
      if (Array.isArray(parsed)) rawImages = parsed.filter(Boolean)
    } catch {}
  }
  if (rawImages.length === 0 && jsonProduct?.images && Array.isArray(jsonProduct.images)) {
    rawImages = jsonProduct.images.filter(Boolean)
  }

  let rawMedia: any[] = []
  if (Array.isArray(item.media)) {
    rawMedia = item.media.filter(Boolean)
  } else if (typeof item.media === 'string') {
    try {
      const parsed = JSON.parse(item.media)
      if (Array.isArray(parsed)) rawMedia = parsed.filter(Boolean)
    } catch {}
  }
  if (rawMedia.length === 0 && jsonProduct?.media && Array.isArray(jsonProduct.media)) {
    rawMedia = jsonProduct.media.filter(Boolean)
  }

  // Enrichissement automatique instantané : si l'item n'a pas toutes ses images,
  // on injecte instantanément les images complètes depuis le catalogue de référence !
  if (defProduct) {
    if (rawImages.length <= 1 && Array.isArray(defProduct.images) && defProduct.images.length > 1) {
      rawImages = defProduct.images
    }
    if (rawMedia.length <= 1 && Array.isArray(defProduct.media) && defProduct.media.length > 1) {
      rawMedia = defProduct.media
    }
  }

  const mediaUrls = rawMedia.map((m: any) => (typeof m === 'string' ? m : m?.url)).filter(Boolean)

  // Si media contient plus de photos que images, on utilise media
  const authoritativeList = mediaUrls.length > rawImages.length ? mediaUrls : rawImages

  let rawMain = (typeof item.image === 'string' ? item.image.trim() : '') || (jsonProduct?.image || '') || authoritativeList[0] || (defProduct?.image || '')
  if (rawMain && rawMain.startsWith('data:')) {
    if (jsonProduct?.image && !jsonProduct.image.startsWith('data:')) {
      rawMain = jsonProduct.image
    } else {
      rawMain = `/api/product-image?id=${encodeURIComponent(item.id)}&index=0`
    }
  } else if (!rawMain) {
    rawMain = `/api/product-image?id=${encodeURIComponent(item.id)}&index=0`
  }

  const allImagesSet = new Set<string>()
  if (rawMain) allImagesSet.add(rawMain)
  authoritativeList.forEach((img, idx) => {
    if (img && typeof img === 'string') {
      const u = img.trim()
      allImagesSet.add(u.startsWith('data:') ? `/api/product-image?id=${encodeURIComponent(item.id)}&index=${idx}` : u)
    }
  })

  const imagesList = Array.from(allImagesSet)
  const mediaList = imagesList.map((url) => ({
    url,
    type: isVideoUrl(url) ? ('video' as const) : ('image' as const),
  }))

  return {
    id: item.id,
    name: item.name,
    category: item.category,
    type: item.type || '',
    price: item.price,
    rawPrice: Number(item.raw_price) || 0,
    description: item.description || '',
    image: rawMain || (imagesList[0] || ''),
    images: imagesList,
    media: mediaList,
    tag: item.tag || '',
    contenance: item.contenance || extractContenance(item),
    volumes: vols.length > 0 ? vols : undefined,
    colors: cols.length > 0 ? cols : undefined,
    color: cols.length > 0 ? cols.join(', ') : undefined,
    colorImages: Object.keys(colImgs).length > 0 ? colImgs : undefined,
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
      // Vérifier le cache produit individuel (1 heure)
      const cachedProduct = productCache.get(id)
      if (cachedProduct && (Date.now() - cachedProduct.timestamp < PRODUCT_CACHE_TTL_MS)) {
        return NextResponse.json(
          { success: true, product: cachedProduct.product, cached: true },
          { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } }
        )
      }

      // Pour une fiche produit individuelle, interroger Supabase avec select('*')
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

      const formatted = formatProduct(data)
      // Mettre en cache le produit individuel
      productCache.set(id, { product: formatted, timestamp: Date.now() })

      // Pré-remplir le cache de la galerie et des buffers d'images en RAM pour que les 10 vignettes répondent en 0ms
      let rawImgs: string[] = []
      if (Array.isArray(data.images) && data.images.length > 0) rawImgs = data.images.filter(Boolean)
      let rawMed: string[] = []
      if (Array.isArray(data.media) && data.media.length > 0) rawMed = data.media.map((m: any) => typeof m === 'string' ? m : m?.url).filter(Boolean)
      const galList = rawMed.length >= rawImgs.length ? rawMed : rawImgs
      if (galList.length === 0 && data.image) galList.push(String(data.image).trim())
      if (galList.length > 0) {
        setGalleryInCache(id, galList)
      }

      return NextResponse.json(
        { success: true, product: formatted },
        { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } }
      )
    }


    const isForcedDb = searchParams.has('force_db')

    // 2. Pour la liste complète :
    // Si le cache mémoire serveur est actif, répondre INSTANTANÉMENT (< 1ms)
    if (!isForcedDb && serverCache && serverCache.products.length > 0 && (Date.now() - serverCache.timestamp < CACHE_TTL_MS)) {
      return NextResponse.json(
        { success: true, products: serverCache.products, cached: true },
        { headers: {
          'Cache-Control': 'public, max-age=30, stale-while-revalidate=300',
        }}
      )
    }

    // 3. Récupération directe Supabase en une seule requête paginée intelligente
    // On utilise une seule requête avec une limite haute pour éviter les 30 requêtes inutiles
    let allData: any[] = []
    const PAGE_SIZE = 1000
    let from = 0
    let hasMore = true

    while (hasMore) {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category, type, price, raw_price, tag, rating, reviews_count, image, images')
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1)

      if (error || !data || data.length === 0) {
        hasMore = false
      } else {
        allData.push(...data)
        hasMore = data.length === PAGE_SIZE
        from += PAGE_SIZE
      }
    }

    let products = allData
      .map((item) => formatProduct(item))
      .filter((p) => p && p.id !== 'masque-nuit-regenerant' && !/Masque Baume de Nuit/i.test(p.name || ''))

    if (products.length === 0) {
      if (serverCache && serverCache.products.length > 0) {
        products = serverCache.products.filter((p) => p && p.id !== 'masque-nuit-regenerant')
      } else {
        products = PRODUCTS
          .filter((p) => p.id !== 'masque-nuit-regenerant')
          .map((p) => formatProduct({ ...p, raw_price: p.rawPrice, reviews_count: p.reviewsCount, images: p.images || [], media: p.media || [] }))
        seedDefaultProductsToSupabase().catch(() => {})
      }
    }

    // Mettre à jour le cache serveur
    if (products.length > 0) {
      serverCache = {
        products,
        timestamp: Date.now(),
      }
    }

    return NextResponse.json(
      { success: true, products },
      { headers: {
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=300',
      }}
    )
  } catch (err: any) {
    console.error('Erreur API /api/products GET:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Erreur serveur interne' },
      { status: 500, headers: NO_CACHE_HEADERS }
    )
  }
}

let isSeeding = false

async function seedDefaultProductsToSupabase() {
  if (!isSupabaseConfigured || isSeeding) return
  isSeeding = true
  try {
    const batchSize = 50
    for (let i = 0; i < PRODUCTS.length; i += batchSize) {
      const chunk = PRODUCTS.slice(i, i + batchSize).map((p) => ({
        id: String(p.id),
        name: String(p.name),
        category: p.category || 'MERCATUM',
        type: p.type || '',
        price: p.price || '0 €',
        raw_price: Number(p.rawPrice) || 0,
        description: p.description || '',
        image: p.image || '',
        images: p.images || [],
        media: p.media || [],
        tag: p.tag || '',
        rating: Number(p.rating) || 5.0,
        reviews_count: Number(p.reviewsCount) || 1,
      }))
      const { error } = await supabase.from('products').upsert(chunk, { onConflict: 'id' })
      if (error) {
        console.warn(`[Supabase Seeding] Erreur lot ${i}:`, error.message)
      }
    }
  } catch (err) {
    console.warn('[Supabase Seeding] Erreur:', err)
  } finally {
    isSeeding = false
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
    const url = new URL(request.url)
    if (url.searchParams.get('action') === 'seed') {
      await seedDefaultProductsToSupabase()
      return NextResponse.json({ success: true, count: PRODUCTS.length })
    }

    const body = await request.json()
    if (!body || !body.id || !body.name) {
      return NextResponse.json(
        { success: false, error: 'Les champs "id" et "name" sont requis.' },
        { status: 400 }
      )
    }

    const mediaList = Array.isArray(body.media) ? body.media : []
    const mediaUrls = mediaList.map((m: any) => (typeof m === 'string' ? m : m?.url)).filter(Boolean)
    const rawImagesList = Array.isArray(body.images) ? body.images.filter(Boolean) : []
    const imagesList = mediaUrls.length >= rawImagesList.length ? mediaUrls : rawImagesList

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

    // Mettre à jour immédiatement le cache mémoire serveur pour que le nouvel ajout soit visible à la seconde près
    if (serverCache && Array.isArray(serverCache.products)) {
      serverCache.products = [
        savedFormatted,
        ...serverCache.products.filter((p) => p.id !== savedFormatted.id),
      ]
      serverCache.timestamp = Date.now()
    } else {
      serverCache = {
        products: [savedFormatted],
        timestamp: Date.now(),
      }
    }

    // Mettre à jour le cache produit individuel aussi
    productCache.set(savedFormatted.id, { product: savedFormatted, timestamp: Date.now() })
    setGalleryInCache(savedFormatted.id, imagesList)


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
    // Retirer aussi du cache produit individuel
    productCache.delete(id)


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
